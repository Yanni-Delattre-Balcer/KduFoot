import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

interface UseFetchOptions extends RequestInit {
    skip?: boolean;
}

export function useFetch() {
    const { getAccessTokenSilently } = useAuth0();

    const request = useCallback(async <T>(endpoint: string, options: UseFetchOptions = {}): Promise<T> => {
        try {
            const token = await getAccessTokenSilently();
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...options.headers,
            };

            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers,
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `Request failed with status ${response.status}`);
            }

            return response.json();
        } catch (error) {
            console.error(`API Request failed: ${endpoint}`, error);
            throw error;
        }
    }, [getAccessTokenSilently]);

    return { request };
}
