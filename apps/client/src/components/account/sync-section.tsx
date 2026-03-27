import { Button } from "@heroui/button";
import { useTranslation } from "react-i18next";
import { User } from "@/types/user.types";

interface SyncSectionProps {
  dbUser: User | null;
  isResettingCalendar: boolean;
  handleResetCalendar: () => Promise<void>;
}

export const SyncSection = ({
  dbUser,
  isResettingCalendar,
  handleResetCalendar,
}: SyncSectionProps) => {
  const { t } = useTranslation("kdufoot");

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-default-400 ml-1 mt-2">
        {t("account.sections.sync")}
      </p>
      <div className="bg-default-100/5 p-4 rounded-2xl border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex-1 flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full shrink-0 ${dbUser?.has_synced_calendar ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-zinc-600"}`}
            />
            <div>
              <p className="text-sm font-bold text-white">
                {dbUser?.has_synced_calendar
                  ? t("account.sync.active")
                  : t("account.sync.disabled")}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5 font-bold tracking-tight">
                {t(
                  "onboarding.calendar.native",
                  "Calendrier natif Apple / Google / Outlook",
                )}
              </p>
            </div>
          </div>
          <Button
            className="font-bold text-xs h-10 border border-white/10 w-full sm:w-auto px-6 h-11"
            color={dbUser?.has_synced_calendar ? "default" : "secondary"}
            isLoading={isResettingCalendar}
            variant={dbUser?.has_synced_calendar ? "bordered" : "flat"}
            onPress={handleResetCalendar}
          >
            {dbUser?.has_synced_calendar
              ? t("account.buttons.reset_calendar")
              : t("account.buttons.sync_now")}
          </Button>
        </div>
      </div>
    </div>
  );
};
