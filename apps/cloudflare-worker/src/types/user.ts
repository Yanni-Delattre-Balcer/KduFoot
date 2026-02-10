
export interface User {
    id: string;
    auth0_sub: string;
    email: string;
    firstname: string;
    lastname: string;
    club_id?: string | null;
    siret?: string | null;
    location?: string | null;
    phone?: string | null;
    license_id?: string | null;
    category?: string | null;
    level?: string | null;
    stadium_address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    subscription: 'Free' | 'Pro' | 'Ultime';
    created_at: number;
    updated_at: number;
}

export interface CreateUserDto {
    auth0_sub: string;
    email: string;
    firstname: string;
    lastname: string;
    picture?: string;
}

export interface UpdateUserDto {
    firstname?: string;
    lastname?: string;
    club_id?: string;
    siret?: string;
    location?: string;
    phone?: string;
    license_id?: string;
    category?: string;
    level?: string;
    stadium_address?: string;
    latitude?: number;
    longitude?: number;
    subscription?: 'Free' | 'Pro' | 'Ultime';
}
