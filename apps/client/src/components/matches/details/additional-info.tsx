import { useTranslation } from "react-i18next";
import { JerseyColorDots } from "@/components/jersey-color-dots";

interface AdditionalInfoProps {
  match: any;
}

export const AdditionalInfo = ({ match }: AdditionalInfoProps) => {
  const { t } = useTranslation();

  return (
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
              (((match.accepted_count || 0) + 1) / (match.max_teams || 1)) *
                100,
            )}
            %
          </div>
        </div>
      )}
    </div>
  );
};
