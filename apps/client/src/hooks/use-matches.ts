import useSWR, { useSWRConfig } from "swr";
import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";

import { matchService } from "../services/matches";
import {
  Match,
  CreateMatchDto,
  UpdateMatchDto,
  MatchFilters,
  ContactMatchDto,
} from "../types/match.types";

const EMPTY_ARRAY: any[] = [];

export function useMatches(filters?: MatchFilters) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { mutate: globalMutate } = useSWRConfig();

  const fetcher = async (url: string) => {
    let token: string | null = null;

    try {
      token = await getAccessTokenSilently();
    } catch {
      // Unauthenticated
    }

    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(
        errorData.error || "Failed to fetch matches",
      ) as any;

      error.status = response.status;
      throw error;
    }

    return response.json();
  };

  const query = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) query.append(key, String(value));
    });
  }

  const key = `/api/matches?${query.toString()}`;

  const { data, error, isLoading, mutate } = useSWR(
    isAuthenticated ? key : null,
    fetcher,
    { keepPreviousData: true },
  );

  const createMatch = useCallback(
    async (dto: CreateMatchDto) => {
      const token = await getAccessTokenSilently();

      // Optimistic UI update: Wait for DB insertion then mutate globally instantly
      const newMatch = await matchService.create(dto, token);

      mutate(
        (currentData: any) => {
          if (!currentData || (!currentData.data && !currentData.matches))
            return currentData;

          const currentList = currentData.data || currentData.matches || [];

          return {
            ...currentData,
            data: [newMatch, ...currentList],
            total: (currentData.total || 0) + 1,
          };
        },
        false, // Do not immediately send a GET request behind since we just added it
      );

      // Global invalidation: refresh ALL /api keys
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/"),
        (currentData: any) => currentData,
        { revalidate: true },
      );
    },
    [getAccessTokenSilently, globalMutate, mutate],
  );

  const updateMatch = useCallback(
    async (id: string, dto: UpdateMatchDto) => {
      const token = await getAccessTokenSilently();

      await matchService.update(id, dto, token);
      mutate();
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/"),
        (currentData: any) => currentData,
        { revalidate: true },
      );
    },
    [getAccessTokenSilently, mutate, globalMutate],
  );

  const deleteMatch = useCallback(
    async (id: string) => {
      // Optimistic UI: Remove match from the current cache instantly
      mutate(
        (currentData: any) => {
          if (!currentData || (!currentData.data && !currentData.matches))
            return currentData;

          const currentList = currentData.data || currentData.matches || [];

          return {
            ...currentData,
            data: currentList.filter((m: Match) => m.id !== id),
            total: (currentData.total || 0) - 1,
          };
        },
        false, // Do not revalidate immediately
      );

      const token = await getAccessTokenSilently();

      await matchService.delete(id, token);
      // Global invalidation: refresh ALL /api/matches keys across all views
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/"),
        (currentData: any) => currentData,
        { revalidate: true },
      );
    },
    [getAccessTokenSilently, mutate, globalMutate],
  );

  const contactMatch = useCallback(
    async (id: string, dto: ContactMatchDto) => {
      const token = await getAccessTokenSilently();

      await matchService.contact(id, dto, token);
    },
    [getAccessTokenSilently],
  );

  const closeRegistrations = useCallback(
    async (id: string) => {
      const token = await getAccessTokenSilently();

      await matchService.closeRegistrations(id, token);
      mutate((currentData: any) => {
        if (!currentData || (!currentData.data && !currentData.matches))
          return currentData;

        const currentList = currentData.data || currentData.matches || [];

        return {
          ...currentData,
          data: currentList.map((m: Match) =>
            m.id === id ? { ...m, status: "found" } : m,
          ),
        };
      }, false);
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/"),
        (currentData: any) => currentData,
        { revalidate: true },
      );
    },
    [getAccessTokenSilently, mutate, globalMutate],
  );

  return {
    matches:
      (data?.data as Match[]) ?? (data?.matches as Match[]) ?? EMPTY_ARRAY,
    nextCursor: (data?.nextCursor as string | null) ?? null,
    hasMore: (data?.hasMore as boolean) ?? false,
    total: (data?.total as number) ?? 0,
    isLoading,
    isError: error,
    createMatch,
    updateMatch,
    deleteMatch,
    contactMatch,
    closeRegistrations,
    mutate,
  };
}

export function useMatch(id: string | null) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const fetcher = async (url: string) => {
    let token: string | null = null;

    try {
      token = await getAccessTokenSilently();
    } catch {
      // Unauthenticated
    }

    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(
        errorData.error || "Failed to fetch match",
      ) as any;

      error.status = response.status;
      throw error;
    }

    return response.json();
  };

  const { data, error, isLoading, mutate } = useSWR(
    isAuthenticated && id ? `/api/matches/${id}` : null,
    fetcher,
  );

  const updateMatch = useCallback(
    async (dto: UpdateMatchDto) => {
      if (!id) return;
      const token = await getAccessTokenSilently();

      await matchService.update(id, dto, token);
      mutate();
    },
    [id, getAccessTokenSilently, mutate],
  );

  const deleteMatch = useCallback(async () => {
    if (!id) return;
    const token = await getAccessTokenSilently();

    await matchService.delete(id, token);
    // No mutate needed mostly as we navigate away, but for correctness:
    mutate(null, false);
  }, [id, getAccessTokenSilently, mutate]);

  const contactMatch = useCallback(
    async (dto: ContactMatchDto) => {
      if (!id) return;
      const token = await getAccessTokenSilently();

      await matchService.contact(id, dto, token);
      mutate(); // Re-fetch to see the new contact in the list
    },
    [id, getAccessTokenSilently, mutate],
  );

  const cancelMatchContact = useCallback(
    async (userId: string) => {
      if (!id) return;
      const token = await getAccessTokenSilently();

      await matchService.cancelRequest(id, userId, token);
      mutate();
    },
    [id, getAccessTokenSilently, mutate],
  );

  const adminDeleteMatch = useCallback(async () => {
    if (!id) return;
    const token = await getAccessTokenSilently();
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/admin/matches/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));

      throw new Error(err.error || "Failed to delete match as admin");
    }
  }, [id, getAccessTokenSilently]);
  const updateRequestStatus = useCallback(
    async (userId: string, status: "accepted" | "refused") => {
      if (!id) return;
      const token = await getAccessTokenSilently();

      await matchService.updateRequestStatus(id, userId, status, token);
      mutate();
    },
    [id, getAccessTokenSilently, mutate],
  );

  const closeRegistrations = useCallback(async () => {
    if (!id) return;
    const token = await getAccessTokenSilently();

    await matchService.closeRegistrations(id, token);
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
    closeRegistrations,
  };
}

export function useIncomingRequests() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const fetcher = async (url: string) => {
    const token = await getAccessTokenSilently();
    const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(
        errorData.error || "Failed to fetch requests",
      ) as any;

      error.status = response.status;
      throw error;
    }

    return response.json();
  };

  const { data, error, isLoading, mutate } = useSWR(
    isAuthenticated ? "/api/matches/requests" : null,
    fetcher,
    { keepPreviousData: true },
  );

  return {
    requests: (data?.requests as any[]) ?? EMPTY_ARRAY,
    pendingCount: ((data?.requests as any[]) ?? EMPTY_ARRAY).filter(
      (r) => r.request_status === "pending",
    ).length,
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(
        errorData.error || "Failed to fetch participations",
      ) as any;

      error.status = response.status;
      throw error;
    }

    return response.json();
  };

  const { data, error, isLoading, mutate } = useSWR(
    isAuthenticated ? "/api/matches/participations" : null,
    fetcher,
    { keepPreviousData: true },
  );

  const markAsRead = useCallback(
    async (matchId: string) => {
      const token = await getAccessTokenSilently();

      await matchService.markNotificationsAsRead(matchId, token);
      mutate();
    },
    [getAccessTokenSilently, mutate],
  );

  return {
    participations: (data?.participations as any[]) ?? EMPTY_ARRAY,
    modifiedCount: ((data?.participations as any[]) ?? EMPTY_ARRAY).filter(
      (p) => p.notification_state === 1,
    ).length,
    isLoading,
    isError: error,
    mutate,
    markAsRead,
  };
}
