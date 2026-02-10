
import { Router } from './router';
import { Env } from '../types/env';
import { ClubService } from '../services/club.service';

export const setupClubRoutes = (router: Router, env: Env) => {
    const clubService = new ClubService(env);

    // Search clubs (Public or Authenticated?)
    // Let's make it public for registration flow, or maybe require basic token?
    // User registration needs it.
    router.get('/api/clubs/search', async (request: Request) => {
        const url = new URL(request.url);
        const query = url.searchParams.get('q');

        if (!query || query.length < 3) {
            return Response.json({ success: false, error: 'Query too short' }, { status: 400 });
        }

        const clubs = await clubService.searchClubs(query);
        return Response.json({ success: true, clubs });
    });

    router.get('/api/clubs/by-city', async (request: Request) => {
        const url = new URL(request.url);
        const city = url.searchParams.get('city');

        if (!city) {
            return Response.json({ success: false, error: 'City required' }, { status: 400 });
        }

        const clubs = await clubService.getClubByCity(city);
        return Response.json({ success: true, clubs });
    });
};
