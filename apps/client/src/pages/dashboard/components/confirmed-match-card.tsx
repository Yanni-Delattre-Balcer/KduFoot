import React from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Progress } from "@heroui/progress";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { SafeImage } from "@/components/common/safe-image";
import { JerseyColorDots } from "@/components/jersey-color-dots";
import { DashboardMatch } from "@/types/match.types";

interface ConfirmedMatchCardProps {
  match: DashboardMatch;
  highlighted?: boolean;
  knownData?: {
    date?: string;
    time?: string;
    venue?: string;
    format?: string;
    pitch?: string;
  };
  onMarkAsRead: (matchId: string) => void;
  onWithdraw: () => void;
  isWithdrawing?: boolean;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  userId?: string;
}

export const ConfirmedMatchCard = React.memo(function ConfirmedMatchCard({
  match,
  highlighted,
  knownData,
  onMarkAsRead,
  onWithdraw,
  isWithdrawing,
  formatDate,
  formatTime,
  userId,
}: ConfirmedMatchCardProps) {
  const { t } = useTranslation("kdufoot");

  const isUserHome = match.isUserHome;
  const opponentClubName = match.opponent_club_name;
  const opponentClubLogo = match.opponent_club_logo;

  const isParticipant = match._source === "participant";
  const isModification = match.notification_state === 1;

  // Surgical Highlights calculation rely on knownData
  const previousState = knownData;
  const isDifferent = (val1: unknown, val2: unknown) => {
    if (!val1 || !val2) return false;

    return (
      String(val1).trim().toLowerCase() !== String(val2).trim().toLowerCase()
    );
  };

  const isOwner = match.owner_id === userId || match.is_organizer;
  const showSurgical =
    !isOwner && isParticipant && isModification && previousState;

  const isDateChanged =
    showSurgical && isDifferent(previousState?.date, match.match_date);
  const isTimeChanged =
    showSurgical && isDifferent(previousState?.time, match.match_time);
  const isVenueChanged =
    showSurgical && isDifferent(previousState?.venue, match.venue);
  const isFormatChanged =
    showSurgical &&
    isDifferent(previousState?.format, match.match_format || match.format);
  const isPitchChanged =
    showSurgical &&
    isDifferent(
      previousState?.pitch,
      match.match_pitch_type || match.pitch_type,
    );

  // Role-based overall styling
  const borderClass =
    !isOwner && isParticipant && isModification
      ? highlighted
        ? "border-danger ring-4 ring-danger/30 shadow-danger/20"
        : "border-danger/50 bg-zinc-900/90 shadow-danger/10"
      : "border-violet-500/40 bg-zinc-900/90 shadow-xl hover:shadow-violet-500/20";

  return (
    <Card
      className={`overflow-hidden border transition-all duration-300 shadow-xl hover:shadow-violet-500/20 col-span-full ${borderClass} group relative`}
      id={`card-${match.match_id}`}
    >
      <div className="absolute inset-0 bg-linear-to-br from-violet-600/10 via-transparent to-transparent opacity-50 pointer-events-none" />
      <CardBody className="p-0">
        <div className="flex flex-col 2xl:flex-row relative">
          {/* Left Section: Info (Clickable) */}
          <Link
            className="flex-1 p-6 border-b 2xl:border-b-0 2xl:border-r border-white/5 hover:bg-white/2 transition-colors"
            to={`/matches/${match.match_id}`}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 shrink-0">
                  <SafeImage
                    alt={opponentClubName}
                    aspectRatio="1/1"
                    fallbackText={opponentClubName}
                    src={opponentClubLogo}
                    width={64}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-white text-lg sm:text-xl leading-tight wrap-break-word">
                    {opponentClubName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <Chip
                      className="font-black text-xs sm:text-sm tracking-wider h-auto py-0.5 whitespace-normal"
                      color="secondary"
                      size="sm"
                      variant="flat"
                    >
                      ⚽ {t("enums.type.match")}
                    </Chip>
                    <Chip
                      className={`h-5 text-[9px] font-black shrink-0 ${isVenueChanged ? "bg-danger text-white border-danger animate-pulse" : ""}`}
                      color={isUserHome ? "primary" : "warning"}
                      size="sm"
                      variant="flat"
                    >
                      {isUserHome
                        ? t("dashboard.labels.home_badge")
                        : t("dashboard.labels.away_badge")}
                    </Chip>
                    {(match.opponent_home_jersey_color ||
                      match.opponent_away_jersey_color) && (
                      <div className="flex gap-2 items-center bg-white/5 px-2 py-0.5 rounded-lg border border-white/10 group-hover:border-violet-500/30 transition-colors">
                        {match.opponent_home_jersey_color && (
                          <JerseyColorDots
                            colors={match.opponent_home_jersey_color}
                            size="sm"
                          />
                        )}
                        {match.opponent_away_jersey_color && (
                          <JerseyColorDots
                            colors={match.opponent_away_jersey_color}
                            size="sm"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end lg:w-48 shrink-0 flex-col gap-2">
                <Chip
                  className="font-black text-xs sm:text-sm py-3 shadow-lg shadow-violet-500/30 w-full"
                  color="secondary"
                  size="sm"
                  variant="solid"
                >
                  {t("dashboard.status.accepted")}
                </Chip>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div
                className={`rounded-xl p-3 border transition-colors ${isDateChanged ? "bg-danger/20 border-danger animate-pulse" : "bg-white/5 border-white/5"}`}
              >
                <p className="text-xs sm:text-sm font-black tracking-widest mb-1 text-default-400">
                  {t("details.labels.date", "Date")}
                </p>
                <p
                  className={`text-sm font-bold ${isDateChanged ? "text-danger" : "text-white"}`}
                >
                  {formatDate(match.match_date)}
                </p>
              </div>
              <div
                className={`rounded-xl p-3 border transition-colors ${isTimeChanged ? "bg-danger/20 border-danger animate-pulse shadow-lg shadow-danger/20 ring-1 ring-danger" : "bg-white/5 border-white/5"}`}
              >
                <p className="text-xs sm:text-sm font-black tracking-widest mb-1 text-default-400">
                  {t("details.labels.time", "Heure")}
                </p>
                <p
                  className={`text-sm font-bold ${isTimeChanged ? "text-danger" : "text-white"}`}
                >
                  {formatTime(match.match_time)}
                </p>
              </div>
              <div
                className={`rounded-xl p-3 border transition-colors ${isFormatChanged ? "bg-danger/20 border-danger animate-pulse" : "bg-white/5 border-white/5"}`}
              >
                <p className="text-xs sm:text-sm font-black tracking-widest mb-1 text-default-400">
                  {t("details.labels.format", "Format")}
                </p>
                <Chip
                  className="font-black text-xs border-none p-0"
                  color={isFormatChanged ? "danger" : "primary"}
                  size="sm"
                  variant="dot"
                >
                  {
                    t(
                      "enums.format." +
                        (match.format || match.match_format || "11v11"),
                      match.format || match.match_format || "11v11",
                    ) as string
                  }
                </Chip>
              </div>
              <div
                className={`rounded-xl p-3 border transition-colors ${isPitchChanged ? "bg-danger/20 border-danger animate-pulse" : "bg-white/5 border-white/5"}`}
              >
                <p className="text-xs sm:text-sm font-black tracking-widest mb-1 text-default-400">
                  {t("details.labels.pitch", "Terrain")}
                </p>
                <p
                  className={`text-sm font-bold wrap-break-word ${isPitchChanged ? "text-danger" : "text-white"}`}
                >
                  {match.opponent_pitch_type || match.pitch_type
                    ? t(
                        `enums.pitch.${match.opponent_pitch_type || match.pitch_type}`,
                      )
                    : "—"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <p className="text-sm font-black text-violet-400 tracking-widest">
                  {t("dashboard.match.found")}
                </p>
                <p className="text-xs font-bold text-white">1 / 1</p>
              </div>
              <Progress
                aria-label={t("dashboard.match.found", "Match trouvé")}
                className="max-w-md"
                classNames={{
                  indicator: "bg-linear-to-r from-violet-500 to-indigo-500",
                }}
                color="secondary"
                size="md"
                value={100}
              />
            </div>
          </Link>

          {/* Right Section: VS Visual & Actions (Buttons) */}
          <div className="w-full 2xl:w-80 p-6 flex flex-col justify-between bg-white/2">
            <div className="mb-6 flex flex-col items-center">
              <p className="text-xs sm:text-sm font-black text-default-400 tracking-widest mb-4 w-full text-center md:text-left">
                {t("dashboard.labels.match_opposition")}
              </p>

              <div className="flex items-center justify-center gap-6 w-full">
                {/* User Club (Left) */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full border-2 border-orange-500/30 bg-orange-500/10 flex items-center justify-center overflow-hidden">
                    <span className="text-orange-500 font-black text-lg">
                      M
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-default-400">
                    {t("dashboard.labels.my_club")}
                  </span>
                </div>

                <div className="text-xl font-black text-default-400 italic text-center">
                  VS
                </div>

                {/* Opponent Club (Right) */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12">
                    <SafeImage
                      alt={opponentClubName}
                      aspectRatio="1/1"
                      fallbackText={opponentClubName}
                      src={opponentClubLogo}
                      width={48}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-default-400 wrap-break-word text-center">
                    {opponentClubName}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {isParticipant && isModification && (
                <Button
                  className="font-black text-[11px] w-full animate-pulse shadow-lg shadow-danger/20 h-11"
                  color="danger"
                  size="sm"
                  variant="solid"
                  onPress={() => onMarkAsRead(match.match_id)}
                >
                  {t(
                    "dashboard.controls.view_changes",
                    "J'ai vu les changements",
                  )}
                </Button>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  aria-label={t(
                    "dashboard.labels.view_details",
                    "Voir les détails du match",
                  )}
                  as={Link}
                  className="flex-1 min-w-[120px] font-bold text-sm h-12 active:scale-95 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  color="default"
                  size="sm"
                  to={`/matches/${match.match_id}`}
                  variant="flat"
                >
                  {t("details.title")}
                </Button>
                {isParticipant && onWithdraw && (
                  <Button
                    aria-label={t(
                      "dashboard.controls.withdraw",
                      "Se désister du match",
                    )}
                    className="flex-1 min-w-[120px] font-bold text-xs h-12 active:scale-95 border border-danger/20 hover:bg-danger/10 whitespace-normal leading-tight text-center"
                    color="danger"
                    isLoading={isWithdrawing}
                    size="md"
                    variant="light"
                    onPress={onWithdraw}
                  >
                    {t("match.withdraw_match")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
});
