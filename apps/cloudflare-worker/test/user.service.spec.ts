import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '../src/services/user.service';

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

describe('UserService', () => {
    let service: UserService;
    let mockDb: ReturnType<typeof createMockDb>;

    beforeEach(() => {
        mockDb = createMockDb();
        service = new UserService(mockDb.db as any);
    });

    // ─── parseUser ────────────────────────────────────────────────────────────

    describe('parseUser', () => {
        it('returns null for null input', () => {
            expect(service.parseUser(null)).toBeNull();
        });

        it('returns user unchanged when additional_sirets is already an array', () => {
            const user = { id: '1', additional_sirets: ['123', '456'] } as any;
            const result = service.parseUser(user);
            expect(result!.additional_sirets).toEqual(['123', '456']);
        });

        it('parses additional_sirets from valid JSON string', () => {
            const user = { id: '1', additional_sirets: '["abc","def"]' } as any;
            const result = service.parseUser(user);
            expect(result!.additional_sirets).toEqual(['abc', 'def']);
        });

        it('auto-heals double-stringified additional_sirets', () => {
            const inner = JSON.stringify(['xyz']);
            const outer = JSON.stringify(inner);
            const user = { id: '1', additional_sirets: outer } as any;
            const result = service.parseUser(user);
            expect(result!.additional_sirets).toEqual(['xyz']);
        });

        it('returns empty array for invalid JSON string', () => {
            const user = { id: '1', additional_sirets: 'not-valid-json' } as any;
            const result = service.parseUser(user);
            expect(result!.additional_sirets).toEqual([]);
        });

        it('returns empty array when parsed JSON is not an array', () => {
            const user = { id: '1', additional_sirets: '{"key":"value"}' } as any;
            const result = service.parseUser(user);
            expect(result!.additional_sirets).toEqual([]);
        });

        it('sets additional_sirets to empty array when null', () => {
            const user = { id: '1', additional_sirets: null } as any;
            const result = service.parseUser(user);
            expect(result!.additional_sirets).toEqual([]);
        });

        it('sets additional_sirets to empty array when undefined', () => {
            const user = { id: '1' } as any;
            const result = service.parseUser(user);
            expect(result!.additional_sirets).toEqual([]);
        });

        it('preserves other user fields unchanged', () => {
            const user = { id: 'u1', email: 'a@b.com', firstname: 'Alice', additional_sirets: [] } as any;
            const result = service.parseUser(user);
            expect(result!.id).toBe('u1');
            expect(result!.email).toBe('a@b.com');
            expect(result!.firstname).toBe('Alice');
        });
    });

    // ─── getUserByAuth0Sub ────────────────────────────────────────────────────

    describe('getUserByAuth0Sub', () => {
        it('queries DB with the auth0_sub and returns parsed user', async () => {
            const rawUser = { id: 'u1', auth0_sub: 'auth0|123', additional_sirets: null } as any;
            mockDb.stmt.first.mockResolvedValue(rawUser);

            const result = await service.getUserByAuth0Sub('auth0|123');

            expect(mockDb.db.prepare).toHaveBeenCalledWith(expect.stringContaining('auth0_sub'));
            expect(mockDb.stmt.bind).toHaveBeenCalledWith('auth0|123');
            expect(result?.id).toBe('u1');
            expect(result?.additional_sirets).toEqual([]);
        });

        it('returns null when user not found', async () => {
            mockDb.stmt.first.mockResolvedValue(null);
            const result = await service.getUserByAuth0Sub('auth0|unknown');
            expect(result).toBeNull();
        });
    });

    // ─── getUserById ──────────────────────────────────────────────────────────

    describe('getUserById', () => {
        it('queries DB with id and returns parsed user', async () => {
            const rawUser = { id: 'u2', additional_sirets: '[]' } as any;
            mockDb.stmt.first.mockResolvedValue(rawUser);

            const result = await service.getUserById('u2');

            expect(mockDb.db.prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ?'));
            expect(mockDb.stmt.bind).toHaveBeenCalledWith('u2');
            expect(result?.id).toBe('u2');
            expect(result?.additional_sirets).toEqual([]);
        });

        it('returns null when user not found', async () => {
            mockDb.stmt.first.mockResolvedValue(null);
            expect(await service.getUserById('missing')).toBeNull();
        });
    });

    // ─── createOrUpdateUser ───────────────────────────────────────────────────

    describe('createOrUpdateUser', () => {
        it('upserts user and returns parsed result', async () => {
            const rawUser = { id: 'new-id', auth0_sub: 'auth0|new', additional_sirets: null } as any;
            mockDb.stmt.first.mockResolvedValue(rawUser);

            const result = await service.createOrUpdateUser({
                auth0_sub: 'auth0|new',
                email: 'test@test.com',
                firstname: 'John',
                lastname: 'Doe'
            });

            expect(mockDb.db.prepare).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT'));
            expect(result.auth0_sub).toBe('auth0|new');
            expect(result.additional_sirets).toEqual([]);
        });
    });

    // ─── updateUser ───────────────────────────────────────────────────────────

    describe('updateUser', () => {
        it('returns current user when dto has no allowed keys', async () => {
            const rawUser = { id: 'u1', additional_sirets: [] } as any;
            mockDb.stmt.first.mockResolvedValue(rawUser);

            const result = await service.updateUser('u1', {} as any);
            expect(result?.id).toBe('u1');
        });

        it('builds dynamic SQL with allowed fields', async () => {
            const rawUser = { id: 'u1', firstname: 'Jane', additional_sirets: [] } as any;
            mockDb.stmt.first.mockResolvedValue(rawUser);

            await service.updateUser('u1', { firstname: 'Jane' });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('firstname = ?');
            expect(query).toContain('updated_at');
        });

        it('serializes additional_sirets array to JSON string', async () => {
            const rawUser = { id: 'u1', additional_sirets: ['abc'] } as any;
            mockDb.stmt.first.mockResolvedValue(rawUser);

            await service.updateUser('u1', { additional_sirets: ['abc', 'def'] } as any);

            const bindArgs = mockDb.stmt.bind.mock.calls[0] as unknown[];
            const serialized = bindArgs.find(a => typeof a === 'string' && a.startsWith('['));
            expect(serialized).toBe('["abc","def"]');
        });

        it('ignores keys not in allowedKeys', async () => {
            const rawUser = { id: 'u1', additional_sirets: [] } as any;
            mockDb.stmt.first.mockResolvedValue(rawUser);

            await service.updateUser('u1', { not_allowed: 'value' } as any);

            // Should fall back to getUserById (no UPDATE query)
            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('WHERE id = ?');
        });
    });

    // ─── setBlockedStatus ─────────────────────────────────────────────────────

    describe('setBlockedStatus', () => {
        it('blocks user: soft-deletes matches, deletes contacts, sets blocked flag', async () => {
            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

            const result = await service.setBlockedStatus('u1', true, 'Violation rules');

            expect(mockDb.db.prepare).toHaveBeenCalledTimes(3);
            expect(result).toBe(true);

            const queries = mockDb.db.prepare.mock.calls.map((c: any[]) => c[0] as string);
            expect(queries.some(q => q.includes('deleted_at'))).toBe(true);
            expect(queries.some(q => q.includes('DELETE FROM match_contacts'))).toBe(true);
            expect(queries.some(q => q.includes('is_blocked = 1'))).toBe(true);
        });

        it('uses default block reason when none provided', async () => {
            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

            await service.setBlockedStatus('u1', true);

            const allBindArgs = mockDb.stmt.bind.mock.calls.flat();
            expect(allBindArgs).toContain('Aucun motif spécifié');
        });

        it('unblocks user: single update clearing is_blocked', async () => {
            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

            const result = await service.setBlockedStatus('u1', false);

            expect(mockDb.db.prepare).toHaveBeenCalledTimes(1);
            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('is_blocked = 0');
            expect(result).toBe(true);
        });
    });

    // ─── getOrCreateCalendarToken ─────────────────────────────────────────────

    describe('getOrCreateCalendarToken', () => {
        it('throws when user not found', async () => {
            mockDb.stmt.first.mockResolvedValue(null);
            await expect(service.getOrCreateCalendarToken('u-missing')).rejects.toThrow('User not found');
        });

        it('returns existing token when user has one', async () => {
            mockDb.stmt.first.mockResolvedValue({
                id: 'u1', calendar_token: 'tok-existing', additional_sirets: []
            } as any);

            const token = await service.getOrCreateCalendarToken('u1');
            expect(token).toBe('tok-existing');
            // Should NOT run any UPDATE
            expect(mockDb.stmt.run).not.toHaveBeenCalled();
        });

        it('creates and returns new token when user has none', async () => {
            mockDb.stmt.first.mockResolvedValue({
                id: 'u1', calendar_token: null, additional_sirets: []
            } as any);
            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

            const token = await service.getOrCreateCalendarToken('u1');
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(10);
            expect(mockDb.stmt.run).toHaveBeenCalled();
        });
    });

    // ─── regenerateCalendarToken ──────────────────────────────────────────────

    describe('regenerateCalendarToken', () => {
        it('updates calendar_token in DB', async () => {
            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

            await service.regenerateCalendarToken('u1');

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('calendar_token');
            expect(mockDb.stmt.run).toHaveBeenCalled();
        });
    });

    // ─── getUserByCalendarToken ───────────────────────────────────────────────

    describe('getUserByCalendarToken', () => {
        it('queries by calendar_token and returns parsed user', async () => {
            const rawUser = { id: 'u1', calendar_token: 'abc', additional_sirets: null } as any;
            mockDb.stmt.first.mockResolvedValue(rawUser);

            const result = await service.getUserByCalendarToken('abc');

            expect(mockDb.stmt.bind).toHaveBeenCalledWith('abc');
            expect(result?.id).toBe('u1');
        });

        it('returns null when token not found', async () => {
            mockDb.stmt.first.mockResolvedValue(null);
            expect(await service.getUserByCalendarToken('not-found')).toBeNull();
        });
    });

    // ─── deleteUser ───────────────────────────────────────────────────────────

    describe('deleteUser', () => {
        it('deletes user and returns true on success', async () => {
            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });
            expect(await service.deleteUser('u1')).toBe(true);
            expect(mockDb.db.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM users'));
        });

        it('returns false when DB reports failure', async () => {
            mockDb.stmt.run.mockResolvedValue({ success: false, meta: { changes: 0 } });
            expect(await service.deleteUser('u1')).toBe(false);
        });
    });

    // ─── updateLastCalendarSyncAt ─────────────────────────────────────────────

    describe('updateLastCalendarSyncAt', () => {
        it('updates last_calendar_sync_at for user', async () => {
            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

            await service.updateLastCalendarSyncAt('u1');

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('last_calendar_sync_at');
            expect(mockDb.stmt.bind).toHaveBeenCalledWith('u1');
        });
    });

    // ─── exportUserData ───────────────────────────────────────────────────────

    describe('exportUserData', () => {
        it('returns structured export with all 6 data categories', async () => {
            const profile = { id: 'u1', additional_sirets: null };
            mockDb.db.batch.mockResolvedValue([
                { results: [profile] },
                { results: [{ id: 'm1' }, { id: 'm2' }] },
                { results: [{ id: 'p1' }] },
                { results: [] },
                { results: [{ id: 'e1' }] },
                { results: [{ id: 'a1' }, { id: 'a2' }] }
            ]);

            const data = await service.exportUserData('u1');

            expect(data.profile).toBeDefined();
            expect((data.matches as unknown[]).length).toBe(2);
            expect((data.match_applications as unknown[]).length).toBe(1);
            expect((data.training_sessions as unknown[]).length).toBe(0);
            expect((data.created_exercises as unknown[]).length).toBe(1);
            expect((data.audit_log as unknown[]).length).toBe(2);
            expect(typeof data.exported_at).toBe('number');
        });

        it('calls batch with exactly 6 prepared statements', async () => {
            mockDb.db.batch.mockResolvedValue([
                { results: [] }, { results: [] }, { results: [] },
                { results: [] }, { results: [] }, { results: [] }
            ]);

            await service.exportUserData('u1');

            const batchArgs = mockDb.db.batch.mock.calls[0][0] as unknown[];
            expect(batchArgs).toHaveLength(6);
        });
    });
});
