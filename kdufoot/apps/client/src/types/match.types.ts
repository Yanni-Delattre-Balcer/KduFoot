
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
    match_date: string; // ISO 8601
    match_time: string; // HH:MM
    venue: Venue;
    email: string;
    phone: string;
    notes?: string;
    status: MatchStatus;
    contacts: MatchContact[];
    created_at: string;
    updated_at: string;
}

export type Format = '11v11' | '8v8' | '5v5' | 'Futsal';
export type Venue = 'Domicile' | 'Extérieur' | 'Neutre';
export type MatchStatus = 'active' | 'found' | 'expired';

export interface MatchContact {
    user_id: string;
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
    format: Format;
    match_date: string;
    match_time: string;
    venue: Venue;
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
    format?: Format;
    venue?: Venue;
    status?: MatchStatus;
    date?: string;
    limit?: number;
    offset?: number;
}
