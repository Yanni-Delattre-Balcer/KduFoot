
import { Router } from './router';
import { Env } from '../types/env';
import { UserService } from '../services/user.service';
import { CreateUserDto, UpdateUserDto } from '../types/user';
import { Permission } from '../types/permissions';
import { checkPermission } from '../middleware/permissions.middleware';

export const setupUserRoutes = (router: Router, env: Env) => {
    const userService = new UserService(env.DB);

    // Sync user from Auth0 (called after login)
    // Public or semi-public? Usually authenticated with the token.
    // We accept the token and use the payload to create/sync the user.
    router.post('/api/users/sync', async (request: Request) => {
        // We expect the standard Auth0 token check to have happened via router or middleware if we used it.
        // Here we can re-verify or trust the router if configured.
        // The Router in router.ts handles auth if permission is passed, but here we want to allow any authenticated user to sync.
        // Let's check for a basic "read:api" or just existence of a valid token.

        // Manually checking auth because 'sync' might not map nicely to a specific permission other than "being logged in".
        // Or we use READ_API as a baseline.
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 401 });
        }

        // Get user info from request body or token?
        // Usually the client sends the user info from Auth0 (idToken payload) in the body
        // because the access token might not have profile info (email, name).
        const body: any = await request.json();

        if (!body.sub || !body.email) {
            return Response.json({ success: false, error: 'Missing user data' }, { status: 400 });
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
            return Response.json({ success: true, user });
        } catch (e: any) {
            console.error('User Sync Error:', e);
            return Response.json({ success: false, error: e.message }, { status: 500 });
        }
    });

    // Get current user profile
    router.get('/api/users/me', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 401 });
        }

        // Extract sub from token
        // The middleware checkPermission verified the token but didn't return the payload in a way accessing it here is clean 
        // without re-decoding.
        // However, router.ts attaches payload to 'this.jwtPayload' if used via route.permission.
        // Since we called checkPermission manually, we have to handle it.
        // Ideally update checkPermission to return payload too, which I did in the previous step!

        // Better yet, let's use the router's permission/middleware mechanism if possible, 
        // OR just decode it here again (lightweight).
        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const sub = payload.sub;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found in D1. Call sync first.' }, { status: 404 });
        }

        // Join club data if user has a club
        let club = null;
        if (user.club_id) {
            club = await env.DB.prepare('SELECT id, siret, name, city, address, zip, latitude, longitude FROM clubs WHERE id = ?').bind(user.club_id).first();
        }

        return Response.json({ success: true, user: { ...user, club } });
    });

    // Update current user profile
    router.put('/api/users/me', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.WRITE_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 401 });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const sub = payload.sub;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const body: UpdateUserDto = await request.json();

        // Security: Validate what can be updated
        // Prevent updating subscription directly via API (should handle via payment hooks)
        delete body.subscription;

        try {
            const updated = await userService.updateUser(user.id, body);
            return Response.json({ success: true, user: updated });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500 });
        }
    });

    // Link club to user via SIRET (IRREVERSIBLE)
    router.post('/api/users/link-club', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 401 });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const sub = payload.sub;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // Check if user already has a club (irreversible)
        if (user.club_id) {
            return Response.json({ success: false, error: 'Votre compte est déjà lié à un club. Cette action est irréversible.' }, { status: 400 });
        }

        const body: { siret: string } = await request.json();
        if (!body.siret || body.siret.length !== 14) {
            return Response.json({ success: false, error: 'SIRET invalide. Il doit contenir 14 chiffres.' }, { status: 400 });
        }

        try {
            // Fetch club info from Government API
            const apiUrl = `${env.SIRET_API_URL}?q=${body.siret}&page=1&per_page=1`;
            const apiRes = await fetch(apiUrl);
            if (!apiRes.ok) {
                return Response.json({ success: false, error: 'Erreur lors de la recherche de l\'entreprise.' }, { status: 502 });
            }

            const apiData: any = await apiRes.json();
            if (!apiData.results || apiData.results.length === 0) {
                return Response.json({ success: false, error: 'Aucune entreprise trouvée pour ce SIRET.' }, { status: 404 });
            }

            const entreprise = apiData.results[0];
            const siege = entreprise.siege || {};

            const clubName = entreprise.nom_complet || entreprise.nom_raison_sociale || 'Club inconnu';
            const clubAddress = siege.adresse || '';
            const clubCity = siege.libelle_commune || siege.commune || '';
            const clubZip = siege.code_postal || '';
            const lat = siege.latitude ? parseFloat(siege.latitude) : null;
            const lon = siege.longitude ? parseFloat(siege.longitude) : null;

            // Upsert club in DB
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

            // Link user to club
            const updatedUser = await userService.updateUser(user.id, {
                club_id: clubId,
                siret: body.siret,
                location: clubCity,
                stadium_address: clubAddress,
            });

            // Return user with club info
            return Response.json({
                success: true,
                user: {
                    ...updatedUser,
                    club: { id: clubId, siret: body.siret, name: clubName, city: clubCity, address: clubAddress, zip: clubZip, latitude: lat, longitude: lon }
                }
            });
        } catch (e: any) {
            console.error('Link Club Error:', e);
            return Response.json({ success: false, error: e.message }, { status: 500 });
        }
    });

    // Admin-only: Unlink club (for testing — restricted to admin email)
    router.post('/api/users/unlink-club', async (request: Request) => {
        const permissionCheck = await checkPermission(request, env, Permission.READ_API);
        if (!permissionCheck.hasPermission) {
            return Response.json({ success: false, error: permissionCheck.reason }, { status: 401 });
        }

        const authHeader = request.headers.get('Authorization')!;
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const sub = payload.sub;

        const user = await userService.getUserByAuth0Sub(sub);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // Only allow admin email
        if (user.email !== 'yannidelattrebalcer.artois@gmail.com') {
            return Response.json({ success: false, error: 'Seul l\'administrateur peut effectuer cette action.' }, { status: 403 });
        }

        try {
            await env.DB.prepare(
                'UPDATE users SET club_id = NULL, siret = NULL, location = NULL, stadium_address = NULL WHERE id = ?'
            ).bind(user.id).run();

            return Response.json({ success: true, message: 'Club détaché avec succès.' });
        } catch (e: any) {
            return Response.json({ success: false, error: e.message }, { status: 500 });
        }
    });
};
