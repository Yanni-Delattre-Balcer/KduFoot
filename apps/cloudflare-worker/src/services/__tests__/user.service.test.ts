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
});
