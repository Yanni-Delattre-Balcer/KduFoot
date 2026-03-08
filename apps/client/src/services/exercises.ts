

import { CreateExerciseDto, UpdateExerciseDto, ExerciseFilters } from '../types/exercise.types';

const BASE_URL = '/api/exercises';

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorText = await response.text();
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || errorJson.message || errorText);
        } catch {
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }
    }
    const contentType = response.headers.get("Content-Type");
    if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format: Expected JSON");
    }
    return response.json();
};

export const exerciseService = {
    getAll: async (filters: ExerciseFilters, _token: string) => {
        const query = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) query.append(key, String(value));
        });
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
        return handleResponse(response);
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
        return handleResponse(response);
    },

    delete: async (id: string, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return handleResponse(response);
    }
};
