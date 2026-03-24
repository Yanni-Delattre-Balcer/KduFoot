import { describe, it, expect } from 'vitest';
import {
    CreateMatchSchema,
    UpdateMatchSchema,
    ContactMatchSchema,
    UpdateScoreSchema
} from '../src/utils/validation';

const validMatchInput = {
    club_id: 'club-1',
    category: 'Seniors',
    level: 'Régional',
    format: '11v11' as const,
    match_date: '2026-06-15',
    match_time: '15:00',
    venue: 'Domicile' as const,
    email: 'contact@club.fr',
    phone: '0612345678'
};

describe('CreateMatchSchema', () => {
    it('passes with all required fields', () => {
        const result = CreateMatchSchema.safeParse(validMatchInput);
        expect(result.success).toBe(true);
    });

    it('fails when club_id is empty', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, club_id: '' });
        expect(result.success).toBe(false);
    });

    it('fails when category is missing', () => {
        const { category, ...rest } = validMatchInput;
        const result = CreateMatchSchema.safeParse(rest);
        expect(result.success).toBe(false);
    });

    it('fails with invalid format value', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, format: '3v3' });
        expect(result.success).toBe(false);
    });

    it('accepts all valid formats', () => {
        const formats = ['11v11', '8v8', '7v7', '5v5', 'Futsal'] as const;
        for (const format of formats) {
            const result = CreateMatchSchema.safeParse({ ...validMatchInput, format });
            expect(result.success, `format '${format}' should be valid`).toBe(true);
        }
    });

    it('fails with invalid match_date format', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, match_date: '15/06/2026' });
        expect(result.success).toBe(false);
    });

    it('accepts YYYY-MM-DD date format', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, match_date: '2026-12-31' });
        expect(result.success).toBe(true);
    });

    it('fails with invalid match_time format', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, match_time: '3pm' });
        expect(result.success).toBe(false);
    });

    it('accepts HH:MM time format', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, match_time: '09:30' });
        expect(result.success).toBe(true);
    });

    it('fails with invalid venue value', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, venue: 'Neutre' });
        expect(result.success).toBe(false);
    });

    it('accepts Domicile and Extérieur venues', () => {
        expect(CreateMatchSchema.safeParse({ ...validMatchInput, venue: 'Domicile' }).success).toBe(true);
        expect(CreateMatchSchema.safeParse({ ...validMatchInput, venue: 'Extérieur' }).success).toBe(true);
    });

    it('fails with invalid email', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, email: 'not-an-email' });
        expect(result.success).toBe(false);
    });

    it('fails when phone is too short (< 10 chars)', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, phone: '061234' });
        expect(result.success).toBe(false);
    });

    it('fails when notes exceeds 500 characters', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, notes: 'a'.repeat(501) });
        expect(result.success).toBe(false);
    });

    it('accepts notes up to 500 characters', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, notes: 'a'.repeat(500) });
        expect(result.success).toBe(true);
    });

    it('accepts optional name with min 2 chars', () => {
        expect(CreateMatchSchema.safeParse({ ...validMatchInput, name: 'AB' }).success).toBe(true);
    });

    it('fails when optional name is too short', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, name: 'A' });
        expect(result.success).toBe(false);
    });

    it('accepts optional max_teams between 2 and 64', () => {
        expect(CreateMatchSchema.safeParse({ ...validMatchInput, max_teams: 8 }).success).toBe(true);
        expect(CreateMatchSchema.safeParse({ ...validMatchInput, max_teams: 2 }).success).toBe(true);
        expect(CreateMatchSchema.safeParse({ ...validMatchInput, max_teams: 64 }).success).toBe(true);
    });

    it('fails when max_teams is below 2', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, max_teams: 1 });
        expect(result.success).toBe(false);
    });

    it('fails when max_teams exceeds 64', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, max_teams: 65 });
        expect(result.success).toBe(false);
    });

    it('fails when registration_fee is negative', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, registration_fee: -5 });
        expect(result.success).toBe(false);
    });

    it('accepts registration_fee of 0', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, registration_fee: 0 });
        expect(result.success).toBe(true);
    });

    it('accepts match_end_time with valid HH:MM format', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, match_end_time: '17:30' });
        expect(result.success).toBe(true);
    });

    it('fails when match_end_time has invalid format', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, match_end_time: 'invalid' });
        expect(result.success).toBe(false);
    });

    it('accepts type values "match" and "tournament"', () => {
        expect(CreateMatchSchema.safeParse({ ...validMatchInput, type: 'match' }).success).toBe(true);
        expect(CreateMatchSchema.safeParse({ ...validMatchInput, type: 'tournament' }).success).toBe(true);
    });

    it('fails with invalid type value', () => {
        const result = CreateMatchSchema.safeParse({ ...validMatchInput, type: 'friendly' });
        expect(result.success).toBe(false);
    });
});

describe('UpdateMatchSchema', () => {
    it('passes with empty object (all fields optional)', () => {
        const result = UpdateMatchSchema.safeParse({});
        expect(result.success).toBe(true);
    });

    it('passes with partial update (only status)', () => {
        const result = UpdateMatchSchema.safeParse({ status: 'found' });
        expect(result.success).toBe(true);
    });

    it('accepts valid status values', () => {
        const statuses = ['active', 'found', 'expired'] as const;
        for (const status of statuses) {
            const result = UpdateMatchSchema.safeParse({ status });
            expect(result.success, `status '${status}' should be valid`).toBe(true);
        }
    });

    it('fails with invalid status value', () => {
        const result = UpdateMatchSchema.safeParse({ status: 'cancelled' });
        expect(result.success).toBe(false);
    });

    it('still validates fields when provided', () => {
        const result = UpdateMatchSchema.safeParse({ email: 'not-an-email' });
        expect(result.success).toBe(false);
    });

    it('accepts valid partial update with email', () => {
        const result = UpdateMatchSchema.safeParse({ email: 'new@club.fr' });
        expect(result.success).toBe(true);
    });
});

describe('ContactMatchSchema', () => {
    it('passes with a valid message', () => {
        const result = ContactMatchSchema.safeParse({ message: 'Bonjour, disponibles ce samedi ?' });
        expect(result.success).toBe(true);
    });

    it('fails with empty message', () => {
        const result = ContactMatchSchema.safeParse({ message: '' });
        expect(result.success).toBe(false);
    });

    it('fails when message exceeds 500 characters', () => {
        const result = ContactMatchSchema.safeParse({ message: 'x'.repeat(501) });
        expect(result.success).toBe(false);
    });

    it('accepts message of exactly 500 characters', () => {
        const result = ContactMatchSchema.safeParse({ message: 'x'.repeat(500) });
        expect(result.success).toBe(true);
    });

    it('accepts message of exactly 1 character', () => {
        const result = ContactMatchSchema.safeParse({ message: '!' });
        expect(result.success).toBe(true);
    });

    it('fails when message field is missing', () => {
        const result = ContactMatchSchema.safeParse({});
        expect(result.success).toBe(false);
    });
});

describe('UpdateScoreSchema', () => {
    it('passes with valid positive scores', () => {
        const result = UpdateScoreSchema.safeParse({ score_a: 3, score_b: 1 });
        expect(result.success).toBe(true);
    });

    it('passes with zero scores', () => {
        const result = UpdateScoreSchema.safeParse({ score_a: 0, score_b: 0 });
        expect(result.success).toBe(true);
    });

    it('fails with negative score_a', () => {
        const result = UpdateScoreSchema.safeParse({ score_a: -1, score_b: 0 });
        expect(result.success).toBe(false);
    });

    it('fails with negative score_b', () => {
        const result = UpdateScoreSchema.safeParse({ score_a: 2, score_b: -1 });
        expect(result.success).toBe(false);
    });

    it('fails with non-integer score_a', () => {
        const result = UpdateScoreSchema.safeParse({ score_a: 1.5, score_b: 0 });
        expect(result.success).toBe(false);
    });

    it('fails with non-integer score_b', () => {
        const result = UpdateScoreSchema.safeParse({ score_a: 0, score_b: 2.7 });
        expect(result.success).toBe(false);
    });

    it('fails when score_a is missing', () => {
        const result = UpdateScoreSchema.safeParse({ score_b: 1 });
        expect(result.success).toBe(false);
    });

    it('fails when score_b is missing', () => {
        const result = UpdateScoreSchema.safeParse({ score_a: 1 });
        expect(result.success).toBe(false);
    });

    it('fails with string scores', () => {
        const result = UpdateScoreSchema.safeParse({ score_a: '3', score_b: '1' });
        expect(result.success).toBe(false);
    });
});
