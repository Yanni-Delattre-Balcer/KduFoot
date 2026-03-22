import { D1Database } from '@cloudflare/workers-types';
import { TournamentPairing, Match } from '../types/match';
import { v4 as uuidv4 } from 'uuid';
import { MatchService } from './match.service';

export class TournamentService {
    private baseMatchService: MatchService;

    constructor(private db: D1Database) {
        this.baseMatchService = new MatchService(db);
    }

    async getPairings(matchId: string): Promise<TournamentPairing[]> {
        const { results } = await this.db.prepare(`
            SELECT tp.*, 
                   c_a.name as team_a_club_name, c_a.logo_url as team_a_club_logo,
                   c_b.name as team_b_club_name, c_b.logo_url as team_b_club_logo
            FROM tournament_pairings tp
            JOIN matches m ON tp.match_id = m.id
            LEFT JOIN clubs c_a ON tp.team_a_club_id = c_a.id
            LEFT JOIN clubs c_b ON tp.team_b_club_id = c_b.id
            WHERE tp.match_id = ? AND m.deleted_at IS NULL
            ORDER BY tp.scheduled_time ASC
        `).bind(matchId).all<TournamentPairing>();

        return results.map(r => ({
            ...r,
            team_a_club_name: r.team_a_club_name,
            team_a_club_logo: r.team_a_club_logo,
            team_b_club_name: r.team_b_club_name,
            team_b_club_logo: r.team_b_club_logo
        }));
    }

    async generatePairings(matchId: string, userId: string): Promise<TournamentPairing[]> {
        const match = await this.baseMatchService.getById(matchId);
        if (!match || match.owner_id !== userId) throw new Error('Unauthorized or match not found');
        if (match.type !== 'tournament') throw new Error('Cannot generate pairings for a simple match');

        const { results: teams } = await this.db.prepare(`
            SELECT u.club_id, c.name as club_name, c.logo_url
            FROM match_contacts mc
            JOIN users u ON mc.user_id = u.id
            JOIN clubs c ON u.club_id = c.id
            WHERE mc.match_id = ? AND mc.status = 'accepted'
        `).bind(matchId).all<{ club_id: string, club_name: string, logo_url: string }>();

        const allTeams = [
            { club_id: match.club_id, club_name: match.club!.name, logo_url: match.club!.logo_url },
            ...teams
        ];

        if (allTeams.length < 2) throw new Error('Il faut au moins 2 équipes acceptées pour générer des matchs');

        const shuffled = [...allTeams].sort(() => Math.random() - 0.5);
        await this.db.prepare('DELETE FROM tournament_pairings WHERE match_id = ?').bind(matchId).run();

        const matchTime = match.match_time || '10:00';
        for (let i = 0; i < shuffled.length - 1; i += 2) {
            const teamA = shuffled[i];
            const teamB = shuffled[i + 1];
            const id = uuidv4();
            await this.db.prepare(`
                INSERT INTO tournament_pairings (id, match_id, team_a_club_id, team_b_club_id, scheduled_time, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(id, matchId, teamA.club_id, teamB.club_id, matchTime, Math.floor(Date.now() / 1000)).run();
        }

        return this.getPairings(matchId);
    }

    async updatePairingTime(pairingId: string, userId: string, scheduledTime: string): Promise<boolean> {
        const pairing = await this.db.prepare(`
            SELECT tp.*, m.owner_id, m.match_time, m.match_end_time 
            FROM tournament_pairings tp
            JOIN matches m ON tp.match_id = m.id
            WHERE tp.id = ? AND m.deleted_at IS NULL
        `).bind(pairingId).first<TournamentPairing & { owner_id: string, match_time: string, match_end_time: string }>();

        if (!pairing) throw new Error('Pairing not found');
        if (pairing.owner_id !== userId) throw new Error('Unauthorized');

        if (pairing.match_time && scheduledTime < pairing.match_time) {
            throw new Error(`L'heure doit être après le début du tournoi (${pairing.match_time})`);
        }
        if (pairing.match_end_time && scheduledTime > pairing.match_end_time) {
            throw new Error(`L'heure doit être avant la fin du tournoi (${pairing.match_end_time})`);
        }

        await this.db.prepare('UPDATE tournament_pairings SET scheduled_time = ? WHERE id = ?').bind(scheduledTime, pairingId).run();
        await this.db.prepare('UPDATE match_contacts SET notification_state = 1 WHERE match_id = ? AND status = "accepted"').bind(pairing.match_id).run();
        return true;
    }

    async closeRegistrations(id: string, userId: string): Promise<Match | null> {
        const existing = await this.baseMatchService.getById(id);
        if (!existing) return null;
        if (existing.owner_id !== userId) throw new Error('Unauthorized');
        if (existing.type !== 'tournament') throw new Error('Seuls les tournois peuvent être fermés manuellement');

        if (this.baseMatchService.isTooLateToModify(existing.match_date, existing.match_time)) {
            throw new Error('TOO_LATE_TO_MODIFY');
        }

        await this.db.prepare('UPDATE matches SET status = "found" WHERE id = ?').bind(id).run();
        return this.baseMatchService.getById(id);
    }

    async updateScore(matchId: string, userId: string, scoreA: number, scoreB: number): Promise<boolean> {
        const existing = await this.db.prepare('SELECT owner_id, score_a, score_b FROM matches WHERE id = ? AND deleted_at IS NULL').bind(matchId).first<{ owner_id: string, score_a: number | null, score_b: number | null }>();
        if (!existing) return false;
        if (existing.owner_id !== userId) throw new Error('Unauthorized');

        const auditId = uuidv4();
        await this.db.batch([
            this.db.prepare(`
                INSERT INTO score_updates (id, match_id, admin_user_id, old_score_a, old_score_b, new_score_a, new_score_b, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).bind(auditId, matchId, userId, existing.score_a, existing.score_b, scoreA, scoreB),
            this.db.prepare('UPDATE matches SET score_a = ?, score_b = ? WHERE id = ?').bind(scoreA, scoreB, matchId)
        ]);

        return true;
    }
}
