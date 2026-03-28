import type { Router, AuthenticatedRequest } from './router';
import type { Env } from '../types/env';
import type { ExecutionContext } from "@cloudflare/workers-types";

export const setupStatusRoutes = (router: Router, env: Env) => {
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
