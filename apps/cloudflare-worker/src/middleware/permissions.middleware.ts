
import { checkPermissions } from '../auth0';
import { Permission, PermissionCheck } from '../types/permissions';
import type { Env } from '../types/env';

export async function checkPermission(
    request: Request,
    env: Env,
    permission: Permission
): Promise<PermissionCheck> {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { hasPermission: false, reason: 'Token manquant' };
    }

    const token = authHeader.substring(7);

    // Vérification Auth0
    // Note: checkPermissions from auth0.ts returns { access: boolean, payload: jose.JWTPayload, permissions: string[] }
    const { access, payload } = await checkPermissions(token, [permission], env);

    if (!access) {
        return { hasPermission: false, reason: 'Permission refusée' };
    }

    // Vérification quotas
    const quotaCheck = await checkQuota(request, env, permission, token, payload);

    return quotaCheck.hasPermission ? { hasPermission: true, quota: quotaCheck.quota } : quotaCheck;
}

async function checkQuota(
    request: Request,
    env: Env,
    permission: Permission,
    token: string,
    payload: any
): Promise<PermissionCheck> {
    const quotaConfig: Record<string, { limit: number; period: string }> = {
        [Permission.VIDEOS_ANALYZE]: { limit: 3, period: 'daily' },
        [Permission.VIDEOS_ANALYZE_LONG]: { limit: 10, period: 'daily' },
        [Permission.SESSIONS_ADAPT]: { limit: 3, period: 'monthly' },
        [Permission.MATCHES_CREATE]: { limit: 50, period: 'monthly' },
    };

    const config = quotaConfig[permission];
    if (!config) return { hasPermission: true };

    const userId = extractUserIdFromPayload(payload);
    const kvKey = `quota:${userId}:${permission}:${getCurrentPeriod(config.period)}`;

    const current = parseInt(await env.KV_CACHE.get(kvKey) || '0');

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

    await env.KV_CACHE.put(kvKey, String(current + 1), {
        expirationTtl: getPeriodTTL(config.period)
    });

    return {
        hasPermission: true,
        quota: { current: current + 1, limit: config.limit }
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

function extractUserIdFromPayload(payload: any): string {
    return payload.sub;
}
