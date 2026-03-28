import { AuthenticatedRequest } from "../routes/router";
import { Env } from "../types/env";

export type QuotaMetric = 'ia_analysis' | 'pdf_export';

export const checkQuota = (metric: QuotaMetric, freeLimit: number) => {
    return async (request: AuthenticatedRequest, env: Env) => {
        const user = request.user;
        if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const subscription = (user.subscription as string) || 'Free';
        const isAdmin = request.isAdmin || false;

        // Admins and Elite users have no limits
        if (subscription === 'Elite' || subscription === 'Pro' || isAdmin) {
            return; 
        }

        // Check current usage in D1
        const usage = await env.DB.prepare(
            'SELECT usage_count FROM user_usage WHERE user_id = ? AND metric_name = ?'
        ).bind(user.id, metric).first<{ usage_count: number }>();

        const currentCount = usage?.usage_count || 0;

        if (currentCount >= freeLimit) {
            return Response.json({ 
                success: false, 
                error: `Quota atteint pour cette fonctionnalité (${metric}). Passez à l'offre Pro pour débloquer l'accès illimité.`,
                quota_reached: true
            }, { 
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Note: The actual increment should happen in the route handler after success
        // or we can do it here if we want to be strict. 
        // For FAANG standard, we usually increment AFTER successful action.
    };
};

export const incrementUsage = async (db: D1Database, userId: string, metric: QuotaMetric) => {
    await db.prepare(`
        INSERT INTO user_usage (user_id, metric_name, usage_count, last_reset_at)
        VALUES (?, ?, 1, unixepoch())
        ON CONFLICT(user_id, metric_name) DO UPDATE SET
            usage_count = usage_count + 1,
            last_reset_at = CASE 
                WHEN unixepoch() - last_reset_at > 2592000 THEN unixepoch() 
                ELSE last_reset_at 
            END,
            usage_count = CASE 
                WHEN unixepoch() - last_reset_at > 2592000 THEN 1 
                ELSE usage_count + 1 
            END
    `).bind(userId, metric).run();
};
