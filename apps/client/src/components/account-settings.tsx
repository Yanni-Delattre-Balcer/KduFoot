import { Button } from "@heroui/button";
import { addToast } from "@heroui/toast";
import { Image as HeroImage } from "@heroui/image";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import React, { useState, useRef, useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import { mutate } from "swr";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";

import { IdentitySection } from "./account/identity-section";
import { SportsProfileSection } from "./account/sports-profile-section";

import { useUser } from "@/hooks/use-user";
import { useAuth } from "@/authentication/providers/use-auth";

interface AccountSettingsProps {
  onSaveSuccess?: () => void;
}

const STORAGE_KEY = "kdufoot_pending_profile";

export const AccountSettings = ({ onSaveSuccess }: AccountSettingsProps) => {
  const baseId = useId();
  const { t } = useTranslation();
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

  const formatPhoneNumber = (value: string) => {
    let raw = value.replace(/\D/g, "");

    if (raw.length > 0 && !raw.startsWith("33")) {
      if (raw.startsWith("0")) raw = "33" + raw.substring(1);
      else raw = "33" + raw;
    }
    if (raw.length > 11) raw = raw.substring(0, 11);

    let formatted = "";

    if (raw.length > 0) formatted += "+";
    if (raw.length > 0) formatted += raw.substring(0, 2);
    if (raw.length > 2) formatted += " " + raw.substring(2, 3);
    if (raw.length > 3) formatted += " " + raw.substring(3, 5);
    if (raw.length > 5) formatted += " " + raw.substring(5, 7);
    if (raw.length > 7) formatted += " " + raw.substring(7, 9);
    if (raw.length > 9) formatted += " " + raw.substring(9, 11);

    return formatted;
  };

  const handlePhoneChange = (v: string) => {
    setPhone(formatPhoneNumber(v));
  };

  const formatSiret = (value: string) => {
    let raw = value.replace(/\D/g, "");

    if (raw.length > 14) raw = raw.substring(0, 14);

    // Format: XXX XXX XXX XXXXX
    let formatted = "";

    for (let i = 0; i < raw.length; i++) {
      if (i === 3 || i === 6 || i === 9) formatted += " ";
      formatted += raw[i];
    }

    return formatted;
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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new window.Image();

        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Maximum dimensions
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.7 quality
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
      const res = await fetch(
        `${import.meta.env.API_BASE_URL}/api/me/export/json`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok)
        throw new Error(t("account.export_error", "Erreur lors de l'export"));

      const exportData = await res.json();

      // Generate PDF client-side (pdf-lib works reliably in browsers)
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pageWidth = 595.28;
      const pageHeight = 841.89;

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - 50;

      const addPage = () => {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - 50;
      };

      page.drawText("KduFoot - Export de Données (RGPD)", {
        x: 50,
        y,
        size: 20,
        font: fontBold,
        color: rgb(0, 0, 0.5),
      });
      y -= 30;
      page.drawText(`Date d'export : ${new Date().toLocaleString("fr-FR")}`, {
        x: 50,
        y,
        size: 10,
        font,
      });
      y -= 40;

      const profile = exportData.profile || {};

      page.drawText("1. PROFIL UTILISATEUR", {
        x: 50,
        y,
        size: 14,
        font: fontBold,
      });
      y -= 25;
      const profileLines = [
        `Nom : ${profile.lastname || "Non spécifié"}`,
        `Prénom : ${profile.firstname || "Non spécifié"}`,
        `Email : ${profile.email || "N/A"}`,
        `Licence : ${profile.license_id || "Non spécifiée"}`,
        `Club : ${profile.siret || "Aucun club lié"}`,
      ];

      for (const line of profileLines) {
        page.drawText(line, { x: 70, y, size: 11, font });
        y -= 15;
      }
      y -= 25;

      const matches = exportData.matches || [];
      const applications = exportData.match_applications || [];
      const sessions = exportData.training_sessions || [];
      const exercises = exportData.created_exercises || [];

      page.drawText("2. RÉSUMÉ D'ACTIVITÉ", {
        x: 50,
        y,
        size: 14,
        font: fontBold,
      });
      y -= 25;
      const summaryLines = [
        `Matchs créés : ${matches.length}`,
        `Participations : ${applications.length}`,
        `Séances d'entraînement : ${sessions.length}`,
        `Exercices créés : ${exercises.length}`,
      ];

      for (const line of summaryLines) {
        page.drawText(line, { x: 70, y, size: 11, font });
        y -= 15;
      }
      y -= 25;

      if (matches.length > 0) {
        page.drawText("3. HISTORIQUE DES MATCHS CRÉÉS", {
          x: 50,
          y,
          size: 14,
          font: fontBold,
        });
        y -= 25;
        page.drawText("Date", { x: 70, y, size: 10, font: fontBold });
        page.drawText("Type", { x: 170, y, size: 10, font: fontBold });
        page.drawText("Lieu", { x: 270, y, size: 10, font: fontBold });
        y -= 15;
        page.drawLine({
          start: { x: 70, y },
          end: { x: 520, y },
          thickness: 1,
          color: rgb(0.8, 0.8, 0.8),
        });
        y -= 15;

        for (const m of matches.slice(0, 15)) {
          if (y < 50) addPage();
          const d = m.match_date
            ? new Date(m.match_date).toLocaleDateString("fr-FR")
            : "N/A";
          const loc = m.address
            ? m.address.length > 30
              ? m.address.substring(0, 27) + "..."
              : m.address
            : "N/A";

          page.drawText(d, { x: 70, y, size: 9, font });
          page.drawText(m.match_type || "Amical", {
            x: 170,
            y,
            size: 9,
            font,
          });
          page.drawText(loc, { x: 270, y, size: 9, font });
          y -= 15;
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], {
        type: "application/pdf",
      });
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

  const getDept = (zip?: string | null) => {
    if (!zip || zip.length < 2) return "";

    return zip.substring(0, 2);
  };

  return (
    <div className="flex flex-col gap-6">
      <input
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        type="file"
        onChange={handleFileChange}
      />

      <div className="flex flex-col items-center gap-6">
        <p className="text-sm font-extrabold text-danger tracking-widest -mb-4 animate-pulse-red">
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

          <div className="space-y-3">
            <p className="text-sm font-bold text-default-400 ml-1 mt-2">
              {t("account.sections.club_location")}
            </p>
            <div className="bg-default-100/5 p-4 rounded-2xl border border-white/5 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-default-500">
                  {t("account.fields.current_club")}
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
                        onValueChange={(v) => {
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
                    {!dbUser?.club_id ? (
                      <Button
                        className="h-12 font-bold px-4 w-full sm:w-auto"
                        color="primary"
                        isLoading={isSaving}
                        size="sm"
                        onPress={handleLinkSiret}
                      >
                        {t("account.buttons.validate_club")}
                      </Button>
                    ) : (
                      authUser?.email ===
                        "yannidelattrebalcer.artois@gmail.com" && (
                        <Button
                          className="h-12 font-bold px-4 w-full sm:w-auto"
                          color="danger"
                          size="sm"
                          variant="flat"
                          onPress={async () => {
                            if (
                              confirm(
                                t(
                                  "account.admin_unlink_confirm",
                                  "Détacher le club ? (Admin uniquement)",
                                ),
                              )
                            ) {
                              setIsSaving(true);
                              try {
                                await unlinkClub();
                                addToast({
                                  title: t(
                                    "account.admin_unlink_success",
                                    "Club détaché",
                                  ),
                                  color: "success",
                                });
                              } catch (e: unknown) {
                                addToast({
                                  title:
                                    e instanceof Error ? e.message : String(e),
                                  color: "danger",
                                });
                              } finally {
                                setIsSaving(false);
                              }
                            }
                          }}
                        >
                          {t("matchForm.buttons.unlink", "Détacher (Admin)")}
                        </Button>
                      )
                    )}
                  </div>
                </div>

                {dbUser?.club_id && (
                  <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2 mb-2">
                    <span className="text-default-500">
                      {t("account.fields.main_club")}
                    </span>
                    <span className="font-bold text-primary">
                      {dbUser?.club?.name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-default-500">
                    {t("account.fields.city")}
                  </span>
                  <span className="font-medium">
                    {dbUser?.club?.city || dbUser?.location || "Non renseigné"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-default-500">
                    {t("account.fields.dept")}
                  </span>
                  <span className="font-medium">
                    {getDept(dbUser?.club?.zip) || "--"}
                  </span>
                </div>

                {dbUser?.additional_clubs &&
                  dbUser.additional_clubs.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                      <p className="text-[10px] font-bold text-default-400 tracking-widest mb-1">
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
                            className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col gap-3"
                          >
                            <div className="flex justify-between items-start gap-2 w-full overflow-hidden">
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-black text-white truncate">
                                  {s.name || t("account.fields.nameless_club")}
                                </span>
                                <div className="flex gap-2 text-[10px] text-default-500 font-bold mt-0.5">
                                  <span>{s.city}</span>
                                  <span>•</span>
                                  <span>{getDept(s.zip)}</span>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-default-400 bg-black/30 px-1.5 py-0.5 rounded shrink-0 border border-white/5">
                                {formatSiret(s.siret)}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              <Input
                                aria-label={t(
                                  "account.fields.stadium_address_for",
                                  { club: s.name },
                                )}
                                autoComplete="street-address"
                                classNames={{
                                  label:
                                    "text-[10px] font-bold text-primary-400 tracking-tight",
                                  input: "text-xs",
                                  inputWrapper: "h-9 min-h-9",
                                }}
                                id={`${baseId}_stadium_address_${s.siret}`}
                                label={t("account.fields.stadium_address_for", {
                                  club: s.name,
                                })}
                                name={`acc_stadium_address_${s.siret}`}
                                placeholder={t(
                                  "account.fields.stadium_placeholder",
                                )}
                                size="sm"
                                value={
                                  additionalStadiumAddresses[s.siret] || ""
                                }
                                variant="bordered"
                                onValueChange={(v) => {
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
                        ? t("account.sync.active", "Calendrier Synchronisé ✅")
                        : t(
                            "account.sync.disabled",
                            "Calendrier non connecté ❌",
                          )}
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
                    ? t("account.buttons.reset_calendar", "Désactiver")
                    : t("account.buttons.sync_now", "Se synchroniser")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full flex md:w-auto flex-col gap-3 mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="font-bold px-8 shadow-lg shadow-primary/30 w-full sm:w-auto tracking-wider order-1"
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
              className="font-bold px-8 w-full sm:w-auto tracking-wider order-2 sm:ml-auto"
              color="secondary"
              isDisabled={isSaving || isDeleting}
              isLoading={isExporting}
              variant="flat"
              onPress={handleExportData}
            >
              {t(
                "account.buttons.export_data_pdf",
                "Télécharger mes données (PDF)",
              )}
            </Button>

            <Button
              className="font-bold px-8 w-full sm:w-auto tracking-wider order-3"
              color="danger"
              isDisabled={isSaving || isExporting}
              isLoading={isDeleting}
              variant="bordered"
              onPress={handleDeleteAccount}
            >
              {t("account.buttons.delete_account")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
