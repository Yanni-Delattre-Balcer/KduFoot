
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

        const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?${params}`);

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

        // Search by city using postal code if possible or just query
        // The API is smart enough with general query
        // Can also use separate params if we had structured data
        const results = await this.searchClubs(city);

        await this.env.KV_CACHE.put(cacheKey, JSON.stringify(results), {
            expirationTtl: ClubService.CACHE_TTL
        });

        return results;
    }
}
