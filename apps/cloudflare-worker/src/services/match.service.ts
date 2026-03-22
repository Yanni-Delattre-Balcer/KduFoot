import { D1Database } from '@cloudflare/workers-types';
import { Match, CreateMatchDto, UpdateMatchDto, MatchRow } from '../types/match';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service to manage core match data in Cloudflare D1.
 * Handles creation, updates, and basic lifecycle.
 */
export class MatchService {
    constructor(private db: D1Database) { }

    /**
     * Sécurité H-2 : Vérifie si on est à moins de 2h du début du match.
     */
    public isTooLateToModify(matchDate: string, matchTime: string): boolean {
        try {
            const matchDateTime = new Date(`${matchDate}T${matchTime}`);
            if (isNaN(matchDateTime.getTime())) return false;
            const now = new Date();
            const diffMs = matchDateTime.getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            return diffHours > 0 && diffHours < 2;
        } catch {
            return false;
        }
    }

    async create(userId: string, dto: CreateMatchDto): Promise<Match> {
        const id = uuidv4();
        const now = Math.floor(Date.now() / 1000);

        const result = await this.db.prepare(
            `INSERT INTO matches (
        id, owner_id, club_id, type, name, category, level, format, match_date, match_time, match_end_time,
        venue, location_address, location_city, location_zip, pitch_type, jersey_color,
        email, phone, notes, max_teams, registration_fee, status, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, 'active', ?
      ) RETURNING *`
        ).bind(
            id, userId, dto.club_id, dto.type || 'match', dto.name || null, dto.category, dto.level || null, dto.format, dto.match_date, dto.match_time, dto.match_end_time || null,
            dto.venue, dto.location_address || null, dto.location_city || null, dto.location_zip || null, dto.pitch_type || null, dto.jersey_color || null,
            dto.email, dto.phone, dto.notes || null, dto.max_teams || null, dto.registration_fee || null, now
        ).first<Match>();

        return result!;
    }

    async update(id: string, userId: string, dto: UpdateMatchDto): Promise<Match | null> {
        const existing = await this.getById(id);
        if (!existing) return null;
        if (existing.owner_id !== userId) throw new Error('Unauthorized');

        if (this.isTooLateToModify(existing.match_date, existing.match_time)) {
            throw new Error('TOO_LATE_TO_MODIFY');
        }

        const allowedKeys = [
            'club_id', 'type', 'name', 'category', 'level', 'format', 
            'match_date', 'match_time', 'match_end_time', 'venue', 
            'location_address', 'location_city', 'location_zip', 
            'pitch_type', 'jersey_color', 'email', 'phone', 'notes', 
            'max_teams', 'registration_fee', 'status'
        ] as const;

        const keys = Object.keys(dto).filter(k => allowedKeys.includes(k as any)) as (keyof UpdateMatchDto)[];
        if (keys.length === 0) return existing;

        const setClauses: string[] = [];
        const values: (string | number | undefined | null)[] = [];
        for (const key of keys) {
            setClauses.push(`${key} = ?`);
            values.push(dto[key] as any);
        }

        const query = `UPDATE matches SET ${setClauses.join(', ')} WHERE id = ?`;
        await this.db.prepare(query).bind(...values, id).run();

        await this.db.prepare(
            'UPDATE match_contacts SET notification_state = 1 WHERE match_id = ? AND status = "accepted"'
        ).bind(id).run();

        return await this.getById(id);
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const existing = await this.getById(id);
        if (!existing) return false;
        if (existing.owner_id !== userId) throw new Error('Unauthorized');

        if (this.isTooLateToModify(existing.match_date, existing.match_time)) {
            throw new Error('TOO_LATE_TO_MODIFY');
        }

        await this.db.prepare('PRAGMA foreign_keys = ON;').run();
        await this.db.prepare('UPDATE matches SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run();
        return true;
    }

    async getById(id: string): Promise<Match | null> {
        const fetchMatch = this.db.prepare(`
            SELECT m.*, 
                   c.name as club_name, c.city as club_city, c.zip as club_zip, c.logo_url as club_logo_url,
                   c.address as club_address, c.latitude as club_latitude, c.longitude as club_longitude
            FROM matches m 
            LEFT JOIN clubs c ON m.club_id = c.id 
            WHERE m.id = ? AND m.deleted_at IS NULL
        `).bind(id);

        const fetchContacts = this.db.prepare(`
            SELECT mc.*, u.id as user_id, c.id as club_id, c.name as club_name
            FROM match_contacts mc
            LEFT JOIN users u ON mc.user_id = u.id
            LEFT JOIN clubs c ON u.club_id = c.id
            WHERE mc.match_id = ?
            ORDER BY mc.contacted_at DESC
        `).bind(id);

        const fetchAcceptedCount = this.db.prepare(`
            SELECT COUNT(*) as count FROM match_contacts WHERE match_id = ? AND status = 'accepted'
        `).bind(id);

        const fetchPairings = this.db.prepare(`
            SELECT tp.*, 
                   c_a.name as team_a_club_name, c_a.logo_url as team_a_club_logo,
                   c_b.name as team_b_club_name, c_b.logo_url as team_b_club_logo
            FROM tournament_pairings tp
            LEFT JOIN clubs c_a ON tp.team_a_club_id = c_a.id
            LEFT JOIN clubs c_b ON tp.team_b_club_id = c_b.id
            WHERE tp.match_id = ?
            ORDER BY tp.scheduled_time ASC
        `).bind(id);

        const [matchRes, contactsRes, acceptedRes, pairingsRes] = await this.db.batch<any>([
            fetchMatch,
            fetchContacts,
            fetchAcceptedCount,
            fetchPairings
        ]);

        const result = matchRes.results[0];
        if (!result) return null;

        const match = this.mapRowToMatch(result as MatchRow);
        match.accepted_count = (acceptedRes.results[0] as { count: number })?.count || 0;
        match.contacts = (contactsRes.results as any[]).map(c => ({
            user_id: c.user_id,
            club_id: c.club_id,
            club_name: c.club_name,
            message: c.message,
            contacted_at: typeof c.contacted_at === 'number' ? new Date(c.contacted_at * 1000).toISOString() : c.contacted_at,
            status: c.status
        }));

        match.pairings = (pairingsRes.results as any[]).map(r => ({
            ...r,
            team_a_club_name: r.team_a_club_name,
            team_a_club_logo: r.team_a_club_logo,
            team_b_club_name: r.team_b_club_name,
            team_b_club_logo: r.team_b_club_logo
        }));

        return match;
    }

    public mapRowToMatch(row: MatchRow): Match {
        const {
            club_name, club_city, club_zip, club_logo_url, club_address, club_latitude, club_longitude,
            ...matchData
        } = row;

        return {
            ...matchData,
            club: {
                id: matchData.club_id,
                name: club_name || '',
                city: club_city || '',
                zip: club_zip,
                address: club_address,
                logo_url: club_logo_url,
                latitude: club_latitude,
                longitude: club_longitude,
                siret: '' 
            }
        } as Match;
    }
}
