import { AuthenticatedRequest } from '../router';
import { Env } from '../../types/env';
import { checkPermissions } from '../../auth0';
import { Permission } from '../../types/permissions';


export const getCallerEmail = async (request: AuthenticatedRequest, env: Env): Promise<string | null> => {
    try {
        const payload = request.user || {} as Record<string, unknown>;
        if (payload.email) return payload.email as string;

        const sub = payload.sub;
        if (!sub) return null;
        const dbUser = await env.DB.prepare('SELECT email FROM users WHERE auth0_sub = ?').bind(sub).first<{ email: string }>();
        return dbUser?.email || null;
    } catch {
        return null;
    }
};

export const getCallerD1Id = async (request: AuthenticatedRequest, env: Env): Promise<string | null> => {
    try {
        const payload = request.user || {} as Record<string, unknown>;
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        return dbUser?.id || null;
    } catch {
        return null;
    }
};

export const checkAdmin = async (request: AuthenticatedRequest, env: Env): Promise<boolean> => {
    const [email, d1Id] = await Promise.all([
        getCallerEmail(request, env),
        getCallerD1Id(request, env)
    ]);
    
    if ((env.SUPER_ADMIN_EMAIL && email === env.SUPER_ADMIN_EMAIL) || (env.SUPER_ADMIN_ID && d1Id === env.SUPER_ADMIN_ID)) {
        return true;
    }

    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return false;
        const token = authHeader.substring(7);
        const { access } = await checkPermissions(token, [Permission.ADMIN_AUTH0], env);
        return access;
    } catch {
        return false;
    }
};
