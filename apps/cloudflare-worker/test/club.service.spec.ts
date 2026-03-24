import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ClubService } from '../src/services/club.service';

// Mock the dynamic import of siret.validator inside ClubService.validateSiret
vi.mock('../src/utils/siret.validator', () => ({
    validateClubSiret: vi.fn().mockReturnValue({ isValid: true })
}));

import { validateClubSiret } from '../src/utils/siret.validator';

function createMockEnv(kvOverrides?: Partial<{ get: any; put: any }>) {
    return {
        KV_CACHE: {
            get: vi.fn().mockResolvedValue(null),
            put: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
            ...kvOverrides
        },
        SIRET_API_URL: 'https://api.test/search',
        DB: {} as any,
        RATE_LIMITER: {} as any,
        WEBSOCKET_HUB: {} as any
    } as any;
}

const mockGouvApiResponse = {
    results: [
        {
            nom_complet: 'AS TEST FOOTBALL',
            activite_principale: '93.12Z',
            siren: '123456789',
            siege: {
                libelle_commune: 'Paris',
                code_postal: '75001',
                adresse: '1 Rue de la Paix',
                latitude: '48.8566',
                longitude: '2.3522'
            }
        }
    ]
};

describe('ClubService', () => {
    let service: ClubService;
    let mockEnv: ReturnType<typeof createMockEnv>;

    beforeEach(() => {
        mockEnv = createMockEnv();
        service = new ClubService(mockEnv);
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    // ─── searchClubs ──────────────────────────────────────────────────────────

    describe('searchClubs', () => {
        it('returns cached results without calling API', async () => {
            const cached = [{ id: '1', name: 'Cached Club', city: 'Lyon', zipcode: '69001', address: '' }];
            mockEnv.KV_CACHE.get.mockResolvedValue(cached);

            const result = await service.searchClubs('lyon');

            expect(result).toEqual(cached);
            expect(fetch).not.toHaveBeenCalled();
        });

        it('fetches from API on cache miss and stores result', async () => {
            mockEnv.KV_CACHE.get.mockResolvedValue(null);
            (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockGouvApiResponse)
            });

            const result = await service.searchClubs('paris');

            expect(fetch).toHaveBeenCalledOnce();
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('AS TEST FOOTBALL');
            expect(result[0].city).toBe('Paris');
            expect(mockEnv.KV_CACHE.put).toHaveBeenCalled();
        });

        it('includes "football" prefix in API query', async () => {
            mockEnv.KV_CACHE.get.mockResolvedValue(null);
            (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ results: [] })
            });

            await service.searchClubs('nantes');

            const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
            expect(calledUrl).toContain('football');
            expect(calledUrl).toContain('nantes');
        });

        it('does not cache empty results', async () => {
            mockEnv.KV_CACHE.get.mockResolvedValue(null);
            (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ results: [] })
            });

            await service.searchClubs('unknown');

            expect(mockEnv.KV_CACHE.put).not.toHaveBeenCalled();
        });

        it('returns empty array on API error', async () => {
            mockEnv.KV_CACHE.get.mockResolvedValue(null);
            (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

            const result = await service.searchClubs('error');
            expect(result).toEqual([]);
        });

        it('returns empty array on non-ok API response', async () => {
            mockEnv.KV_CACHE.get.mockResolvedValue(null);
            (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: false,
                statusText: 'Service Unavailable'
            });

            const result = await service.searchClubs('down');
            expect(result).toEqual([]);
        });

        it('maps latitude/longitude to location object', async () => {
            mockEnv.KV_CACHE.get.mockResolvedValue(null);
            (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockGouvApiResponse)
            });

            const result = await service.searchClubs('paris');

            expect(result[0].location).toEqual({ lat: 48.8566, lng: 2.3522 });
        });

        it('sets location to undefined when coordinates are missing', async () => {
            const responseWithoutCoords = {
                results: [{
                    nom_complet: 'Club sans coords',
                    activite_principale: '93.12Z',
                    siren: '999',
                    siege: { libelle_commune: 'Ville', code_postal: '01000', adresse: '1 Rue' }
                }]
            };
            mockEnv.KV_CACHE.get.mockResolvedValue(null);
            (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(responseWithoutCoords)
            });

            const result = await service.searchClubs('test');
            expect(result[0].location).toBeUndefined();
        });

        it('uses lowercased query as cache key', async () => {
            mockEnv.KV_CACHE.get.mockResolvedValue(null);
            (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ results: [] })
            });

            await service.searchClubs('PARIS');

            const cacheKey = mockEnv.KV_CACHE.get.mock.calls[0][0] as string;
            expect(cacheKey).toBe('clubs:search:paris');
        });
    });

    // ─── getClubByCity ────────────────────────────────────────────────────────

    describe('getClubByCity', () => {
        it('delegates to searchClubs with the city name', async () => {
            const cached = [{ id: '1', name: 'FC Lyon', city: 'Lyon', zipcode: '69001', address: '' }];
            mockEnv.KV_CACHE.get.mockResolvedValue(cached);

            const result = await service.getClubByCity('Lyon');

            expect(result).toEqual(cached);
        });
    });

    // ─── validateSiret ────────────────────────────────────────────────────────

    describe('validateSiret', () => {
        it('returns cached validation result', async () => {
            const cached = { isValid: true, clubName: 'AS Test' };
            mockEnv.KV_CACHE.get.mockResolvedValue(cached);

            const result = await service.validateSiret('12345678901234');

            expect(result).toEqual(cached);
            expect(fetch).not.toHaveBeenCalled();
        });

        it('returns invalid when SIRET not found in API', async () => {
            mockEnv.KV_CACHE.get.mockResolvedValue(null);
            (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ results: [] })
            });

            const result = await service.validateSiret('00000000000000');

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('SIRET non trouvé');
        });

        it('returns invalid when API returns non-ok response', async () => {
            mockEnv.KV_CACHE.get.mockResolvedValue(null);
            (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

            const result = await service.validateSiret('12345678901234');

            expect(result.isValid).toBe(false);
            expect(result.error).toContain("Impossible de contacter");
        });

        it('returns valid when validateClubSiret passes', async () => {
            mockEnv.KV_CACHE.get.mockResolvedValue(null);
            (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    results: [{ nom_complet: 'AS FOOTBALL TEST', activite_principale: '93.12Z' }]
                })
            });
            (validateClubSiret as ReturnType<typeof vi.fn>).mockReturnValue({ isValid: true });

            const result = await service.validateSiret('12345678901234');

            expect(result.isValid).toBe(true);
            expect(result.clubName).toBe('AS FOOTBALL TEST');
        });

        it('returns invalid with reason when validateClubSiret fails', async () => {
            mockEnv.KV_CACHE.get.mockResolvedValue(null);
            (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    results: [{ nom_complet: 'TENNIS CLUB', activite_principale: '93.19Z' }]
                })
            });
            (validateClubSiret as ReturnType<typeof vi.fn>).mockReturnValue({
                isValid: false,
                reason: 'Autre sport détecté'
            });

            const result = await service.validateSiret('12345678901234');

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Autre sport détecté');
        });

        it('caches valid validation result for 7 days', async () => {
            mockEnv.KV_CACHE.get.mockResolvedValue(null);
            (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    results: [{ nom_complet: 'FC TEST', activite_principale: '93.12Z' }]
                })
            });
            (validateClubSiret as ReturnType<typeof vi.fn>).mockReturnValue({ isValid: true });

            await service.validateSiret('12345678901234');

            expect(mockEnv.KV_CACHE.put).toHaveBeenCalledWith(
                expect.stringContaining('siret:validate:'),
                expect.any(String),
                expect.objectContaining({ expirationTtl: 60 * 60 * 24 * 7 })
            );
        });

        it('returns error on network failure', async () => {
            mockEnv.KV_CACHE.get.mockResolvedValue(null);
            (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

            const result = await service.validateSiret('12345678901234');

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Erreur lors de la validation');
        });
    });
});
