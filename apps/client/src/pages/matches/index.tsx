import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSWRConfig } from "swr";
import { addToast } from "@heroui/toast";
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Link, useSearchParams } from "react-router-dom";
import { Chip } from "@heroui/chip";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Input } from "@heroui/input";

import FootballClock from "../../components/football-clock";
import { useUser } from "../../hooks/use-user";
import { useMatches } from "../../hooks/use-matches";
import DefaultLayout from "../../layouts/default";
import { Category } from "../../types/exercise.types";
import {
  Format,
  PitchType,
  Venue,
  MatchFilters,
  Level,
} from "../../types/match.types";

const CATEGORIES = Object.values(Category);
const LEVELS = Object.values(Level);
const FORMATS: Format[] = ["11v11", "8v8", "5v5", "Futsal"];
const PITCH_TYPES: PitchType[] = [
  "Herbe",
  "Synthétique",
  "Hybride",
  "Stabilisé",
  "Toutes surfaces",
];
const VENUES: Venue[] = ["Domicile", "Extérieur"];

import MatchForm from "@/components/matches/match-form";
import TournamentForm from "@/components/matches/tournament-form";
import DataWall from "@/components/data-wall";
import { useFavorites } from "@/hooks/use-favorites";
import { useWelcomeGateway } from "@/contexts/welcome-gateway-context";
import { useAuth } from "@/authentication";

export default function MatchesPage() {
  const { t, i18n } = useTranslation();
  const {} = useWelcomeGateway();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<"find" | "create">(
    (searchParams.get("view") as "find" | "create") || "find",
  );
  const [type, setType] = useState<"match" | "tournament">(
    (searchParams.get("type") as "match" | "tournament") || "match",
  );
  const { user, profileComplete, isAdmin } = useUser();
  const { isAuthenticated, getAccessToken } = useAuth();
  const { toggleFavorite, isFavorite } = useFavorites();
  const isMasked = !isAuthenticated || !profileComplete;

  // Synchronization de l'URL avec l'état
  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);

    nextParams.set("view", view);
    nextParams.set("type", type);
    setSearchParams(nextParams, { replace: true });
  }, [view, type, setSearchParams]);

  // Manual scroll for "Chercher" button
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

    // Case 1: Scroll to results list ONLY if 'scroll' param is present (e.g. from Home)
    if (view === "find" && scrollRequested) {
      const timer = setTimeout(() => {
        const element =
          document.getElementById("results-list") ||
          document.getElementById("results-container");

        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          // Remove the scroll param to prevent re-scrolling on internal pagination/filters
          const nextParams = new URLSearchParams(searchParams);

          nextParams.delete("scroll");
          setSearchParams(nextParams, { replace: true });
        }
      }, 150);

      return () => clearTimeout(timer);
    }

    // Case 2: Scroll to bottom after creation
    if (searchParams.get("scroll_to_bottom") === "true") {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      // Clean up the param to avoid re-scrolling
      const nextParams = new URLSearchParams(searchParams);

      nextParams.delete("scroll_to_bottom");
      setSearchParams(nextParams, { replace: true });
    }

    // Case 3: Manual scroll via ts (badge click etc)
    const scrollTs = searchParams.get("scroll_ts");

    if (scrollTs) {
      const element = document.getElementById("results-list");

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [view, type, searchParams, setSearchParams]);

  const [displayMode, setDisplayMode] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filters, setFilters] = useState<MatchFilters>({});
  const [radiusKm, setRadiusKm] = useState<number>(0); // 0 = pas de filtre distance

  // Build filters with user coordinates when radius is active
  const effectiveFilters = useMemo(() => {
    const f = { ...filters, type };

    if (radiusKm > 0 && user?.club?.latitude && user?.club?.longitude) {
      (f as any).radius_km = radiusKm;
      (f as any).user_lat = user.club.latitude;
      (f as any).user_lng = user.club.longitude;
    }

    return f;
  }, [filters, type, radiusKm, user?.club?.latitude, user?.club?.longitude]);

  const { matches, isError, isLoading } = useMatches(effectiveFilters);
  const { mutate: globalMutate } = useSWRConfig();

  // ─── Surgical Highlight Logic ──────────────────────────────────────────
  const [acceptedMatches, setAcceptedMatches] = useState<Record<string, any>>(
    () => {
      try {
        const saved = localStorage.getItem(
          `kdufoot_accepted_matches_${user?.id || "guest"}`,
        );

        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        return {};
      }
    },
  );

  const handleAcceptChanges = useCallback(
    (match: any) => {
      setAcceptedMatches((prev) => {
        const next = { ...prev, [match.id]: { ...match } };

        localStorage.setItem(
          `kdufoot_accepted_matches_${user?.id || "guest"}`,
          JSON.stringify(next),
        );
        // Trigger badge update in navbar
        window.dispatchEvent(new CustomEvent("kdufoot_matches_updated"));

        return next;
      });
    },
    [user?.id],
  );

  const getDiff = useCallback(
    (currentMatch: any) => {
      const accepted = acceptedMatches[currentMatch.id];

      if (!accepted) return {};

      const diff: Record<string, boolean> = {};
      // Liste des champs critiques à surveiller pour le surlignage rouge
      const fieldsToCompare = [
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
        // Comparaison simple (date/time/string)
        if (currentMatch[field] !== accepted[field]) {
          diff[field] = true;
        }
      });

      return diff;
    },
    [acceptedMatches],
  );

  // Admin: supprimer un match
  const adminDeleteMatch = useCallback(
    async (matchId: string) => {
      if (
        !confirm(
          t("match.confirm_delete_admin", "⚠️ SUPPRIMER CE MATCH ?\n\nCette action est irréversible. Le match et toutes ses participations seront définitivement supprimés."),
        )
      )
        return;
      try {
        const token = await getAccessToken({
          authorizationParams: { audience: import.meta.env.AUTH0_AUDIENCE },
        } as any);
        const res = await fetch(
          `${import.meta.env.API_BASE_URL}/api/admin/matches/${matchId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!res.ok) throw new Error("Erreur lors de la suppression");
        const deletedMatch = matches.find(m => m.id === matchId);
        addToast({
          title: t("match.delete_success_admin", "{{matchType}} supprimé. Les participants ont été notifiés de l'annulation.", {
            matchType: t("enums.type." + (deletedMatch?.type || "match"))
          }),
          variant: "solid",
          color: "success",
          timeout: 5000,
        });
        // Global invalidation: refresh ALL /api/matches keys across all views
        globalMutate(
          (key) => typeof key === "string" && key.includes("/api/matches"),
          undefined,
          { revalidate: true },
        );
      } catch (err: any) {
        addToast({
          title: "Erreur",
          description: err.message,
          variant: "solid",
          color: "danger",
          timeout: 5000,
        });
      }
    },
    [getAccessToken, globalMutate],
  );

  const handleFilterChange = (key: keyof MatchFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "Toutes surfaces" || !value ? undefined : value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setRadiusKm(0);
  };

  const activeFilterCount =
    Object.values(filters).filter((v) => v !== undefined).length +
    (radiusKm > 0 ? 1 : 0);

  const handleCreateSuccess = () => {
    globalMutate(
      (key) => typeof key === "string" && key.includes("/api/matches"),
      undefined,
      { revalidate: true },
    );
    setView("find");
  };

  const canUseDistance = !!(user?.club?.latitude && user?.club?.longitude);

  // Group matches by date for calendar view - Synchronized with result list
  const matchesByDate = useMemo(() => {
    const map: Record<string, number> = {};
    // Filter out found matches and filter by current type
    const visibleMatches = matches.filter(
      (m) => m.status !== "found" && m.type === type,
    );

    for (const m of visibleMatches) {
      const dateKey = m.match_date.split("T")[0]; // Ensure YYYY-MM-DD

      map[dateKey] = (map[dateKey] || 0) + 1;
    }

    return map;
  }, [matches, type]);

  // Calendar helpers
  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    return day === 0 ? 6 : day - 1; // Monday = 0
  };
  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  // Dynamic date formatting
  const getMonthName = (date: Date) =>
    date.toLocaleDateString(i18n.language, { month: "long" });
  const dayNames = useMemo(() => {
    const days = [];
    const d = new Date(2024, 0, 1); // Monday Jan 1 2024

    for (let i = 0; i < 7; i++) {
      days.push(d.toLocaleDateString(i18n.language, { weekday: "short" }));
      d.setDate(d.getDate() + 1);
    }

    return days;
  }, [i18n.language]);

  const prevMonth = () =>
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
    );
  const nextMonth = () =>
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
    );

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

  // UI Configuration based on type
  const uiConfig = {
    match: {
      gradient:
        "bg-linear-to-br from-violet-900/40 via-violet-800/30 to-transparent",
      border: "border-violet-800/50",
      titleGradient: "from-violet-800 via-violet-700 to-violet-600",
      iconColor: "text-violet-200",
      title: t("match.tab_matches", "Matchs Amicaux"),
      desc_find: t("matchesPage.description_find"),
      desc_create: t("matchesPage.description_create"),
    },
    tournament: {
      gradient:
        "bg-linear-to-br from-purple-300/20 via-fuchsia-200/5 to-transparent",
      border: "border-purple-300/40",
      titleGradient: "from-purple-400 to-purple-300",
      iconColor: "text-purple-300",
      title: t("match.tab_tournaments", "Tournois Amicaux"),
      desc_find: t("matchesPage.description_find_tournament"),
      desc_create: t("matchesPage.description_create_tournament"),
    },
  }[type];

  return (
    <DefaultLayout maxWidth="max-w-full">
      <section className="flex flex-col gap-6 w-full px-4">
        {/* Hero - Matchs / Tournois */}
        <div
          className={`relative overflow-hidden rounded-3xl ${uiConfig.gradient} border ${uiConfig.border}`}
        >
          {/* Grass stripes */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(34,197,94,0.3) 40px, rgba(34,197,94,0.3) 80px)",
            }}
          />
          {/* Field center line + circle */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-linear-to-b from-transparent via-white/5 to-transparent pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/5 pointer-events-none" />

          {/* Football clock - top right */}
          <div className="hidden md:block absolute top-4 right-4 z-10">
            <FootballClock size={140} />
          </div>

          <div className="relative flex flex-col items-center gap-6 py-14 px-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div
                className={`p-3 rounded-2xl ${type === "match" ? "bg-violet-800/20" : "bg-purple-300/20"}`}
              >
                <svg
                  className={`w-8 h-8 ${uiConfig.iconColor}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0-4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h1
                className={`text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r ${uiConfig.titleGradient} tracking-tighter`}
              >
                {uiConfig.title}
              </h1>
            </div>
            <p className="text-default-500 text-sm md:text-lg max-w-lg">
              {view === "find" ? uiConfig.desc_find : uiConfig.desc_create}
            </p>

            <div className="flex flex-col gap-4 items-center">
              {/* Primary Selector: Match vs Tournament */}
              <div className="flex gap-2 p-1 rounded-2xl bg-default-200/30 backdrop-blur-sm border border-white/5">
                <Button
                  className={
                    type === "match"
                      ? "font-bold text-white shadow-lg shadow-violet-500/40 bg-linear-to-r from-violet-800 to-violet-600"
                      : ""
                  }
                  color={type === "match" ? "secondary" : "default"}
                  size="sm"
                  variant={type === "match" ? "solid" : "light"}
                  onPress={() => setType("match")}
                >
                  {t("match.tab_matches", "Matchs")}
                </Button>
                <Button
                  className={
                    type === "tournament"
                      ? "font-bold text-purple-950 shadow-lg shadow-purple-300/30 bg-purple-300"
                      : ""
                  }
                  color={type === "tournament" ? "default" : "default"}
                  size="sm"
                  variant={type === "tournament" ? "solid" : "light"}
                  onPress={() => setType("tournament")}
                >
                  {t("match.tab_tournaments", "Tournois")}
                </Button>
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  className={`w-full sm:w-auto sm:flex-none font-bold px-6 h-12 rounded-xl transition-all ${view === "find" ? (type === "match" ? "bg-linear-to-r from-violet-800 via-violet-700 to-violet-600 text-white shadow-lg shadow-violet-800/40" : "bg-purple-300 text-purple-950 shadow-lg shadow-purple-300/40") : "text-default-500 hover:bg-default-200 border border-white/10"}`}
                  color={
                    view === "find"
                      ? type === "match"
                        ? "secondary"
                        : "default"
                      : "default"
                  }
                  size="lg"
                  startContent={
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                  variant={view === "find" ? "solid" : "flat"}
                  onPress={() => {
                    if (view === "find") handleManualSearch();
                    else setView("find");
                  }}
                >
                  {type === "match"
                    ? t("match.find")
                    : t("match.find_tournament")}
                </Button>
                <Button
                  className={`w-full sm:w-auto sm:flex-none font-bold px-6 h-12 rounded-xl transition-all ${view === "create" ? (type === "match" ? "bg-linear-to-r from-violet-800 via-violet-700 to-violet-600 text-white shadow-lg shadow-violet-800/40" : "bg-purple-300 text-purple-950 shadow-lg shadow-purple-300/40") : "text-default-500 hover:bg-default-200 border border-white/10"}`}
                  color={
                    view === "create"
                      ? type === "match"
                        ? "secondary"
                        : "default"
                      : "default"
                  }
                  size="lg"
                  startContent={
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 4.5v15m7.5-7.5h-15"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                  variant={view === "create" ? "solid" : "flat"}
                  onPress={() => setView("create")}
                >
                  {type === "match"
                    ? t("match.create")
                    : t("match.create_tournament")}
                  {isMasked && " 🔒"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex flex-col gap-6 animate-appearance-in pb-20"
          id="results-container"
        >
          {view === "create" ? (
            <DataWall message={t("match.create_warning", "Pour créer une annonce, votre profil doit être complété à 100% (Nom, Club, Téléphone, etc.).")}>
              {type === "match" ? (
                <MatchForm onSuccess={handleCreateSuccess} />
              ) : (
                <TournamentForm onSuccess={handleCreateSuccess} />
              )}
            </DataWall>
          ) : (
            <DataWall message={t("match.search_warning", "L'accès aux recherches détaillées est réservé aux profils complets.")}>
              <div className="flex flex-col gap-5">
                {/* Filter Section - Coordinated container */}
                <Card
                  className={`shadow-lg border ${type === "match" ? "shadow-violet-500/5 border-violet-800/50" : "shadow-fuchsia-500/5 border-fuchsia-500/20"} bg-[#232120] overflow-hidden`}
                >
                  <CardHeader className="pb-0 pt-5 px-5 relative">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded-lg ${type === "match" ? "bg-violet-800/20" : "bg-purple-300/20"}`}
                        >
                          <svg
                            className={`w-4 h-4 ${type === "match" ? "text-violet-800 dark:text-violet-300" : "text-purple-400 dark:text-purple-200"}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-default-900 dark:text-default-100">
                          {t("matchesPage.filters.title")}
                        </h3>
                        {activeFilterCount > 0 && (
                          <Chip
                            className="bg-violet-900/20 text-violet-200 dark:bg-violet-500/20 dark:text-violet-300"
                            color="secondary"
                            size="sm"
                            variant="flat"
                          >
                            {activeFilterCount}{" "}
                            {t("matchesPage.filters.active")}
                          </Chip>
                        )}
                      </div>
                      {activeFilterCount > 0 && (
                        <Button
                          color="danger"
                          size="sm"
                          variant="light"
                          onPress={clearFilters}
                        >
                          {t("matchesPage.filters.clear")}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardBody className="px-5 pb-5 relative flex flex-col gap-4">
                    <p className="text-small text-default-500 italic">
                      {t("match.filters.explanation")}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <Select
                        aria-label={t("matchesPage.filters.category")}
                        classNames={{
                          trigger:
                            "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
                          label: "text-zinc-400 font-medium",
                        }}
                        id="filter-category"
                        label={t("matchesPage.filters.category")}
                        name="category"
                        placeholder={t("matchesPage.filters.all")}
                        selectedKeys={
                          filters.category ? [filters.category] : []
                        }
                        size="sm"
                        onChange={(e) =>
                          handleFilterChange("category", e.target.value)
                        }
                      >
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat}>
                            {t(`enums.category.${cat}`)}
                          </SelectItem>
                        ))}
                      </Select>

                      <Select
                        aria-label={t("matchesPage.filters.level")}
                        classNames={{
                          trigger:
                            "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
                          label: "text-zinc-400 font-medium",
                        }}
                        id="filter-level"
                        label={t("matchesPage.filters.level")}
                        name="level"
                        placeholder={t("matchesPage.filters.all")}
                        selectedKeys={filters.level ? [filters.level] : []}
                        size="sm"
                        onChange={(e) =>
                          handleFilterChange("level", e.target.value)
                        }
                      >
                        {LEVELS.map((lvl) => (
                          <SelectItem key={lvl}>
                            {t(`enums.level.${lvl}`)}
                          </SelectItem>
                        ))}
                      </Select>

                      <Select
                        aria-label={t("matchesPage.filters.format")}
                        classNames={{
                          trigger:
                            "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
                          label: "text-zinc-400 font-medium",
                        }}
                        id="filter-format"
                        label={t("matchesPage.filters.format")}
                        name="format"
                        placeholder={t("matchesPage.filters.all")}
                        selectedKeys={filters.format ? [filters.format] : []}
                        size="sm"
                        onChange={(e) =>
                          handleFilterChange("format", e.target.value)
                        }
                      >
                        {FORMATS.map((f) => (
                          <SelectItem key={f}>
                            {t(`enums.format.${f}`, f)}
                          </SelectItem>
                        ))}
                      </Select>

                      <Select
                        aria-label={t("matchesPage.filters.gender")}
                        classNames={{
                          trigger:
                            "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
                          label: "text-zinc-400 font-medium",
                        }}
                        id="filter-gender"
                        label={t("matchesPage.filters.gender")}
                        name="gender"
                        placeholder={t("matchesPage.filters.all")}
                        onChange={(e) =>
                          handleFilterChange(
                            "notes",
                            e.target.value ? `Genre: ${e.target.value}` : "",
                          )
                        } // Hacky filter via notes
                        selectedKeys={
                          filters.notes && filters.notes.includes("Genre:")
                            ? [filters.notes.split("Genre: ")[1]]
                            : []
                        }
                        size="sm"
                      >
                        <SelectItem key="Masculin">
                          {t("enums.gender.Masculin")}
                        </SelectItem>
                        <SelectItem key="Féminin">
                          {t("enums.gender.Féminin")}
                        </SelectItem>
                        <SelectItem key="Mixte">
                          {t("enums.gender.Mixte")}
                        </SelectItem>
                        <SelectItem key="Non spécifié">
                          {t("enums.gender.Non spécifié")}
                        </SelectItem>
                      </Select>

                      <Select
                        aria-label={t("matchesPage.filters.pitch_type")}
                        classNames={{
                          trigger:
                            "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
                          label: "text-zinc-400 font-medium",
                        }}
                        id="filter-pitch-type"
                        label={t("matchesPage.filters.pitch_type")}
                        name="pitch_type"
                        placeholder={t("matchesPage.filters.all")}
                        selectedKeys={
                          filters.pitch_type ? [filters.pitch_type] : []
                        }
                        size="sm"
                        onChange={(e) =>
                          handleFilterChange("pitch_type", e.target.value)
                        }
                      >
                        {PITCH_TYPES.map((type) => (
                          <SelectItem key={type}>
                            {t(`enums.pitch.${type}`)}
                          </SelectItem>
                        ))}
                      </Select>

                      <Input
                        aria-label={t("matchesPage.filters.date")}
                        classNames={{
                          inputWrapper:
                            "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
                          label: "text-zinc-400 font-medium",
                        }}
                        id="filter-date"
                        label={t("matchesPage.filters.date")}
                        name="date"
                        size="sm"
                        type="date"
                        value={filters.date || ""}
                        onChange={(e) =>
                          handleFilterChange("date", e.target.value)
                        }
                      />

                      <Select
                        aria-label={t("matchesPage.filters.venue")}
                        classNames={{
                          trigger:
                            "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
                          label: "text-zinc-400 font-medium",
                        }}
                        id="filter-venue"
                        label={t("matchesPage.filters.venue")}
                        name="venue"
                        placeholder={t("matchesPage.filters.all")}
                        selectedKeys={filters.venue ? [filters.venue] : []}
                        size="sm"
                        onChange={(e) =>
                          handleFilterChange("venue", e.target.value)
                        }
                      >
                        {VENUES.map((v) => (
                          <SelectItem key={v}>
                            {t(`enums.venue.${v}`)}
                          </SelectItem>
                        ))}
                      </Select>

                      <Input
                        isClearable
                        aria-label={t("matchesPage.filters.city")}
                        classNames={{
                          inputWrapper:
                            "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
                          label: "text-zinc-400 font-medium",
                        }}
                        id="filter-city"
                        label={t("matchesPage.filters.city")}
                        name="city"
                        placeholder="Ex: Lens"
                        size="sm"
                        value={filters.location_city || ""}
                        onChange={(e) =>
                          handleFilterChange("location_city", e.target.value)
                        }
                        onClear={() => handleFilterChange("location_city", "")}
                      />

                      <Input
                        isClearable
                        aria-label={t("matchesPage.filters.zip")}
                        classNames={{
                          inputWrapper:
                            "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
                          label: "text-zinc-400 font-medium",
                        }}
                        id="filter-zip"
                        label={t("matchesPage.filters.zip")}
                        name="zip"
                        placeholder="Ex: 62300"
                        size="sm"
                        value={filters.location_zip || ""}
                        onChange={(e) =>
                          handleFilterChange("location_zip", e.target.value)
                        }
                        onClear={() => handleFilterChange("location_zip", "")}
                      />

                      <Input
                        aria-label={t("matchesPage.filters.radius")}
                        classNames={{
                          inputWrapper:
                            "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
                          label: "text-zinc-400 font-medium",
                        }}
                        description={
                          !canUseDistance
                            ? t("matchForm.alerts.must_link")
                            : radiusKm > 0
                              ? `depuis ${user?.club?.city || "club"}`
                              : undefined
                        }
                        endContent={
                          <span className="text-default-400 text-sm">km</span>
                        }
                        id="filter-radius"
                        isDisabled={!canUseDistance}
                        label={t("matchesPage.filters.radius")}
                        max={200}
                        min={0}
                        name="radius"
                        placeholder={
                          canUseDistance
                            ? "Ex: 20"
                            : t("matchForm.labels.siret")
                        }
                        size="sm"
                        type="number"
                        value={radiusKm > 0 ? String(radiusKm) : ""}
                        onChange={(e) =>
                          setRadiusKm(parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                  </CardBody>
                </Card>

                {/* Display Mode Toggle */}
                <div className="flex items-center gap-2 px-1">
                  <div className="flex gap-1 p-0.5 rounded-xl bg-default-100/50">
                    <Button
                      className={displayMode === "list" ? "font-bold" : ""}
                      color={displayMode === "list" ? "secondary" : "default"}
                      size="sm"
                      startContent={
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      }
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
                      startContent={
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      }
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
                      onPress={() => {
                        setSelectedDate(null);
                        handleFilterChange("date", "");
                      }}
                    >
                      ✕{" "}
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                        i18n.language,
                        { day: "numeric", month: "short" },
                      )}
                    </Button>
                  )}
                </div>

                {/* Calendar View */}
                {displayMode === "calendar" && (
                  <Card className="shadow-lg shadow-violet-500/5 border border-violet-800/50 bg-[#232120] overflow-hidden">
                    <CardHeader className="px-5 pt-5 pb-3">
                      <div className="flex justify-between items-center w-full">
                        <Button
                          isIconOnly
                          aria-label={t("back")}
                          size="sm"
                          variant="light"
                          onPress={prevMonth}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M15.75 19.5 8.25 12l7.5-7.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Button>
                        <h3 className="text-xl font-bold text-violet-400">
                          {getMonthName(calendarMonth)}{" "}
                          {calendarMonth.getFullYear()}
                        </h3>
                        <Button
                          isIconOnly
                          aria-label={t("nav.userDropdown.loading")}
                          size="sm"
                          variant="light"
                          onPress={nextMonth}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="m8.25 4.5 7.5 7.5-7.5 7.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardBody className="px-3 pb-5 pt-0">
                      {/* Day headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {dayNames.map((d) => (
                          <div
                            key={d}
                            className="text-center text-xs font-semibold text-default-400 py-1"
                          >
                            {d}
                          </div>
                        ))}
                      </div>
                      {/* Calendar grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {/* Empty cells for days before the 1st */}
                        {Array.from({
                          length: getFirstDayOfMonth(calendarMonth),
                        }).map((_, i) => (
                          <div key={`empty-${i}`} className="h-16" />
                        ))}
                        {/* Day cells */}
                        {Array.from({
                          length: getDaysInMonth(calendarMonth),
                        }).map((_, i) => {
                          const day = i + 1;
                          const dateKey = formatDateKey(
                            calendarMonth.getFullYear(),
                            calendarMonth.getMonth(),
                            day,
                          );
                          const count = matchesByDate[dateKey] || 0;
                          const isToday =
                            dateKey ===
                            formatDateKey(
                              new Date().getFullYear(),
                              new Date().getMonth(),
                              new Date().getDate(),
                            );
                          const isSelected = selectedDate === dateKey;

                          return (
                            <button
                              key={day}
                              className={`
                                                                h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-sm relative border border-white/5
                                                                ${isSelected ? "bg-violet-500/30 border-2 border-violet-500 shadow-lg shadow-violet-500/20" : ""}
                                                                ${isToday && !isSelected ? "ring-1 ring-violet-500/50 bg-violet-800/20" : ""}
                                                                ${count > 0 ? "hover:bg-violet-500/20 cursor-pointer bg-zinc-800/80" : "cursor-default bg-zinc-900/40"}
                                                                ${!count && !isSelected && !isToday ? "text-zinc-600" : ""}
                                                            `}
                              onClick={() =>
                                count > 0 ? handleDayClick(dateKey) : undefined
                              }
                            >
                              <span
                                className={`text-xs font-semibold ${isToday ? "text-violet-400" : "text-zinc-400"} ${isSelected ? "text-violet-300" : ""} ${count > 0 ? "text-zinc-200" : ""}`}
                              >
                                {day}
                              </span>
                              {count > 0 && (
                                <div className="flex flex-wrap justify-center gap-px max-w-[90%]">
                                  {Array.from({
                                    length: Math.min(count, 4),
                                  }).map((_, bi) => (
                                    <span
                                      key={bi}
                                      className="text-xs sm:text-sm leading-none"
                                    >
                                      ⚽
                                    </span>
                                  ))}
                                  {count > 4 && (
                                    <span className="text-[8px] text-violet-400 font-bold">
                                      +{count - 4}
                                    </span>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Match Results */}
                {displayMode === "list" && (
                  <div className="flex flex-col gap-4">
                    {isError && (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger">
                        <svg
                          className="w-5 h-5 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {t("error.loading_matches")}
                      </div>
                    )}

                    {!isLoading && filteredMatches.length > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                        <span className="text-sm font-bold text-white tracking-wider">
                          {filteredMatches.length}{" "}
                          {type === "tournament"
                            ? t("matchesPage.found_tournament")
                            : t("matchesPage.found")}
                        </span>
                      </div>
                    )}

                    <div
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                      id="results-list"
                    >
                      {filteredMatches.map((match) => {
                        const diff = getDiff(match);
                        const hasChanges = Object.keys(diff).length > 0;

                        return (
                          <Card
                            key={match.id}
                            className={`group hover:shadow-lg transition-all border ${hasChanges ? "border-red-500/50 shadow-red-500/10" : "border-violet-800/50"} hover:border-violet-500/40 bg-[#232120] ${user?.id === match.owner_id ? "ring-2 ring-violet-500 shadow-violet-500/20" : ""}`}
                          >
                            <CardHeader className="pb-2 pt-4 px-4 flex-col items-start gap-1 relative">
                              {user?.id === match.owner_id && (
                                <div className="absolute top-2 right-2 flex items-center gap-1 bg-linear-to-r from-violet-500 to-amber-500 text-white text-xs sm:text-sm font-bold px-2 py-0.5 rounded-full shadow-lg">
                                  <svg
                                    className="w-3 h-3"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      clipRule="evenodd"
                                      d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                                      fillRule="evenodd"
                                    />
                                  </svg>
                                  {t("matchesPage.my_creation")}
                                </div>
                              )}
                              <div className="flex flex-col w-full">
                                <h4
                                  className={`font-bold text-xl ${diff.name ? "text-red-500" : "text-default-900"} group-hover:text-violet-200 transition-colors tracking-tight break-words whitespace-normal w-full`}
                                >
                                  {isMasked
                                    ? "CLUB MASQUÉ"
                                    : match.club?.name ||
                                      t("matchesPage.unknown_club")}
                                </h4>
                                {match.type === "tournament" && match.name && (
                                  <h5
                                    className={`font-bold text-sm ${diff.name ? "text-red-400" : "text-fuchsia-400"} group-hover:text-fuchsia-300 transition-colors break-words whitespace-normal w-full pb-1`}
                                  >
                                    {match.name}
                                  </h5>
                                )}
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                  <Chip
                                    className="h-4 text-[9px] font-bold"
                                    color="default"
                                    size="sm"
                                    variant="flat"
                                  >
                                    {match.type === "tournament" ? "🏆" : "⚽"}{" "}
                                    {t(`enums.type.${match.type}`)}
                                  </Chip>
                                  {match.type === "tournament" &&
                                    match.registration_fee !== undefined &&
                                    match.registration_fee !== null && (
                                      <Chip
                                        className="h-4 text-[9px] font-bold"
                                        color={
                                          diff.registration_fee
                                            ? "danger"
                                            : "success"
                                        }
                                        size="sm"
                                        variant="flat"
                                      >
                                        {match.registration_fee > 0
                                          ? `${match.registration_fee} €`
                                          : "Gratuit"}
                                      </Chip>
                                    )}
                                  <Chip
                                    className="h-4 text-[9px] font-black"
                                    color={
                                      diff.category || diff.level
                                        ? "danger"
                                        : "warning"
                                    }
                                    size="sm"
                                    variant="flat"
                                  >
                                    {t(`enums.category.${match.category}`)}{" "}
                                    {match.level
                                      ? `• ${t(`enums.level.${match.level}`)}`
                                      : ""}
                                  </Chip>
                                  <Chip
                                    className="h-4 text-[9px] font-black"
                                    color={
                                      diff.pitch_type ? "danger" : "primary"
                                    }
                                    size="sm"
                                    variant="flat"
                                  >
                                    🏟️ {t(`enums.pitch.${match.pitch_type}`)}
                                  </Chip>
                                  <Chip
                                    className="h-4 text-[9px] font-black"
                                    color={diff.venue ? "danger" : "secondary"}
                                    size="sm"
                                    variant="flat"
                                  >
                                    {match.venue === "Domicile"
                                      ? "🏠 REÇOIT"
                                      : "🚗 SE DÉPLACE"}
                                  </Chip>
                                </div>
                                <p
                                  className={`text-small ${diff.location_city ? "text-red-500 font-bold" : "text-default-500"} font-medium`}
                                >
                                  {isMasked
                                    ? "VILLE MASQUÉE"
                                    : `${match.location_city || match.club?.city} (${match.location_zip || match.club?.zip})`}
                                </p>
                              </div>
                            </CardHeader>
                            <CardBody className="py-2 px-4 gap-3">
                              {/* Date & Time Row - Simplified */}
                              <div
                                className={`flex flex-wrap items-center gap-2 sm:gap-4 text-sm ${diff.match_date || diff.match_time ? "text-red-500 bg-red-500/10 border border-red-500/20" : "text-default-600 bg-default-50"} p-2 rounded-lg justify-center transition-colors`}
                              >
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <svg
                                    className={`w-4 h-4 ${diff.match_date ? "text-red-500" : "text-violet-200"}`}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  <span
                                    className={`font-semibold capitalize text-xs sm:text-sm ${diff.match_date ? "animate-pulse" : ""}`}
                                  >
                                    {new Date(
                                      match.match_date,
                                    ).toLocaleDateString(i18n.language, {
                                      weekday: "short",
                                      day: "numeric",
                                      month: "short",
                                    })}
                                  </span>
                                </div>
                                <div
                                  className={`hidden sm:block w-px h-4 ${diff.match_date || diff.match_time ? "bg-red-500/30" : "bg-default-300"}`}
                                />
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <svg
                                    className={`w-4 h-4 ${diff.match_time ? "text-red-500" : "text-violet-200"}`}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  <span
                                    className={`font-semibold text-xs sm:text-sm ${diff.match_time ? "animate-pulse" : ""}`}
                                  >
                                    {match.match_time}
                                  </span>
                                </div>
                              </div>

                              {match.distance_km != null && (
                                <div className="flex justify-center">
                                  <Chip
                                    className="h-5 text-xs sm:text-sm"
                                    color="primary"
                                    size="sm"
                                    variant="flat"
                                  >
                                    {match.distance_approximate ? "~" : ""}
                                    {match.distance_km} km
                                  </Chip>
                                </div>
                              )}
                            </CardBody>
                            <CardFooter className="px-4 pb-4 flex flex-col gap-2">
                              {hasChanges && (
                                <Button
                                  className="w-full font-black bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 shadow-lg shadow-red-500/10 animate-pulse"
                                  color="danger"
                                  size="sm"
                                  variant="flat"
                                  onPress={() => handleAcceptChanges(match)}
                                >
                                  ✅ J'AI VU ET J'ACCEPTE LES CHANGEMENTS
                                </Button>
                              )}
                              <div className="flex gap-2 w-full items-center">
                                {/* Favorite Star */}
                                <Button
                                  isIconOnly
                                  aria-label={
                                    isFavorite(
                                      match.id,
                                      match.type === "tournament"
                                        ? "tournament"
                                        : "match",
                                    )
                                      ? "Retirer des favoris"
                                      : "Ajouter aux favoris"
                                  }
                                  className="shrink-0"
                                  size="sm"
                                  variant="light"
                                  onPress={() =>
                                    toggleFavorite(
                                      match.id,
                                      match.type === "tournament"
                                        ? "tournament"
                                        : "match",
                                    )
                                  }
                                >
                                  <svg
                                    className="w-5 h-5 transition-colors"
                                    fill={
                                      isFavorite(
                                        match.id,
                                        match.type === "tournament"
                                          ? "tournament"
                                          : "match",
                                      )
                                        ? "#fbbf24"
                                        : "none"
                                    }
                                    stroke={
                                      isFavorite(
                                        match.id,
                                        match.type === "tournament"
                                          ? "tournament"
                                          : "match",
                                      )
                                        ? "#fbbf24"
                                        : "currentColor"
                                    }
                                    strokeWidth={1.5}
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.385a.563.563 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </Button>
                                <Button
                                  as={Link}
                                  className="font-bold flex-1 bg-linear-to-r from-violet-500 to-violet-700 text-white shadow-md shadow-violet-500/20"
                                  color="secondary"
                                  size="sm"
                                  to={`/matches/${match.id}`}
                                  variant="solid"
                                >
                                  DÉTAILS
                                </Button>
                                {isAdmin && (
                                  <Button
                                    className="font-black tracking-tight shadow-md shadow-red-500/20"
                                    color="danger"
                                    size="sm"
                                    variant="solid"
                                    onPress={() => adminDeleteMatch(match.id)}
                                  >
                                    🗑️ SUPPRIMER
                                  </Button>
                                )}
                              </div>
                            </CardFooter>
                          </Card>
                        );
                      })}
                    </div>

                    {isLoading && filteredMatches.length === 0 && (
                      <div className="flex justify-center py-20">
                        <Spinner
                          aria-label={t("loading")}
                          color="secondary"
                          size="lg"
                        />
                      </div>
                    )}

                    {!isLoading && filteredMatches.length === 0 && !isError && (
                      <Card className="border border-violet-800/50 bg-[#232120] overflow-hidden">
                        <div className="absolute inset-0 bg-linear-to-br from-violet-500/5 to-transparent pointer-events-none" />
                        <CardBody className="relative py-16 flex flex-col items-center gap-4 text-center">
                          <div className="p-4 rounded-full bg-violet-800/20">
                            <svg
                              className="w-12 h-12 text-violet-400"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1}
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-violet-900/80 dark:text-violet-100">
                              {type === "tournament"
                                ? t("matchesPage.empty_title_tournament")
                                : t("matchesPage.empty_title")}
                            </p>
                            <p className="text-sm text-violet-800/60 dark:text-violet-200/60 mt-1">
                              {type === "tournament"
                                ? t("matchesPage.empty_desc_tournament")
                                : t("matchesPage.empty_desc")}
                            </p>
                          </div>
                          <Button
                            className="mt-2 font-semibold bg-violet-900/20 text-violet-200 dark:bg-violet-500/20 dark:text-violet-300"
                            color="secondary"
                            variant="flat"
                            onPress={() => setView("create")}
                          >
                            {type === "tournament"
                              ? t("match.create_tournament")
                              : t("match.create")}
                          </Button>
                        </CardBody>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </DataWall>
          )}
        </div>
      </section>
    </DefaultLayout>
  );
}
