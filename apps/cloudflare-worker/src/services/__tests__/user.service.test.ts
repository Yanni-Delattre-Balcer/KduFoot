import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../user.service';
import { mockEnv } from '../../../test/setup';

describe('UserService', () => {
    let service: UserService;

    beforeEach(() => {
        service = new UserService(mockEnv.DB as any);
        vi.clearAllMocks();
    });

    it('should return null when user does not exist', async () => {
        (mockEnv.DB.prepare as any)().bind().first.mockResolvedValueOnce(null);
        const result = await service.getUserById('nonexistent-id');
        expect(result).toBeNull();
    });

    it('should return user when found', async () => {
        const mockUser = { id: '123', email: 'test@kdufoot.com', auth0_sub: 'auth0|123' };
        (mockEnv.DB.prepare as any)().bind().first.mockResolvedValueOnce(mockUser);

        const result = await service.getUserById('123');
        expect(result).toBeDefined();
        expect(result?.id).toBe('123');
        // The service adds additional_sirets: []
        expect(result).toHaveProperty('additional_sirets');
    });

    it('should delete user', async () => {
        (mockEnv.DB.prepare as any)().bind().run.mockResolvedValueOnce({ success: true });
        await service.deleteUser('user-1');
        expect(mockEnv.DB.prepare).toHaveBeenCalled();
    });

    describe('parseUser', () => {
        it('should return null for null input', () => {
            expect(service.parseUser(null)).toBeNull();
        });

        it('should parse stringified additional_sirets', () => {
            const user = { id: '1', additional_sirets: '["12345","67890"]' } as any;
            const result = service.parseUser(user);
            expect(result?.additional_sirets).toEqual(['12345', '67890']);
        });

        it('should heal double-stringified additional_sirets', () => {
            const user = { id: '1', additional_sirets: '"[\\"12345\\"]"' } as any;
            const result = service.parseUser(user);
            expect(result?.additional_sirets).toEqual(['12345']);
        });

        it('should default to empty array for corrupted JSON', () => {
            const user = { id: '1', additional_sirets: 'not-json' } as any;
            const result = service.parseUser(user);
            expect(result?.additional_sirets).toEqual([]);
        });

        it('should keep existing array as-is', () => {
            const user = { id: '1', additional_sirets: ['a', 'b'] } as any;
            const result = service.parseUser(user);
            expect(result?.additional_sirets).toEqual(['a', 'b']);
        });

        it('should default non-array non-string to empty array', () => {
            const user = { id: '1', additional_sirets: 42 } as any;
            const result = service.parseUser(user);
            expect(result?.additional_sirets).toEqual([]);
        });
    });
});
