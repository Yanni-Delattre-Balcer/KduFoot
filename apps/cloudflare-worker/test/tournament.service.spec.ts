import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TournamentService } from '../src/services/tournament.service';

function createMockDb() {
    const stmt = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } })
    };
    const db = {
        prepare: vi.fn().mockReturnValue(stmt),
        batch: vi.fn().mockResolvedValue([]),
        exec: vi.fn()
    };
    return { db, stmt };
}

/** Builds the 4-slot batch result that MatchService.getById expects */
function mockMatchBatch(matchRow: Record<string, unknown> | null) {
    return [
        { results: matchRow ? [matchRow] : [] },
        { results: [] },
        { results: [{ count: 1 }] },
        { results: [] }
    ];
}

const baseTournament = {
    id: 'match-1',
    owner_id: 'user-1',
    type: 'tournament',
    club_id: 'club-1',
    match_date: '2099-06-01',
    match_time: '10:00',
    match_end_time: '18:00',
    status: 'active',
    club_name: 'AS Test',
    club_city: 'Paris',
    club_zip: '75001',
    club_logo_url: null,
    club_address: null,
    club_latitude: 48.85,
    club_longitude: 2.35,
    deleted_at: null
};

describe('TournamentService', () => {
    let service: TournamentService;
    let mockDb: ReturnType<typeof createMockDb>;

    beforeEach(() => {
        mockDb = createMockDb();
        service = new TournamentService(mockDb.db as any);
    });

    // ─── getPairings ──────────────────────────────────────────────────────────

    describe('getPairings', () => {
        it('returns empty array when no pairings found', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            const result = await service.getPairings('match-1');

            expect(result).toEqual([]);
            expect(mockDb.stmt.bind).toHaveBeenCalledWith('match-1');
        });

        it('returns mapped pairings with club details', async () => {
            const pairingRow = {
                id: 'p-1',
                match_id: 'match-1',
                team_a_club_id: 'club-a',
                team_b_club_id: 'club-b',
                team_a_club_name: 'Club A',
                team_a_club_logo: null,
                team_b_club_name: 'Club B',
                team_b_club_logo: null,
                scheduled_time: '10:00'
            };
            mockDb.stmt.all.mockResolvedValue({ results: [pairingRow] });

            const result = await service.getPairings('match-1');

            expect(result).toHaveLength(1);
            expect(result[0].team_a_club_name).toBe('Club A');
            expect(result[0].team_b_club_name).toBe('Club B');
        });
    });

    // ─── generatePairings ─────────────────────────────────────────────────────

    describe('generatePairings', () => {
        it('throws when match not found', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch(null));

            await expect(service.generatePairings('missing', 'user-1'))
                .rejects.toThrow('Unauthorized or match not found');
        });

        it('throws when user is not owner', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch({ ...baseTournament, owner_id: 'other-user' }));

            await expect(service.generatePairings('match-1', 'user-1'))
                .rejects.toThrow('Unauthorized or match not found');
        });

        it('throws when match type is not tournament', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch({ ...baseTournament, type: 'match' }));

            await expect(service.generatePairings('match-1', 'user-1'))
                .rejects.toThrow('Cannot generate pairings for a simple match');
        });

        it('throws when fewer than 2 teams', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch(baseTournament));
            // No accepted teams in contacts (only owner's team = 1 total)
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await expect(service.generatePairings('match-1', 'user-1'))
                .rejects.toThrow('au moins 2 équipes');
        });

        it('creates pairings for 2 teams (owner + 1 accepted)', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch(baseTournament));
            // 1 accepted team in contacts
            mockDb.stmt.all.mockResolvedValueOnce({
                results: [{ club_id: 'club-2', club_name: 'Club 2', logo_url: null }]
            });
            // After delete + inserts, getPairings returns the pairing
            mockDb.stmt.all.mockResolvedValueOnce({
                results: [{
                    id: 'p-1', match_id: 'match-1',
                    team_a_club_name: 'AS Test', team_b_club_name: 'Club 2',
                    team_a_club_logo: null, team_b_club_logo: null
                }]
            });

            const result = await service.generatePairings('match-1', 'user-1');

            expect(mockDb.stmt.run).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    // ─── updatePairingTime ────────────────────────────────────────────────────

    describe('updatePairingTime', () => {
        it('throws when pairing not found', async () => {
            mockDb.stmt.first.mockResolvedValue(null);

            await expect(service.updatePairingTime('p-1', 'user-1', '11:00'))
                .rejects.toThrow('Pairing not found');
        });

        it('throws when user is not match owner', async () => {
            mockDb.stmt.first.mockResolvedValue({
                id: 'p-1', match_id: 'match-1',
                owner_id: 'other-user', match_time: '10:00', match_end_time: '18:00'
            });

            await expect(service.updatePairingTime('p-1', 'user-1', '11:00'))
                .rejects.toThrow('Unauthorized');
        });

        it('throws when scheduled time is before tournament start', async () => {
            mockDb.stmt.first.mockResolvedValue({
                id: 'p-1', match_id: 'match-1',
                owner_id: 'user-1', match_time: '10:00', match_end_time: '18:00'
            });

            await expect(service.updatePairingTime('p-1', 'user-1', '09:00'))
                .rejects.toThrow("après le début du tournoi");
        });

        it('throws when scheduled time is after tournament end', async () => {
            mockDb.stmt.first.mockResolvedValue({
                id: 'p-1', match_id: 'match-1',
                owner_id: 'user-1', match_time: '10:00', match_end_time: '18:00'
            });

            await expect(service.updatePairingTime('p-1', 'user-1', '19:00'))
                .rejects.toThrow("avant la fin du tournoi");
        });

        it('updates pairing time and returns true on valid time', async () => {
            mockDb.stmt.first.mockResolvedValue({
                id: 'p-1', match_id: 'match-1',
                owner_id: 'user-1', match_time: '10:00', match_end_time: '18:00'
            });
            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

            const result = await service.updatePairingTime('p-1', 'user-1', '14:00');

            expect(result).toBe(true);
            const queries = mockDb.db.prepare.mock.calls.map((c: any[]) => c[0] as string);
            expect(queries.some(q => q.includes('UPDATE tournament_pairings'))).toBe(true);
        });

        it('notifies accepted contacts after time update', async () => {
            mockDb.stmt.first.mockResolvedValue({
                id: 'p-1', match_id: 'match-1',
                owner_id: 'user-1', match_time: '10:00', match_end_time: '18:00'
            });
            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

            await service.updatePairingTime('p-1', 'user-1', '14:00');

            const queries = mockDb.db.prepare.mock.calls.map((c: any[]) => c[0] as string);
            expect(queries.some(q => q.includes('notification_state = 1'))).toBe(true);
        });
    });

    // ─── closeRegistrations ───────────────────────────────────────────────────

    describe('closeRegistrations', () => {
        it('returns null when match not found', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch(null));

            const result = await service.closeRegistrations('missing', 'user-1');
            expect(result).toBeNull();
        });

        it('throws Unauthorized when user is not owner', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch({ ...baseTournament, owner_id: 'other-user' }));

            await expect(service.closeRegistrations('match-1', 'user-1'))
                .rejects.toThrow('Unauthorized');
        });

        it('throws when match type is not tournament', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch({ ...baseTournament, type: 'match' }));

            await expect(service.closeRegistrations('match-1', 'user-1'))
                .rejects.toThrow('Seuls les tournois');
        });

        it('throws TOO_LATE_TO_MODIFY for imminent tournament', async () => {
            const nearFuture = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now
            const date = `${nearFuture.getFullYear()}-${String(nearFuture.getMonth() + 1).padStart(2, '0')}-${String(nearFuture.getDate()).padStart(2, '0')}`;
            const time = nearFuture.toTimeString().slice(0, 5);

            mockDb.db.batch.mockResolvedValue(mockMatchBatch({
                ...baseTournament, match_date: date, match_time: time
            }));

            await expect(service.closeRegistrations('match-1', 'user-1'))
                .rejects.toThrow('TOO_LATE_TO_MODIFY');
        });

        it('sets status to "found" and returns updated tournament', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch(baseTournament));
            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });
            // Second getById call after update
            mockDb.db.batch.mockResolvedValueOnce(mockMatchBatch(baseTournament))
                .mockResolvedValueOnce(mockMatchBatch({ ...baseTournament, status: 'found' }));

            const result = await service.closeRegistrations('match-1', 'user-1');

            const queries = mockDb.db.prepare.mock.calls.map((c: any[]) => c[0] as string);
            expect(queries.some(q => q.includes('"found"'))).toBe(true);
            expect(result).not.toBeNull();
        });
    });

    // ─── updateScore ──────────────────────────────────────────────────────────

    describe('updateScore', () => {
        it('returns false when match not found', async () => {
            mockDb.stmt.first.mockResolvedValue(null);

            const result = await service.updateScore('match-1', 'user-1', 2, 1);
            expect(result).toBe(false);
        });

        it('throws Unauthorized when user is not owner', async () => {
            mockDb.stmt.first.mockResolvedValue({
                owner_id: 'other-user', score_a: null, score_b: null
            });

            await expect(service.updateScore('match-1', 'user-1', 2, 1))
                .rejects.toThrow('Unauthorized');
        });

        it('creates audit record and updates scores in batch', async () => {
            mockDb.stmt.first.mockResolvedValue({
                owner_id: 'user-1', score_a: 0, score_b: 0
            });
            mockDb.db.batch.mockResolvedValue([]);

            const result = await service.updateScore('match-1', 'user-1', 3, 2);

            expect(result).toBe(true);
            expect(mockDb.db.batch).toHaveBeenCalled();

            const batchArgs = mockDb.db.batch.mock.calls[0][0] as unknown[];
            expect(batchArgs).toHaveLength(2); // audit insert + score update
        });

        it('passes correct scores to batch', async () => {
            mockDb.stmt.first.mockResolvedValue({
                owner_id: 'user-1', score_a: 1, score_b: 1
            });
            mockDb.db.batch.mockResolvedValue([]);

            await service.updateScore('match-1', 'user-1', 5, 3);

            const queries = mockDb.db.prepare.mock.calls.map((c: any[]) => c[0] as string);
            expect(queries.some(q => q.includes('score_a = ?'))).toBe(true);

            // Check 5 and 3 are bound
            const allBindArgs = mockDb.stmt.bind.mock.calls.flat();
            expect(allBindArgs).toContain(5);
            expect(allBindArgs).toContain(3);
        });
    });
});
