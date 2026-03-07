
import { Env } from '../types/env';

export interface Club {
    id: string; // RNA or SIRET
    name: string;
    city: string;
    zipcode: string;
    address: string;
    location?: { lat: number; lng: number };
}

export class ClubService {
    private static CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

    constructor(private env: Env) { }

    async searchClubs(query: string): Promise<Club[]> {
        const cacheKey = `clubs:search:${query.toLowerCase()}`;

        // CAS 1: Check KV Cache
        const cached = await this.env.KV_CACHE.get<Club[]>(cacheKey, 'json');
        if (cached) {
            return cached;
        }

        // CAS 2: Fetch from external API (recherche-entreprises.api.gouv.fr)
        // We search for "club football" + query
        try {
            const results = await this.fetchFromGouvApi(query);

            // Store in KV
            if (results.length > 0) {
                await this.env.KV_CACHE.put(cacheKey, JSON.stringify(results), {
                    expirationTtl: ClubService.CACHE_TTL
                });
            }

            return results;
        } catch (error) {
            console.error('Error fetching clubs:', error);
            return [];
        }
    }

    private async fetchFromGouvApi(query: string): Promise<Club[]> {
        const params = new URLSearchParams({
            q: `football ${query}`,
            mtm_campaign: 'kdufoot-worker',
            per_page: '20'
        });

        const response = await fetch(`${this.env.SIRET_API_URL}?${params}`);

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data: any = await response.json();

        return data.results.map((r: any) => ({
            id: r.siren,
            name: r.nom_complet,
            city: r.siege.libelle_commune,
            zipcode: r.siege.code_postal,
            address: r.siege.adresse,
            location: r.siege.latitude && r.siege.longitude
                ? { lat: parseFloat(r.siege.latitude), lng: parseFloat(r.siege.longitude) }
                : undefined
        }));
    }

    async getClubByCity(city: string): Promise<Club[]> {
        const cacheKey = `clubs:city:${city.toLowerCase()}`;

        const cached = await this.env.KV_CACHE.get<Club[]>(cacheKey, 'json');
        if (cached) return cached;

        const results = await this.searchClubs(city);

        await this.env.KV_CACHE.put(cacheKey, JSON.stringify(results), {
            expirationTtl: ClubService.CACHE_TTL
        });

        return results;
    }

    async validateSiret(siret: string): Promise<{ isValid: boolean; clubName?: string; error?: string }> {
        try {
            const params = new URLSearchParams({
                q: siret,
                mtm_campaign: 'kdufoot-worker',
                per_page: '1'
            });

            const response = await fetch(`${this.env.SIRET_API_URL}?${params}`);
            if (!response.ok) return { isValid: false, error: "Impossible de contacter l'API SIRET." };

            const data: any = await response.json();
            if (!data.results || data.results.length === 0) {
                return { isValid: false, error: "SIRET non trouvé." };
            }

            const r = data.results[0];
            const clubName = r.nom_complet;
            const ape = r.activite_principale;

            const { validateClubSiret } = await import('../utils/siret.validator');
            const validation = validateClubSiret(ape, clubName);

            if (!validation.isValid) {
                return { isValid: false, error: validation.reason, clubName };
            }

            return { isValid: true, clubName };
        } catch (error) {
            console.error('Error validating SIRET:', error);
            return { isValid: false, error: "Erreur lors de la validation du SIRET." };
        }
    }
}
