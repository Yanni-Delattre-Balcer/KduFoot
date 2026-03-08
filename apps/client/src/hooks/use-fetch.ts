import { useAuth0 } from '@auth0/auth0-react';
import { handleResponse } from '@/services/api';
import { useCallback } from 'react';

interface UseFetchOptions extends RequestInit {
    skip?: boolean;
    body?: any; // Added body to options for JSON.stringify
}

export function useFetch() {
    const { getAccessTokenSilently } = useAuth0();

    const request = useCallback(async <T>(url: string, options: UseFetchOptions = {}): Promise<T> => {
        try {
            const token = await getAccessTokenSilently();
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...options.headers,
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
                method: options.method || 'GET',
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined,
            });

            return handleResponse(response);
        } catch (err: any) {
            console.error(`API Request failed: ${url}`, err);
            throw err;
        }
    }, [getAccessTokenSilently]);

    return { request };
}
