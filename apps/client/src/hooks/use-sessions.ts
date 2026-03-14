import useSWR, { useSWRConfig } from "swr";
import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";

import { sessionService } from "../services/sessions";
import {
  TrainingSession,
  CreateSessionDto,
  UpdateSessionDto,
  SessionFilters,
} from "../types/session.types";

export function useSessions(filters?: SessionFilters) {
  const { getAccessTokenSilently } = useAuth0();

  /**
   * SWR (Stale-While-Revalidate) is a library for data fetching.
   * It first returns the data from cache (stale), then sends the fetch request (revalidate),
   * and finally comes with the up-to-date data.
   *
   * The fetcher function is responsible for the actual network request.
   */
  const fetcher = async (url: string) => {
    // We get a fresh security token from Auth0 to prove the user is logged in
    const token = await getAccessTokenSilently();
    const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to fetch sessions");

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
        (currentData: any) => currentData,
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
    sessions: (data?.sessions as TrainingSession[]) || [],
    total: (data?.total as number) || 0,
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

    if (!response.ok) throw new Error("Failed to fetch session");

    return response.json();
  };

  const { data, error, isLoading } = useSWR(
    id ? `/api/sessions/${id}` : null,
    fetcher,
  );

  return {
    session: data?.session as TrainingSession,
    exercises: data?.exercises as any[], // Using any[] for now or SessionExercise[]
    isLoading,
    isError: error,
  };
}
