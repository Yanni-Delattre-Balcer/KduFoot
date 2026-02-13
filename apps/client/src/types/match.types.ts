
/*
 * Copyright (c) 2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */

import { Category } from './exercise.types';

export interface Match {
    id: string;
    owner_id: string;
    club_id: string;
    club: Club;
    category: Category;
    format: Format;
    level?: Level;
    match_date: string; // ISO 8601
    match_time: string; // HH:MM
    venue: Venue;
    location_address?: string;
    location_city?: string;
    location_zip?: string;
    pitch_type?: PitchType;
    email: string;
    phone: string;
    notes?: string;
    status: MatchStatus;
    contacts?: MatchContact[];
    contacts_count?: number;
    created_at: string;
    updated_at: string;
    // Distance fields (returned when radius filter is active)
    distance_km?: number;
    distance_approximate?: boolean;
}

export type Format = '11v11' | '8v8' | '5v5' | 'Futsal';
export type Venue = 'Domicile' | 'Extérieur' | 'Neutre';
export type PitchType = 'Herbe' | 'Synthétique' | 'Hybride' | 'Stabilisé' | 'Indoor';
export enum Level {
    LIGUE_1 = 'Ligue 1',
    LIGUE_2 = 'Ligue 2',
    NATIONAL = 'National',
    NATIONAL_2 = 'National 2',
    NATIONAL_3 = 'National 3',
    REGIONAL_1 = 'Régional 1',
    REGIONAL_2 = 'Régional 2',
    REGIONAL_3 = 'Régional 3',
    DEPARTEMENTAL_1 = 'Départemental 1',
    DEPARTEMENTAL_2 = 'Départemental 2',
    DEPARTEMENTAL_3 = 'Départemental 3',
    DEPARTEMENTAL_4 = 'Départemental 4',
    DEPARTEMENTAL_5 = 'Départemental 5',
    AUTRE = 'Autre'
}
export type MatchStatus = 'active' | 'found' | 'expired';

export interface MatchContact {
    user_id: string;
    club_id?: string;
    club_name?: string;
    message: string;
    contacted_at: string;
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

export interface CreateMatchDto {
    club_id: string;
    category: Category;
    level?: Level;
    format: Format;
    match_date: string;
    match_time: string;
    venue: Venue;
    location_address?: string;
    location_city?: string;
    location_zip?: string;
    pitch_type?: PitchType;
    email: string;
    phone: string;
    notes?: string;
}

export interface UpdateMatchDto extends Partial<CreateMatchDto> {
    status?: MatchStatus;
}

export interface ContactMatchDto {
    message: string;
}

export interface MatchFilters {
    category?: Category;
    level?: Level;
    format?: Format;
    venue?: Venue;
    pitch_type?: PitchType;
    status?: MatchStatus;
    date?: string;
    location_city?: string;
    location_zip?: string;
    radius_km?: number;
    limit?: number;
    offset?: number;
    notes?: string;
}
