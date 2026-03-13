import { Router } from './router';
import { Env } from '../types/env';
import { MatchService } from '../services/match.service';
import { CreateMatchDto, UpdateMatchDto, ContactMatchDto } from '../types/match';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';
import { broadcastDataChanged, broadcastNotification } from '../utils/broadcast';

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
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const url = new URL(request.url);
        const radiusParam = url.searchParams.get('radius_km');
        const userLatParam = url.searchParams.get('user_lat');
        const userLngParam = url.searchParams.get('user_lng');

        const authHeader = request.headers.get('Authorization');
        let currentUserId: string | null = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = JSON.parse(atob(token.split('.')[1]));
            const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
            if (dbUser) currentUserId = dbUser.id;
        }

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
            type: url.searchParams.get('type') || undefined,
            ownerId: url.searchParams.get('ownerId') || undefined,
            include_past: url.searchParams.get('include_past') === 'true',
            limit: parseInt(url.searchParams.get('limit') || '50'),
            offset: parseInt(url.searchParams.get('offset') || '0'),
            radius_km: radiusParam ? parseFloat(radiusParam) : undefined,
            user_lat: userLatParam ? parseFloat(userLatParam) : undefined,
            user_lng: userLngParam ? parseFloat(userLngParam) : undefined,
        };

        // Handle 'me' for ownerId
        if (filters.ownerId === 'me') {
            if (!currentUserId) {
                return Response.json({ success: false, error: 'Authentication required for ownerId=me' }, { status: 401, headers: router.corsHeaders });
            }
            filters.ownerId = currentUserId;
        }

        // ==========================================
        // OPTIMISATION KV : LECTURE GRATUITE ILLIMITÉE (DISABLED FOR REAL-TIME SYNC)
        // ==========================================
        const cacheKey = `matches:search:${url.search}`;
        /*
        if (env.KV_CACHE && !filters.ownerId) {
            const cachedMatches = await env.KV_CACHE.get(cacheKey, 'json');
            if (cachedMatches) {
                return Response.json({ success: true, ...(cachedMatches as any), _source: 'KV' }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            }
        }
        */

        const result = await matchService.search(filters, env.GOOGLE_MAPS_API_KEY);

        // ==========================================
        // SAUVEGARDE KV (TTL: 60s pour décharger D1) (DISABLED FOR REAL-TIME SYNC)
        // ==========================================
        /*
        if (env.KV_CACHE && !filters.ownerId) {
            // TTL 60s : Pendant 60s, les 25000 users liront la valeur KV en cache (0 requête D1)
            await env.KV_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 60 });
        }
        */

        return Response.json({ success: true, ...result }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    });

    /**
     * @openapi
     * /api/matches/requests:
     *   get:
     *     tags:
     *       - Match Participation
     *     summary: List incoming match requests for the organizer
     *     description: Retrieves all participation requests for matches owned by the current user.
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of incoming requests.
     */
    router.get('/api/matches/requests', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.MATCHES_CREATE);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
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
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            const participations = await matchService.getMyParticipations(dbUser.id);
            return Response.json({ success: true, participations }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            console.error('[Matches API] Error fetching participations:', e);
            // Return empty array instead of 500 to prevent Dashboard crash
            return Response.json({ success: true, participations: [] }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
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
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
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
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
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
            await broadcastDataChanged(env);
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
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
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
            await broadcastDataChanged(env);

            // Fetch all accepted participants using their Auth0 Sub for targeted notifications
            const { results: subs } = await env.DB.prepare(`
                SELECT u.auth0_sub 
                FROM match_contacts mc 
                JOIN users u ON mc.user_id = u.id 
                WHERE mc.match_id = ? AND mc.status = 'accepted'
            `).bind(params.id).all<{ auth0_sub: string }>();

            if (subs.length > 0) {
                await broadcastNotification(env, {
                    type: 'NOTIFICATION',
                    notificationType: 'MATCH_MODIFIED',
                    message: `Match modifié. L'heure ou le lieu pour le ${match.match_date || ''} a changé.`,
                    targetUserIds: subs.map(s => s.auth0_sub),
                    data: {
                        match_id: params.id,
                        match_date: match.match_date,
                        match_time: match.match_time,
                        host_club_name: match.club?.name || '',
                        host_user_id: payload.sub, // Use Auth0 Sub
                        owner_id: payload.sub
                    }
                });
            }
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
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return Response.json({ success: false, error: 'Missing Authorization header' }, { status: 401, headers: router.corsHeaders });

        const token = authHeader.substring(7);
        let payload: any;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            payload = JSON.parse(jsonPayload);
        } catch (e) {
            return Response.json({ success: false, error: 'Token decoding failed' }, { status: 400, headers: router.corsHeaders });
        }
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            const match = await matchService.getById(params.id); 
            if (!match) return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });

            // Fetch all participants using their Auth0 Sub BEFORE deletion (to avoid cascade loss)
            const { results: subs } = await env.DB.prepare(`
                SELECT u.auth0_sub 
                FROM match_contacts mc 
                JOIN users u ON mc.user_id = u.id 
                WHERE mc.match_id = ?
            `).bind(params.id).all<{ auth0_sub: string }>();
            
            const success = await matchService.delete(params.id, dbUser.id);
            if (!success) return Response.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            
            await broadcastDataChanged(env);
            
            if (subs.length > 0) {
                const cancellationMessage = `Le créateur du match à ${match.club?.name || 'club inconnu'} le ${match.match_date || ''} a annulé sa candidature avec vous.`;

                await broadcastNotification(env, {
                    type: 'NOTIFICATION',
                    notificationType: 'MATCH_CANCELLED',
                    message: `Match annulé. La rencontre prévue le ${match.match_date || ''} a été supprimée.`,
                    targetUserIds: subs.map(s => s.auth0_sub),
                    data: {
                        match_id: params.id,
                        match_date: match.match_date || '',
                        match_time: match.match_time || '',
                        host_club_name: match.club?.name || '',
                        owner_id: payload.sub // Auth0 Sub
                    }
                });
            }
            return Response.json({ success: true }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            if (e.message === 'Unauthorized') return Response.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            return Response.json({ success: false, error: e.message }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * @openapi
     * /api/matches/{id}/close-registrations:
     *   put:
     *     tags:
     *       - Matches
     *     summary: Manually close tournament registrations
     *     description: Updates tournament status to 'found'. Only the owner can perform this.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema: { type: string, format: uuid }
     *     responses:
     *       200:
     *         description: Tournament registrations closed successfully.
     *       403:
     *         description: Forbidden - Not the owner.
     */
    router.put('/api/matches/<id>/close-registrations', async (request: Request) => {
        const params = (request as any).params as { id: string };
        const permissionCheck = await checkPermission(request, env, Permission.MATCHES_CREATE);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return Response.json({ success: false, error: 'Missing Authorization header' }, { status: 401, headers: router.corsHeaders });

        const token = authHeader.substring(7);
        let payload: any;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            payload = JSON.parse(jsonPayload);
        } catch (e) {
            return Response.json({ success: false, error: 'Token decoding failed' }, { status: 400, headers: router.corsHeaders });
        }
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            const match = await matchService.closeRegistrations(params.id, dbUser.id);
            if (!match) return Response.json({ success: false, error: 'Not found or unauthorized' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            await broadcastDataChanged(env);
            return Response.json({ success: true, match }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
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
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return Response.json({ success: false, error: 'Missing Authorization header' }, { status: 401, headers: router.corsHeaders });

        const token = authHeader.substring(7);
        let payload: any;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            payload = JSON.parse(jsonPayload);
        } catch (e) {
            return Response.json({ success: false, error: 'Token decoding failed' }, { status: 400, headers: router.corsHeaders });
        }
        const dbUser = await env.DB.prepare('SELECT id, level, category, pitch_type, club_colors FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string, level: string, category: string, pitch_type: string, club_colors: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        // Security check: Profile must be 100% complete
        if (!dbUser.level || !dbUser.category || !dbUser.pitch_type || !dbUser.club_colors) {
            return Response.json({
                success: false,
                error: 'Profil incomplet : Veuillez renseigner votre niveau, catégorie, type de terrain et couleurs dans votre compte.'
            }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const dto = await request.json() as ContactMatchDto;

        try {
            const matchInfo = await env.DB.prepare('SELECT owner_id FROM matches WHERE id = ?').bind(params.id).first<{ owner_id: string }>();
            const success = await matchService.contact(params.id, dbUser.id, dto);
            await broadcastDataChanged(env);
            if (success && matchInfo) {
                const match = await matchService.getById(params.id);
                const applicantClub = await env.DB.prepare('SELECT c.name FROM clubs c JOIN users u ON u.club_id = c.id WHERE u.id = ?').bind(dbUser.id).first<{ name: string }>();
                
                // Get owner sub
                const owner = await env.DB.prepare('SELECT auth0_sub FROM users WHERE id = ?').bind(matchInfo.owner_id).first<{ auth0_sub: string }>();

                if (owner) {
                    await broadcastNotification(env, {
                        type: 'NOTIFICATION',
                        notificationType: 'NEW_APPLICANT',
                        message: 'Vous avez reçu une demande de match !',
                        targetUserId: owner.auth0_sub,
                        data: {
                            match_id: params.id,
                            match_date: match?.match_date || '',
                            match_time: match?.match_time || '',
                            host_club_name: match?.club?.name || '',
                            applicant_club_name: applicantClub?.name || '',
                            user_id: payload.sub, // Auth0 Sub
                            owner_id: owner.auth0_sub
                        }
                    });
                }
            }
            return Response.json({ success }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
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
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return Response.json({ success: false, error: 'Missing Authorization header' }, { status: 401, headers: router.corsHeaders });

        const token = authHeader.substring(7);
        let payload: any;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            payload = JSON.parse(jsonPayload);
        } catch (e) {
            return Response.json({ success: false, error: 'Token decoding failed' }, { status: 400, headers: router.corsHeaders });
        }

        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        let body: any;
        try {
            body = await request.json();
        } catch (e) {
            return Response.json({ success: false, error: 'Malformed or empty JSON body' }, { status: 400, headers: router.corsHeaders });
        }

        if (!body || !['accepted', 'refused'].includes(body.status)) {
            return Response.json({ success: false, error: 'Invalid status provided' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            const success = await matchService.updateRequestStatus(params.matchId, params.userId, dbUser.id, body.status);
            await broadcastDataChanged(env);
            if (success) {
                const matchData = await matchService.getById(params.matchId);
                // Get applicant sub
                const applicant = await env.DB.prepare('SELECT auth0_sub FROM users WHERE id = ?').bind(params.userId).first<{ auth0_sub: string }>();
                
                if (applicant) {
                    await broadcastNotification(env, {
                        type: 'NOTIFICATION',
                        notificationType: body.status === 'accepted' ? 'ENROLLMENT_ACCEPTED' : 'ENROLLMENT_REFUSED',
                        message: body.status === 'accepted' 
                            ? `Match confirmé ! Votre demande pour le ${matchData?.match_date || ''} a été acceptée.` 
                            : `Demande refusée. L'adversaire n'est pas disponible pour le ${matchData?.match_date || ''}.`,
                        targetUserId: applicant.auth0_sub,
                        data: {
                            match_id: params.matchId,
                            user_id: applicant.auth0_sub,
                            match_date: matchData?.match_date || '',
                            match_time: matchData?.match_time || '',
                            host_club_name: matchData?.club?.name || '',
                            owner_id: payload.sub // Auth0 Sub
                        }
                    });
                }
            }
            return Response.json({ success }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * @openapi
     * /api/matches/{matchId}/requests/{userId}:
     *   delete:
     *     tags:
     *       - Match Participation
     *     summary: Cancel or remove a participation request
     *     description: Allows the requester or the match owner to remove a contact request.
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
     *     responses:
     *       200:
     *         description: Request removed.
     *       403:
     *         description: Forbidden - Lacks authority.
     */
    router.delete('/api/matches/<matchId>/requests/<userId>', async (request: Request) => {
        const params = (request as any).params as { matchId: string, userId: string };
        const permissionCheck = await checkPermission(request, env, Permission.MATCHES_CONTACT);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return Response.json({ success: false, error: 'Missing Authorization header' }, { status: 401, headers: router.corsHeaders });

        const token = authHeader.substring(7);
        let payload: any;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            payload = JSON.parse(jsonPayload);
        } catch (e) {
            return Response.json({ success: false, error: 'Token decoding failed' }, { status: 400, headers: router.corsHeaders });
        }
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            const matchInfo = await env.DB.prepare('SELECT owner_id FROM matches WHERE id = ?').bind(params.matchId).first<{ owner_id: string }>();
            const success = await matchService.deleteContact(params.matchId, params.userId, dbUser.id);
            await broadcastDataChanged(env);

            // If the user withdrew themselves
            if (success && params.userId === dbUser.id && matchInfo && matchInfo.owner_id !== dbUser.id) {
                const owner = await env.DB.prepare('SELECT auth0_sub FROM users WHERE id = ?').bind(matchInfo.owner_id).first<{ auth0_sub: string }>();
                if (owner) {
                    const applicantUser = await env.DB.prepare('SELECT firstname FROM users WHERE id = ?').bind(dbUser.id).first<{ firstname: string }>();
                    const matchData = await matchService.getById(params.matchId);
                    const withdrawalMessage = `${applicantUser?.firstname || 'L\'utilisateur'} a annulé sa candidature pour le match à ${matchData?.club?.name || 'club inconnu'} le ${matchData?.match_date || ''}.`;
                    
                    await broadcastNotification(env, {
                        type: 'NOTIFICATION',
                        notificationType: 'TEAM_WITHDRAWAL',
                        targetUserId: owner.auth0_sub,
                        message: `Désistement. Une équipe s'est retirée de la rencontre prévue le ${matchData?.match_date || ''}.`,
                        data: { match_id: params.matchId }
                    });
                }
            } else if (success && params.userId !== dbUser.id && matchInfo && matchInfo.owner_id === dbUser.id) {
                // If the owner removed a request
                const applicant = await env.DB.prepare('SELECT auth0_sub FROM users WHERE id = ?').bind(params.userId).first<{ auth0_sub: string }>();
                if (applicant) {
                    const matchData = await matchService.getById(params.matchId);
                    const cancelMessage = `Le créateur du match à ${matchData?.club?.name || 'club inconnu'} le ${matchData?.match_date || ''} a annulé sa candidature avec vous.`;
                    
                    await broadcastNotification(env, {
                        type: 'NOTIFICATION',
                        notificationType: 'REQUEST_CANCELLED',
                        targetUserId: applicant.auth0_sub,
                        message: `Match annulé. La rencontre prévue le ${matchData?.match_date || ''} a été supprimée.`,
                        data: { match_id: params.matchId }
                    });
                }
            }

            return Response.json({ success }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * @openapi
     * /api/matches/{id}/notifications/read:
     *   patch:
     *     tags:
     *       - Match Participation
     *     summary: Mark match notifications as read
     *     description: Resets the notification state for a specific match and user.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema: { type: string, format: uuid }
     *     responses:
     *       200:
     *         description: Notification marked as read.
     */
    router.patch('/api/matches/<id>/notifications/read', async (request: Request) => {
        const params = (request as any).params as { id: string };
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
        if (!dbUser) {
            return Response.json({ success: false, error: 'User profile not created' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        await matchService.markNotificationsAsRead(params.id, dbUser.id);
        broadcastDataChanged(env);
        return Response.json({ success: true }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    });

    /**
     * @openapi
     * /api/matches/{id}/pairings:
     *   get:
     *     tags:
     *       - Tournament
     *     summary: Get tournament pairings
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema: { type: string, format: uuid }
     *     responses:
     *       200:
     *         description: List of pairings.
     */
    router.get('/api/matches/<id>/pairings', async (request: Request) => {
        const params = (request as any).params as { id: string };
        const pairings = await matchService.getPairings(params.id);
        return Response.json({ success: true, pairings }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    });

    /**
     * @openapi
     * /api/matches/pairings/{pairingId}:
     *   patch:
     *     tags:
     *       - Tournament
     *     summary: Update pairing time
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: pairingId
     *         in: path
     *         required: true
     *         schema: { type: string, format: uuid }
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [scheduled_time]
     *             properties:
     *               scheduled_time: { type: string, format: time }
     *     responses:
     *       200:
     *         description: Pairing updated.
     */
    router.patch('/api/matches/pairings/<pairingId>', async (request: Request) => {
        const params = (request as any).params as { pairingId: string };
        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();

        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        const { scheduled_time } = await request.json() as { scheduled_time: string };
        try {
            await matchService.updatePairingTime(params.pairingId, dbUser.id, scheduled_time);
            await broadcastDataChanged(env);
            return Response.json({ success: true }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * @openapi
     * /api/matches/{id}/pairings/generate:
     *   post:
     *     tags:
     *       - Tournament
     *     summary: Generate tournament pairings
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema: { type: string, format: uuid }
     *     responses:
     *       200:
     *         description: Pairings generated.
     */
    router.post('/api/matches/<id>/pairings/generate', async (request: Request) => {
        const params = (request as any).params as { id: string };
        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();

        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        try {
            const pairings = await matchService.generatePairings(params.id, dbUser.id);
            await broadcastDataChanged(env);
            return Response.json({ success: true, pairings }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });
};
