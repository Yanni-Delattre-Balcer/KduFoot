import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchService } from '../match.service';
import { mockEnv } from '../../../test/setup';

describe('MatchService', () => {
    let service: MatchService;

    beforeEach(() => {
        service = new MatchService(mockEnv.DB as any);
        vi.clearAllMocks();
    });

    // ── isTooLateToModify ─────────────────────────────────────────────────────

    describe('isTooLateToModify()', () => {
        it('should return false for a match more than 2 hours in the future', () => {
            const future = new Date(Date.now() + 3 * 60 * 60 * 1000); // +3h
            const date = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
            const time = future.toTimeString().slice(0, 5);

            expect(service.isTooLateToModify(date, time)).toBe(false);
        });

        it('should return true for a match within the next 2 hours', () => {
            const future = new Date(Date.now() + 60 * 60 * 1000); // +1h
            const date = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
            const time = future.toTimeString().slice(0, 5);

            expect(service.isTooLateToModify(date, time)).toBe(true);
        });

        it('should return false for a match in the past', () => {
            const past = new Date(Date.now() - 60 * 60 * 1000); // -1h
            const date = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
            const time = past.toTimeString().slice(0, 5);

            expect(service.isTooLateToModify(date, time)).toBe(false);
        });

        it('should return false for invalid date/time strings', () => {
            expect(service.isTooLateToModify('not-a-date', 'not-a-time')).toBe(false);
            expect(service.isTooLateToModify('', '')).toBe(false);
        });
    });

    // ── mapRowToMatch ─────────────────────────────────────────────────────────

    describe('mapRowToMatch()', () => {
        it('should map a DB row to a Match object with club sub-object', () => {
            const row = {
                id: 'match-1',
                owner_id: 'user-1',
                club_id: 'club-1',
                club_name: 'FC Test',
                club_city: 'Paris',
                club_zip: '75001',
                club_logo_url: null,
                club_address: '1 rue du Stade',
                club_latitude: 48.8566,
                club_longitude: 2.3522,
                type: 'match',
                category: '11v11',
                format: '90min',
                match_date: '2026-06-01',
                match_time: '15:00',
                venue: 'indoor',
                email: 'test@kdufoot.com',
                phone: '0600000000',
                status: 'active',
                created_at: 1700000000,
            } as any;

            const result = service.mapRowToMatch(row);

            expect(result.id).toBe('match-1');
            expect(result.club).toBeDefined();
            expect(result.club?.name).toBe('FC Test');
            expect(result.club?.city).toBe('Paris');
            expect(result.club?.latitude).toBe(48.8566);
            // club fields should not be at top level
            expect((result as any).club_name).toBeUndefined();
        });

        it('should use empty string for missing club name', () => {
            const row = {
                id: 'match-2',
                club_id: 'club-1',
                club_name: null,
                club_city: null,
                club_zip: null,
                club_logo_url: null,
                club_address: null,
                club_latitude: null,
                club_longitude: null,
            } as any;

            const result = service.mapRowToMatch(row);
            expect(result.club?.name).toBe('');
            expect(result.club?.city).toBe('');
        });
    });

    // ── getById ───────────────────────────────────────────────────────────────

    describe('getById()', () => {
        it('should return null when match is not found', async () => {
            (mockEnv.DB.batch as any).mockResolvedValueOnce([
                { results: [] },
                { results: [] },
                { results: [{ count: 0 }] },
                { results: [] },
            ]);

            const result = await service.getById('nonexistent-id');
            expect(result).toBeNull();
        });

        it('should return a match with contacts and accepted_count', async () => {
            const mockMatchRow = {
                id: 'match-1',
                owner_id: 'user-1',
                club_id: 'club-1',
                club_name: 'FC Test',
                club_city: 'Paris',
                club_zip: '75001',
                club_logo_url: null,
                club_address: null,
                club_latitude: null,
                club_longitude: null,
                type: 'match',
                status: 'active',
                match_date: '2026-06-01',
                match_time: '15:00',
            };

            (mockEnv.DB.batch as any).mockResolvedValueOnce([
                { results: [mockMatchRow] },
                { results: [{ user_id: 'u1', club_id: 'c1', club_name: 'FC Test', message: 'Hello', contacted_at: 1700000000, status: 'pending' }] },
                { results: [{ count: 2 }] },
                { results: [] },
            ]);

            const result = await service.getById('match-1');

            expect(result).not.toBeNull();
            expect(result?.id).toBe('match-1');
            expect(result?.accepted_count).toBe(2);
            expect(result?.contacts).toHaveLength(1);
            expect(result?.pairings).toHaveLength(0);
        });
    });

    // ── delete ────────────────────────────────────────────────────────────────

    describe('delete()', () => {
        it('should return false when match does not exist', async () => {
            (mockEnv.DB.batch as any).mockResolvedValueOnce([
                { results: [] }, // match not found
                { results: [] },
                { results: [{ count: 0 }] },
                { results: [] },
            ]);

            const result = await service.delete('nonexistent', 'user-1');
            expect(result).toBe(false);
        });

        it('should throw Unauthorized when user is not the owner', async () => {
            const mockMatchRow = {
                id: 'match-1',
                owner_id: 'other-user',
                club_name: 'FC', club_city: 'Lyon', club_zip: null,
                club_logo_url: null, club_address: null, club_latitude: null, club_longitude: null,
                match_date: '2026-12-01',
                match_time: '15:00',
            };

            (mockEnv.DB.batch as any).mockResolvedValueOnce([
                { results: [mockMatchRow] },
                { results: [] },
                { results: [{ count: 0 }] },
                { results: [] },
            ]);

            await expect(service.delete('match-1', 'wrong-user')).rejects.toThrow('Unauthorized');
        });
    });

    // ── update ────────────────────────────────────────────────────────────────

    describe('update()', () => {
        it('should return null when match does not exist', async () => {
            (mockEnv.DB.batch as any).mockResolvedValueOnce([
                { results: [] },
                { results: [] },
                { results: [{ count: 0 }] },
                { results: [] },
            ]);

            const result = await service.update('nonexistent', 'user-1', { name: 'New Name' });
            expect(result).toBeNull();
        });

        it('should throw TOO_LATE_TO_MODIFY when within 2 hours of match', async () => {
            const soon = new Date(Date.now() + 30 * 60 * 1000); // 30min from now
            const matchRow = {
                id: 'match-1',
                owner_id: 'user-1',
                club_name: 'FC', club_city: 'Lyon', club_zip: null,
                club_logo_url: null, club_address: null, club_latitude: null, club_longitude: null,
                match_date: `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, '0')}-${String(soon.getDate()).padStart(2, '0')}` ,
                match_time: soon.toTimeString().slice(0, 5),
            };

            (mockEnv.DB.batch as any).mockResolvedValueOnce([
                { results: [matchRow] },
                { results: [] },
                { results: [{ count: 0 }] },
                { results: [] },
            ]);

            await expect(service.update('match-1', 'user-1', { name: 'Renamed' })).rejects.toThrow('TOO_LATE_TO_MODIFY');
        });

        it('should return existing match when dto has no allowed keys', async () => {
            const farFuture = new Date(Date.now() + 48 * 60 * 60 * 1000); // +48h
            const matchRow = {
                id: 'match-1',
                owner_id: 'user-1',
                club_name: 'FC', club_city: 'Lyon', club_zip: null,
                club_logo_url: null, club_address: null, club_latitude: null, club_longitude: null,
                match_date: `${farFuture.getFullYear()}-${String(farFuture.getMonth() + 1).padStart(2, '0')}-${String(farFuture.getDate()).padStart(2, '0')}` ,
                match_time: farFuture.toTimeString().slice(0, 5),
            };

            (mockEnv.DB.batch as any).mockResolvedValueOnce([
                { results: [matchRow] },
                { results: [] },
                { results: [{ count: 0 }] },
                { results: [] },
            ]);

            // Empty dto - no allowed keys
            const result = await service.update('match-1', 'user-1', {});
            expect(result).toBeDefined();
            expect(result?.id).toBe('match-1');
        });
    });
});
