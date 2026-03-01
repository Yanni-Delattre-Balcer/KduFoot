
import useSWR from 'swr';
import { useAuth0 } from '@auth0/auth0-react';
import { matchService } from '../services/matches';
import { Match, CreateMatchDto, UpdateMatchDto, MatchFilters, ContactMatchDto } from '../types/match.types';
import { useCallback } from 'react';
import { useIdle } from './use-idle';

export function useMatches(filters?: MatchFilters, refreshInterval = 0) {
    const { getAccessTokenSilently } = useAuth0();
    const isIdle = useIdle();

    const fetcher = async (url: string) => {
        let token: string | null = null;
        try {
            token = await getAccessTokenSilently();
        } catch (e) {
            // Unauthenticated
        }

        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
            headers,
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

    const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
        refreshInterval: isIdle ? 0 : refreshInterval,
    });

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
        contactMatch,
        mutate,
        isIdle
    };
}

export function useMatch(id: string | null, refreshInterval = 0) {
    const { getAccessTokenSilently } = useAuth0();
    const isIdle = useIdle();

    const fetcher = async (url: string) => {
        let token: string | null = null;
        try {
            token = await getAccessTokenSilently();
        } catch (e) {
            // Unauthenticated
        }

        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
            headers,
        });
        if (!response.ok) throw new Error('Failed to fetch match');
        return response.json();
    };

    const { data, error, isLoading, mutate } = useSWR(id ? `/api/matches/${id}` : null, fetcher, {
        refreshInterval: isIdle ? 0 : refreshInterval,
    });

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

    const cancelMatchContact = useCallback(async (userId: string) => {
        if (!id) return;
        const token = await getAccessTokenSilently();
        await matchService.cancelRequest(id, userId, token);
        mutate();
    }, [id, getAccessTokenSilently, mutate]);

    const updateRequestStatus = useCallback(async (userId: string, status: 'accepted' | 'refused') => {
        if (!id) return;
        const token = await getAccessTokenSilently();
        await matchService.updateRequestStatus(id, userId, status, token);
        mutate();
    }, [id, getAccessTokenSilently, mutate]);

    return {
        match: data?.match as Match,
        isLoading,
        isError: error,
        updateMatch,
        deleteMatch,
        contactMatch,
        cancelMatchContact,
        updateRequestStatus,
        isIdle
    };
}

export function useIncomingRequests(refreshInterval = 0) {
    const { getAccessTokenSilently, isAuthenticated } = useAuth0();
    const isIdle = useIdle();

    const fetcher = async (url: string) => {
        const token = await getAccessTokenSilently();
        const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch requests');
        return response.json();
    };

    const { data, error, isLoading, mutate } = useSWR(isAuthenticated ? '/api/matches/requests' : null, fetcher, {
        refreshInterval: isIdle ? 0 : refreshInterval,
    });

    return {
        requests: data?.requests as any[] || [],
        pendingCount: (data?.requests as any[] || []).filter(r => r.request_status === 'pending').length,
        isLoading,
        isError: error,
        mutate,
        isIdle
    };
}

export function useMyParticipations(refreshInterval = 0) {
    const { getAccessTokenSilently, isAuthenticated } = useAuth0();
    const isIdle = useIdle();

    const fetcher = async (url: string) => {
        const token = await getAccessTokenSilently();
        const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch participations');
        return response.json();
    };

    const { data, error, isLoading, mutate } = useSWR(isAuthenticated ? '/api/matches/participations' : null, fetcher, {
        refreshInterval: isIdle ? 0 : refreshInterval,
    });

    const markAsRead = useCallback(async (matchId: string) => {
        const token = await getAccessTokenSilently();
        await matchService.markNotificationsAsRead(matchId, token);
        mutate();
    }, [getAccessTokenSilently, mutate]);

    return {
        participations: data?.participations as any[] || [],
        modifiedCount: (data?.participations as any[] || []).filter(p => p.notification_state === 1).length,
        isLoading,
        isError: error,
        mutate,
        markAsRead,
        isIdle
    };
}
