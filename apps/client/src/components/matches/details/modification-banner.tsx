import { Button } from "@heroui/button";
import { useTranslation } from "react-i18next";

interface ModificationBannerProps {
  isModified: boolean;
  hasHighlights: boolean;
  isMarkingRead: boolean;
  handleMarkAsRead: () => Promise<void>;
}

export const ModificationBanner = ({
  isModified,
  hasHighlights,
  isMarkingRead,
  handleMarkAsRead,
}: ModificationBannerProps) => {
  const { t } = useTranslation();

  if (!isModified || !hasHighlights) return null;

  return (
    <div className="bg-danger/10 border-2 border-danger/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-appearance-in shadow-lg shadow-danger/10">
      <div className="flex items-center gap-3">
        <span className="text-2xl animate-bounce">⚠️</span>
        <div>
          <p className="text-sm font-black text-danger tracking-tight">
            {t(
              "details.modification_alert_title",
              "Des modifications ont été apportées",
            )}
          </p>
          <p className="text-[10px] text-danger/70 font-medium">
            {t(
              "details.modification_alert_desc",
              "Les champs en rouge ont été modifiés par l'organisateur.",
            )}
          </p>
        </div>
      </div>
      <Button
        className="font-black text-sm tracking-tight shadow-lg shadow-danger/20 h-11 px-6 shrink-0 w-full sm:w-auto"
        color="danger"
        isLoading={isMarkingRead}
        size="sm"
        variant="solid"
        onPress={handleMarkAsRead}
      >
        {t("dashboard.controls.view_changes", "J'AI VU LES MODIFICATIONS")}
      </Button>
    </div>
  );
};
