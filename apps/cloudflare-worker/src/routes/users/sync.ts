import { Router } from '../router';
import { Env } from '../../types/env';
import { UserService } from '../../services/user.service';
import { CreateUserDto } from '../../types/user';
import { Permission } from '../../types/permissions';

export const setupSyncRoutes = (router: Router, env: Env) => {
    const userService = new UserService(env.DB);

    /**
     * POST /api/users/sync
     */
    router.post('/api/users/sync', async (request: Request, _env: Env) => {

        const body = await request.json() as Record<string, unknown>;

        if (!body.sub || !body.email) {
            return Response.json({ success: false, error: 'Missing user data' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const dto: CreateUserDto = {
            auth0_sub: String(body.sub),
            email: String(body.email),
            firstname: String(body.given_name || body.name || 'User'),
            lastname: String(body.family_name || ''),
            picture: body.picture ? String(body.picture) : undefined
        };

        try {
            const user = await userService.createOrUpdateUser(dto);
            return Response.json({ success: true, user }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: unknown) {
            // eslint-disable-next-line no-console
            console.error('User Sync Error:', e);
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    }, Permission.READ_API);
};
