
import useSWR from 'swr';
import { useAuth0 } from '@auth0/auth0-react';
import { sessionService } from '../services/sessions';
import { TrainingSession, CreateSessionDto, UpdateSessionDto, SessionFilters } from '../types/session.types';
import { useCallback } from 'react';

export function useSessions(filters?: SessionFilters) {
    const { getAccessTokenSilently } = useAuth0();

    const fetcher = async (url: string) => {
        const token = await getAccessTokenSilently();
        const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch sessions');
        return response.json();
    };

    const query = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) query.append(key, String(value));
        });
    }

    const key = `/api/sessions?${query.toString()}`;

    const { data, error, isLoading, mutate } = useSWR(key, fetcher);

    const createSession = useCallback(async (dto: CreateSessionDto) => {
        const token = await getAccessTokenSilently();
        await sessionService.create(dto, token);
        mutate();
    }, [getAccessTokenSilently, mutate]);

    const updateSession = useCallback(async (id: string, dto: UpdateSessionDto) => {
        const token = await getAccessTokenSilently();
        await sessionService.update(id, dto, token);
        mutate();
    }, [getAccessTokenSilently, mutate]);

    const deleteSession = useCallback(async (id: string) => {
        const token = await getAccessTokenSilently();
        await sessionService.delete(id, token);
        mutate();
    }, [getAccessTokenSilently, mutate]);

    return {
        sessions: data?.sessions as TrainingSession[] || [],
        total: data?.total as number || 0,
        isLoading,
        isError: error,
        createSession,
        updateSession,
        deleteSession,
    };
}

export function useSession(id: string | null) {
    const { getAccessTokenSilently } = useAuth0();

    const fetcher = async (url: string) => {
        const token = await getAccessTokenSilently();
        const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch session');
        return response.json();
    };

    const { data, error, isLoading } = useSWR(id ? `/api/sessions/${id}` : null, fetcher);

    return {
        session: data?.session as TrainingSession,
        exercises: data?.exercises as any[], // Using any[] for now or SessionExercise[]
        isLoading,
        isError: error,
    };
}
