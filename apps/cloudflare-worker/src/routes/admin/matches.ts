import { Router, AuthenticatedRequest } from '../router';
import { Env } from '../../types/env';
import { ExecutionContext } from "@cloudflare/workers-types";
import { Permission } from '../../types/permissions';
import { broadcastDataChanged } from '../../utils/broadcast';
import { checkAdmin } from './utils';

export const setupAdminMatchRoutes = (router: Router, env: Env, ctx: ExecutionContext) => {
    /**
     * DELETE /api/admin/matches/<id>
     */
    router.delete('/api/admin/matches/<id>', async (request: AuthenticatedRequest, env: Env) => {
        if (!await checkAdmin(request, env)) {
            return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });
        }

        const params = request.params;

        try {
            await env.DB.prepare('DELETE FROM matches WHERE id = ?').bind(params.id).run();
            await broadcastDataChanged(env);
            return Response.json({ success: true, message: 'Match deleted by admin' }, { headers: router.corsHeaders });
        } catch (_e: unknown) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.WRITE_API);
};
