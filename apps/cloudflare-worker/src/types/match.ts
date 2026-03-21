
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
    club_colors?: string;
    category?: string;
    level?: string;
    pitch_type?: string;
}

export interface TournamentPairing {
    id: string;
    match_id: string;
    team_a_club_id: string;
    team_b_club_id: string;
    team_a_club_name?: string;
    team_a_club_logo?: string;
    team_b_club_name?: string;
    team_b_club_logo?: string;
    scheduled_time: string; // HH:MM
    created_at: number;
    updated_at: number;
}

export interface Match {
    id: string;
    owner_id: string;
    club_id: string;
    club?: Club; // Joined field
    type: 'match' | 'tournament';
    name?: string;
    category: string;
    level?: string;
    format: '11v11' | '8v8' | '5v5' | 'Futsal';
    match_date: string;
    match_time: string;
    match_end_time?: string;
    venue: 'Domicile' | 'Extérieur';
    location_address?: string;
    location_city?: string;
    location_zip?: string;
    pitch_type?: string;
    jersey_color?: string;
    email: string;
    phone: string;
    notes?: string;
    max_teams?: number;
    registration_fee?: number;
    status: 'active' | 'found' | 'expired';
    contacts?: MatchContact[];
    contacts_count?: number;
    accepted_count?: number;
    created_at: number;
    updated_at: number;
    distance_km?: number;
    distance_approximate?: boolean;
    pairings?: TournamentPairing[];
}

export interface CreateMatchDto {
    club_id: string;
    type: 'match' | 'tournament';
    name?: string;
    category: string;
    level?: string;
    format: '11v11' | '8v8' | '5v5' | 'Futsal';
    match_date: string;
    match_time: string;
    match_end_time?: string;
    venue: 'Domicile' | 'Extérieur';
    location_address?: string;
    location_city?: string;
    location_zip?: string;
    pitch_type?: string;
    jersey_color?: string;
    email: string;
    phone: string;
    notes?: string;
    max_teams?: number;
    registration_fee?: number;
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
    status: 'pending' | 'accepted' | 'refused' | 'withdrawn';
    notification_state?: number; // 0: none, 1: modified, 2: cancelled
    cancellation_reason?: string;
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
    cursor?: string;
    ownerId?: string; // My matches
    // Distance filtering
    radius_km?: number;
    user_lat?: number;
    user_lng?: number;
    notes?: string;
    include_past?: boolean;
    type?: string;
}

export interface ContactMatchDto {
    message: string;
}
