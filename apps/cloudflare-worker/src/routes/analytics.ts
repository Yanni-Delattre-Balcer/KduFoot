import { Router } from './router';
import { Env } from '../types/env';
import { Sentry } from '../utils/sentry';

/**
 * Analytics Routes
 * Handles Core Web Vitals and RUM metrics reporting.
 */
export const setupAnalyticsRoutes = (router: Router, _env: Env) => {
    /**
     * POST /api/analytics/vitals
     * Receives RUM metrics from the client.
     */
    router.post('/api/analytics/vitals', async (request: Request) => {
        try {
            const body = await request.json();
            
            // Log to Sentry for performance monitoring if needed
            // Sentry.captureMessage(`RUM Metric: ${(body as any).name}`, {
            //     level: 'info',
            //     extra: { metric: body }
            // });

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: {
                    ...router.corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid payload' }), {
                status: 400,
                headers: router.corsHeaders
            });
        }
    });
};
