import { Input } from "@heroui/input";
import { useTranslation } from "react-i18next";

interface IdentitySectionProps {
  baseId: string;
  firstname: string;
  setFirstname: (v: string) => void;
  lastname: string;
  setLastname: (v: string) => void;
  phone: string;
  handlePhoneChange: (v: string) => void;
  licenseId: string;
  setLicenseId: (v: string) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  email: string;
}

export const IdentitySection = ({
  baseId,
  firstname,
  setFirstname,
  lastname,
  setLastname,
  phone,
  handlePhoneChange,
  licenseId,
  setLicenseId,
  errors,
  setErrors,
  email,
}: IdentitySectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-default-400 ml-1">
        {t("account.sections.identity")}
      </p>
      <div className="bg-default-100/5 p-4 rounded-2xl border border-white/5 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-default-500">Email</span>
          <span className="font-medium">{email}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            isRequired
            aria-label={t("account.fields.firstname")}
            autoComplete="given-name"
            errorMessage={errors.firstname}
            id={`${baseId}_firstname`}
            isInvalid={!!errors.firstname}
            label={t("account.fields.firstname")}
            name="acc_firstname"
            size="sm"
            value={firstname}
            variant="bordered"
            onValueChange={(v) => {
              setFirstname(v);
              if (errors.firstname)
                setErrors((prev) => ({ ...prev, firstname: "" }));
            }}
          />
          <Input
            isRequired
            aria-label={t("account.fields.lastname")}
            autoComplete="family-name"
            errorMessage={errors.lastname}
            id={`${baseId}_lastname`}
            isInvalid={!!errors.lastname}
            label={t("account.fields.lastname")}
            name="acc_lastname"
            size="sm"
            value={lastname}
            variant="bordered"
            onValueChange={(v) => {
              setLastname(v);
              if (errors.lastname)
                setErrors((prev) => ({ ...prev, lastname: "" }));
            }}
          />
        </div>
        <Input
          isRequired
          aria-label={t("account.fields.phone")}
          autoComplete="tel"
          errorMessage={errors.phone}
          id={`${baseId}_phone`}
          isInvalid={!!errors.phone}
          label={t("account.fields.phone")}
          name="acc_phone"
          placeholder="+33 6 12 34 56 78"
          size="sm"
          value={phone}
          variant="bordered"
          onBlur={() => {
            if (!phone || phone.replace(/\D/g, "").length < 11)
              setErrors((prev) => ({
                ...prev,
                phone: t("account.errors.phone_required"),
              }));
          }}
          onValueChange={(v) => {
            handlePhoneChange(v);
            if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
          }}
        />
        <Input
          isRequired
          aria-label={t("account.fields.license")}
          errorMessage={errors.licenseId}
          id={`${baseId}_license`}
          isInvalid={!!errors.licenseId}
          label={t("account.fields.license")}
          name="acc_license"
          placeholder={t("account.fields.license_placeholder")}
          size="sm"
          value={licenseId}
          variant="bordered"
          onValueChange={(v) => {
            setLicenseId(v);
            if (errors.licenseId)
              setErrors((prev) => ({ ...prev, licenseId: "" }));
          }}
        />
      </div>
    </div>
  );
};
