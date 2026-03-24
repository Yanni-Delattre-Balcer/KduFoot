import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MatchSearchService } from '../src/services/match-search.service';

function createMockDb() {
    const stmt = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } })
    };
    const db = {
        prepare: vi.fn().mockReturnValue(stmt),
        batch: vi.fn().mockResolvedValue([]),
        exec: vi.fn()
    };
    return { db, stmt };
}

const baseMatchRow = {
    id: 'm-1',
    owner_id: 'user-1',
    club_id: 'club-1',
    type: 'match',
    name: null,
    category: 'Seniors',
    level: 'Régional',
    format: '11v11',
    match_date: '2099-06-01',
    match_time: '15:00',
    venue: 'Domicile',
    location_city: 'Paris',
    pitch_type: 'Gazon',
    status: 'active',
    club_name: 'AS Test',
    club_city: 'Paris',
    club_zip: '75001',
    club_logo_url: null,
    club_address: '1 Rue Test',
    club_latitude: 48.8566,
    club_longitude: 2.3522
};

describe('MatchSearchService', () => {
    let service: MatchSearchService;
    let mockDb: ReturnType<typeof createMockDb>;

    beforeEach(() => {
        mockDb = createMockDb();
        service = new MatchSearchService(mockDb.db as any);
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    // ─── Basic search (no distance) ───────────────────────────────────────────

    describe('search without distance', () => {
        it('returns empty results when no matches found', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            const result = await service.search({});
            expect(result.data).toEqual([]);
            expect(result.hasMore).toBe(false);
            expect(result.nextCursor).toBeNull();
        });

        it('returns mapped matches', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [baseMatchRow] });

            const result = await service.search({});
            expect(result.data).toHaveLength(1);
            expect(result.data[0].id).toBe('m-1');
            expect(result.data[0].club?.name).toBe('AS Test');
        });

        it('applies ownerId filter', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ ownerId: 'user-1' });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('m.owner_id = ?');
        });

        it('applies status filter (only when ownerId is absent)', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ status: 'active' });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('m.status = ?');
        });

        it('does not apply status filter when ownerId is present', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ ownerId: 'user-1', status: 'active' });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            // ownerId takes precedence, status should NOT appear
            expect(query).not.toContain('m.status = ?');
        });

        it('applies type filter', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });
            await service.search({ type: 'tournament' });
            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('m.type = ?');
        });

        it('applies category filter', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });
            await service.search({ category: 'Seniors' });
            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('m.category = ?');
        });

        it('applies level filter', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });
            await service.search({ level: 'Régional' });
            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('m.level = ?');
        });

        it('applies format filter', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });
            await service.search({ format: '11v11' });
            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('m.format = ?');
        });

        it('inverts venue: Domicile search finds Extérieur matches', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ venue: 'Domicile' });

            const params = mockDb.stmt.bind.mock.calls[0] as unknown[];
            expect(params).toContain('Extérieur');
        });

        it('inverts venue: Extérieur search finds Domicile matches', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ venue: 'Extérieur' });

            const params = mockDb.stmt.bind.mock.calls[0] as unknown[];
            expect(params).toContain('Domicile');
        });

        it('does not apply venue filter when venue is "Peu importe"', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ venue: 'Peu importe' });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).not.toContain('m.venue = ?');
        });

        it('applies location_city filter with LIKE', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ location_city: 'Paris' });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('LOWER(m.location_city) LIKE ?');
            const params = mockDb.stmt.bind.mock.calls[0] as unknown[];
            expect(params).toContain('%paris%');
        });

        it('applies date filter', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });
            await service.search({ date: '2026-06-15' });
            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('m.match_date = ?');
        });

        it('applies from/to date range', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });
            await service.search({ from: '2026-01-01', to: '2026-12-31' });
            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('m.match_date >= ?');
            expect(query).toContain('m.match_date <= ?');
        });

        it('excludes past matches by default', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });
            await service.search({});
            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain("DATE('now')");
        });

        it('includes past matches when include_past is true', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });
            await service.search({ include_past: true });
            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).not.toContain("AND (m.match_date > DATE('now')");
        });

        it('detects hasMore and trims results to limit', async () => {
            const rows = Array.from({ length: 6 }, (_, i) => ({
                ...baseMatchRow, id: `m-${i}`, match_date: `2099-0${i + 1}-01`
            }));
            mockDb.stmt.all.mockResolvedValue({ results: rows });

            const result = await service.search({ limit: 5 });

            expect(result.hasMore).toBe(true);
            expect(result.data).toHaveLength(5);
        });

        it('generates base64 cursor when hasMore is true', async () => {
            const rows = Array.from({ length: 3 }, (_, i) => ({
                ...baseMatchRow, id: `m-${i}`, match_date: `2099-0${i + 1}-01`
            }));
            mockDb.stmt.all.mockResolvedValue({ results: rows });

            const result = await service.search({ limit: 2 });

            expect(result.nextCursor).not.toBeNull();
            const decoded = JSON.parse(atob(result.nextCursor!));
            expect(decoded.date).toBeDefined();
            expect(decoded.id).toBeDefined();
        });

        it('applies cursor to query for pagination', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            const cursor = btoa(JSON.stringify({ date: '2099-06-01', id: 'm-0' }));
            await service.search({ cursor });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('m.match_date > ?');
        });

        it('ignores invalid cursor without throwing', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });
            await expect(service.search({ cursor: '!!!INVALID!!!' })).resolves.toBeDefined();
        });

        it('defaults limit to 50', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });
            await service.search({});
            const params = mockDb.stmt.bind.mock.calls[0] as unknown[];
            expect(params).toContain(51); // limit + 1
        });
    });

    // ─── Search with distance (geospatial) ────────────────────────────────────

    describe('search with distance filtering', () => {
        const distanceFilters = {
            radius_km: 20,
            user_lat: 48.8566,
            user_lng: 2.3522
        };

        it('uses bounding box to pre-filter matches by lat/lng', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search(distanceFilters);

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('c.latitude BETWEEN ? AND ?');
            expect(query).toContain('c.longitude BETWEEN ? AND ?');
        });

        it('uses fetch limit of 200 for distance searches', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search(distanceFilters);

            const params = mockDb.stmt.bind.mock.calls[0] as unknown[];
            expect(params).toContain(200);
        });

        it('filters matches using Haversine when Google API key is absent', async () => {
            const nearMatch = { ...baseMatchRow, club_latitude: 48.86, club_longitude: 2.36 };
            const farMatch = { ...baseMatchRow, id: 'm-2', club_latitude: 51.50, club_longitude: -0.12 }; // London
            mockDb.stmt.all.mockResolvedValue({ results: [nearMatch, farMatch] });

            // No API key → uses Haversine fallback
            const result = await service.search(distanceFilters);

            expect(result.data.some(m => m.id === 'm-1')).toBe(true);
            expect(result.data.some(m => m.id === 'm-2')).toBe(false);
        });

        it('marks haversine results as distance_approximate', async () => {
            const nearMatch = { ...baseMatchRow, club_latitude: 48.86, club_longitude: 2.36 };
            mockDb.stmt.all.mockResolvedValue({ results: [nearMatch] });

            const result = await service.search(distanceFilters);

            expect(result.data[0].distance_approximate).toBe(true);
        });

        it('sorts results by distance ascending', async () => {
            const close = { ...baseMatchRow, id: 'close', club_latitude: 48.86, club_longitude: 2.36 };
            const medium = { ...baseMatchRow, id: 'medium', club_latitude: 48.90, club_longitude: 2.40 };
            mockDb.stmt.all.mockResolvedValue({ results: [medium, close] });

            const result = await service.search(distanceFilters);

            if (result.data.length >= 2) {
                expect((result.data[0].distance_km || 0)).toBeLessThanOrEqual(result.data[1].distance_km || 0);
            }
        });

        it('returns hasMore=false and nextCursor=null for distance searches', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            const result = await service.search(distanceFilters);

            expect(result.hasMore).toBe(false);
            expect(result.nextCursor).toBeNull();
        });

        it('does not filter by distance when club has no coordinates', async () => {
            const noCoords = { ...baseMatchRow, club_latitude: null, club_longitude: null };
            mockDb.stmt.all.mockResolvedValue({ results: [noCoords] });

            const result = await service.search(distanceFilters);

            // Match with no coords is excluded from distance results
            expect(result.data).toHaveLength(0);
        });

        it('does not call fetch (Google API) when no API key provided', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search(distanceFilters);

            expect(fetch).not.toHaveBeenCalled();
        });

        it('does not call fetch when API key is placeholder string', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search(distanceFilters, 'YOUR_GOOGLE_MAPS_API_KEY_HERE');

            expect(fetch).not.toHaveBeenCalled();
        });

        it('calls Google Maps API when valid key is provided', async () => {
            const nearMatch = { ...baseMatchRow, club_latitude: 48.86, club_longitude: 2.36 };
            mockDb.stmt.all.mockResolvedValue({ results: [nearMatch] });

            (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    rows: [{ elements: [{ status: 'OK', distance: { value: 3000 } }] }]
                })
            });

            const result = await service.search(distanceFilters, 'valid-api-key');

            expect(fetch).toHaveBeenCalledOnce();
            expect(result.data[0].distance_km).toBe(3); // 3000m = 3km
        });

        it('uses Haversine fallback when Google API call fails', async () => {
            const nearMatch = { ...baseMatchRow, club_latitude: 48.86, club_longitude: 2.36 };
            mockDb.stmt.all.mockResolvedValue({ results: [nearMatch] });

            (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

            // Should not throw, falls back to Haversine
            const result = await service.search(distanceFilters, 'valid-api-key');
            expect(result).toBeDefined();
        });

        it('uses Haversine fallback when Google API returns non-ok response', async () => {
            const nearMatch = { ...baseMatchRow, club_latitude: 48.86, club_longitude: 2.36 };
            mockDb.stmt.all.mockResolvedValue({ results: [nearMatch] });

            (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

            const result = await service.search(distanceFilters, 'valid-api-key');
            // Falls back to Haversine, near match should be included
            expect(result.data.some(m => m.id === 'm-1')).toBe(true);
        });
    });

    // ─── notes filter ─────────────────────────────────────────────────────────

    describe('notes filter', () => {
        it('applies notes LIKE filter', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ notes: 'terrain synthétique' });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('m.notes LIKE ?');
        });
    });

    // ─── location_zip filter ──────────────────────────────────────────────────

    describe('location_zip filter', () => {
        it('applies zip code prefix filter on both match and club zip', async () => {
            mockDb.stmt.all.mockResolvedValue({ results: [] });

            await service.search({ location_zip: '75' });

            const query = mockDb.db.prepare.mock.calls[0][0] as string;
            expect(query).toContain('m.location_zip LIKE ?');
            expect(query).toContain('c.zip LIKE ?');
        });
    });
});
