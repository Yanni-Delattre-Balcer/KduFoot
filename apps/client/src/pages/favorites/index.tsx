import { useTranslation } from "react-i18next";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { useState } from "react";
import { Spinner } from "@heroui/spinner";
import { Link } from "react-router-dom";
import { Chip } from "@heroui/chip";
import { useAuth0 } from "@auth0/auth0-react";
import { useMemo } from "react";

import FootballClock from "../../components/football-clock";
import { showVideoAnalysis } from "../../config/site";

import { useMatches } from "@/hooks/use-matches";
import { useExercises } from "@/hooks/use-exercises";
import { useFavorites } from "@/hooks/use-favorites";
import DefaultLayout from "@/layouts/default";
import DataWall from "@/components/data-wall";
import { ErrorBoundary } from "@/components/error-boundary";

export default function FavoritesPage() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth0();
  const { favorites, toggleFavorite } = useFavorites();
  const { exercises, isLoading: loadingEx } = useExercises();
  const { matches, isLoading: loadingMatches } = useMatches();

  // View state for Toggle Buttons (like Matches Page)
  const [view, setView] = useState<"exercises" | "matches" | "tournaments">(
    showVideoAnalysis ? "exercises" : "matches",
  );

  const favExercises = useMemo(() => {
    if (!isAuthenticated || !exercises || !favorites?.exercises) return [];
    return exercises.filter((e) => favorites.exercises.includes(e.id));
  }, [exercises, favorites?.exercises, isAuthenticated]);

  const favMatches = useMemo(() => {
    if (!isAuthenticated || !matches || !favorites?.matches) return [];
    return matches.filter((m) => favorites.matches.includes(m.id));
  }, [matches, favorites?.matches, isAuthenticated]);

  const favTournaments = useMemo(() => {
    if (!isAuthenticated || !matches || !favorites?.tournaments) return [];
    return matches.filter((m) => favorites.tournaments.includes(m.id));
  }, [matches, favorites?.tournaments, isAuthenticated]);

  return (
    <ErrorBoundary>
      <DefaultLayout maxWidth="max-w-full">
        <section className="flex flex-col gap-8 w-full px-4 pt-2 pb-8 bg-black min-h-screen">
          {/* Hero - Mes Favoris */}
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-cyan-600/15 via-sky-500/10 to-blue-500/10 border border-cyan-500/20 mb-2">
          {/* Grass stripes - standard green */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(34,197,94,0.3) 40px, rgba(34,197,94,0.3) 80px)",
            }}
          />
          {/* Field center line + circle */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-linear-to-b from-transparent via-white/5 to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/5" />

          <div className="hidden md:block absolute top-4 right-4 z-10">
            <FootballClock size={140} />
          </div>

          <div className="relative flex flex-col items-center gap-6 py-12 px-8">
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 rounded-2xl bg-cyan-500/10">
                <svg
                  className="w-8 h-8 text-cyan-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-cyan-500 to-blue-500 tracking-tighter">
                {t("nav.favorites")}
              </h1>
            </div>
            <p className="text-default-500 text-lg max-w-md mx-auto text-center">
              {view === "exercises"
                ? t("favorites.description_exercises")
                : t("favorites.description_matches")}
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3 p-1 rounded-2xl bg-default-100/50 backdrop-blur-sm w-full sm:w-auto">
              {showVideoAnalysis && (
                <Button
                  className={
                    view === "exercises"
                      ? "font-bold text-white bg-linear-to-r from-[#17c964] to-[#12a150] w-full sm:w-auto"
                      : "w-full sm:w-auto"
                  }
                  color={view === "exercises" ? "success" : "default"}
                  size="lg"
                  startContent={
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                  variant={view === "exercises" ? "shadow" : "light"}
                  onPress={() => setView("exercises")}
                >
                  {t("favorites.tab_exercises")}
                </Button>
              )}
              <Button
                className={
                  view === "matches"
                    ? "font-bold text-white bg-linear-to-r from-violet-500 to-purple-500 w-full sm:w-auto"
                    : "w-full sm:w-auto"
                }
                color={view === "matches" ? "secondary" : "default"}
                size="lg"
                startContent={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m11.372-5.362c.962-.203 1.934-.377 2.916-.52M19.5 4.5c.125.163.233.332.322.508M19.5 4.5v.243a12.98 12.98 0 0 1-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                variant={view === "matches" ? "shadow" : "light"}
                onPress={() => setView("matches")}
              >
                {t("favorites.tab_matches")}
              </Button>
              <Button
                className={
                  view === "tournaments"
                    ? "font-bold text-purple-900 shadow-lg shadow-purple-500/20 bg-purple-400 w-full sm:w-auto"
                    : "w-full sm:w-auto"
                }
                color={view === "tournaments" ? "default" : "default"}
                size="lg"
                startContent={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
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
                }
                variant={view === "tournaments" ? "shadow" : "light"}
                onPress={() => setView("tournaments")}
              >
                {t("favorites.tab_tournaments")}
              </Button>
            </div>
          </div>
        </div>

        <DataWall>
          <div className="animate-appearance-in">
            {/* Content - Unwrapped */}
            {view === "exercises" && (
              <>
                {loadingEx ? (
                  <div className="flex justify-center py-10">
                    <Spinner aria-label={t("loading")} color="success" />
                  </div>
                ) : favExercises.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {favExercises.map((ex) => (
                      <Card
                        key={ex.id}
                        className="group hover:shadow-lg hover:shadow-cyan-500/10 transition-all bg-[#251820] border border-cyan-500/20 hover:border-cyan-500/40"
                      >
                        <Link className="block" to={`/exercises/${ex.id}`}>
                          <CardHeader className="flex gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-linear-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center">
                              <div className="p-2 rounded-full bg-cyan-500/10">
                                <svg
                                  className="w-5 h-5 text-cyan-600 dark:text-cyan-400"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={1.5}
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                            </div>
                            <div className="flex flex-col items-start">
                              <p className="text-md font-bold text-default-900 group-hover:text-cyan-600 transition-colors">
                                {ex.title}
                              </p>
                              <p className="text-small text-default-600 font-medium">
                                {ex.category}
                              </p>
                            </div>
                          </CardHeader>
                        </Link>
                        <CardBody className="pt-0 flex flex-col gap-3">
                          <p className="text-sm text-default-700 line-clamp-2">
                            {ex.synopsis}
                          </p>
                          <Button
                            className="w-full font-bold text-xs"
                            color="danger"
                            size="sm"
                            startContent={<span className="text-lg">🗑️</span>}
                            variant="flat"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(ex.id, "exercise");
                            }}
                          >
                            {t("favorites.remove", "Retirer des favoris")}
                          </Button>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border border-cyan-500/20 bg-[#251820]">
                    <CardBody className="py-16 flex flex-col items-center gap-4 text-center">
                      <div className="p-4 rounded-full bg-cyan-500/10 text-cyan-500">
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-cyan-900/90 dark:text-cyan-100">
                          {t("favorites.empty_exercises")}
                        </p>
                        <p className="text-md text-cyan-900/70 dark:text-cyan-200/70 mt-1">
                          {t("favorites.empty_exercises_desc")}
                        </p>
                      </div>
                      <Button
                        as={Link}
                        className="mt-2 text-cyan-700 bg-cyan-100 dark:bg-cyan-500/20 dark:text-cyan-300 font-bold shadow-sm"
                        color="primary"
                        to="/exercises"
                        variant="flat"
                      >
                        {t("favorites.discover_exercises")}
                      </Button>
                    </CardBody>
                  </Card>
                )}
              </>
            )}

            {view === "matches" && (
              <>
                {loadingMatches ? (
                  <div className="flex justify-center py-10">
                    <Spinner aria-label={t("loading")} color="secondary" />
                  </div>
                ) : favMatches.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favMatches.map((match) => (
                      <Card
                        key={match.id}
                        className="group hover:shadow-lg hover:shadow-violet-500/10 transition-all bg-[#252018] border border-violet-500/20 hover:border-violet-500/40"
                      >
                        <CardBody>
                          <Link className="block" to={`/matches/${match.id}`}>
                            <div className="flex justify-between items-start mb-2">
                              <Chip
                                className="font-semibold bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                                color="secondary"
                                size="sm"
                                variant="flat"
                              >
                                {match.category}
                              </Chip>
                              <Chip
                                color={
                                  match.venue === "Domicile"
                                    ? "success"
                                    : "danger"
                                }
                                size="sm"
                                variant="flat"
                              >
                                {t(`enums.venue.${match.venue}`)}
                              </Chip>
                            </div>
                            <p className="font-bold text-lg text-default-900 group-hover:text-violet-600 transition-colors">
                              {match.club.name}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-sm text-default-600 font-medium">
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
                              {new Date(match.match_date).toLocaleDateString(
                                i18n.language,
                              )}
                            </div>
                            {match.level && (
                              <Chip
                                className="mt-3"
                                color="secondary"
                                size="sm"
                                variant="flat"
                              >
                                {match.level}
                              </Chip>
                            )}
                          </Link>
                          <Button
                            className="w-full font-bold text-xs mt-4"
                            color="danger"
                            size="sm"
                            startContent={<span className="text-lg">🗑️</span>}
                            variant="flat"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(match.id, "match");
                            }}
                          >
                            {t("favorites.remove", "Retirer des favoris")}
                          </Button>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border border-violet-500/20 bg-[#252018]">
                    <CardBody className="py-16 flex flex-col items-center gap-4 text-center">
                      <div className="p-4 rounded-full bg-violet-500/10 text-violet-500">
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m11.372-5.362c.962-.203 1.934-.377 2.916-.52M19.5 4.5c.125.163.233.332.322.508M19.5 4.5v.243a12.98 12.98 0 0 1-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-violet-900/90 dark:text-violet-100">
                          {t("favorites.empty_matches")}
                        </p>
                        <p className="text-md text-violet-900/70 dark:text-violet-200/70 mt-1">
                          {t("favorites.empty_matches_desc")}
                        </p>
                      </div>
                      <Button
                        as={Link}
                        className="mt-2 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 font-bold shadow-sm"
                        color="secondary"
                        to="/matches"
                        variant="flat"
                      >
                        {t("favorites.find_matches")}
                      </Button>
                    </CardBody>
                  </Card>
                )}
              </>
            )}

            {view === "tournaments" && (
              <>
                {loadingMatches ? (
                  <div className="flex justify-center py-10">
                    <Spinner aria-label={t("loading")} color="secondary" />
                  </div>
                ) : favTournaments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favTournaments.map((match) => (
                      <Card
                        key={match.id}
                        className="group hover:shadow-lg hover:shadow-purple-500/10 transition-all bg-[#252318] border border-purple-500/20 hover:border-purple-500/40"
                      >
                        <CardBody>
                          <Link className="block" to={`/matches/${match.id}`}>
                            <div className="flex justify-between items-start mb-2">
                              <Chip
                                className="font-semibold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                                color="secondary"
                                size="sm"
                                variant="flat"
                              >
                                {match.category}
                              </Chip>
                              <Chip
                                color={
                                  match.venue === "Domicile"
                                    ? "success"
                                    : "danger"
                                }
                                size="sm"
                                variant="flat"
                              >
                                {t(`enums.venue.${match.venue}`)}
                              </Chip>
                            </div>
                            <p className="font-bold text-lg text-default-900 group-hover:text-purple-600 transition-colors">
                              {match.club.name}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-sm text-default-600 font-medium">
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
                              {new Date(match.match_date).toLocaleDateString(
                                i18n.language,
                              )}
                            </div>
                            {match.level && (
                              <Chip
                                className="mt-3"
                                color="secondary"
                                size="sm"
                                variant="flat"
                              >
                                {match.level}
                              </Chip>
                            )}
                          </Link>
                          <Button
                            className="w-full font-bold text-xs mt-4"
                            color="danger"
                            size="sm"
                            startContent={<span className="text-lg">🗑️</span>}
                            variant="flat"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(match.id, "tournament");
                            }}
                          >
                            {t("favorites.remove", "Retirer des favoris")}
                          </Button>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border border-purple-500/20 bg-[#252318]">
                    <CardBody className="py-16 flex flex-col items-center gap-4 text-center">
                      <div className="p-4 rounded-full bg-purple-500/10 text-purple-500">
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
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
                      </div>
                      <div>
                        <p className="text-lg font-bold text-purple-900/90 dark:text-purple-100">
                          {t(
                            "favorites.empty_tournaments",
                            "Aucun tournoi favori",
                          )}
                        </p>
                        <p className="text-md text-purple-900/70 dark:text-purple-200/70 mt-1">
                          {t(
                            "favorites.empty_tournaments_desc",
                            "Ajoutez des tournois à vos favoris pour les retrouver ici.",
                          )}
                        </p>
                      </div>
                      <Button
                        as={Link}
                        className="mt-2 bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 font-bold shadow-sm"
                        color="secondary"
                        to="/matches"
                        variant="flat"
                      >
                        {t(
                          "favorites.find_tournaments",
                          "Trouver des tournois",
                        )}
                      </Button>
                    </CardBody>
                  </Card>
                )}
              </>
            )}
          </div>
        </DataWall>
      </section>
    </DefaultLayout>
    </ErrorBoundary>
  );
}
