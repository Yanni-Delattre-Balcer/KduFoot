
export interface Club {
    id: string;
    name: string;
    city: string;
    zip?: string;
    address?: string;
    logo_url?: string;
    latitude?: number;
    longitude?: number;
    siret?: string;
}

export interface Match {
    id: string;
    owner_id: string;
    club_id: string;
    club?: Club; // Joined field
    category: string;
    level?: string;
    format: '11v11' | '8v8' | '5v5' | 'Futsal';
    match_date: string;
    match_time: string;
    venue: 'Domicile' | 'Extérieur' | 'Neutre';
    location_address?: string;
    location_city?: string;
    location_zip?: string;
    pitch_type?: string;
    email: string;
    phone: string;
    notes?: string;
    status: 'active' | 'found' | 'expired';
    contacts?: MatchContact[];
    contacts_count?: number;
    created_at: number;
    updated_at: number;
    distance_km?: number;
    distance_approximate?: boolean;
}

export interface CreateMatchDto {
    club_id: string;
    category: string;
    level?: string;
    format: '11v11' | '8v8' | '5v5' | 'Futsal';
    match_date: string;
    match_time: string;
    venue: 'Domicile' | 'Extérieur' | 'Neutre';
    location_address?: string;
    location_city?: string;
    location_zip?: string;
    pitch_type?: string;
    email: string;
    phone: string;
    notes?: string;
}

export interface UpdateMatchDto extends Partial<CreateMatchDto> {
    status?: 'active' | 'found' | 'expired';
}

export interface MatchContact {
    user_id: string;
    club_id?: string;
    club_name?: string;
    message: string;
    contacted_at: string;
}

export interface MatchFilters {
    category?: string;
    level?: string;
    format?: string;
    venue?: string;
    pitch_type?: string;
    status?: string;
    date?: string; // Specific date
    location_city?: string;
    location_zip?: string;
    from?: string; // Range
    to?: string;
    limit?: number;
    offset?: number;
    ownerId?: string; // My matches
    // Distance filtering
    radius_km?: number;
    user_lat?: number;
    user_lng?: number;
    notes?: string;
    include_past?: boolean;
}

export interface ContactMatchDto {
    message: string;
}
