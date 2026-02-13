
import { CreateMatchDto, UpdateMatchDto, MatchFilters, ContactMatchDto } from '../types/match.types';

const BASE_URL = '/api/matches';

export const matchService = {
    getAll: (filters: MatchFilters) => {
        const query = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) query.append(key, String(value));
        });
        return `${BASE_URL}?${query.toString()}`;
    },

    create: async (data: CreateMatchDto, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.error || errorJson.message || errorText);
            } catch {
                throw new Error(errorText);
            }
        }
        return response.json();
    },

    update: async (id: string, data: UpdateMatchDto, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.error || errorJson.message || errorText);
            } catch {
                throw new Error(errorText);
            }
        }
        return response.json();
    },

    delete: async (id: string, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.error || errorJson.message || errorText);
            } catch {
                throw new Error(errorText);
            }
        }
        return response.json();
    },

    contact: async (id: string, data: ContactMatchDto, token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/${id}/contact`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.error || errorJson.message || errorText);
            } catch {
                throw new Error(errorText);
            }
        }
        return response.json();
    }
};
