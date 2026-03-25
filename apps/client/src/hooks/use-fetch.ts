/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";

interface UseFetchOptions extends RequestInit {
  skip?: boolean;
}

export function useFetch() {
  const { getAccessTokenSilently } = useAuth0();

  const request = useCallback(
    async <T>(endpoint: string, options: UseFetchOptions = {}): Promise<T> => {
      try {
        const token = await getAccessTokenSilently();
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        };

        const response = await fetch(
          `${import.meta.env.API_BASE_URL}${endpoint}`,
          {
            ...options,
            headers,
          },
        );

        if (response.status === 401) {
          try {
            const freshToken = await getAccessTokenSilently({
              cacheMode: "off",
            });
            const retryResponse = await fetch(
              `${import.meta.env.API_BASE_URL}${endpoint}`,
              {
                ...options,
                headers: {
                  ...headers,
                  Authorization: `Bearer ${freshToken}`,
                },
              },
            );

            if (retryResponse.ok) return retryResponse.json();
          } catch {
            // Refresh failed — fall through to error
          }
        }

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));

          throw new Error(
            (error as any).message ||
              `Request failed with status ${response.status}`,
          );
        }

        return response.json();
      } catch (error) {
        console.error(`API Request failed: ${endpoint}`, error);
        throw error;
      }
    },
    [getAccessTokenSilently],
  );

  return { request };
}
