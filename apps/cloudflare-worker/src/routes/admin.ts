
import { Router } from './router';
import { Env } from '../types/env';
import { UserService } from '../services/user.service';
import { MatchService } from '../services/match.service';
import { checkPermissions } from '../auth0';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';
import { broadcastDataChanged, broadcastNotification } from '../utils/broadcast';

const SUPER_ADMIN_EMAIL = 'yannidelattrebalcer.artois@gmail.com';
const SUPREME_MASTER_ID = '6f62d717-2136-49d7-8c51-fee07eaeebce';

export const setupAdminRoutes = (router: Router, env: Env, ctx: ExecutionContext) => {
    const userService = new UserService(env.DB);
    const matchService = new MatchService(env.DB);

    /**
     * Resolves the calling user's email from the JWT sub claim by looking up in D1.
     * Auth0 access tokens don't always include the email claim directly.
     */
    const getCallerEmail = async (request: Request): Promise<string | null> => {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader) return null;
            const token = authHeader.substring(7);
            const payload = (request as any).user || {};

            // Try direct email claim first (may exist in some configurations)
            if (payload.email) return payload.email;

            // Fallback: look up email from D1 using the sub claim
            const sub = payload.sub;
            if (!sub) return null;
            const dbUser = await env.DB.prepare('SELECT email FROM users WHERE auth0_sub = ?').bind(sub).first<{ email: string }>();
            return dbUser?.email || null;
        } catch {
            return null;
        }
    };

    const checkAdmin = async (request: Request): Promise<boolean> => {
        const [email, d1Id] = await Promise.all([
            getCallerEmail(request),
            getCallerD1Id(request)
        ]);
        
        if (email === SUPER_ADMIN_EMAIL || d1Id === SUPREME_MASTER_ID) {
            return true;
        }

        // Allow any user with the Auth0 Admin API permission
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader) return false;
            const token = authHeader.substring(7);
            const { access } = await checkPermissions(token, [Permission.ADMIN_AUTH0], env);
            return access;
        } catch {
            return false;
        }
    };

    /**
     * Helper: extract D1 user ID from Auth0 sub claim in the JWT
     */
    const getCallerD1Id = async (request: Request): Promise<string | null> => {
        try {
            const authHeader = request.headers.get('Authorization')!;
            const token = authHeader.substring(7);
            const payload = (request as any).user || {};
            const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(payload.sub).first<{ id: string }>();
            return dbUser?.id || null;
        } catch {
            return null;
        }
    };

    /**
     * DELETE /api/admin/matches/<id>
     * Admin only route to delete a match advertisement.
     */
    router.delete('/api/admin/matches/<id>', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 401, headers: router.corsHeaders });
        }

        if (!await checkAdmin(request)) {
            return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });
        }

        const params = (request as any).params as { id: string };

        try {
            await env.DB.prepare('DELETE FROM matches WHERE id = ?').bind(params.id).run();
            await broadcastDataChanged(env);
            return Response.json({ success: true, message: 'Match deleted by admin' }, { headers: router.corsHeaders });
        } catch (e: any) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    });

    /**
     * DELETE /api/admin/users/<id>
     * Admin only route to delete a user's account from D1 and trigger real-time sync.
     */
    router.delete('/api/admin/users/<id>', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) return Response.json({ success: false, error: permissionCheck.reason }, { status: 401, headers: router.corsHeaders });
        if (!await checkAdmin(request)) return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });

        const params = (request as any).params as { id: string };
        let id = decodeURIComponent(params.id);

        let targetUser = id.includes('|')
            ? await env.DB.prepare('SELECT * FROM users WHERE auth0_sub = ?').bind(id).first()
            : await userService.getUserById(id);

        if (!targetUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        const d1Id = (targetUser as any).id as string;

        if (d1Id === SUPREME_MASTER_ID || (targetUser as any).email === SUPER_ADMIN_EMAIL) {
            return Response.json({ success: false, error: 'Impossible de supprimer le Maître Suprême ou le Super-Administrateur.' }, { status: 403, headers: router.corsHeaders });
        }

        try {
            await userService.deleteUser(d1Id);
            await broadcastDataChanged(env);
            return Response.json({ success: true, message: 'User deleted from D1' }, { headers: router.corsHeaders });
        } catch (e: any) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    });

    /**
     * GET /api/admin/users/metadata
     * Returns an array of objects { auth0_sub, is_blocked, block_reason, club_name, siret } 
     * for all users registered in D1.
     */
    router.get('/api/admin/users/metadata', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.ADMIN_AUTH0);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 401, headers: router.corsHeaders });
        }

        if (!await checkAdmin(request)) {
            return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });
        }

        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        try {
            const countRes = await env.DB.prepare('SELECT count(*) as total FROM users').first<{ total: number }>();
            const total = countRes?.total || 0;

            const results = await env.DB.prepare(`
                SELECT 
                    u.auth0_sub, 
                    u.is_blocked, 
                    u.block_reason, 
                    u.siret,
                    c.name as club_name
                FROM users u
                LEFT JOIN clubs c ON u.club_id = c.id
                LIMIT ? OFFSET ?
            `).bind(limit, offset).all<{ auth0_sub: string; is_blocked: number; block_reason: string | null; siret: string | null; club_name: string | null }>();

            const metadata = results.results?.map(u => ({
                auth0_sub: u.auth0_sub,
                is_blocked: !!u.is_blocked,
                block_reason: u.block_reason,
                siret: u.siret,
                club_name: u.club_name
            })) || [];

            return Response.json({ success: true, metadata, pagination: { total, limit, offset } }, { headers: router.corsHeaders });
        } catch (e: any) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    });

    /**
     * PATCH /api/admin/users/<id>/block
     * Admin only route to block/unblock a user.
     * Accepts { is_blocked: boolean, block_reason?: string }
     * The <id> is the D1 user ID (UUID).
     * Blocks include cascade deletion of the user's matches.
     * Super-admin email is protected and cannot be blocked.
     */
    router.patch('/api/admin/users/<id>/block', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 401, headers: router.corsHeaders });
        }

        if (!await checkAdmin(request)) {
            return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });
        }

        const params = (request as any).params as { id: string };
        let id = decodeURIComponent(params.id);

        // Resolve user: the ID might be a D1 UUID or an Auth0 sub (e.g. auth0|xxx)
        let targetUser;
        if (id.includes('|')) {
            // Auth0 sub format: look up by auth0_sub
            targetUser = await env.DB.prepare('SELECT * FROM users WHERE auth0_sub = ?').bind(id).first();
        } else {
            targetUser = await userService.getUserById(id);
        }

        if (!targetUser) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });
        }

        // Use the D1 id for all subsequent operations
        const d1Id = (targetUser as any).id as string;

        if (d1Id === SUPREME_MASTER_ID || (targetUser as any).email === SUPER_ADMIN_EMAIL) {
            return Response.json({ success: false, error: 'Impossible de bloquer le Maître Suprême ou le Super-Administrateur.' }, { status: 403, headers: router.corsHeaders });
        }

        const body: { is_blocked: boolean; block_reason?: string } = await request.json();

        try {
            await userService.setBlockedStatus(d1Id, body.is_blocked, body.block_reason);

            // Increment block_count if being blocked
            if (body.is_blocked) {
                await env.DB.prepare('UPDATE users SET block_count = block_count + 1 WHERE id = ?').bind(d1Id).run();
            }

            ctx.waitUntil(broadcastDataChanged(env));
            ctx.waitUntil(broadcastNotification(env, {
                type: 'NOTIFICATION',
                notificationType: body.is_blocked ? 'USER_BANNED' : 'USER_UNBANNED',
                targetUserId: (targetUser as any).auth0_sub,
                message: body.is_blocked
                    ? (body.block_reason || 'Aucun motif spécifié')
                    : 'Votre compte a été débloqué.',
                data: { reason: body.block_reason }
            }));
            return Response.json({ success: true, message: `User ${body.is_blocked ? 'blocked' : 'unblocked'}` }, { headers: router.corsHeaders });
        } catch (e: any) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    });

    /**
     * PATCH /api/admin/users/<id>
     * Full profile update reserved for Admins.
     * Can update stadium_address, counters, etc.
     */
    router.patch('/api/admin/users/<id>', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) return Response.json({ success: false, error: permissionCheck.reason }, { status: 401, headers: router.corsHeaders });
        if (!await checkAdmin(request)) return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });

        const params = (request as any).params as { id: string };
        let id = decodeURIComponent(params.id);

        let targetUser = id.includes('|')
            ? await env.DB.prepare('SELECT * FROM users WHERE auth0_sub = ?').bind(id).first()
            : await userService.getUserById(id);

        if (!targetUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        const body: any = await request.json();
        const d1Id = (targetUser as any).id as string;

        try {
            const updated = await userService.updateUser(d1Id, body);
            await broadcastDataChanged(env);
            return Response.json({ success: true, user: updated }, { headers: router.corsHeaders });
        } catch (e: any) {
            if (e.message === 'Unauthorized') return Response.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * POST /api/admin/users/<id>/additional-sirets
     */
    router.post('/api/admin/users/<id>/additional-sirets', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) return Response.json({ success: false, error: permissionCheck.reason }, { status: 401, headers: router.corsHeaders });
        if (!await checkAdmin(request)) return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });

        const params = (request as any).params as { id: string };
        let id = decodeURIComponent(params.id);

        let targetUser = id.includes('|')
            ? await env.DB.prepare('SELECT * FROM users WHERE auth0_sub = ?').bind(id).first()
            : await userService.getUserById(id);

        if (!targetUser) {
            if (id.includes('|')) {
                // Potential new user from Auth0, create stub
                const newId = crypto.randomUUID();
                await env.DB.prepare('INSERT INTO users (id, auth0_sub, created_at, updated_at) VALUES (?, ?, unixepoch(), unixepoch())')
                    .bind(newId, id).run();
                targetUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(newId).first();
            } else {
                return Response.json({ success: false, error: 'User not found in D1' }, { status: 404, headers: router.corsHeaders });
            }
        }

        const body: { siret: string; force?: boolean } = await request.json();
        if (!body.siret || (body.siret.length !== 14 && body.siret.length !== 9)) {
            return Response.json({ success: false, error: 'Un SIRET (14 chiffres) ou SIREN (9 chiffres) valide est requis.' }, { status: 400, headers: router.corsHeaders });
        }

        let clubName = 'Entreprise / Club';
        if (!body.force) {
            // Validate via Gouv API
            const { ClubService } = await import('../services/club.service');
            const clubService = new ClubService(env);
            const validation = await clubService.validateSiret(body.siret);
            if (!validation.isValid) {
                return Response.json({ success: false, error: validation.error || "Ce SIRET n'est pas un club de football valide." }, { status: 400, headers: router.corsHeaders });
            }
            clubName = validation.clubName || clubName;
        } else {
            // Even if forced, try to get the name for better UI but don't fail
            try {
                const { ClubService } = await import('../services/club.service');
                const clubService = new ClubService(env);
                const validation = await clubService.validateSiret(body.siret);
                if (validation.clubName) clubName = validation.clubName;
            } catch (e) { }
        }

        const d1Id = (targetUser as any).id as string;
        let siretsStr = (targetUser as any).additional_sirets;
        let sirets: string[] = [];
        if (typeof siretsStr === 'string') {
            try {
                let parsed = JSON.parse(siretsStr);
                if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                if (Array.isArray(parsed)) sirets = parsed;
            } catch (e) { sirets = []; }
        } else if (Array.isArray(siretsStr)) {
            sirets = siretsStr;
        }
        if (!sirets.includes(body.siret)) {
            sirets.push(body.siret);
            // Increment siret_change_count
            await env.DB.prepare('UPDATE users SET additional_sirets = ?, siret_change_count = siret_change_count + 1, updated_at = unixepoch() WHERE id = ?')
                .bind(JSON.stringify(sirets), d1Id).run();
            await broadcastDataChanged(env);
        }

        // Return updated list with names for immediate UI update
        const clubService = new (await import('../services/club.service')).ClubService(env);
        const additionalWithNames = await Promise.all(sirets.map(async (s) => {
            const validation = await clubService.validateSiret(s);
            return { siret: s, name: validation.clubName || 'Inconnu' };
        }));

        return Response.json({
            success: true,
            additional_sirets: additionalWithNames, // Standardized key
            club_name: clubName
        }, { headers: router.corsHeaders });
    });

    /**
     * POST /api/admin/users/<id>/primary-siret
     * Set (and potentially force) primary SIRET for a user
     */
    router.post('/api/admin/users/<id>/primary-siret', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) return Response.json({ success: false, error: permissionCheck.reason }, { status: 401, headers: router.corsHeaders });
        if (!await checkAdmin(request)) return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });

        const params = (request as any).params as { id: string };
        let id = decodeURIComponent(params.id);

        let targetUser = id.includes('|')
            ? await env.DB.prepare('SELECT * FROM users WHERE auth0_sub = ?').bind(id).first()
            : await userService.getUserById(id);

        if (!targetUser) {
            if (id.includes('|')) {
                // Potential new user from Auth0, create stub
                const newId = crypto.randomUUID();
                await env.DB.prepare('INSERT INTO users (id, auth0_sub, created_at, updated_at) VALUES (?, ?, unixepoch(), unixepoch())')
                    .bind(newId, id).run();
                targetUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(newId).first();
            } else {
                return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });
            }
        }

        const body: { siret: string; force?: boolean } = await request.json();
        if (!body.siret || (body.siret.length !== 14 && body.siret.length !== 9)) {
            return Response.json({ success: false, error: 'SIRET (14 chiffres) ou SIREN (9 chiffres) invalide' }, { status: 400, headers: router.corsHeaders });
        }

        // Validate via Gouv API
        const { ClubService } = await import('../services/club.service');
        const { validateClubSiret } = await import('../utils/siret.validator'); // Fixed path
        const clubService = new ClubService(env);

        let clubName = 'Entreprise / Club';
        let clubCity = 'Ville non spécifiée';
        let clubAddress = '';
        let clubZip = '';
        let lat: number | null = null;
        let lon: number | null = null;

        const SIRET_API_URL = env.SIRET_API_URL || 'https://recherche-entreprises.api.gouv.fr/search';
        try {
            const apiRes = await fetch(`${SIRET_API_URL}?q=${body.siret}&page=1&per_page=1`);
            if (apiRes.ok) {
                const apiData: any = await apiRes.json();
                if (apiData.results && apiData.results.length > 0) {
                    const ent = apiData.results[0];
                    if (!body.force) {
                        const validation = validateClubSiret(ent.activite_principale, ent.nom_complet);
                        if (!validation.isValid) throw new Error(validation.reason);
                    }
                    clubName = ent.nom_complet || ent.nom_raison_sociale || clubName;
                    const siege = ent.siege || {};
                    clubCity = siege.libelle_commune || siege.commune || '';
                    clubAddress = siege.adresse || '';
                    clubZip = siege.code_postal || '';
                    lat = siege.latitude ? parseFloat(siege.latitude) : null;
                    lon = siege.longitude ? parseFloat(siege.longitude) : null;
                } else if (!body.force) {
                    return Response.json({ success: false, error: "Entreprise introuvable" }, { status: 404, headers: router.corsHeaders });
                }
            }
        } catch (e: any) {
            if (!body.force) return Response.json({ success: false, error: 'Internal server error' }, { status: 400, headers: router.corsHeaders });
        }

        // Create or get club ID
        const existingClub = await env.DB.prepare('SELECT id FROM clubs WHERE siret = ?').bind(body.siret).first();
        let clubId: string;
        if (existingClub) {
            clubId = (existingClub as any).id;
        } else {
            clubId = crypto.randomUUID();
            await env.DB.prepare('INSERT INTO clubs (id, siret, name, city, address, zip, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                .bind(clubId, body.siret, clubName, clubCity, clubAddress, clubZip, lat, lon).run();
        }

        const d1Id = (targetUser as any).id as string;
        await env.DB.prepare('UPDATE users SET siret = ?, club_id = ?, siret_change_count = siret_change_count + 1, updated_at = unixepoch() WHERE id = ?')
            .bind(body.siret, clubId, d1Id).run();

        await broadcastDataChanged(env);

        return Response.json({ success: true, club_name: clubName }, { headers: router.corsHeaders });
    });

    /**
     * DELETE /api/admin/users/<id>/primary-siret
     */
    router.delete('/api/admin/users/<id>/primary-siret', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) return Response.json({ success: false, error: permissionCheck.reason }, { status: 401, headers: router.corsHeaders });
        if (!await checkAdmin(request)) return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });

        const params = (request as any).params as { id: string };
        let id = decodeURIComponent(params.id);

        let targetUser = id.includes('|')
            ? await env.DB.prepare('SELECT * FROM users WHERE auth0_sub = ?').bind(id).first()
            : await userService.getUserById(id);

        if (!targetUser) return Response.json({ success: false, error: 'User not found in D1' }, { status: 404, headers: router.corsHeaders });

        const d1Id = (targetUser as any).id as string;
        await env.DB.prepare('UPDATE users SET siret = NULL, club_id = NULL, siret_change_count = siret_change_count + 1, updated_at = unixepoch() WHERE id = ?').bind(d1Id).run();
        await broadcastDataChanged(env);

        return Response.json({ success: true }, { headers: router.corsHeaders });
    });

    /**
     * DELETE /api/admin/users/<id>/additional-sirets/<siret>
     */
    router.delete('/api/admin/users/<id>/additional-sirets/<siret>', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) return Response.json({ success: false, error: permissionCheck.reason }, { status: 401, headers: router.corsHeaders });
        if (!await checkAdmin(request)) return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });

        const params = (request as any).params as { id: string, siret: string };
        let id = decodeURIComponent(params.id);

        let targetUser = id.includes('|')
            ? await env.DB.prepare('SELECT * FROM users WHERE auth0_sub = ?').bind(id).first()
            : await userService.getUserById(id);

        if (!targetUser) return Response.json({ success: false, error: 'User not found in D1' }, { status: 404, headers: router.corsHeaders });

        const d1Id = (targetUser as any).id as string;
        let siretsStr = (targetUser as any).additional_sirets;
        let sirets: string[] = [];
        if (typeof siretsStr === 'string') {
            try {
                let parsed = JSON.parse(siretsStr);
                if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                if (Array.isArray(parsed)) sirets = parsed;
            } catch (e) { sirets = []; }
        } else if (Array.isArray(siretsStr)) {
            sirets = siretsStr;
        }
        sirets = sirets.filter(s => s !== params.siret);

        await env.DB.prepare('UPDATE users SET additional_sirets = ?, siret_change_count = siret_change_count + 1, updated_at = unixepoch() WHERE id = ?').bind(JSON.stringify(sirets), d1Id).run();
        await broadcastDataChanged(env);

        // Return updated list with names for consistent UI
        const SIRET_API_URL = env.SIRET_API_URL || 'https://recherche-entreprises.api.gouv.fr/search';
        const additionalWithNames = await Promise.all(sirets.map(async (s) => {
            try {
                const r = await fetch(`${SIRET_API_URL}?q=${s}&page=1&per_page=1`);
                if (r.ok) {
                    const d: any = await r.json();
                    return { siret: s, name: d.results?.[0]?.nom_complet || s };
                }
            } catch (e) { }
            return { siret: s, name: s };
        }));

        return Response.json({ success: true, additional_sirets: additionalWithNames }, { headers: router.corsHeaders });
    });

    /**
     * GET /api/admin/users/<id>/sirets
     */
    router.get('/api/admin/users/<id>/sirets', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) return Response.json({ success: false, error: permissionCheck.reason }, { status: 401, headers: router.corsHeaders });
        if (!await checkAdmin(request)) return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });

        const params = (request as any).params as { id: string };
        let id = decodeURIComponent(params.id);

        let targetUser = id.includes('|')
            ? await env.DB.prepare('SELECT * FROM users WHERE auth0_sub = ?').bind(id).first()
            : await userService.getUserById(id);

        if (!targetUser) {
            return Response.json({
                success: true,
                primary_siret: null,
                primary_name: null,
                stadium_address: null,
                additional_sirets: [],
                block_count: 0,
                siret_change_count: 0
            }, { headers: router.corsHeaders });
        }

        const user = (targetUser as any);
        let siretsStr = user.additional_sirets;
        let additional_sirets_raw: any[] = [];
        if (typeof siretsStr === 'string') {
            try {
                let parsed = JSON.parse(siretsStr);
                if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                if (Array.isArray(parsed)) additional_sirets_raw = parsed;
            } catch (e) { additional_sirets_raw = []; }
        } else if (Array.isArray(siretsStr)) {
            additional_sirets_raw = siretsStr;
        }

        // Fetch names for all SIRETs
        const clubService = new (await import('../services/club.service')).ClubService(env);

        let primary_name = null;
        if (user.siret) {
            const validation = await clubService.validateSiret(user.siret);
            primary_name = validation.clubName || user.siret;
        }

        const additionalWithNames = await Promise.all(additional_sirets_raw.map(async (s) => {
            const currentSiret = typeof s === 'string' ? s : s.siret;
            const currentStadium = typeof s === 'object' ? s.stadium_address : null;
            const validation = await clubService.validateSiret(currentSiret);
            return {
                siret: currentSiret,
                name: validation.clubName || currentSiret,
                stadium_address: currentStadium
            };
        }));

        return Response.json({
            success: true,
            primary_siret: user.siret,
            primary_name,
            stadium_address: user.stadium_address,
            additional_sirets: additionalWithNames,
            block_count: user.block_count || 0,
            siret_change_count: user.siret_change_count || 0
        }, { headers: router.corsHeaders });
    });
};
