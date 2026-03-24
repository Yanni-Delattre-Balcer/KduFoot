import useSWR from "swr";
import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";

import { exerciseService } from "../services/exercises";
import {
  Exercise,
  CreateExerciseDto,
  UpdateExerciseDto,
  ExerciseFilters,
} from "../types/exercise.types";

const EMPTY_ARRAY: any[] = [];

export function useExercises(filters?: ExerciseFilters) {
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
        errorData.error || "Failed to fetch exercises",
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

  const key = `/api/exercises?${query.toString()}`;

  const { data, error, isLoading, mutate } = useSWR(
    isAuthenticated ? key : null,
    fetcher,
    { keepPreviousData: true },
  );

  const createExercise = useCallback(
    async (dto: CreateExerciseDto) => {
      const token = await getAccessTokenSilently();

      await exerciseService.create(dto, token);
      mutate();
    },
    [getAccessTokenSilently, mutate],
  );

  const updateExercise = useCallback(
    async (id: string, dto: UpdateExerciseDto) => {
      const token = await getAccessTokenSilently();

      await exerciseService.update(id, dto, token);
      mutate();
    },
    [getAccessTokenSilently, mutate],
  );

  const deleteExercise = useCallback(
    async (id: string) => {
      const token = await getAccessTokenSilently();

      await exerciseService.delete(id, token);
      mutate();
    },
    [getAccessTokenSilently, mutate],
  );

  return {
    exercises:
      (data?.data as Exercise[]) ??
      (data?.exercises as Exercise[]) ??
      EMPTY_ARRAY,
    nextCursor: (data?.nextCursor as string | null) ?? null,
    hasMore: (data?.hasMore as boolean) ?? false,
    total: (data?.total as number) ?? 0,
    isLoading,
    isError: error,
    createExercise,
    updateExercise,
    deleteExercise,
  };
}

export function useExercise(id: string | null) {
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
        errorData.error || "Failed to fetch exercise",
      ) as any;

      error.status = response.status;
      throw error;
    }

    return response.json();
  };

  const { data, error, isLoading } = useSWR(
    isAuthenticated && id ? `/api/exercises/${id}` : null,
    fetcher,
  );

  return {
    exercise: data?.exercise as Exercise,
    isLoading,
    isError: error,
  };
}
