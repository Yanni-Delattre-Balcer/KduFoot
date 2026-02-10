
/*
 * Copyright (c) 2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */

import { Category, Level, Exercise } from './exercise.types';

export interface TrainingSession {
    id: string;
    user_id: string;
    name?: string;
    category?: Category;
    level?: Level;
    total_duration?: number;
    constraints?: SessionConstraints;
    status: SessionStatus;
    scheduled_date?: string;
    exercises: SessionExercise[];
    created_at: string;
    updated_at: string;
}

export type SessionStatus = 'draft' | 'scheduled' | 'completed';

export interface SessionExercise {
    exercise_id: string;
    exercise: Exercise;
    order_index: number;
    duration: number;
    players: number;
    adapted_data?: Partial<Exercise>;
}

export interface SessionConstraints {
    players: number;
    duration: number;
    space?: string;
    category?: Category;
    level?: Level;
    equipment?: string;
}

export interface HistoryEntry {
    id: string;
    user_id: string;
    session_id?: string;
    session?: TrainingSession;
    completed_at: string;
    duration_seconds: number;
    notes?: string;
    created_at: string;
}

export interface CreateSessionDto {
    name: string;
    category?: Category;
    level?: Level;
    total_duration?: number;
    constraints?: SessionConstraints;
    status?: SessionStatus;
    scheduled_date?: string;
    exercises?: {
        exercise_id: string;
        order_index: number;
        duration: number;
        players: number;
        adapted_data?: any;
    }[];
}

export interface UpdateSessionDto extends Partial<CreateSessionDto> { }

export interface SessionFilters {
    status?: SessionStatus;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
}
