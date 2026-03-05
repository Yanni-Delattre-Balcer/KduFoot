import useSWR, { useSWRConfig } from 'swr';
import { useAuth0 } from '@auth0/auth0-react';
import { matchService } from '../services/matches';
import { Match, CreateMatchDto, UpdateMatchDto, MatchFilters, ContactMatchDto } from '../types/match.types';
import { useCallback } from 'react';

export function useMatches(filters?: MatchFilters) {
    const { getAccessTokenSilently } = useAuth0();
    const { mutate: globalMutate } = useSWRConfig();

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

    const { data, error, isLoading, mutate } = useSWR(key, fetcher);

    const createMatch = useCallback(async (dto: CreateMatchDto) => {
        const token = await getAccessTokenSilently();
        await matchService.create(dto, token);
        // Global invalidation: refresh ALL /api/matches keys (match + tournament + dashboard)
        globalMutate(
            key => typeof key === 'string' && key.includes('/api/matches'),
            undefined,
            { revalidate: true }
        );
    }, [getAccessTokenSilently, globalMutate]);

    const updateMatch = useCallback(async (id: string, dto: UpdateMatchDto) => {
        const token = await getAccessTokenSilently();
        await matchService.update(id, dto, token);
        mutate();
    }, [getAccessTokenSilently, mutate]);

    const deleteMatch = useCallback(async (id: string) => {
        // Optimistic UI: Remove match from the current cache instantly
        mutate(
            (currentData: any) => {
                if (!currentData || !currentData.matches) return currentData;
                return {
                    ...currentData,
                    matches: currentData.matches.filter((m: Match) => m.id !== id),
                    total: currentData.total - 1
                };
            },
            false // Do not revalidate immediately
        );

        const token = await getAccessTokenSilently();
        await matchService.delete(id, token);
        // Global invalidation: refresh ALL /api/matches keys across all views
        globalMutate(
            key => typeof key === 'string' && key.includes('/api/matches'),
            undefined,
            { revalidate: true }
        );
    }, [getAccessTokenSilently, mutate, globalMutate]);

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
    };
}

export function useMatch(id: string | null) {
    const { getAccessTokenSilently } = useAuth0();

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

    const cancelMatchContact = useCallback(async (userId: string) => {
        if (!id) return;
        const token = await getAccessTokenSilently();
        await matchService.cancelRequest(id, userId, token);
        mutate();
    }, [id, getAccessTokenSilently, mutate]);

    const adminDeleteMatch = useCallback(async () => {
        if (!id) return;
        const token = await getAccessTokenSilently();
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/matches/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to delete match as admin');
        }
    }, [id, getAccessTokenSilently]);
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
        adminDeleteMatch,
        contactMatch,
        cancelMatchContact,
        updateRequestStatus,
    };
}

export function useIncomingRequests() {
    const { getAccessTokenSilently, isAuthenticated } = useAuth0();

    const fetcher = async (url: string) => {
        const token = await getAccessTokenSilently();
        const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch requests');
        return response.json();
    };

    const { data, error, isLoading, mutate } = useSWR(isAuthenticated ? '/api/matches/requests' : null, fetcher);

    return {
        requests: data?.requests as any[] || [],
        pendingCount: (data?.requests as any[] || []).filter(r => r.request_status === 'pending').length,
        isLoading,
        isError: error,
        mutate,
    };
}

export function useMyParticipations() {
    const { getAccessTokenSilently, isAuthenticated } = useAuth0();

    const fetcher = async (url: string) => {
        const token = await getAccessTokenSilently();
        const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch participations');
        return response.json();
    };

    const { data, error, isLoading, mutate } = useSWR(isAuthenticated ? '/api/matches/participations' : null, fetcher);

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
    };
}
