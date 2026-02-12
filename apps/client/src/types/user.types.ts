export interface User {
    id: string;
    auth0_sub: string;
    email: string;
    firstname: string;
    lastname: string;
    club_id?: string | null;
    siret?: string | null;
    location?: string | null; // This is actually the user's city
    phone?: string | null;
    license_id?: string | null;
    category?: string | null;
    level?: string | null;
    stadium_address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    picture?: string | null;
    subscription: 'Free' | 'Pro' | 'Ultime';
    created_at: number;
    updated_at: number;
    club?: Club; // Computed/Joined field if needed
}

export interface Club {
    id: string;
    siret: string;
    name: string;
    city: string;
    address?: string;
    zip?: string;
    logo_url?: string;
    latitude?: number;
    longitude?: number;
}

export interface LinkClubDto {
    siret: string;
}
