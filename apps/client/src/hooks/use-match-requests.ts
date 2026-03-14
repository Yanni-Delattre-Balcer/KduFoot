import useSWR from "swr";
import { useAuth0 } from "@auth0/auth0-react";

import { matchService } from "@/services/matches";

export function useMatchRequests() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const fetcher = async () => {
    const token = await getAccessTokenSilently();
    const res = await matchService.getRequests(token);

    if (!res.success) throw new Error(res.error || "Failed to fetch requests");

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
    isError: error,
    mutate,
  };
}
