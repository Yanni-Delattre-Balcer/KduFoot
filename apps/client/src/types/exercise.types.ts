
/*
 * Copyright (c) 2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */

export interface Exercise {
    id: string;
    user_id: string;
    title: string;
    synopsis: string;
    svg_schema: string;
    themes: Theme[];
    nb_joueurs: string;
    dimensions: string;
    materiel: string;
    category: Category;
    level: Level;
    duration: string;
    video_url?: string;
    thumbnail_url?: string;
    video_start_seconds?: number;
    created_at: string;
    updated_at: string;
}

export enum Theme {
    TECHNIQUE = 'TECHNIQUE',
    PHYSIQUE = 'PHYSIQUE',
    TACTIQUE = 'TACTIQUE',
    FINITION = 'FINITION',
    TRANSITION = 'TRANSITION',
    DEFENSE_COLLECTIVE = 'DEFENSE_COLLECTIVE',
    ATTAQUE_RAPIDE = 'ATTAQUE_RAPIDE',
    COUPS_DE_PIED_ARRETES = 'COUPS_DE_PIED_ARRETES'
}

export enum Category {
    U6 = 'U6',
    U7 = 'U7',
    U8 = 'U8',
    U9 = 'U9',
    U10 = 'U10',
    U11 = 'U11',
    U12 = 'U12',
    U13 = 'U13',
    U14 = 'U14',
    U15 = 'U15',
    U16 = 'U16',
    U17 = 'U17',
    U18 = 'U18',
    U19 = 'U19',
    U20 = 'U20',
    SENIORS = 'Séniors',
    VETERANS = 'Vétérans',
    LOISIR = 'Loisir'
}

export enum Level {
    DEBUTANT = 'Débutant',
    LIGUE = 'Ligue',
    REGIONAL = 'Régional',
    NATIONAL = 'National',
    PRO = 'Pro'
}

export interface CreateExerciseDto {
    title: string;
    synopsis: string;
    svg_schema: string;
    themes: Theme[];
    nb_joueurs: string;
    dimensions: string;
    materiel: string;
    category: Category;
    level: Level;
    duration: string;
    video_url?: string;
    thumbnail_url?: string;
}

export interface UpdateExerciseDto extends Partial<CreateExerciseDto> { }

export interface ExerciseFilters {
    search?: string;
    category?: Category;
    level?: Level;
    theme?: Theme;
    limit?: number;
    offset?: number;
}

export interface AdaptationConstraints {
    players: number;
    duration?: number;
    space?: string;
    category?: Category;
    level?: Level;
    equipment?: string;
}
