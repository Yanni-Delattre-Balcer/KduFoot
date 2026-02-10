
export interface Exercise {
    id: string;
    user_id: string;
    title: string;
    synopsis?: string;
    svg_schema?: string;
    themes: string; // JSON string in DB
    nb_joueurs?: string;
    dimensions?: string;
    materiel?: string;
    category?: string;
    level?: string;
    duration?: string;
    video_url?: string;
    thumbnail_url?: string;
    video_start_seconds?: number;
    created_at: number;
    updated_at: number;
}

export interface CreateExerciseDto {
    title: string;
    synopsis?: string;
    svg_schema?: string;
    themes?: string[]; // Array in DTO
    nb_joueurs?: string;
    dimensions?: string;
    materiel?: string;
    category?: string;
    level?: string;
    duration?: string;
    video_url?: string;
    thumbnail_url?: string;
    video_start_seconds?: number;
}

export interface UpdateExerciseDto extends Partial<CreateExerciseDto> { }

export interface ExerciseFilters {
    category?: string;
    level?: string;
    theme?: string;
    search?: string;
    limit?: number;
    offset?: number;
    userId?: string; // To filter by my exercises vs all (if public library exists)
}
