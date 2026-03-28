import useSWR, { useSWRConfig } from "swr";
import { trackConversion } from "@/utils/analytics";
import { useAuth0 } from "@auth0/auth0-react";
import { useCallback, useEffect } from "react";

import { matchService } from "../services/matches";
import {
  Match,
  CreateMatchDto,
  UpdateMatchDto,
  MatchFilters,
  ContactMatchDto,
  MatchRequest,
  MatchParticipation,
} from "../types/match.types";

const EMPTY_ARRAY: never[] = [];

interface FetchError extends Error {
  status?: number;
}

interface MatchesResponse {
  data?: Match[];
  matches?: Match[];
  total?: number;
  nextCursor?: string | null;
  hasMore?: boolean;
}

export function useMatches(filters?: MatchFilters) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { mutate: globalMutate } = useSWRConfig();

  const fetcher = async (url: string): Promise<MatchesResponse> => {
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
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      const error = new Error(
        errorData.error || "Failed to fetch matches",
      ) as FetchError;

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

  const { data, error, isLoading, mutate } = useSWR<MatchesResponse>(
    isAuthenticated ? key : null,
    fetcher,
    {
      keepPreviousData: true,
      dedupingInterval: 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  // Accessibility: Announce result count to screen readers
  useEffect(() => {
    if (!isLoading && data) {
      const count = data.total || 0;
      const message =
        count === 0
          ? "Aucun match trouvé"
          : `${count} match${count > 1 ? "s" : ""} trouvé${count > 1 ? "s" : ""}`;

      const el = document.getElementById("aria-live-announcer");

      if (el) el.textContent = message;
    }
  }, [data, isLoading]);

  const createMatch = useCallback(
    async (dto: CreateMatchDto) => {
      // Optimistic UI update: add a temporary match to the list immediately
      mutate(
        (currentData: MatchesResponse | undefined) => {
          if (!currentData) return currentData;
          const currentList = currentData.data || currentData.matches || [];

          const tempMatch = {
            ...dto,
            id: `temp-${Date.now()}`,
            owner_id: "temp",
            status: "open",
            created_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000),
            accepted_count: 0,
            club: { name: "...", logo_url: "" }, // Placeholder for required club property
          } as unknown as Match;

          return {
            ...currentData,
            data: [tempMatch, ...currentList],
            total: (currentData.total || 0) + 1,
          };
        },
        { revalidate: false },
      );

      try {
        const token = await getAccessTokenSilently();
        const newMatch = await matchService.create(dto, token);

        // Replace temp match with real one and revalidate
        mutate(
          (currentData: MatchesResponse | undefined) => {
            if (!currentData) return currentData;
            const currentList = currentData.data || currentData.matches || [];

            return {
              ...currentData,
              data: currentList.map((m: Match) =>
                m.id.startsWith("temp-") ? newMatch : m,
              ),
            };
          },
          { revalidate: true },
        );
      } catch (err) {
        // Rollback on error
        mutate();
        throw err;
      }

      // Global invalidation
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/"),
        undefined,
        { revalidate: true },
      );
    },
    [getAccessTokenSilently, globalMutate, mutate],
  );

  const updateMatch = useCallback(
    async (id: string, dto: UpdateMatchDto) => {
      mutate(
        (currentData: MatchesResponse | undefined) => {
          if (!currentData) return currentData;
          const currentList = currentData.data || currentData.matches || [];

          return {
            ...currentData,
            data: currentList.map((m: Match) =>
              m.id === id ? { ...m, ...dto } : m,
            ),
          };
        },
        { revalidate: false },
      );

      try {
        const token = await getAccessTokenSilently();

        await matchService.update(id, dto, token);
        mutate(); // Revalidate
      } catch (err) {
        mutate(); // Rollback
        throw err;
      }

      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/"),
        undefined,
        { revalidate: true },
      );
    },
    [getAccessTokenSilently, mutate, globalMutate],
  );

  const deleteMatch = useCallback(
    async (id: string) => {
      // Optimistic UI: Remove match from the current cache instantly
      mutate(
        (
          currentData:
            | {
                data?: Match[];
                matches?: Match[];
                total?: number;
                nextCursor?: string | null;
                hasMore?: boolean;
              }
            | undefined,
        ) => {
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
        (currentData: unknown) => currentData,
        { revalidate: true },
      );
    },
    [getAccessTokenSilently, mutate, globalMutate],
  );

  const contactMatch = useCallback(
    async (id: string, dto: ContactMatchDto) => {
      const token = await getAccessTokenSilently();

      await matchService.contact(id, dto, token);
      trackConversion("contact");
    },
    [getAccessTokenSilently],
  );

  const closeRegistrations = useCallback(
    async (id: string) => {
      const token = await getAccessTokenSilently();

      await matchService.closeRegistrations(id, token);
      mutate(
        (
          currentData:
            | {
                data?: Match[];
                matches?: Match[];
                total?: number;
                nextCursor?: string | null;
                hasMore?: boolean;
              }
            | undefined,
        ) => {
          if (!currentData || (!currentData.data && !currentData.matches))
            return currentData;

          const currentList = currentData.data || currentData.matches || [];

          return {
            ...currentData,
            data: currentList.map((m: Match) =>
              m.id === id ? { ...m, status: "found" as const } : m,
            ),
          };
        },
        false,
      );
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/"),
        (currentData: unknown) => currentData,
        { revalidate: true },
      );
    },
    [getAccessTokenSilently, mutate, globalMutate],
  );

  return {
    matches: data?.data ?? data?.matches ?? EMPTY_ARRAY,
    nextCursor: data?.nextCursor ?? null,
    hasMore: data?.hasMore ?? false,
    total: data?.total ?? 0,
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
  const { mutate: globalMutate } = useSWRConfig();

  const fetcher = async (url: string): Promise<{ match: Match }> => {
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
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      const error = new Error(
        errorData.error || "Failed to fetch match",
      ) as FetchError;

      error.status = response.status;
      throw error;
    }

    return response.json();
  };

  const { data, error, isLoading, mutate } = useSWR<{ match: Match }>(
    isAuthenticated && id ? `/api/matches/${id}` : null,
    fetcher,
    {
      dedupingInterval: 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  const updateMatch = useCallback(
    async (dto: UpdateMatchDto) => {
      if (!id) return;
      const token = await getAccessTokenSilently();

      await matchService.update(id, dto, token);
      mutate();
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/"),
        (currentData: unknown) => currentData,
        { revalidate: true },
      );
    },
    [id, getAccessTokenSilently, mutate, globalMutate],
  );

  const deleteMatch = useCallback(async () => {
    if (!id) return;

    // Optimistic UI: Clear local match data
    mutate(undefined, { revalidate: false });

    try {
      const token = await getAccessTokenSilently();

      await matchService.delete(id, token);
    } catch (err) {
      mutate(); // Rollback (will re-fetch)
      throw err;
    }

    // Global invalidation: refresh all /api/ keys so dashboard cleans up immediately
    globalMutate(
      (key) => typeof key === "string" && key.startsWith("/api/"),
      undefined,
      { revalidate: true },
    );
  }, [id, getAccessTokenSilently, mutate, globalMutate]);

  const contactMatch = useCallback(
    async (dto: ContactMatchDto) => {
      // Optimistic update for single match details
      mutate(
        (current: { match: Match } | undefined) => {
          if (!current || !current.match) return current;

          const optimisticContact = {
            user_id: "pending_optimistic",
            status: "pending",
            created_at: Math.floor(Date.now() / 1000),
            contacted_at: new Date().toISOString(),
            message: dto.message || "",
          };

          return {
            match: {
              ...current.match,
              contacts: [...(current.match.contacts || []), optimisticContact],
            },
          } as { match: Match };
        },
        { revalidate: false },
      );

      try {
        const token = await getAccessTokenSilently();

        await matchService.contact(id!, dto, token);
        trackConversion("contact");
        mutate(); // Re-fetch to see real data
      } catch (err) {
        mutate(); // Rollback
        throw err;
      }

      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/"),
        undefined,
        { revalidate: true },
      );
    },
    [id, getAccessTokenSilently, mutate, globalMutate],
  );

  const cancelMatchContact = useCallback(
    async (userId: string) => {
      if (!id) return;

      mutate(
        (current: { match: Match } | undefined) => {
          if (!current || !current.match) return current;

          return {
            match: {
              ...current.match,
              contacts: (current.match.contacts || []).filter(
                (c: any) => c.user_id !== userId,
              ),
            },
          } as { match: Match };
        },
        { revalidate: false },
      );

      try {
        const token = await getAccessTokenSilently();

        await matchService.cancelRequest(id, userId, token);
        mutate();
      } catch (err) {
        mutate();
        throw err;
      }

      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/"),
        undefined,
        { revalidate: true },
      );
    },
    [id, getAccessTokenSilently, mutate, globalMutate],
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
    mutate(undefined, false);
    globalMutate(
      (key) => typeof key === "string" && key.startsWith("/api/"),
      (currentData: unknown) => currentData,
      { revalidate: true },
    );
  }, [id, getAccessTokenSilently, mutate, globalMutate]);
  const updateRequestStatus = useCallback(
    async (userId: string, status: "accepted" | "refused") => {
      if (!id) return;
      mutate(
        (current: { match: Match } | undefined) => {
          if (!current || !current.match) return current;

          return {
            match: {
              ...current.match,
              contacts: (current.match.contacts || []).map((c: any) =>
                c.user_id === userId ? { ...c, status } : c,
              ),
            },
          } as { match: Match };
        },
        { revalidate: false },
      );

      try {
        const token = await getAccessTokenSilently();

        await matchService.updateRequestStatus(id, userId, status, token);
        mutate();
      } catch (err) {
        mutate();
        throw err;
      }

      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/"),
        undefined,
        { revalidate: true },
      );
    },
    [id, getAccessTokenSilently, mutate, globalMutate],
  );

  const closeRegistrations = useCallback(async () => {
    if (!id) return;

    mutate(
      (current: { match: Match } | undefined) => {
        if (!current || !current.match) return current;

        return {
          match: {
            ...current.match,
            status: "found",
          },
        } as { match: Match };
      },
      { revalidate: false },
    );

    try {
      const token = await getAccessTokenSilently();

      await matchService.closeRegistrations(id, token);
      mutate();
    } catch (err) {
      mutate();
      throw err;
    }

    globalMutate(
      (key) => typeof key === "string" && key.startsWith("/api/"),
      undefined,
      { revalidate: true },
    );
  }, [id, getAccessTokenSilently, mutate, globalMutate]);

  return {
    match: data?.match as Match,
    isLoading,
    isError: error as FetchError | undefined,
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

  const fetcher = async (
    url: string,
  ): Promise<{ requests: MatchRequest[] }> => {
    const token = await getAccessTokenSilently();
    const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      const error = new Error(
        errorData.error || "Failed to fetch requests",
      ) as FetchError;

      error.status = response.status;
      throw error;
    }

    return response.json();
  };

  const { data, error, isLoading, mutate } = useSWR(
    isAuthenticated ? "/api/matches/requests" : null,
    fetcher,
    {
      keepPreviousData: true,
      dedupingInterval: 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  return {
    requests: data?.requests ?? (EMPTY_ARRAY as unknown as MatchRequest[]),
    pendingCount: (data?.requests ?? []).filter(
      (r) => r.request_status === "pending",
    ).length,
    isLoading,
    isError: error as FetchError | undefined,
    mutate,
  };
}

export function useMyParticipations() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const fetcher = async (
    url: string,
  ): Promise<{ participations: MatchParticipation[] }> => {
    const token = await getAccessTokenSilently();
    const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      const error = new Error(
        errorData.error || "Failed to fetch participations",
      ) as FetchError;

      error.status = response.status;
      throw error;
    }

    return response.json();
  };

  const { data, error, isLoading, mutate } = useSWR(
    isAuthenticated ? "/api/matches/participations" : null,
    fetcher,
    {
      keepPreviousData: true,
      dedupingInterval: 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
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
    participations:
      data?.participations ?? (EMPTY_ARRAY as unknown as MatchParticipation[]),
    modifiedCount: (data?.participations ?? []).filter(
      (p) => p.notification_state === 1,
    ).length,
    isLoading,
    isError: error as FetchError | undefined,
    mutate,
    markAsRead,
  };
}
