import { D1Database } from '@cloudflare/workers-types';
import { ContactMatchDto, ParticipationRequest } from '../types/match';
import { MatchService } from './match.service';

export class ParticipationService {
    private baseMatchService: MatchService;

    constructor(private db: D1Database) {
        this.baseMatchService = new MatchService(db);
    }

    async contact(matchId: string, userId: string, dto: ContactMatchDto): Promise<boolean> {
        const match = await this.baseMatchService.getById(matchId);
        if (!match || match.status !== 'active') throw new Error('Match not available');
        if (match.owner_id === userId) throw new Error('Cannot contact own match');

        try {
            await this.db.prepare(
                'INSERT INTO match_contacts (match_id, user_id, message, contacted_at, status) VALUES (?, ?, ?, ?, ?)'
            ).bind(matchId, userId, dto.message, Math.floor(Date.now() / 1000), 'pending').run();
            return true;
        } catch (e: unknown) {
            if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) return true;
            throw e;
        }
    }

    async getIncomingRequests(userId: string): Promise<ParticipationRequest[]> {
        const { results } = await this.db.prepare(`
            SELECT mc.*, mc.user_id as requester_user_id,
                   m.type as match_type, m.category, m.level, m.match_date, m.match_time, m.venue, m.max_teams as match_max_teams,
                   (SELECT COUNT(*) FROM match_contacts mc2 WHERE mc2.match_id = m.id AND mc2.status = 'accepted') as accepted_count,
                   u_req.firstname as requester_firstname, u_req.lastname as requester_lastname,
                   u_req.category as requester_category,
                   u_req.level as requester_level, u_req.pitch_type as requester_pitch_type,
                   u_req.phone as requester_phone, u_req.email as requester_email, u_req.stadium_address as requester_stadium_address,
                   c_req.name as requester_club_name, c_req.logo_url as requester_club_logo,
                   c_req.city as requester_city, c_req.address as requester_club_address,
                   mc.status as request_status,
                   COALESCE(mc.notification_state, 0) as notification_state,
                   m.pitch_type as match_pitch_type
            FROM match_contacts mc
            JOIN matches m ON mc.match_id = m.id
            JOIN users u_req ON mc.user_id = u_req.id
            LEFT JOIN clubs c_req ON u_req.club_id = c_req.id
            JOIN clubs c_host ON m.club_id = c_host.id
            WHERE m.owner_id = ?
            ORDER BY mc.contacted_at DESC
        `).bind(userId).all<ParticipationRequest>();

        return results;
    }

    async getMyParticipations(userId: string): Promise<ParticipationRequest[]> {
        const { results } = await this.db.prepare(`
            SELECT mc.*, 
                   m.type as match_type, m.category as match_category, m.level as match_level, m.match_date, m.match_time, 
                   m.venue, m.location_city, m.location_address, m.location_zip, m.max_teams as match_max_teams,
                   (SELECT COUNT(*) FROM match_contacts mc2 WHERE mc2.match_id = m.id AND mc2.status = 'accepted') as accepted_count,
                   c_host.name as host_club_name, c_host.logo_url as host_club_logo, c_host.city as host_city,
                   u_host.firstname as host_firstname, u_host.lastname as host_lastname, u_host.category as host_category, u_host.level as host_level, u_host.stadium_address as host_stadium_address,
                   m.email as host_email, m.phone as host_phone,
                   c_req.name as requester_club_name, c_req.logo_url as requester_club_logo,
                   u_req.phone as requester_phone, u_req.email as requester_email,
                   u_req.level as requester_level, u_req.category as requester_category, u_req.pitch_type as requester_pitch_type,
                   mc.status as request_status,
                   COALESCE(mc.notification_state, 0) as notification_state,
                   m.pitch_type as match_pitch_type
            FROM match_contacts mc
            JOIN matches m ON mc.match_id = m.id
            JOIN clubs c_host ON m.club_id = c_host.id
            JOIN users u_host ON m.owner_id = u_host.id
            JOIN users u_req ON mc.user_id = u_req.id
            LEFT JOIN clubs c_req ON u_req.club_id = c_req.id
            WHERE mc.user_id = ?
            ORDER BY m.match_date ASC
        `).bind(userId).all<ParticipationRequest>();

        return results;
    }

    async updateRequestStatus(matchId: string, requestUserId: string, ownerId: string, status: 'accepted' | 'refused'): Promise<boolean> {
        const match = await this.db.prepare('SELECT owner_id, match_date, match_time FROM matches WHERE id = ?').bind(matchId).first<{ owner_id: string, match_date: string, match_time: string }>();
        if (!match || match.owner_id !== ownerId) throw new Error('Unauthorized');

        if (status === 'accepted') {
            const updateResult = await this.db.prepare(`
                UPDATE match_contacts SET status = 'accepted' 
                WHERE match_id = ? AND user_id = ? 
                AND (SELECT COUNT(*) FROM match_contacts WHERE match_id = ? AND status = 'accepted') < COALESCE((SELECT max_teams FROM matches WHERE id = ?), 99999)
            `).bind(matchId, requestUserId, matchId, matchId).run();

            if (updateResult.meta.changes === 0) throw new Error('409_CONFLICT');
        } else {
            await this.db.prepare('UPDATE match_contacts SET status = ? WHERE match_id = ? AND user_id = ?').bind(status, matchId, requestUserId).run();
        }

        // Close match or tournament if capacity reached
        const acceptedCountRes = await this.db.prepare('SELECT COUNT(*) as count FROM match_contacts WHERE match_id = ? AND status = "accepted"').bind(matchId).first<any>();
        const acceptedCount = acceptedCountRes?.count || 0;
        const matchDetails = await this.db.prepare('SELECT type, max_teams FROM matches WHERE id = ?').bind(matchId).first<{ type: string, max_teams: number }>();

        if (status === 'accepted') {
            if (matchDetails?.type === 'match' || (matchDetails?.type === 'tournament' && matchDetails?.max_teams && acceptedCount >= matchDetails.max_teams)) {
                await this.db.prepare('UPDATE matches SET status = "found" WHERE id = ?').bind(matchId).run();
            }
        } else if (status === 'refused' && acceptedCount === 0) {
            await this.db.prepare('UPDATE matches SET status = "active" WHERE id = ?').bind(matchId).run();
        }

        return true;
    }

    async deleteContact(matchId: string, userId: string, requesterId: string): Promise<boolean> {
        const match = await this.baseMatchService.getById(matchId);
        if (!match) throw new Error('Match not found');
        if (match.owner_id !== requesterId && userId !== requesterId) throw new Error('Unauthorized');

        const contact = await this.db.prepare('SELECT status FROM match_contacts WHERE match_id = ? AND user_id = ?').bind(matchId, userId).first<any>();
        if (!contact) return true;

        await this.db.prepare('DELETE FROM match_contacts WHERE match_id = ? AND user_id = ?').bind(matchId, userId).run();

        if (contact.status === 'accepted') {
            const acceptedCountRes = await this.db.prepare('SELECT COUNT(*) as count FROM match_contacts WHERE match_id = ? AND status = "accepted"').bind(matchId).first<any>();
            if ((acceptedCountRes?.count || 0) === 0) {
                await this.db.prepare('UPDATE matches SET status = "active" WHERE id = ?').bind(matchId).run();
            }
        }
        return true;
    }

    async markNotificationsAsRead(matchId: string, userId: string): Promise<boolean> {
        await this.db.prepare('UPDATE match_contacts SET notification_state = 0 WHERE match_id = ? AND user_id = ?').bind(matchId, userId).run();
        return true;
    }

    async getNotificationCounts(userId: string): Promise<{ pendingRequests: number, modifiedParticipations: number }> {
        const pendingRes = await this.db.prepare(`
            SELECT COUNT(*) as count FROM match_contacts mc JOIN matches m ON mc.match_id = m.id
            WHERE m.owner_id = ? AND mc.status = 'pending'
        `).bind(userId).first<any>();

        const modifiedRes = await this.db.prepare('SELECT COUNT(*) as count FROM match_contacts WHERE user_id = ? AND notification_state = 1').bind(userId).first<any>();

        return {
            pendingRequests: pendingRes?.count || 0,
            modifiedParticipations: modifiedRes?.count || 0
        };
    }
}
