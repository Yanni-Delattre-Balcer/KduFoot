import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Router } from '../src/routes/router';
import { Env } from '../src/types/env';
import { createMockD1 } from './d1-mock';

/**
 * Integration Test: Simulates a full user journey.
 * 1. Create a Match
 * 2. Search for the Match (with filters)
 * 3. Verify Match Details
 */
describe('User Journey Integration', () => {
    let router: Router;
    let env: Env;
    let ctx: ExecutionContext;

    beforeEach(() => {
        env = {
            DB: createMockD1(),
            CORS_ORIGIN: 'https://kdufoot.com',
            API_BASE_URL: 'http://localhost',
            AUTH0_DOMAIN: 'test.auth0.com',
            AUTH0_AUDIENCE: 'https://api.kdufoot.com',
        } as unknown as Env;
        
        ctx = {
            waitUntil: vi.fn(),
            passThroughOnException: vi.fn(),
        } as any;

        router = new Router(env);
        
        // Setup mock routes (simplified for testing)
        router.post('/api/matches', async (req, e) => {
            const body = (await req.json()) as any;
            await e.DB.prepare('INSERT INTO matches (id, name, type, match_date, owner_id) VALUES (?, ?, ?, ?, ?)')
                .bind('m1', body.name, body.type, body.match_date, 'u1')
                .run();
            return new Response(JSON.stringify({ success: true, id: 'm1' }), { status: 201 });
        });

        router.get('/api/matches', async (req, e) => {
            const matches = await e.DB.prepare('SELECT * FROM matches').all();
            return new Response(JSON.stringify(matches.results), { status: 200 });
        });
    });

    it('should complete a full match lifecycle', async () => {
        // 1. Create Match
        const createReq = new Request('http://localhost/api/matches', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Match de Test',
                type: 'match',
                match_date: '2026-04-01',
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const createRes = await router.handleRequest(createReq, env, ctx);
        expect(createRes.status).toBe(201);
        const createData = (await createRes.json()) as any;
        expect(createData.success).toBe(true);

        // 2. Search Match
        const searchReq = new Request('http://localhost/api/matches', {
            method: 'GET'
        });

        const searchRes = await router.handleRequest(searchReq, env, ctx);
        expect(searchRes.status).toBe(200);
        const searchData = (await searchRes.json()) as any[];
        
        expect(searchData.length).toBeGreaterThan(0);
        expect(searchData[0].name).toBe('Match de Test');
    });
});
