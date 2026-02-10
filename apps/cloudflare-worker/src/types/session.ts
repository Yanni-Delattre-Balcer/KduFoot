
import { Exercise } from './exercise';

export interface TrainingSession {
    id: string;
    user_id: string;
    name?: string;
    category?: string;
    level?: string;
    total_duration?: number;
    constraints?: string; // JSON
    status: 'draft' | 'scheduled' | 'completed';
    scheduled_date?: string;
    created_at: number;
    updated_at: number;
}

export interface SessionExercise {
    session_id: string;
    exercise_id: string;
    order_index: number;
    duration: number;
    players: number;
    adapted_data?: string; // JSON
    // Joined fields
    exercise?: Exercise;
}

export interface CreateSessionDto {
    name: string;
    category?: string;
    level?: string;
    total_duration?: number;
    constraints?: any;
    status?: 'draft' | 'scheduled' | 'completed';
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
    status?: string;
    userId?: string;
    limit?: number;
    offset?: number;
    from?: string; // Date range
    to?: string;
}
