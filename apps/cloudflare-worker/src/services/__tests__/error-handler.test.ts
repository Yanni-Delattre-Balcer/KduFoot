import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandler } from '../../utils/error-handler';

describe('ErrorHandler', () => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    describe('handle()', () => {
        it('should return 500 with generic message for unknown errors', async () => {
            const response = ErrorHandler.handle(new Error('DB connection failed'), corsHeaders);
            const body = await response.json() as { success: boolean; error: string; code: number };

            expect(response.status).toBe(500);
            expect(body.success).toBe(false);
            expect(body.error).not.toContain('DB connection');
            expect(body.error).toContain("erreur interne");
        });

        it('should NEVER leak e.message to the client', async () => {
            const sensitiveError = new Error('SQLITE_ERROR: table users has no column named password_hash');
            const response = ErrorHandler.handle(sensitiveError, corsHeaders);
            const body = await response.json() as { error: string };

            expect(body.error).not.toContain('SQLITE');
            expect(body.error).not.toContain('password_hash');
        });

        it('should use correct status code from custom error', async () => {
            const error = Object.assign(new Error('Not found'), { status: 404 });
            const response = ErrorHandler.handle(error, corsHeaders);

            expect(response.status).toBe(404);
        });

        it('should return safe message for 400 errors', async () => {
            const error = Object.assign(new Error('Invalid JSON at position 42'), { status: 400 });
            const response = ErrorHandler.handle(error, corsHeaders);
            const body = await response.json() as { error: string };

            expect(response.status).toBe(400);
            expect(body.error).not.toContain('position 42');
            expect(body.error).toContain("invalide");
        });

        it('should return safe message for 429 rate limit errors', async () => {
            const error = Object.assign(new Error('Rate limit key abc:123'), { status: 429 });
            const response = ErrorHandler.handle(error, corsHeaders);
            const body = await response.json() as { error: string };

            expect(response.status).toBe(429);
            expect(body.error).not.toContain('abc:123');
        });

        it('should handle non-Error objects with status', async () => {
            const error = { status: 403, message: 'secret admin path' };
            const response = ErrorHandler.handle(error, corsHeaders);

            expect(response.status).toBe(403);
        });

        it('should default to 500 for plain strings', async () => {
            const response = ErrorHandler.handle('something broke', corsHeaders);

            expect(response.status).toBe(500);
        });
    });

    describe('unauthorized()', () => {
        it('should return 401', () => {
            const response = ErrorHandler.unauthorized(corsHeaders);
            expect(response.status).toBe(401);
        });
    });

    describe('forbidden()', () => {
        it('should return 403', () => {
            const response = ErrorHandler.forbidden(corsHeaders);
            expect(response.status).toBe(403);
        });
    });
});
