import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Image as HeroImage } from "@heroui/image";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import { addToast } from "@heroui/toast";
import { Textarea } from "@heroui/input";

import DataWall from "@/components/data-wall";
import { useWelcomeGateway } from "@/contexts/welcome-gateway-context";
import { useAuth, useUser } from "@/authentication";
import { useMatch, useMyParticipations } from "@/hooks/use-matches";
import DefaultLayout from "@/layouts/default";
import { JerseyColorDots } from "@/components/jersey-color-dots";

const formatTime = (timeStr: string) => {
  if (!timeStr) return "";

  return timeStr.replace(":", "h");
};

const InfoItem = ({
  icon,
  label,
  value,
  color,
  highlight,
  showPulse,
}: {
  icon: string;
  label: string;
  value: string;
  color:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "default"
    | "info"
    | "violet"
    | "orange"
    | "cyan";
  highlight?: boolean;
  showPulse?: boolean;
}) => {
  const colorClasses = {
    primary: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-blue-500/10 text-blue-400 border-blue-500/20",
    secondary: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-purple-500/10 text-purple-400 border-purple-500/20",
    success: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-amber-500/10 text-amber-400 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    info: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-sky-500/10 text-sky-400 border-sky-500/20",
    violet: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-violet-500/10 text-violet-400 border-violet-500/20",
    orange: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-orange-500/10 text-orange-400 border-orange-500/20",
    cyan: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    default: highlight
      ? `bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] ${showPulse ? "animate-pulse" : ""}`
      : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };

  // Regex to remove emojis from the value if we already have a dedicated icon
  const cleanedValue = value
    .replace(/[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}]/gu, "")
    .replace(/^\s+|\s+$/g, "");

  return (
    <div
      className={`p-4 rounded-[1.5rem] border ${colorClasses[color]} flex flex-col justify-between gap-3 transition-all hover:scale-[1.02] cursor-default h-full bg-linear-to-b from-transparent to-black/5`}
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-black/20 border border-white/5 flex items-center justify-center text-xl shadow-inner">
          {icon}
        </div>
        <span className="text-[9px] font-black tracking-[0.2em] opacity-40">
          {label}
        </span>
      </div>
      <p className="text-white font-black text-xs sm:text-sm leading-tight break-words">
        {cleanedValue}
      </p>
    </div>
  );
};

export default function MatchDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, profileComplete, isAdmin, blockUser } = useUser();
  const { isAuthenticated } = useAuth();
  const { openGateway } = useWelcomeGateway();
  const isMasked = !isAuthenticated || !profileComplete;
  const {
    match,
    isLoading,
    isError,
    contactMatch,
    deleteMatch,
    adminDeleteMatch,
    cancelMatchContact,
    updateRequestStatus,
    closeRegistrations,
  } = useMatch(id || null);
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onOpenChange: onDeleteOpenChange,
  } = useDisclosure();
  const {
    isOpen: isCancelOpen,
    onOpen: onCancelOpen,
    onOpenChange: onCancelOpenChange,
  } = useDisclosure();
  const {
    isOpen: isAdminDeleteOpen,
    onOpen: onAdminDeleteOpen,
    onOpenChange: onAdminDeleteOpenChange,
  } = useDisclosure();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isAdminDeleting, setIsAdminDeleting] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const {
    isOpen: isBlockOpen,
    onOpen: onBlockOpen,
    onOpenChange: onBlockOpenChange,
  } = useDisclosure();
  const {
    isOpen: isCloseRegOpen,
    onOpen: onCloseRegOpen,
    onOpenChange: onCloseRegOpenChange,
  } = useDisclosure();
  const {
    isOpen: isCancelAcceptedOpen,
    onOpen: onCancelAcceptedOpen,
    onOpenChange: onCancelAcceptedOpenChange,
  } = useDisclosure();
  const [blockReason, setBlockReason] = useState("Suspension administrative");

  // Red Alert Detection Logic
  const { participations, markAsRead } = useMyParticipations();
  const participation = participations?.find((p) => p.match_id === id);
  const isOwner = user?.id === match?.owner_id;
  const isModified = !isOwner && participation?.notification_state === 1;

  // Parse Gender and clean notes early for highlights and UI
  const genderMatch = match?.notes?.match(/Genre: (.*)(\n|$)/);
  let gender = genderMatch ? genderMatch[1].trim() : "Mixte";

  if (gender.startsWith("enums.gender.")) {
    gender = gender.replace("enums.gender.", "");
  }
  if (!gender || gender.trim() === "" || gender === "Non spécifié")
    gender = "Mixte";

  const cleanNotes = match?.notes?.replace(/Genre: .*(\n|$)/, "").trim();

  interface KnownMatchData {
    date?: string;
    time?: string;
    venue?: string;
    pitch?: string;
    format?: string;
    category?: string;
    level?: string;
    gender?: string;
  }

  const [knownData, setKnownData] = useState<Record<string, KnownMatchData>>(
    () => {
      try {
        const saved = localStorage.getItem("kdufoot_known_match_data");

        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    },
  );

  const isDifferent = (val1: unknown, val2: unknown) => {
    if (!val1 || !val2) return false;
    const s1 = String(val1).trim().toLowerCase();
    const s2 = String(val2).trim().toLowerCase();

    return s1 !== s2;
  };

  const matchKnownData = knownData[id || ""];

  const highlights = {
    date:
      isModified &&
      !!matchKnownData &&
      isDifferent(match?.match_date, matchKnownData.date),
    time:
      isModified &&
      !!matchKnownData &&
      isDifferent(
        match?.match_time?.slice(0, 5),
        matchKnownData.time?.slice(0, 5),
      ),
    venue:
      isModified &&
      !!matchKnownData &&
      isDifferent(match?.venue, matchKnownData.venue),
    pitch:
      isModified &&
      !!matchKnownData &&
      isDifferent(match?.pitch_type, matchKnownData.pitch),
    format:
      isModified &&
      !!matchKnownData &&
      isDifferent(match?.format, matchKnownData.format),
    category:
      isModified &&
      !!matchKnownData &&
      isDifferent(match?.category, matchKnownData.category),
    level:
      isModified &&
      !!matchKnownData &&
      isDifferent(match?.level, matchKnownData.level),
    gender:
      isModified &&
      !!matchKnownData &&
      isDifferent(gender, matchKnownData.gender),
  };

  const [showPulse, setShowPulse] = useState(true);

  // Stop pulse after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 5000);

    return () => clearTimeout(timer);
  }, []);

  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const handleMarkAsRead = async () => {
    if (!id) return;
    setIsMarkingRead(true);
    try {
      await markAsRead(id);

      // Update knownData so changes are no longer detected
      const nextKnown = {
        ...knownData,
        [id]: {
          date: match.match_date,
          time: match.match_time,
          venue: match.venue,
          format: match.format,
          pitch: match.pitch_type,
          category: match.category,
          level: match.level,
        },
      };

      localStorage.setItem(
        "kdufoot_known_match_data",
        JSON.stringify(nextKnown),
      );
      setKnownData(nextKnown);

      addToast({
        title: t("success"),
        description: t("details.status.confirmed_accepted"),
        color: "success",
      });
      // Optionally reload or just rely on state update if we had a setter for knownData
      // Since knownData is from useState with an initializer, we might need a setter.
    } catch (e) {
      console.error(e);
      addToast({
        title: t("error.title"),
        description: "Impossible de valider les modifications",
        color: "danger",
      });
    } finally {
      setIsMarkingRead(false);
    }
  };

  if (isLoading) {
    return (
      <DefaultLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <Spinner label={t("loading")} />
        </div>
      </DefaultLayout>
    );
  }

  if (isError || !match) {
    return (
      <DefaultLayout>
        <div className="flex flex-col items-center justify-center gap-4 h-[50vh]">
          <h1 className="text-2xl font-bold text-danger">
            {t("error.not_found")}
          </h1>
          <Button as={Link} color="primary" to="/matches">
            {t("back_to_list")}
          </Button>
        </div>
      </DefaultLayout>
    );
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMatch();
      addToast({
        title: t(
          "dashboard.toasts.delete_success",
          "Votre {{matchType}} a été supprimé avec succès",
          {
            matchType: t("enums.type." + match.type).toLowerCase(),
          },
        ),
        description: t(
          "dashboard.toasts.delete_success_desc",
          "L'annonce a été retirée avec succès.",
        ),
        color: "success",
      });
      onDeleteOpenChange(); // Close modal on success
      navigate("/matches");
    } catch (error) {
      console.error("Failed to delete match", error);
      const message = error instanceof Error ? error.message : "";

      addToast({
        title: t("error.title"),
        description:
          message ||
          t("error.delete_failed_with_type", {
            matchType: t("enums.type." + (match.type || "match")).toLowerCase(),
          }),
        color: "danger",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!user) return;
    setIsCancelling(true);
    try {
      await cancelMatchContact(user.id);
      onCancelOpenChange();
    } catch (error) {
      console.error("Failed to cancel request", error);
      const message = error instanceof Error ? error.message : "";

      addToast({
        title: t("error.title"),
        description: message || t("match.cancel_error"),
        color: "danger",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleAdminDelete = async () => {
    setIsAdminDeleting(true);
    try {
      await adminDeleteMatch();
      onAdminDeleteOpenChange();
      addToast({
        title: t("match.delete_success_admin", "{{matchType}} supprimé", {
          matchType: t("enums.type." + (match.type || "match")),
        }),
        description: t(
          "match.delete_success_desc_admin",
          "Les participants ont été notifiés de l'annulation.",
        ),
        classNames: {
          description: "line-clamp-none whitespace-normal",
          title: "line-clamp-none whitespace-normal",
        },
        variant: "solid",
        color: "success",
        timeout: 5000,
      });
      navigate("/matches");
    } catch (error) {
      console.error("Admin delete failed", error);
      const message = error instanceof Error ? error.message : "";

      addToast({
        title: t("error.title"),
        description: message || t("match.admin_delete_error"),
        color: "danger",
      });
    } finally {
      setIsAdminDeleting(false);
    }
  };

  const handleBlockUser = async () => {
    if (!match.owner_id) return;
    setIsBlocking(true);
    try {
      await blockUser(match.owner_id, true, blockReason);

      addToast({
        title: t("success"),
        description: t("match.block_success"),
        variant: "flat",
        color: "success",
      });
    } catch (error) {
      console.error("Blocking failed", error);
      const message = error instanceof Error ? error.message : "";

      addToast({
        title: t("error.title"),
        description: message || t("match.block_error"),
        variant: "flat",
        color: "danger",
      });
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <DefaultLayout>
      <DataWall>
        <div className="container mx-auto max-w-7xl px-2 sm:px-6 py-8 space-y-8 animate-appearance-in pb-24">
          {/* Header with Back Button */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Button
              className="font-medium"
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
                    d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              variant="light"
              onPress={() => navigate("/matches")}
            >
              {t("back_to_list")}
            </Button>

            {user?.id === match.owner_id && (
              <div className="flex gap-2">
                <Button
                  as={Link}
                  color="primary"
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
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                  to={`/matches/${id}/edit`}
                  variant="flat"
                >
                  {t("base.edit", "Mettre à jour")}
                </Button>
                <Button
                  color="danger"
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
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                  variant="flat"
                  onPress={onDeleteOpen}
                >
                  {t("delete")}
                </Button>
              </div>
            )}

            {isAdmin && user?.id !== match.owner_id && (
              <div className="flex flex-col sm:flex-row gap-2 bg-danger/5 p-2 rounded-2xl border border-danger/20 animate-pulse w-full sm:w-auto">
                <span className="text-xs sm:text-sm font-bold text-danger px-2 py-1">
                  {t("details.admin.moderation_tools")}
                </span>
                <div className="flex flex-col sm:flex-row flex-1 gap-2 w-full p-2">
                  <Button
                    className="font-black tracking-tighter flex-1 h-20 text-lg shadow-xl"
                    color="default"
                    size="lg"
                    startContent={
                      <svg
                        className="w-8 h-8 mr-2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    }
                    variant="solid"
                    onPress={onAdminDeleteOpen}
                  >
                    {t("details.buttons.delete_ad")}
                  </Button>
                  <Button
                    className="font-black tracking-tighter flex-1 h-20 text-lg shadow-xl"
                    color="danger"
                    isLoading={isBlocking}
                    size="lg"
                    startContent={
                      <svg
                        className="w-8 h-8 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          clipRule="evenodd"
                          d="M12 1.5a.75.75 0 0 1 .75.75V4.5a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 12 1.5ZM5.636 4.136a.75.75 0 0 1 1.06 0l1.592 1.591a.75.75 0 0 1-1.061 1.06L5.636 5.197a.75.75 0 0 1 0-1.061Zm12.728 0a.75.75 0 0 1 0 1.06l-1.591 1.592a.75.75 0 0 1-1.06-1.061l1.592-1.591a.75.75 0 0 1 1.06 0ZM12 5.25a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM3 12a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm15 0a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5h-2.25A.75.75 0 0 1 18 12ZM6.697 18.364a.75.75 0 0 1 1.06 0l1.591 1.591a.75.75 0 1 1-1.06 1.061l-1.591-1.592a.75.75 0 0 1 0-1.06Zm10.606 0a.75.75 0 0 1 0 1.06l-1.592 1.591a.75.75 0 1 1-1.06-1.06l1.591-1.592a.75.75 0 0 1 1.06 0ZM12 18.75a.75.75 0 0 1 .75.75V21.75a.75.75 0 0 1-1.5 0V19.5a.75.75 0 0 1 .75-.75Z"
                          fillRule="evenodd"
                        />
                      </svg>
                    }
                    variant="solid"
                    onPress={onBlockOpen}
                  >
                    {t("details.buttons.block_user")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Details Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Premium Match Header Card */}
              <Card className="shadow-2xl border-none bg-linear-to-br from-[#1c1c1f] to-[#141416] overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                <CardBody className="p-8 relative">
                  <div className="flex flex-col items-center md:flex-row md:items-start gap-8 text-center md:text-left">
                    {/* Club Logo / Big Icon */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl group-hover:bg-primary/30 transition-all" />
                      {match.club?.logo_url ? (
                        <div className="relative w-32 h-32 bg-[#232120] rounded-3xl p-4 border border-white/5 flex items-center justify-center shadow-2xl">
                          <HeroImage
                            alt={match.club.name}
                            className="object-contain"
                            height={100}
                            src={match.club.logo_url}
                            width={100}
                          />
                        </div>
                      ) : (
                        <div className="relative w-32 h-32 bg-linear-to-br from-orange-400 to-red-500 rounded-3xl flex items-center justify-center shadow-2xl">
                          <span className="text-5xl font-black text-white">
                            {match.club?.name?.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap justify-center md:justify-start gap-2">
                        <Chip
                          className="font-black tracking-tighter shadow-lg shadow-primary/20"
                          color={
                            match.type === "tournament" ? "warning" : "primary"
                          }
                          size="sm"
                          variant="shadow"
                        >
                          {match.type === "tournament"
                            ? `🏆 ${t("enums.type.tournament").toUpperCase()}`
                            : `⚽ ${t("enums.type.match").toUpperCase()} AMICAL`}
                        </Chip>
                        {match.status === "found" && (
                          <Chip
                            className="font-black"
                            color="success"
                            size="sm"
                            variant="shadow"
                          >
                            Complet
                          </Chip>
                        )}
                      </div>

                      <div className="w-full">
                        <h1 className="text-xl md:text-3xl font-black text-white leading-tight tracking-tighter mb-2 break-words overflow-wrap-anywhere">
                          {isMasked
                            ? t("details.status.masked")
                            : match.type === "tournament"
                              ? match.name
                              : match.club?.name}
                        </h1>
                        <p className="flex items-center justify-center md:justify-start gap-2 text-default-400 font-bold tracking-widest text-[9px] md:text-xs">
                          <svg
                            className="w-4 h-4 text-primary shrink-0"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              clipRule="evenodd"
                              d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
                              fillRule="evenodd"
                            />
                          </svg>
                          <span className="whitespace-normal text-left overflow-wrap-anywhere">
                            {isMasked
                              ? t("details.status.city_masked")
                              : `${match.location_city || match.club?.city} (${match.location_zip || match.club?.zip})`}
                          </span>
                        </p>
                      </div>

                      {!isMasked && (
                        <div className="flex flex-col gap-3 pt-2">
                          <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl p-3">
                            <p className="text-[10px] text-default-400 font-black tracking-widest mb-1">
                              {t("details.labels.precised_location")}
                            </p>
                            <p className="text-white font-bold text-sm break-words overflow-wrap-anywhere">
                              {match.location_address || match.club?.address}
                            </p>
                          </div>
                          <Button
                            as="a"
                            className="font-black tracking-tighter h-auto py-3 px-6 rounded-2xl"
                            color="primary"
                            href={
                              match.club?.latitude &&
                              match.club?.longitude &&
                              (!match.location_address ||
                                match.location_address === match.club.address)
                                ? `https://www.google.com/maps/search/?api=1&query=${match.club.latitude},${match.club.longitude}`
                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${match.location_address || match.club?.address || ""}, ${match.location_zip || match.club?.zip || ""} ${match.location_city || match.club?.city || ""}`.trim().replace(/^,/, "").trim())}`
                            }
                            rel="noopener noreferrer"
                            startContent={<span className="text-xl">📍</span>}
                            target="_blank"
                            variant="shadow"
                          >
                            {t("details.buttons.itinerary")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Info Grid Component */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem
                  color="primary"
                  highlight={highlights.category}
                  icon="⚽"
                  label={t("details.labels.category")}
                  showPulse={showPulse}
                  value={t(`enums.category.${match.category}`)}
                />
                <InfoItem
                  color="secondary"
                  highlight={highlights.level}
                  icon="⭐"
                  label={t("details.labels.level")}
                  showPulse={showPulse}
                  value={
                    match.level
                      ? t(`enums.level.${match.level}`)
                      : t("common:not_provided", "Non renseigné")
                  }
                />
                <InfoItem
                  color="success"
                  highlight={highlights.pitch}
                  icon="🌱"
                  label={t("details.labels.pitch")}
                  showPulse={showPulse}
                  value={
                    match.pitch_type
                      ? t(`enums.pitch.${match.pitch_type}`)
                      : t("enums.pitch.all")
                  }
                />
                <InfoItem
                  color="warning"
                  highlight={highlights.format}
                  icon="👥"
                  label={t("details.labels.format")}
                  showPulse={showPulse}
                  value={t(`enums.format.${match.format}`, match.format)}
                />
                <InfoItem
                  color="orange"
                  highlight={highlights.date}
                  icon="📅"
                  label={t("details.labels.date")}
                  showPulse={showPulse}
                  value={new Date(match.match_date).toLocaleDateString(
                    i18n.language,
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    },
                  )}
                />
                <InfoItem
                  color="info"
                  highlight={highlights.time}
                  icon="⏰"
                  label={t("details.labels.time")}
                  showPulse={showPulse}
                  value={`${formatTime(match.match_time)}${match.match_end_time ? ` - ${formatTime(match.match_end_time)}` : ""}`}
                />
                <InfoItem
                  color="violet"
                  highlight={highlights.venue}
                  icon="📍"
                  label={t("details.labels.venue")}
                  showPulse={showPulse}
                  value={t(`enums.venue.${match.venue}`)}
                />
                <InfoItem
                  color="cyan"
                  highlight={highlights.gender}
                  icon="🚻"
                  label={t("details.labels.gender")}
                  showPulse={showPulse}
                  value={t(`enums.gender.${gender}`)}
                />
              </div>

              {/* Banner "J'ai vu les modifications" */}
              {isModified && Object.values(highlights).some(Boolean) && (
                <div className="bg-danger/10 border-2 border-danger/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-appearance-in shadow-lg shadow-danger/10">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl animate-bounce">⚠️</span>
                    <div>
                      <p className="text-sm font-black text-danger tracking-tight">
                        {t(
                          "details.modification_alert_title",
                          "Des modifications ont été apportées",
                        )}
                      </p>
                      <p className="text-[10px] text-danger/70 font-medium">
                        {t(
                          "details.modification_alert_desc",
                          "Les champs en rouge ont été modifiés par l'organisateur.",
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="font-black text-sm tracking-tight shadow-lg shadow-danger/20 h-11 px-6 shrink-0 w-full sm:w-auto"
                    color="danger"
                    isLoading={isMarkingRead}
                    size="sm"
                    variant="solid"
                    onPress={handleMarkAsRead}
                  >
                    {t(
                      "dashboard.controls.view_changes",
                      "J'AI VU LES MODIFICATIONS",
                    )}
                  </Button>
                </div>
              )}

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {match.jersey_color && (
                  <div className="bg-[#1c1c1f] rounded-3xl p-6 border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-default-400 font-black tracking-widest mb-1 uppercase">
                        {t("details.labels.jersey_color")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-white font-black text-sm sm:text-base text-right">
                        {match.jersey_color}
                      </p>
                      <JerseyColorDots colors={match.jersey_color} size="lg" />
                    </div>
                  </div>
                )}
                {match.type === "tournament" && (
                  <div className="bg-[#1c1c1f] rounded-3xl p-6 border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-default-400 font-black tracking-widest mb-1">
                        {t("details.labels.registrations")}
                      </p>
                      <p className="text-white font-bold">
                        {(match.accepted_count || 0) + 1} / {match.max_teams}{" "}
                        {t("details.labels.confirmed_teams")}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center font-black text-xs text-primary">
                      {Math.round(
                        (((match.accepted_count || 0) + 1) /
                          (match.max_teams || 1)) *
                          100,
                      )}
                      %
                    </div>
                  </div>
                )}
              </div>

              {cleanNotes && (
                <div className="bg-linear-to-br from-amber-500/10 to-orange-500/5 rounded-3xl p-8 border border-amber-500/20">
                  <h3 className="font-black text-xl text-amber-500 tracking-tighter mb-4 flex items-center gap-3">
                    <span className="text-2xl">📝</span>{" "}
                    {t("matchForm.labels.notes", "Notes & Instructions")}
                  </h3>
                  <div className="text-default-400 font-medium leading-relaxed italic text-lg opacity-80 border-l-2 border-amber-500/30 pl-6">
                    {cleanNotes}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar: Contact */}
            <div className="flex flex-col gap-4">
              <Card className="shadow-2xl border-none bg-linear-to-br from-primary/10 to-secondary/10 overflow-hidden">
                <CardHeader className="font-black bg-primary/20 text-white justify-center tracking-widest text-xs py-3 border-b border-white/5">
                  {t("details.labels.organizer_management")}
                </CardHeader>
                <CardBody className="gap-6 p-8">
                  {user?.id === match.owner_id ? (
                    <div className="text-center space-y-4">
                      {match.contacts?.some((c) => c.status === "accepted") ? (
                        <div className="bg-emerald-500/20 border-2 border-emerald-500/30 p-5 rounded-[2rem] space-y-4 mb-4 animate-appearance-in">
                          <p className="text-emerald-400 font-black text-center text-sm tracking-widest flex items-center justify-center gap-2">
                            {t("details.status.confirmed")}
                          </p>
                          <Button
                            className="w-full font-black tracking-tighter h-12 rounded-2xl shadow-lg shadow-rose-500/20"
                            color="danger"
                            variant="shadow"
                            onPress={onCancelAcceptedOpen}
                          >
                            {match.type === "tournament"
                              ? t(
                                  "details.buttons.cancel_tournament",
                                  "Annuler le tournoi",
                                )
                              : t(
                                  "details.buttons.cancel_duel",
                                  "Annuler le duel",
                                )}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-default-500 text-sm font-bold tracking-wide">
                          {t("details.labels.organizer_management")}
                        </p>
                      )}
                      <Button
                        as={Link}
                        className="w-full font-black tracking-tighter h-14 rounded-2xl bg-white text-black shadow-xl"
                        startContent={<span className="text-xl">✍️</span>}
                        to={`/matches/${id}/edit`}
                        variant="shadow"
                      >
                        {t("details.buttons.edit_ad")}
                      </Button>
                      {match.type === "tournament" &&
                        match.status === "active" && (
                          <Button
                            className="w-full font-black tracking-tighter h-14 rounded-2xl shadow-lg shadow-emerald-500/20"
                            color="success"
                            startContent={<span className="text-xl">🔒</span>}
                            variant="shadow"
                            onPress={onCloseRegOpen}
                          >
                            {t("details.buttons.close_tournament")}
                          </Button>
                        )}
                    </div>
                  ) : (
                    <>
                      {isModified && (
                        <div className="bg-rose-500/20 border-2 border-rose-500/30 p-5 rounded-[2rem] space-y-4 mb-6 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.4)]">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-2xl animate-bounce">⚠️</span>
                            <p className="text-rose-400 font-black text-center text-sm tracking-widest leading-tight">
                              {t("details.status.modified", "MATCH MODIFIÉ")}
                            </p>
                            <p className="text-rose-300 text-[10px] font-bold opacity-80 text-center">
                              {t(
                                "details.status.modified_desc",
                                "Certains détails ont changé",
                              )}
                            </p>
                          </div>
                          <Button
                            className="w-full font-black tracking-tighter h-12 rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            isLoading={isMarkingRead}
                            variant="solid"
                            onPress={handleMarkAsRead}
                          >
                            {t(
                              "details.buttons.view_changes",
                              "J'ai vu les changements",
                            )}
                          </Button>
                        </div>
                      )}

                      {(() => {
                        const userContact = match.contacts?.find(
                          (c) => c.user_id === user?.id,
                        );
                        const isProfileIncomplete = !profileComplete;

                        // STATE: Accepted → show only "DUEL CONFIRMÉ" block
                        if (userContact?.status === "accepted") {
                          return (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-4 animate-appearance-in">
                              <p className="text-emerald-400 font-black text-center text-sm tracking-widest flex items-center justify-center gap-2">
                                {t("details.status.confirmed")}
                              </p>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <Button
                                  className="font-black tracking-tighter h-12 border border-warning/20 shadow-lg shadow-warning/10"
                                  color="warning"
                                  variant="flat"
                                  onPress={() =>
                                    (window.location.href = `tel:${match.phone}`)
                                  }
                                >
                                  {t("details.buttons.call")}
                                </Button>
                                <Button
                                  className="font-black tracking-tighter h-12 border border-secondary/20 shadow-lg shadow-secondary/10"
                                  color="secondary"
                                  variant="flat"
                                  onPress={() =>
                                    (window.location.href = `mailto:${match.email}`)
                                  }
                                >
                                  {t("details.buttons.email")}
                                </Button>
                              </div>
                              <Button
                                className="w-full font-bold text-xs sm:text-sm h-11 mt-2"
                                color="danger"
                                variant="flat"
                                onPress={onCancelOpen}
                              >
                                {match.type === "tournament"
                                  ? t("match.withdraw_tournament")
                                  : t("match.withdraw_match")}
                              </Button>
                            </div>
                          );
                        }

                        // STATE: Refused → show only "Demande Refusée"
                        if (userContact?.status === "refused") {
                          return (
                            <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl">
                              <p className="text-danger font-black text-center text-sm tracking-tighter">
                                {t("details.status.refused")}
                              </p>
                            </div>
                          );
                        }

                        // STATE: Pending or no contact → show initial request block
                        return (
                          <>
                            <p className="text-default-400 text-sm text-center">
                              {t("details.labels.participate_prompt")}
                            </p>

                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <Button
                                className="font-black tracking-tighter h-12 border border-warning/20 shadow-lg shadow-warning/10"
                                color="warning"
                                variant="flat"
                                onPress={() => {
                                  if (isMasked) {
                                    openGateway(
                                      "Veuillez compléter votre profil pour effectuer cette action",
                                    );

                                    return;
                                  }
                                  window.location.href = `tel:${match.phone}`;
                                }}
                              >
                                {t("details.buttons.call")}
                              </Button>
                              <Button
                                className="font-black tracking-tighter h-12 border border-secondary/20 shadow-lg shadow-secondary/10"
                                color="secondary"
                                variant="flat"
                                onPress={() => {
                                  if (isMasked) {
                                    openGateway(
                                      "Veuillez compléter votre profil pour effectuer cette action",
                                    );

                                    return;
                                  }
                                  window.location.href = `mailto:${match.email}`;
                                }}
                              >
                                {t("details.buttons.email")}
                              </Button>
                            </div>
                            <div className="relative flex items-center py-2">
                              <div className="flex-1 border-t border-default-100/10" />
                              <span className="shrink-0 px-2 text-default-500 text-xs font-bold tracking-widest">
                                ou
                              </span>
                              <div className="flex-1 border-t border-default-100/10" />
                            </div>

                            {isProfileIncomplete && (
                              <div className="bg-danger/10 border border-danger/20 p-3 rounded-xl mb-2 animate-appearance-in">
                                <p className="text-danger text-xs sm:text-sm font-bold text-center">
                                  {t(
                                    "profile_incomplete",
                                    "Complète ton profil club pour postuler à ce match",
                                  )}
                                </p>
                              </div>
                            )}

                            {userContact?.message ===
                            t("match.contact_tracking_message") ? (
                              <Button
                                className="w-full font-black tracking-tighter h-12 shadow-lg shadow-danger/20 border border-danger/20"
                                color="danger"
                                variant="shadow"
                                onPress={onCancelOpen}
                              >
                                {t("details.buttons.cancel_request")}
                              </Button>
                            ) : (
                              <Button
                                className="w-full font-black tracking-tighter h-12 shadow-lg"
                                color={
                                  isProfileIncomplete ? "default" : "primary"
                                }
                                isDisabled={isProfileIncomplete}
                                onPress={async () => {
                                  if (isMasked) {
                                    openGateway(
                                      "Veuillez compléter votre profil pour effectuer cette action",
                                    );

                                    return;
                                  }
                                  if (!user) {
                                    openGateway(
                                      "Veuillez vous connecter pour envoyer une demande.",
                                    );

                                    return;
                                  }
                                  if (!user.club_id) {
                                    addToast({
                                      title: "Profil incomplet",
                                      description:
                                        "Veuillez lier votre club pour envoyer une demande.",
                                      color: "warning",
                                      timeout: 5000,
                                    });

                                    return;
                                  }
                                  try {
                                    await contactMatch({
                                      message: t(
                                        "match.contact_tracking_message",
                                      ),
                                    });
                                    addToast({
                                      title: t("success"),
                                      description: t(
                                        "matchForm.alerts.contact_success",
                                        { date: match.match_date },
                                      ),
                                      variant: "flat",
                                      color: "success",
                                      timeout: 5000,
                                    });
                                  } catch (e: unknown) {
                                    addToast({
                                      title: t("error.title"),
                                      description:
                                        (e as Error).message ||
                                        t("error.generic"),
                                      variant: "flat",
                                      color: "danger",
                                      timeout: 5000,
                                    });
                                  }
                                }}
                              >
                                {t("match.send_request")}
                              </Button>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Interaction / Tracking Section */}
            <div className="lg:col-span-3 mt-12">
              <div className="bg-linear-to-br from-[#1c1c1f] to-[#141416] rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary via-secondary to-primary opacity-50" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div className="space-y-1 text-center md:text-left">
                    <h2 className="text-3xl font-black text-white flex items-center justify-center md:justify-start gap-3 tracking-tighter">
                      <span className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-primary/10">
                        🤝
                      </span>
                      {t("match.contact_tracking")}
                    </h2>
                    <p className="text-default-500 font-medium opacity-80 pl-0 md:pl-12">
                      {t("match.contact_tracking_desc", {
                        count: match.contacts?.length || 0,
                      })}
                    </p>
                  </div>
                  <Chip
                    className="font-black px-6 self-center md:self-auto shadow-lg shadow-primary/20"
                    color="primary"
                    size="lg"
                    variant="shadow"
                  >
                    {t("match.interest_count", {
                      count: match.contacts?.length || 0,
                    })}
                  </Chip>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {match.contacts && match.contacts.length > 0 ? (
                    match.contacts.map((contact, index) => {
                      const isActionable =
                        user?.id === match.owner_id &&
                        contact.message === t("match.contact_tracking_message");
                      const statusConfig = {
                        accepted: {
                          border: "border-emerald-500/50",
                          bg: "bg-emerald-500/5",
                          color: "text-emerald-400",
                          icon: "✅",
                        },
                        refused: {
                          border: "border-rose-500/30",
                          bg: "bg-rose-500/5",
                          color: "text-rose-400",
                          icon: "❌",
                        },
                        withdrawn: {
                          border: "border-zinc-500/20",
                          bg: "bg-zinc-500/5",
                          color: "text-zinc-500",
                          icon: "🗑️",
                        },
                        pending: {
                          border: "border-primary/30",
                          bg: "bg-primary/5",
                          color: "text-primary",
                          icon: "⏳",
                        },
                      }[contact.status];

                      return (
                        <Card
                          key={index}
                          className={`border-2 ${statusConfig.border} ${statusConfig.bg} rounded-3xl transition-all ${isActionable ? "hover:scale-[1.03] hover:border-primary shadow-xl shadow-primary/5 cursor-pointer" : ""}`}
                          isPressable={isActionable}
                          onPress={() => isActionable && navigate("/dashboard")}
                        >
                          <CardBody className="p-6 gap-4">
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-14 h-14 rounded-2xl bg-[#000] border border-white/10 flex items-center justify-center text-2xl shadow-inner relative`}
                              >
                                {contact.club_logo ? (
                                  <HeroImage
                                    className="w-10 h-10 object-contain"
                                    src={contact.club_logo}
                                  />
                                ) : (
                                  contact.club_name?.charAt(0) || "?"
                                )}
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-[#111] border border-white/10 flex items-center justify-center text-xs">
                                  {statusConfig.icon}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <p className="font-black text-white tracking-tighter leading-tight mb-1 break-words overflow-wrap-anywhere">
                                  {contact.club_name || "Club intéressé"}
                                </p>
                                <div className="flex flex-col gap-0.5">
                                  <p className="text-[10px] text-default-500 font-bold tracking-widest">
                                    {new Date(
                                      contact.contacted_at,
                                    ).toLocaleDateString()}
                                  </p>
                                  {contact.message && (
                                    <p className="text-[10px] text-primary font-black tracking-tighter italic opacity-80 break-words overflow-wrap-anywhere">
                                      {contact.message}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {contact.status !== "pending" && (
                              <div
                                className={`py-1.5 px-3 rounded-xl border border-current/20 font-black text-[10px] text-center tracking-widest ${statusConfig.color}`}
                              >
                                {contact.status === "accepted"
                                  ? t("details.status.accepted")
                                  : contact.status === "refused"
                                    ? t("details.status.refused")
                                    : t("details.status.withdrawn")}
                              </div>
                            )}

                            {isActionable && (
                              <Button
                                className="font-black tracking-tighter w-full rounded-xl"
                                color="primary"
                                size="sm"
                                variant="shadow"
                                onPress={() =>
                                  navigate("/dashboard?tab=requests")
                                }
                              >
                                {t(
                                  "details.buttons.view_request",
                                  "Voir la demande",
                                )}
                              </Button>
                            )}
                          </CardBody>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="col-span-full min-h-[300px] flex flex-col items-center justify-center bg-white/5 rounded-[2rem] border border-dashed border-white/10 opacity-60 p-8 text-center">
                      <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-3xl mb-4">
                        🌑
                      </div>
                      <p className="text-default-400 font-black tracking-widest text-sm max-w-[200px] md:max-w-none">
                        {t("details.status.no_applications")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cancel Request Confirmation Modal */}
          <Modal
            backdrop="blur"
            isOpen={isCancelOpen}
            onOpenChange={onCancelOpenChange}
          >
            <ModalContent className="bg-[#1a1a1c] border border-white/10">
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1 text-white font-black tracking-tighter p-4 sm:p-6">
                    {t("details.modal.withdraw_title")}
                  </ModalHeader>
                  <ModalBody className="p-4 pt-2 sm:p-6 sm:pt-2">
                    <p className="text-default-400 font-medium">
                      {t("details.modal.withdraw_desc")}
                    </p>
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      className="font-bold"
                      variant="light"
                      onPress={onClose}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      autoFocus
                      className="font-black tracking-tighter shadow-lg shadow-danger/20"
                      color="danger"
                      isLoading={isCancelling}
                      onPress={handleCancelRequest}
                    >
                      {t("details.modal.withdraw_confirm")}
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal
            backdrop="blur"
            isOpen={isDeleteOpen}
            onOpenChange={onDeleteOpenChange}
          >
            <ModalContent className="bg-[#1a1a1c] border border-white/10">
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1 text-red-500 font-black tracking-tighter p-4 sm:p-6">
                    {t("details.admin.delete_ad")}
                  </ModalHeader>
                  <ModalBody className="p-4 pt-2 sm:p-6 sm:pt-2">
                    <p className="text-default-400 font-medium">
                      {match.type === "tournament"
                        ? t(
                            "match.confirm_delete_tournament",
                            "Es-tu sûr de vouloir supprimer ce tournoi ?",
                          )
                        : t(
                            "match.confirm_delete_match",
                            "Es-tu sûr de vouloir supprimer ce match ?",
                          )}{" "}
                      {t(
                        "details.modal.irreversible",
                        "Cette action est irréversible.",
                      )}
                    </p>
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      className="font-bold"
                      variant="light"
                      onPress={onClose}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      autoFocus
                      className="font-black tracking-tighter shadow-lg shadow-danger/20"
                      color="danger"
                      isLoading={isDeleting}
                      onPress={handleDelete}
                    >
                      {t("details.modal.delete_confirm")}
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>

          {/* Admin Delete Confirmation Modal */}
          <Modal
            backdrop="blur"
            isOpen={isAdminDeleteOpen}
            onOpenChange={onAdminDeleteOpenChange}
          >
            <ModalContent className="bg-[#1a1a1c] border border-white/10">
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1 text-white font-black tracking-tighter">
                    {t("details.admin.moderation_tools")}
                  </ModalHeader>
                  <ModalBody>
                    <p className="text-default-400 font-medium italic">
                      {t(
                        "details.modal.admin_delete_desc",
                        "⚠️ Attention : En tant qu'administrateur, vous allez supprimer cette annonce. L'action est définitive.",
                      )}
                    </p>
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      className="font-bold"
                      variant="light"
                      onPress={onClose}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      autoFocus
                      className="font-black tracking-tighter shadow-lg shadow-danger/20"
                      color="danger"
                      isLoading={isAdminDeleting}
                      onPress={handleAdminDelete}
                    >
                      {t("details.modal.admin_delete_confirm")}
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>

          {/* Block Confirmation Modal */}
          <Modal
            backdrop="blur"
            isOpen={isBlockOpen}
            onOpenChange={onBlockOpenChange}
          >
            <ModalContent className="bg-[#1a1a1c] border border-white/10">
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1 text-white font-black tracking-tighter">
                    {t("details.admin.block_user")}
                  </ModalHeader>
                  <ModalBody>
                    <p className="text-default-400 font-medium mb-2">
                      {t("details.modal.block_desc")}
                    </p>
                    <Textarea
                      isRequired
                      className="mt-2"
                      label={t("details.modal.block_reason_label")}
                      placeholder={t(
                        "details.modal.block_reason_placeholder",
                        "Saisissez la raison du blocage (ex: Comportement inapproprié, multiples désistements...)",
                      )}
                      value={blockReason}
                      variant="bordered"
                      onValueChange={setBlockReason}
                    />
                  </ModalBody>

                  <ModalFooter>
                    <Button
                      className="font-bold"
                      variant="light"
                      onPress={onClose}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      autoFocus
                      className="font-black tracking-tighter shadow-lg shadow-danger/20"
                      color="danger"
                      isLoading={isBlocking}
                      onPress={async () => {
                        await handleBlockUser();
                        onClose();
                      }}
                    >
                      {t("details.modal.block_confirm")}
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>

          {/* Close Registrations Modal */}
          <Modal
            backdrop="blur"
            isOpen={isCloseRegOpen}
            onOpenChange={onCloseRegOpenChange}
          >
            <ModalContent className="bg-[#1a1a1c] border border-white/10">
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1 text-white font-black tracking-tighter">
                    {t("details.labels.registrations")}
                  </ModalHeader>
                  <ModalBody>
                    <p className="text-default-400 font-medium">
                      {t("details.modal.close_registrations_desc")}
                    </p>
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      className="font-bold"
                      variant="light"
                      onPress={onClose}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      className="font-black tracking-tighter shadow-lg shadow-success/20"
                      color="success"
                      onPress={async () => {
                        try {
                          await closeRegistrations();
                          addToast({
                            title: t("success"),
                            description: t(
                              "details.modal.closed_success",
                              "Inscriptions closes",
                            ),
                            color: "success",
                          });
                          onClose();
                        } catch {
                          addToast({
                            title: t("error.title"),
                            description: t(
                              "error.action_impossible",
                              "Action impossible",
                            ),
                            color: "danger",
                          });
                        }
                      }}
                    >
                      {t("details.buttons.close")}
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>

          {/* Cancel Accepted Contact Modal (Owner view) */}
          <Modal
            backdrop="blur"
            isOpen={isCancelAcceptedOpen}
            onOpenChange={onCancelAcceptedOpenChange}
          >
            <ModalContent className="bg-[#1a1a1c] border border-white/10">
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1 text-white font-black tracking-tighter">
                    {t("details.modal.cancel_confirmed_title")}
                  </ModalHeader>
                  <ModalBody>
                    <p className="text-default-400 font-medium">
                      {t("details.modal.cancel_confirmed_desc")}
                    </p>
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      className="font-bold"
                      variant="light"
                      onPress={onClose}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      className="font-black tracking-tighter shadow-lg shadow-danger/20"
                      color="danger"
                      onPress={() => {
                        const acceptedContact = match.contacts?.find(
                          (c) => c.status === "accepted",
                        );

                        if (acceptedContact)
                          updateRequestStatus(
                            acceptedContact.user_id,
                            "refused",
                          );
                        onClose();
                      }}
                    >
                      {t("details.modal.withdraw_confirm")}
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
        </div>
      </DataWall>
    </DefaultLayout>
  );
}
