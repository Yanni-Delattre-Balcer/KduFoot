import React from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Match, MatchDiff } from "@/types/match.types";
import { formatPrice } from "@/utils/currency";

interface MatchCardProps {
  match: Match;
  user?: { id: string };
  isMasked?: boolean;
  diff: MatchDiff;
  hasChanges: boolean;
  i18n: { language: string };
  isAdmin?: boolean;
  onAcceptChanges?: (match: Match) => void;
  onDelete?: (id: string) => void;
  isFavorite?: (id: string, type: "match" | "tournament") => boolean;
  onToggleFavorite?: (id: string, type: "match" | "tournament") => void;
}

export const MatchCard = React.memo(function MatchCard({
  match,
  user,
  isMasked,
  diff,
  hasChanges,
  i18n,
  isAdmin,
  onAcceptChanges,
  onDelete,
  isFavorite,
  onToggleFavorite,
}: MatchCardProps) {
  const { t } = useTranslation("kdufoot");

  const isOwner = user?.id === match.owner_id;

  return (
    <Card
      key={match.id}
      className={`group hover:shadow-lg transition-all border relative ${
        hasChanges
          ? "border-red-500/50 shadow-red-500/10"
          : "border-violet-800/50"
      } hover:border-violet-500/40 bg-[#232120] ${
        isOwner ? "ring-2 ring-violet-500 shadow-violet-500/20" : ""
      }`}
    >
      {onToggleFavorite && isFavorite && (
        <Button
          isIconOnly
          className="absolute top-4 right-4 z-20 bg-zinc-900/60 backdrop-blur-md border border-white/10 hover:border-violet-500/50 shadow-lg"
          radius="full"
          size="sm"
          variant="flat"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite(match.id, match.type);
          }}
        >
          {isFavorite(match.id, match.type) ? (
            <span className="text-amber-400 text-lg">★</span>
          ) : (
            <span className="text-default-400 text-lg">☆</span>
          )}
        </Button>
      )}

      <Link className="flex-1 flex flex-col" to={`/matches/${match.id}`}>
        <CardHeader className="pb-2 pt-4 px-4 flex-col items-start gap-2 relative">
          {isOwner && (
            <div className="flex items-center gap-1 bg-linear-to-r from-violet-600 to-amber-700 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shadow-lg z-10 transition-transform group-hover:scale-105 mb-1">
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
              className={`font-bold text-xl ${
                diff.name ? "text-red-500" : "text-default-900"
              } group-hover:text-violet-200 transition-colors tracking-tight wrap-break-word whitespace-normal w-full pr-8`}
            >
              {isMasked
                ? t("matchesPage.masked_club")
                : match.club?.name || t("matchesPage.unknown_club")}
            </h4>
            {match.type === "tournament" && match.name && (
              <h5
                className={`font-bold text-sm ${
                  diff.name ? "text-red-400" : "text-fuchsia-400"
                } group-hover:text-fuchsia-300 transition-colors wrap-break-word whitespace-normal w-full pb-1 pr-8`}
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
                    color={diff.registration_fee ? "danger" : "success"}
                    size="sm"
                    variant="flat"
                  >
                    {match.registration_fee > 0
                      ? formatPrice({
                          amount: match.registration_fee * 100,
                          currency: "EUR",
                        })
                      : t("matchForm.labels.free")}
                  </Chip>
                )}
              <Chip
                className="h-4 text-[9px] font-black"
                color={diff.category || diff.level ? "danger" : "warning"}
                size="sm"
                variant="flat"
              >
                {t(`enums.category.${match.category}`)}{" "}
                {match.level ? `• ${t(`enums.level.${match.level}`)}` : ""}
              </Chip>
              <Chip
                className="h-4 text-[9px] font-black"
                color={diff.pitch_type ? "danger" : "primary"}
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
                  ? t("badges.venue.home")
                  : t("badges.venue.away")}
              </Chip>
            </div>
            <p
              className={`text-small ${
                diff.location_city
                  ? "text-red-500 font-bold"
                  : "text-default-500"
              } font-medium`}
            >
              {isMasked
                ? t("matchesPage.masked_city")
                : `${match.location_city || match.club?.city} (${
                    match.location_zip || match.club?.zip
                  })`}
            </p>
          </div>
        </CardHeader>
        <CardBody className="py-2 px-4 gap-3">
          <div
            className={`flex flex-wrap items-center gap-2 sm:gap-4 text-sm ${
              diff.match_date || diff.match_time
                ? "text-red-500 bg-red-500/10 border border-red-500/20"
                : "text-default-600 bg-default-50"
            } p-2 rounded-lg justify-center transition-colors`}
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
                className={`font-semibold capitalize text-xs sm:text-sm ${
                  diff.match_date ? "animate-pulse" : ""
                }`}
              >
                {new Date(match.match_date).toLocaleDateString(i18n.language, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
            <div
              className={`hidden sm:block w-px h-4 ${
                diff.match_date || diff.match_time
                  ? "bg-red-500/30"
                  : "bg-default-300"
              }`}
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
                className={`font-semibold text-xs sm:text-sm ${
                  diff.match_time ? "animate-pulse" : ""
                }`}
              >
                {match.match_time}
              </span>
            </div>
          </div>
        </CardBody>
      </Link>
      <CardFooter className="flex flex-col gap-2 pt-0 px-4 pb-4 relative">
        {hasChanges && onAcceptChanges && (
          <Button
            className="font-black text-[11px] w-full animate-pulse shadow-lg shadow-red-500/20"
            color="danger"
            size="sm"
            variant="solid"
            onPress={() => onAcceptChanges(match)}
          >
            {t("matchesPage.view_changes")}
          </Button>
        )}
        <div className="flex flex-row gap-2 w-full mt-2">
          <Button
            as={Link}
            className="flex-1 font-black tracking-widest uppercase text-xs"
            color="primary"
            size="sm"
            to={`/matches/${match.id}`}
            variant="flat"
          >
            {t("details.title")}
          </Button>

          {isAdmin && onDelete && (
            <Button
              className="flex-1 font-bold text-xs h-10 border-red-500/20 hover:bg-red-500/10"
              color="danger"
              size="sm"
              variant="light"
              onPress={() => onDelete(match.id)}
            >
              {t("match.confirm_delete_admin")?.split("\n")[0] ||
                "Supprimer l'annonce"}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
});
