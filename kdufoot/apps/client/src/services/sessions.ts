
import { CreateSessionDto, UpdateSessionDto, SessionFilters } from '../types/session.types';

const BASE_URL = '/api/sessions';

export const sessionService = {
    getAll: (filters: SessionFilters) => {
        const query = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) query.append(key, String(value));
        });
        return `${BASE_URL}?${query.toString()}`;
    },

    create: async (data: CreateSessionDto, token: string) => {
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

    update: async (id: string, data: UpdateSessionDto, token: string) => {
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
