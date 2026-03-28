import { useEffect, useState } from "react";

/**
 * Hook to get the total number of registered coaches from the API.
 * Fetches once on mount and caches in sessionStorage for the session.
 */
export function useCoachCount() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    // Check sessionStorage first
    const cached = sessionStorage.getItem("kdufoot_coach_count");

    if (cached) {
      try {
        const parsed = JSON.parse(cached);

        if (parsed.count && Date.now() - parsed.ts < 5 * 60 * 1000) {
          setCount(parsed.count);

          return;
        }
      } catch {
        /* ignore */
      }
    }

    const apiUrl =
      import.meta.env.API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      window.location.origin;

    fetch(`${apiUrl}/api/stats/coaches`)
      .then((res) => res.json())
      .then((data: { success: boolean; count: number }) => {
        if (data.success && data.count > 0) {
          setCount(data.count);
          sessionStorage.setItem(
            "kdufoot_coach_count",
            JSON.stringify({ count: data.count, ts: Date.now() }),
          );
        }
      })
      .catch(() => {
        // Silently fail — count stays at 0
      });
  }, []);

  return count;
}
