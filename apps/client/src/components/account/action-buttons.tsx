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
    <div className="w-full flex flex-col gap-4 mt-8 pt-6 border-t border-white/10">
      <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
        <Button
          className="font-black px-8 shadow-lg shadow-primary/30 w-full tracking-wider h-12"
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
          className="font-black px-6 w-full tracking-tight h-12 bg-secondary/10 border border-secondary/20"
          color="secondary"
          isDisabled={isSaving || isDeleting}
          isLoading={isExporting}
          variant="flat"
          onPress={handleExportData}
        >
          {t("account.buttons.export_data_pdf")}
        </Button>

        <Button
          className="font-bold px-6 w-full tracking-wider h-12 border border-danger/20"
          color="danger"
          isDisabled={isSaving || isExporting}
          isLoading={isDeleting}
          variant="flat"
          onPress={handleDeleteAccount}
        >
          {t("account.buttons.delete_account")}
        </Button>
      </div>
    </div>
  );
};
