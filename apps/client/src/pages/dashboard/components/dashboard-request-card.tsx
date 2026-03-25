import React from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Image as HeroImage } from "@heroui/image";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { MatchRequest } from "@/types/match.types";

interface DashboardRequestCardProps {
  request: MatchRequest;
  actionLoading: Record<string, boolean>;
  onAction: (request: MatchRequest, status: "accepted" | "refused") => void;
  onViewProfile: (request: MatchRequest) => void;
  formatDate: (date: string, lang: string) => string;
  formatTime: (time: string) => string;
  lang: string;
}

export const DashboardRequestCard = React.memo(function DashboardRequestCard({
  request,
  actionLoading,
  onAction,
  onViewProfile,
  formatDate,
  formatTime,
  lang,
}: DashboardRequestCardProps) {
  const { t } = useTranslation("kdufoot");

  return (
    <Card
      className={`overflow-hidden border ${request.request_status === "accepted" ? "border-success/30 bg-success/5" : request.request_status === "refused" ? "border-danger/20 bg-danger/5" : "border-orange-500/20 bg-linear-to-br from-orange-500/5 to-transparent"} md:hover:scale-[1.01] transition-all duration-200 shadow-sm hover:shadow-md`}
    >
      <CardBody className="p-0">
        {/* Top accent bar */}
        <div
          className={`h-1 w-full ${request.request_status === "accepted" ? "bg-success" : request.request_status === "refused" ? "bg-danger" : "bg-linear-to-r from-orange-500 via-amber-400 to-orange-500"}`}
        />

        <div className="p-5 flex flex-col gap-4">
          {/* Header: Club info + Status */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <Link
              className="flex items-center gap-3 w-full sm:w-auto hover:opacity-80 transition-opacity"
              to={`/matches/${request.match_id}`}
            >
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center overflow-hidden border border-orange-500/20 shrink-0">
                {request.requester_club_logo ? (
                  <HeroImage
                    className="object-contain w-10 h-10"
                    src={request.requester_club_logo}
                  />
                ) : (
                  <span className="text-orange-400 font-black text-2xl">
                    {request.requester_club_name?.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-white text-base sm:text-lg leading-tight break-words tracking-tight">
                  {request.requester_club_name}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <Chip
                    className="font-bold text-[9px] h-auto py-0.5 px-1.5 shrink-0"
                    color={
                      request.match_type === "tournament"
                        ? "secondary"
                        : "warning"
                    }
                    size="sm"
                    variant="flat"
                  >
                    {request.match_type === "tournament"
                      ? "🏆 " + t("enums.type.tournament")
                      : "⚽ " + t("enums.type.match")}
                  </Chip>
                  <Chip
                    className="font-bold text-[9px] h-5 px-1.5 grayscale-[0.5]"
                    color={
                      request.match_type === "tournament" ||
                      request.venue === "Domicile"
                        ? "primary"
                        : "warning"
                    }
                    size="sm"
                    variant="flat"
                  >
                    {request.match_type === "tournament" ||
                    request.venue === "Domicile"
                      ? t("dashboard.labels.home_badge")
                      : t("dashboard.labels.away_badge")}
                  </Chip>
                  <Chip
                    className="font-bold text-[9px] h-5 border-none"
                    color="default"
                    size="sm"
                    variant="dot"
                  >
                    {request.requester_category
                      ? t(`enums.category.${request.requester_category}`)
                      : request.match_category
                        ? t(`enums.category.${request.match_category}`)
                        : "—"}
                  </Chip>
                </div>
              </div>
            </Link>
            <div className="flex justify-start sm:justify-end w-full sm:w-auto sm:max-w-[120px] shrink-0">
              <Chip
                className="font-black text-[9px] shadow-sm whitespace-nowrap"
                color={
                  request.request_status === "accepted"
                    ? "success"
                    : request.request_status === "refused"
                      ? "danger"
                      : "warning"
                }
                size="sm"
                variant="solid"
              >
                {t("dashboard.status." + request.request_status)}
              </Chip>
            </div>
          </div>
          {/* Quick Info: Responsable, Ville, Catégorie, Niveau */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
            <div className="flex items-center gap-1 text-[9px] text-default-400">
              <span className="text-default-600">👤</span>
              <span className="font-bold">
                {request.requester_firstname && request.requester_lastname
                  ? `${request.requester_firstname} ${request.requester_lastname}`
                  : t("common:not_provided", "Non renseigné")}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-default-400">
              <span className="text-default-600">📍</span>
              <span className="font-bold text-xs">
                {request.requester_city ||
                  request.location_city ||
                  t("common:unknown_city", "Ville inconnue")}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-default-400">
              <span className="text-default-600">🏅</span>
              <span className="font-bold text-xs text-white">
                {request.requester_category
                  ? t(`enums.category.${request.requester_category}`)
                  : "—"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-default-400">
              <span className="text-default-600">🛡️</span>
              <span className="font-bold text-xs text-white">
                {request.requester_level
                  ? t(`enums.level.${request.requester_level}`)
                  : "—"}
              </span>
            </div>
          </div>

          {/* Match info banner */}
          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-default-400 tracking-widest">
                  {t("dashboard.labels.for_event", {
                    matchType:
                      request.match_type === "tournament"
                        ? t("enums.type.tournament").toLowerCase()
                        : t("enums.type.match").toLowerCase(),
                  })}
                </span>
                <span className="text-sm font-black text-white mt-0.5">
                  {formatDate(request.match_date, lang)} à{" "}
                  {formatTime(request.match_time)}
                </span>
              </div>
              {request.location_city && (
                <Chip
                  className="bg-white/5 text-default-400 text-[9px] font-bold"
                  size="sm"
                  variant="flat"
                >
                  📍 {request.location_city}
                </Chip>
              )}
            </div>
            {request.message &&
              request.message !==
                "Demande de participation envoyée via KduFoot" && (
                <p className="text-sm text-default-400 italic mt-2 line-clamp-2 border-t border-white/5 pt-2">
                  "{request.message}"
                </p>
              )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 relative z-20">
            <Button
              className="flex-1 font-black text-sm h-16 sm:h-12 shadow-lg shadow-emerald-500/20 w-full sm:w-auto text-lg"
              color="success"
              isLoading={
                actionLoading[
                  `${request.match_id}-${request.requester_user_id}-accepted`
                ]
              }
              size="lg"
              startContent={<span className="text-xl">✅</span>}
              onPress={() => onAction(request, "accepted")}
            >
              {t("dashboard.controls.accept", "Accepter")}
            </Button>
            <Button
              className="flex-1 font-black text-sm h-16 sm:h-12 shadow-lg shadow-rose-500/20 w-full sm:w-auto text-lg"
              color="danger"
              isLoading={
                actionLoading[
                  `${request.match_id}-${request.requester_user_id}-refused`
                ]
              }
              size="lg"
              startContent={<span className="text-xl">❌</span>}
              onPress={() => onAction(request, "refused")}
            >
              {t("dashboard.controls.refuse", "Refuser")}
            </Button>
          </div>
          <Button
            className="w-full font-bold text-xs h-10 border-transparent text-secondary/70 hover:text-secondary"
            color="secondary"
            size="sm"
            variant="flat"
            onPress={() => onViewProfile(request)}
          >
            {t("dashboard.labels.view_club_profile")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
});
