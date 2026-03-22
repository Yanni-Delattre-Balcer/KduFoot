/// <reference types="@cloudflare/workers-types" />
import { Router, AuthenticatedRequest } from '../router';
import { Env } from '../../types/env';
import { ExecutionContext } from "@cloudflare/workers-types";
import { UserService } from '../../services/user.service';
import { Permission } from '../../types/permissions';
import { broadcastDataChanged, broadcastNotification } from '../../utils/broadcast';
import { checkAdmin, SUPER_ADMIN_EMAIL, SUPREME_MASTER_ID } from './utils';

export const setupAdminUserRoutes = (router: Router, env: Env, ctx: ExecutionContext) => {
    const userService = new UserService(env.DB);

    /**
     * DELETE /api/admin/users/<id>
     */
    router.delete('/api/admin/users/<id>', async (request: AuthenticatedRequest, env: Env) => {
        if (!await checkAdmin(request, env)) return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });

        const params = request.params;
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
        } catch (_e: unknown) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.WRITE_API);

    /**
     * GET /api/admin/users/metadata
     */
    router.get('/api/admin/users/metadata', async (request: AuthenticatedRequest, env: Env) => {
        if (!await checkAdmin(request, env)) {
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
                    u.id,
                    u.auth0_sub, 
                    u.email,
                    u.firstname,
                    u.lastname,
                    u.club_id,
                    u.is_blocked, 
                    u.block_reason, 
                    u.siret,
                    u.created_at,
                    u.updated_at,
                    c.name as club_name
                FROM users u
                LEFT JOIN clubs c ON u.club_id = c.id
                ORDER BY u.created_at DESC
                LIMIT ? OFFSET ?
            `).bind(limit, offset).all<any>();

            const metadata = results.results?.map(u => ({
                id: u.id,
                auth0_sub: u.auth0_sub,
                email: u.email,
                name: u.firstname && u.lastname ? `${u.firstname} ${u.lastname}` : 'Utilisateur',
                club_id: u.club_id,
                club_name: u.club_name,
                is_blocked: !!u.is_blocked,
                block_reason: u.block_reason,
                siret: u.siret,
                created_at: u.created_at,
                last_login: u.updated_at,
                role: u.email === SUPER_ADMIN_EMAIL ? 'super_admin' : 'user'
            })) || [];

            return Response.json({ success: true, metadata, pagination: { total, limit, offset } }, { headers: router.corsHeaders });
        } catch (_e: unknown) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.ADMIN_AUTH0);

    /**
     * PATCH /api/admin/users/<id>/block
     */
    router.patch('/api/admin/users/<id>/block', async (request: AuthenticatedRequest, env: Env) => {
        if (!await checkAdmin(request, env)) {
            return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });
        }

        const params = request.params;
        let id = decodeURIComponent(params.id);

        let targetUser;
        if (id.includes('|')) {
            targetUser = await env.DB.prepare('SELECT * FROM users WHERE auth0_sub = ?').bind(id).first();
        } else {
            targetUser = await userService.getUserById(id);
        }

        if (!targetUser) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });
        }

        const d1Id = (targetUser as any).id as string;

        if (d1Id === SUPREME_MASTER_ID || (targetUser as any).email === SUPER_ADMIN_EMAIL) {
            return Response.json({ success: false, error: 'Impossible de bloquer le Maître Suprême ou le Super-Administrateur.' }, { status: 403, headers: router.corsHeaders });
        }

        const body: { is_blocked: boolean; block_reason?: string } = await request.json();

        try {
            await userService.setBlockedStatus(d1Id, body.is_blocked, body.block_reason);

            if (body.is_blocked) {
                await env.DB.prepare('UPDATE users SET block_count = block_count + 1 WHERE id = ?').bind(d1Id).run();
            }

            if (env.KV_CACHE) {
                await env.KV_CACHE.delete(`blocked:${(targetUser as any).auth0_sub}`);
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
        } catch (_e: unknown) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.WRITE_API);

    /**
     * PATCH /api/admin/users/<id>
     */
    router.patch('/api/admin/users/<id>', async (request: AuthenticatedRequest, env: Env) => {
        if (!await checkAdmin(request, env)) return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });

        const params = request.params;
        let id = decodeURIComponent(params.id);

        let targetUser = id.includes('|')
            ? await env.DB.prepare('SELECT * FROM users WHERE auth0_sub = ?').bind(id).first()
            : await userService.getUserById(id);

        if (!targetUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        const body = await request.json() as Record<string, unknown>;
        const d1Id = (targetUser as any).id as string;

        try {
            const updated = await userService.updateUser(d1Id, body);
            await broadcastDataChanged(env);
            return Response.json({ success: true, user: updated }, { headers: router.corsHeaders });
        } catch (e: unknown) {
            if (e instanceof Error && e.message === 'Unauthorized') return Response.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.WRITE_API);

    /**
     * POST /api/admin/users/<id>/additional-sirets
     */
    router.post('/api/admin/users/<id>/additional-sirets', async (request: AuthenticatedRequest, env: Env) => {
        if (!await checkAdmin(request, env)) return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });

        const params = request.params;
        let id = decodeURIComponent(params.id);

        let targetUser = id.includes('|')
            ? await env.DB.prepare('SELECT * FROM users WHERE auth0_sub = ?').bind(id).first()
            : await userService.getUserById(id);

        if (!targetUser) {
            if (id.includes('|')) {
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
            const { ClubService } = await import('../../services/club.service');
            const clubService = new ClubService(env);
            const validation = await clubService.validateSiret(body.siret);
            if (!validation.isValid) {
                return Response.json({ success: false, error: validation.error || "Ce SIRET n'est pas un club de football valide." }, { status: 400, headers: router.corsHeaders });
            }
            clubName = validation.clubName || clubName;
        } else {
            try {
                const { ClubService } = await import('../../services/club.service');
                const clubService = new ClubService(env);
                const validation = await clubService.validateSiret(body.siret);
                if (validation.clubName) clubName = validation.clubName;
            } catch (e) { /* intentionnellement vide */ }
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
            await env.DB.prepare('UPDATE users SET additional_sirets = ?, siret_change_count = siret_change_count + 1, updated_at = unixepoch() WHERE id = ?')
                .bind(JSON.stringify(sirets), d1Id).run();
            await broadcastDataChanged(env);
        }

        const clubService = new (await import('../../services/club.service')).ClubService(env);
        const additionalWithNames = await Promise.all(sirets.map(async (s) => {
            const validation = await clubService.validateSiret(s);
            return { siret: s, name: validation.clubName || 'Inconnu' };
        }));

        return Response.json({
            success: true,
            additional_sirets: additionalWithNames,
            club_name: clubName
        }, { headers: router.corsHeaders });
    }, Permission.WRITE_API);

    /**
     * POST /api/admin/users/<id>/primary-siret
     */
    router.post('/api/admin/users/<id>/primary-siret', async (request: AuthenticatedRequest, env: Env) => {
        if (!await checkAdmin(request, env)) return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });

        const params = request.params;
        let id = decodeURIComponent(params.id);

        let targetUser = id.includes('|')
            ? await env.DB.prepare('SELECT * FROM users WHERE auth0_sub = ?').bind(id).first()
            : await userService.getUserById(id);

        if (!targetUser) {
            if (id.includes('|')) {
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

        const { ClubService } = await import('../../services/club.service');
        const { validateClubSiret } = await import('../../utils/siret.validator');
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
                const apiData = await apiRes.json() as import("../../types").SiretApiResponse;
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
        } catch (_e: unknown) {
            if (!body.force) return Response.json({ success: false, error: 'Internal server error' }, { status: 400, headers: router.corsHeaders });
        }

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
    }, Permission.WRITE_API);

    /**
     * DELETE /api/admin/users/<id>/primary-siret
     */
    router.delete('/api/admin/users/<id>/primary-siret', async (request: AuthenticatedRequest, env: Env) => {
        if (!await checkAdmin(request, env)) return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });

        const params = request.params;
        let id = decodeURIComponent(params.id);

        let targetUser = id.includes('|')
            ? await env.DB.prepare('SELECT * FROM users WHERE auth0_sub = ?').bind(id).first()
            : await userService.getUserById(id);

        if (!targetUser) return Response.json({ success: false, error: 'User not found in D1' }, { status: 404, headers: router.corsHeaders });

        const d1Id = (targetUser as any).id as string;
        await env.DB.prepare('UPDATE users SET siret = NULL, club_id = NULL, siret_change_count = siret_change_count + 1, updated_at = unixepoch() WHERE id = ?').bind(d1Id).run();
        await broadcastDataChanged(env);

        return Response.json({ success: true }, { headers: router.corsHeaders });
    }, Permission.WRITE_API);

    /**
     * DELETE /api/admin/users/<id>/additional-sirets/<siret>
     */
    router.delete('/api/admin/users/<id>/additional-sirets/<siret>', async (request: AuthenticatedRequest, env: Env) => {
        if (!await checkAdmin(request, env)) return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });

        const params = request.params as any;
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

        const SIRET_API_URL = env.SIRET_API_URL || 'https://recherche-entreprises.api.gouv.fr/search';
        const additionalWithNames = await Promise.all(sirets.map(async (s) => {
            try {
                const r = await fetch(`${SIRET_API_URL}?q=${s}&page=1&per_page=1`);
                if (r.ok) {
                    const d = await r.json() as import("../../types").SiretApiResponse;
                    return { siret: s, name: d.results?.[0]?.nom_complet || s };
                }
            } catch (e) { /* intentionnellement vide */ }
            return { siret: s, name: s };
        }));

        return Response.json({ success: true, additional_sirets: additionalWithNames }, { headers: router.corsHeaders });
    }, Permission.WRITE_API);

    /**
     * GET /api/admin/users/<id>/sirets
     */
    router.get('/api/admin/users/<id>/sirets', async (request: AuthenticatedRequest, env: Env) => {
        if (!await checkAdmin(request, env)) return Response.json({ success: false, error: 'Forbidden: Admin only' }, { status: 403, headers: router.corsHeaders });

        const params = request.params;
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
        let additional_sirets_raw: unknown[] = [];
        if (typeof siretsStr === 'string') {
            try {
                let parsed = JSON.parse(siretsStr);
                if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                if (Array.isArray(parsed)) additional_sirets_raw = parsed;
            } catch (e) { additional_sirets_raw = []; }
        } else if (Array.isArray(siretsStr)) {
            additional_sirets_raw = siretsStr;
        }

        const clubService = new (await import('../../services/club.service')).ClubService(env);

        let primary_name = null;
        if (user.siret) {
            const validation = await clubService.validateSiret(user.siret);
            primary_name = validation.clubName || user.siret;
        }

        const additionalWithNames = await Promise.all(additional_sirets_raw.map(async (s: unknown) => {
            const sObj = s as { siret?: string; stadium_address?: string };
            const currentSiret = typeof s === 'string' ? s : (sObj.siret || '');
            const currentStadium = typeof s === 'object' && s !== null ? sObj.stadium_address : null;
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
    }, Permission.READ_API);
};
