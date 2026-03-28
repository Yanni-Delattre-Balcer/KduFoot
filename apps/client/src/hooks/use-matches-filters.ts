import { useState, useMemo } from "react";

import { MatchFilters } from "@/types/match.types";
import { User } from "@/types/user.types";

export const useMatchesFilters = (
  user: User | null,
  type: "match" | "tournament",
) => {
  const [filters, setFilters] = useState<MatchFilters>({
    venue: "Peu importe",
  });
  const [radiusKm, setRadiusKm] = useState<number>(0);

  const effectiveFilters = useMemo(() => {
    const f: MatchFilters = { ...filters, type };

    if (radiusKm > 0 && user?.club?.latitude && user?.club?.longitude) {
      f.radius_km = radiusKm;
      f.user_lat = user.club.latitude;
      f.user_lng = user.club.longitude;
    }

    return f;
  }, [filters, type, radiusKm, user?.club?.latitude, user?.club?.longitude]);

  const handleFilterChange = (key: keyof MatchFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "Toutes surfaces" || !value ? undefined : value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      venue: "Peu importe",
    });
    setRadiusKm(0);
  };

  const activeFilterCount =
    Object.values(filters).filter((v) => v !== undefined).length +
    (radiusKm > 0 ? 1 : 0);

  return {
    filters,
    setFilters,
    radiusKm,
    setRadiusKm,
    effectiveFilters,
    handleFilterChange,
    clearFilters,
    activeFilterCount,
  };
};
