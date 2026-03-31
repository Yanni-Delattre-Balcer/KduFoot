import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { useTranslation } from "react-i18next";

import { User } from "@/types/user.types";
import { getDept } from "@/utils/format";

interface ClubSectionProps {
  baseId: string;
  dbUser: User | null;
  isSaving: boolean;
  siret: string;
  setSiret: (v: string) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleLinkSiret: () => Promise<void>;
  additionalStadiumAddresses: Record<string, string>;
  setAdditionalStadiumAddresses: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  additionalHqAddresses: Record<string, string>;
  hqAddress: string | null;
  stadiumAddress: string;
  setStadiumAddress: (v: string) => void;
}

export const ClubSection = ({
  baseId,
  dbUser,
  isSaving,
  siret,
  setSiret,
  errors,
  setErrors,
  handleLinkSiret,
  additionalStadiumAddresses,
  setAdditionalStadiumAddresses,
  additionalHqAddresses,
  hqAddress,
  stadiumAddress,
  setStadiumAddress,
}: ClubSectionProps) => {
  const { t } = useTranslation("kdufoot");

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black text-danger tracking-widest uppercase ml-1 mt-2">
        {t("account.sections.club_location")}
      </p>
      <div className="bg-default-100/5 p-4 rounded-2xl border border-white/5 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-danger font-black uppercase text-[10px] tracking-widest px-2 py-0.5 bg-danger/10 rounded-full">
            {t("account.fields.main_club", "Club Principal")}
          </span>
          <span className="font-bold text-primary">
            {dbUser?.club?.name || t("account.fields.no_club")}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-3">
            {!dbUser?.club_id && (
              <p className="text-xs sm:text-sm text-default-600 font-medium bg-default-100 p-2 rounded-lg leading-relaxed border border-default-200 order-1">
                💡{" "}
                {t(
                  "matchForm.link_club.search_help",
                  'Pour trouver votre numéro, tapez sur Google : "SIRET + [Nom exact de votre club]". Exemple : "SIRET RC Lens".',
                )}
              </p>
            )}
            {!dbUser?.club_id && (
              <p className="text-xs text-default-500 leading-relaxed order-1 mt-1">
                💼 {t("matchForm.link_club.enterprise_help")}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start order-2">
              <div className="flex-1 flex flex-col gap-1">
                <Input
                  aria-label="Siret (14 chiffres) ou Siren (9 chiffres)"
                  className="w-full max-w-full"
                  errorMessage={errors.siret}
                  id={`${baseId}_siret`}
                  isDisabled={!!dbUser?.club_id}
                  isInvalid={!!errors.siret}
                  label={
                    <span className="font-bold text-danger text-[0.75rem] sm:text-sm leading-tight">
                      SIRET (14 chiffres) ou SIREN (9 chiffres)
                    </span>
                  }
                  labelPlacement="outside"
                  name="acc_siret"
                  placeholder="123 456 789 00012"
                  size="sm"
                  value={siret}
                  variant="bordered"
                  onValueChange={(v: string) => {
                    const cleaned = v.replace(/\s/g, "");

                    if (cleaned.length <= 14) {
                      setSiret(v);
                      if (errors.siret)
                        setErrors((prev: Record<string, string>) => ({
                          ...prev,
                          siret: "",
                        }));
                    }
                  }}
                />
              </div>
              {!dbUser?.club_id && (
                <Button
                  className="h-12 font-bold px-4 w-full sm:w-auto"
                  color="primary"
                  isLoading={isSaving}
                  size="sm"
                  onPress={handleLinkSiret}
                >
                  {t("account.buttons.validate_club")}
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-default-500">{t("account.fields.city")}</span>
            <span className="font-medium">
              {dbUser?.club?.city || dbUser?.location || "Non renseigné"}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-default-500">{t("account.fields.dept")}</span>
            <span className="font-medium">
              {getDept(dbUser?.club?.zip) || "--"}
            </span>
          </div>

          <div className="space-y-6 mt-6">
            <Input
              isDisabled
              aria-label={t("account.fields.hq_address")}
              classNames={{
                inputWrapper: "bg-default-200/30",
              }}
              id={`${baseId}_hq_address`}
              label={
                <span className="font-bold text-default-500 text-[0.75rem] sm:text-sm leading-tight">
                  {t("account.fields.hq_address")}
                </span>
              }
              labelPlacement="outside"
              name="acc_hq_address"
              size="sm"
              value={hqAddress || "--"}
              variant="flat"
            />
            <Input
              isRequired
              aria-label={t("account.fields.stadium_address")}
              autoComplete="street-address"
              classNames={{
                description: "text-xs text-primary-500 font-medium",
              }}
              description={t("account.fields.stadium_warning")}
              errorMessage={errors.stadiumAddress}
              id={`${baseId}_stadium_address`}
              isInvalid={!!errors.stadiumAddress}
              label={
                <span className="font-black text-primary text-[0.75rem] sm:text-sm leading-tight">
                  {t(
                    "account.fields.stadium_address_principal",
                    "Adresse du Stade (Principale)",
                  )}
                </span>
              }
              labelPlacement="outside"
              name="acc_stadium_address"
              placeholder={t("account.fields.stadium_placeholder")}
              size="sm"
              value={stadiumAddress}
              variant="bordered"
              onValueChange={(v) => {
                setStadiumAddress(v);
                if (errors.stadiumAddress)
                  setErrors((prev) => ({ ...prev, stadiumAddress: "" }));
              }}
            />
          </div>

          {dbUser?.additional_clubs && dbUser.additional_clubs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
              <p className="text-[10px] font-black text-danger tracking-widest uppercase mb-1">
                {t("account.fields.other_clubs")}
              </p>
              {dbUser.additional_clubs.map(
                (
                  s: {
                    name?: string;
                    city?: string;
                    zip?: string;
                    siret: string;
                  },
                  idx: number,
                ) => (
                  <div
                    key={idx}
                    className="bg-default-100/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-danger font-black uppercase text-[10px] tracking-widest px-2 py-0.5 bg-danger/10 rounded-full">
                        {t("account.fields.secondary_club", "Club Secondaire")}
                      </span>
                      <span className="font-bold text-primary">
                        {s.name && s.name !== s.siret
                          ? s.name
                          : t("account.fields.nameless_club")}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
                      <div className="flex-1 flex flex-col gap-1 mt-2 mb-2">
                        <Input
                          isDisabled
                          aria-label="Siret (14 chiffres) ou Siren (9 chiffres)"
                          className="w-full max-w-full"
                          id={`${baseId}_siret_${s.siret}`}
                          label={
                            <span className="font-bold text-danger text-[0.75rem] sm:text-sm leading-tight">
                              SIRET (14 chiffres) ou SIREN (9 chiffres)
                            </span>
                          }
                          labelPlacement="outside"
                          name={`acc_siret_${s.siret}`}
                          size="sm"
                          value={s.siret}
                          variant="bordered"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-default-500">
                        {t("account.fields.city")}
                      </span>
                      <span className="font-medium">
                        {s.city || "Non renseigné"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-default-500">
                        {t("account.fields.dept")}
                      </span>
                      <span className="font-medium">
                        {getDept(s.zip) || "--"}
                      </span>
                    </div>

                    <div className="space-y-6 mt-6">
                      <Input
                        isDisabled
                        aria-label={t("account.fields.hq_address")}
                        autoComplete="street-address"
                        classNames={{
                          inputWrapper: "bg-default-200/30",
                        }}
                        id={`${baseId}_hq_address_${s.siret}`}
                        label={
                          <span className="font-bold text-default-500 text-[0.75rem] sm:text-sm leading-tight">
                            {t("account.fields.hq_address")}
                          </span>
                        }
                        labelPlacement="outside"
                        name={`acc_hq_address_${s.siret}`}
                        placeholder={t("account.fields.hq_address")}
                        size="sm"
                        value={additionalHqAddresses[s.siret] || ""}
                        variant="flat"
                      />
                      <Input
                        isRequired
                        aria-label={t(
                          "account.fields.stadium_address_secondary",
                        )}
                        autoComplete="street-address"
                        classNames={{
                          description: "text-xs text-primary-500 font-medium",
                        }}
                        description={t("account.fields.stadium_warning")}
                        errorMessage={errors[`stadium_address_${s.siret}`]}
                        id={`${baseId}_stadium_address_${s.siret}`}
                        isInvalid={!!errors[`stadium_address_${s.siret}`]}
                        label={
                          <span className="font-black text-primary text-[0.75rem] sm:text-sm leading-tight">
                            {t("account.fields.stadium_address_secondary")}
                          </span>
                        }
                        labelPlacement="outside"
                        name={`acc_stadium_address_${s.siret}`}
                        placeholder={t("account.fields.stadium_placeholder")}
                        size="sm"
                        value={additionalStadiumAddresses[s.siret] || ""}
                        variant="bordered"
                        onValueChange={(v: string) => {
                          setAdditionalStadiumAddresses((prev) => ({
                            ...prev,
                            [s.siret]: v,
                          }));
                        }}
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          {dbUser?.club_id ? (
            <div className="mt-6 p-6 bg-red-900/20 border-2 border-red-500/50 rounded-2xl text-center shadow-2xl shadow-red-900/20">
              <p className="text-xl font-black text-red-500 tracking-tight mb-2">
                {t("support.need_help")}
              </p>
              <p className="text-base font-bold text-white mb-6">
                {t("account.support.description")}
              </p>

              <Button
                as="a"
                className="w-full font-black text-xs sm:text-sm h-12 sm:h-14 shadow-red-500/40 tracking-wider sm:tracking-widest animate-pulse"
                color="danger"
                href="mailto:support@kdufoot.com"
                size="lg"
                variant="shadow"
              >
                {t("account.buttons.contact_support")}
              </Button>
            </div>
          ) : (
            <div className="mt-4 p-3 rounded-xl bg-warning/10 border border-warning/20 space-y-2">
              <p className="text-sm leading-tight text-warning-700 font-medium">
                ⚠️ <strong>{t("warning")} :</strong>{" "}
                {t("account.siret.warning_title")}
              </p>
              <p className="text-xs sm:text-sm leading-tight text-default-500 italic">
                {t(
                  "account.siret.warning_desc",
                  "Pour toute modification ultérieure, vous devrez contacter le support technique.",
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
