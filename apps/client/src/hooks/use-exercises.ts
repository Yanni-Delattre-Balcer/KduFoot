
import useSWR from 'swr';
import { useAuth0 } from '@auth0/auth0-react';
import { exerciseService } from '../services/exercises';
import { Exercise, CreateExerciseDto, UpdateExerciseDto, ExerciseFilters } from '../types/exercise.types';
import { useCallback } from 'react';

export function useExercises(filters?: ExerciseFilters) {
    const { getAccessTokenSilently } = useAuth0();

    const fetcher = async (url: string) => {
        const token = await getAccessTokenSilently();
        const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch exercises');
        return response.json();
    };

    const query = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) query.append(key, String(value));
        });
    }

    const key = `/api/exercises?${query.toString()}`;

    const { data, error, isLoading, mutate } = useSWR(key, fetcher);

    const createExercise = useCallback(async (dto: CreateExerciseDto) => {
        const token = await getAccessTokenSilently();
        await exerciseService.create(dto, token);
        mutate();
    }, [getAccessTokenSilently, mutate]);

    const updateExercise = useCallback(async (id: string, dto: UpdateExerciseDto) => {
        const token = await getAccessTokenSilently();
        await exerciseService.update(id, dto, token);
        mutate();
    }, [getAccessTokenSilently, mutate]);

    const deleteExercise = useCallback(async (id: string) => {
        const token = await getAccessTokenSilently();
        await exerciseService.delete(id, token);
        mutate();
    }, [getAccessTokenSilently, mutate]);

    return {
        exercises: data?.exercises as Exercise[] || [],
        total: data?.total as number || 0,
        isLoading,
        isError: error,
        createExercise,
        updateExercise,
        deleteExercise,
    };
}

export function useExercise(id: string | null) {
    const { getAccessTokenSilently } = useAuth0();

    const fetcher = async (url: string) => {
        const token = await getAccessTokenSilently();
        const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch exercise');
        return response.json();
    };

    const { data, error, isLoading } = useSWR(id ? `/api/exercises/${id}` : null, fetcher);

    return {
        exercise: data?.exercise as Exercise,
        isLoading,
        isError: error,
    };
}
