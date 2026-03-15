import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Image } from "@heroui/image";
import { Progress } from "@heroui/progress";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Match } from "@/types/match.types";

interface OrganizedTournamentCardProps {
  match: Match;
  isTooLate: boolean;
  isSaving: boolean;
  onDelete: (id: string, date: string, time: string) => void;
  onCloseRegistrations: (id: string) => void;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
}

export const OrganizedTournamentCard = ({
  match,
  isTooLate,
  isSaving,
  onDelete,
  onCloseRegistrations,
  formatDate,
  formatTime,
}: OrganizedTournamentCardProps) => {
  const { t } = useTranslation();

  // Extract accepted teams from contacts
  const acceptedContacts =
    match.contacts?.filter((c) => c.status === "accepted") || [];
  const displayTeams = acceptedContacts.slice(0, 3);
  const remainingTeamsCount = Math.max(0, (match.accepted_count || 0) - 3);

  return (
    <Card className="overflow-hidden border transition-all duration-300 shadow-xl hover:shadow-violet-500/20 border-violet-500/40 bg-zinc-900/90 group">
      <div className="absolute inset-0 bg-linear-to-br from-violet-600/10 via-transparent to-transparent opacity-50" />
      <CardBody className="p-0">
        <div className="flex flex-col 2xl:flex-row">
          {/* Left Section: Info & Progress */}
          <div className="flex-1 p-6 border-b 2xl:border-b-0 2xl:border-r border-white/5">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 p-1 shrink-0">
                  {match.club?.logo_url ? (
                    <Image
                      className="object-contain"
                      src={match.club.logo_url}
                    />
                  ) : (
                    <span className="text-white font-black text-2xl">
                      {(match.club?.name || match.name || "T").charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-white text-lg sm:text-xl leading-tight break-words">
                    {match.name || match.club?.name}
                  </h3>
                  <p className="text-[10px] sm:text-xs font-bold text-default-400 mt-1 uppercase tracking-wider">
                    {match.accepted_count || 0} {t("dashboard.tournament.registered_teams", "équipes inscrites")}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <Chip
                      className="font-black text-[10px] sm:text-xs tracking-wider h-auto py-0.5 whitespace-normal"
                      color="secondary"
                      size="sm"
                      variant="flat"
                    >
                      🏆 {t("enums.type.tournament")}
                    </Chip>
                    <Chip
                      className="h-5 text-[9px] font-black shrink-0"
                      color={
                        match.venue === "Extérieur" ? "warning" : "primary"
                      }
                      size="sm"
                      variant="flat"
                    >
                      {match.venue === "Extérieur"
                        ? t("dashboard.labels.away_badge")
                        : t("dashboard.labels.home_badge")}
                    </Chip>
                  </div>
                </div>
              </div>
              <div className="flex justify-start sm:justify-end w-full sm:w-auto sm:max-w-[200px] shrink-0">
                <Chip
                  className="font-black text-xs sm:text-sm py-3 shadow-lg shadow-violet-500/30 w-full"
                  color={match.status === "active" ? "secondary" : "default"}
                  size="sm"
                  variant="solid"
                >
                  {match.status === "active"
                    ? t("dashboard.status.searching")
                    : t(`dashboard.status.${match.status}`, match.status)}
                </Chip>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-xs sm:text-sm font-black text-default-400 tracking-widest mb-1">
                  {t("matchForm.labels.date", "Date")}
                </p>
                <p className="text-sm font-bold text-white">
                  {formatDate(match.match_date)}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-xs sm:text-sm font-black text-default-400 tracking-widest mb-1">
                  {t("matchForm.labels.time", "Heure")}
                </p>
                <p className="text-sm font-bold text-white">
                  {formatTime(match.match_time)}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-xs sm:text-sm font-black text-default-400 tracking-widest mb-1">
                  {t("matchForm.labels.format", "Format")}
                </p>
                <Chip
                  className="font-black text-xs border-none p-0"
                  color="primary"
                  size="sm"
                  variant="dot"
                >
                  {match.format || "5x5"}
                </Chip>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-xs sm:text-sm font-black text-default-400 tracking-widest mb-1">
                  {t("tournamentForm.labels.fee", "Frais")}
                </p>
                <p className="text-sm font-bold text-green-400">
                  {match.registration_fee
                    ? `${match.registration_fee}€`
                    : t("matchForm.labels.free", "Gratuit")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <p className="text-sm font-black text-violet-400 tracking-widest">
                  {t("dashboard.tournament.filling", "Remplissage du tournoi")}
                </p>
                <p className="text-xs font-bold text-white">
                  {(match.accepted_count || 0) + 1} / {match.max_teams || "∞"}
                </p>
              </div>
              <Progress
                aria-label={t(
                  "dashboard.tournament.filling",
                  "Remplissage du tournoi",
                )}
                className="max-w-md"
                classNames={{
                  indicator: "bg-linear-to-r from-violet-500 to-indigo-500",
                }}
                color="secondary"
                size="md"
                value={
                  match.max_teams
                    ? (((match.accepted_count || 0) + 1) / match.max_teams) *
                      100
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
                {displayTeams.map((contact: any, i: number) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-[#0f0f0f] bg-default-100 flex items-center justify-center overflow-hidden z-[3]"
                  >
                    {contact.club_logo ? (
                      <Image src={contact.club_logo} />
                    ) : (
                      <span className="text-xs sm:text-sm font-black">
                        {contact.club_name?.charAt(0)}
                      </span>
                    )}
                  </div>
                ))}
                {remainingTeamsCount > 0 && (
                  <div className="w-10 h-10 rounded-full border-2 border-[#0f0f0f] bg-violet-500 flex items-center justify-center z-[1]">
                    <span className="text-xs sm:text-sm font-black text-white">
                      +{remainingTeamsCount}
                    </span>
                  </div>
                )}
                {match.accepted_count === 0 && (
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
              {isTooLate ? (
                <div className="py-3 px-4 text-center border border-dashed border-danger/30 rounded-xl bg-danger/5">
                  <p className="text-xs sm:text-sm font-black text-danger leading-tight px-2">
                    {t("dashboard.alerts.h2_locked")}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      as={Link}
                      className="flex-1 min-w-[100px] font-bold text-sm h-11 bg-amber-500/10 text-amber-500 active:scale-95"
                      size="sm"
                      to={`/matches/${match.id}/edit`}
                      variant="flat"
                    >
                      {t("edit")}
                    </Button>
                    <Button
                      className="flex-1 min-w-[100px] h-11 font-bold text-sm active:scale-95"
                      color="danger"
                      isLoading={isSaving}
                      size="sm"
                      variant="flat"
                      onPress={() =>
                        onDelete(match.id, match.match_date, match.match_time)
                      }
                    >
                      {t("delete")}
                    </Button>
                  </div>
                  <Button
                    className="w-full font-bold text-sm h-12 active:scale-95 shadow-md shadow-violet-500/20"
                    color={match.status === "found" ? "default" : "secondary"}
                    isDisabled={match.status === "found" || isSaving}
                    size="sm"
                    variant="solid"
                    onPress={() =>
                      match.status !== "found" && onCloseRegistrations(match.id)
                    }
                  >
                    {match.status === "found"
                      ? t(
                          "dashboard.tournament.registrations_closed",
                          "Inscriptions closes",
                        )
                      : t(
                          "dashboard.tournament.close_registrations",
                          "Fermer les inscriptions",
                        )}
                  </Button>
                  <Button
                    as={Link}
                    className="w-full font-bold text-sm h-12 active:scale-95 border border-white/10"
                    size="sm"
                    to={`/matches/${match.id}`}
                    variant="flat"
                  >
                    {t("dashboard.controls.manage_registrations")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
