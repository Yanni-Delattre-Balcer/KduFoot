import type { ExecutionContext } from "@cloudflare/workers-types";
import { Router, AuthenticatedRequest } from './router';
import { Env } from '../types/env';
import { MatchService } from '../services/match.service';
import { MatchSearchService } from '../services/match-search.service';
import { ClubService } from '../services/club.service';
import { CreateMatchDto, UpdateMatchDto, MatchFilters } from '../types/match';
import { Permission } from '../types/permissions';
import { broadcastDataChanged, broadcastNotification } from '../utils/broadcast';
import { CreateMatchSchema, UpdateMatchSchema, requireValidUUID } from '../utils/validation';
import { getDbUser } from '../utils/db-helpers';

export const setupMatchRoutes = (router: Router, env: Env, ctx: ExecutionContext) => {
    const matchService = new MatchService(env.DB);
    const searchService = new MatchSearchService(env.DB);
    const clubService = new ClubService(env);

    /**
     * @openapi
     * /api/matches:
     *   get:
     *     tags: [Matches]
     *     summary: Search matches and tournaments with optional filters
     *     description: >
     *       Returns a cursor-paginated list of active matches/tournaments. Supports geo-radius
     *       filtering via Google Maps Distance Matrix (radius_km + user_lat/user_lng). When
     *       ownerId=me, returns only the authenticated user's own matches.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: category
     *         in: query
     *         schema: { type: string }
     *       - name: level
     *         in: query
     *         schema: { type: string }
     *       - name: radius_km
     *         in: query
     *         description: Filter by driving distance (requires user_lat + user_lng)
     *         schema: { type: number }
     *       - name: cursor
     *         in: query
     *         description: Opaque pagination cursor from previous response
     *         schema: { type: string }
     *       - name: limit
     *         in: query
     *         schema: { type: integer, default: 50 }
     *     responses:
     *       200:
     *         description: Paginated list of matches with optional distance_km field
     */
    router.get('/api/matches', async (request: AuthenticatedRequest, env: Env) => {
        const url = new URL(request.url);
        const filters: MatchFilters = {
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
            cursor: url.searchParams.get('cursor') || undefined,
            radius_km: url.searchParams.get('radius_km') ? parseFloat(url.searchParams.get('radius_km')!) : undefined,
            user_lat: url.searchParams.get('user_lat') ? parseFloat(url.searchParams.get('user_lat')!) : undefined,
            user_lng: url.searchParams.get('user_lng') ? parseFloat(url.searchParams.get('user_lng')!) : undefined,
        };

        if (filters.ownerId === 'me') {
            const dbUser = await getDbUser(env.DB, request.user?.sub);
            if (!dbUser) return Response.json({ success: false, error: 'Auth required for me' }, { status: 401, headers: router.corsHeaders });
            filters.ownerId = dbUser.id;
        }

        const result = await searchService.search(filters, env.GOOGLE_MAPS_API_KEY);

        return Response.json({ success: true, ...result }, { 
            headers: { 
                ...router.corsHeaders,
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
            } 
        });
    }, Permission.READ_API);

    /**
     * @openapi
     * /api/matches/{id}:
     *   get:
     *     tags: [Matches]
     *     summary: Get a single match or tournament by ID
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema: { type: string, format: uuid }
     *     responses:
     *       200:
     *         description: Match details including club info and accepted participants
     *       404:
     *         description: Match not found
     */
    router.get('/api/matches/<id>', async (request: AuthenticatedRequest, _env: Env) => {
        const { id } = request.params;
        const uuidError = requireValidUUID(id, router.corsHeaders);
        if (uuidError) return uuidError;
        const match = await matchService.getById(id);
        if (!match) return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: router.corsHeaders });

        return Response.json({ success: true, match }, { 
            headers: { 
                ...router.corsHeaders,
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
            } 
        });
    }, Permission.READ_API);

    /**
     * POST /api/matches
     */
    router.post('/api/matches', async (request: AuthenticatedRequest, env: Env, ctx: ExecutionContext) => {
        const dbUser = await env.DB.prepare('SELECT id, firstname, lastname, phone, license_id, category, level, stadium_address, club_id FROM users WHERE auth0_sub = ?').bind(request.user?.sub).first<any>();
        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        const isComplete = dbUser.firstname && dbUser.lastname && dbUser.phone && dbUser.license_id && dbUser.category && dbUser.level && dbUser.stadium_address && dbUser.club_id;
        if (!isComplete) {
            const missing = [];
            if (!dbUser.firstname) missing.push('Prénom');
            if (!dbUser.lastname) missing.push('Nom');
            if (!dbUser.phone) missing.push('Téléphone');
            if (!dbUser.license_id) missing.push('Licence');
            if (!dbUser.category) missing.push('Catégorie');
            if (!dbUser.level) missing.push('Niveau');
            if (!dbUser.stadium_address) missing.push('Adresse stade');
            if (!dbUser.club_id) missing.push('Club principal');
            return Response.json({ success: false, error: `Profil incomplet : ${missing.join(', ')}` }, { status: 400, headers: router.corsHeaders });
        }

        const body = await request.json();
        const validation = CreateMatchSchema.safeParse(body);
        if (!validation.success) {
            const errorMsg = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
            return Response.json({ success: false, error: `Données invalides : ${errorMsg}` }, { status: 400, headers: router.corsHeaders });
        }

        try {
            const clubId = validation.data.club_id;
            const clubExists = await env.DB.prepare('SELECT id FROM clubs WHERE id = ?').bind(clubId).first();
            
            if (!clubExists) {
                const validationRes = await clubService.validateSiret(clubId);
                if (validationRes.isValid) {
                    const SIRET_API_URL = env.SIRET_API_URL || 'https://recherche-entreprises.api.gouv.fr/search';
                    const apiRes = await fetch(`${SIRET_API_URL}?q=${clubId}&page=1&per_page=1`);
                    if (apiRes.ok) {
                        const apiData = await apiRes.json() as import("../types").SiretApiResponse;
                        if (apiData.results && apiData.results.length > 0) {
                            const ent = apiData.results[0];
                            const siege = ent.siege || {};
                            await env.DB.prepare(
                                'INSERT OR IGNORE INTO clubs (id, siret, name, city, address, zip, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                            ).bind(
                                clubId, clubId,
                                ent.nom_complet || ent.nom_raison_sociale || 'Club',
                                siege.libelle_commune || siege.commune || 'Ville',
                                siege.adresse || '',
                                siege.code_postal || '',
                                siege.latitude ? parseFloat(siege.latitude) : null,
                                siege.longitude ? parseFloat(siege.longitude) : null
                            ).run();
                        }
                    }
                }
            }

            const match = await matchService.create(dbUser.id, validation.data as CreateMatchDto);
            ctx.waitUntil(broadcastDataChanged(env));
            return Response.json({ success: true, match }, { headers: router.corsHeaders });
        } catch (e: unknown) {
            return Response.json({ success: false, error: "Internal server error" }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.MATCHES_CREATE);

    /**
     * PUT /api/matches/<id>
     */
    router.put('/api/matches/<id>', async (request: AuthenticatedRequest, env: Env, ctx: ExecutionContext) => {
        const params = request.params;
        const uuidError = requireValidUUID(params.id, router.corsHeaders);
        if (uuidError) return uuidError;
        const dbUser = await getDbUser(env.DB, request.user?.sub);
        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        const body = await request.json();
        const validation = UpdateMatchSchema.safeParse(body);
        if (!validation.success) {
            const errorMsg = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
            return Response.json({ success: false, error: `Données invalides : ${errorMsg}` }, { status: 400, headers: router.corsHeaders });
        }

        try {
            const match = await matchService.update(params.id, dbUser.id, validation.data as UpdateMatchDto);
            if (!match) return Response.json({ success: false, error: 'Unauthorized/Not found' }, { status: 404, headers: router.corsHeaders });
            
            ctx.waitUntil(broadcastDataChanged(env));
            const { results: subs } = await env.DB.prepare('SELECT u.auth0_sub FROM match_contacts mc JOIN users u ON mc.user_id = u.id WHERE mc.match_id = ? AND mc.status = "accepted"').bind(params.id).all<{ auth0_sub: string }>();
            if (subs.length > 0) {
                ctx.waitUntil(broadcastNotification(env, {
                    type: 'NOTIFICATION',
                    notificationType: 'MATCH_MODIFIED',
                    message: `Match modifié pour le ${match.match_date}`,
                    targetUserIds: subs.map(s => s.auth0_sub),
                    data: { match_id: params.id, match_date: match.match_date }
                }));
            }
            return Response.json({ success: true, match }, { headers: router.corsHeaders });
        } catch (e: unknown) {
            return Response.json({ success: false, error: "Internal server error" }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.MATCHES_CREATE);

    /**
     * DELETE /api/matches/<id>
     */
    router.delete('/api/matches/<id>', async (request: AuthenticatedRequest, env: Env, ctx: ExecutionContext) => {
        const params = request.params;
        const uuidError = requireValidUUID(params.id, router.corsHeaders);
        if (uuidError) return uuidError;
        const dbUser = await getDbUser(env.DB, request.user?.sub);
        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        try {
            const match = await matchService.getById(params.id);
            if (!match) return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: router.corsHeaders });

            const { results: subs } = await env.DB.prepare('SELECT u.auth0_sub FROM match_contacts mc JOIN users u ON mc.user_id = u.id WHERE mc.match_id = ?').bind(params.id).all<{ auth0_sub: string }>();
            
            const success = await matchService.delete(params.id, dbUser.id);
            if (success) {
                ctx.waitUntil(broadcastDataChanged(env));
                if (subs.length > 0) {
                    ctx.waitUntil(broadcastNotification(env, {
                        type: 'NOTIFICATION',
                        notificationType: 'MATCH_CANCELLED',
                        message: `Match annulé pour le ${match.match_date}`,
                        targetUserIds: subs.map(s => s.auth0_sub),
                        data: { match_id: params.id, match_date: match.match_date }
                    }));
                }
            }
            return Response.json({ success }, { headers: router.corsHeaders });
        } catch (e: unknown) {
            return Response.json({ success: false, error: "Internal server error" }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.MATCHES_CREATE);
};
