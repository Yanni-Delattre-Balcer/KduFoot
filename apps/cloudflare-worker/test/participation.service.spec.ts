import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParticipationService } from '../src/services/participation.service';

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
        { results: [{ count: 0 }] },
        { results: [] }
    ];
}

const activeMatch = {
    id: 'match-1',
    owner_id: 'owner-1',
    type: 'match',
    club_id: 'club-1',
    match_date: '2099-06-01',
    match_time: '10:00',
    status: 'active',
    max_teams: 2,
    club_name: 'AS Host',
    club_city: 'Paris',
    club_zip: '75001',
    club_logo_url: null,
    club_address: null,
    club_latitude: null,
    club_longitude: null,
    deleted_at: null
};

describe('ParticipationService', () => {
    let service: ParticipationService;
    let mockDb: ReturnType<typeof createMockDb>;

    beforeEach(() => {
        mockDb = createMockDb();
        service = new ParticipationService(mockDb.db as any);
    });

    // ─── contact ──────────────────────────────────────────────────────────────

    describe('contact', () => {
        it('throws when match not found', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch(null));

            await expect(service.contact('match-1', 'user-1', { message: 'Bonjour' }))
                .rejects.toThrow('Match not available');
        });

        it('throws when match is not active', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch({ ...activeMatch, status: 'found' }));

            await expect(service.contact('match-1', 'user-1', { message: 'Bonjour' }))
                .rejects.toThrow('Match not available');
        });

        it('throws when user tries to contact their own match', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch(activeMatch));

            await expect(service.contact('match-1', 'owner-1', { message: 'Bonjour' }))
                .rejects.toThrow('Cannot contact own match');
        });

        it('inserts contact request and returns true', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch(activeMatch));
            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

            const result = await service.contact('match-1', 'user-1', { message: 'Bonjour' });

            expect(result).toBe(true);
            const insertQuery = mockDb.db.prepare.mock.calls.at(-1)![0] as string;
            expect(insertQuery).toContain('INSERT INTO match_contacts');
        });

        it('returns true on duplicate contact (UNIQUE constraint)', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch(activeMatch));
            mockDb.stmt.run.mockRejectedValue(new Error('UNIQUE constraint failed'));

            const result = await service.contact('match-1', 'user-1', { message: 'Re-bonjour' });
            expect(result).toBe(true);
        });

        it('re-throws non-unique errors', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch(activeMatch));
            mockDb.stmt.run.mockRejectedValue(new Error('DB connection lost'));

            await expect(service.contact('match-1', 'user-1', { message: 'Test' }))
                .rejects.toThrow('DB connection lost');
        });
    });

    // ─── getIncomingRequests ──────────────────────────────────────────────────

    describe('getIncomingRequests', () => {
        it('returns all incoming requests for a match owner', async () => {
            const requests = [
                { id: 'req-1', match_id: 'match-1', user_id: 'user-1', status: 'pending' },
                { id: 'req-2', match_id: 'match-1', user_id: 'user-2', status: 'accepted' }
            ];
            mockDb.stmt.all.mockResolvedValue({ results: requests });

            const result = await service.getIncomingRequests('owner-1');

            expect(result).toHaveLength(2);
            expect(mockDb.stmt.bind).toHaveBeenCalledWith('owner-1');
        });

        it('returns empty array when no requests', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });
            expect(await service.getIncomingRequests('owner-1')).toEqual([]);
        });
    });

    // ─── getMyParticipations ──────────────────────────────────────────────────

    describe('getMyParticipations', () => {
        it('returns all participations for a user', async () => {
            const participations = [
                { match_id: 'match-1', status: 'pending' },
                { match_id: 'match-2', status: 'accepted' }
            ];
            mockDb.stmt.all.mockResolvedValue({ results: participations });

            const result = await service.getMyParticipations('user-1');

            expect(result).toHaveLength(2);
            expect(mockDb.stmt.bind).toHaveBeenCalledWith('user-1');
        });
    });

    // ─── updateRequestStatus ──────────────────────────────────────────────────

    describe('updateRequestStatus', () => {
        it('throws Unauthorized when owner does not own the match', async () => {
            mockDb.stmt.first.mockResolvedValue({ owner_id: 'real-owner', match_date: '2099-06-01', match_time: '10:00' });

            await expect(service.updateRequestStatus('match-1', 'user-1', 'fake-owner', 'accepted'))
                .rejects.toThrow('Unauthorized');
        });

        it('throws 409_CONFLICT when match capacity is full', async () => {
            mockDb.stmt.first.mockResolvedValue({ owner_id: 'owner-1', match_date: '2099-06-01', match_time: '10:00' });
            // UPDATE returns 0 changes (capacity sub-query blocked it)
            mockDb.stmt.run.mockResolvedValue({ meta: { changes: 0 }, success: true });

            await expect(service.updateRequestStatus('match-1', 'user-1', 'owner-1', 'accepted'))
                .rejects.toThrow('409_CONFLICT');
        });

        it('accepts request and auto-closes simple match', async () => {
            // 1st first() → match owner check (now includes type, max_teams)
            // 2nd first() → accepted count after UPDATE
            mockDb.stmt.first
                .mockResolvedValueOnce({ owner_id: 'owner-1', match_date: '2099-06-01', match_time: '10:00', type: 'match', max_teams: null })
                .mockResolvedValueOnce({ count: 1 });

            mockDb.stmt.run.mockResolvedValue({ meta: { changes: 1 }, success: true });

            const result = await service.updateRequestStatus('match-1', 'user-1', 'owner-1', 'accepted');

            expect(result).toBe(true);
            // Verify 'found' status was bound as a parameter to the UPDATE query
            const bindCalls = mockDb.stmt.bind.mock.calls;
            expect(bindCalls.some((args: any[]) => args.includes('found'))).toBe(true);
        });

        it('closes tournament when max_teams capacity reached', async () => {
            mockDb.stmt.first
                .mockResolvedValueOnce({ owner_id: 'owner-1', match_date: '2099-06-01', match_time: '10:00', type: 'tournament', max_teams: 8 })
                .mockResolvedValueOnce({ count: 8 });

            mockDb.stmt.run.mockResolvedValue({ meta: { changes: 1 }, success: true });

            const result = await service.updateRequestStatus('match-1', 'user-1', 'owner-1', 'accepted');

            expect(result).toBe(true);
            const bindCalls = mockDb.stmt.bind.mock.calls;
            expect(bindCalls.some((args: any[]) => args.includes('found'))).toBe(true);
        });

        it('reopens match when last accepted is refused', async () => {
            mockDb.stmt.first
                .mockResolvedValueOnce({ owner_id: 'owner-1', match_date: '2099-06-01', match_time: '10:00', type: 'match', max_teams: null })
                .mockResolvedValueOnce({ count: 0 });

            mockDb.stmt.run.mockResolvedValue({ meta: { changes: 1 }, success: true });

            const result = await service.updateRequestStatus('match-1', 'user-1', 'owner-1', 'refused');

            expect(result).toBe(true);
            const bindCalls = mockDb.stmt.bind.mock.calls;
            expect(bindCalls.some((args: any[]) => args.includes('active'))).toBe(true);
        });
    });

    // ─── deleteContact ────────────────────────────────────────────────────────

    describe('deleteContact', () => {
        it('throws when match not found', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch(null));

            await expect(service.deleteContact('match-1', 'user-1', 'user-1'))
                .rejects.toThrow('Match not found');
        });

        it('returns true when contact does not exist (idempotent)', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch(activeMatch));
            mockDb.stmt.first.mockResolvedValue(null); // no contact found

            const result = await service.deleteContact('match-1', 'user-1', 'user-1');
            expect(result).toBe(true);
        });

        it('deletes contact and returns true', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch(activeMatch));
            // contact with pending status
            mockDb.stmt.first.mockResolvedValueOnce({ status: 'pending' });
            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

            const result = await service.deleteContact('match-1', 'user-1', 'user-1');
            expect(result).toBe(true);
        });

        it('reopens match when accepted contact is deleted and no accepted left', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch(activeMatch));
            mockDb.stmt.first
                .mockResolvedValueOnce({ status: 'accepted' })   // contact row
                .mockResolvedValueOnce({ count: 0 });             // remaining accepted count

            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

            await service.deleteContact('match-1', 'user-1', 'user-1');

            const bindCalls = mockDb.stmt.bind.mock.calls;
            expect(bindCalls.some((args: any[]) => args.includes('active'))).toBe(true);
        });

        it('does not reopen match when other accepted contacts remain', async () => {
            mockDb.db.batch.mockResolvedValue(mockMatchBatch(activeMatch));
            mockDb.stmt.first
                .mockResolvedValueOnce({ status: 'accepted' })
                .mockResolvedValueOnce({ count: 2 });             // still has accepted

            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

            await service.deleteContact('match-1', 'user-1', 'user-1');

            const queries = mockDb.db.prepare.mock.calls.map((c: any[]) => c[0] as string);
            expect(queries.some(q => q.includes('"active"'))).toBe(false);
        });
    });

    // ─── markNotificationsAsRead ──────────────────────────────────────────────

    describe('markNotificationsAsRead', () => {
        it('updates notification_state to 0 and returns true', async () => {
            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

            const result = await service.markNotificationsAsRead('match-1', 'user-1');

            expect(result).toBe(true);
            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('notification_state = 0');
            expect(mockDb.stmt.bind).toHaveBeenCalledWith('match-1', 'user-1');
        });
    });

    // ─── getNotificationCounts ────────────────────────────────────────────────

    describe('getNotificationCounts', () => {
        it('returns pending and modified counts', async () => {
            mockDb.stmt.first
                .mockResolvedValueOnce({ count: 3 })  // pending requests
                .mockResolvedValueOnce({ count: 1 }); // modified participations

            const result = await service.getNotificationCounts('user-1');

            expect(result.pendingRequests).toBe(3);
            expect(result.modifiedParticipations).toBe(1);
        });

        it('returns zero counts when no notifications', async () => {
            mockDb.stmt.first
                .mockResolvedValueOnce({ count: 0 })
                .mockResolvedValueOnce({ count: 0 });

            const result = await service.getNotificationCounts('user-1');

            expect(result.pendingRequests).toBe(0);
            expect(result.modifiedParticipations).toBe(0);
        });

        it('handles null from DB gracefully', async () => {
            mockDb.stmt.first
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null);

            const result = await service.getNotificationCounts('user-1');

            expect(result.pendingRequests).toBe(0);
            expect(result.modifiedParticipations).toBe(0);
        });
    });
});
