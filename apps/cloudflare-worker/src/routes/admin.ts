
import { Router } from './router';
import { Env } from '../types/env';
import { UserService } from '../services/user.service';
import { MatchService } from '../services/match.service';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';

const SUPER_ADMIN_EMAIL = 'yannidelattrebalcer.artois@gmail.com';

export const setupAdminRoutes = (router: Router, env: Env) => {
    const userService = new UserService(env.DB);
    const matchService = new MatchService(env.DB);

    /**
     * Resolves the calling user's email from the JWT sub claim by looking up in D1.
     * Auth0 access tokens don't always include the email claim directly.
     */
    const getCallerEmail = async (request: Request): Promise<string | null> => {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader) return null;
            const token = authHeader.substring(7);
            const payload = JSON.parse(atob(token.split('.')[1]));

            // Try direct email claim first (may exist in some configurations)
            if (payload.email) return payload.email;

            // Fallback: look up email from D1 using the sub claim
            const sub = payload.sub;
            if (!sub) return null;
            const dbUser = await env.DB.prepare('SELECT email FROM users WHERE auth0_sub = ?').bind(sub).first<{ email: string }>();
            return dbUser?.email || null;
        } catch {
            return null;
        }
    };

    const checkAdmin = async (request: Request): Promise<boolean> => {
        const email = await getCallerEmail(request);
        return email === SUPER_ADMIN_EMAIL;
    };

    /**
     * Helper: extract D1 user ID from Auth0 sub claim in the JWT
     */
    const getCallerD1Id = async (request: Request): Promise<string | null> => {
        try {
            const authHeader = request.headers.get('Authorization')!;
            const token = authHeader.substring(7);
            const payload = JSON.parse(atob(token.split('.')[1]));
            const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
            return dbUser?.id || null;
        } catch {
            return null;
        }
    };

    /**
     * DELETE /api/admin/matches/<id>
     * Admin only route to delete a match advertisement.
     */
    router.delete('/api/admin/matches/<id>', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 401, headers: router.corsHeaders });
        }

        if (!await checkAdmin(request)) {
            return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });
        }

        const params = (request as any).params as { id: string };

        try {
            await env.DB.prepare('DELETE FROM matches WHERE id = ?').bind(params.id).run();
            return Response.json({ success: true, message: 'Match deleted by admin' }, { headers: router.corsHeaders });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500, headers: router.corsHeaders });
        }
    });

    /**
     * GET /api/admin/users/blocked
     * Returns an array of objects { auth0_sub, block_reason } for all users blocked in D1.
     */
    router.get('/api/admin/users/blocked', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 401, headers: router.corsHeaders });
        }

        if (!await checkAdmin(request)) {
            return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });
        }

        try {
            const blockedUsers = await env.DB.prepare('SELECT auth0_sub, block_reason FROM users WHERE is_blocked = 1').all<{ auth0_sub: string, block_reason: string | null }>();
            const subs = blockedUsers.results?.map(u => ({ auth0_sub: u.auth0_sub, block_reason: u.block_reason })) || [];
            return Response.json({ success: true, blockedSubs: subs }, { headers: router.corsHeaders });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500, headers: router.corsHeaders });
        }
    });

    /**
     * PATCH /api/admin/users/<id>/block
     * Admin only route to block/unblock a user.
     * Accepts { is_blocked: boolean, block_reason?: string }
     * The <id> is the D1 user ID (UUID).
     * Blocks include cascade deletion of the user's matches.
     * Super-admin email is protected and cannot be blocked.
     */
    router.patch('/api/admin/users/<id>/block', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 401, headers: router.corsHeaders });
        }

        if (!await checkAdmin(request)) {
            return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });
        }

        const params = (request as any).params as { id: string };
        let id = decodeURIComponent(params.id);

        // Resolve user: the ID might be a D1 UUID or an Auth0 sub (e.g. auth0|xxx)
        let targetUser;
        if (id.includes('|')) {
            // Auth0 sub format: look up by auth0_sub
            targetUser = await env.DB.prepare('SELECT * FROM users WHERE auth0_sub = ?').bind(id).first();
        } else {
            targetUser = await userService.getUserById(id);
        }

        if (!targetUser) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });
        }

        // Use the D1 id for all subsequent operations
        const d1Id = (targetUser as any).id as string;

        if ((targetUser as any).email === SUPER_ADMIN_EMAIL) {
            return Response.json({ success: false, error: 'Impossible de bloquer le Super-Administrateur.' }, { status: 403, headers: router.corsHeaders });
        }

        const body: { is_blocked: boolean; block_reason?: string } = await request.json();

        try {
            await userService.setBlockedStatus(d1Id, body.is_blocked, body.block_reason);
            return Response.json({ success: true, message: `User ${body.is_blocked ? 'blocked' : 'unblocked'}` }, { headers: router.corsHeaders });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500, headers: router.corsHeaders });
        }
    });
};
