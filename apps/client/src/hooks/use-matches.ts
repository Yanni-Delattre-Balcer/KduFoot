
import useSWR from 'swr';
import { useAuth0 } from '@auth0/auth0-react';
import { matchService } from '../services/matches';
import { Match, CreateMatchDto, UpdateMatchDto, MatchFilters, ContactMatchDto } from '../types/match.types';
import { useCallback } from 'react';

export function useMatches(filters?: MatchFilters) {
    const { getAccessTokenSilently } = useAuth0();

    const fetcher = async (url: string) => {
        const token = await getAccessTokenSilently();
        const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch matches');
        return response.json();
    };

    const query = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) query.append(key, String(value));
        });
    }

    const key = `/api/matches?${query.toString()}`;

    const { data, error, isLoading, mutate } = useSWR(key, fetcher);

    const createMatch = useCallback(async (dto: CreateMatchDto) => {
        const token = await getAccessTokenSilently();
        await matchService.create(dto, token);
        mutate();
    }, [getAccessTokenSilently, mutate]);

    const updateMatch = useCallback(async (id: string, dto: UpdateMatchDto) => {
        const token = await getAccessTokenSilently();
        await matchService.update(id, dto, token);
        mutate();
    }, [getAccessTokenSilently, mutate]);

    const deleteMatch = useCallback(async (id: string) => {
        const token = await getAccessTokenSilently();
        await matchService.delete(id, token);
        mutate();
    }, [getAccessTokenSilently, mutate]);

    const contactMatch = useCallback(async (id: string, dto: ContactMatchDto) => {
        const token = await getAccessTokenSilently();
        await matchService.contact(id, dto, token);
    }, [getAccessTokenSilently]);

    return {
        matches: data?.matches as Match[] || [],
        total: data?.total as number || 0,
        isLoading,
        isError: error,
        createMatch,
        updateMatch,
        deleteMatch,
        contactMatch
    };
}

export function useMatch(id: string | null) {
    const { getAccessTokenSilently } = useAuth0();

    const fetcher = async (url: string) => {
        const token = await getAccessTokenSilently();
        const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch match');
        return response.json();
    };

    const { data, error, isLoading, mutate } = useSWR(id ? `/api/matches/${id}` : null, fetcher);

    const updateMatch = useCallback(async (dto: UpdateMatchDto) => {
        if (!id) return;
        const token = await getAccessTokenSilently();
        await matchService.update(id, dto, token);
        mutate();
    }, [id, getAccessTokenSilently, mutate]);

    const deleteMatch = useCallback(async () => {
        if (!id) return;
        const token = await getAccessTokenSilently();
        await matchService.delete(id, token);
        // No mutate needed mostly as we navigate away, but for correctness:
        mutate(null, false);
    }, [id, getAccessTokenSilently, mutate]);

    const contactMatch = useCallback(async (dto: ContactMatchDto) => {
        if (!id) return;
        const token = await getAccessTokenSilently();
        await matchService.contact(id, dto, token);
        mutate(); // Re-fetch to see the new contact in the list
    }, [id, getAccessTokenSilently, mutate]);

    return {
        match: data?.match as Match,
        isLoading,
        isError: error,
        updateMatch,
        deleteMatch,
        contactMatch
    };
}
