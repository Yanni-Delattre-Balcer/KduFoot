import { D1Database } from '@cloudflare/workers-types';
import { Match, CreateMatchDto, UpdateMatchDto, MatchFilters, ContactMatchDto, TournamentPairing } from '../types/match';
import { v4 as uuidv4 } from 'uuid';

export class MatchService {
    constructor(private db: D1Database) { }

    /**
     * Sécurité H-2 : Vérifie si on est à moins de 2h du début du match.
     * Bloque aussi si le match a commencé il y a moins de 2h.
     */
    private isTooLateToModify(matchDate: string, matchTime: string): boolean {
        try {
            // matchDate is YYYY-MM-DD, matchTime is HH:MM
            const matchDateTime = new Date(`${matchDate}T${matchTime}`);
            if (isNaN(matchDateTime.getTime())) return false; // Fail safe if date is invalid

            const now = new Date();
            const diffMs = matchDateTime.getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            // Seule restriction : les 2h AVANT le match
            // Une fois le match commencé (diffHours <= 0), on peut de nouveau supprimer/modifier
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
        id, owner_id, club_id, type, category, level, format, match_date, match_time, match_end_time,
        venue, location_address, location_city, location_zip, pitch_type,
        email, phone, notes, max_teams, registration_fee, status, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, 'active', ?
      ) RETURNING *`
        ).bind(
            id, userId, dto.club_id, dto.type || 'match', dto.category, dto.level || null, dto.format, dto.match_date, dto.match_time, dto.match_end_time || null,
            dto.venue, dto.location_address || null, dto.location_city || null, dto.location_zip || null, dto.pitch_type || null,
            dto.email, dto.phone, dto.notes || null, dto.max_teams || null, dto.registration_fee || null, now
        ).first<Match>();

        return result!;
    }

    async update(id: string, userId: string, dto: UpdateMatchDto): Promise<Match | null> {
        const existing = await this.getById(id);
        if (!existing) return null;
        if (existing.owner_id !== userId) throw new Error('Unauthorized');

        // Sécurité H-2 : Verrouillage si le match commence dans moins de 2h
        if (this.isTooLateToModify(existing.match_date, existing.match_time)) {
            throw new Error('TOO_LATE_TO_MODIFY');
        }

        const keys = Object.keys(dto) as (keyof UpdateMatchDto)[];
        if (keys.length === 0) return existing;

        const setClauses: string[] = [];
        const values: any[] = [];
        for (const key of keys) {
            setClauses.push(`${key} = ?`);
            values.push(dto[key]);
        }

        const query = `UPDATE matches SET ${setClauses.join(', ')} WHERE id = ?`;
        await this.db.prepare(query).bind(...values, id).run();

        // Système d'Alertes: Notifier les participants acceptés de TOUT changement
        // Uniquement pour les contacts dont le statut est 'accepted'
        await this.db.prepare(
            'UPDATE match_contacts SET notification_state = 1 WHERE match_id = ? AND status = "accepted"'
        ).bind(id).run();

        return await this.getById(id); // Return full object with club info
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const existing = await this.getById(id);
        if (!existing) return false;

        if (existing.owner_id !== userId) {
            throw new Error('Unauthorized');
        }

        // Sécurité H-2
        if (this.isTooLateToModify(existing.match_date, existing.match_time)) {
            throw new Error('TOO_LATE_TO_MODIFY');
        }

        // D1 SQLite requires explicit PRAGMA to enforce ON DELETE CASCADE
        await this.db.prepare('PRAGMA foreign_keys = ON;').run();
        await this.db.prepare('DELETE FROM matches WHERE id = ?').bind(id).run();
        return true;
    }

    async closeRegistrations(id: string, userId: string): Promise<Match | null> {
        const existing = await this.getById(id);
        if (!existing) return null;
        if (existing.owner_id !== userId) throw new Error('Unauthorized');
        if (existing.type !== 'tournament') throw new Error('Seuls les tournois peuvent être fermés manuellement');

        // Sécurité H-2 : Verrouillage si le match commence dans moins de 2h
        if (this.isTooLateToModify(existing.match_date, existing.match_time)) {
            throw new Error('TOO_LATE_TO_MODIFY');
        }

        await this.db.prepare(
            'UPDATE matches SET status = "found" WHERE id = ?'
        ).bind(id).run();

        return this.getById(id);
    }

    async getById(id: string): Promise<Match | null> {
        const result = await this.db.prepare(`
            SELECT m.*, 
                   c.name as club_name, c.city as club_city, c.zip as club_zip, c.logo_url as club_logo_url,
                   c.address as club_address, c.latitude as club_latitude, c.longitude as club_longitude
            FROM matches m 
            LEFT JOIN clubs c ON m.club_id = c.id 
            WHERE m.id = ?
        `).bind(id).first<any>();

        if (!result) return null;

        // Fetch contacts for this match with club info
        const { results: contacts } = await this.db.prepare(`
            SELECT mc.*, u.id as user_id, c.id as club_id, c.name as club_name
            FROM match_contacts mc
            LEFT JOIN users u ON mc.user_id = u.id
            LEFT JOIN clubs c ON u.club_id = c.id
            WHERE mc.match_id = ?
            ORDER BY mc.contacted_at DESC
        `).bind(id).all<any>();

        // Count accepted teams
        const acceptedCountResult = await this.db.prepare(`
            SELECT COUNT(*) as count FROM match_contacts WHERE match_id = ? AND status = 'accepted'
        `).bind(id).first<{ count: number }>();

        const match = this.mapRowToMatch(result);
        match.accepted_count = acceptedCountResult?.count || 0;
        match.contacts = contacts.map(c => ({
            user_id: c.user_id,
            club_id: c.club_id,
            club_name: c.club_name,
            message: c.message,
            contacted_at: new Date(c.contacted_at * 1000).toISOString(),
            status: c.status as any
        }));

        if (match.type === 'tournament') {
            match.pairings = await this.getPairings(id);
        }

        return match;
    }

    async getPairings(matchId: string): Promise<TournamentPairing[]> {
        const { results } = await this.db.prepare(`
            SELECT tp.*, 
                   c_a.name as team_a_club_name, c_a.logo_url as team_a_club_logo,
                   c_b.name as team_b_club_name, c_b.logo_url as team_b_club_logo
            FROM tournament_pairings tp
            LEFT JOIN clubs c_a ON tp.team_a_club_id = c_a.id
            LEFT JOIN clubs c_b ON tp.team_b_club_id = c_b.id
            WHERE tp.match_id = ?
            ORDER BY tp.scheduled_time ASC
        `).bind(matchId).all<any>();

        return results.map(r => ({
            ...r,
            team_a_club_name: r.team_a_club_name,
            team_a_club_logo: r.team_a_club_logo,
            team_b_club_name: r.team_b_club_name,
            team_b_club_logo: r.team_b_club_logo
        }));
    }

    async updatePairingTime(pairingId: string, userId: string, scheduledTime: string): Promise<boolean> {
        // Validation: Verify if the user is the owner of the tournament
        const pairing = await this.db.prepare(`
            SELECT tp.*, m.owner_id, m.match_time, m.match_end_time 
            FROM tournament_pairings tp
            JOIN matches m ON tp.match_id = m.id
            WHERE tp.id = ?
        `).bind(pairingId).first<any>();

        if (!pairing) throw new Error('Pairing not found');
        if (pairing.owner_id !== userId) throw new Error('Unauthorized');

        // Validation: scheduledTime must be within [match_time, match_end_time]
        if (pairing.match_time && scheduledTime < pairing.match_time) {
            throw new Error(`L'heure doit être après le début du tournoi (${pairing.match_time})`);
        }
        if (pairing.match_end_time && scheduledTime > pairing.match_end_time) {
            throw new Error(`L'heure doit être avant la fin du tournoi (${pairing.match_end_time})`);
        }

        await this.db.prepare(
            'UPDATE tournament_pairings SET scheduled_time = ? WHERE id = ?'
        ).bind(scheduledTime, pairingId).run();

        // Notify participants (optional but good for 'Real-time Vue')
        // We'll mark the tournament as modified for all accepted participants
        await this.db.prepare(
            'UPDATE match_contacts SET notification_state = 1 WHERE match_id = ? AND status = "accepted"'
        ).bind(pairing.match_id).run();

        return true;
    }

    async createPairing(matchId: string, teamAId: string, teamBId: string, scheduledTime: string): Promise<TournamentPairing> {
        const id = uuidv4();
        const now = Math.floor(Date.now() / 1000);
        await this.db.prepare(`
            INSERT INTO tournament_pairings (id, match_id, team_a_club_id, team_b_club_id, scheduled_time, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(id, matchId, teamAId, teamBId, scheduledTime, now).run();

        const pairings = await this.getPairings(matchId);
        return pairings.find(p => p.id === id)!;
    }

    /**
     * Helper to map flat DB row to nested Match object
     */
    private mapRowToMatch(row: any): Match {
        const {
            club_name, club_city, club_zip, club_logo_url, club_address, club_latitude, club_longitude,
            ...matchData
        } = row;

        return {
            ...matchData,
            club: {
                id: matchData.club_id,
                name: club_name,
                city: club_city,
                zip: club_zip,
                address: club_address,
                logo_url: club_logo_url,
                latitude: club_latitude,
                longitude: club_longitude,
                siret: '' // Not selected usually, but required by type?
            }
        } as Match;
    }

    /**
     * Haversine distance in km between two lat/lng points (straight-line).
     */
    private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /**
     * Call Google Maps Distance Matrix API to get real driving distances.
     * Returns a Map of destination index -> distance in meters.
     */
    private async getGoogleDistances(
        originLat: number, originLng: number,
        destinations: { lat: number; lng: number }[],
        apiKey: string
    ): Promise<Map<number, number>> {
        const distanceMap = new Map<number, number>();
        const validApiKey = apiKey && apiKey !== 'undefined' && apiKey !== 'null' && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
        if (!destinations.length || !validApiKey) {
            if (!validApiKey && destinations.length > 0) {
                console.warn("Google Maps API Key is missing or invalid. Falling back to Haversine distances.");
            }
            return distanceMap;
        }

        // Google Distance Matrix accepts max 25 destinations per request
        const batchSize = 25;
        for (let i = 0; i < destinations.length; i += batchSize) {
            const batch = destinations.slice(i, i + batchSize);
            const destStr = batch.map(d => `${d.lat},${d.lng}`).join('|');
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${encodeURIComponent(destStr)}&key=${apiKey}&units=metric&mode=driving`;

            try {
                const res = await fetch(url);
                if (!res.ok) {
                    console.error(`Google Distance Matrix API error: ${res.status}`);
                    continue;
                }
                const data = await res.json() as any;
                if (data.status === 'OVER_QUERY_LIMIT') {
                    console.warn("Google Maps API quota exceeded.");
                    break;
                }
                if (data.rows?.[0]?.elements) {
                    data.rows[0].elements.forEach((el: any, j: number) => {
                        if (el.status === 'OK' && el.distance) {
                            distanceMap.set(i + j, el.distance.value); // meters
                        }
                    });
                }
            } catch (error) {
                console.error("Error fetching Google distances:", error);
            }
        }
        return distanceMap;
    }

    async search(filters: MatchFilters, googleMapsApiKey?: string): Promise<{ matches: any[], total: number }> {
        const wantDistance = filters.radius_km && filters.user_lat != null && filters.user_lng != null;

        // Always join clubs now to get names
        const selectClause = `
            m.*, 
            c.name as club_name, c.city as club_city, c.zip as club_zip, c.logo_url as club_logo_url,
            c.address as club_address, c.latitude as club_latitude, c.longitude as club_longitude
        `;
        const fromClause = 'matches m LEFT JOIN clubs c ON m.club_id = c.id';

        let query = `SELECT ${selectClause} FROM ${fromClause} WHERE 1=1`;
        const params: any[] = [];

        if (filters.ownerId) {
            query += ' AND m.owner_id = ?';
            params.push(filters.ownerId);
        } else {
            if (filters.status) {
                query += ' AND m.status = ?';
                params.push(filters.status);
            }
        }

        if (filters.type) {
            query += ' AND m.type = ?';
            params.push(filters.type);
        }

        if (filters.category) {
            query += ' AND m.category = ?';
            params.push(filters.category);
        }
        if (filters.level) {
            query += ' AND m.level = ?';
            params.push(filters.level);
        }
        if (filters.format) {
            query += ' AND m.format = ?';
            params.push(filters.format);
        }
        if (filters.venue) {
            let searchVenue = filters.venue;
            if (filters.venue === 'Domicile') searchVenue = 'Extérieur';
            else if (filters.venue === 'Extérieur') searchVenue = 'Domicile';

            query += ' AND m.venue = ?';
            params.push(searchVenue);
        }
        if (filters.pitch_type) {
            query += ' AND m.pitch_type = ?';
            params.push(filters.pitch_type);
        }
        if (filters.location_city) {
            query += ' AND LOWER(m.location_city) LIKE ?';
            params.push('%' + filters.location_city.toLowerCase() + '%');
        }
        if (filters.location_zip) {
            query += ' AND (m.location_zip LIKE ? OR c.zip LIKE ?)';
            params.push(`${filters.location_zip}%`, `${filters.location_zip}%`);
        }

        if (filters.notes) {
            query += ' AND m.notes LIKE ?';
            params.push(`%${filters.notes}%`);
        }
        if (filters.date) {
            query += ' AND m.match_date = ?';
            params.push(filters.date);
        }
        if (filters.from) {
            query += ' AND m.match_date >= ?';
            params.push(filters.from);
        }
        if (filters.to) {
            query += ' AND m.match_date <= ?';
            params.push(filters.to);
        }

        // Auto-hide past matches by default (unless specifically requested or date-filtered)
        // User request: "le jour à l'heure du match l'annonce se supprime automatiquement"
        const hasDateFilters = filters.date || filters.from || filters.to;
        if (!hasDateFilters && !filters.include_past) {
            // Logic: Match Date > Today OR (Match Date = Today AND Match Time >= Now)
            // Note: D1 DATE('now') is UTC. We need to be careful with timezones.
            // Ideally we passed client timezone, but for now we'll use a safe buffer or just strict comparison against UTC.
            // Given the user wants "cleanup", it's better to hide slightly later than slightly earlier.
            // If we use UTC, and user is in France (UTC+1/+2), 
            // 20:00 User Time = 19:00 UTC. 
            // If Current is 19:30 UTC (20:30 User), Match is passed.
            // 19:00 >= 19:30 is False. Hidden. Correct.
            // If Current is 18:30 UTC (19:30 User), Match is future.
            // 19:00 >= 18:30 is True. Shown. Correct.
            // So comparing User Entered Time (e.g. 20:00) with UTC Time (e.g. 19:00) 
            // Means matches stay visible for (Offset) hours longer. 
            // This is acceptable/safe.
            query += " AND (m.match_date > DATE('now') OR (m.match_date = DATE('now') AND m.match_time >= TIME('now')))";
        }

        // Logic for Tournament Visibility: Stay active until max_teams is reached OR status is manually set to 'found'
        // Only for tournaments
        if (!filters.ownerId && filters.type !== 'match') {
            query += ` AND (m.type != 'tournament' OR m.status = 'active' OR (m.type = 'tournament' AND m.status = 'active' AND m.max_teams IS NOT NULL AND (SELECT COUNT(*) FROM match_contacts mc2 WHERE mc2.match_id = m.id AND mc2.status = 'accepted') < m.max_teams))`;
        }

        // Haversine bounding box pre-filter (30% wider than requested radius to account for road vs straight-line)
        if (wantDistance) {
            const expandedRadius = filters.radius_km! * 1.4; // roads are ~30-40% longer than straight-line
            const latDelta = expandedRadius / 111.0;
            const lngDelta = expandedRadius / (111.0 * Math.cos(filters.user_lat! * Math.PI / 180));
            query += ' AND c.latitude BETWEEN ? AND ? AND c.longitude BETWEEN ? AND ?';
            params.push(filters.user_lat! - latDelta, filters.user_lat! + latDelta);
            params.push(filters.user_lng! - lngDelta, filters.user_lng! + lngDelta);
        }

        query += ' ORDER BY m.match_date ASC';

        // When doing distance filtering, get more results first, then filter by distance
        if (!wantDistance) {
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }
            if (filters.offset) {
                query += ' OFFSET ?';
                params.push(filters.offset);
            }
        } else {
            query += ' LIMIT 100'; // Cap for distance API calls
        }

        const { results } = await this.db.prepare(query).bind(...params).all<any>();

        // Map results to objects
        let mappedResults = results.map(row => this.mapRowToMatch(row));

        // If no distance filtering, return mapped
        if (!wantDistance || !mappedResults.length) {
            return { matches: mappedResults, total: results.length };
        }

        // Build destinations array for matches that have coordinates
        const matchesWithCoords: { index: number; lat: number; lng: number }[] = [];
        mappedResults.forEach((m, idx) => {
            if (m.club?.latitude != null && m.club?.longitude != null) {
                matchesWithCoords.push({ index: idx, lat: m.club.latitude, lng: m.club.longitude });
            }
        });

        // Call Google Maps Distance Matrix API for real road distances
        const destinations = matchesWithCoords.map(m => ({ lat: m.lat, lng: m.lng }));
        const distanceMap = await this.getGoogleDistances(
            filters.user_lat!, filters.user_lng!,
            destinations,
            googleMapsApiKey || ''
        );

        // Filter by actual road distance and add distance field
        const radiusMeters = filters.radius_km! * 1000;
        const filtered: Match[] = [];
        matchesWithCoords.forEach((mc, destIdx) => {
            const distMeters = distanceMap.get(destIdx);
            const match = mappedResults[mc.index];

            if (distMeters !== undefined && distMeters <= radiusMeters) {
                match.distance_km = Math.round(distMeters / 100) / 10; // e.g. 12.3 km
                filtered.push(match);
            } else if (distMeters === undefined && match.club?.latitude != null && match.club?.longitude != null) {
                // Fallback to Haversine if Google API didn't return a result
                const haversineDist = this.haversineKm(
                    filters.user_lat!, filters.user_lng!,
                    match.club.latitude, match.club.longitude
                );
                if (haversineDist <= filters.radius_km!) {
                    match.distance_km = Math.round(haversineDist * 10) / 10;
                    match.distance_approximate = true;
                    filtered.push(match);
                }
            }
        });

        // Sort by distance
        filtered.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));

        return { matches: filtered, total: filtered.length };
    }

    async contact(matchId: string, userId: string, dto: ContactMatchDto): Promise<boolean> {
        // Check if match exists and is active
        const match = await this.getById(matchId);
        if (!match || match.status !== 'active') throw new Error('Match not available');
        if (match.owner_id === userId) throw new Error('Cannot contact own match');

        // Check if already contacted
        try {
            await this.db.prepare(
                'INSERT INTO match_contacts (match_id, user_id, message, contacted_at, status) VALUES (?, ?, ?, ?, ?)'
            ).bind(matchId, userId, dto.message, Math.floor(Date.now() / 1000), 'pending').run();
            return true;
        } catch (e: any) {
            if (e.message.includes('UNIQUE constraint failed')) {
                return true;
            }
            throw e;
        }
    }

    async getIncomingRequests(userId: string): Promise<any[]> {
        const { results } = await this.db.prepare(`
            SELECT mc.*, 
                   m.type as match_type, m.category, m.level, m.match_date, m.match_time, m.venue, m.max_teams as match_max_teams,
                   (SELECT COUNT(*) FROM match_contacts mc2 WHERE mc2.match_id = m.id AND mc2.status = 'accepted') as accepted_count,
                   u_req.firstname as requester_firstname, u_req.lastname as requester_lastname,
                   u_req.club_colors as requester_club_colors, u_req.category as requester_category,
                   u_req.level as requester_level, u_req.pitch_type as requester_pitch_type,
                   u_req.phone as requester_phone, u_req.email as requester_email, u_req.stadium_address as requester_stadium_address,
                   c_req.name as requester_club_name, c_req.logo_url as requester_club_logo,
                   c_req.city as requester_city, c_req.address as requester_club_address,
                   mc.status as request_status,
                   COALESCE(mc.notification_state, 0) as notification_state,
                   m.pitch_type as host_pitch_type
            FROM match_contacts mc
            JOIN matches m ON mc.match_id = m.id
            JOIN users u_req ON mc.user_id = u_req.id
            LEFT JOIN clubs c_req ON u_req.club_id = c_req.id
            JOIN clubs c_host ON m.club_id = c_host.id
            WHERE m.owner_id = ?
            ORDER BY mc.contacted_at DESC
        `).bind(userId).all<any>();

        return results;
    }

    async getMyParticipations(userId: string): Promise<any[]> {
        const { results } = await this.db.prepare(`
            SELECT mc.*, 
                   m.type as match_type, m.category as match_category, m.level as match_level, m.match_date, m.match_time, 
                   m.venue, m.location_city, m.location_address, m.location_zip, m.max_teams as match_max_teams,
                   (SELECT COUNT(*) FROM match_contacts mc2 WHERE mc2.match_id = m.id AND mc2.status = 'accepted') as accepted_count,
                   c_host.name as host_club_name, c_host.logo_url as host_club_logo, c_host.city as host_city,
                   u_host.firstname as host_firstname, u_host.lastname as host_lastname, u_host.club_colors as host_club_colors, u_host.category as host_category, u_host.level as host_level, u_host.stadium_address as host_stadium_address,
                   m.email as host_email, m.phone as host_phone,
                   c_req.name as requester_club_name, c_req.logo_url as requester_club_logo,
                   u_req.phone as requester_phone, u_req.email as requester_email,
                   u_req.level as requester_level, u_req.category as requester_category, u_req.club_colors as requester_club_colors, u_req.pitch_type as requester_pitch_type,
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
        `).bind(userId).all<any>();

        return results;
    }

    async updateRequestStatus(matchId: string, requestUserId: string, ownerId: string, status: 'accepted' | 'refused'): Promise<boolean> {
        const match = await this.db.prepare('SELECT owner_id, match_date, match_time FROM matches WHERE id = ?').bind(matchId).first<any>();
        if (!match || match.owner_id !== ownerId) throw new Error('Unauthorized');

        // Sécurité H-2 : On ne peut plus accepter/refuser si le match est trop proche
        if (this.isTooLateToModify(match.match_date, match.match_time)) {
            throw new Error('TOO_LATE_TO_MODIFY');
        }

        await this.db.prepare(
            'UPDATE match_contacts SET status = ? WHERE match_id = ? AND user_id = ?'
        ).bind(status, matchId, requestUserId).run();

        // If accepted, mark match as found (closed)
        if (status === 'accepted') {
            const acceptedCountResult = await this.db.prepare(
                'SELECT COUNT(*) as count FROM match_contacts WHERE match_id = ? AND status = "accepted"'
            ).bind(matchId).first<any>();
            const acceptedCount = (acceptedCountResult?.count || 0);

            const matchDetails = await this.db.prepare('SELECT type, max_teams FROM matches WHERE id = ?').bind(matchId).first<any>();

            if (matchDetails?.type === 'match') {
                await this.db.prepare(
                    'UPDATE matches SET status = "found" WHERE id = ?'
                ).bind(matchId).run();
            } else if (matchDetails?.type === 'tournament' && matchDetails?.max_teams && acceptedCount >= matchDetails.max_teams) {
                await this.db.prepare(
                    'UPDATE matches SET status = "found" WHERE id = ?'
                ).bind(matchId).run();
            }
        } else if (status === 'refused') {
            // Check if there are no more matches with status 'accepted'
            const acceptedCountResult = await this.db.prepare(
                'SELECT COUNT(*) as count FROM match_contacts WHERE match_id = ? AND status = "accepted"'
            ).bind(matchId).first<any>();

            if ((acceptedCountResult?.count || 0) === 0) {
                await this.db.prepare(
                    'UPDATE matches SET status = "active" WHERE id = ?'
                ).bind(matchId).run();
            }
        }

        return true;
    }

    async deleteContact(matchId: string, userId: string, requesterId: string): Promise<boolean> {
        const match = await this.getById(matchId);
        if (!match) throw new Error('Match not found');

        if (match.owner_id !== requesterId && userId !== requesterId) {
            throw new Error('Unauthorized to cancel this contact');
        }

        const contact = await this.db.prepare(
            'SELECT status, message FROM match_contacts WHERE match_id = ? AND user_id = ?'
        ).bind(matchId, userId).first<any>();
        if (!contact) return true;

        // If the user is withdrawing themselves or the organizer is deleting/refusing definitively
        await this.db.prepare(
            'DELETE FROM match_contacts WHERE match_id = ? AND user_id = ?'
        ).bind(matchId, userId).run();

        if (contact.status === 'accepted') {
            const acceptedCountResult = await this.db.prepare(
                'SELECT COUNT(*) as count FROM match_contacts WHERE match_id = ? AND status = "accepted"'
            ).bind(matchId).first<any>();

            if ((acceptedCountResult?.count || 0) === 0) {
                await this.db.prepare(
                    'UPDATE matches SET status = "active" WHERE id = ?'
                ).bind(matchId).run();
            }
        }

        return true;
    }

    async markNotificationsAsRead(matchId: string, userId: string): Promise<boolean> {
        await this.db.prepare(
            'UPDATE match_contacts SET notification_state = 0 WHERE match_id = ? AND user_id = ?'
        ).bind(matchId, userId).run();
        return true;
    }

    async generatePairings(matchId: string, userId: string): Promise<TournamentPairing[]> {
        const match = await this.getById(matchId);
        if (!match || match.owner_id !== userId) throw new Error('Unauthorized or match not found');
        if (match.type !== 'tournament') throw new Error('Cannot generate pairings for a simple match');

        // 1. Get all accepted participants
        const { results: acceptedContacts } = await this.db.prepare(`
            SELECT mc.user_id, u.club_id, c.name as club_name, c.logo_url
            FROM match_contacts mc
            JOIN users u ON mc.user_id = u.id
            JOIN clubs c ON u.club_id = c.id
            WHERE mc.match_id = ? AND mc.status = 'accepted'
        `).bind(matchId).all<any>();

        // 2. Include the organizer club
        const teams = [
            { club_id: match.club_id, club_name: match.club!.name, logo_url: match.club!.logo_url },
            ...acceptedContacts.map(c => ({ club_id: c.club_id, club_name: c.club_name, logo_url: c.logo_url }))
        ];

        if (teams.length < 2) throw new Error('Il faut au moins 2 équipes acceptées pour générer des matchs');

        // 3. Shuffle teams
        const shuffled = [...teams].sort(() => Math.random() - 0.5);

        // 4. Delete existing pairings
        await this.db.prepare('DELETE FROM tournament_pairings WHERE match_id = ?').bind(matchId).run();

        // 5. Create new pairings (Round Robin or Simple Pairs?)
        // Let's do a simple draw (pairs) for now
        const pairings: TournamentPairing[] = [];
        const matchTime = match.match_time || '10:00';

        for (let i = 0; i < shuffled.length - 1; i += 2) {
            const teamA = shuffled[i];
            const teamB = shuffled[i + 1];

            // Increment time slightly for each match? Or same time?
            // Let's keep same time, user will edit it.
            const id = uuidv4();
            const now = Math.floor(Date.now() / 1000);

            await this.db.prepare(`
                INSERT INTO tournament_pairings (id, match_id, team_a_club_id, team_b_club_id, scheduled_time, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(id, matchId, teamA.club_id, teamB.club_id, matchTime, now).run();
        }

        return await this.getPairings(matchId);
    }

    async getNotificationCounts(userId: string): Promise<{ pendingRequests: number, modifiedParticipations: number }> {
        // Pending incoming requests (as owner)
        const pendingRes = await this.db.prepare(`
            SELECT COUNT(*) as count 
            FROM match_contacts mc
            JOIN matches m ON mc.match_id = m.id
            WHERE m.owner_id = ? AND mc.status = 'pending'
        `).bind(userId).first<any>();

        // Modified participations (as candidate)
        const modifiedRes = await this.db.prepare(`
            SELECT COUNT(*) as count 
            FROM match_contacts
            WHERE user_id = ? AND notification_state = 1
        `).bind(userId).first<any>();

        return {
            pendingRequests: pendingRes?.count || 0,
            modifiedParticipations: modifiedRes?.count || 0
        };
    }
}
