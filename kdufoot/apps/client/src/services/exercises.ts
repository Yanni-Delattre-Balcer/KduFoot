

import { CreateExerciseDto, UpdateExerciseDto, ExerciseFilters } from '../types/exercise.types';

const BASE_URL = '/api/exercises';

export const exerciseService = {
    getAll: async (filters: ExerciseFilters, _token: string) => {
        const query = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) query.append(key, String(value));
        });
        // We pass a dummy function for token since api helper expects a getAccessTokenSilently function
        // Refactor api.ts to accept token directly or function? 
        // Let's refactor api.ts to be more flexible or just pass a wrapper.
        // Actually, hook will handle token retrieval. Service should probably take the fetcher or token.
        // For SWR, the fetcher receives the URL.
        // Let's keep service simple: it returns the URL for SWR or executes the request for mutations.
        return `${BASE_URL}?${query.toString()}`;
    },

    create: async (data: CreateExerciseDto, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    update: async (id: string, data: UpdateExerciseDto, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    },

    delete: async (id: string, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }
};
