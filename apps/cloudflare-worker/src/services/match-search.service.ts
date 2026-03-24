import { D1Database } from '@cloudflare/workers-types';
import { Match, MatchFilters, MatchRow } from '../types/match';
import { MatchService } from './match.service';

export class MatchSearchService {
    private baseMatchService: MatchService;

    constructor(private db: D1Database) {
        this.baseMatchService = new MatchService(db);
    }

    async search(filters: MatchFilters, googleMapsApiKey?: string): Promise<{ data: Match[], nextCursor: string | null, hasMore: boolean }> {
        const wantDistance = filters.radius_km && filters.user_lat != null && filters.user_lng != null;

        const selectClause = `
            m.id, m.owner_id, m.club_id, m.type, m.name, m.category, m.level, m.format, m.match_date, m.match_time, m.venue, m.location_city, m.pitch_type, m.status,
            c.name as club_name, c.city as club_city, c.zip as club_zip, c.logo_url as club_logo_url,
            c.address as club_address, c.latitude as club_latitude, c.longitude as club_longitude
        `;
        // Conditionally add the aggregated accepted_count join to avoid a correlated subquery per row
        const needsTournamentJoin = !filters.ownerId && filters.type !== 'match';
        const fromClause = needsTournamentJoin
            ? "matches m LEFT JOIN clubs c ON m.club_id = c.id LEFT JOIN (SELECT match_id, COUNT(*) as accepted_count FROM match_contacts WHERE status = 'accepted' GROUP BY match_id) mc_counts ON mc_counts.match_id = m.id"
            : 'matches m LEFT JOIN clubs c ON m.club_id = c.id';

        let query = `SELECT ${selectClause} FROM ${fromClause} WHERE m.deleted_at IS NULL`;
        const params: (string | number)[] = [];

        if (filters.ownerId) {
            query += ' AND m.owner_id = ?';
            params.push(filters.ownerId);
        } else if (filters.status) {
            query += ' AND m.status = ?';
            params.push(filters.status);
        }

        if (filters.type) { query += ' AND m.type = ?'; params.push(filters.type); }
        if (filters.category) { query += ' AND m.category = ?'; params.push(filters.category); }
        if (filters.level) { query += ' AND m.level = ?'; params.push(filters.level); }
        if (filters.format) { query += ' AND m.format = ?'; params.push(filters.format); }
        
        if (filters.venue && filters.venue !== 'Peu importe') {
            let searchVenue = filters.venue;
            if (filters.venue === 'Domicile') searchVenue = 'Extérieur';
            else if (filters.venue === 'Extérieur') searchVenue = 'Domicile';
            query += ' AND m.venue = ?';
            params.push(searchVenue);
        }

        if (filters.pitch_type) { query += ' AND m.pitch_type = ?'; params.push(filters.pitch_type); }
        if (filters.location_city) {
            query += ' AND LOWER(m.location_city) LIKE ?';
            params.push('%' + filters.location_city.toLowerCase() + '%');
        }
        if (filters.location_zip) {
            query += ' AND (m.location_zip LIKE ? OR c.zip LIKE ?)';
            params.push(`${filters.location_zip}%`, `${filters.location_zip}%`);
        }

        if (filters.notes) { query += ' AND m.notes LIKE ?'; params.push(`%${filters.notes}%`); }
        if (filters.date) { query += ' AND m.match_date = ?'; params.push(filters.date); }
        if (filters.from) { query += ' AND m.match_date >= ?'; params.push(filters.from); }
        if (filters.to) { query += ' AND m.match_date <= ?'; params.push(filters.to); }

        if (!filters.date && !filters.from && !filters.to && !filters.include_past) {
            query += " AND (m.match_date > DATE('now') OR (m.match_date = DATE('now') AND m.match_time >= TIME('now')))";
        }

        if (needsTournamentJoin) {
            query += ` AND (m.type != 'tournament' OR m.status = 'active' OR (m.type = 'tournament' AND m.status = 'active' AND m.max_teams IS NOT NULL AND COALESCE(mc_counts.accepted_count, 0) < m.max_teams))`;
        }

        if (wantDistance) {
            // Pre-filter with a bounding box before calling the Google Maps API.
            // We over-expand by 1.4x to account for road vs straight-line distance difference
            // (roads are typically 20-40% longer than straight-line "crow-flies" distance).
            // 1° latitude ≈ 111 km; 1° longitude ≈ 111 km × cos(lat) due to Earth's spherical shape.
            const expandedRadius = filters.radius_km! * 1.4;
            const latDelta = expandedRadius / 111.0;
            const lngDelta = expandedRadius / (111.0 * Math.cos(filters.user_lat! * Math.PI / 180));
            query += ' AND c.latitude BETWEEN ? AND ? AND c.longitude BETWEEN ? AND ?';
            params.push(filters.user_lat! - latDelta, filters.user_lat! + latDelta, filters.user_lat! - lngDelta, filters.user_lat! + lngDelta);
        }

        if (!wantDistance && filters.cursor) {
            try {
                const cursorData = JSON.parse(globalThis.atob(filters.cursor));
                if (cursorData.date && cursorData.id) {
                    query += " AND (m.match_date > ? OR (m.match_date = ? AND m.id > ?))";
                    params.push(cursorData.date, cursorData.date, cursorData.id);
                }
            } catch (_e) { /* intentionnellement vide */ }
        }

        query += ' ORDER BY m.match_date ASC, m.id ASC';
        const limit = filters.limit || 50;
        // For distance mode: fetch up to 200 candidates from the bounding-box pre-filter,
        // then the Google Maps API refines them to exact road distances.
        // For cursor mode: fetch limit+1 to detect whether a next page exists.
        const fetchLimit = wantDistance ? 200 : limit + 1;
        query += ' LIMIT ?';
        params.push(fetchLimit);

        const { results } = await this.db.prepare(query).bind(...params).all<MatchRow>();
        let mappedResults = results.map(row => this.baseMatchService.mapRowToMatch(row));

        if (!wantDistance) {
            // Keyset (seek) pagination: if we got limit+1 results, a next page exists.
            // The cursor encodes {date, id} of the last item so the next query can resume.
            let hasMore = mappedResults.length > limit;
            if (hasMore) mappedResults.pop();
            let nextCursor: string | null = null;
            if (hasMore && mappedResults.length > 0) {
                const lastItem = mappedResults[mappedResults.length - 1];
                nextCursor = btoa(JSON.stringify({ date: lastItem.match_date, id: lastItem.id }));
            }
            return { data: mappedResults, nextCursor, hasMore };
        }

        const radiusMeters = filters.radius_km! * 1000;
        const filtered: Match[] = [];
        const matchesWithCoords = mappedResults.filter(m => m.club?.latitude != null && m.club?.longitude != null);
        const destinations = matchesWithCoords.map(m => ({ lat: m.club!.latitude!, lng: m.club!.longitude! }));
        
        const distanceMap = await this.getGoogleDistances(filters.user_lat!, filters.user_lng!, destinations, googleMapsApiKey || '');

        matchesWithCoords.forEach((match, idx) => {
            const distMeters = distanceMap.get(idx);
            if (distMeters !== undefined && distMeters <= radiusMeters) {
                match.distance_km = Math.round(distMeters / 100) / 10;
                filtered.push(match);
            } else if (distMeters === undefined) {
                const haversineDist = this.haversineKm(filters.user_lat!, filters.user_lng!, match.club!.latitude!, match.club!.longitude!);
                if (haversineDist <= filters.radius_km!) {
                    match.distance_km = Math.round(haversineDist * 10) / 10;
                    match.distance_approximate = true;
                    filtered.push(match);
                }
            }
        });

        filtered.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
        return { data: filtered.slice(0, limit), nextCursor: null, hasMore: false };
    }

    private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private async getGoogleDistances(originLat: number, originLng: number, destinations: { lat: number; lng: number }[], apiKey: string): Promise<Map<number, number>> {
        const distanceMap = new Map<number, number>();
        const validApiKey = apiKey && apiKey !== 'undefined' && apiKey !== 'null' && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
        if (!destinations.length || !validApiKey) return distanceMap;

        const batchSize = 25;
        const batchPromises: Promise<void>[] = [];
        for (let i = 0; i < destinations.length; i += batchSize) {
            const batchIndex = i;
            const batch = destinations.slice(i, i + batchSize);
            const destStr = batch.map(d => `${d.lat},${d.lng}`).join('|');
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${encodeURIComponent(destStr)}&key=${apiKey}&units=metric&mode=driving`;

            batchPromises.push(
                fetch(url).then(async res => {
                    if (!res.ok) return;
                    const data = await res.json() as any;
                    if (data.rows?.[0]?.elements) {
                        data.rows[0].elements.forEach((el: { status: string; distance?: { value: number } }, j: number) => {
                            if (el.status === 'OK' && el.distance) {
                                distanceMap.set(batchIndex + j, el.distance.value);
                            }
                        });
                    }
                }).catch(() => { /* intentionnellement vide */ })
            );
        }
        await Promise.all(batchPromises);
        return distanceMap;
    }
}
