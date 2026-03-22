/// <reference types="@cloudflare/workers-types" />
import { Router, AuthenticatedRequest } from '../router';
import { Env } from '../../types/env';
import { UserService } from '../../services/user.service';
import { UpdateUserDto } from '../../types/user';
import { Permission } from '../../types/permissions';
import { checkPermissions } from '../../auth0';
import { validateClubSiret } from '../../utils/siret.validator';
import { broadcastDataChanged } from '../../utils/broadcast';

const SUPER_ADMIN_EMAIL = 'yannidelattrebalcer.artois@gmail.com';

export const setupProfileRoutes = (router: Router, env: Env) => {
    const userService = new UserService(env.DB);

    /**
     * GET /api/users/me
     */
    router.get('/api/users/me', async (request: AuthenticatedRequest, env: Env) => {
        const sub = request.user?.sub as string;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found in D1. Call sync first.' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        let club = null;
        if (user.club_id) {
            club = await env.DB.prepare('SELECT id, siret, name, city, address, zip, latitude, longitude FROM clubs WHERE id = ?').bind(user.club_id).first();
        }

        let additional_clubs: import("../../types").Club[] = [];
        if (Array.isArray(user.additional_sirets) && user.additional_sirets.length > 0) {
            additional_clubs = await Promise.all(user.additional_sirets.map(async (item: unknown) => {
                const itemObj = item as { siret?: string; stadium_address?: string };
                // Keep strictly typed logic here using fallback
                const siret = typeof item === 'string' ? item : (itemObj.siret || '');
                const stadium_address = typeof item === 'object' && item !== null ? itemObj.stadium_address : undefined;

                const dbClub = await env.DB.prepare('SELECT id, name, city, zip, address, latitude, longitude FROM clubs WHERE siret = ?').bind(siret).first<{ id: string, name: string, city: string, zip: string, address: string, latitude: number, longitude: number }>();
                if (dbClub) return { ...dbClub, siret, stadium_address } as import("../../types").Club;

                try {
                    const SIRET_API_URL = env.SIRET_API_URL || 'https://recherche-entreprises.api.gouv.fr/search';
                    const r = await fetch(`${SIRET_API_URL}?q=${siret}&page=1&per_page=1`);
                    if (r.ok) {
                        const d = await r.json() as import("../../types").SiretApiResponse;
                        if (d.results && d.results.length > 0) {
                            const rData = d.results[0];
                            const newId = crypto.randomUUID();
                            const name = rData.nom_complet || siret;
                            const city = rData.siege?.libelle_commune || '';
                            const zip = rData.siege?.code_postal || '';
                            const address = rData.siege?.adresse || '';
                            const lat = rData.siege?.latitude ? parseFloat(rData.siege.latitude) : 0;
                            const lng = rData.siege?.longitude ? parseFloat(rData.siege.longitude) : 0;

                            await env.DB.prepare(
                                'INSERT INTO clubs (id, siret, name, city, address, zip, latitude, longitude, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())'
                            ).bind(newId, siret, name, city, address, zip, lat, lng).run();

                            return { id: newId, siret, name, city, zip, address, latitude: lat, longitude: lng, stadium_address } as import("../../types").Club;
                        }
                    }
                } catch (e) { /* intentionnellement vide */ }

                return { id: crypto.randomUUID(), siret, name: siret, city: '', zip: '', address: '', latitude: 0, longitude: 0, stadium_address } as import("../../types").Club;
            }));
        }

        return Response.json({ success: true, user: { ...user, club, additional_clubs } }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    }, Permission.READ_API);

    /**
     * GET /api/me/context
     */
    router.get('/api/me/context', async (request: AuthenticatedRequest, env: Env) => {
        const sub = request.user?.sub as string;

        // 1. Prepare all queries for batch execution
        const userQuery = env.DB.prepare('SELECT * FROM users WHERE auth0_sub = ?').bind(sub);
        
        const [userRes] = await Promise.all([userQuery.first<any>()]);
        if (!userRes) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
        const user = userService.parseUser(userRes)!;

        // 2. Prepare second batch (Club + Notifications)
        const queries = [];
        if (user.club_id) {
            queries.push(env.DB.prepare('SELECT id, siret, name, city, address, zip, latitude, longitude FROM clubs WHERE id = ?').bind(user.club_id));
        }
        
        // Notifications queries
        const incomingReqsQuery = env.DB.prepare(`
            SELECT COUNT(*) as count FROM match_contacts mc 
            JOIN matches m ON mc.match_id = m.id 
            WHERE m.owner_id = ? AND mc.status = 'pending' AND COALESCE(mc.notification_state, 1) = 1
        `).bind(user.id);
        
        const updatesQuery = env.DB.prepare(`
            SELECT COUNT(*) as count FROM match_contacts mc
            WHERE mc.user_id = ? AND mc.status IN ('accepted', 'refused') AND COALESCE(mc.notification_state, 0) = 1
        `).bind(user.id);

        queries.push(incomingReqsQuery);
        queries.push(updatesQuery);

        const results = await env.DB.batch(queries);
        
        let club = null;
        let notifications = { incoming_requests: 0, updates: 0, total: 0 };
        
        if (user.club_id) {
            club = results[0].results[0];
            notifications.incoming_requests = (results[1].results[0] as any).count;
            notifications.updates = (results[2].results[0] as any).count;
        } else {
            notifications.incoming_requests = (results[0].results[0] as any).count;
            notifications.updates = (results[1].results[0] as any).count;
        }
        notifications.total = notifications.incoming_requests + notifications.updates;

        // Handle additional clubs separately
        let additional_clubs: import("../../types").Club[] = [];
        if (Array.isArray(user.additional_sirets) && user.additional_sirets.length > 0) {
            additional_clubs = await Promise.all(user.additional_sirets.map(async (item: unknown) => {
                const itemObj = item as { siret?: string; stadium_address?: string };
                const siret = typeof item === 'string' ? item : (itemObj.siret || '');
                const stadium_address = typeof item === 'object' && item !== null ? itemObj.stadium_address : undefined;

                const dbClub = await env.DB.prepare('SELECT id, name, city, zip, address, latitude, longitude FROM clubs WHERE siret = ?').bind(siret).first<{ id: string, name: string, city: string, zip: string, address: string, latitude: number, longitude: number }>();
                if (dbClub) return { ...dbClub, siret, stadium_address } as import("../../types").Club;

                try {
                    const SIRET_API_URL = env.SIRET_API_URL || 'https://recherche-entreprises.api.gouv.fr/search';
                    const r = await fetch(`${SIRET_API_URL}?q=${siret}&page=1&per_page=1`);
                    if (r.ok) {
                        const d = await r.json() as import("../../types").SiretApiResponse;
                        if (d.results && d.results.length > 0) {
                            const rData = d.results[0];
                            const newId = crypto.randomUUID();
                            const name = rData.nom_complet || siret;
                            const city = rData.siege?.libelle_commune || '';
                            const zip = rData.siege?.code_postal || '';
                            const address = rData.siege?.adresse || '';
                            const lat = rData.siege?.latitude ? parseFloat(rData.siege.latitude) : 0;
                            const lng = rData.siege?.longitude ? parseFloat(rData.siege.longitude) : 0;

                            await env.DB.prepare(
                                'INSERT INTO clubs (id, siret, name, city, address, zip, latitude, longitude, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())'
                            ).bind(newId, siret, name, city, address, zip, lat, lng).run();

                            return { id: newId, siret, name, city, zip, address, latitude: lat, longitude: lng, stadium_address } as import("../../types").Club;
                        }
                    }
                } catch (e) { /* intentionnellement vide */ }

                return { id: crypto.randomUUID(), siret, name: siret, city: '', zip: '', address: '', latitude: 0, longitude: 0, stadium_address } as import("../../types").Club;
            }));
        }

        return Response.json({
            success: true,
            user: { ...user, club, additional_clubs },
            notifications
        }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    }, Permission.READ_API);

    /**
     * PUT /api/users/me
     */
    router.put('/api/users/me', async (request: AuthenticatedRequest, env: Env) => {
        const sub = request.user?.sub as string;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const body: UpdateUserDto = await request.json();

        // Safety: regular users cannot change their critical fields
        const forbiddenKeys = [
            'id', 'auth0_sub', 'email', 'subscription', 'is_blocked', 
            'block_count', 'siret_change_count', 'calendar_token', 
            'block_reason', 'created_at', 'updated_at'
        ];
        
        for (const key of forbiddenKeys) {
            delete (body as any)[key];
        }

        try {
            const updated = await userService.updateUser(user.id, body);
            return Response.json({ success: true, user: updated }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: unknown) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    }, Permission.WRITE_API);

    /**
     * POST /api/users/link-club
     */
    router.post('/api/users/link-club', async (request: AuthenticatedRequest, env: Env) => {
        const sub = request.user?.sub as string;
        const token = request.headers.get('Authorization')?.substring(7) || '';

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        if (user.club_id) {
            return Response.json({ success: false, error: 'Votre compte est déjà lié à un club. Cette action est irréversible.' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const body: { siret: string } = await request.json();
        if (!body.siret || (body.siret.length !== 9 && body.siret.length !== 14)) {
            return Response.json({ success: false, error: 'Numéro invalide. Il doit contenir 9 (SIREN) ou 14 (SIRET) chiffres.' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            const apiUrl = `${env.SIRET_API_URL}?q=${body.siret}&page=1&per_page=1`;
            const apiRes = await fetch(apiUrl);
            if (!apiRes.ok) {
                return Response.json({ success: false, error: 'Erreur lors de la recherche de l\'entreprise.' }, { status: 502, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            }

            const apiData = await apiRes.json() as import("../../types").SiretApiResponse;
            if (!apiData.results || apiData.results.length === 0) {
                return Response.json({ success: false, error: 'Aucune entreprise trouvée pour ce SIRET.' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            }

            const entreprise = apiData.results[0];
            const siege = entreprise.siege || {};

            const clubName = entreprise.nom_complet || entreprise.nom_raison_sociale || 'Club inconnu';

            let isAdminUser = user.email === SUPER_ADMIN_EMAIL;
            if (!isAdminUser) {
                try {
                    const { access } = await checkPermissions(token, [Permission.ADMIN_AUTH0], env);
                    isAdminUser = access;
                } catch { /* not admin */ }
            }

            if (!isAdminUser) {
                const validation = validateClubSiret(entreprise.activite_principale, clubName);
                if (!validation.isValid) {
                    return Response.json({ success: false, error: validation.reason }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
                }
            }

            const clubAddress = siege.adresse || '';
            const clubCity = siege.libelle_commune || siege.commune || '';
            const clubZip = siege.code_postal || '';
            const lat = siege.latitude ? parseFloat(siege.latitude) : null;
            const lon = siege.longitude ? parseFloat(siege.longitude) : null;

            const { v4: uuidv4 } = await import('uuid');
            const existingClub = await env.DB.prepare('SELECT * FROM clubs WHERE siret = ?').bind(body.siret).first();

            let clubId: string;
            if (existingClub) {
                clubId = (existingClub as any).id;
                await env.DB.prepare(
                    'UPDATE clubs SET name = ?, city = ?, address = ?, zip = ?, latitude = ?, longitude = ?, cached_at = unixepoch() WHERE id = ?'
                ).bind(clubName, clubCity, clubAddress, clubZip, lat, lon, clubId).run();
            } else {
                clubId = uuidv4();
                await env.DB.prepare(
                    'INSERT INTO clubs (id, siret, name, city, address, zip, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                ).bind(clubId, body.siret, clubName, clubCity, clubAddress, clubZip, lat, lon).run();
            }

            const updatedUser = await userService.updateUser(user.id, {
                club_id: clubId,
                siret: body.siret,
                location: clubCity,
                stadium_address: clubAddress,
                siret_change_count: (user.siret_change_count || 0) + 1,
            });

            return Response.json({
                success: true,
                user: {
                    ...updatedUser,
                    club: { id: clubId, siret: body.siret, name: clubName, city: clubCity, address: clubAddress, zip: clubZip, latitude: lat, longitude: lon }
                }
            }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: unknown) {
            console.error('Link Club Error:', e);
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    }, Permission.READ_API);

    /**
     * POST /api/users/unlink-club
     */
    router.post('/api/users/unlink-club', async (request: AuthenticatedRequest, env: Env) => {
        const sub = request.user?.sub as string;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            await env.DB.prepare(
                'UPDATE users SET club_id = NULL, siret = NULL, location = NULL, stadium_address = NULL WHERE id = ?'
            ).bind(user.id).run();

            await broadcastDataChanged(env);

            return Response.json({ success: true, message: 'Club détaché avec succès.' }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: unknown) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    }, Permission.ADMIN_AUTH0);

    /**
     * DELETE /api/users/me
     */
    router.delete('/api/users/me', async (request: AuthenticatedRequest, env: Env) => {
        const sub = request.user?.sub as string;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            await userService.deleteUser(user.id);

            // RGPD audit: log account deletion
            try {
                await env.DB.prepare(
                    'INSERT INTO rgpd_audit_log (id, user_id, action, details) VALUES (?, ?, ?, ?)'
                ).bind(crypto.randomUUID(), user.id, 'delete', 'Account self-deletion').run();
            } catch { /* audit log should not block deletion */ }

            return Response.json({ success: true, message: 'Account deleted' }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: unknown) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    }, Permission.READ_API);

    /**
     * GET /api/users/me/calendar-link
     */
    router.get('/api/users/me/calendar-link', async (request: AuthenticatedRequest, env: Env) => {
        const sub = request.user?.sub as string;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const token = await userService.getOrCreateCalendarToken(user.id);
        const url = new URL(request.url);
        const webcalUrl = `webcal://${url.host}/api/calendar/${token}.ics`;

        return Response.json({ success: true, url: webcalUrl }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    }, Permission.READ_API);

    /**
     * GET /api/me/export
     */
    router.get('/api/me/export', async (request: AuthenticatedRequest, env: Env) => {
        const sub = request.user?.sub as string;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            const data = await userService.exportUserData(user.id);
            const exportData = data as Record<string, unknown>;
            
            const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib/dist/pdf-lib.esm.js');
            
            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            
            let page = pdfDoc.addPage([595.28, 841.89]);
            const { width, height } = page.getSize();
            let y = height - 50;

            page.drawText('KduFoot - Export de Données (RGPD)', { x: 50, y, size: 20, font: fontBold, color: rgb(0, 0, 0.5) });
            y -= 30;
            page.drawText(`Date d'export : ${new Date().toLocaleString('fr-FR')}`, { x: 50, y, size: 10, font });
            y -= 40;

            const profile = (exportData.profile || {}) as Record<string, unknown>;
            page.drawText('1. PROFIL UTILISATEUR', { x: 50, y, size: 14, font: fontBold });
            y -= 25;
            page.drawText(`Nom : ${profile.lastname || 'Non spécifié'}`, { x: 70, y, size: 11, font });
            y -= 15;
            page.drawText(`Prénom : ${profile.firstname || 'Non spécifié'}`, { x: 70, y, size: 11, font });
            y -= 15;
            page.drawText(`Email : ${profile.email}`, { x: 70, y, size: 11, font });
            y -= 15;
            page.drawText(`Licence : ${profile.license_id || 'Non spécifiée'}`, { x: 70, y, size: 11, font });
            y -= 15;
            page.drawText(`Club : ${profile.siret || 'Aucun club lié'}`, { x: 70, y, size: 11, font });
            y -= 40;

            const matches = (exportData.matches || []) as any[];
            const match_applications = (exportData.match_applications || []) as any[];
            const training_sessions = (exportData.training_sessions || []) as any[];
            const created_exercises = (exportData.created_exercises || []) as any[];

            page.drawText('2. RÉSUMÉ D\'ACTIVITÉ', { x: 50, y, size: 14, font: fontBold });
            y -= 25;
            page.drawText(`Matchs créés : ${matches.length}`, { x: 70, y, size: 11, font });
            y -= 15;
            page.drawText(`Participations : ${match_applications.length}`, { x: 70, y, size: 11, font });
            y -= 15;
            page.drawText(`Séances d'entraînement : ${training_sessions.length}`, { x: 70, y, size: 11, font });
            y -= 15;
            page.drawText(`Exercices créés : ${created_exercises.length}`, { x: 70, y, size: 11, font });
            y -= 40;

            if (matches.length > 0) {
                page.drawText('3. HISTORIQUE DES MATCHS CRÉÉS', { x: 50, y, size: 14, font: fontBold });
                y -= 25;
                
                page.drawText('Date', { x: 70, y, size: 10, font: fontBold });
                page.drawText('Type', { x: 170, y, size: 10, font: fontBold });
                page.drawText('Lieu', { x: 270, y, size: 10, font: fontBold });
                y -= 15;
                page.drawLine({ start: { x: 70, y }, end: { x: 520, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
                y -= 15;

                for (const match of matches.slice(0, 15)) {
                    if (y < 50) {
                         page = pdfDoc.addPage([595.28, 841.89]);
                         y = height - 50;
                    }
                    const matchDate = match.match_date ? new Date(match.match_date).toLocaleDateString('fr-FR') : 'N/A';
                    page.drawText(matchDate, { x: 70, y, size: 9, font });
                    page.drawText(match.match_type || 'Amical', { x: 170, y, size: 9, font });
                    const location = match.address ? (match.address.length > 30 ? match.address.substring(0, 27) + '...' : match.address) : 'N/A';
                    page.drawText(location, { x: 270, y, size: 9, font });
                    y -= 15;
                }
            }

            const pdfBytes = await pdfDoc.save();

            // RGPD audit: log data export
            try {
                await env.DB.prepare(
                    'INSERT INTO rgpd_audit_log (id, user_id, action, details) VALUES (?, ?, ?, ?)'
                ).bind(crypto.randomUUID(), user.id, 'export', 'PDF export').run();
            } catch { /* audit log should not block export */ }
            
            return new Response(pdfBytes, {
                status: 200,
                headers: {
                    ...router.corsHeaders,
                    "Content-Type": "application/pdf",
                    "Content-Disposition": 'attachment; filename="mes-donnees-kdufoot.pdf"',
                    "Content-Length": pdfBytes.length.toString()
                }
            });
        } catch (e: unknown) {
            console.error('Export PDF Error:', e);
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    }, Permission.READ_API);
};
