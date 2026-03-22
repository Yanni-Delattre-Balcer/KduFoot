export interface Auth0User {
    sub: string;
    email: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    email_verified?: boolean;
}

export interface SiretApiResponse {
    results: Array<{
        nom_complet?: string;
        nom_raison_sociale?: string;
        activite_principale?: string;
        siege?: {
            libelle_commune?: string;
            commune?: string;
            adresse?: string;
            code_postal?: string;
            latitude?: string;
            longitude?: string;
        };
    }>;
}

export interface Club {
    id: string;
    siret: string;
    name: string;
    city: string;
    address: string;
    zip: string;
    latitude: number | null;
    longitude: number | null;
}

/** Row returned by SELECT is_blocked, block_reason FROM users */
export interface BlockedUserRow {
    is_blocked: number;
    block_reason: string | null;
}

/** JWT payload shape from Auth0 */
export interface Auth0JwtPayload {
    sub?: string;
    permissions?: string[];
    [key: string]: unknown;
}

export interface User {
    id: string;
    auth0_sub: string;
    email: string;
    firstname: string | null;
    lastname: string | null;
    picture: string | null;
    phone: string | null;
    license_id: string | null;
    club_id: string | null;
    category: string | null;
    level: string | null;
    stadium_address: string | null;
    subscription: string;
    is_blocked: boolean;
    block_count: number;
    block_reason: string | null;
    siret: string | null;
    additional_sirets: string | string[] | null;
    siret_change_count: number;
    home_jersey_color: string | null;
    away_jersey_color: string | null;
    location: string | null;
    created_at: number;
    updated_at: number;
}

