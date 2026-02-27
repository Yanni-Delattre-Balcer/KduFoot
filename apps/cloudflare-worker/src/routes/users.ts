
import { Router } from './router';
import { Env } from '../types/env';
import { UserService } from '../services/user.service';
import { CreateUserDto, UpdateUserDto } from '../types/user';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';

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
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 401, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
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
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 401, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
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

        return Response.json({ success: true, user: { ...user, club } }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
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
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 401, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
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
        delete body.subscription;

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
     *               siret: { type: string, minLength: 14, maxLength: 14, description: "14-digit SIRET number." }
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
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 401, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
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
        if (!body.siret || body.siret.length !== 14) {
            return Response.json({ success: false, error: 'SIRET invalide. Il doit contenir 14 chiffres.' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
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
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 401, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
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

            return Response.json({ success: true, message: 'Club détaché avec succès.' }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }
    });
};
