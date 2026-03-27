import { useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export const useMatchesNavigation = (
  view: "find" | "create",
  type: "match" | "tournament",
) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Scroll behavior and initial sync is now handled by the state being in the URL itself.

  const handleManualSearch = useCallback(() => {
    const element =
      document.getElementById("results-list") ||
      document.getElementById("results-container");

    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    const scrollRequested = searchParams.get("scroll") === "true";
    const AUTO_SCROLL_DELAY = 150;

    if (view === "find" && scrollRequested) {
      const timer = setTimeout(() => {
        const element =
          document.getElementById("results-list") ||
          document.getElementById("results-container");

        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          const nextParams = new URLSearchParams(searchParams);

          nextParams.delete("scroll");
          setSearchParams(nextParams, { replace: true });
        }
      }, AUTO_SCROLL_DELAY);

      return () => clearTimeout(timer);
    }

    if (searchParams.get("scroll_to_bottom") === "true") {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      const nextParams = new URLSearchParams(searchParams);

      nextParams.delete("scroll_to_bottom");
      setSearchParams(nextParams, { replace: true });
    }

    const scrollTs = searchParams.get("scroll_ts");

    if (scrollTs) {
      const element = document.getElementById("results-list");

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [view, type, searchParams, setSearchParams]);

  return { handleManualSearch };
};
