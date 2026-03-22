import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchService } from '../src/services/match.service';
import { D1Database } from '@cloudflare/workers-types';

describe('MatchService', () => {
    let db: D1Database;
    let matchService: MatchService;

    beforeEach(() => {
        // Mock D1 Database
        db = {
            prepare: vi.fn().mockReturnThis(),
            bind: vi.fn().mockReturnThis(),
            all: vi.fn(),
            first: vi.fn(),
            run: vi.fn(),
            batch: vi.fn()
        } as unknown as D1Database;

        matchService = new MatchService(db);
    });



    it('should map database row to Match object correctly', () => {
        const row = {
            id: '1',
            owner_id: 'user1',
            type: 'match',
            club_name: 'Test Club',
            club_city: 'Test City',
            club_logo_url: 'http://logo.com',
            match_date: '2026-03-25'
        };

        const result = (matchService as any).mapRowToMatch(row);
        expect(result.id).toBe('1');
        expect(result.club.name).toBe('Test Club');
        expect(result.club.city).toBe('Test City');
    });

    it('should handle missing club data in mapRowToMatch', () => {
        const row = {
            id: '1',
            owner_id: 'user1',
            type: 'match',
            match_date: '2026-03-25'
        } as any;

        const result = (matchService as any).mapRowToMatch(row);
        expect(result.club.name).toBe('');
    });
});
