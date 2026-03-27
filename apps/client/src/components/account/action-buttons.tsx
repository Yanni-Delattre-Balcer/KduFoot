import { Button } from "@heroui/button";
import { useTranslation } from "react-i18next";

interface ActionButtonsProps {
  from: string | undefined;
  isSaving: boolean;
  isDeleting: boolean;
  isExporting: boolean;
  handleSave: () => Promise<void>;
  handleExportData: () => Promise<void>;
  handleDeleteAccount: () => Promise<void>;
}

export const ActionButtons = ({
  from,
  isSaving,
  isDeleting,
  isExporting,
  handleSave,
  handleExportData,
  handleDeleteAccount,
}: ActionButtonsProps) => {
  const { t } = useTranslation("kdufoot");

  return (
    <div className="w-full flex md:w-auto flex-col gap-3 mt-8 pt-6 border-t border-white/10">
      <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-center">
        <Button
          className="font-black px-10 shadow-lg shadow-primary/30 w-full sm:w-auto tracking-wider h-14"
          color="primary"
          isDisabled={isDeleting}
          isLoading={isSaving}
          onPress={handleSave}
        >
          {from
            ? t("account.buttons.save_and_continue")
            : t("account.buttons.save_changes")}
        </Button>

        <Button
          className="font-black px-6 w-full sm:w-auto tracking-tight h-14 bg-secondary/10 border border-secondary/20"
          color="secondary"
          isDisabled={isSaving || isDeleting}
          isLoading={isExporting}
          variant="flat"
          onPress={handleExportData}
        >
          {t("account.buttons.export_data_pdf", "Téléchargement PDF (RGPD)")}
        </Button>

        <Button
          className="font-bold px-6 w-full sm:w-auto tracking-wider h-14 sm:ml-auto opacity-70 hover:opacity-100 transition-opacity"
          color="danger"
          isDisabled={isSaving || isExporting}
          isLoading={isDeleting}
          variant="light"
          onPress={handleDeleteAccount}
        >
          {t("account.buttons.delete_account")}
        </Button>
      </div>
    </div>
  );
};
