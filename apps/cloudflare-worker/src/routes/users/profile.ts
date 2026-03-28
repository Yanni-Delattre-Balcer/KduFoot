/// <reference types="@cloudflare/workers-types" />
import { Router, AuthenticatedRequest } from '../router';
import { Env } from '../../types/env';
import { UserService } from '../../services/user.service';
import { UpdateUserDto } from '../../types/user';
import { Permission } from '../../types/permissions';
import { checkPermissions } from '../../auth0';
import { validateClubSiret } from '../../utils/siret.validator';
import { broadcastDataChanged } from '../../utils/broadcast';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { checkQuota, incrementUsage } from '../../middleware/quota';


export const setupProfileRoutes = (router: Router, env: Env) => {
    const userService = new UserService(env.DB);

    // ─── PDF Export Constants ────────────────────────────────────────────
    const PDF_PAGE_WIDTH = 595.28;   // A4 width in points
    const PDF_PAGE_HEIGHT = 841.89;  // A4 height in points
    const PDF_MARGIN_X = 50;
    const PDF_MARGIN_Y = 50;
    const PDF_INDENT_X = 70;
    const PDF_MAX_MATCHES = 30;
    const PDF_MAX_ADDRESS_LENGTH = 30;

    /**
     * GET /api/users/me
     */
    router.get('/api/users/me', async (request: AuthenticatedRequest, env: Env) => {
        const sub = request.user?.sub as string;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found in D1. Call sync first.' }, { status: 404, headers: router.corsHeaders });
        }

        let club = null;
        if (user.club_id) {
            club = await env.DB.prepare('SELECT id, siret, name, city, address, zip, latitude, longitude FROM clubs WHERE id = ?').bind(user.club_id).first();
        }

        let additional_clubs: import("../../types").Club[] = [];
        if (Array.isArray(user.additional_sirets) && user.additional_sirets.length > 0) {
            // Extract siret info from items
            const siretItems = user.additional_sirets.map((item: unknown) => {
                const itemObj = item as { siret?: string; stadium_address?: string };
                return {
                    siret: typeof item === 'string' ? item : (itemObj.siret || ''),
                    stadium_address: typeof item === 'object' && item !== null ? itemObj.stadium_address : undefined
                };
            });

            // Batch DB lookup: one query per siret using D1 batch
            const batchQueries = siretItems.map(s =>
                env.DB.prepare('SELECT id, siret, name, city, zip, address, latitude, longitude FROM clubs WHERE siret = ?').bind(s.siret)
            );
            const batchResults = await env.DB.batch(batchQueries);

            additional_clubs = await Promise.all(siretItems.map(async (item, idx) => {
                const dbClub = batchResults[idx].results[0] as { id: string, siret: string, name: string, city: string, zip: string, address: string, latitude: number, longitude: number } | undefined;
                if (dbClub) return { ...dbClub, siret: item.siret, stadium_address: item.stadium_address } as import("../../types").Club;

                try {
                    const SIRET_API_URL = env.SIRET_API_URL || 'https://recherche-entreprises.api.gouv.fr/search';
                    const r = await fetch(`${SIRET_API_URL}?q=${item.siret}&page=1&per_page=1`);
                    if (r.ok) {
                        const d = await r.json() as import("../../types").SiretApiResponse;
                        if (d.results && d.results.length > 0) {
                            const rData = d.results[0];
                            const newId = crypto.randomUUID();
                            const name = rData.nom_complet || item.siret;
                            const city = rData.siege?.libelle_commune || '';
                            const zip = rData.siege?.code_postal || '';
                            const address = rData.siege?.adresse || '';
                            const lat = rData.siege?.latitude ? parseFloat(rData.siege.latitude) : 0;
                            const lng = rData.siege?.longitude ? parseFloat(rData.siege.longitude) : 0;

                            await env.DB.prepare(
                                'INSERT INTO clubs (id, siret, name, city, address, zip, latitude, longitude, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())'
                            ).bind(newId, item.siret, name, city, address, zip, lat, lng).run();

                            return { id: newId, siret: item.siret, name, city, zip, address, latitude: lat, longitude: lng, stadium_address: item.stadium_address } as import("../../types").Club;
                        }
                    }
                } catch (_e) { console.warn('[Profile] SIRET API lookup failed for', item.siret, _e); }

                return { id: crypto.randomUUID(), siret: item.siret, name: item.siret, city: '', zip: '', address: '', latitude: 0, longitude: 0, stadium_address: item.stadium_address } as import("../../types").Club;
            }));
        }

        return Response.json({ success: true, user: { ...user, club, additional_clubs } }, { headers: { ...router.corsHeaders, "Cache-Control": "no-store, no-cache, must-revalidate" } });
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
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });
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

        // Handle additional clubs separately — batched DB lookup
        let additional_clubs: import("../../types").Club[] = [];
        if (Array.isArray(user.additional_sirets) && user.additional_sirets.length > 0) {
            const siretItems = user.additional_sirets.map((item: unknown) => {
                const itemObj = item as { siret?: string; stadium_address?: string };
                return {
                    siret: typeof item === 'string' ? item : (itemObj.siret || ''),
                    stadium_address: typeof item === 'object' && item !== null ? itemObj.stadium_address : undefined
                };
            });

            const batchQueries = siretItems.map(s =>
                env.DB.prepare('SELECT id, siret, name, city, zip, address, latitude, longitude FROM clubs WHERE siret = ?').bind(s.siret)
            );
            const batchResults = await env.DB.batch(batchQueries);

            additional_clubs = await Promise.all(siretItems.map(async (item, idx) => {
                const dbClub = batchResults[idx].results[0] as { id: string, siret: string, name: string, city: string, zip: string, address: string, latitude: number, longitude: number } | undefined;
                if (dbClub) return { ...dbClub, siret: item.siret, stadium_address: item.stadium_address } as import("../../types").Club;

                try {
                    const SIRET_API_URL = env.SIRET_API_URL || 'https://recherche-entreprises.api.gouv.fr/search';
                    const r = await fetch(`${SIRET_API_URL}?q=${item.siret}&page=1&per_page=1`);
                    if (r.ok) {
                        const d = await r.json() as import("../../types").SiretApiResponse;
                        if (d.results && d.results.length > 0) {
                            const rData = d.results[0];
                            const newId = crypto.randomUUID();
                            const name = rData.nom_complet || item.siret;
                            const city = rData.siege?.libelle_commune || '';
                            const zip = rData.siege?.code_postal || '';
                            const address = rData.siege?.adresse || '';
                            const lat = rData.siege?.latitude ? parseFloat(rData.siege.latitude) : 0;
                            const lng = rData.siege?.longitude ? parseFloat(rData.siege.longitude) : 0;

                            await env.DB.prepare(
                                'INSERT INTO clubs (id, siret, name, city, address, zip, latitude, longitude, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())'
                            ).bind(newId, item.siret, name, city, address, zip, lat, lng).run();

                            return { id: newId, siret: item.siret, name, city, zip, address, latitude: lat, longitude: lng, stadium_address: item.stadium_address } as import("../../types").Club;
                        }
                    }
                } catch (_e) { console.warn('[Context] SIRET API lookup failed for', item.siret, _e); }

                return { id: crypto.randomUUID(), siret: item.siret, name: item.siret, city: '', zip: '', address: '', latitude: 0, longitude: 0, stadium_address: item.stadium_address } as import("../../types").Club;
            }));
        }

        return Response.json({
            success: true,
            user: { ...user, club, additional_clubs },
            notifications
        }, { headers: { ...router.corsHeaders, "Cache-Control": "no-store, no-cache, must-revalidate" } });
    }, Permission.READ_API);

    /**
     * PUT /api/users/me
     */
    router.put('/api/users/me', async (request: AuthenticatedRequest, env: Env) => {
        const sub = request.user?.sub as string;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });
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
            return Response.json({ success: true, user: updated }, { headers: router.corsHeaders });
        } catch (_e: unknown) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
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
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });
        }

        if (user.club_id) {
            return Response.json({ success: false, error: 'Votre compte est déjà lié à un club. Cette action est irréversible.' }, { status: 400, headers: router.corsHeaders });
        }

        const body: { siret: string } = await request.json();
        if (!body.siret || (body.siret.length !== 9 && body.siret.length !== 14)) {
            return Response.json({ success: false, error: 'Numéro invalide. Il doit contenir 9 (SIREN) ou 14 (SIRET) chiffres.' }, { status: 400, headers: router.corsHeaders });
        }

        try {
            const apiUrl = `${env.SIRET_API_URL}?q=${body.siret}&page=1&per_page=1`;
            const apiRes = await fetch(apiUrl);
            if (!apiRes.ok) {
                return Response.json({ success: false, error: 'Erreur lors de la recherche de l\'entreprise.' }, { status: 502, headers: router.corsHeaders });
            }

            const apiData = await apiRes.json() as import("../../types").SiretApiResponse;
            if (!apiData.results || apiData.results.length === 0) {
                return Response.json({ success: false, error: 'Aucune entreprise trouvée pour ce SIRET.' }, { status: 404, headers: router.corsHeaders });
            }

            const entreprise = apiData.results[0];
            const siege = entreprise.siege || {};

            const clubName = entreprise.nom_complet || entreprise.nom_raison_sociale || 'Club inconnu';

            let isAdminUser = !!(env.SUPER_ADMIN_EMAIL && user.email === env.SUPER_ADMIN_EMAIL);
            if (!isAdminUser) {
                try {
                    const { access } = await checkPermissions(token, [Permission.ADMIN_AUTH0], env);
                    isAdminUser = access;
                } catch { /* not admin */ }
            }

            if (!isAdminUser) {
                const validation = validateClubSiret(entreprise.activite_principale, clubName);
                if (!validation.isValid) {
                    return Response.json({ success: false, error: validation.reason }, { status: 403, headers: router.corsHeaders });
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
            }, { headers: router.corsHeaders });
        } catch (e: unknown) {
            console.error('Link Club Error:', e);
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.READ_API);

    /**
     * POST /api/users/unlink-club
     */
    router.post('/api/users/unlink-club', async (request: AuthenticatedRequest, env: Env) => {
        const sub = request.user?.sub as string;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });
        }

        try {
            await env.DB.prepare(
                'UPDATE users SET club_id = NULL, siret = NULL, location = NULL, stadium_address = NULL WHERE id = ?'
            ).bind(user.id).run();

            await broadcastDataChanged(env);

            return Response.json({ success: true, message: 'Club détaché avec succès.' }, { headers: router.corsHeaders });
        } catch (_e: unknown) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.ADMIN_AUTH0);

    /**
     * DELETE /api/users/me
     */
    router.delete('/api/users/me', async (request: AuthenticatedRequest, env: Env) => {
        const sub = request.user?.sub as string;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });
        }

        try {
            await userService.deleteUser(user.id);

            // RGPD: Delete Auth0 account
            if (env.AUTH0_DOMAIN && env.AUTH0_MANAGEMENT_API_CLIENT_ID && env.AUTH0_MANAGEMENT_API_CLIENT_SECRET) {
                try {
                    const tokenRes = await fetch(`https://${env.AUTH0_DOMAIN}/oauth/token`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            grant_type: 'client_credentials',
                            client_id: env.AUTH0_MANAGEMENT_API_CLIENT_ID,
                            client_secret: env.AUTH0_MANAGEMENT_API_CLIENT_SECRET,
                            audience: `https://${env.AUTH0_DOMAIN}/api/v2/`
                        })
                    });
                    if (tokenRes.ok) {
                        const { access_token } = await tokenRes.json() as { access_token: string };
                        await fetch(`https://${env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(sub)}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${access_token}` }
                        });
                    }
                } catch { /* Auth0 deletion should not block D1 deletion */ }
            }

            // RGPD audit: log account deletion
            try {
                await env.DB.prepare(
                    'INSERT INTO rgpd_audit_log (id, user_id, action, details) VALUES (?, ?, ?, ?)'
                ).bind(crypto.randomUUID(), user.id, 'delete', 'Account self-deletion').run();
            } catch { /* audit log should not block deletion */ }

            return Response.json({ success: true, message: 'Account deleted' }, { headers: router.corsHeaders });
        } catch (_e: unknown) {
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.READ_API);

    /**
     * GET /api/users/me/calendar-link
     */
    router.get('/api/users/me/calendar-link', async (request: AuthenticatedRequest, env: Env) => {
        const sub = request.user?.sub as string;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });
        }

        const token = await userService.getOrCreateCalendarToken(user.id);
        const url = new URL(request.url);
        const webcalUrl = `webcal://${url.host}/api/calendar/${token}.ics`;

        // Rotate calendar token if older than 90 days
        if (user.last_calendar_sync_at) {
            const lastSync = new Date(user.last_calendar_sync_at * 1000);
            const daysSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceSync > 90) {
                await userService.regenerateCalendarToken(user.id);
                const newToken = await userService.getOrCreateCalendarToken(user.id);
                const webcalUrl2 = `webcal://${url.host}/api/calendar/${newToken}.ics`;
                return Response.json({ success: true, url: webcalUrl2 }, { headers: router.corsHeaders });
            }
        }

        return Response.json({ success: true, url: webcalUrl }, { headers: router.corsHeaders });
    }, Permission.READ_API);

    /**
     * GET /api/me/export
     */
    router.get('/api/me/export', async (request: AuthenticatedRequest, env: Env) => {
        const sub = request.user?.sub as string;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });
        }

        // FAANG standard: Quota check BEFORE expensive compute
        const quotaError = await checkQuota('pdf_export', 1)(request, env);
        if (quotaError) return quotaError;

        try {
            const data = await userService.exportUserData(user.id);
            const exportData = data as Record<string, unknown>;
            
            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            
            let page = pdfDoc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
            const { height } = page.getSize();
            let y = height - PDF_MARGIN_Y;

            page.drawText('KduFoot - Export de Données (RGPD)', { x: PDF_MARGIN_X, y, size: 20, font: fontBold, color: rgb(0, 0, 0.5) });
            y -= 30;
            page.drawText(`Date d'export : ${new Date().toLocaleString('fr-FR')}`, { x: PDF_MARGIN_X, y, size: 10, font });
            y -= 40;

            const profile = (exportData.profile || {}) as Record<string, unknown>;
            page.drawText('1. PROFIL UTILISATEUR', { x: PDF_MARGIN_X, y, size: 14, font: fontBold });
            y -= 25;
            page.drawText(`Nom : ${profile.lastname || 'Non spécifié'}`, { x: PDF_INDENT_X, y, size: 11, font });
            y -= 15;
            page.drawText(`Prénom : ${profile.firstname || 'Non spécifié'}`, { x: PDF_INDENT_X, y, size: 11, font });
            y -= 15;
            page.drawText(`Email : ${profile.email || 'N/A'}`, { x: PDF_INDENT_X, y, size: 11, font });
            y -= 15;
            page.drawText(`Licence : ${profile.license_id || 'Non spécifiée'}`, { x: PDF_INDENT_X, y, size: 11, font });
            y -= 15;
            page.drawText(`Club : ${profile.siret || 'Aucun club lié'}`, { x: PDF_INDENT_X, y, size: 11, font });
            y -= 40;

            interface ExportMatch {
                match_date?: string;
                match_type?: string;
                address?: string;
            }
            const matches = (exportData.matches || []) as ExportMatch[];
            const match_applications = (exportData.match_applications || []) as Record<string, unknown>[];
            const training_sessions = (exportData.training_sessions || []) as Record<string, unknown>[];
            const created_exercises = (exportData.created_exercises || []) as Record<string, unknown>[];

            page.drawText('2. RÉSUMÉ D\'ACTIVITÉ', { x: PDF_MARGIN_X, y, size: 14, font: fontBold });
            y -= 25;
            page.drawText(`Matchs créés : ${matches.length}`, { x: PDF_INDENT_X, y, size: 11, font });
            y -= 15;
            page.drawText(`Participations : ${match_applications.length}`, { x: PDF_INDENT_X, y, size: 11, font });
            y -= 15;
            page.drawText(`Séances d'entraînement : ${training_sessions.length}`, { x: PDF_INDENT_X, y, size: 11, font });
            y -= 15;
            page.drawText(`Exercices créés : ${created_exercises.length}`, { x: PDF_INDENT_X, y, size: 11, font });
            y -= 40;

            if (matches.length > 0) {
                page.drawText('3. HISTORIQUE DES MATCHS CRÉÉS', { x: PDF_MARGIN_X, y, size: 14, font: fontBold });
                y -= 25;
                
                page.drawText('Date', { x: PDF_INDENT_X, y, size: 10, font: fontBold });
                page.drawText('Type', { x: 170, y, size: 10, font: fontBold });
                page.drawText('Lieu', { x: 270, y, size: 10, font: fontBold });
                y -= 15;
                page.drawLine({ start: { x: PDF_INDENT_X, y }, end: { x: 520, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
                y -= 15;

                for (const match of matches.slice(0, PDF_MAX_MATCHES)) {
                    if (y < PDF_MARGIN_Y) {
                         page = pdfDoc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
                         y = height - PDF_MARGIN_Y;
                    }
                    const matchDate = match.match_date ? new Date(match.match_date).toLocaleDateString('fr-FR') : 'N/A';
                    page.drawText(matchDate, { x: PDF_INDENT_X, y, size: 9, font });
                    page.drawText(match.match_type || 'Amical', { x: 170, y, size: 9, font });
                    const location = match.address
                        ? (match.address.length > PDF_MAX_ADDRESS_LENGTH ? match.address.substring(0, PDF_MAX_ADDRESS_LENGTH - 3) + '...' : match.address)
                        : 'N/A';
                    page.drawText(location, { x: 270, y, size: 9, font });
                    y -= 15;
                }
            }

            const pdfBytes = await pdfDoc.save();

            // Track usage after successful generation
            await incrementUsage(env.DB, user.id, 'pdf_export');

            // RGPD audit: log data export
            try {
                const ip = request.headers.get('cf-connecting-ip') || '127.0.0.1';
                await env.DB.prepare(
                    'INSERT INTO rgpd_audit_log (id, user_id, action, details, performed_at, ip_address) VALUES (?, ?, ?, ?, unixepoch(), ?)'
                ).bind(crypto.randomUUID(), user.id, 'export', 'PDF export', ip).run();
            } catch (auditError) { 
                console.warn('[Export PDF] Audit log failed:', auditError);
            }
            
            return new Response(pdfBytes.buffer as ArrayBuffer, {
                status: 200,
                headers: {
                    ...router.corsHeaders,
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="mes-donnees-kdufoot.pdf"`,
                    "Content-Length": pdfBytes.byteLength.toString(),
                    "Cache-Control": "no-store",
                }
            });
        } catch (e: unknown) {
            console.error('[Export PDF] Critical Error:', e);
            const errorMessage = e instanceof Error ? e.stack || e.message : 'Unknown error during PDF generation';
            return Response.json({ 
                success: false, 
                error: `Erreur Serveur: ${e instanceof Error ? e.message : 'Génération PDF échouée'}`,
                debug: e instanceof Error ? errorMessage : undefined 
            }, { 
                status: 500, 
                headers: router.corsHeaders 
            });
        }
    }, Permission.READ_API);

    /**
     * GET /api/me/export/json — RGPD portability: JSON export
     */
    router.get('/api/me/export/json', async (request: AuthenticatedRequest, env: Env) => {
        const sub = request.user?.sub as string;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });
        }

        try {
            const data = await userService.exportUserData(user.id);

            // RGPD audit: log data export
            try {
                await env.DB.prepare(
                    'INSERT INTO rgpd_audit_log (id, user_id, action, details) VALUES (?, ?, ?, ?)'
                ).bind(crypto.randomUUID(), user.id, 'export', 'JSON export (portability)').run();
            } catch { /* audit log should not block export */ }

            const jsonStr = JSON.stringify(data, null, 2);
            return new Response(jsonStr, {
                status: 200,
                headers: {
                    ...router.corsHeaders,
                    "Content-Type": "application/json; charset=utf-8",
                    "Content-Disposition": 'attachment; filename="mes-donnees-kdufoot.json"',
                }
            });
        } catch (e: unknown) {
            console.error('Export JSON Error:', e);
            return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.READ_API);
};
