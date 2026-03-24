import type { ExecutionContext } from "@cloudflare/workers-types";
import { Router } from './router';
import { Env } from '../types/env';
import { SessionService } from '../services/session.service';
import { CreateSessionDto, UpdateSessionDto } from '../types/session';
import { Permission } from '../types/permissions';
import { broadcastDataChanged } from '../utils/broadcast';
import { getDbUser } from '../utils/db-helpers';
import { requireValidUUID } from '../utils/validation';

export const setupSessionRoutes = (router: Router, env: Env, ctx: ExecutionContext) => {
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
    router.get('/api/sessions', async (request, env) => {

        // Default to seeing own sessions
        const dbUser = await getDbUser(env.DB, request.user?.sub);
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: router.corsHeaders });
        }

        const url = new URL(request.url);
        /**
         * We filter the results based on URL parameters.
         * We also enforce 'userId' to ensure users can only see their own sessions.
         */
        const filters = {
            status: url.searchParams.get('status') || undefined,
            userId: dbUser.id, // Security: Enforce own data
            limit: parseInt(url.searchParams.get('limit') || '50'),
            cursor: url.searchParams.get('cursor') || undefined,
            from: url.searchParams.get('from') || undefined,
            to: url.searchParams.get('to') || undefined,
        };

        const result = await sessionService.search(filters);
        return Response.json({ success: true, ...result }, { headers: { ...router.corsHeaders, "Cache-Control": "private, max-age=60" } });
    }, Permission.READ_API);

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
    router.get('/api/sessions/<id>', async (request, env) => {
        const { id } = request.params;
        const uuidError = requireValidUUID(id, router.corsHeaders);
        if (uuidError) return uuidError;

        const cacheKey = `session:${id}`;
        if (env.KV_CACHE) {
            const cached = await env.KV_CACHE.get(cacheKey);
            if (cached) {
                const sessionData = JSON.parse(cached);
                // Security check even for cache
                const dbUser = await getDbUser(env.DB, request.user?.sub);
                if (dbUser && sessionData.session.user_id !== dbUser.id) {
                    return Response.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: router.corsHeaders });
                }
                return Response.json({ success: true, ...sessionData, cached: true }, { headers: { ...router.corsHeaders, "Cache-Control": "private, max-age=300" } });
            }
        }

        const result = await sessionService.getById(id);
        if (!result) {
            return Response.json({ success: false, error: 'Session not found' }, { status: 404, headers: router.corsHeaders });
        }

        // Security check: is it my session?
        const dbUser = await getDbUser(env.DB, request.user?.sub);

        if (dbUser && result.session.user_id !== dbUser.id) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: router.corsHeaders });
        }

        return Response.json({ success: true, ...result }, { headers: { ...router.corsHeaders, "Cache-Control": "private, max-age=300" } });
    }, Permission.READ_API);

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
    router.post('/api/sessions', async (request, env) => {
        const dbUser = await getDbUser(env.DB, request.user?.sub);
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: router.corsHeaders });
        }

        const dto = await request.json() as CreateSessionDto;

        try {
            const session = await sessionService.create(dbUser.id, dto);
            ctx.waitUntil(broadcastDataChanged(env));
            return Response.json({ success: true, session }, { headers: router.corsHeaders });
        } catch (e: unknown) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.SESSIONS_CREATE);

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
    router.put('/api/sessions/<id>', async (request, env) => {
        const { id } = request.params;
        const uuidError = requireValidUUID(id, router.corsHeaders);
        if (uuidError) return uuidError;
        const dbUser = await getDbUser(env.DB, request.user?.sub);
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400 });
        }

        const dto = await request.json() as UpdateSessionDto;

        try {
            const success = await sessionService.update(id, dbUser.id, dto);
            if (!success) return Response.json({ success: false, error: 'Not found or unauthorized' }, { status: 404, headers: router.corsHeaders });

            if (env.KV_CACHE) await env.KV_CACHE.delete(`session:${id}`);
            ctx.waitUntil(broadcastDataChanged(env));
            return Response.json({ success: true }, { headers: router.corsHeaders });
        } catch (e: unknown) {
            if (e instanceof Error && e.message === 'Unauthorized') return Response.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: router.corsHeaders });
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.SESSIONS_CREATE);

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
    router.delete('/api/sessions/<id>', async (request, env) => {
        const { id } = request.params;
        const uuidError = requireValidUUID(id, router.corsHeaders);
        if (uuidError) return uuidError;
        const dbUser = await getDbUser(env.DB, request.user?.sub);
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400 });
        }

        try {
            const success = await sessionService.delete(id, dbUser.id);
            if (!success) return Response.json({ success: false, error: 'Not found or unauthorized' }, { status: 404, headers: router.corsHeaders });
            ctx.waitUntil(broadcastDataChanged(env));
            return Response.json({ success: true }, { headers: router.corsHeaders });
        } catch (e: unknown) {
            if (e instanceof Error && e.message === 'Unauthorized') return Response.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: router.corsHeaders });
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.SESSIONS_CREATE);
};
