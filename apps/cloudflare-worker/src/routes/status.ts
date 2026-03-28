import type { Router, AuthenticatedRequest } from './router';
import type { Env } from '../types/env';
import type { ExecutionContext } from "@cloudflare/workers-types";

export const setupStatusRoutes = (router: Router, env: Env) => {
    /**
     * GET /api/stats/coaches — Public endpoint: total registered coaches count
     */
    router.get('/api/stats/coaches', async (request: AuthenticatedRequest, env: Env, ctx: ExecutionContext) => {
        try {
            // Check KV cache first (5 min TTL)
            const cacheKey = 'stats:coaches_count';
            if (env.KV_CACHE) {
                const cached = await env.KV_CACHE.get<{ count: number }>(cacheKey, 'json');
                if (cached) {
                    return Response.json({ success: true, count: cached.count }, { headers: router.corsHeaders });
                }
            }

            const result = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
            const count = result?.count || 0;

            // Cache for 5 minutes
            if (env.KV_CACHE) {
                ctx.waitUntil(env.KV_CACHE.put(cacheKey, JSON.stringify({ count }), { expirationTtl: 300 }));
            }

            return Response.json({ success: true, count }, { headers: router.corsHeaders });
        } catch (e) {
            console.error('[Stats] Coach count error:', e);
            return Response.json({ success: true, count: 0 }, { headers: router.corsHeaders });
        }
    });

    router.get('/api/status', async (request: AuthenticatedRequest, env: Env, ctx: ExecutionContext) => {
        const results: Record<string, string> = {
            api: 'ok',
            version: '2.0.0-platinum',
            timestamp: new Date().toISOString(),
        };

        // Check Database (D1)
        try {
            await env.DB.prepare('SELECT 1').first();
            results.database = 'connected';
        } catch (e) {
            results.database = 'error';
        }

        // Check KV
        try {
            await env.KV_CACHE.get('maintenance:status');
            results.kv = 'connected';
        } catch (e) {
            results.kv = 'error';
        }

        // Determine global health
        const isHealthy = Object.values(results).every(v => v !== 'error');
        
        return new Response(JSON.stringify({
            healthy: isHealthy,
            services: results
        }), {
            status: isHealthy ? 200 : 503,
            headers: router.corsHeaders
        });
    });
};
