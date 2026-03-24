
import { Router } from './router';
import { Env } from '../types/env';
import { ClubService } from '../services/club.service';

export const setupClubRoutes = (router: Router, env: Env) => {
    const clubService = new ClubService(env);

    /**
     * @openapi
     * /api/clubs/search:
     *   get:
     *     tags:
     *       - Clubs
     *     summary: Search for clubs by name
     *     description: >
     *       Searches the local database for football clubs matching the provided name query.
     *       This is typically used in autocomplete fields to help users find and link their club.
     *       Requires a query string of at least 3 characters to ensure relevance and performance.
     *     parameters:
     *       - name: q
     *         in: query
     *         required: true
     *         description: Search query for the club name (min 3 chars).
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: A list of clubs matching the search criteria.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success: { type: boolean }
     *                 clubs:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Club'
     *       400:
     *         description: Bad Request - The query is missing or too short.
     */
    router.get('/api/clubs/search', async (request: Request) => {
        const url = new URL(request.url); // Use the built-in URL class to parse the request URI
        const query = url.searchParams.get('q');

        if (!query || query.length < 3) {
            return Response.json({ success: false, error: 'Query too short' }, { status: 400, headers: router.corsHeaders });
        }

        const clubs = await clubService.searchClubs(query);
        const cacheHeaders = { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" };
        return Response.json({ success: true, clubs }, { headers: { ...router.corsHeaders, ...cacheHeaders } });
    });

    /**
     * @openapi
     * /api/clubs/by-city:
     *   get:
     *     tags:
     *       - Clubs
     *     summary: Retrieve clubs by city
     *     description: >
     *       Returns a list of clubs located in a specific city.
     *       Useful for regional filtering and helping users find clubs near their location.
     *     parameters:
     *       - name: city
     *         in: query
     *         required: true
     *         description: Name of the city to filter by.
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: A list of clubs found in the specified city.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success: { type: boolean }
     *                 clubs:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Club'
     *       400:
     *         description: Bad Request - The city parameter is missing.
     */
    router.get('/api/clubs/by-city', async (request: Request) => {
        const url = new URL(request.url);
        const city = url.searchParams.get('city');

        if (!city) {
            return Response.json({ success: false, error: 'City required' }, { status: 400, headers: router.corsHeaders });
        }

        const clubs = await clubService.getClubByCity(city);
        const cacheHeaders = { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" };
        return Response.json({ success: true, clubs }, { headers: { ...router.corsHeaders, ...cacheHeaders } });
    });
};
