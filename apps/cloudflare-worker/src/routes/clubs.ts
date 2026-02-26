
import { Router } from './router';
import { Env } from '../types/env';
import { ClubService } from '../services/club.service';

export const setupClubRoutes = (router: Router, env: Env) => {
    const clubService = new ClubService(env);

    /**
     * GET /api/clubs/search
     * 
     * Allows searching for clubs by name. We check if the query is long enough
     * to avoid returning too many irrelevant results and to save resources.
     */
    router.get('/api/clubs/search', async (request: Request) => {
        const url = new URL(request.url); // Use the built-in URL class to parse the request URI
        const query = url.searchParams.get('q');

        if (!query || query.length < 3) {
            return Response.json({ success: false, error: 'Query too short' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const clubs = await clubService.searchClubs(query);
        return Response.json({ success: true, clubs }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    });

    router.get('/api/clubs/by-city', async (request: Request) => {
        const url = new URL(request.url);
        const city = url.searchParams.get('city');

        if (!city) {
            return Response.json({ success: false, error: 'City required' }, { status: 400, headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
        }

        const clubs = await clubService.getClubByCity(city);
        return Response.json({ success: true, clubs }, { headers: { ...router.corsHeaders, "Content-Type": "application/json" } });
    });
};
