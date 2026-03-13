
import { Router } from './router';
import { Env } from '../types/env';
import { UserService } from '../services/user.service';
import { CreateUserDto, UpdateUserDto } from '../types/user';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';
import { validateClubSiret } from '../utils/siret.validator';
import { broadcastDataChanged } from '../utils/broadcast';

export const setupUserRoutes = (router: Router, env: Env) => {
    const userService = new UserService(env.DB);

    /**
     * @openapi
     * /api/users/sync:
     *   post:
     *     tags:
     *       - User Management
     *     summary: Synchronize Auth0 profile with the local database
     *     description: >
     *       Synchronizes user information from an Auth0 identification token into the local KduFoot database (Cloudflare D1).
     *       This ensures that subsequent operations (like creating exercises) can correctly reference the local user ID.
     *       It should be called at every login to keep the local profile (name, picture, email) up to date.
     *       Requires a valid JWT.
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       description: User profile data from Auth0.
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - sub
     *               - email
     *             properties:
     *               sub: { type: string, description: "The Auth0 unique subject identifier." }
     *               email: { type: string, description: "User's email address." }
     *               given_name: { type: string, description: "User's first name." }
     *               family_name: { type: string, description: "User's last name." }
     *               picture: { type: string, description: "URL to the user's profile picture." }
     *     responses:
     *       200:
     *         description: User profile successfully synchronized.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success: { type: boolean }
     *                 user: { $ref: '#/components/schemas/User' }
     *       400:
     *         description: Bad Request - Missing mandatory user data (sub or email).
     *       401:
     *         description: Unauthorized - Invalid or missing JWT.
     *       500:
     *         description: Internal Server Error - Failed to update the database.
     */
    router.post('/api/users/sync', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 401, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const body: any = await request.json();

        if (!body.sub || !body.email) {
            return Response.json({ success: false, error: 'Missing user data' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const dto: CreateUserDto = {
            auth0_sub: body.sub,
            email: body.email,
            firstname: body.given_name || body.name || 'User',
            lastname: body.family_name || '',
            picture: body.picture
        };

        try {
            const user = await userService.createOrUpdateUser(dto);
            return Response.json({ success: true, user }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            console.error('User Sync Error:', e);
            return Response.json({ success: false, error: e.message }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * @openapi
     * /api/users/me:
     *   get:
     *     tags:
     *       - User Management
     *     summary: Retrieve the current user's profile
     *     description: >
     *       Fetches the complete profile and club association for the currently authenticated user.
     *       The user is identified via the 'sub' claim in the provided JWT.
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: The user's detailed profile, including associated club info if linked.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success: { type: boolean }
     *                 user: { $ref: '#/components/schemas/User' }
     *       404:
     *         description: Not Found - User record not found in the local database. User sync may be required.
     *       401:
     *         description: Unauthorized - Invalid or missing JWT.
     */
    router.get('/api/users/me', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 401, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const sub = payload.sub;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found in D1. Call sync first.' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        let club = null;
        if (user.club_id) {
            club = await env.DB.prepare('SELECT id, siret, name, city, address, zip, latitude, longitude FROM clubs WHERE id = ?').bind(user.club_id).first();
        }

        let additional_clubs: any[] = [];
        if (Array.isArray(user.additional_sirets) && user.additional_sirets.length > 0) {
            additional_clubs = await Promise.all(user.additional_sirets.map(async (item: any) => {
                const siret = typeof item === 'string' ? item : item.siret;
                const stadium_address = typeof item === 'object' ? item.stadium_address : null;

                const dbClub = await env.DB.prepare('SELECT id, name, city, zip, address, latitude, longitude FROM clubs WHERE siret = ?').bind(siret).first<{ id: string, name: string, city: string, zip: string, address: string, latitude: number, longitude: number }>();
                if (dbClub) return { id: dbClub.id, siret, name: dbClub.name, city: dbClub.city, zip: dbClub.zip, address: dbClub.address, latitude: dbClub.latitude, longitude: dbClub.longitude, stadium_address };

                try {
                    const SIRET_API_URL = env.SIRET_API_URL || 'https://recherche-entreprises.api.gouv.fr/search';
                    const r = await fetch(`${SIRET_API_URL}?q=${siret}&page=1&per_page=1`);
                    if (r.ok) {
                        const d: any = await r.json();
                        if (d.results && d.results.length > 0) {
                            const rData = d.results[0];
                            const newId = crypto.randomUUID();
                            const name = rData.nom_complet || siret;
                            const city = rData.siege?.libelle_commune || '';
                            const zip = rData.siege?.code_postal || '';
                            const address = rData.siege?.adresse || '';
                            const lat = rData.siege?.latitude ? parseFloat(rData.siege.latitude) : null;
                            const lng = rData.siege?.longitude ? parseFloat(rData.siege.longitude) : null;

                            await env.DB.prepare(
                                'INSERT INTO clubs (id, siret, name, city, address, zip, latitude, longitude, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())'
                            ).bind(newId, siret, name, city, address, zip, lat, lng).run();

                            return { id: newId, siret, name, city, zip, address, latitude: lat, longitude: lng, stadium_address };
                        }
                    }
                } catch (e) { }

                return { id: siret, siret, name: siret, stadium_address }; // Fallback to siret as ID if API fails
            }));
        }

        return Response.json({ success: true, user: { ...user, club, additional_clubs } }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    });

    /**
     * @openapi
     * /api/me/context:
     *   get:
     *     tags:
     *       - User Management
     *     summary: Retrieve complete user context (Profile + Notifications)
     *     description: >
     *       Aggregates user profile, club association, and notification counts in a single "one-shot" request.
     *       Designed to minimize KV reads and API calls during initial application load.
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Complete user context.
     *       404:
     *         description: User not found.
     */
    router.get('/api/me/context', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 401, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const sub = payload.sub;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        let club = null;
        if (user.club_id) {
            club = await env.DB.prepare('SELECT id, siret, name, city, address, zip, latitude, longitude FROM clubs WHERE id = ?').bind(user.club_id).first();
        }

        let additional_clubs: any[] = [];
        if (Array.isArray(user.additional_sirets) && user.additional_sirets.length > 0) {
            additional_clubs = await Promise.all(user.additional_sirets.map(async (item: any) => {
                const siret = typeof item === 'string' ? item : item.siret;
                const stadium_address = typeof item === 'object' ? item.stadium_address : null;

                const dbClub = await env.DB.prepare('SELECT id, name, city, zip, address, latitude, longitude FROM clubs WHERE siret = ?').bind(siret).first<{ id: string, name: string, city: string, zip: string, address: string, latitude: number, longitude: number }>();
                if (dbClub) return { id: dbClub.id, siret, name: dbClub.name, city: dbClub.city, zip: dbClub.zip, address: dbClub.address, latitude: dbClub.latitude, longitude: dbClub.longitude, stadium_address };

                try {
                    const SIRET_API_URL = env.SIRET_API_URL || 'https://recherche-entreprises.api.gouv.fr/search';
                    const r = await fetch(`${SIRET_API_URL}?q=${siret}&page=1&per_page=1`);
                    if (r.ok) {
                        const d: any = await r.json();
                        if (d.results && d.results.length > 0) {
                            const rData = d.results[0];
                            const newId = crypto.randomUUID();
                            const name = rData.nom_complet || siret;
                            const city = rData.siege?.libelle_commune || '';
                            const zip = rData.siege?.code_postal || '';
                            const address = rData.siege?.adresse || '';
                            const lat = rData.siege?.latitude ? parseFloat(rData.siege.latitude) : null;
                            const lng = rData.siege?.longitude ? parseFloat(rData.siege.longitude) : null;

                            await env.DB.prepare(
                                'INSERT INTO clubs (id, siret, name, city, address, zip, latitude, longitude, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())'
                            ).bind(newId, siret, name, city, address, zip, lat, lng).run();

                            return { id: newId, siret, name, city, zip, address, latitude: lat, longitude: lng, stadium_address };
                        }
                    }
                } catch (e) { }

                return { id: siret, siret, name: siret, stadium_address }; // Fallback to siret as ID if API fails
            }));
        }

        const { MatchService } = await import('../services/match.service');
        const matchService = new MatchService(env.DB);
        const notifications = await matchService.getNotificationCounts(user.id);

        return Response.json({
            success: true,
            user: { ...user, club, additional_clubs },
            notifications
        }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    });

    /**
     * @openapi
     * /api/users/me:
     *   put:
     *     tags:
     *       - User Management
     *     summary: Update the current user's profile
     *     description: >
     *       Updates mutable fields of the current user's profile (e.g., location, stadium address).
     *       Administrative fields like subscription and club association are protected and cannot be modified here.
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       description: Fields to update in the user's profile.
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/User'
     *     responses:
     *       200:
     *         description: Successful update. Returns the updated user record.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success: { type: boolean }
     *                 user: { $ref: '#/components/schemas/User' }
     *       401:
     *         description: Unauthorized - Access denied.
     *       404:
     *         description: Not Found - User record not found.
     *       500:
     *         description: Internal Server Error - Database update failed.
     */
    router.put('/api/users/me', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 401, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const sub = payload.sub;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const body: UpdateUserDto = await request.json();

        // Safety: regular users cannot change their subscription or admin counters
        delete body.subscription;
        delete (body as any).block_count;
        delete (body as any).siret_change_count;

        try {
            const updated = await userService.updateUser(user.id, body);
            return Response.json({ success: true, user: updated }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * @openapi
     * /api/users/link-club:
     *   post:
     *     tags:
     *       - User Management
     *     summary: Link the current user to a football club via SIRET
     *     description: >
     *       Links the current user's profile to a club identified by a 14-digit SIRET number.
     *       It fetches official club information (name, address, coordinates) from an external French government API.
     *       If the club does not exist locally, it is created.
     *       **Note:** This action is irreversible for the user.
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [siret]
     *             properties:
     *               siret: { type: string, description: "9-digit SIREN or 14-digit SIRET number." }
     *     responses:
     *       200:
     *         description: Successfully linked. Returns the updated user and club details.
     *       400:
     *         description: Bad Request - Missing SIRET or user already linked.
     *       404:
     *         description: Not Found - No business found for the provided SIRET.
     *       502:
     *         description: Bad Gateway - Failed to retrieve data from the SIRET API.
     */
    router.post('/api/users/link-club', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 401, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const sub = payload.sub;

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

            const apiData: any = await apiRes.json();
            if (!apiData.results || apiData.results.length === 0) {
                return Response.json({ success: false, error: 'Aucune entreprise trouvée pour ce SIRET.' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
            }

            const entreprise = apiData.results[0];
            const siege = entreprise.siege || {};

            const clubName = entreprise.nom_complet || entreprise.nom_raison_sociale || 'Club inconnu';

            // SECURITY: SIRET Filtering (Strict Additions)
            const validation = validateClubSiret(entreprise.activite_principale, clubName);
            if (!validation.isValid) {
                return Response.json({ success: false, error: validation.reason }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
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
        } catch (e: any) {
            console.error('Link Club Error:', e);
            return Response.json({ success: false, error: e.message }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * @openapi
     * /api/users/unlink-club:
     *   post:
     *     tags:
     *       - Administrative Actions
     *     summary: Unlink a user from their club (Admin only)
     *     description: >
     *       Administrative endpoint to reset a user's club association.
     *       Currently restricted to a specific administrator email for testing and support purposes.
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Successfully unlinked.
     *       403:
     *         description: Forbidden - Lacks administrative privileges.
     */
    router.post('/api/users/unlink-club', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 401, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const sub = payload.sub;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        if (user.email !== 'yannidelattrebalcer.artois@gmail.com') {
            return Response.json({ success: false, error: 'Seul l\'administrateur peut effectuer cette action.' }, { status: 403, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            await env.DB.prepare(
                'UPDATE users SET club_id = NULL, siret = NULL, location = NULL, stadium_address = NULL WHERE id = ?'
            ).bind(user.id).run();

            await broadcastDataChanged(env);

            return Response.json({ success: true, message: 'Club détaché avec succès.' }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * @openapi
     * /api/users/me:
     *   delete:
     *     tags:
     *       - User Management
     *     summary: Delete the current user's account
     *     description: >
     *       Permanently deletes the current user's record from the database.
     *       Associated matches and tournament data created by this user will be deleted via cascade.
     *       Authentication is required.
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Account successfully deleted.
     *       401:
     *         description: Unauthorized.
     *       404:
     *         description: User not found.
     *       500:
     *         description: Internal error during deletion.
     */
    router.delete('/api/users/me', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: permissionCheck.statusCode || 401, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const sub = payload.sub;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            await userService.deleteUser(user.id);
            return Response.json({ success: true, message: 'Account deleted' }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });

    /**
     * GET /api/users/me/calendar-link
     * Returns the webcal sync URL for the user.
     */
    router.get('/api/users/me/calendar-link', async (request, env) => {
        const payload = (request as any).user;
        const sub = payload.sub;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const token = await userService.getOrCreateCalendarToken(user.id);
        const url = new URL(request.url);
        const webcalUrl = `webcal://${url.host}/api/calendar/${token}.ics`;

        return Response.json({ success: true, url: webcalUrl }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    }, Permission.READ_API);
};
