import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchService } from '../src/services/match.service';
import { mockEnv } from './setup';

describe('MatchService', () => {
    let matchService: MatchService;

    beforeEach(() => {
        matchService = new MatchService(mockEnv.DB as any);
        vi.clearAllMocks();
    });

    it('should exist and be instantiable', () => {
        expect(matchService).toBeDefined();
    });

    it('should correctly determine if it is too late to modify', () => {
        const futureDate = '2099-01-01';
        const futureTime = '12:00';
        // Should return false for very far future
        expect(matchService.isTooLateToModify(futureDate, futureTime)).toBe(false);
    });

    it('should map database row to Match object correctly', () => {
        const row = {
            id: '1',
            owner_id: 'user1',
            type: 'match',
            club_id: 'c1',
            club_name: 'Test Club',
            club_city: 'Test City',
            match_date: '2026-03-25',
            match_time: '18:00'
        } as any;

        const result = matchService.mapRowToMatch(row);
        expect(result.id).toBe('1');
        expect(result.club!.name).toBe('Test Club');
        expect(result.club!.city).toBe('Test City');
    });
});
