import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSWRConfig } from "swr";
import { useTranslation } from "react-i18next";
import { LayoutDashboard } from "lucide-react";
import { Card } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Tabs, Tab } from "@heroui/tabs";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { addToast } from "@heroui/toast";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";

import { SafeImage } from "@/components/common/safe-image";

import { DashboardListSkeleton } from "../../components/skeletons/dashboard-skeleton";
import { matchService } from "../../services/matches";
import FootballClock from "../../components/football-clock";

import { ConfirmedTournamentCard } from "./components/confirmed-tournament-card";
import { ConfirmedMatchCard } from "./components/confirmed-match-card";
import { DashboardRequestCard } from "./components/dashboard-request-card";

import { useUser } from "@/hooks/use-user";
import { useIncomingRequests, useMyParticipations } from "@/hooks/use-matches";
import DataWall from "@/components/data-wall";
import { JerseyColorDots } from "@/components/jersey-color-dots";
import DefaultLayout from "@/layouts/default";
import { MatchRequest, MatchParticipation } from "@/types/match.types";

const HIGHLIGHT_SCROLL_DELAY = 500;
const ACTION_SPINNER_DELAY = 1200;

const formatDate = (dateStr: string, locale: string = "fr-FR") => {
  try {
    const [year, month, day] = dateStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return "";

  return timeStr.replace(":", "h");
};

const formatTimestamp = (
  ts: number,
  t: (key: string, defaultValue?: string) => string,
  locale: string = "fr-FR",
) => {
  try {
    const date = new Date(ts * 1000);

    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return t("common:unknown_date", "Date inconnue");
  }
};

const formatTimestampTime = (ts: number, locale: string = "fr-FR") => {
  try {
    const date = new Date(ts * 1000);

    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export default function DashboardPage() {
  const { t, i18n } = useTranslation("kdufoot");
  const { mutate: globalMutate } = useSWRConfig();
  const {
    isOpen: isProfileOpen,
    onOpen: onProfileOpen,
    onOpenChange: onProfileChange,
  } = useDisclosure();
  const { isLocked, user } = useUser();
  // 2. Demandes Reçues (Organisateur)
  const {
    requests: incomingRequests,
    isLoading: isLoadingIncoming,
    mutate: mutateRequests,
  } = useIncomingRequests();

  // 3. Mes Participations (Candidat)
  const {
    participations: myParticipations,
    isLoading: isLoadingParticipations,
    markAsRead: markAsReadHook,
    mutate: mutateParticipations,
  } = useMyParticipations();

  // States
  const [requestsSubFilter, setRequestsSubFilter] = useState<
    "all" | "match" | "tournament"
  >("all");
  const [highlightedCardId, setHighlightedCardIdState] = useState<
    string | null
  >(null);
  const [selectedClubProfile, setSelectedClubProfile] =
    useState<MatchParticipation | null>(null);
  const [selectedTab, setSelectedTab] = useState<
    "requests" | "confirmed_matches" | "participations"
  >("requests");
  const [searchParams] = useSearchParams();
  const { getAccessTokenSilently } = useAuth0();
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {},
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
      },
    },
  } as const;

  // Track last seen data to detect specific changes (Removed LocalStorage as per Zero Cache requirement)
  const [knownData, setKnownData] = useState<Record<string, unknown>>({});

  const updateKnownData = (participations: MatchParticipation[]) => {
    const newKnown = { ...knownData };
    let changed = false;

    participations.forEach((p) => {
      // Only update known data for confirmations that are currently marked "unread" (notification_state === 0)
      // or if we don't have data yet. We ONLY save if it is NOT currently modified, so we lock in the "original" state.
      if (!newKnown[p.match_id] && p.notification_state === 0) {
        newKnown[p.match_id] = {
          date: p.match_date,
          time: p.match_time,
          venue: p.venue,
          format: p.match_format || p.format,
          pitch: p.match_pitch_type || p.pitch_type,
        };
        changed = true;
      }
    });
    if (changed) {
      setKnownData(newKnown);
    }
  };

  useEffect(() => {
    if (myParticipations) {
      updateKnownData(myParticipations);
    }
  }, [myParticipations]);

  useEffect(() => {
    // Force a global refresh on mount to clear any ghost data from previous sessions or tabs
    globalMutate(
      (key) => typeof key === "string" && key.startsWith("/api/"),
      undefined,
      { revalidate: true },
    );
  }, [globalMutate]);

  useEffect(() => {
    if (isLocked) {
      setSelectedTab("requests"); // Default tab when unlocked later
    } else {
      const tabParam = searchParams.get("tab");

      if (
        tabParam === "requests" ||
        tabParam === "confirmed_matches" ||
        tabParam === "participations"
      ) {
        setSelectedTab(tabParam);
      }
    }
  }, [isLocked, searchParams]);

  useEffect(() => {
    const highlight = searchParams.get("highlight");

    if (highlight) {
      setHighlightedCardIdState(highlight);
      // Scroll to it after a short delay to ensure rendering
      setTimeout(() => {
        const element = document.getElementById(`card-${highlight}`);

        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, HIGHLIGHT_SCROLL_DELAY);
    }
  }, [searchParams]);

  const handleRequestAction = async (
    request: MatchRequest,
    status: "accepted" | "refused",
  ) => {
    const {
      match_id: matchId,
      requester_user_id: userId,
      match_date: matchDate,
      requester_club_name: clubName,
    } = request;
    const key = `${matchId}-${userId}-${status}`;

    setActionLoading((prev) => ({ ...prev, [key]: true }));

    await new Promise((resolve) => setTimeout(resolve, ACTION_SPINNER_DELAY));

    // --- OPTIMISTIC UPDATE ---
    mutateRequests(
      (currentData: { requests: MatchRequest[] } | undefined) => {
        if (!currentData?.requests) return currentData;

        return {
          ...currentData,
          requests: currentData.requests.map((r) =>
            r.match_id === matchId && r.requester_user_id === userId
              ? { ...r, request_status: status }
              : r,
          ),
        };
      },
      false, // Optimistic: don't revalidate immediately
    );

    try {
      const token = await getAccessTokenSilently();

      await matchService.updateRequestStatus(matchId, userId, status, token);
      addToast({
        title: status === "accepted" ? t("success") : t("refused"),
        description:
          status === "accepted"
            ? t("dashboard.notifications.acceptance_player", {
                date: matchDate,
                matchType: t(
                  "enums.type." + (request.match_type || "match"),
                ).toLowerCase(),
              })
            : t("dashboard.notifications.refusal_organizer", {
                team: clubName,
              }),
        color: status === "accepted" ? "success" : "warning",
      });

      // Targeted revalidation
      mutateRequests();
      mutateParticipations();
      window.dispatchEvent(new CustomEvent("kdufoot_matches_updated"));
    } catch (error: unknown) {
      const err = error as Error;

      console.error("Action error:", err);
      // Rollback on error
      mutateRequests();
      addToast({
        title: t("error.title"),
        description: err.message || t("error.action_failed"),
        color: "danger",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleWithdraw = async (matchId: string, userId: string) => {
    const key = `${matchId}-${userId}`;

    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const token = await getAccessTokenSilently();

      // Optimistic: immediately remove from participations
      mutateParticipations(
        (
          data: { participations: MatchParticipation[] } | undefined,
        ): { participations: MatchParticipation[] } | undefined => {
          if (!data?.participations) return data;

          return {
            ...data,
            participations: data.participations.filter(
              (p: MatchParticipation) =>
                !(p.match_id === matchId && p.requester_user_id === userId),
            ),
          };
        },
        false,
      );

      await matchService.cancelRequest(matchId, userId, token);
      addToast({
        title: t("success"),
        description: t("dashboard.notifications.withdraw_success"),
        color: "success",
      });
      mutateRequests();
      mutateParticipations(); // Also refresh participations list
      window.dispatchEvent(new CustomEvent("kdufoot_matches_updated"));
    } catch (error: unknown) {
      const err = error as Error;

      console.error("Action error:", err);
      addToast({
        title: t("error.title"),
        description: err.message || t("error.withdraw_failed"),
        color: "danger",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Sécurité H-2 : Verrouillage uniquement dans les 2h AVANT le match

  const isMatchPast = (matchDate: string, matchTime: string) => {
    try {
      const matchDateTime = new Date(`${matchDate}T${matchTime}`);

      if (isNaN(matchDateTime.getTime())) return false;

      return matchDateTime.getTime() < new Date().getTime();
    } catch {
      return false;
    }
  };

  // Status update logic moved to details page as per requirements

  const markAsRead = async (matchId: string) => {
    try {
      await markAsReadHook(matchId);
      // Update knownData so changes are no longer detected
      const p = (myParticipations || []).find((p) => p.match_id === matchId);

      if (p) {
        setKnownData((prev) => ({
          ...prev,
          [matchId]: {
            date: p.match_date,
            time: p.match_time,
            venue: p.venue,
            format: p.match_format || p.format,
            pitch: p.match_pitch_type || p.pitch_type,
          },
        }));
      }
      // Clear highlight if this was the highlighted card
      if (highlightedCardId === matchId) {
        setHighlightedCardIdState(null);
      }
      // Decrement (or clear) badge counter
      const uk = `kdufoot_unread_count_${user?.id || "guest"}`;
      const current = parseInt(localStorage.getItem(uk) || "0");

      if (current <= 1) {
        localStorage.removeItem(uk);
      } else {
        localStorage.setItem(uk, String(current - 1));
      }
      window.dispatchEvent(new CustomEvent("kdufoot_matches_updated"));
    } catch (e) {
      console.error("Failed to mark as read", e);
    }
  };

  // Filtered lists
  const filteredRequests = (incomingRequests || []).filter((r) => {
    // Auto-masquage des demandes pour matchs passés
    if (isMatchPast(r.match_date, r.match_time)) return false;
    // Only show PENDING requests in "Demandes Reçues"
    if (r.request_status !== "pending") return false;

    if (requestsSubFilter === "all") return true;

    return r.match_type === requestsSubFilter;
  });

  // Combine accepted participations + accepted incoming requests into "Matchs Confirmés"
  const acceptedIncomingAsOrganizer = (incomingRequests || [])
    .filter(
      (r) =>
        r.request_status === "accepted" &&
        !isMatchPast(r.match_date, r.match_time),
    )
    .map((r) => ({
      ...r,
      _source: "organizer" as const,
      // Normalize: organizer sees requester info
      opponent_club_name: r.requester_club_name,
      opponent_club_logo: r.requester_club_logo,
      opponent_city: r.requester_city,
      opponent_category: r.requester_category,
      opponent_level: r.requester_level,
      opponent_club_address: r.requester_club_address,
      // If organizer created match as 'home', organizer plays at home
      isUserHome: r.match_type === "tournament" || r.venue === "Domicile",
      max_teams: r.match_max_teams,
      accepted_count: r.accepted_count ?? 0,
      format: r.match_format || r.format,
      category: r.match_category || r.category,
      level: r.match_level || r.level,
      pitch_type: r.match_pitch_type || r.pitch_type,
    }));

  const acceptedParticipations = (myParticipations || [])
    .filter(
      (p) =>
        !isMatchPast(p.match_date, p.match_time) &&
        p.request_status === "accepted",
    )
    .map((p) => ({
      ...p,
      _source: "participant" as const,
      // Normalize: participant sees host/organizer info
      opponent_club_name: p.host_club_name,
      opponent_club_logo: p.host_club_logo,
      opponent_city: p.host_city || p.location_city,
      opponent_category: p.host_category || p.match_category,
      opponent_level: p.host_level || p.match_level,
      opponent_club_colors: p.host_club_colors,
      opponent_stadium_address: p.host_stadium_address,
      // If organizer created match as 'away', organizer plays away, so participant plays at home.
      // For tournaments, participant is always Away.
      isUserHome:
        p.match_type === "tournament" ? false : p.venue === "Extérieur",
      max_teams: p.match_max_teams,
      accepted_count: p.accepted_count ?? 0,
      format: p.match_format || p.format,
      category: p.match_category || p.category,
      level: p.match_level || p.level,
      pitch_type: p.match_pitch_type || p.pitch_type,
    }));

  const allConfirmedMatches = [
    ...acceptedIncomingAsOrganizer,
    ...acceptedParticipations,
  ].filter((m) => m.match_type === "match");
  const allConfirmedTournaments = [
    ...acceptedIncomingAsOrganizer,
    ...acceptedParticipations,
  ].filter((m) => m.match_type === "tournament");

  // Notification summary for the "Flash" panel
  const modifiedParticipations = (myParticipations || []).filter(
    (p) => p.notification_state === 1,
  );
  const modifiedMatchIds = new Set(
    modifiedParticipations
      .filter((p) => p.match_type === "match")
      .map((p) => p.match_id),
  );
  const modifiedTournamentIds = new Set(
    modifiedParticipations
      .filter((p) => p.match_type === "tournament")
      .map((p) => p.match_id),
  );
  const modifiedMatchCount = modifiedMatchIds.size;
  const modifiedTournamentCount = modifiedTournamentIds.size;

  // Badge Logic: counts for internal use if needed

  const renderSubFilters = (
    current: "all" | "match" | "tournament",
    onChange: (v: "all" | "match" | "tournament") => void,
  ) => (
    <div className="flex gap-2 p-1 rounded-xl bg-default-100/50 w-fit">
      <Button
        className={
          current === "all"
            ? "font-bold bg-danger text-white"
            : "font-medium text-default-500"
        }
        color={current === "all" ? "danger" : "default"}
        size="sm"
        variant={current === "all" ? "solid" : "light"}
        onPress={() => onChange("all")}
      >
        {t("dashboard.tabs.all")}
      </Button>
      <Button
        className={
          current === "match"
            ? "font-bold bg-violet-800 text-white"
            : "font-medium text-default-500"
        }
        color={current === "match" ? "secondary" : "default"}
        size="sm"
        variant={current === "match" ? "solid" : "light"}
        onPress={() => onChange("match")}
      >
        {t("dashboard.tabs.matches")}
      </Button>
      <Button
        className={
          current === "tournament"
            ? "font-bold bg-purple-300 text-purple-950 shadow-sm"
            : "font-medium text-default-500"
        }
        color={current === "tournament" ? "default" : "default"}
        size="sm"
        variant={current === "tournament" ? "solid" : "light"}
        onPress={() => onChange("tournament")}
      >
        {t("dashboard.tabs.tournaments")}
      </Button>
    </div>
  );

  return (
    <DefaultLayout maxWidth="max-w-full">
      <section className="flex flex-col gap-8 w-full px-4 pt-2 pb-8">
        {/* Header Section - Rectangle Style matching Navbar */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-orange-600/15 via-amber-500/10 to-yellow-500/10 border border-orange-500/20 mb-2">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(249,115,22,0.3) 40px, rgba(249,115,22,0.3) 80px)",
            }}
          />

          {/* Field center line + circle */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-linear-to-b from-transparent via-white/5 to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/5" />

          {/* Football clock - top right */}
          <div className="hidden md:block absolute top-4 right-4 z-10">
            <FootballClock size={140} />
          </div>

          <div className="relative flex flex-col items-center gap-6 py-12 px-8">
            <div className="relative flex flex-col items-center gap-4 w-full">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xl shadow-amber-500/5 transition-transform hover:scale-110 duration-300">
                <LayoutDashboard
                  className="w-8 h-8 text-amber-500"
                  strokeWidth={1.5}
                />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-[#fbbf24] to-[#f59e0b] tracking-tighter whitespace-nowrap overflow-x-auto scrollbar-hide">
                {t("dashboard.title", "Tableau de bord")}
              </h1>
            </div>

            <p className="text-default-500 text-lg max-w-lg text-center">
              {t("dashboard.subtitle")}
            </p>

            {isLocked && (
              <div className="mt-6 flex flex-col items-center gap-3 animate-appearance-in w-full max-w-2xl">
                <Card className="bg-orange-500/10 border-2 border-orange-500/50 p-6 w-full shadow-2xl">
                  <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                    <div className="text-5xl animate-bounce">🛡️</div>
                    <div className="flex-1">
                      <p className="text-orange-500 font-black text-xl mb-1 tracking-tighter">
                        {t("dashboard.sections.locked_title")}
                      </p>
                      <p className="text-default-400 text-sm font-medium leading-relaxed">
                        {t("dashboard.sections.locked_desc")}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>

        <DataWall>
          <Tabs
            aria-label="Dashboard Options"
            className="w-full"
            classNames={{
              tabList:
                "bg-default-100/50 p-1.5 rounded-2xl w-full flex-col sm:flex-row border-b-0 gap-2",
              cursor: "rounded-xl shadow-lg shadow-purple-500/20",
              tab: "h-auto py-3 sm:h-12 font-black tracking-tight text-[11px] sm:text-sm flex-1 min-w-full sm:min-w-0 px-3 sm:px-4",
              tabContent:
                "group-data-[selected=true]:text-white whitespace-normal text-center leading-tight overflow-hidden",
            }}
            color="secondary"
            selectedKey={selectedTab}
            variant="underlined"
            onSelectionChange={(key) => {
              setSelectedTab(
                key as "requests" | "confirmed_matches" | "participations",
              );
            }}
          >
            <Tab
              key="requests"
              title={
                <div className="flex items-center space-x-2">
                  <span>{t("dashboard.tabs.requests")}</span>
                  {isLocked && <span className="text-default-400">🔒</span>}
                  {incomingRequests.filter(
                    (r) => r.request_status === "pending",
                  ).length > 0 && (
                    <Chip
                      className="h-5 min-w-5 px-1 font-black"
                      color="danger"
                      size="sm"
                      variant="solid"
                    >
                      {
                        incomingRequests.filter(
                          (r) => r.request_status === "pending",
                        ).length
                      }
                    </Chip>
                  )}
                </div>
              }
            >
              <div aria-live="polite" className="flex flex-col gap-4 pt-2">
                {renderSubFilters(requestsSubFilter, setRequestsSubFilter)}

                <motion.div
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6"
                  initial="hidden"
                  variants={containerVariants}
                >
                  <AnimatePresence mode="popLayout">
                    {isLoadingIncoming ? (
                      <DashboardListSkeleton count={4} />
                    ) : filteredRequests.length > 0 ? (
                      filteredRequests.map((request) => (
                        <motion.div
                          key={`${request.match_id}-${request.requester_user_id}`}
                          layout
                          exit={{ opacity: 0, scale: 0.95 }}
                          variants={itemVariants}
                        >
                          <DashboardRequestCard
                            actionLoading={actionLoading}
                            formatDate={formatDate}
                            formatTime={formatTime}
                            lang={i18n.language}
                            request={request}
                            onAction={handleRequestAction}
                            onViewProfile={(req) => {
                              setSelectedClubProfile(req);
                              onProfileOpen();
                            }}
                          />
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        className="col-span-full py-8 text-center space-y-4"
                        variants={itemVariants}
                      >
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-orange-500/20">
                          <svg
                            className="w-8 h-8"
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
                        </div>
                        <p className="text-default-400 font-medium whitespace-pre-wrap">
                          {requestsSubFilter === "all"
                            ? t("dashboard.empty.no_requests")
                            : requestsSubFilter === "match"
                              ? t("dashboard.empty.no_match")
                              : t("dashboard.empty.no_tournament")}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </Tab>

            <Tab
              key="confirmed_matches"
              title={
                <div className="flex items-center space-x-2">
                  <span>{t("dashboard.tabs.confirmed_matches")}</span>
                  {allConfirmedMatches.length > 0 && (
                    <Chip
                      className="h-5 min-w-5 px-1"
                      color="success"
                      size="sm"
                      variant="solid"
                    >
                      {allConfirmedMatches.length}
                    </Chip>
                  )}
                  {modifiedMatchCount > 0 && (
                    <span className="relative flex h-5 min-w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                      <Chip
                        className="relative h-5 min-w-5 px-1 font-black"
                        color="danger"
                        size="sm"
                        variant="solid"
                      >
                        {modifiedMatchCount}
                      </Chip>
                    </span>
                  )}
                </div>
              }
            >
              <div aria-live="polite" className="flex flex-col gap-4 pt-2">
                <motion.div
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6"
                  initial="hidden"
                  variants={containerVariants}
                >
                  <AnimatePresence mode="popLayout">
                    {isLoadingIncoming || isLoadingParticipations ? (
                      <DashboardListSkeleton count={4} />
                    ) : allConfirmedMatches.length > 0 ? (
                      allConfirmedMatches.map((cm) => (
                        <motion.div
                          key={cm.match_id}
                          layout
                          exit={{ opacity: 0, scale: 0.95 }}
                          variants={itemVariants}
                        >
                          <ConfirmedMatchCard
                            formatDate={formatDate}
                            formatTime={formatTime}
                            highlighted={highlightedCardId === cm.match_id}
                            isWithdrawing={
                              actionLoading[`${cm.match_id}-${user?.id || ""}`]
                            }
                            knownData={
                              knownData[cm.match_id] as
                                | {
                                    date?: string;
                                    time?: string;
                                    venue?: string;
                                    format?: string;
                                    pitch?: string;
                                  }
                                | undefined
                            }
                            match={cm}
                            userId={user?.id}
                            onMarkAsRead={markAsRead}
                            onWithdraw={() =>
                              handleWithdraw(cm.match_id, user?.id || "")
                            }
                          />
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        className="col-span-full py-8 text-center space-y-6"
                        variants={itemVariants}
                      >
                        <p className="text-default-400 font-medium">
                          {t("dashboard.labels.no_participation_match")}
                        </p>
                        <Button
                          as={Link}
                          className="font-bold bg-violet-500/10 text-violet-400 w-full sm:w-auto"
                          color="secondary"
                          to="/matches"
                          variant="flat"
                        >
                          {t("dashboard.labels.search_match")}
                          {isLocked && " 🔒"}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </Tab>

            <Tab
              key="participations"
              title={
                <div className="flex items-center space-x-2">
                  <span>{t("dashboard.tabs.participations")}</span>
                  {isLocked && <span className="text-default-400">🔒</span>}
                  {allConfirmedTournaments.length > 0 && (
                    <Chip
                      className="h-5 min-w-5 px-1 font-black"
                      color="secondary"
                      size="sm"
                      variant="solid"
                    >
                      {allConfirmedTournaments.length}
                    </Chip>
                  )}
                  {modifiedTournamentCount > 0 && (
                    <span className="relative flex h-5 min-w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                      <Chip
                        className="relative h-5 min-w-5 px-1 font-black"
                        color="danger"
                        size="sm"
                        variant="solid"
                      >
                        {modifiedTournamentCount}
                      </Chip>
                    </span>
                  )}
                </div>
              }
            >
              <div aria-live="polite" className="flex flex-col gap-4 pt-2">
                <motion.div
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6"
                  initial="hidden"
                  variants={containerVariants}
                >
                  <AnimatePresence mode="popLayout">
                    {isLoadingParticipations ? (
                      <DashboardListSkeleton count={3} />
                    ) : allConfirmedTournaments.length > 0 ? (
                      allConfirmedTournaments.map((part) => (
                        <motion.div
                          key={part.match_id}
                          layout
                          exit={{ opacity: 0, scale: 0.95 }}
                          variants={itemVariants}
                        >
                          <ConfirmedTournamentCard
                            formatDate={formatDate}
                            formatTime={formatTime}
                            highlighted={highlightedCardId === part.match_id}
                            isTimeChanged={
                              !!(
                                part.notification_state === 1 &&
                                (knownData[part.match_id] as {
                                  time?: string;
                                }) &&
                                (knownData[part.match_id] as { time?: string })
                                  .time !== part.match_time
                              )
                            }
                            isWithdrawing={
                              actionLoading[
                                `${part.match_id}-${user?.id || ""}`
                              ]
                            }
                            knownData={
                              knownData as Record<string, { time?: string }>
                            }
                            participation={part}
                            userId={user?.id}
                            onMarkAsRead={markAsRead}
                            onWithdraw={() =>
                              handleWithdraw(part.match_id, user?.id || "")
                            }
                          />
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        className="col-span-full py-8 text-center space-y-4"
                        variants={itemVariants}
                      >
                        <p className="text-default-400 font-medium">
                          {t("dashboard.labels.no_participation_tournament")}
                        </p>
                        <Button
                          as={Link}
                          className="font-bold bg-purple-300/20 text-purple-400 w-full sm:w-auto"
                          color="default"
                          to="/matches?type=tournament"
                          variant="flat"
                        >
                          {t("dashboard.labels.search_tournament")}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </Tab>
          </Tabs>
        </DataWall>
      </section>
      <Modal
        backdrop="blur"
        isOpen={isProfileOpen}
        scrollBehavior="inside"
        shouldBlockScroll={true}
        onOpenChange={onProfileChange}
      >
        <ModalContent className="bg-[#1a1a1c] border border-white/10">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🛡️</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black tracking-tighter text-white">
                    {t("dashboard.profile_modal.title")}
                  </h3>
                  <p className="text-xs sm:text-sm text-default-400 font-bold">
                    {t("dashboard.profile_modal.subtitle")}
                  </p>
                </div>
              </ModalHeader>
              <ModalBody className="py-6">
                {selectedClubProfile ? (
                  <div className="flex flex-col gap-6 animate-appearance-in">
                    {/* Header Profil */}
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="w-20 h-20 shrink-0">
                        <SafeImage
                          alt={
                            selectedClubProfile.requester_club_name ||
                            selectedClubProfile.host_club_name
                          }
                          aspectRatio="1/1"
                          fallbackText={
                            selectedClubProfile.requester_club_name ||
                            selectedClubProfile.host_club_name
                          }
                          src={
                            selectedClubProfile.requester_club_logo ||
                            selectedClubProfile.host_club_logo
                          }
                          width={80}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xl font-black text-white whitespace-normal break-words leading-tight">
                          {selectedClubProfile.requester_club_name ||
                            selectedClubProfile.host_club_name}
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Chip
                            className="font-bold text-[9px]"
                            color="warning"
                            size="sm"
                            variant="flat"
                          >
                            {t(
                              `enums.category.${selectedClubProfile.requester_category || selectedClubProfile.category}`,
                            )}
                          </Chip>
                          <Chip
                            className="font-bold text-[9px]"
                            color="primary"
                            size="sm"
                            variant="flat"
                          >
                            {t(
                              `enums.level.${selectedClubProfile.requester_level || selectedClubProfile.level}`,
                            )}
                          </Chip>
                        </div>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="grid gap-3">
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-xs sm:text-sm font-black text-default-400">
                          {t("dashboard.profile_modal.manager")}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {selectedClubProfile.requester_firstname ||
                            selectedClubProfile.host_firstname}{" "}
                          {selectedClubProfile.requester_lastname ||
                            selectedClubProfile.host_lastname}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-xs sm:text-sm font-black text-default-400">
                          {t("dashboard.profile_modal.phone")}
                        </span>
                        <a
                          className="text-sm font-black text-orange-500 hover:animate-pulse"
                          href={`tel:${selectedClubProfile.requester_phone || selectedClubProfile.host_phone}`}
                        >
                          {selectedClubProfile.requester_phone ||
                            selectedClubProfile.host_phone}
                        </a>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-xs sm:text-sm font-black text-default-400">
                          {t("dashboard.profile_modal.email")}
                        </span>
                        <a
                          className="text-sm font-bold text-primary hover:underline truncate ml-4"
                          href={`mailto:${selectedClubProfile.requester_email || selectedClubProfile.host_email}`}
                        >
                          {selectedClubProfile.requester_email ||
                            selectedClubProfile.host_email}
                        </a>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-xs sm:text-sm font-black text-default-400">
                          {t("dashboard.profile_modal.city")}
                        </span>
                        <span className="text-sm font-bold text-white tracking-tight">
                          {selectedClubProfile.requester_city ||
                            selectedClubProfile.host_city ||
                            selectedClubProfile.location_city}
                        </span>
                      </div>
                      {(selectedClubProfile.requester_home_jersey_color ||
                        selectedClubProfile.host_home_jersey_color) && (
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-xs sm:text-sm font-black text-default-400">
                            {t(
                              "account.fields.home_jersey",
                              "Maillot Domicile",
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {selectedClubProfile.requester_home_jersey_color ||
                                selectedClubProfile.host_home_jersey_color}
                            </span>
                            <JerseyColorDots
                              colors={
                                selectedClubProfile.requester_home_jersey_color ||
                                selectedClubProfile.host_home_jersey_color
                              }
                              size="md"
                            />
                          </div>
                        </div>
                      )}
                      {(selectedClubProfile.requester_away_jersey_color ||
                        selectedClubProfile.host_away_jersey_color) && (
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-xs sm:text-sm font-black text-default-400">
                            {t(
                              "account.fields.away_jersey",
                              "Maillot Extérieur",
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {selectedClubProfile.requester_away_jersey_color ||
                                selectedClubProfile.host_away_jersey_color}
                            </span>
                            <JerseyColorDots
                              colors={
                                selectedClubProfile.requester_away_jersey_color ||
                                selectedClubProfile.host_away_jersey_color
                              }
                              size="md"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadata box */}
                    <div className="mt-2 pt-4 border-t border-white/5 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-default-500 tracking-tighter font-bold text-[9px]">
                          {t("dashboard.profile_modal.request_date")}
                        </span>
                        <span className="text-white font-bold">
                          {selectedClubProfile.contacted_at
                            ? `${formatTimestamp(parseInt(selectedClubProfile.contacted_at), (k, d) => t(k, d || ""))} ${t("matchForm.labels.at", "à")} ${formatTimestampTime(parseInt(selectedClubProfile.contacted_at))}`
                            : t("dashboard.profile_modal.unknown")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-default-500 tracking-tighter font-bold text-[9px]">
                          {t("dashboard.profile_modal.for_match_on", {
                            matchType: t(
                              "enums.type." +
                                (selectedClubProfile.match_type || "match"),
                            ).toLowerCase(),
                          })}
                        </span>
                        <span className="text-warning-500 font-black">
                          {formatDate(selectedClubProfile.match_date)}{" "}
                          {t("matchForm.labels.at", "à")}{" "}
                          {formatTime(selectedClubProfile.match_time)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center p-8">
                    <Spinner aria-label={t("loading")} color="warning" />
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="border-t border-white/5 pt-4">
                <Button
                  className="font-black tracking-tighter w-full h-12"
                  color="secondary"
                  variant="flat"
                  onPress={onClose}
                >
                  {t("dashboard.profile_modal.close")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </DefaultLayout>
  );
}
