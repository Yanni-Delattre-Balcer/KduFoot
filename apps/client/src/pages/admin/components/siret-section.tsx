import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Checkbox } from "@heroui/checkbox";

interface SiretSectionProps {
  siretLoading: boolean;
  siretData: {
    primary_siret: string | null;
    primary_name?: string | null;
    additional_sirets: { siret: string; name: string }[];
  } | null;
  newSiret: string;
  setNewSiret: (val: string) => void;
  forceSiret: boolean;
  setForceSiret: (val: boolean) => void;
  onAddSiret: () => void;
  onRemoveSiret: (siret: string) => void;
  t: any;
}

export const SiretSection = ({
  siretLoading,
  siretData,
  newSiret,
  setNewSiret,
  forceSiret,
  setForceSiret,
  onAddSiret,
  onRemoveSiret,
  t,
}: SiretSectionProps) => {
  return (
    <div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-black uppercase tracking-widest text-success-400">
          {t("adminUsersPage.siretManagement")}
        </h3>
        {siretLoading && <Spinner size="sm" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div className="space-y-2">
          <Input
            label={t("adminUsersPage.newSiret")}
            placeholder={t("adminUsersPage.siretPlaceholder")}
            size="sm"
            value={newSiret}
            onValueChange={setNewSiret}
          />
          <Checkbox
            isSelected={forceSiret}
            size="sm"
            onValueChange={setForceSiret}
          >
            {t("adminUsersPage.forceSiret")}
          </Checkbox>
        </div>
        <Button
          className="font-bold"
          color="success"
          size="sm"
          variant="flat"
          onPress={onAddSiret}
        >
          {t("adminUsersPage.btnAddClub")}
        </Button>
      </div>

      <div className="space-y-2 pt-2 border-t border-white/5">
        <p className="text-[10px] text-default-400 font-bold uppercase">
          {t("adminUsersPage.currentClubs")}
        </p>
        <div className="flex flex-wrap gap-2">
          {siretData?.primary_siret && (
            <Chip
              className="pl-1 pr-2 h-7"
              color="primary"
              variant="flat"
              onClose={() => onRemoveSiret(siretData.primary_siret!)}
            >
              👑 {siretData.primary_name || siretData.primary_siret}
            </Chip>
          )}
          {siretData?.additional_sirets?.map((s: any) => (
            <Chip
              key={s.siret}
              className="pl-1 pr-2 h-7"
              color="default"
              variant="flat"
              onClose={() => onRemoveSiret(s.siret)}
            >
              🏠 {s.name || s.siret}
            </Chip>
          ))}
          {!siretData?.primary_siret &&
            (!siretData?.additional_sirets ||
              siretData.additional_sirets.length === 0) && (
              <p className="text-xs text-default-500 italic">
                {t("adminUsersPage.noClubLinked")}
              </p>
            )}
        </div>
      </div>
    </div>
  );
};
