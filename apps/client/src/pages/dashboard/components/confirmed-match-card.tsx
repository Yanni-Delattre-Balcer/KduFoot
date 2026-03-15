import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Image } from "@heroui/image";
import { Progress } from "@heroui/progress";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { JerseyColorDots } from "@/components/jersey-color-dots";

interface ConfirmedMatchCardProps {
  match: any;
  highlighted?: boolean;
  knownData?: {
    date?: string;
    time?: string;
    venue?: string;
    format?: string;
    pitch?: string;
  };
  onMarkAsRead: (matchId: string) => void;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  onWithdraw?: () => void;
  isWithdrawing?: boolean;
}

export const ConfirmedMatchCard = ({
  match,
  highlighted,
  knownData,
  onMarkAsRead,
  formatDate,
  formatTime,
  onWithdraw,
  isWithdrawing,
}: ConfirmedMatchCardProps) => {
  const { t } = useTranslation("kdufoot");

  const isUserHome = match.isUserHome;
  const opponentClubName = match.opponent_club_name;
  const opponentClubLogo = match.opponent_club_logo;

  const isParticipant = match._source === "participant";
  const isModification = match.notification_state === 1;

  // Surgical Highlights calculation rely on knownData
  const previousState = knownData;
  const showSurgical = isParticipant && isModification && previousState;

  const isDateChanged =
    showSurgical && previousState?.date !== match.match_date;
  const isTimeChanged =
    showSurgical && previousState?.time !== match.match_time;
  const isVenueChanged = showSurgical && previousState?.venue !== match.venue;
  const isFormatChanged =
    showSurgical &&
    previousState?.format !== (match.match_format || match.format);
  const isPitchChanged =
    showSurgical &&
    previousState?.pitch !== (match.match_pitch_type || match.pitch_type);

  // Role-based overall styling
  const borderClass =
    isParticipant && isModification
      ? highlighted
        ? "border-danger ring-4 ring-danger/30 shadow-danger/20"
        : "border-danger/50 bg-zinc-900/90 shadow-danger/10"
      : "border-violet-500/40 bg-zinc-900/90";

  return (
    <Card
      className={`overflow-hidden border transition-all duration-300 shadow-xl hover:shadow-violet-500/20 col-span-full ${borderClass} group`}
      id={`card-${match.match_id}`}
    >
      <div className="absolute inset-0 bg-linear-to-br from-violet-600/10 via-transparent to-transparent opacity-50" />
      <CardBody className="p-0">
        <div className="flex flex-col 2xl:flex-row">
          {/* Left Section: Info */}
          <div className="flex-1 p-6 border-b 2xl:border-b-0 2xl:border-r border-white/5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 p-1 shrink-0">
                  {opponentClubLogo ? (
                    <Image className="object-contain" src={opponentClubLogo} />
                  ) : (
                    <span className="text-white font-black text-2xl">
                      {opponentClubName?.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-white text-lg sm:text-xl leading-tight break-words">
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
                <p
                  className={`text-xs sm:text-sm font-black tracking-widest mb-1 ${isDateChanged ? "text-danger" : "text-default-400"}`}
                >
                  {t("matchForm.labels.date", "Date")}
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
                <p
                  className={`text-xs sm:text-sm font-black tracking-widest mb-1 ${isTimeChanged ? "text-danger" : "text-default-400"}`}
                >
                  {t("matchForm.labels.time", "Heure")}
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
                <p
                  className={`text-xs sm:text-sm font-black tracking-widest mb-1 ${isFormatChanged ? "text-danger" : "text-default-400"}`}
                >
                  {t("matchForm.labels.format", "Format")}
                </p>
                <Chip
                  className="font-black text-xs border-none p-0"
                  color={isFormatChanged ? "danger" : "primary"}
                  size="sm"
                  variant="dot"
                >
                  {match.format || match.match_format || "11v11"}
                </Chip>
              </div>
              <div
                className={`rounded-xl p-3 border transition-colors ${isPitchChanged ? "bg-danger/20 border-danger animate-pulse" : "bg-white/5 border-white/5"}`}
              >
                <p
                  className={`text-xs sm:text-sm font-black tracking-widest mb-1 ${isPitchChanged ? "text-danger" : "text-default-400"}`}
                >
                  {t("matchForm.labels.pitch_type", "Terrain")}
                </p>
                <p
                  className={`text-sm font-bold break-words ${isPitchChanged ? "text-danger" : "text-white"}`}
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
          </div>

          {/* Right Section: VS Visual & Actions */}
          <div className="w-full 2xl:w-80 p-6 flex flex-col justify-between bg-white/[0.02]">
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

                <div className="text-xl font-black text-default-300 italic">
                  VS
                </div>

                {/* Opponent Club (Right) */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full border-2 border-success-500/30 bg-success-500/10 flex items-center justify-center overflow-hidden">
                    {opponentClubLogo ? (
                      <Image
                        className="w-full h-full object-contain"
                        src={opponentClubLogo}
                      />
                    ) : (
                      <span className="text-success-500 font-black text-lg">
                        {opponentClubName?.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-default-400 break-words text-center">
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
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  as={Link}
                  className="w-full sm:flex-1 font-bold text-sm h-10 bg-white/5 active:scale-95"
                  size="sm"
                  to={`/matches/${match.match_id}`}
                  variant="flat"
                >
                  {t("dashboard.controls.view")}
                </Button>
                <Button
                  as="a"
                  className="w-full sm:flex-1 font-black text-[10px] h-10 active:scale-95 shadow-sm"
                  color="primary"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${!match.isUserHome && match.opponent_stadium_address ? match.opponent_stadium_address : match.location_address}, ${!match.isUserHome && match.opponent_city ? match.opponent_city : match.location_city}`)}`}
                  rel="noopener noreferrer"
                  size="sm"
                  target="_blank"
                  variant="flat"
                >
                  {t("dashboard.controls.itinerary")}
                </Button>
                <Button
                  as="a"
                  className="w-full sm:flex-1 font-bold text-sm h-10 active:scale-95 shadow-md shadow-violet-500/20"
                  color="secondary"
                  href={`tel:${match.opponent_phone}`}
                  size="sm"
                  variant="solid"
                >
                  {t("dashboard.controls.contact")}
                </Button>
                {match._source === "participant" && onWithdraw && (
                  <Button
                    className="w-full sm:flex-1 font-bold text-xs h-10 active:scale-95 border border-danger/20 hover:bg-danger/10"
                    color="danger"
                    isLoading={isWithdrawing}
                    size="sm"
                    variant="light"
                    onPress={onWithdraw}
                  >
                    Se désister
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
