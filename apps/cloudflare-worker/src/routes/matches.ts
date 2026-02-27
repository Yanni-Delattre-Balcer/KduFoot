
import { Router } from './router';
import { Env } from '../types/env';
import { MatchService } from '../services/match.service';
import { CreateMatchDto, UpdateMatchDto, ContactMatchDto } from '../types/match';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';

export const setupMatchRoutes = (router: Router, env: Env) => {
    const matchService = new MatchService(env.DB);

    /**
 * @openapi
 * /api/matches:
 *   get:
 *     tags:
 *       - Matches
 *     summary: Search and filter football matches
 *     description: >
 *       Retrieves a list of matches with advanced filtering capabilities including category, level, venue type, and geographical proximity.
 *       Geographical search uses 'radius_km' along with 'user_lat' and 'user_lng'.
 *       Requires a valid JWT.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: category
 *         in: query
 *         description: Filter by age or gender category.
 *         schema: { type: string }
 *       - name: level
 *         in: query
 *         description: Filter by competitive level.
 *         schema: { type: string }
 *       - name: format
 *         in: query
 *         description: Match format (e.g., 5v5, 11v11).
 *         schema: { type: string }
 *       - name: status
 *         in: query
 *         description: Current status of the match.
 *         schema: { type: string }
 *       - name: radius_km
 *         in: query
 *         description: Search radius in kilometers.
 *         schema: { type: number }
 *       - name: user_lat
 *         in: query
 *         description: Reference latitude for proximity search.
 *         schema: { type: number }
 *       - name: user_lng
 *         in: query
 *         description: Reference longitude for proximity search.
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Paginated match list.
 *       403:
 *         description: Forbidden.
 */
    router.get('/api/matches', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const url = new URL(request.url);
        /**
         * We extract geolocation parameters for specialized searching.
         * 'radius_km' allows finding matches within a certain distance of a user.
         */
        const radiusParam = url.searchParams.get('radius_km');
        const userLatParam = url.searchParams.get('user_lat');
        const userLngParam = url.searchParams.get('user_lng');

        const filters: any = {
            category: url.searchParams.get('category') || undefined,
            level: url.searchParams.get('level') || undefined,
            format: url.searchParams.get('format') || undefined,
            venue: url.searchParams.get('venue') || undefined,
            pitch_type: url.searchParams.get('pitch_type') || undefined,
            status: url.searchParams.get('status') || undefined,
            date: url.searchParams.get('date') || undefined,
            location_city: url.searchParams.get('location_city') || undefined,
            location_zip: url.searchParams.get('location_zip') || undefined,
            ownerId: url.searchParams.get('ownerId') || undefined,
            limit: parseInt(url.searchParams.get('limit') || '50'),
            offset: parseInt(url.searchParams.get('offset') || '0'),
            radius_km: radiusParam ? parseFloat(radiusParam) : undefined,
            user_lat: userLatParam ? parseFloat(userLatParam) : undefined,
            user_lng: userLngParam ? parseFloat(userLngParam) : undefined,
        };

        /**
         * The matchService performs the actual database query.
         * It may also use the Google Maps API Key for geocoding cities into coordinates.
         */
        const result = await matchService.search(filters, env.GOOGLE_MAPS_API_KEY);
        return Response.json({ success: true, ...result }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    });

    /**
 * @openapi
 * /api/matches/{id}:
 *   get:
 *     tags:
 *       - Matches
 *     summary: Retrieve detailed match information by ID
 *     description: Fetches full match criteria, location, and owner details for a given match identifier.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Unique UUID of the match.
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Match details.
 *       404:
 *         description: Not Found.
 */
    router.get('/api/matches/<id>', async (request: Request) => {
        const params = (request as any).params as { id: string };
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const match = await matchService.getById(params.id);
        if (!match) {
            return Response.json({ success: false, error: 'Match not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        return Response.json({ success: true, match }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    });

    /**
     * @openapi
     * /api/matches:
     *   post:
     *     tags:
     *       - Matches
     *     summary: Create a new match offer
     *     description: >
     *       Registers a new match in the system. The creating user is assigned as the owner.
     *       Requires 'matches:create' permission.
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [date, category, level, format]
     *             properties:
     *               date: { type: string, format: date-time }
     *               category: { type: string }
     *               level: { type: string }
     *               format: { type: string }
     *               venue: { type: string }
     *     responses:
     *       200:
     *         description: Match successfully created.
     *       403:
     *         description: Forbidden.
     */
    router.post('/api/matches', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.MATCHES_CREATE);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const dto = await request.json() as CreateMatchDto;

        try {
            const match = await matchService.create(dbUser.id, dto);
            return Response.json({ success: true, match }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * @openapi
     * /api/matches/{id}:
     *   put:
     *     tags:
     *       - Matches
     *     summary: Update an existing match offer
     *     description: Updates match details. Only the match owner can perform this action.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema: { type: string, format: uuid }
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               status: { type: string }
     *               description: { type: string }
     *     responses:
     *       200:
     *         description: Match successfully updated.
     *       403:
     *         description: Forbidden - Not the owner.
     */
    router.put('/api/matches/<id>', async (request: Request) => {
        const params = (request as any).params as { id: string };
        const permissionCheck = await checkPermission(request, env, Permission.MATCHES_CREATE); // Owner/Admin
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const dto = await request.json() as UpdateMatchDto;

        try {
            const match = await matchService.update(params.id, dbUser.id, dto);
            if (!match) return Response.json({ success: false, error: 'Not found or unauthorized' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            return Response.json({ success: true, match }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            if (e.message === 'Unauthorized') return Response.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            return Response.json({ success: false, error: e.message }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * @openapi
     * /api/matches/{id}:
     *   delete:
     *     tags:
     *       - Matches
     *     summary: Delete a match offer
     *     description: Permanently removes a match. Only the owner can delete it.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema: { type: string, format: uuid }
     *     responses:
     *       200:
     *         description: Match successfully deleted.
     *       404:
     *         description: Not Found.
     */
    router.delete('/api/matches/<id>', async (request: Request) => {
        const params = (request as any).params as { id: string };
        const permissionCheck = await checkPermission(request, env, Permission.MATCHES_CREATE);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            const success = await matchService.delete(params.id, dbUser.id);
            if (!success) return Response.json({ success: false, error: 'Not found or unauthorized' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            return Response.json({ success: true }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            if (e.message === 'Unauthorized') return Response.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            return Response.json({ success: false, error: e.message }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * @openapi
     * /api/matches/{id}/contact:
     *   post:
     *     tags:
     *       - Match Participation
     *     summary: Apply to participate in a match
     *     description: >
     *       Sends a request to the match owner to participate (or accept the offer).
     *       Requires 'matches:contact' permission.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema: { type: string, format: uuid }
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               message: { type: string }
     *     responses:
     *       200:
     *         description: Application sent.
     */
    router.post('/api/matches/<id>/contact', async (request: Request) => {
        const params = (request as any).params as { id: string };
        const permissionCheck = await checkPermission(request, env, Permission.MATCHES_CONTACT);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const dto = await request.json() as ContactMatchDto;

        try {
            const success = await matchService.contact(params.id, dbUser.id, dto);
            return Response.json({ success }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * @openapi
     * /api/matches/requests:
     *   get:
     *     tags:
     *       - Match Participation
     *     summary: List incoming match participation requests
     *     description: Displays all requests sent by other users to participate in matches owned by the current user.
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of incoming requests.
     */
    router.get('/api/matches/requests', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.MATCHES_CREATE);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const requests = await matchService.getIncomingRequests(dbUser.id);
        return Response.json({ success: true, requests }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    });

    /**
     * @openapi
     * /api/matches/participations:
     *   get:
     *     tags:
     *       - Match Participation
     *     summary: List outgoing match participation applications
     *     description: Displays all matches the current user has applied to join.
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of outgoing applications.
     */
    router.get('/api/matches/participations', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.MATCHES_CONTACT);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const participations = await matchService.getMyParticipations(dbUser.id);
        return Response.json({ success: true, participations }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    });

    /**
     * @openapi
     * /api/matches/{matchId}/requests/{userId}:
     *   patch:
     *     tags:
     *       - Match Participation
     *     summary: Update status of a participation request
     *     description: Allows the match owner to accept or refuse an incoming request from a specific user.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: matchId
     *         in: path
     *         required: true
     *         schema: { type: string, format: uuid }
     *       - name: userId
     *         in: path
     *         required: true
     *         schema: { type: string, format: uuid }
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [status]
     *             properties:
     *               status: { type: string, enum: [accepted, refused] }
     *     responses:
     *       200:
     *         description: Request status updated.
     *       403:
     *         description: Forbidden - Lacks ownership.
     */
    router.patch('/api/matches/<matchId>/requests/<userId>', async (request: Request) => {
        const params = (request as any).params as { matchId: string, userId: string };
        const permissionCheck = await checkPermission(request, env, Permission.MATCHES_CREATE);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const body = await request.json() as { status: 'accepted' | 'refused' };
        if (!['accepted', 'refused'].includes(body.status)) {
            return Response.json({ success: false, error: 'Invalid status' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            const success = await matchService.updateRequestStatus(params.matchId, params.userId, dbUser.id, body.status);
            return Response.json({ success }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });
};
