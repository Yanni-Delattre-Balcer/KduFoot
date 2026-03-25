import useSWR from "swr";
import { useAuth0 } from "@auth0/auth0-react";

import { matchService } from "@/services/matches";
import { MatchRequest } from "@/types/match.types";

interface FetchError extends Error {
  status?: number;
}

export function useMatchRequests() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const fetcher = async (): Promise<MatchRequest[]> => {
    const token = await getAccessTokenSilently();
    const res = await matchService.getRequests(token);

    return res.requests;
  };

  const {
    data: requests = [],
    error,
    mutate,
    isLoading,
  } = useSWR(
    isAuthenticated ? "/api/matches/requests/received" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    },
  );

  return {
    requests,
    isLoading,
    isError: error as FetchError | undefined,
    mutate,
  };
}
