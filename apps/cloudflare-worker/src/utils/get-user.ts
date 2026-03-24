import { Env } from '../types/env';

const USER_ID_CACHE_TTL_S = 60; // 1 minute

/**
 * Resolve an Auth0 sub to the internal D1 user id.
 * Uses KV as a short-lived cache to avoid a D1 round-trip on every authenticated request.
 */
export async function getDbUserId(auth0Sub: string | undefined, env: Env): Promise<string | null> {
    if (!auth0Sub) return null;

    const cacheKey = `user:id:${auth0Sub}`;

    if (env.KV_CACHE) {
        const cached = await env.KV_CACHE.get(cacheKey);
        if (cached !== null) return cached;
    }

    const row = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?')
        .bind(auth0Sub)
        .first<{ id: string }>();

    const id = row?.id ?? null;

    if (id && env.KV_CACHE) {
        // Fire-and-forget — don't block the response on the KV write
        env.KV_CACHE.put(cacheKey, id, { expirationTtl: USER_ID_CACHE_TTL_S }).catch(() => {});
    }

    return id;
}
