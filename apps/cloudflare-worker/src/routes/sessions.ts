
import { Router } from './router';
import { Env } from '../types/env';
import { SessionService } from '../services/session.service';
import { CreateSessionDto, UpdateSessionDto } from '../types/session';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';
import { broadcastDataChanged } from '../utils/broadcast';

export const setupSessionRoutes = (router: Router, env: Env) => {
    const sessionService = new SessionService(env.DB);

    /**
     * @openapi
     * /api/sessions:
     *   get:
     *     tags:
     *       - Sessions
     *     summary: Retrieve and filter training sessions
     *     description: >
     *       Lists training sessions associated with the current user. Results can be filtered by status (e.g., scheduled, completed) and date range.
     *       Requires a valid JWT. Access is restricted to the user's own sessions.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: status
     *         in: query
     *         description: Filter by session status.
     *         schema: { type: string }
     *       - name: from
     *         in: query
     *         description: Start date filter (ISO 8601).
     *         schema: { type: string, format: date-time }
     *       - name: to
     *         in: query
     *         description: End date filter (ISO 8601).
     *         schema: { type: string, format: date-time }
     *       - name: limit
     *         in: query
     *         description: Max number of sessions to return.
     *         schema: { type: integer, default: 20 }
     *       - name: offset
     *         in: query
     *         description: Pagination offset.
     *         schema: { type: integer, default: 0 }
     *     responses:
     *       200:
     *         description: A list of sessions matching the filters.
     *       403:
     *         description: Forbidden - Invalid token or insufficient permissions.
     */
    router.get('/api/sessions', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.READ_API); // Minimal read permission? Or specific SESSIONS_READ?
        // Permissions enum doesn't have SESSIONS_READ explicitly, maybe use generic READ_API or add it?
        // Using READ_API for list for now, or SESSIONS_CREATE if it implies managing them.
        // Let's stick to READ_API for basic access, and maybe ensure it's their own data via userId filter.
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));

        // Default to seeing own sessions
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const url = new URL(request.url);
        /**
         * We filter the results based on URL parameters.
         * We also enforce 'userId' to ensure users can only see their own sessions.
         */
        const filters = {
            status: url.searchParams.get('status') || undefined,
            userId: dbUser.id, // Security: Enforce own data
            limit: parseInt(url.searchParams.get('limit') || '20'),
            offset: parseInt(url.searchParams.get('offset') || '0'),
            from: url.searchParams.get('from') || undefined,
            to: url.searchParams.get('to') || undefined,
        };

        const result = await sessionService.search(filters);
        return Response.json({ success: true, ...result }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    });

    /**
     * @openapi
     * /api/sessions/{id}:
     *   get:
     *     tags:
     *       - Sessions
     *     summary: Get session details by ID
     *     description: >
     *       Retrieves the full configuration and drill list for a specific training session.
     *       Access is restricted to the owner of the session.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         description: Unique UUID of the session.
     *         schema: { type: string, format: uuid }
     *     responses:
     *       200:
     *         description: Session details retrieved successfully.
     *       403:
     *         description: Forbidden - User does not own this session.
     *       404:
     *         description: Not Found - Session ID invalid.
     */
    router.get('/api/sessions/<id>', async (request: Request) => {
        const params = (request as any).params as { id: string };
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403 });
        }

        const result = await sessionService.getById(params.id);
        if (!result) {
            return Response.json({ success: false, error: 'Session not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        // Security check: is it my session?
        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();

        if (dbUser && result.session.user_id !== dbUser.id) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        return Response.json({ success: true, ...result }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    });

    /**
     * @openapi
     * /api/sessions:
     *   post:
     *     tags:
     *       - Sessions
     *     summary: Create a new training session
     *     description: >
     *       Saves a new training session configuration. The session must include at least one exercise.
     *       Requires the 'sessions:create' permission.
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [title]
     *             properties:
     *               title: { type: string, description: "Display title for the session." }
     *               description: { type: string }
     *               exercises: { type: array, items: { type: string, format: uuid }, description: "List of exercise IDs." }
     *     responses:
     *       200:
     *         description: Session successfully created.
     *       403:
     *         description: Forbidden - Insufficient rights.
     */
    router.post('/api/sessions', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.SESSIONS_CREATE);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403 });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const dto = await request.json() as CreateSessionDto;

        try {
            const session = await sessionService.create(dbUser.id, dto);
            broadcastDataChanged(env);
            return Response.json({ success: true, session }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * @openapi
     * /api/sessions/{id}:
     *   put:
     *     tags:
     *       - Sessions
     *     summary: Update an existing session
     *     description: >
     *       Updates the title, description, or exercise list of a session.
     *       Only the creator can modify the session.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         description: Unique UUID of the session.
     *         schema: { type: string, format: uuid }
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title: { type: string }
     *               description: { type: string }
     *               exercises: { type: array, items: { type: string, format: uuid } }
     *     responses:
     *       200:
     *         description: Session updated.
     *       403:
     *         description: Forbidden - Lacks permissions or ownership.
     */
    router.put('/api/sessions/<id>', async (request: Request) => {
        const params = (request as any).params as { id: string };
        // Update might use same permission or generic write? 
        // Types/Permissions has SESSIONS_CREATE, SESSIONS_ADAPT. 
        // Let's use SESSIONS_CREATE as general "manage sessions" or WRITE_API.
        // Strictly speaking, updating is "managing".
        const permissionCheck = await checkPermission(request, env, Permission.SESSIONS_CREATE);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403 });
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
            if (!success) return Response.json({ success: false, error: 'Not found or unauthorized' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });

            broadcastDataChanged(env);
            // Return updated (would need fetch, but for efficiency just success)
            return Response.json({ success: true }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            if (e.message === 'Unauthorized') return Response.json({ false: false, error: 'Unauthorized' }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            return Response.json({ success: false, error: e.message }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * @openapi
     * /api/sessions/{id}:
     *   delete:
     *     tags:
     *       - Sessions
     *     summary: Delete a session
     *     description: Permanently removes a training session. Only the creator can perform this action.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         description: Unique UUID of the session.
     *         schema: { type: string, format: uuid }
     *     responses:
     *       200:
     *         description: Session successfully deleted.
     *       403:
     *         description: Forbidden - Unauthorized.
     */
    router.delete('/api/sessions/<id>', async (request: Request) => {
        const params = (request as any).params as { id: string };
        const permissionCheck = await checkPermission(request, env, Permission.SESSIONS_CREATE); // Assuming delete is part of management
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403 });
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
            if (!success) return Response.json({ success: false, error: 'Not found or unauthorized' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            broadcastDataChanged(env);
            return Response.json({ success: true }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            if (e.message === 'Unauthorized') return Response.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            return Response.json({ success: false, error: e.message }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });
};
