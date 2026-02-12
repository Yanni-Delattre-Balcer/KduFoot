
export interface Match {
    id: string;
    owner_id: string;
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
    status: 'active' | 'found' | 'expired';
    created_at: number;
    updated_at: number;
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
}

export interface ContactMatchDto {
    message: string;
}
