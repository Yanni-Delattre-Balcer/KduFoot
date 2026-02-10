
import { Router } from './router';
import { Env } from '../types/env';
import { UserService } from '../services/user.service';
import { CreateUserDto, UpdateUserDto } from '../types/user';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';

export const setupUserRoutes = (router: Router, env: Env) => {
    const userService = new UserService(env.DB);

    // Sync user from Auth0 (called after login)
    // Public or semi-public? Usually authenticated with the token.
    // We accept the token and use the payload to create/sync the user.
    router.post('/api/users/sync', async (request: Request) => {
        // We expect the standard Auth0 token check to have happened via router or middleware if we used it.
        // Here we can re-verify or trust the router if configured.
        // The Router in router.ts handles auth if permission is passed, but here we want to allow any authenticated user to sync.
        // Let's check for a basic "read:api" or just existence of a valid token.

        // Manually checking auth because 'sync' might not map nicely to a specific permission other than "being logged in".
        // Or we use READ_API as a baseline.
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 401 });
        }

        // Get user info from request body or token?
        // Usually the client sends the user info from Auth0 (idToken payload) in the body
        // because the access token might not have profile info (email, name).
        const body: any = await request.json();

        if (!body.sub || !body.email) {
            return Response.json({ success: false, error: 'Missing user data' }, { status: 400 });
        }

        const dto: CreateUserDto = {
            auth0_sub: body.sub,
            email: body.email,
            firstname: body.given_name || body.name || 'User',
            lastname: body.family_name || '',
            picture: body.picture
        };

        try {
            const user = await userService.createOrUpdateUser(dto);
            return Response.json({ success: true, user });
        } catch (e: any) {
            console.error('User Sync Error:', e);
            return Response.json({ success: false, error: e.message }, { status: 500 });
        }
    });

    // Get current user profile
    router.get('/api/users/me', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 401 });
        }

        // Extract sub from token
        // The middleware checkPermission verified the token but didn't return the payload in a way accessing it here is clean 
        // without re-decoding.
        // However, router.ts attaches payload to 'this.jwtPayload' if used via route.permission.
        // Since we called checkPermission manually, we have to handle it.
        // Ideally update checkPermission to return payload too, which I did in the previous step!

        // Better yet, let's use the router's permission/middleware mechanism if possible, 
        // OR just decode it here again (lightweight).
        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const sub = payload.sub;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found in D1. Call sync first.' }, { status: 404 });
        }

        return Response.json({ success: true, user });
    });

    // Update current user profile
    router.put('/api/users/me', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 401 });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const sub = payload.sub;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const body: UpdateUserDto = await request.json();

        // Security: Validate what can be updated
        // Prevent updating subscription directly via API (should handle via payment hooks)
        delete body.subscription;

        try {
            const updated = await userService.updateUser(user.id, body);
            return Response.json({ success: true, user: updated });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500 });
        }
    });
};
