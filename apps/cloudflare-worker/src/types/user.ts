import { Club } from './match';

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
    pitch_type?: string | null;
    club_colors?: string | null;
    home_jersey_color?: string | null;
    away_jersey_color?: string | null;
    stadium_address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    picture?: string | null;
    subscription: 'Free' | 'Pro' | 'Ultime';
    is_blocked?: boolean;
    block_reason?: string | null;
    additional_sirets?: (string | { siret: string; stadium_address?: string | null })[] | null;
    calendar_token?: string | null;
    push_subscription?: string | null;
    last_calendar_sync_at: number;
    calendar_dismissed: boolean;
    block_count: number;

    siret_change_count: number;
    created_at: number;
    updated_at: number;
    club?: Club;
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
    pitch_type?: string;
    club_colors?: string;
    home_jersey_color?: string;
    away_jersey_color?: string;
    stadium_address?: string;
    latitude?: number;
    longitude?: number;
    picture?: string;
    subscription?: 'Free' | 'Pro' | 'Ultime';
    additional_sirets?: (string | { siret: string; stadium_address?: string | null })[];
    calendar_token?: string;
    push_subscription?: string | null;
    last_calendar_sync_at?: number;
    calendar_dismissed?: boolean;
    block_count?: number;

    siret_change_count?: number;
}
