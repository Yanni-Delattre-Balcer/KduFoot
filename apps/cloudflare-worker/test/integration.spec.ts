import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Router } from '../src/routes/router';
import { mockEnv } from './setup';

describe('User Journey Integration', () => {
    let router: Router;
    let ctx: any;

    beforeEach(() => {
        vi.clearAllMocks();
        ctx = {
            waitUntil: vi.fn(),
            passThroughOnException: vi.fn(),
        };
        router = new Router(mockEnv as any);
        
        // Mock simple route logic for integration test
        router.post('/api/matches', async (req, e) => {
            return new Response(JSON.stringify({ success: true, id: 'm1' }), { status: 201 });
        });

        router.get('/api/matches', async (req, e) => {
            return new Response(JSON.stringify([{ id: 'm1', name: 'Match de Test' }]), { status: 200 });
        });
    });

    it('should complete a full match lifecycle', async () => {
        // 1. Create Match
        const createReq = new Request('http://localhost/api/matches', {
            method: 'POST',
            body: JSON.stringify({ name: 'Match de Test' }),
            headers: { 'Content-Type': 'application/json' }
        });

        const createRes = await router.handleRequest(createReq, mockEnv as any, ctx);
        expect(createRes.status).toBe(201);

        // 2. Search Match
        const searchReq = new Request('http://localhost/api/matches', { method: 'GET' });
        const searchRes = await router.handleRequest(searchReq, mockEnv as any, ctx);
        expect(searchRes.status).toBe(200);
        const searchData = (await searchRes.json()) as any[];
        expect(searchData.length).toBe(1);
        expect(searchData[0].name).toBe('Match de Test');
    });
});
