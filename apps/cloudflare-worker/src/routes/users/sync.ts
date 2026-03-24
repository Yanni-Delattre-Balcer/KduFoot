import { Router, AuthenticatedRequest } from '../router';
import { Env } from '../../types/env';
import { UserService } from '../../services/user.service';
import { CreateUserDto } from '../../types/user';
import { Permission } from '../../types/permissions';

export const setupSyncRoutes = (router: Router, env: Env) => {
    const userService = new UserService(env.DB);

    /**
     * POST /api/users/sync
     */
    router.post('/api/users/sync', async (request: AuthenticatedRequest, _env: Env) => {

        const body = await request.json() as Record<string, unknown>;

        if (!body.email) {
            return Response.json({ success: false, error: 'Missing user data' }, { status: 400, headers: router.corsHeaders });
        }

        // Always use the verified JWT sub — never trust sub from request body
        const verifiedSub = request.user?.sub as string;
        if (!verifiedSub) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: router.corsHeaders });
        }

        const dto: CreateUserDto = {
            auth0_sub: verifiedSub,
            email: String(body.email),
            firstname: String(body.given_name || body.name || 'User'),
            lastname: String(body.family_name || ''),
            picture: body.picture ? String(body.picture) : undefined
        };

        try {
            const user = await userService.createOrUpdateUser(dto);
            return Response.json({ success: true, user }, { headers: router.corsHeaders });
        } catch (e: unknown) {
            // eslint-disable-next-line no-console
            console.error('User Sync Error:', e);
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.READ_API);
};
