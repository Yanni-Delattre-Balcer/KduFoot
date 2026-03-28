import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Match } from "@/types/match.types";

export const useMatchesCalendar = (
  matches: Match[],
  type: "match" | "tournament",
) => {
  const { i18n } = useTranslation();
  const [displayMode, setDisplayMode] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const matchesByDate = useMemo(() => {
    const map: Record<string, number> = {};
    const visibleMatches = matches.filter(
      (m) => m.status !== "found" && m.type === type,
    );

    for (const m of visibleMatches) {
      const dateKey = m.match_date.split("T")[0];

      map[dateKey] = (map[dateKey] || 0) + 1;
    }

    return map;
  }, [matches, type]);

  const prevMonth = () =>
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
    );

  const nextMonth = () =>
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
    );

  const getMonthName = (date: Date) =>
    date.toLocaleDateString(i18n.language, { month: "long" });

  const dayNames = useMemo(() => {
    const days = [];
    const d = new Date(2024, 0, 1); // Monday Jan 1 2024

    for (let i = 0; i < 7; i++) {
      days.push(d.toLocaleDateString(i18n.language, { weekday: "short" }));
      d.setDate(d.getDate() + 1);
    }

    return days;
  }, [i18n.language]);

  return {
    displayMode,
    setDisplayMode,
    calendarMonth,
    setCalendarMonth,
    selectedDate,
    setSelectedDate,
    matchesByDate,
    prevMonth,
    nextMonth,
    getMonthName,
    dayNames,
  };
};
