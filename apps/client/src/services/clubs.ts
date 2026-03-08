
import { Club } from '@/types/match.types';

const BASE_URL = '/api/clubs';

export const clubService = {
    search: async (query: string): Promise<Club[]> => {
        if (!query || query.length < 3) return [];

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}${BASE_URL}/search?q=${encodeURIComponent(query)}`);

            if (!response.ok) {
                // Return empty if failure to not break UI
                console.error('Failed to search clubs');
                return [];
            }

            const data = await response.json();
            return data.clubs || [];
        } catch (error) {
            console.error('Club search error:', error);
            return [];
        }
    }
};
