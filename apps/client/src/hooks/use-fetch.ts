import { useAuth0 } from '@auth0/auth0-react';
import { handleResponse } from '@/services/api';
import { useCallback } from 'react';

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

            const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
                ...options,
                headers,
            });

            return handleResponse(response);
        } catch (error) {
            console.error(`API Request failed: ${endpoint}`, error);
            throw error;
        }
    }, [getAccessTokenSilently]);

    return { request };
}
