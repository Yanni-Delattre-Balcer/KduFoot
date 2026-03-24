import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionService } from '../src/services/session.service';

function createMockDb() {
    const stmt = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } })
    };
    const db = {
        prepare: vi.fn().mockReturnValue(stmt),
        batch: vi.fn().mockResolvedValue([{ results: [] }, { results: [] }]),
        exec: vi.fn()
    };
    return { db, stmt };
}

const mockSession = {
    id: 'sess-1',
    user_id: 'user-1',
    name: 'Séance pressing',
    category: 'Seniors',
    level: 'Régional',
    total_duration: 90,
    constraints: null,
    status: 'draft',
    scheduled_date: '2026-05-01',
    created_at: 1700000000,
    updated_at: 1700000000
};

const mockExerciseRow = {
    session_id: 'sess-1',
    exercise_id: 'ex-1',
    order_index: 1,
    se_duration: 20,
    se_players: 10,
    adapted_data: null,
    e_id: 'ex-1',
    e_user_id: 'user-1',
    title: 'Jeu de passes',
    synopsis: null,
    svg_schema: null,
    themes: '[]',
    nb_joueurs: '10',
    dimensions: '30x20',
    materiel: null,
    category: 'Seniors',
    level: 'Régional',
    e_duration: '20',
    video_url: null,
    thumbnail_url: null,
    video_start_seconds: null,
    e_created_at: 1700000000,
    e_updated_at: 1700000000
};

describe('SessionService', () => {
    let service: SessionService;
    let mockDb: ReturnType<typeof createMockDb>;

    beforeEach(() => {
        mockDb = createMockDb();
        service = new SessionService(mockDb.db as any);
    });

    // ─── create ───────────────────────────────────────────────────────────────

    describe('create', () => {
        it('inserts session and returns a session object', async () => {
            mockDb.db.batch.mockResolvedValue([{ results: [] }]);

            const result = await service.create('user-1', {
                name: 'Séance pressing',
                category: 'Seniors',
                level: 'Régional',
                status: 'draft',
                exercises: []
            } as any);

            expect(mockDb.db.batch).toHaveBeenCalled();
            expect(result.name).toBe('Séance pressing');
            expect(result.user_id).toBe('user-1');
            expect(result.status).toBe('draft');
        });

        it('includes exercise inserts in batch when exercises provided', async () => {
            mockDb.db.batch.mockResolvedValue([{ results: [] }]);

            await service.create('user-1', {
                name: 'Séance',
                exercises: [
                    { exercise_id: 'ex-1', order_index: 1, duration: 20, players: 10 }
                ]
            } as any);

            const batchArgs = mockDb.db.batch.mock.calls[0][0] as unknown[];
            // 1 session insert + 1 exercise insert
            expect(batchArgs.length).toBe(2);
        });

        it('defaults status to draft when not provided', async () => {
            mockDb.db.batch.mockResolvedValue([{ results: [] }]);

            const result = await service.create('user-1', { name: 'Test' } as any);
            expect(result.status).toBe('draft');
        });

        it('serializes constraints to JSON', async () => {
            mockDb.db.batch.mockResolvedValue([{ results: [] }]);

            await service.create('user-1', {
                name: 'Test',
                constraints: { weather: 'indoor' }
            } as any);

            const stmtBindArgs = mockDb.stmt.bind.mock.calls[0] as unknown[];
            const constraintsArg = stmtBindArgs.find(a => typeof a === 'string' && a.includes('weather'));
            expect(constraintsArg).toBe('{"weather":"indoor"}');
        });
    });

    // ─── getById ──────────────────────────────────────────────────────────────

    describe('getById', () => {
        it('returns null when session not found', async () => {
            mockDb.db.batch.mockResolvedValue([{ results: [] }, { results: [] }]);

            const result = await service.getById('missing');
            expect(result).toBeNull();
        });

        it('returns session with exercises when found', async () => {
            mockDb.db.batch.mockResolvedValue([
                { results: [mockSession] },
                { results: [mockExerciseRow] }
            ]);

            const result = await service.getById('sess-1');

            expect(result).not.toBeNull();
            expect(result!.session.id).toBe('sess-1');
            expect(result!.exercises).toHaveLength(1);
            expect(result!.exercises[0].exercise_id).toBe('ex-1');
        });

        it('maps exercise row fields correctly', async () => {
            mockDb.db.batch.mockResolvedValue([
                { results: [mockSession] },
                { results: [mockExerciseRow] }
            ]);

            const result = await service.getById('sess-1');
            const ex = result!.exercises[0];

            expect(ex.exercise.id).toBe('ex-1');
            expect(ex.exercise.title).toBe('Jeu de passes');
            expect(ex.order_index).toBe(1);
            expect(ex.duration).toBe(20);
        });

        it('returns empty exercises array when session has none', async () => {
            mockDb.db.batch.mockResolvedValue([
                { results: [mockSession] },
                { results: [] }
            ]);

            const result = await service.getById('sess-1');
            expect(result!.exercises).toHaveLength(0);
        });
    });

    // ─── update ───────────────────────────────────────────────────────────────

    describe('update', () => {
        it('returns false when session not found', async () => {
            mockDb.stmt.first.mockResolvedValue(null);

            const result = await service.update('missing', 'user-1', { name: 'New' } as any);
            expect(result).toBe(false);
        });

        it('throws Unauthorized when user is not owner', async () => {
            mockDb.stmt.first.mockResolvedValue({ user_id: 'other-user' });

            await expect(service.update('sess-1', 'user-1', { name: 'New' } as any))
                .rejects.toThrow('Unauthorized');
        });

        it('returns true on successful update', async () => {
            mockDb.stmt.first.mockResolvedValue({ user_id: 'user-1' });
            mockDb.db.batch.mockResolvedValue([{ results: [] }]);

            const result = await service.update('sess-1', 'user-1', { name: 'Updated' } as any);
            expect(result).toBe(true);
        });

        it('replaces exercises when exercises array is provided', async () => {
            mockDb.stmt.first.mockResolvedValue({ user_id: 'user-1' });
            mockDb.db.batch.mockResolvedValue([{ results: [] }]);

            await service.update('sess-1', 'user-1', {
                exercises: [
                    { exercise_id: 'ex-2', order_index: 1, duration: 15, players: 8 }
                ]
            } as any);

            const batchArgs = mockDb.db.batch.mock.calls[0][0] as unknown[];
            // Should contain DELETE + INSERT statements
            expect(batchArgs.length).toBeGreaterThanOrEqual(2);
        });

        it('serializes constraints field to JSON', async () => {
            mockDb.stmt.first.mockResolvedValue({ user_id: 'user-1' });
            mockDb.db.batch.mockResolvedValue([{ results: [] }]);

            await service.update('sess-1', 'user-1', {
                constraints: { minPlayers: 8 }
            } as any);

            const query = mockDb.db.prepare.mock.calls[1][0] as string;
            expect(query).toContain('constraints = ?');
        });

        it('returns true even with empty dto (no statements needed)', async () => {
            mockDb.stmt.first.mockResolvedValue({ user_id: 'user-1' });
            mockDb.db.batch.mockResolvedValue([]);

            const result = await service.update('sess-1', 'user-1', {} as any);
            expect(result).toBe(true);
        });
    });

    // ─── delete ───────────────────────────────────────────────────────────────

    describe('delete', () => {
        it('returns false when session not found', async () => {
            mockDb.stmt.first.mockResolvedValue(null);
            expect(await service.delete('missing', 'user-1')).toBe(false);
        });

        it('throws Unauthorized when user is not owner', async () => {
            mockDb.stmt.first.mockResolvedValue({ user_id: 'other-user' });

            await expect(service.delete('sess-1', 'user-1')).rejects.toThrow('Unauthorized');
        });

        it('soft-deletes session and returns true', async () => {
            mockDb.stmt.first.mockResolvedValue({ user_id: 'user-1' });
            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

            const result = await service.delete('sess-1', 'user-1');

            expect(result).toBe(true);
            const deleteQuery = mockDb.db.prepare.mock.calls[1][0] as string;
            expect(deleteQuery).toContain('deleted_at');
        });
    });

    // ─── search ───────────────────────────────────────────────────────────────

    describe('search', () => {
        it('returns empty results when no sessions found', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            const result = await service.search({ userId: 'user-1', limit: 10 });

            expect(result.data).toEqual([]);
            expect(result.hasMore).toBe(false);
            expect(result.nextCursor).toBeNull();
        });

        it('applies userId filter', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ userId: 'user-1' });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('user_id = ?');
        });

        it('applies status filter', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ status: 'published' });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('status = ?');
        });

        it('applies from/to date range filters', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ from: '2026-01-01', to: '2026-12-31' });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('scheduled_date >=');
            expect(query).toContain('scheduled_date <=');
        });

        it('sets hasMore=true and pops last item when results exceed limit', async () => {
            const sessions = Array.from({ length: 4 }, (_, i) => ({
                ...mockSession, id: `sess-${i}`, scheduled_date: `2026-0${i + 1}-01`
            }));
            mockDb.stmt.all.mockResolvedValue({ results: sessions });

            const result = await service.search({ limit: 3 });

            expect(result.hasMore).toBe(true);
            expect(result.data).toHaveLength(3);
            expect(result.nextCursor).not.toBeNull();
        });

        it('generates base64 cursor from last session', async () => {
            const sessions = Array.from({ length: 3 }, (_, i) => ({
                ...mockSession, id: `sess-${i}`, scheduled_date: `2026-0${i + 1}-01`
            }));
            mockDb.stmt.all.mockResolvedValue({ results: sessions });

            const result = await service.search({ limit: 2 });

            expect(result.nextCursor).not.toBeNull();
            const decoded = JSON.parse(atob(result.nextCursor!));
            expect(decoded.scheduled_date).toBeDefined();
            expect(decoded.id).toBeDefined();
        });

        it('applies cursor filter to query', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            const cursor = btoa(JSON.stringify({ scheduled_date: '2026-05-01', id: 'sess-0' }));
            await service.search({ cursor });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('scheduled_date > ?');
        });

        it('ignores invalid cursor without throwing', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });
            await expect(service.search({ cursor: '!!!invalid!!!' })).resolves.toBeDefined();
        });

        it('excludes deleted sessions (deleted_at IS NULL)', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({});

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('deleted_at IS NULL');
        });
    });
});
