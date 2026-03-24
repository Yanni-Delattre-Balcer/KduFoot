import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExerciseService } from '../src/services/exercise.service';

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

const mockExercise = {
    id: 'ex-1',
    user_id: 'user-1',
    title: 'Pressing haut',
    synopsis: 'Exercice de pressing',
    svg_schema: null,
    themes: '["pressing","défense"]',
    nb_joueurs: '10',
    dimensions: '40x30',
    materiel: 'Plots',
    category: 'Seniors',
    level: 'Régional',
    duration: '20',
    created_at: 1700000000,
    updated_at: 1700000000
};

describe('ExerciseService', () => {
    let service: ExerciseService;
    let mockDb: ReturnType<typeof createMockDb>;

    beforeEach(() => {
        mockDb = createMockDb();
        service = new ExerciseService(mockDb.db as any);
    });

    // ─── create ───────────────────────────────────────────────────────────────

    describe('create', () => {
        it('inserts exercise and returns result', async () => {
            mockDb.stmt.first.mockResolvedValue(mockExercise);

            const result = await service.create('user-1', {
                title: 'Pressing haut',
                themes: ['pressing', 'défense'],
                category: 'Seniors',
                level: 'Régional'
            } as any);

            expect(mockDb.db.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO exercises'));
            expect(result.title).toBe('Pressing haut');
        });

        it('serializes themes array to JSON string', async () => {
            mockDb.stmt.first.mockResolvedValue(mockExercise);

            await service.create('user-1', { title: 'Test', themes: ['a', 'b'] } as any);

            const bindArgs = mockDb.stmt.bind.mock.calls[0] as unknown[];
            const themesArg = bindArgs.find(a => a === '["a","b"]');
            expect(themesArg).toBe('["a","b"]');
        });

        it('defaults themes to empty array when not provided', async () => {
            mockDb.stmt.first.mockResolvedValue(mockExercise);

            await service.create('user-1', { title: 'Test' } as any);

            const bindArgs = mockDb.stmt.bind.mock.calls[0] as unknown[];
            expect(bindArgs).toContain('[]');
        });
    });

    // ─── getById ──────────────────────────────────────────────────────────────

    describe('getById', () => {
        it('returns exercise when found', async () => {
            mockDb.stmt.first.mockResolvedValue(mockExercise);

            const result = await service.getById('ex-1');

            expect(mockDb.stmt.bind).toHaveBeenCalledWith('ex-1');
            expect(result?.id).toBe('ex-1');
        });

        it('returns null when not found', async () => {
            mockDb.stmt.first.mockResolvedValue(null);
            expect(await service.getById('missing')).toBeNull();
        });
    });

    // ─── update ───────────────────────────────────────────────────────────────

    describe('update', () => {
        it('returns null when exercise not found', async () => {
            mockDb.stmt.first.mockResolvedValue(null);
            const result = await service.update('ex-1', 'user-1', { title: 'New' } as any);
            expect(result).toBeNull();
        });

        it('throws Unauthorized when user is not owner', async () => {
            mockDb.stmt.first.mockResolvedValue({ ...mockExercise, user_id: 'other-user' });

            await expect(service.update('ex-1', 'user-1', { title: 'New' } as any))
                .rejects.toThrow('Unauthorized');
        });

        it('returns existing exercise when dto has no allowed keys', async () => {
            mockDb.stmt.first.mockResolvedValue(mockExercise);

            const result = await service.update('ex-1', 'user-1', {} as any);
            expect(result?.id).toBe('ex-1');
        });

        it('serializes themes to JSON in UPDATE query', async () => {
            // First call: getById for ownership check
            mockDb.stmt.first
                .mockResolvedValueOnce(mockExercise)   // getById
                .mockResolvedValueOnce(mockExercise);  // RETURNING *

            await service.update('ex-1', 'user-1', { themes: ['new-theme'] } as any);

            const query = mockDb.db.prepare.mock.calls[1][0] as string;
            expect(query).toContain('themes = ?');

            const bindArgs = mockDb.stmt.bind.mock.calls[1] as unknown[];
            expect(bindArgs).toContain('["new-theme"]');
        });

        it('builds UPDATE SQL with correct allowed fields', async () => {
            mockDb.stmt.first
                .mockResolvedValueOnce(mockExercise)
                .mockResolvedValueOnce({ ...mockExercise, title: 'Updated' });

            await service.update('ex-1', 'user-1', { title: 'Updated', level: 'National' } as any);

            const updateQuery = mockDb.db.prepare.mock.calls[1][0] as string;
            expect(updateQuery).toContain('title = ?');
            expect(updateQuery).toContain('level = ?');
            expect(updateQuery).toContain('updated_at = ?');
        });
    });

    // ─── delete ───────────────────────────────────────────────────────────────

    describe('delete', () => {
        it('returns false when exercise not found', async () => {
            mockDb.stmt.first.mockResolvedValue(null);
            expect(await service.delete('ex-1', 'user-1')).toBe(false);
        });

        it('throws Unauthorized when user is not owner', async () => {
            mockDb.stmt.first.mockResolvedValue({ ...mockExercise, user_id: 'other-user' });

            await expect(service.delete('ex-1', 'user-1')).rejects.toThrow('Unauthorized');
        });

        it('deletes exercise and returns true', async () => {
            mockDb.stmt.first.mockResolvedValue(mockExercise);
            mockDb.stmt.run.mockResolvedValue({ success: true, meta: { changes: 1 } });

            const result = await service.delete('ex-1', 'user-1');

            expect(result).toBe(true);
            const deleteQuery = mockDb.db.prepare.mock.calls[1][0] as string;
            expect(deleteQuery).toContain('DELETE FROM exercises');
        });
    });

    // ─── search ───────────────────────────────────────────────────────────────

    describe('search', () => {
        it('returns empty results when no exercises found', async () => {
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

        it('applies search filter on title and synopsis', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ search: 'pressing' });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('title LIKE ?');
            expect(query).toContain('synopsis LIKE ?');
        });

        it('applies category and level filters', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ category: 'Seniors', level: 'National' });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('category = ?');
            expect(query).toContain('level = ?');
        });

        it('applies theme filter with LIKE', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ theme: 'pressing' });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('themes LIKE ?');
        });

        it('sets hasMore=true and pops last item when results exceed limit', async () => {
            const exercises = Array.from({ length: 6 }, (_, i) => ({
                ...mockExercise, id: `ex-${i}`, created_at: 1700000000 - i
            }));
            mockDb.stmt.all.mockResolvedValue({ results: exercises });

            const result = await service.search({ limit: 5 });

            expect(result.hasMore).toBe(true);
            expect(result.data).toHaveLength(5);
            expect(result.nextCursor).not.toBeNull();
        });

        it('generates base64 cursor from last item', async () => {
            const exercises = Array.from({ length: 3 }, (_, i) => ({
                ...mockExercise, id: `ex-${i}`, created_at: 1700000000 - i
            }));
            mockDb.stmt.all.mockResolvedValue({ results: exercises });

            const result = await service.search({ limit: 2 });

            expect(result.nextCursor).not.toBeNull();
            const decoded = JSON.parse(atob(result.nextCursor!));
            expect(decoded.id).toBe('ex-1');
            expect(decoded.created_at).toBeDefined();
        });

        it('applies cursor filter when cursor is provided', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            const cursor = btoa(JSON.stringify({ created_at: 1700000000, id: 'ex-0' }));
            await service.search({ cursor });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('created_at < ?');
        });

        it('ignores invalid cursor without throwing', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await expect(service.search({ cursor: 'not-valid-base64!!!' })).resolves.toBeDefined();
        });

        it('fetches limit+1 rows to detect hasMore', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ limit: 10 });

            const bindArgs = mockDb.stmt.bind.mock.calls[0] as unknown[];
            expect(bindArgs).toContain(11);
        });
    });
});
