import { describe, it, expect } from 'vitest';
import { ErrorHandler } from '../src/utils/error-handler';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
};

describe('ErrorHandler', () => {

    // ─── handle ───────────────────────────────────────────────────────────────

    describe('handle', () => {
        it('returns 500 for unknown errors', async () => {
            const res = ErrorHandler.handle(new Error('something broke'), corsHeaders);
            expect(res.status).toBe(500);
            const body = await res.json() as any;
            expect(body.success).toBe(false);
            expect(body.code).toBe(500);
        });

        it('never leaks internal error message to client', async () => {
            const res = ErrorHandler.handle(new Error('DB_PASSWORD=super_secret'), corsHeaders);
            const body = await res.json() as any;
            expect(body.error).not.toContain('DB_PASSWORD');
            expect(body.error).not.toContain('super_secret');
        });

        it('uses safe generic message mapped to status code', async () => {
            const res = ErrorHandler.handle(new Error('not found'), corsHeaders);
            const body = await res.json() as any;
            // Default status is 500 since no .status property
            expect(body.error).toBe('Une erreur interne s\'est produite. Veuillez réessayer plus tard.');
        });

        it('reads status from error.status property', async () => {
            const err = Object.assign(new Error('forbidden'), { status: 403 });
            const res = ErrorHandler.handle(err, corsHeaders);
            expect(res.status).toBe(403);
            const body = await res.json() as any;
            expect(body.code).toBe(403);
            expect(body.error).toBe('Accès refusé.');
        });

        it('handles 400 bad request', async () => {
            const err = Object.assign(new Error('bad'), { status: 400 });
            const res = ErrorHandler.handle(err, corsHeaders);
            expect(res.status).toBe(400);
            const body = await res.json() as any;
            expect(body.error).toBe('Requête invalide.');
        });

        it('handles 401 unauthorized', async () => {
            const err = Object.assign(new Error('unauth'), { status: 401 });
            const res = ErrorHandler.handle(err, corsHeaders);
            expect(res.status).toBe(401);
            const body = await res.json() as any;
            expect(body.error).toBe('Non autorisé.');
        });

        it('handles 404 not found', async () => {
            const err = Object.assign(new Error('missing'), { status: 404 });
            const res = ErrorHandler.handle(err, corsHeaders);
            expect(res.status).toBe(404);
            const body = await res.json() as any;
            expect(body.error).toBe('Ressource introuvable.');
        });

        it('handles 409 conflict', async () => {
            const err = Object.assign(new Error('conflict'), { status: 409 });
            const res = ErrorHandler.handle(err, corsHeaders);
            expect(res.status).toBe(409);
            const body = await res.json() as any;
            expect(body.error).toContain('Conflit');
        });

        it('handles 422 unprocessable', async () => {
            const err = Object.assign(new Error('invalid data'), { status: 422 });
            const res = ErrorHandler.handle(err, corsHeaders);
            expect(res.status).toBe(422);
            const body = await res.json() as any;
            expect(body.error).toBe('Données invalides.');
        });

        it('handles 429 too many requests', async () => {
            const err = Object.assign(new Error('rate limit'), { status: 429 });
            const res = ErrorHandler.handle(err, corsHeaders);
            expect(res.status).toBe(429);
            const body = await res.json() as any;
            expect(body.error).toContain('requêtes');
        });

        it('falls back to 500 message for unmapped status codes', async () => {
            const err = Object.assign(new Error('teapot'), { status: 418 });
            const res = ErrorHandler.handle(err, corsHeaders);
            expect(res.status).toBe(418);
            const body = await res.json() as any;
            // No mapping for 418 → falls back to 500 message
            expect(body.error).toBe('Une erreur interne s\'est produite. Veuillez réessayer plus tard.');
        });

        it('handles non-Error objects with status property', async () => {
            const err = { status: 403, message: 'forbidden object' };
            const res = ErrorHandler.handle(err, corsHeaders);
            expect(res.status).toBe(403);
        });

        it('handles null/undefined error gracefully', async () => {
            const res = ErrorHandler.handle(null, corsHeaders);
            expect(res.status).toBe(500);
        });

        it('handles string errors gracefully', async () => {
            const res = ErrorHandler.handle('something went wrong', corsHeaders);
            expect(res.status).toBe(500);
        });

        it('includes CORS headers in response', async () => {
            const res = ErrorHandler.handle(new Error('test'), corsHeaders);
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
        });

        it('returns JSON content-type header', async () => {
            const res = ErrorHandler.handle(new Error('test'), corsHeaders);
            expect(res.headers.get('Content-Type')).toContain('application/json');
        });

        it('response body has success=false', async () => {
            const res = ErrorHandler.handle(new Error('test'), corsHeaders);
            const body = await res.json() as any;
            expect(body.success).toBe(false);
        });
    });

    // ─── unauthorized ─────────────────────────────────────────────────────────

    describe('unauthorized', () => {
        it('returns 401 status', async () => {
            const res = ErrorHandler.unauthorized(corsHeaders);
            expect(res.status).toBe(401);
        });

        it('returns success=false with non-autorisé message', async () => {
            const res = ErrorHandler.unauthorized(corsHeaders);
            const body = await res.json() as any;
            expect(body.success).toBe(false);
            expect(body.error).toContain('autorisé');
        });

        it('includes CORS headers', async () => {
            const res = ErrorHandler.unauthorized(corsHeaders);
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
        });
    });

    // ─── forbidden ────────────────────────────────────────────────────────────

    describe('forbidden', () => {
        it('returns 403 status', async () => {
            const res = ErrorHandler.forbidden(corsHeaders);
            expect(res.status).toBe(403);
        });

        it('returns success=false with accès refusé message', async () => {
            const res = ErrorHandler.forbidden(corsHeaders);
            const body = await res.json() as any;
            expect(body.success).toBe(false);
            expect(body.error).toContain('refusé');
        });

        it('includes CORS headers', async () => {
            const res = ErrorHandler.forbidden(corsHeaders);
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
        });
    });
});
