/// <reference types="@cloudflare/workers-types" />
import { D1Database } from '@cloudflare/workers-types';
import { Env } from '../types/env';
import { Sentry } from '../utils/sentry';
import { fetchWithTimeout } from '../utils/fetch-utils';

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
            console.warn('Club search failed', error);
            return [];
        }
    }

    private async fetchFromGouvApi(query: string): Promise<Club[]> {
        const params = new URLSearchParams({
            q: `football ${query}`,
            mtm_campaign: 'kdufoot-worker',
            per_page: '20'
        });

        const response = await fetchWithTimeout(`${this.env.SIRET_API_URL}?${params}`);

        if (!response.ok) {
            const error = new Error(`SIRET API Error: ${response.statusText}`);
            Sentry.captureException(error, { extra: { status: response.status, query } });
            throw error;
        }

        const data = await response.json() as import("../types").SiretApiResponse;

        return data.results.map((r) => {
            const rAny = r as any;
            return {
                id: crypto.randomUUID(),
                siret: rAny.siren || '',
                name: r.nom_complet || '',
                city: r.siege?.libelle_commune || '',
                zipcode: r.siege?.code_postal || '',
                address: r.siege?.adresse || '',
                location: r.siege?.latitude && r.siege?.longitude 
                    ? { lat: parseFloat(r.siege.latitude), lng: parseFloat(r.siege.longitude) } 
                    : undefined
            } as Club;
        });
    }

    async getClubByCity(city: string): Promise<Club[]> {
        // searchClubs already handles its own KV caching, no need to double-cache here
        return this.searchClubs(city);
    }

    async validateSiret(siret: string): Promise<{ isValid: boolean; clubName?: string; error?: string }> {
        const cacheKey = `siret:validate:${siret}`;
        const cached = await this.env.KV_CACHE.get<{ isValid: boolean; clubName?: string; error?: string }>(cacheKey, 'json');
        if (cached) return cached;

        try {
            const params = new URLSearchParams({
                q: siret,
                mtm_campaign: 'kdufoot-worker',
                per_page: '1'
            });

            const response = await fetchWithTimeout(`${this.env.SIRET_API_URL}?${params}`);
            if (!response.ok) return { isValid: false, error: "Impossible de contacter l'API SIRET." };

            const data = await response.json() as import("../types").SiretApiResponse;
            if (!data.results || data.results.length === 0) {
                return { isValid: false, error: "SIRET non trouvé." };
            }

            const r = data.results[0];
            const clubName = r.nom_complet;
            const ape = r.activite_principale;

            const { validateClubSiret } = await import('../utils/siret.validator');
            const validation = validateClubSiret(ape, clubName);

            const result = validation.isValid 
                ? { isValid: true, clubName }
                : { isValid: false, error: validation.reason, clubName };

            // Cache the result for 7 days
            await this.env.KV_CACHE.put(cacheKey, JSON.stringify(result), {
                expirationTtl: ClubService.CACHE_TTL
            });

            return result;
        } catch (error) {
            console.error('Error validating SIRET:', error);
            return { isValid: false, error: "Erreur lors de la validation du SIRET." };
        }
    }
}
