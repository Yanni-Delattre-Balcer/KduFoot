import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Image } from "@heroui/image";
import { Progress } from "@heroui/progress";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { JerseyColorDots } from "@/components/jersey-color-dots";

interface ConfirmedTournamentCardProps {
  participation: any;
  highlighted?: boolean;
  knownData?: any;
  isTimeChanged?: boolean;
  onMarkAsRead: (matchId: string) => void;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  onWithdraw?: () => void;
  isWithdrawing?: boolean;
}

export const ConfirmedTournamentCard = ({
  participation: part,
  highlighted,
  knownData,
  isTimeChanged,
  onMarkAsRead,
  formatDate,
  formatTime,
  onWithdraw,
  isWithdrawing,
}: ConfirmedTournamentCardProps) => {
  const { t } = useTranslation("kdufoot");

  // Use knownData for surgical highlights
  const previousState = knownData ? knownData[part.match_id] : null;

  const showSurgical = part.notification_state === 1 && previousState;
  const isDateChanged = showSurgical && previousState?.date !== part.match_date;
  const isNewTimeChanged =
    isTimeChanged || (showSurgical && previousState?.time !== part.match_time);
  const isFormatChanged =
    showSurgical &&
    previousState?.format !== (part.match_format || part.format);
  const isPitchChanged =
    showSurgical &&
    previousState?.pitch !==
      (part.match_pitch_type || part.opponent_pitch_type || part.pitch_type);

  // Mock/Real teams logos (limit to 3)
  const teams = part.accepted_teams || [];
  const displayTeams = teams.slice(0, 3);
  const remainingTeamsCount = Math.max(0, part.accepted_count - 3);

  const isModification = part.notification_state === 1;
  const borderClass = isModification
    ? highlighted
      ? "border-danger ring-4 ring-danger/30 shadow-danger/20"
      : "border-danger/50 bg-zinc-900/90 shadow-danger/10"
    : "border-purple-400/40 bg-zinc-900/90 shadow-xl hover:shadow-purple-500/20";

  return (
    <Card
      className={`overflow-hidden border transition-all duration-300 col-span-full ${borderClass} group`}
      id={`card-${part.match_id}`}
    >
      <div className="absolute inset-0 bg-linear-to-br from-purple-600/10 via-transparent to-transparent opacity-50" />
      <CardBody className="p-0">
        <div className="flex flex-col 2xl:flex-row">
          {/* Left Section: Info & Progress */}
          <div className="flex-1 p-6 border-b 2xl:border-b-0 2xl:border-r border-white/5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 p-1 shrink-0">
                  {part.host_club_logo ? (
                    <Image
                      className="object-contain"
                      src={part.host_club_logo}
                    />
                  ) : (
                    <span className="text-white font-black text-2xl">
                      {part.host_club_name?.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-white text-lg sm:text-xl leading-tight break-words">
                    {part.host_club_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <Chip
                      className="font-black text-[10px] sm:text-xs tracking-wider h-auto py-0.5 whitespace-normal"
                      color="secondary"
                      size="sm"
                      variant="flat"
                    >
                      🏆 {part.name || t("enums.type.tournament")}
                    </Chip>
                    <Chip
                      className="h-5 text-[9px] font-black shrink-0"
                      color="warning"
                      size="sm"
                      variant="flat"
                    >
                      ✈️ {t("dashboard.away_label")}
                    </Chip>
                    {(part.host_home_jersey_color ||
                      part.host_away_jersey_color) && (
                      <div className="flex gap-2 items-center bg-white/5 px-2 py-0.5 rounded-lg border border-white/10 group-hover:border-purple-500/30 transition-colors">
                        {part.host_home_jersey_color && (
                          <JerseyColorDots
                            colors={part.host_home_jersey_color}
                            size="sm"
                          />
                        )}
                        {part.host_away_jersey_color && (
                          <JerseyColorDots
                            colors={part.host_away_jersey_color}
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
                  className="font-black text-xs sm:text-sm py-3 shadow-lg shadow-emerald-500/20 w-full"
                  color="success"
                  size="sm"
                  variant="solid"
                >
                  {t("dashboard.status.accepted")}
                </Chip>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div
                className={`rounded-xl p-3 border transition-colors ${isDateChanged ? "bg-danger/20 border-danger animate-pulse shadow-lg shadow-danger/20 ring-1 ring-danger" : highlighted ? "bg-danger/10 border-danger/40" : "bg-white/5 border-white/5"}`}
              >
                <p
                  className={`text-xs sm:text-sm font-black tracking-widest mb-1 ${isDateChanged || highlighted ? "text-danger" : "text-default-400"}`}
                >
                  {t("matchForm.labels.date", "Date")}
                </p>
                <p
                  className={`text-sm font-bold ${isDateChanged || highlighted ? "text-danger" : "text-white"}`}
                >
                  {formatDate(part.match_date)}
                </p>
              </div>
              <div
                className={`rounded-xl p-3 border transition-colors ${highlighted || isNewTimeChanged ? "bg-danger/20 border-danger animate-pulse shadow-lg shadow-danger/20 ring-1 ring-danger" : "bg-white/5 border-white/5"}`}
              >
                <p
                  className={`text-xs sm:text-sm font-black tracking-widest mb-1 ${highlighted || isNewTimeChanged ? "text-danger" : "text-default-400"}`}
                >
                  {t("matchForm.labels.time", "Heure")}
                </p>
                <p
                  className={`text-sm font-bold ${highlighted || isNewTimeChanged ? "text-danger" : "text-white"}`}
                >
                  {formatTime(part.match_time)}
                </p>
              </div>
              <div
                className={`rounded-xl p-3 border transition-colors ${isFormatChanged ? "bg-danger/20 border-danger animate-pulse shadow-lg shadow-danger/20 ring-1 ring-danger" : highlighted ? "bg-danger/10 border-danger/40" : "bg-white/5 border-white/5"}`}
              >
                <p
                  className={`text-xs sm:text-sm font-black tracking-widest mb-1 ${isFormatChanged || highlighted ? "text-danger" : "text-default-400"}`}
                >
                  {t("matchForm.labels.format", "Format")}
                </p>
                <Chip
                  className="font-black text-xs border-none p-0"
                  color={isFormatChanged || highlighted ? "danger" : "primary"}
                  size="sm"
                  variant="dot"
                >
                  {part.match_format || "5x5"}
                </Chip>
              </div>
              <div
                className={`rounded-xl p-3 border transition-colors ${highlighted ? "bg-danger/10 border-danger/40" : "bg-white/5 border-white/5"}`}
              >
                <p
                  className={`text-xs sm:text-sm font-black tracking-widest mb-1 ${highlighted ? "text-danger" : "text-default-400"}`}
                >
                  {t("tournamentForm.labels.fee", "Frais")}
                </p>
                <p
                  className={`text-sm font-bold ${highlighted ? "text-danger" : "text-green-400"}`}
                >
                  {part.entry_fee
                    ? `${part.entry_fee}€`
                    : t("matchForm.labels.free", "Gratuit")}
                </p>
              </div>
              <div
                className={`rounded-xl p-3 border transition-colors col-span-2 sm:col-span-1 ${isPitchChanged ? "bg-danger/20 border-danger animate-pulse shadow-lg shadow-danger/20 ring-1 ring-danger" : highlighted ? "bg-danger/10 border-danger/40" : "bg-white/5 border-white/5"}`}
              >
                <p
                  className={`text-xs sm:text-sm font-black tracking-widest mb-1 ${isPitchChanged || highlighted ? "text-danger" : "text-default-400"}`}
                >
                  {t("matchForm.labels.pitch_type", "Terrain")}
                </p>
                <p
                  className={`text-sm font-bold ${isPitchChanged || highlighted ? "text-danger" : "text-white"}`}
                >

                  {part.match_pitch_type ||
                  part.opponent_pitch_type ||
                  part.pitch_type
                    ? t(
                        `enums.pitch.${part.match_pitch_type || part.opponent_pitch_type || part.pitch_type}`,
                      )
                    : "—"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <p className="text-sm font-black text-purple-400 tracking-widest">
                  {t("dashboard.tournament.filling", "Remplissage du tournoi")}
                </p>
                <p className="text-xs font-bold text-white">
                  {(part.accepted_count || 0) + 1} / {part.max_teams || "∞"}
                </p>
              </div>
              <Progress
                aria-label={t(
                  "dashboard.tournament.filling",
                  "Remplissage du tournoi",
                )}
                className="max-w-md"
                classNames={{
                  indicator: "bg-linear-to-r from-purple-500 to-pink-500",
                }}
                color="secondary"
                size="md"
                value={
                  part.max_teams
                    ? (((part.accepted_count || 0) + 1) / part.max_teams) * 100
                    : 100
                }
              />
            </div>
          </div>

          {/* Right Section: Teams & Actions */}
          <div className="w-full 2xl:w-80 p-6 flex flex-col justify-between bg-white/[0.02]">
            <div className="mb-6">
              <p className="text-xs sm:text-sm font-black text-default-400 tracking-widest mb-3">
                {t(
                  "dashboard.tournament.registered_teams",
                  "Équipes inscrites",
                )}
              </p>
              <div className="flex items-center -space-x-3">
                {displayTeams.map((team: any, i: number) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-[#0f0f0f] bg-default-100 flex items-center justify-center overflow-hidden z-[3]"
                  >
                    {team.logo_url ? (
                      <Image src={team.logo_url} />
                    ) : (
                      <span className="text-xs sm:text-sm font-black">
                        {team.name?.charAt(0)}
                      </span>
                    )}
                  </div>
                ))}
                {remainingTeamsCount > 0 && (
                  <div className="w-10 h-10 rounded-full border-2 border-[#0f0f0f] bg-purple-500 flex items-center justify-center z-[1]">
                    <span className="text-xs sm:text-sm font-black text-white">
                      +{remainingTeamsCount}
                    </span>
                  </div>
                )}
                {part.accepted_count === 0 && (
                  <p className="text-sm text-default-400 italic">
                    {t(
                      "dashboard.tournament.waiting_teams",
                      "En attente d'équipes...",
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {isModification && (
                <Button
                  className="font-black text-[11px] w-full animate-pulse shadow-lg shadow-danger/20 h-11"
                  color="danger"
                  size="sm"
                  variant="solid"
                  onPress={() => onMarkAsRead(part.match_id)}
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
                  className="w-full sm:flex-1 font-bold text-sm h-10 active:scale-95 bg-white/5"
                  color="default"
                  size="sm"
                  to={`/matches/${part.match_id}`}
                  variant="flat"
                >
                  {t("dashboard.controls.view")}
                </Button>
                <Button
                  as="a"
                  className="w-full sm:flex-1 font-black text-[10px] h-10 active:scale-95 shadow-sm"
                  color="primary"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${part.opponent_stadium_address || part.location_address || part.host_stadium_address}, ${part.opponent_city || part.location_city || part.host_city}`)}`}
                  rel="noopener noreferrer"
                  size="sm"
                  target="_blank"
                  variant="flat"
                >
                  {t("dashboard.controls.itinerary")}
                </Button>
                <Button
                  as="a"
                  className="w-full sm:flex-1 font-bold text-sm h-10 active:scale-95 shadow-md shadow-purple-500/20"
                  color="secondary"
                  href={`tel:${part.host_phone || part.opponent_phone}`}
                  size="sm"
                  variant="solid"
                >
                  {t("dashboard.controls.contact")}
                </Button>
                {onWithdraw && (
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
