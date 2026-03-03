
import { Router } from './router';
import { Env } from '../types/env';
import { UserService } from '../services/user.service';
import { MatchService } from '../services/match.service';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';

export const setupAdminRoutes = (router: Router, env: Env) => {
    const userService = new UserService(env.DB);
    const matchService = new MatchService(env.DB);

    const checkAdmin = async (request: Request) => {
        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const email = payload.email;

        return email === 'yannidelattrebalcer.artois@gmail.com';
    };

    /**
     * DELETE /api/admin/matches/:id
     * Admin only route to delete a match advertisement.
     */
    router.delete('/api/admin/matches/:id', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 401, headers: router.corsHeaders });
        }

        if (!await checkAdmin(request)) {
            return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });
        }

        const url = new URL(request.url);
        const id = url.pathname.split('/').pop()!;

        try {
            await env.DB.prepare('DELETE FROM matches WHERE id = ?').bind(id).run();
            return Response.json({ success: true, message: 'Match deleted by admin' }, { headers: router.corsHeaders });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500, headers: router.corsHeaders });
        }
    });

    /**
     * PATCH /api/admin/users/:id/block
     * Admin only route to block/unblock a user.
     */
    router.patch('/api/admin/users/:id/block', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 401, headers: router.corsHeaders });
        }

        if (!await checkAdmin(request)) {
            return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });
        }

        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const id = pathParts[4]; // /api/admin/users/:id/block

        const body: { is_blocked: boolean } = await request.json();

        try {
            await userService.setBlockedStatus(id, body.is_blocked);
            return Response.json({ success: true, message: `User ${body.is_blocked ? 'blocked' : 'unblocked'}` }, { headers: router.corsHeaders });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500, headers: router.corsHeaders });
        }
    });
};
