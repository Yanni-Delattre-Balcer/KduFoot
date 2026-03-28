import { useTranslation } from "react-i18next";

import { InfoItem } from "./info-item";

interface InfoGridProps {
  match: any;
  highlights: any;
  showPulse: boolean;
  gender: string;
}

const formatTime = (timeStr: string) => {
  if (!timeStr) return "";

  return timeStr.replace(":", "h");
};

export const InfoGrid = ({
  match,
  highlights,
  showPulse,
  gender,
}: InfoGridProps) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <InfoItem
        color="primary"
        highlight={highlights.category}
        icon="⚽"
        label={t("details.labels.category")}
        showPulse={showPulse}
        value={t(`enums.category.${match.category}`) as string}
      />
      <InfoItem
        color="secondary"
        highlight={highlights.level}
        icon="⭐"
        label={t("details.labels.level")}
        showPulse={showPulse}
        value={
          match.level
            ? (t(`enums.level.${match.level}`) as string)
            : (t("common:not_provided", "Non renseigné") as string)
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
            ? (t(`enums.pitch.${match.pitch_type}`) as string)
            : (t("enums.pitch.all") as string)
        }
      />
      <InfoItem
        color="warning"
        highlight={highlights.format}
        icon="👥"
        label={t("details.labels.format")}
        showPulse={showPulse}
        value={t(`enums.format.${match.format}`, match.format) as string}
      />
      <InfoItem
        color="orange"
        highlight={highlights.date}
        icon="📅"
        label={t("details.labels.date")}
        showPulse={showPulse}
        value={new Date(match.match_date).toLocaleDateString(i18n.language, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
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
        value={t(`enums.venue.${match.venue}`) as string}
      />
      <InfoItem
        color="cyan"
        highlight={highlights.gender}
        icon="🚻"
        label={t("details.labels.gender")}
        showPulse={showPulse}
        value={t(`enums.gender.${gender}`) as string}
      />
    </div>
  );
};
