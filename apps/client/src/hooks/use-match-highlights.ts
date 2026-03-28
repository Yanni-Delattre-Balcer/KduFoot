import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { addToast } from "@heroui/toast";

import { Match, MatchParticipation } from "@/types/match.types";

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

interface MatchHighlightsProps {
  matchId: string | undefined;
  match: Match | undefined;
  participations: MatchParticipation[] | undefined;
  userId: string | undefined;
  markAsRead: (matchId: string) => Promise<void>;
}

export const useMatchHighlights = ({
  matchId,
  match,
  participations,
  userId,
  markAsRead,
}: MatchHighlightsProps) => {
  const { t } = useTranslation();
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [showPulse, setShowPulse] = useState(true);

  const participation = participations?.find((p) => p.match_id === matchId);
  const isOwner = userId === match?.owner_id;
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

  const matchKnownData = knownData[matchId || ""];

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

  // Stop pulse after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleMarkAsRead = async () => {
    if (!matchId || !match) return;
    setIsMarkingRead(true);
    try {
      await markAsRead(matchId);

      // Update knownData so changes are no longer detected
      const nextKnown = {
        ...knownData,
        [matchId]: {
          date: match.match_date,
          time: match.match_time,
          venue: match.venue,
          format: match.format,
          pitch: match.pitch_type,
          category: match.category,
          level: match.level,
          gender: gender,
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
    } catch (e) {
      console.error(e);
      addToast({
        title: t("error.title"),
        description: t(
          "error.mark_as_read_failed",
          "Impossible de valider les modifications",
        ),
        color: "danger",
      });
    } finally {
      setIsMarkingRead(false);
    }
  };

  const hasHighlights = Object.values(highlights).some(Boolean);

  return {
    highlights,
    showPulse,
    isMarkingRead,
    handleMarkAsRead,
    isModified,
    hasHighlights,
    gender,
    cleanNotes,
  };
};
