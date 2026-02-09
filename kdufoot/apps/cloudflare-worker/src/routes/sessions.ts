
import { Router } from './router';
import { Env } from '../types/env';
import { SessionService } from '../services/session.service';
import { CreateSessionDto, UpdateSessionDto } from '../types/session';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';

export const setupSessionRoutes = (router: Router, env: Env) => {
    const sessionService = new SessionService(env.DB);

    // Search sessions
    router.get('/api/sessions', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.READ_API); // Minimal read permission? Or specific SESSIONS_READ?
        // Permissions enum doesn't have SESSIONS_READ explicitly, maybe use generic READ_API or add it?
        // Using READ_API for list for now, or SESSIONS_CREATE if it implies managing them.
        // Let's stick to READ_API for basic access, and maybe ensure it's their own data via userId filter.
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403 });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));

        // Default to seeing own sessions
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400 });
        }

        const url = new URL(request.url);
        const filters = {
            status: url.searchParams.get('status') || undefined,
            userId: dbUser.id, // Enforce own data for now
            limit: parseInt(url.searchParams.get('limit') || '20'),
            offset: parseInt(url.searchParams.get('offset') || '0'),
            from: url.searchParams.get('from') || undefined,
            to: url.searchParams.get('to') || undefined,
        };

        const result = await sessionService.search(filters);
        return Response.json({ success: true, ...result });
    });

    // Get single session
    router.get('/api/sessions/<id>', async (request: Request) => {
        const params = (request as any).params as { id: string };
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403 });
        }

        const result = await sessionService.getById(params.id);
        if (!result) {
            return Response.json({ success: false, error: 'Session not found' }, { status: 404 });
        }

        // Security check: is it my session?
        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();

        if (dbUser && result.session.user_id !== dbUser.id) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        return Response.json({ success: true, ...result });
    });

    // Create session
    router.post('/api/sessions', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.SESSIONS_CREATE);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403 });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400 });
        }

        const dto = await request.json() as CreateSessionDto;

        try {
            const session = await sessionService.create(dbUser.id, dto);
            return Response.json({ success: true, session });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500 });
        }
    });

    // Update session
    router.put('/api/sessions/<id>', async (request: Request) => {
        const params = (request as any).params as { id: string };
        // Update might use same permission or generic write? 
        // Types/Permissions has SESSIONS_CREATE, SESSIONS_ADAPT. 
        // Let's use SESSIONS_CREATE as general "manage sessions" or WRITE_API.
        // Strictly speaking, updating is "managing".
        const permissionCheck = await checkPermission(request, env, Permission.SESSIONS_CREATE);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403 });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400 });
        }

        const dto = await request.json() as UpdateSessionDto;

        try {
            const success = await sessionService.update(params.id, dbUser.id, dto);
            if (!success) return Response.json({ success: false, error: 'Not found or unauthorized' }, { status: 404 });

            // Return updated (would need fetch, but for efficiency just success)
            return Response.json({ success: true });
        } catch (e: any) {
            if (e.message === 'Unauthorized') return Response.json({ false: false, error: 'Unauthorized' }, { status: 403 });
            return Response.json({ success: false, error: e.message }, { status: 500 });
        }
    });

    // Delete session
    router.delete('/api/sessions/<id>', async (request: Request) => {
        const params = (request as any).params as { id: string };
        const permissionCheck = await checkPermission(request, env, Permission.SESSIONS_CREATE); // Assuming delete is part of management
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403 });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400 });
        }

        try {
            const success = await sessionService.delete(params.id, dbUser.id);
            if (!success) return Response.json({ success: false, error: 'Not found or unauthorized' }, { status: 404 });
            return Response.json({ success: true });
        } catch (e: any) {
            if (e.message === 'Unauthorized') return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
            return Response.json({ success: false, error: e.message }, { status: 500 });
        }
    });
};
