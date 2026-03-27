import { addToast } from "@heroui/toast";
import { Image as HeroImage } from "@heroui/image";
import { Chip } from "@heroui/chip";
import React, { useState, useRef, useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import { mutate } from "swr";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";

import { IdentitySection } from "./account/identity-section";
import { SportsProfileSection } from "./account/sports-profile-section";
import { ClubSection } from "./account/club-section";
import { SyncSection } from "./account/sync-section";
import { ActionButtons } from "./account/action-buttons";

import { useUser } from "@/hooks/use-user";
import { useAuth } from "@/authentication/providers/use-auth";
import { formatPhoneNumber, formatSiret } from "@/utils/format";
import { compressImage } from "@/utils/image";

interface AccountSettingsProps {
  onSaveSuccess?: () => void;
}

const STORAGE_KEY = "kdufoot_pending_profile";

export const AccountSettings = ({ onSaveSuccess }: AccountSettingsProps) => {
  const baseId = useId();
  const { t } = useTranslation("kdufoot");
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from =
    searchParams.get("from") ||
    (location.state as { from?: string } | null)?.from;
  const { user: authUser, getAccessToken, logout } = useAuth();
  const {
    user: dbUser,
    updateUser,
    linkClub,
    unlinkClub,
    refetch,
    resetCalendarSync,
  } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [licenseId, setLicenseId] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [homeJerseyColor, setHomeJerseyColor] = useState("");
  const [awayJerseyColor, setAwayJerseyColor] = useState("");
  const [phone, setPhone] = useState("");
  const [siret, setSiret] = useState("");
  const [stadiumAddress, setStadiumAddress] = useState("");
  const [additionalStadiumAddresses, setAdditionalStadiumAddresses] = useState<
    Record<string, string>
  >({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isResettingCalendar, setIsResettingCalendar] = useState(false);

  const handlePhoneChange = (v: string) => {
    setPhone(formatPhoneNumber(v));
  };

  // Sync properties from dbUser when it loads
  useEffect(() => {
    if (dbUser && !isInitialized) {
      // Check for local storage data as fallback for missing/incomplete fields
      let localData: Partial<Record<string, string>> = {};

      try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) localData = JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse local profile data", e);
      }

      setFirstname(localData.firstname || dbUser.firstname || "");
      setLastname(localData.lastname || dbUser.lastname || "");
      setLicenseId(localData.licenseId || dbUser.license_id || "");
      setLevel(localData.level || dbUser.level || "");
      setCategory(localData.category || dbUser.category || "");
      setHomeJerseyColor(
        localData.homeJerseyColor || dbUser.home_jersey_color || "",
      );
      setAwayJerseyColor(
        localData.awayJerseyColor || dbUser.away_jersey_color || "",
      );
      setPhone(formatPhoneNumber(localData.phone || dbUser.phone || ""));
      setSiret(formatSiret(localData.siret || dbUser.siret || ""));
      setStadiumAddress(
        localData.stadiumAddress || dbUser.stadium_address || "",
      );

      // Initialize additional stadium addresses
      const addAddr: Record<string, string> = {};

      (dbUser.additional_sirets || []).forEach((item) => {
        const siret = typeof item === "string" ? item : item.siret;
        const addr = typeof item === "object" ? item.stadium_address : "";

        addAddr[siret] = addr || "";
      });
      setAdditionalStadiumAddresses(addAddr);

      setIsInitialized(true);
    }
  }, [dbUser, isInitialized]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!isInitialized) return;

    const profileData = {
      firstname,
      lastname,
      licenseId,
      level,
      category,
      homeJerseyColor,
      awayJerseyColor,
      phone,
      siret,
      stadiumAddress,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(profileData));
  }, [
    isInitialized,
    firstname,
    lastname,
    licenseId,
    level,
    category,
    homeJerseyColor,
    awayJerseyColor,
    phone,
    siret,
    stadiumAddress,
  ]);

  if (!authUser) return null;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      // Compress and resize image
      const compressedDataUrl = await compressImage(file);

      setPreviewUrl(compressedDataUrl);
    } catch (error) {
      console.error("Image processing error:", error);
      // Fallback: use legacy FileReader if compression fails
      const reader = new FileReader();

      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!firstname || firstname.trim() === "") {
      newErrors.firstname = t("account.errors.firstname_required");
    }
    if (!lastname || lastname.trim() === "") {
      newErrors.lastname = t("account.errors.lastname_required");
    }
    if (!phone || phone.replace(/\D/g, "").length < 11) {
      newErrors.phone = t("account.errors.phone_required");
    }
    if (!licenseId || licenseId.trim() === "") {
      newErrors.licenseId = t("account.errors.license_required");
    }
    if (!category) {
      newErrors.category = t("account.errors.category_required");
    }
    if (!level) {
      newErrors.level = t("account.errors.level_required");
    }
    if (!stadiumAddress || stadiumAddress.trim() === "") {
      newErrors.stadiumAddress = t("account.errors.stadium_required");
    }
    if (!homeJerseyColor || homeJerseyColor.trim() === "") {
      newErrors.homeJerseyColor = t("account.errors.home_jersey_required");
    }
    if (!awayJerseyColor || awayJerseyColor.trim() === "") {
      newErrors.awayJerseyColor = t("account.errors.away_jersey_required");
    }

    const cleanSiret = siret.replace(/\s/g, "").trim();

    if (
      !dbUser?.club_id &&
      (!siret || (cleanSiret.length !== 14 && cleanSiret.length !== 9))
    ) {
      newErrors.siret = t("account.errors.siret_required");
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      addToast({
        title: t("account.errors.form_incomplete"),
        description: t("account.errors.form_incomplete_desc"),
        variant: "flat",
        color: "danger",
      });

      return;
    }
    setIsSaving(true);
    try {
      const cleanSiret = siret.replace(/\s/g, "").trim();

      if (cleanSiret && cleanSiret !== dbUser?.siret && !dbUser?.club_id) {
        if (cleanSiret.length !== 14 && cleanSiret.length !== 9) {
          throw new Error(
            t(
              "matchForm.alerts.siret_length",
              "Le numéro doit contenir 9 (SIREN) ou 14 (SIRET) chiffres",
            ),
          );
        }
        await linkClub(cleanSiret);
      }

      await updateUser({
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        license_id: licenseId,
        level,
        category,
        home_jersey_color: homeJerseyColor,
        away_jersey_color: awayJerseyColor,
        phone: phone,
        stadium_address: stadiumAddress,
        additional_sirets: (dbUser?.additional_sirets || []).map((item) => {
          const siret = typeof item === "string" ? item : item.siret;

          return {
            siret,
            stadium_address: additionalStadiumAddresses[siret] || "",
          };
        }),
        picture: previewUrl || dbUser?.picture || authUser.picture,
      });

      // Clear local storage after successful save
      localStorage.removeItem(STORAGE_KEY);

      // Refresh data immediately
      await refetch();
      await mutate("/api/me/context");

      addToast({
        title: t("accountModal.alerts.update_success", "Profil mis à jour"),
        description: t(
          "accountModal.alerts.update_success_desc",
          "Vos modifications ont été enregistrées.",
        ),
        variant: "solid",
        color: "success",
      });

      if (onSaveSuccess) {
        onSaveSuccess();
      }

      // Only redirect if "from" is specified (e.g. onboarding flow)
      if (from) {
        navigate(from);
      }
    } catch (error: unknown) {
      console.error("Update profile error:", error);
      const message = error instanceof Error ? error.message : "";

      addToast({
        title: t("error.title"),
        description:
          message ||
          t("accountModal.alerts.update_error", "Erreur de mise à jour"),
        variant: "flat",
        color: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm(t("account.confirm_delete"))) {
      setIsDeleting(true);
      try {
        const token = await getAccessToken();
        const res = await fetch(
          `${import.meta.env.API_BASE_URL}/api/me/delete`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) throw new Error(t("account.delete_error"));
        addToast({
          title: t("account.delete_success"),
          color: "success",
        });
        logout({ logoutParams: { returnTo: window.location.origin } });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);

        addToast({ title: message, color: "danger" });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${import.meta.env.API_BASE_URL}/api/me/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(t("account.export_error", "Erreur lors de l'export"));
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `mes-donnees-kdufoot_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast({
        title: t("account.export_success", "Export réussi"),
        color: "success",
      });
    } catch (e: unknown) {
      addToast({
        title:
          e instanceof Error
            ? e.message
            : t("account.export_error", "Erreur lors de l'export"),
        color: "danger",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetCalendar = async () => {
    if (!confirm(t("account.sync.reset_confirm"))) {
      return;
    }

    setIsResettingCalendar(true);
    try {
      await resetCalendarSync();
      addToast({
        title: t("success"),
        description: t("account.sync.reset_success"),
        color: "success",
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);

      addToast({
        title: t("account.sync.reset_error"),
        description: message,
        color: "danger",
      });
    } finally {
      setIsResettingCalendar(false);
    }
  };

  const handleLinkSiret = async () => {
    const cleanSiret = siret.replace(/\s/g, "").trim();

    if (cleanSiret.length !== 14 && cleanSiret.length !== 9) {
      addToast({
        title: t("error.title"),
        description: t("matchForm.alerts.siret_length"),
        variant: "flat",
        color: "danger",
      });

      return;
    }

    setIsSaving(true);
    try {
      await linkClub(cleanSiret);
      // Clear local storage if we linked a club (this is part of the crucial onboarding data)
      localStorage.removeItem(STORAGE_KEY);
      await getAccessToken({ cacheMode: "off" });
      await refetch();
      await mutate("/api/me/context");
      addToast({
        title: t("success"),
        description: t(
          "accountModal.alerts.club_linked_success",
          "Club certifié avec succès",
        ),
        variant: "flat",
        color: "success",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      addToast({
        title: t("error.title"),
        description: message,
        variant: "flat",
        color: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-full overflow-x-hidden">
      <input
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        type="file"
        onChange={handleFileChange}
      />

      <div className="flex flex-col gap-6 items-center">
        <p className="text-sm font-extrabold text-danger tracking-widest animate-pulse-red text-center">
          {t("account.avatar.recommendation")}
        </p>

        <div
          aria-label={t("account.avatar.change")}
          className="relative group cursor-pointer z-10"
          role="button"
          tabIndex={0}
          onClick={handleAvatarClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleAvatarClick();
            }
          }}
        >
          <HeroImage
            alt={authUser.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
            src={previewUrl || dbUser?.picture || authUser.picture}
          />
          <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 shadow-lg border-2 border-white z-20">
            <svg
              aria-hidden="true"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 4.5v15m7.5-7.5h-15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-15">
            <span className="text-white text-xs font-bold">
              {t("account.avatar.change")}
            </span>
          </div>
        </div>

        <div className="text-center w-full overflow-hidden">
          <h3 className="text-lg sm:text-2xl font-bold truncate hover:overflow-x-auto whitespace-nowrap scrollbar-hide">
            {dbUser?.firstname && dbUser?.lastname
              ? `${dbUser.firstname} ${dbUser.lastname}`
              : dbUser?.firstname || dbUser?.lastname || authUser.name}
          </h3>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Chip
              className="font-black px-4 tracking-tighter"
              color={dbUser?.subscription === "Free" ? "default" : "primary"}
              size="sm"
              variant="flat"
            >
              {dbUser?.subscription
                ? t("account.subscription.free", { plan: dbUser.subscription })
                : t("account.subscription.free_account")}
            </Chip>
          </div>
          <div className="w-full space-y-8">
            <IdentitySection
              baseId={baseId}
              email={authUser.email || ""}
              errors={errors}
              firstname={firstname}
              handlePhoneChange={handlePhoneChange}
              hqAddress={dbUser?.club?.address || ""}
              lastname={lastname}
              licenseId={licenseId}
              phone={phone}
              setErrors={setErrors}
              setFirstname={setFirstname}
              setLastname={setLastname}
              setLicenseId={setLicenseId}
              setStadiumAddress={setStadiumAddress}
              stadiumAddress={stadiumAddress}
            />
            <SportsProfileSection
              awayJerseyColor={awayJerseyColor}
              baseId={baseId}
              category={category}
              errors={errors}
              homeJerseyColor={homeJerseyColor}
              level={level}
              setAwayJerseyColor={setAwayJerseyColor}
              setCategory={setCategory}
              setErrors={setErrors}
              setHomeJerseyColor={setHomeJerseyColor}
              setLevel={setLevel}
            />{" "}
          </div>

          <ClubSection
            additionalStadiumAddresses={additionalStadiumAddresses}
            authUser={authUser}
            baseId={baseId}
            dbUser={dbUser}
            errors={errors}
            handleLinkSiret={handleLinkSiret}
            isSaving={isSaving}
            setAdditionalStadiumAddresses={setAdditionalStadiumAddresses}
            setErrors={setErrors}
            setIsSaving={setIsSaving}
            setSiret={setSiret}
            siret={siret}
            unlinkClub={unlinkClub}
          />

          <SyncSection
            dbUser={dbUser}
            handleResetCalendar={handleResetCalendar}
            isResettingCalendar={isResettingCalendar}
          />
        </div>

        <ActionButtons
          from={from}
          handleDeleteAccount={handleDeleteAccount}
          handleExportData={handleExportData}
          handleSave={handleSave}
          isDeleting={isDeleting}
          isExporting={isExporting}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
};

export default AccountSettings;
