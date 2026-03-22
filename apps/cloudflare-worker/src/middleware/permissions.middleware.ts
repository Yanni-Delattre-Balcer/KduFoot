
import { checkPermissions } from '../auth0';
import { Permission, PermissionCheck } from '../types/permissions';
import type { Env } from '../types/env';
import type { Auth0JwtPayload } from '../types';

/**
 * This middleware checks if a request is authorized.
 * 'Middleware' is code that runs BEFORE the main route handler.
 */
export async function checkPermission(
    request: Request,
    env: Env,
    permission: Permission
): Promise<PermissionCheck> {
    const authHeader = request.headers.get('Authorization');

    // Check if the Authorization header is present and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { hasPermission: false, reason: 'Token manquant' };
    }

    const token = authHeader.substring(7);

    /**
     * Auth0 Verification:
     * We check if the token is valid and if the user has the required permission 'scope'.
     */
    const { access, payload } = await checkPermissions(token, [permission], env);

    if (!access) {
        return { hasPermission: false, reason: 'Permission refusée', statusCode: 401 };
    }

    /**
     * D1 Verification:
     * Check if the user is blocked in the database.
     */
    if (payload?.sub) {
        try {
            const cacheKey = `user:blocked:${payload.sub}`;
            const cachedStatus = await env.KV_CACHE.get(cacheKey);
            
            if (cachedStatus !== null) {
                if (cachedStatus === '1') {
                    return { hasPermission: false, reason: 'Utilisateur bloqué', statusCode: 403 };
                }
            } else {
                const dbUser = await env.DB.prepare('SELECT is_blocked, block_reason FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ is_blocked: number, block_reason: string }>();
                const isBlocked = dbUser && dbUser.is_blocked === 1;
                
                // Cache the status for 1 hour to reduce D1 pressure
                await env.KV_CACHE.put(cacheKey, isBlocked ? '1' : '0', { expirationTtl: 3600 });
                
                if (isBlocked) {
                    return { hasPermission: false, reason: dbUser?.block_reason || 'Utilisateur bloqué', statusCode: 403 };
                }
            }
        } catch (error) {
            console.error('Error checking blocked status:', error);
        }
    }

    /**
     * Quota Verification:
     * Some actions (like analyzing a video) are limited to a certain number of uses.
     * We use Cloudflare KV (Key-Value storage) to track how many times the user 
     * has performed the action in the current period (day/month).
     */
    const quotaCheck = await checkQuota(request, env, permission, token, payload);

    return quotaCheck.hasPermission ? { hasPermission: true, quota: quotaCheck.quota, payload } : quotaCheck;
}

async function checkQuota(
    request: Request,
    env: Env,
    permission: Permission,
    token: string,
    payload: Auth0JwtPayload
): Promise<PermissionCheck> {
    const quotaConfig: Record<string, { limit: number; period: string }> = {
        [Permission.VIDEOS_ANALYZE]: { limit: 0, period: 'daily' },
        [Permission.VIDEOS_ANALYZE_LONG]: { limit: 0, period: 'daily' },
        [Permission.SESSIONS_ADAPT]: { limit: 1000, period: 'monthly' },
        [Permission.MATCHES_CREATE]: { limit: 1000, period: 'monthly' },
    };

    const config = quotaConfig[permission];
    if (!config) return { hasPermission: true };

    const userId = extractUserIdFromPayload(payload);
    const kvKey = `quota:${userId}:${permission}:${getCurrentPeriod(config.period)}`;

    let current = parseInt(await env.KV_CACHE.get(kvKey) || '0');

    if (current >= config.limit) {
        return {
            hasPermission: false,
            reason: 'Quota atteint',
            quota: { current, limit: config.limit, resetAt: getNextPeriodReset(config.period) }
        };
    }

    // Note: In a real implementation, we invoke this increment ONLY when the action is actually performed successfully.
    // Here we assume checking permission might imply reserving quota, but usually we separate check from consumption.
    // For now, let's keep it check-only, and consumption should be explicit. 
    // BUT the provided code in analysis included the PUT. So I will keep it for now as "Check and Consume".
    // CAUTION: This means checking permission consumes quota! 
    // Ideally we should have a separate consumeQuota function.
    // Let's stick to the analysis logic but maybe add a flag if needed later.

    // Optimization: Only increment quota (KV.put) for non-GET requests
    if (request.method !== 'GET') {
        await env.KV_CACHE.put(kvKey, String(current + 1), {
            expirationTtl: getPeriodTTL(config.period)
        });
        current++;
    }

    return {
        hasPermission: true,
        quota: { current, limit: config.limit }
    };
}

function getCurrentPeriod(period: string): string {
    const now = new Date();
    return period === 'daily'
        ? now.toISOString().split('T')[0]
        : now.toISOString().slice(0, 7);
}

function getPeriodTTL(period: string): number {
    return period === 'daily' ? 86400 : 2592000;
}

function getNextPeriodReset(period: string): string {
    const now = new Date();
    if (period === 'daily') {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.toISOString();
    } else {
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setHours(0, 0, 0, 0);
        return nextMonth.toISOString();
    }
}

function extractUserIdFromPayload(payload: Auth0JwtPayload): string {
    return payload.sub || '';
}
