import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { useTranslation } from "react-i18next";

interface CalendarViewProps {
  calendarMonth: Date;
  matchesByDate: Record<string, number>;
  selectedDate: string | null;
  prevMonth: () => void;
  nextMonth: () => void;
  getMonthName: (date: Date) => string;
  dayNames: string[];
  handleDayClick: (dateKey: string) => void;
}

const getDaysInMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const getFirstDayOfMonth = (date: Date) => {
  const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  return day === 0 ? 6 : day - 1; // Monday = 0
};

const formatDateKey = (year: number, month: number, day: number) => {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const CalendarView = ({
  calendarMonth,
  matchesByDate,
  selectedDate,
  prevMonth,
  nextMonth,
  getMonthName,
  dayNames,
  handleDayClick,
}: CalendarViewProps) => {
  const { t } = useTranslation();

  return (
    <Card className="shadow-lg shadow-violet-500/5 border border-violet-800/50 bg-[#232120] overflow-hidden">
      <CardHeader className="px-5 pt-5 pb-3">
        <div className="flex justify-between items-center w-full">
          <Button
            isIconOnly
            aria-label={t("back")}
            size="sm"
            variant="light"
            onPress={prevMonth}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15.75 19.5 8.25 12l7.5-7.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
          <h3 className="text-xl font-bold text-violet-400">
            {getMonthName(calendarMonth)} {calendarMonth.getFullYear()}
          </h3>
          <Button
            isIconOnly
            aria-label={t("nav.userDropdown.loading")}
            size="sm"
            variant="light"
            onPress={nextMonth}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </div>
      </CardHeader>
      <CardBody className="px-3 pb-5 pt-0">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-semibold text-default-400 py-1"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: getFirstDayOfMonth(calendarMonth) }).map(
            (_, i) => (
              <div key={`empty-${i}`} className="h-16" />
            ),
          )}
          {Array.from({ length: getDaysInMonth(calendarMonth) }).map((_, i) => {
            const day = i + 1;
            const dateKey = formatDateKey(
              calendarMonth.getFullYear(),
              calendarMonth.getMonth(),
              day,
            );
            const count = matchesByDate[dateKey] || 0;
            const isToday =
              dateKey ===
              formatDateKey(
                new Date().getFullYear(),
                new Date().getMonth(),
                new Date().getDate(),
              );
            const isSelected = selectedDate === dateKey;

            return (
              <button
                key={day}
                aria-label={t("calendar.day", {
                  date: new Date(dateKey).toLocaleDateString(),
                })}
                className={`
                  h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-sm relative border border-white/5
                  ${isSelected ? "bg-violet-500/30 border-2 border-violet-500 shadow-lg shadow-violet-500/20" : ""}
                  ${isToday && !isSelected ? "ring-1 ring-violet-500/50 bg-violet-800/20" : ""}
                  ${count > 0 ? "hover:bg-violet-500/20 cursor-pointer bg-zinc-800/80" : "cursor-default bg-zinc-900/40"}
                  ${!count && !isSelected && !isToday ? "text-zinc-600" : ""}
                `}
                onClick={() =>
                  count > 0 ? handleDayClick(dateKey) : undefined
                }
              >
                <span
                  className={`text-xs font-semibold ${isToday ? "text-violet-400" : "text-zinc-400"} ${isSelected ? "text-violet-300" : ""} ${count > 0 ? "text-zinc-200" : ""}`}
                >
                  {day}
                </span>
                {count > 0 && (
                  <div className="flex flex-wrap justify-center gap-px max-w-[90%]">
                    {Array.from({ length: Math.min(count, 4) }).map((_, bi) => (
                      <span
                        key={bi}
                        className="text-xs sm:text-sm leading-none"
                      >
                        ⚽
                      </span>
                    ))}
                    {count > 4 && (
                      <span className="text-[8px] text-violet-400 font-bold">
                        +{count - 4}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
};
