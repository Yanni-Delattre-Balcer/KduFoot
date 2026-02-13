
import { D1Database } from '@cloudflare/workers-types';
import { Match, CreateMatchDto, UpdateMatchDto, MatchFilters, ContactMatchDto } from '../types/match';
import { v4 as uuidv4 } from 'uuid';

export class MatchService {
    constructor(private db: D1Database) { }

    async create(userId: string, dto: CreateMatchDto): Promise<Match> {
        const id = uuidv4();
        const now = Math.floor(Date.now() / 1000);

        const result = await this.db.prepare(
            `INSERT INTO matches (
        id, owner_id, club_id, category, format, match_date, match_time, 
        venue, location_address, location_city, location_zip, pitch_type,
        email, phone, notes, status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, 
        ?, ?, ?, ?, ?,
        ?, ?, ?, 'active', ?, ?
      ) RETURNING *`
        ).bind(
            id, userId, dto.club_id, dto.category, dto.format, dto.match_date, dto.match_time,
            dto.venue, dto.location_address || null, dto.location_city || null, dto.location_zip || null, dto.pitch_type || null,
            dto.email, dto.phone, dto.notes || null, now, now
        ).first<Match>();

        return result!;
    }

    async update(id: string, userId: string, dto: UpdateMatchDto): Promise<Match | null> {
        const existing = await this.getById(id);
        if (!existing) return null;
        if (existing.owner_id !== userId) throw new Error('Unauthorized');

        const keys = Object.keys(dto) as (keyof UpdateMatchDto)[];
        if (keys.length === 0) return existing;

        const setClauses: string[] = [];
        const values: any[] = [];
        for (const key of keys) {
            setClauses.push(`${key} = ?`);
            values.push(dto[key]);
        }
        setClauses.push(`updated_at = ?`);
        values.push(Math.floor(Date.now() / 1000));

        const query = `UPDATE matches SET ${setClauses.join(', ')} WHERE id = ?`;
        await this.db.prepare(query).bind(...values, id).run();

        return await this.getById(id); // Return full object with club info
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const existing = await this.getById(id);
        if (!existing) return false;
        if (existing.owner_id !== userId) throw new Error('Unauthorized');

        await this.db.prepare('DELETE FROM matches WHERE id = ?').bind(id).run();
        return true;
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

        const match = this.mapRowToMatch(result);
        match.contacts = contacts.map(c => ({
            user_id: c.user_id,
            club_id: c.club_id,
            club_name: c.club_name,
            message: c.message,
            contacted_at: new Date(c.contacted_at * 1000).toISOString()
        }));

        return match;
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
        if (!destinations.length || !apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') return distanceMap;

        // Google Distance Matrix accepts max 25 destinations per request
        const batchSize = 25;
        for (let i = 0; i < destinations.length; i += batchSize) {
            const batch = destinations.slice(i, i + batchSize);
            const destStr = batch.map(d => `${d.lat},${d.lng}`).join('|');
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destStr}&key=${apiKey}&units=metric`;

            try {
                const res = await fetch(url);
                if (!res.ok) continue;
                const data = await res.json() as any;
                if (data.rows?.[0]?.elements) {
                    data.rows[0].elements.forEach((el: any, j: number) => {
                        if (el.status === 'OK' && el.distance) {
                            distanceMap.set(i + j, el.distance.value); // meters
                        }
                    });
                }
            } catch (e) {
                console.error('Google Distance Matrix error:', e);
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
            query += ' AND m.venue = ?';
            params.push(filters.venue);
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
        // if (match.owner_id === userId) throw new Error('Cannot contact own match');

        // Check if already contacted
        // Primary key (match_id, user_id)
        try {
            await this.db.prepare(
                'INSERT INTO match_contacts (match_id, user_id, message, contacted_at) VALUES (?, ?, ?, ?)'
            ).bind(matchId, userId, dto.message, Math.floor(Date.now() / 1000)).run();
            return true;
        } catch (e: any) {
            if (e.message.includes('UNIQUE constraint failed')) {
                return true; // Already contacted, treat as success or ignore
            }
            throw e;
        }
    }
}
