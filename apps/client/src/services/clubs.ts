
import { handleResponse } from './api';

const BASE_URL = '/api/clubs';

export const clubService = {
    search: async (query: string) => {
        if (!query || query.length < 3) return [];

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/search?q=${encodeURIComponent(query)}`);
            return handleResponse(response);
        } catch (error) {
            console.error('Error searching clubs:', error);
            throw error;
        }
    }
};
