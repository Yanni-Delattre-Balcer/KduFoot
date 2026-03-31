import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Image as HeroImage } from "@heroui/image";
import { useTranslation } from "react-i18next";

interface MatchHeaderProps {
  match: any;
  isMasked: boolean;
}

export const MatchHeader = ({ match, isMasked }: MatchHeaderProps) => {
  const { t } = useTranslation();

  return (
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
                color={match.type === "tournament" ? "warning" : "primary"}
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
              <h1 className="text-xl md:text-3xl font-black text-white leading-tight tracking-tighter mb-2 wrap-break-word overflow-wrap-anywhere">
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
                  <p className="text-white font-bold text-sm wrap-break-word overflow-wrap-anywhere">
                    {match.location_address || match.club?.address}
                  </p>
                </div>
                <Button
                  as="a"
                  className="font-black tracking-tighter h-auto py-3 px-6 rounded-2xl"
                  color="primary"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${match.location_address || match.club?.address || ""}, ${
                      match.location_zip || match.club?.zip || ""
                    } ${match.location_city || match.club?.city || ""}`
                      .trim()
                      .replace(/^,/, "")
                      .trim(),
                  )}`}
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
  );
};
