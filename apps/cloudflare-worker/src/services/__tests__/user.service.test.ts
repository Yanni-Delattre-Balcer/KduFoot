import { describe, it, expect, vi } from 'vitest';
import { UserService } from '../user.service';

/** Helper to create a mock D1Database */
function createMockDb(overrides: Record<string, unknown> = {}) {
    return {
        prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnThis(),
            first: vi.fn().mockResolvedValue(null),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
        }),
        batch: vi.fn().mockResolvedValue([]),
        ...overrides,
    } as unknown as D1Database;
}

describe('UserService', () => {
    describe('getUserById', () => {
        it('should return null when user does not exist', async () => {
            const db = createMockDb();
            const service = new UserService(db);
            const result = await service.getUserById('nonexistent-id');
            expect(result).toBeNull();
        });

        it('should return user when found', async () => {
            const mockUser = { id: '123', email: 'test@kdufoot.com', auth0_sub: 'auth0|123' };
            const db = createMockDb();
            (db.prepare as ReturnType<typeof vi.fn>).mockReturnValue({
                bind: vi.fn().mockReturnThis(),
                first: vi.fn().mockResolvedValue(mockUser),
            });

            const service = new UserService(db);
            const result = await service.getUserById('123');
            expect(result).toEqual({ ...mockUser, additional_sirets: [] });
        });
    });

    describe('getUserByAuth0Sub', () => {
        it('should query by auth0_sub', async () => {
            const db = createMockDb();
            const service = new UserService(db);
            await service.getUserByAuth0Sub('auth0|abc');

            expect(db.prepare).toHaveBeenCalledWith(
                expect.stringContaining('auth0_sub')
            );
        });
    });

    describe('deleteUser', () => {
        it('should call DELETE FROM users', async () => {
            const db = createMockDb();
            const service = new UserService(db);
            await service.deleteUser('user-to-delete');

            expect(db.prepare).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM')
            );
        });
    });
});
