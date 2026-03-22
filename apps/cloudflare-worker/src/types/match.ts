
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

export interface MatchRow extends Omit<Match, 'club' | 'contacts' | 'pairings'> {
    club_name?: string;
    club_city?: string;
    club_zip?: string;
    club_logo_url?: string;
    club_address?: string;
    club_latitude?: number;
    club_longitude?: number;
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

export interface ParticipationRequest extends MatchContact {
    match_id: string;
    match_type: 'match' | 'tournament';
    category: string;
    level?: string;
    match_date: string;
    match_time: string;
    venue: 'Domicile' | 'Extérieur';
    match_max_teams?: number;
    accepted_count: number;
    
    // Requester info (GUEST)
    requester_user_id?: string;
    requester_firstname?: string;
    requester_lastname?: string;
    requester_category?: string;
    requester_level?: string;
    requester_pitch_type?: string;
    requester_phone?: string;
    requester_email?: string;
    requester_stadium_address?: string;
    requester_club_name?: string;
    requester_club_logo?: string;
    requester_city?: string;
    requester_club_address?: string;
    
    // Host info (HOST)
    host_club_name?: string;
    host_club_logo?: string;
    host_city?: string;
    host_firstname?: string;
    host_lastname?: string;
    host_category?: string;
    host_level?: string;
    host_stadium_address?: string;
    host_email?: string;
    host_phone?: string;

    request_status: 'pending' | 'accepted' | 'refused' | 'withdrawn';
    match_status?: 'active' | 'found' | 'expired';
    location_city?: string;
    location_address?: string;
    location_zip?: string;
    match_pitch_type?: string;
}
