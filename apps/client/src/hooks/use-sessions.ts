import useSWR, { useSWRConfig } from "swr";
import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";

import { sessionService } from "../services/sessions";
import {
  TrainingSession,
  SessionExercise,
  CreateSessionDto,
  UpdateSessionDto,
  SessionFilters,
} from "../types/session.types";

interface FetchError extends Error {
  status?: number;
}

export function useSessions(filters?: SessionFilters) {
  const { getAccessTokenSilently } = useAuth0();

  /**
   * SWR (Stale-While-Revalidate) is a library for data fetching.
   * It first returns the data from cache (stale), then sends the fetch request (revalidate),
   * and finally comes with the up-to-date data.
   *
   * The fetcher function is responsible for the actual network request.
   */
  const fetcher = async (
    url: string,
  ): Promise<{
    data?: TrainingSession[];
    sessions?: TrainingSession[];
    total?: number;
    nextCursor?: string | null;
    hasMore?: boolean;
  }> => {
    // We get a fresh security token from Auth0 to prove the user is logged in
    const token = await getAccessTokenSilently();
    const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      const error = new Error(
        errorData.error || "Failed to fetch sessions",
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

  const key = `/api/sessions?${query.toString()}`;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    keepPreviousData: true,
  });
  const { mutate: globalMutate } = useSWRConfig();

  /**
   * createSession, updateSession, and deleteSession are wrapped in 'useCallback'.
   * This prevents the functions from being recreated on every render,
   * which improves performance.
   */
  const createSession = useCallback(
    async (dto: CreateSessionDto) => {
      const token = await getAccessTokenSilently();

      await sessionService.create(dto, token);
      mutate(); // Tells SWR to refresh the data after a change
      // Global invalidation just in case
      globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/"),
        (currentData: unknown) => currentData,
        { revalidate: true },
      );
    },
    [getAccessTokenSilently, mutate, globalMutate],
  );

  const updateSession = useCallback(
    async (id: string, dto: UpdateSessionDto) => {
      const token = await getAccessTokenSilently();

      await sessionService.update(id, dto, token);
      mutate();
    },
    [getAccessTokenSilently, mutate],
  );

  const deleteSession = useCallback(
    async (id: string) => {
      const token = await getAccessTokenSilently();

      await sessionService.delete(id, token);
      mutate();
    },
    [getAccessTokenSilently, mutate],
  );

  return {
    sessions: data?.data ?? data?.sessions ?? [],
    nextCursor: data?.nextCursor ?? null,
    hasMore: data?.hasMore ?? false,
    total: data?.total ?? 0,
    isLoading,
    isError: error as FetchError | undefined,
    createSession,
    updateSession,
    deleteSession,
  };
}

export function useSession(id: string | null) {
  const { getAccessTokenSilently } = useAuth0();

  const fetcher = async (
    url: string,
  ): Promise<{ session: TrainingSession; exercises: SessionExercise[] }> => {
    const token = await getAccessTokenSilently();
    const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      const error = new Error(
        errorData.error || "Failed to fetch session",
      ) as FetchError;

      error.status = response.status;
      throw error;
    }

    return response.json();
  };

  const { data, error, isLoading } = useSWR(
    id ? `/api/sessions/${id}` : null,
    fetcher,
  );

  return {
    session: data?.session as TrainingSession,
    exercises: data?.exercises ?? [],
    isLoading,
    isError: error as FetchError | undefined,
  };
}
