import type { ExecutionContext } from "@cloudflare/workers-types";
import { Router } from './router';
import { Env } from '../types/env';
import { ParticipationService } from '../services/participation.service';
import { MatchService } from '../services/match.service';
import { Permission } from '../types/permissions';
import { broadcastDataChanged, broadcastNotification } from '../utils/broadcast';
import { ContactMatchSchema } from '../utils/validation';
import { ContactMatchDto } from '../types/match';

export const setupParticipationRoutes = (router: Router, env: Env, ctx: ExecutionContext) => {
    const participationService = new ParticipationService(env.DB);
    const matchService = new MatchService(env.DB);

    router.get('/api/matches/requests', async (request, env) => {
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(request.user?.sub).first<{ id: string }>();
        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        const requests = await participationService.getIncomingRequests(dbUser.id);
        return Response.json({ success: true, requests }, { headers: router.corsHeaders });
    }, Permission.MATCHES_CREATE);

    router.get('/api/matches/participations', async (request, env) => {
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(request.user?.sub).first<{ id: string }>();
        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        const participations = await participationService.getMyParticipations(dbUser.id);
        return Response.json({ success: true, participations }, { headers: router.corsHeaders });
    }, Permission.MATCHES_CONTACT);

    router.post('/api/matches/<id>/contact', async (request, env, ctx) => {
        const params = request.params as { id: string };
        const body = await request.json();
        const validation = ContactMatchSchema.safeParse(body);
        if (!validation.success) {
            const errorMsg = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
            return Response.json({ success: false, error: `Données invalides : ${errorMsg}` }, { status: 400, headers: router.corsHeaders });
        }
    
        const dbUser = await env.DB.prepare('SELECT id, firstname, lastname, phone, license_id, category, level, stadium_address, home_jersey_color, away_jersey_color, location, club_id FROM users WHERE auth0_sub = ?').bind(request.user?.sub).first<any>();
        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        // Profile complete check
        const isComplete = dbUser.firstname && dbUser.lastname && dbUser.phone && dbUser.license_id && dbUser.category && dbUser.level && dbUser.stadium_address && dbUser.club_id;
        if (!isComplete) {
            const missing = [];
            if (!dbUser.firstname) missing.push('Prénom');
            if (!dbUser.lastname) missing.push('Nom');
            if (!dbUser.phone) missing.push('Téléphone');
            if (!dbUser.license_id) missing.push('Licence');
            if (!dbUser.category) missing.push('Catégorie');
            if (!dbUser.level) missing.push('Niveau');
            if (!dbUser.stadium_address) missing.push('Adresse stade');
            if (!dbUser.club_id) missing.push('Club principal');
            return Response.json({ success: false, error: `Profil incomplet : ${missing.join(', ')}` }, { status: 400, headers: router.corsHeaders });
        }

        try {
            const success = await participationService.contact(params.id, dbUser.id, validation.data as ContactMatchDto);
            if (success) {
                const match = await matchService.getById(params.id);
                const applicantClub = await env.DB.prepare('SELECT c.name FROM clubs c JOIN users u ON u.club_id = c.id WHERE u.id = ?').bind(dbUser.id).first<{ name: string }>();
                const owner = await env.DB.prepare('SELECT auth0_sub FROM users WHERE id = ?').bind(match?.owner_id).first<{ auth0_sub: string }>();

                if (owner && match) {
                    ctx.waitUntil(broadcastNotification(env, {
                        type: 'NOTIFICATION',
                        notificationType: 'NEW_APPLICANT',
                        message: `Nouvelle demande de ${applicantClub?.name || 'un club'} pour le ${match.match_date}`,
                        targetUserId: owner.auth0_sub,
                        data: { 
                            match_id: params.id, 
                            match_type: match.type, 
                            match_date: match.match_date, 
                            owner_id: match.owner_id, 
                            owner_sub: owner.auth0_sub,
                            user_id: dbUser.id, 
                            user_sub: request.user?.sub,
                            applicant_club_name: applicantClub?.name 
                        }
                    }));
                }
                ctx.waitUntil(broadcastDataChanged(env));
            }
            return Response.json({ success }, { headers: router.corsHeaders });
        } catch (_e: unknown) {
            return Response.json({ success: false, error: "Internal server error" }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.MATCHES_CONTACT);

    router.patch('/api/matches/<matchId>/requests/<userId>', async (request, env, ctx) => {
        const params = request.params as { matchId: string, userId: string };
        const body = await request.json() as { status: 'accepted' | 'refused' };
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(request.user?.sub).first<{ id: string }>();
        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        try {
            const success = await participationService.updateRequestStatus(params.matchId, params.userId, dbUser.id, body.status);
            if (success) {
                const match = await matchService.getById(params.matchId);
                const applicant = await env.DB.prepare('SELECT auth0_sub FROM users WHERE id = ?').bind(params.userId).first<{ auth0_sub: string }>();
                if (applicant && match) {
                    const owner = await env.DB.prepare('SELECT auth0_sub FROM users WHERE id = ?').bind(match.owner_id).first<{ auth0_sub: string }>();
                    ctx.waitUntil(broadcastNotification(env, {
                        type: 'NOTIFICATION',
                        notificationType: body.status === 'accepted' ? 'ENROLLMENT_ACCEPTED' : 'ENROLLMENT_REFUSED',
                        message: body.status === 'accepted' ? `Demande acceptée pour le ${match.match_date}` : `Demande refusée pour le ${match.match_date}`,
                        targetUserId: applicant.auth0_sub,
                        data: { 
                            match_id: params.matchId, 
                            match_type: match.type, 
                            match_date: match.match_date, 
                            owner_id: match.owner_id, 
                            owner_sub: owner?.auth0_sub,
                            user_id: params.userId, 
                            user_sub: applicant.auth0_sub,
                            host_club_name: match.club?.name 
                        }
                    }));
                }
                ctx.waitUntil(broadcastDataChanged(env));
            }
            return Response.json({ success }, { headers: router.corsHeaders });
        } catch (_e: unknown) {
            return Response.json({ success: false, error: "Internal server error" }, { status: 500, headers: router.corsHeaders });
        }
    }, Permission.MATCHES_CREATE);

    router.delete('/api/matches/<matchId>/requests/<userId>', async (request, env, ctx) => {
        const params = request.params as { matchId: string, userId: string };
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(request.user?.sub).first<{ id: string }>();
        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        const match = await env.DB.prepare('SELECT m.*, u.auth0_sub as owner_sub, c.name as host_club_name FROM matches m JOIN users u ON m.owner_id = u.id JOIN clubs c ON m.club_id = c.id WHERE m.id = ?').bind(params.matchId).first<any>();
        const targetUser = await env.DB.prepare('SELECT u.*, c.name as club_name FROM users u LEFT JOIN clubs c ON u.club_id = c.id WHERE u.id = ?').bind(params.userId).first<any>();
        
        if (match && targetUser) {
            const isWithdrawal = dbUser.id === params.userId;
            const isCancellation = dbUser.id === match.owner_id;

            if (isWithdrawal) {
                ctx.waitUntil(broadcastNotification(env, {
                    type: 'NOTIFICATION',
                    notificationType: 'TEAM_WITHDRAWAL',
                    message: `Désistement de ${targetUser.club_name || 'un club'} pour le ${match.match_date}`,
                    targetUserId: match.owner_sub,
                    data: { 
                        match_id: params.matchId, 
                        match_date: match.match_date, 
                        match_type: match.type,
                        applicant_club_name: targetUser.club_name,
                        owner_sub: match.owner_sub
                    }
                }));
            } else if (isCancellation) {
                ctx.waitUntil(broadcastNotification(env, {
                    type: 'NOTIFICATION',
                    notificationType: 'REQUEST_CANCELLED',
                    message: `Demande annulée par ${match.host_club_name || 'le club hôte'} pour le ${match.match_date}`,
                    targetUserId: targetUser.auth0_sub,
                    data: { 
                        match_id: params.matchId, 
                        match_date: match.match_date, 
                        match_type: match.type,
                        host_club_name: match.host_club_name,
                        user_sub: targetUser.auth0_sub
                    }
                }));
            }
        }

        const success = await participationService.deleteContact(params.matchId, params.userId, dbUser.id);
        ctx.waitUntil(broadcastDataChanged(env));
        return Response.json({ success }, { headers: router.corsHeaders });
    }, Permission.MATCHES_CONTACT);

    router.patch('/api/matches/<id>/notifications/read', async (request, env) => {
        const params = request.params as { id: string };
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(request.user?.sub).first<{ id: string }>();
        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        await participationService.markNotificationsAsRead(params.id, dbUser.id);
        return Response.json({ success: true }, { headers: router.corsHeaders });
    }, Permission.READ_API);

    router.get('/api/me/notifications/counts', async (request, env) => {
        const dbUser = await env.DB.prepare('SELECT id FROM users WHERE auth0_sub = ?').bind(request.user?.sub).first<{ id: string }>();
        if (!dbUser) return Response.json({ success: false, error: 'User not found' }, { status: 404, headers: router.corsHeaders });

        const counts = await participationService.getNotificationCounts(dbUser.id);
        return Response.json({ success: true, ...counts }, { headers: router.corsHeaders });
    }, Permission.READ_API);
};
