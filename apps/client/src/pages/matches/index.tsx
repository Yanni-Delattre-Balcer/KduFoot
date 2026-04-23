import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSWRConfig } from "swr";
import { addToast } from "@heroui/toast";
import { Button } from "@heroui/button";
import { useSearchParams } from "react-router-dom";

import { useUser } from "../../hooks/use-user";
import { useMatches } from "../../hooks/use-matches";
import DefaultLayout from "../../layouts/default";

import { useFavorites } from "@/hooks/use-favorites";
import { useWelcomeGateway } from "@/contexts/welcome-gateway-context";
import { useAuth } from "@/authentication";
import DataWall from "@/components/data-wall";
import MatchForm from "@/components/matches/match-form";
import TournamentForm from "@/components/matches/tournament-form";

// New Hooks
import { useMatchesNavigation } from "@/hooks/use-matches-navigation";
import { useMatchesCalendar } from "@/hooks/use-matches-calendar";
import { useMatchesFilters } from "@/hooks/use-matches-filters";

// New Components
import { SearchHero } from "@/components/matches/list/search-hero";
import { FilterSection } from "@/components/matches/list/filter-section";
import { CalendarView } from "@/components/matches/list/calendar-view";
import { ResultsList } from "@/components/matches/list/results-list";
import { Match } from "@/types/match.types";

export default function MatchesPage() {
  const { t, i18n } = useTranslation("kdufoot");

  useWelcomeGateway();

  const { user, profileComplete, isAdmin } = useUser();
  const { isAuthenticated, getAccessToken } = useAuth();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { mutate: globalMutate } = useSWRConfig();

  const [searchParams, setSearchParams] = useSearchParams();
  const view = (searchParams.get("view") as "find" | "create") || "find";
  const type = (searchParams.get("type") as "match" | "tournament") || "match";

  const setView = (v: "find" | "create") => {
    setSearchParams(
      (prev: URLSearchParams) => {
        const next = new URLSearchParams(prev);

        next.set("view", v);

        return next;
      },
      { replace: true },
    );
  };

  const setType = (t: "match" | "tournament") => {
    setSearchParams(
      (prev: URLSearchParams) => {
        const next = new URLSearchParams(prev);

        next.set("type", t);

        return next;
      },
      { replace: true },
    );
  };

  const isMasked = !isAuthenticated || !profileComplete;
  const canUseDistance = !!(user?.club?.latitude && user?.club?.longitude);

  // --- Hooks Logic ---
  const { handleManualSearch } = useMatchesNavigation(view, type);
  const {
    filters,
    radiusKm,
    setRadiusKm,
    effectiveFilters,
    handleFilterChange,
    clearFilters,
    activeFilterCount,
  } = useMatchesFilters(user || null, type);

  const { matches, isError, isLoading } = useMatches(effectiveFilters);

  const {
    displayMode,
    setDisplayMode,
    calendarMonth,
    selectedDate,
    setSelectedDate,
    matchesByDate,
    prevMonth,
    nextMonth,
    getMonthName,
    dayNames,
  } = useMatchesCalendar(matches, type);

  // --- Match Action Logic (Accepted Changes) ---
  const [acceptedMatches, setAcceptedMatches] = useState<Record<string, Match>>(
    () => {
      try {
        const saved = localStorage.getItem(
          `kdufoot_accepted_matches_${user?.id || "guest"}`,
        );

        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    },
  );

  const handleAcceptChanges = useCallback(
    (match: Match) => {
      setAcceptedMatches((prev) => {
        const next = { ...prev, [match.id]: { ...match } };

        localStorage.setItem(
          `kdufoot_accepted_matches_${user?.id || "guest"}`,
          JSON.stringify(next),
        );
        window.dispatchEvent(new CustomEvent("kdufoot_matches_updated"));

        return next;
      });
    },
    [user?.id],
  );

  const getDiff = useCallback(
    (currentMatch: Match) => {
      const accepted = acceptedMatches[currentMatch.id];

      if (!accepted) return {};
      const diff: Record<string, boolean> = {};
      const fieldsToCompare: (keyof Match)[] = [
        "match_date",
        "match_time",
        "venue",
        "location_city",
        "pitch_type",
        "category",
        "registration_fee",
        "name",
        "max_teams",
      ];

      fieldsToCompare.forEach((field) => {
        if (currentMatch[field] !== accepted[field]) diff[field] = true;
      });

      return diff;
    },
    [acceptedMatches],
  );

  // --- Admin Logic ---
  const adminDeleteMatch = useCallback(
    async (matchId: string) => {
      const matchTypeLabel = t(`enums.type.${type}`).toUpperCase();

      if (
        !confirm(
          t("match.confirm_delete_admin", "⚠️ SUPPRIMER {{matchType}} ?", {
            matchType: matchTypeLabel,
          }),
        )
      )
        return;
      try {
        const token = await getAccessToken({
          authorizationParams: { audience: import.meta.env.AUTH0_AUDIENCE },
        });
        const res = await fetch(
          `${import.meta.env.API_BASE_URL}/api/admin/matches/${matchId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!res.ok) throw new Error("Erreur lors de la suppression");
        addToast({
          title: t("match.delete_success_admin", "{{matchType}} supprimé", {
            matchType: t(`enums.type.${type}`),
          }),
          variant: "solid",
          color: "success",
          timeout: 5000,
        });
        globalMutate(
          (key: unknown) =>
            typeof key === "string" && key.includes("/api/matches"),
          undefined,
          { revalidate: true },
        );
      } catch (err: any) {
        addToast({
          title: t("error.title"),
          description: err.message,
          variant: "solid",
          color: "danger",
          timeout: 5000,
        });
      }
    },
    [getAccessToken, globalMutate, type, t],
  );

  const handleCreateSuccess = () => {
    globalMutate(
      (key: unknown) => typeof key === "string" && key.includes("/api/matches"),
      undefined,
      { revalidate: true },
    );
    setView("find");
  };

  const handleDayClick = (dateKey: string) => {
    if (selectedDate === dateKey) {
      setSelectedDate(null);
      handleFilterChange("date", "");
    } else {
      setSelectedDate(dateKey);
      handleFilterChange("date", dateKey);
    }
  };

  const filteredMatches = (
    selectedDate
      ? matches.filter((m) => m.match_date === selectedDate)
      : matches
  ).filter((m) => m.status !== "found" && m.type === type);

  return (
    <DefaultLayout maxWidth="max-w-full">
      <section className="flex flex-col gap-6 w-full px-4">
        <SearchHero
          handleManualSearch={handleManualSearch}
          isMasked={isMasked}
          setType={setType}
          setView={setView}
          type={type}
          view={view}
        />

        <div
          className="flex flex-col gap-6 animate-appearance-in pb-20"
          id="results-container"
        >
          {view === "create" ? (
            <DataWall message={t("match.create_warning")}>
              {type === "match" ? (
                <MatchForm onSuccess={handleCreateSuccess} />
              ) : (
                <TournamentForm onSuccess={handleCreateSuccess} />
              )}
            </DataWall>
          ) : (
            <DataWall message={t("match.search_warning")}>
              <div className="flex flex-col gap-5">
                <FilterSection
                  activeFilterCount={activeFilterCount}
                  canUseDistance={canUseDistance}
                  clearFilters={clearFilters}
                  filters={filters}
                  handleFilterChange={handleFilterChange}
                  radiusKm={radiusKm}
                  setRadiusKm={setRadiusKm}
                  type={type}
                  user={user || null}
                />

                <div className="flex items-center gap-2 px-1">
                  <div className="flex gap-1 p-0.5 rounded-xl bg-default-100/50">
                    <Button
                      className={displayMode === "list" ? "font-bold" : ""}
                      color={displayMode === "list" ? "secondary" : "default"}
                      size="sm"
                      variant={displayMode === "list" ? "solid" : "light"}
                      onPress={() => setDisplayMode("list")}
                    >
                      {t("matchesPage.view.list")}
                    </Button>
                    <Button
                      className={displayMode === "calendar" ? "font-bold" : ""}
                      color={
                        displayMode === "calendar" ? "secondary" : "default"
                      }
                      size="sm"
                      variant={displayMode === "calendar" ? "solid" : "light"}
                      onPress={() => setDisplayMode("calendar")}
                    >
                      {t("matchesPage.view.calendar")}
                    </Button>
                  </div>
                  {selectedDate && (
                    <Button
                      color="danger"
                      size="sm"
                      variant="light"
                      onPress={() => handleDayClick(selectedDate)}
                    >
                      ✕{" "}
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                        i18n.language,
                        { day: "numeric", month: "short" },
                      )}
                    </Button>
                  )}
                </div>

                {displayMode === "calendar" && (
                  <CalendarView
                    calendarMonth={calendarMonth}
                    dayNames={dayNames}
                    getMonthName={getMonthName}
                    handleDayClick={handleDayClick}
                    matchesByDate={matchesByDate}
                    nextMonth={nextMonth}
                    prevMonth={prevMonth}
                    selectedDate={selectedDate}
                  />
                )}

                {displayMode === "list" && (
                  <ResultsList
                    adminDeleteMatch={adminDeleteMatch}
                    filteredMatches={filteredMatches}
                    getDiff={getDiff}
                    globalMutate={globalMutate}
                    handleAcceptChanges={handleAcceptChanges}
                    isAdmin={isAdmin}
                    isError={isError}
                    isFavorite={(id) => isFavorite(id, type)}
                    isLoading={isLoading}
                    isMasked={isMasked}
                    setView={setView}
                    toggleFavorite={(id) => toggleFavorite(id, type)}
                    type={type}
                    user={user || null}
                  />
                )}
              </div>
            </DataWall>
          )}
        </div>
      </section>
    </DefaultLayout>
  );
}
