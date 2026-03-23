import type { ExecutionContext } from "@cloudflare/workers-types";
import { Router } from './router';
import { Env } from '../types/env';
import { TournamentService } from '../services/tournament.service';
import { Permission } from '../types/permissions';
import { broadcastDataChanged } from '../utils/broadcast';
import { UpdateScoreSchema } from '../utils/validation';

export const setupTournamentRoutes = (router: Router, env: Env, ctx: ExecutionContext) => {
    const tournamentService = new TournamentService(env.DB);

    /**
     * @openapi
     * /api/tournaments/{id}/pairings:
     *   get:
     *     tags: [Tournaments]
     *     summary: Get pairings for a tournament
     */
    router.get('/api/tournaments/<id>/pairings', async (request) => {
        const params = request.params as { id: string };
        const pairings = await tournamentService.getPairings(params.id);
        return Response.json({ success: true, pairings }, { headers: router.corsHeaders });
    });

    /**
     * @openapi
     * /api/tournaments/{id}/pairings/generate:
     *   post:
     *     tags: [Tournaments]
     *     summary: Generate pairings for a tournament
     */
    router.post('/api/tournaments/<id>/pairings/generate', async (request, env, ctx) => {
        const params = request.params as { id: string };
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(request.user?.sub).first<{ id: string }>();
        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        try {
            const pairings = await tournamentService.generatePairings(params.id, dbUser.id);
            ctx.waitUntil(broadcastDataChanged(env));
            return Response.json({ success: true, pairings }, { headers: router.corsHeaders });
        } catch (e: unknown) {
            return Response.json({ success: false, error: "Internal server error" }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.MATCHES_CREATE);

    /**
     * @openapi
     * /api/tournaments/pairings/{pairingId}/time:
     *   patch:
     *     tags: [Tournaments]
     *     summary: Update scheduled time for a pairing
     */
    router.patch('/api/tournaments/pairings/<pairingId>/time', async (request, env, ctx) => {
        const params = request.params as { pairingId: string };
        const body = await request.json() as { scheduled_time: string };
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(request.user?.sub).first<{ id: string }>();
        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        try {
            await tournamentService.updatePairingTime(params.pairingId, dbUser.id, body.scheduled_time);
            ctx.waitUntil(broadcastDataChanged(env));
            return Response.json({ success: true }, { headers: router.corsHeaders });
        } catch (e: unknown) {
            return Response.json({ success: false, error: "Internal server error" }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.MATCHES_CREATE);

     /**
     * @openapi
     * /api/matches/{id}/close-registrations:
     *   put:
     *     tags: [Tournaments]
     *     summary: Manually close tournament registrations
     */
    router.put('/api/matches/<id>/close-registrations', async (request, env, ctx) => {
        const params = request.params as { id: string };
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(request.user?.sub).first<{ id: string }>();
        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        try {
            const match = await tournamentService.closeRegistrations(params.id, dbUser.id);
            ctx.waitUntil(broadcastDataChanged(env));
            return Response.json({ success: true, match }, { headers: router.corsHeaders });
        } catch (e: unknown) {
            return Response.json({ success: false, error: "Internal server error" }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.MATCHES_CREATE);

    /**
     * @openapi
     * /api/matches/{id}/score:
     *   patch:
     *     tags: [Tournaments]
     *     summary: Update match/tournament score
     */
    router.patch('/api/matches/<id>/score', async (request, env, ctx) => {
        const params = request.params as { id: string };
        const validation = UpdateScoreSchema.safeParse(await request.json());
        if (!validation.success) return Response.json({ success: false, error: 'Invalid data' }, { status: 400, headers: router.corsHeaders });

        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(request.user?.sub).first<{ id: string }>();
        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        try {
            await tournamentService.updateScore(params.id, dbUser.id, validation.data.score_a, validation.data.score_b);
            ctx.waitUntil(broadcastDataChanged(env));
            return Response.json({ success: true }, { headers: router.corsHeaders });
        } catch (e: unknown) {
            return Response.json({ success: false, error: "Internal server error" }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.MATCHES_CREATE);
};
