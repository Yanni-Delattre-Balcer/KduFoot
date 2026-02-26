
import { Router } from './router';
import { Env } from '../types/env';
import { MatchService } from '../services/match.service';
import { CreateMatchDto, UpdateMatchDto, ContactMatchDto } from '../types/match';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';

export const setupMatchRoutes = (router: Router, env: Env) => {
    const matchService = new MatchService(env.DB);

    // Search matches
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

    // Get single match
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

    // Create match
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

    // Update match
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

    // Delete match
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

    // Contact match (Apply)
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

    // Get incoming requests for current user
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

    // Get outgoing requests (participations) for current user
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

    // Update request status (Accept/Refuse)
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
