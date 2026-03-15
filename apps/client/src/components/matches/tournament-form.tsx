import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Progress } from "@heroui/progress";
import { addToast } from "@heroui/toast";

import { Category } from "@/types/exercise.types";
import { Level, PitchType } from "@/types/match.types";
import { useUser } from "@/hooks/use-user";
import { useMatches } from "@/hooks/use-matches";
import { JerseyColorDots } from "@/components/jersey-color-dots";

interface TournamentFormProps {
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PITCH_TYPES: PitchType[] = [
  "Herbe",
  "Synthétique",
  "Hybride",
  "Stabilisé",
  "Toutes surfaces",
];

export default function TournamentForm({
  initialData,
  onSuccess,
  onCancel,
}: TournamentFormProps) {
  const { t } = useTranslation();
  const { createMatch, updateMatch } = useMatches();
  const { user } = useUser();
  const navigate = useNavigate();

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: "",
    category: Category.SENIORS,
    level: Level.DEPARTEMENTAL_1,
    format: "11v11" as any,
    venue: "Domicile" as any,
    max_teams: "16",
    registration_fee: "0",
    match_date: new Date(
      new Date().getTime() - new Date().getTimezoneOffset() * 60000,
    )
      .toISOString()
      .split("T")[0],
    match_time: "09:00",
    match_end_time: "11:00",
    email: "",
    phone: "",
    notes: "",
    pitch_type: "Herbe" as PitchType,
    location_address: "",
    location_zip: "",
    location_city: "",
    club_id: "",
    jersey_color: "",
  });

  const [gender, setGender] = useState<string>("Masculin");

  useEffect(() => {
    if (initialData) {
      const genderMatch = initialData.notes?.match(/Genre: (.*)(\n|$)/);
      let extractedGender = genderMatch ? genderMatch[1].trim() : "Masculin";

      if (extractedGender.startsWith("enums.gender.")) {
        extractedGender = extractedGender.replace("enums.gender.", "");
      }
      const cleanNotes =
        initialData.notes?.replace(/Genre: .*(\n|$)/, "").trim() || "";

      setGender(extractedGender);
      setFormData({
        name: initialData.name || "",
        category: initialData.category,
        level: initialData.level,
        format: initialData.format,
        venue: initialData.venue,
        max_teams: initialData.max_teams?.toString() || "16",
        registration_fee: initialData.registration_fee?.toString() || "0",
        match_date: initialData.match_date,
        match_time: initialData.match_time,
        match_end_time: initialData.match_end_time || "11:00",
        email: initialData.email,
        phone: initialData.phone,
        notes: cleanNotes,
        club_id: initialData.club_id || "",
        location_address: initialData.location_address || "",
        location_zip: initialData.location_zip || "",
        location_city: initialData.location_city || "",
        pitch_type: initialData.pitch_type || "Herbe",
        jersey_color: initialData.jersey_color || "",
      });
    } else if (user) {
      setFormData((prev) => ({
        ...prev,
        club_id: prev.club_id || user.club?.id || "",
        email: user.email || prev.email || "",
        phone: user.phone || prev.phone || "",
        location_address:
          prev.club_id === user.club?.id
            ? user.stadium_address || user.club?.address || ""
            : prev.location_address || "",
        location_zip:
          prev.club_id === user.club?.id
            ? user.club?.zip || ""
            : prev.location_zip || "",
        location_city:
          prev.club_id === user.club?.id
            ? user.club?.city || ""
            : prev.location_city || "",
        category: (user.category as Category) || prev.category,
        level: (user.level as Level) || prev.level,
        pitch_type: (user.pitch_type as PitchType) || prev.pitch_type,
        jersey_color: user.home_jersey_color || prev.jersey_color || "",
      }));
    }
  }, [user, initialData]);

  useEffect(() => {
    if (!initialData && user && formData.club_id) {
      if (formData.club_id === user.club?.id) {
        setFormData((prev) => ({
          ...prev,
          location_address: user.stadium_address || user.club?.address || "",
          location_city: user.club?.city || "",
          location_zip: user.club?.zip || "",
        }));
      } else {
        const addClub = user.additional_clubs?.find(
          (c) => c.id === formData.club_id,
        );

        setFormData((prev) => ({
          ...prev,
          location_address: addClub?.stadium_address || addClub?.address || "",
          location_city: addClub?.city || "",
          location_zip: addClub?.zip || "",
        }));
      }
    }
  }, [formData.club_id, user, initialData]);

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

  const handleChange = (field: string, value: any) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
    if (field === "phone") {
      setFormData((prev) => ({ ...prev, [field]: formatPhoneNumber(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = "Le nom du tournoi est obligatoire.";
    if (!formData.category)
      newErrors.category = "La catégorie est obligatoire.";
    if (!formData.level) newErrors.level = "Le niveau est obligatoire.";
    if (!formData.max_teams)
      newErrors.max_teams = "Le nombre d'équipes est obligatoire.";
    if (!formData.match_date) {
      newErrors.match_date = "La date est obligatoire.";
    } else {
      const now = new Date();
      const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const selectedDate = formData.match_date;

      if (selectedDate < todayStr) {
        newErrors.match_date = t("matchForm.alerts.date_past_error", "Date passée : Le tournoi ne peut pas être dans le passé.");
      } else if (selectedDate === todayStr) {
        const [hours, minutes] = (formData.match_time || "00:00").split(":").map(Number);
        const matchDateTime = new Date(`${selectedDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
        const minTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        if (matchDateTime < minTime) {
          newErrors.match_time = t("matchForm.alerts.delay_short_error", "Délai trop court : Un tournoi aujourd'hui doit être créé au moins 2 heures avant le coup d'envoi.");
        }
      }
    }
    if (!formData.match_time)
      newErrors.match_time = "L'heure de début est obligatoire.";
    if (!formData.match_end_time)
      newErrors.match_end_time = "L'heure de fin est obligatoire.";
    if (!formData.pitch_type)
      newErrors.pitch_type = "Le type de terrain est obligatoire.";
    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email))
      newErrors.email = "Un email valide est obligatoire.";
    if (!formData.phone || formData.phone.replace(/\D/g, "").length < 11)
      newErrors.phone = "Le téléphone est obligatoire.";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast({
        title: t("matchForm.alerts.validation_failed", "Formulaire incomplet"),
        description: t("account.errors.form_incomplete_desc", "Veuillez remplir tous les champs obligatoires en rouge."),
        color: "danger",
      });
      return;
    }
    if (!user?.club_id) return;

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        type: "tournament" as const,
        max_teams: parseInt(formData.max_teams),
        registration_fee: parseFloat(formData.registration_fee),
        notes: `Genre: ${gender}\n${formData.notes || ""}`.trim(),
      };

      if (initialData?.id) {
        await updateMatch(initialData.id, payload as any);
        addToast({
          title: t("success"),
          description: t("dashboard.alerts.success_discrete"),
          color: "success",
        });
      } else {
        await createMatch(payload as any);
        addToast({
          title: t("success"),
          description: t("tournamentForm.alerts.create_success"),
          color: "success",
        });
      }

      if (onSuccess) onSuccess();
    } catch (error: any) {
      addToast({
        title: t("error"),
        description: error.message || t("error.save_failed"),
        color: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const showLockedInfo = (type: "address" | "city" | "zip" | "jersey") => {
    if (type === "jersey") {
      addToast({
        title: t("info"),
        description: t("matchForm.labels.edit_in_account"),
        color: "warning",
      });
    } else if (type === "address") {
      addToast({
        title: t("info"),
        description: t("matchForm.alerts.must_link"),
        color: "primary",
      });
    } else {
      addToast({
        title: t("info"),
        description: t("account.fields.stadium_locked"),
        color: "primary",
      });
    }
  };

  const availableClubs = user
    ? [
        {
          id: user.club?.id || "primary",
          name: user.club?.name || "Club Principal",
          description: "Club Principal",
        },
        ...(user.additional_sirets || []).map((item: any) => {
          const s = typeof item === "string" ? item : item.siret;
          const clubInfo = user.additional_clubs?.find((c) => c.siret === s);

          return {
            id: clubInfo?.id || s,
            name: clubInfo?.name || s,
            description: "Club Secondaire",
          };
        }),
      ]
    : [];

  return (
    <form
      className="flex flex-col gap-6 animate-appearance-in pb-12"
      onSubmit={handleSubmit}
    >
      <Card className="shadow-none border-none bg-transparent">
        <CardHeader className="flex gap-3 bg-[#1e0a29] rounded-t-2xl px-6 py-4 border-b border-white/5">
          <div className="p-2.5 bg-purple-800/30 rounded-xl text-purple-400">
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M11.644 1.59a.75.75 0 0 1 .712 0l9.75 5.25a.75.75 0 0 1 0 1.32l-9.75 5.25a.75.75 0 0 1-.712 0l-9.75-5.25a.75.75 0 0 1 0-1.32l9.75-5.25Z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <p className="text-base font-black text-white tracking-tight leading-none mb-1">
              {t("tournamentForm.labels.name_form", "Créer un tournoi amical")}
            </p>
            <p className="text-[11px] text-zinc-400 font-medium">
              {t("tournamentForm.labels.subtitle_form", "Organisez une compétition et invitez des équipes.")}
            </p>
          </div>
        </CardHeader>

        <CardBody className="bg-[#0f0717] rounded-b-2xl p-6 flex flex-col gap-8">
          {/* Top Row: Club and stadium */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Club Block */}
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-emerald-500/20 rounded-full text-emerald-400">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      clipRule="evenodd"
                      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                      fillRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex flex-col w-full min-w-0">
                  <span className="text-[10px] font-black text-emerald-500/70 tracking-tighter">
                    {t("matchForm.labels.linked_club")}
                  </span>
                  {Array.isArray(user?.additional_sirets) &&
                  user.additional_sirets.length > 0 ? (
                    <Dropdown>
                      <DropdownTrigger>
                        <Button
                          className="h-auto p-0 min-w-0 bg-transparent text-left justify-start"
                          endContent={
                            <svg
                              className="w-3 h-3 text-emerald-400/50"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                clipRule="evenodd"
                                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                                fillRule="evenodd"
                              />
                            </svg>
                          }
                          size="sm"
                        >
                          <span className="text-sm font-black text-emerald-100 whitespace-normal break-words leading-tight">
                            {formData.club_id === user.club?.id ||
                            !formData.club_id
                              ? user.club?.name || "Club Principal"
                              : user.additional_clubs?.find(
                                  (c) => c.id === formData.club_id,
                                )?.name || formData.club_id}
                          </span>
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        items={availableClubs}
                        selectedKeys={[
                          formData.club_id || user.club?.id || "primary",
                        ]}
                        selectionMode="single"
                        onAction={(key) =>
                          handleChange("club_id", key as string)
                        }
                      >
                        {(item: any) => (
                          <DropdownItem
                            key={item.id}
                            className="text-emerald-900"
                            description={item.description}
                          >
                            <span className="font-bold">{item.name}</span>
                          </DropdownItem>
                        )}
                      </DropdownMenu>
                    </Dropdown>
                  ) : (
                    <span className="text-sm font-black text-emerald-100 whitespace-normal break-words leading-tight">
                      {user?.club?.name}
                    </span>
                  )}
                </div>
              </div>
              <Button
                className="bg-red-950/30 text-red-400/80 font-bold border border-red-900/20 py-4"
                size="sm"
                variant="flat"
              >
                {t("matchForm.buttons.unlink")}
              </Button>
            </div>

            {/* stadium Block */}
            <div className="flex flex-col gap-3">
              <div
                className="relative cursor-pointer"
                onClick={() => showLockedInfo("address")}
              >
                <Input
                  isDisabled
                  classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                  endContent={
                    <div className="flex items-center h-full">
                      <div className="bg-emerald-500 text-[#0f0717] text-[10px] sm:text-[11px] font-black px-2 py-1 rounded-full flex items-center gap-1 leading-none shadow-lg shadow-emerald-500/20 whitespace-nowrap">
                        <span>🏟️</span>
                        <span className="mb-[1px]">{t("matchForm.labels.stadium")}</span>
                      </div>
                    </div>
                  }
                  label={t("matchForm.labels.address")}
                  size="sm"
                  value={formData.location_address}
                  variant="faded"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="cursor-pointer"
                  onClick={() => showLockedInfo("zip")}
                >
                  <Input
                    isDisabled
                    classNames={{
                      inputWrapper: "bg-[#160d21] border-[#2a1b3d]",
                    }}
                    label={t("matchForm.labels.zip")}
                    size="sm"
                    value={formData.location_zip}
                    variant="faded"
                  />
                </div>
                <div
                  className="cursor-pointer"
                  onClick={() => showLockedInfo("city")}
                >
                  <Input
                    isDisabled
                    classNames={{
                      inputWrapper: "bg-[#160d21] border-[#2a1b3d]",
                    }}
                    label={t("matchForm.labels.city")}
                    size="sm"
                    value={formData.location_city}
                    variant="faded"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main match details grid (Mix grid) */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Input
                  isRequired
                  classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                  label={t("tournamentForm.labels.name")}
                  placeholder={t("tournamentForm.labels.name_placeholder")}
                  size="sm"
                  value={formData.name}
                  variant="faded"
                  onValueChange={(v) => handleChange("name", v)}
                />
              </div>
              <Select
                isRequired
                classNames={{ trigger: "bg-[#160d21] border-[#2a1b3d]" }}
                label={t("matchForm.labels.category")}
                selectedKeys={[formData.category]}
                size="sm"
                variant="faded"
                onChange={(e) => handleChange("category", e.target.value)}
              >
                {Object.values(Category).map((cat) => (
                  <SelectItem key={cat}>
                    {t(`enums.category.${cat}`)}
                  </SelectItem>
                ))}
              </Select>
              <Select
                isRequired
                classNames={{ trigger: "bg-[#160d21] border-[#2a1b3d]" }}
                label={t("matchForm.labels.level")}
                selectedKeys={[formData.level]}
                size="sm"
                variant="faded"
                onChange={(e) => handleChange("level", e.target.value)}
              >
                {Object.values(Level).map((lvl) => (
                  <SelectItem key={lvl}>{t(`enums.level.${lvl}`)}</SelectItem>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                isRequired
                classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                label={t("tournamentForm.labels.max_teams")}
                size="sm"
                type="number"
                value={formData.max_teams}
                variant="faded"
                onValueChange={(v) => handleChange("max_teams", v)}
              />
              <Input
                classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                label={t("tournamentForm.labels.fee")}
                size="sm"
                type="number"
                value={formData.registration_fee}
                variant="faded"
                onValueChange={(v) => handleChange("registration_fee", v)}
              />
              <Select
                classNames={{ trigger: "bg-[#160d21] border-[#2a1b3d]" }}
                label={t("matchForm.labels.gender")}
                selectedKeys={[gender]}
                size="sm"
                variant="faded"
                onChange={(e) => setGender(e.target.value)}
              >
                <SelectItem key="Masculin">{t("enums.gender.Masculin")}</SelectItem>
                <SelectItem key="Féminin">{t("enums.gender.Féminin")}</SelectItem>
                <SelectItem key="Mixte">{t("enums.gender.Mixte")}</SelectItem>
              </Select>
              <Select
                isRequired
                classNames={{ trigger: "bg-[#160d21] border-[#2a1b3d]" }}
                label={t("matchForm.labels.pitch_type")}
                selectedKeys={[formData.pitch_type]}
                size="sm"
                variant="faded"
                onChange={(e) => handleChange("pitch_type", e.target.value)}
              >
                {PITCH_TYPES.map((type) => (
                  <SelectItem key={type}>{t(`enums.pitch.${type}`)}</SelectItem>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                isRequired
                classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                errorMessage={errors.match_date}
                isInvalid={!!errors.match_date}
                label={t("tournamentForm.labels.date")}
                min={
                  new Date(
                    new Date().getTime() -
                      new Date().getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .split("T")[0]
                }
                size="sm"
                type="date"
                value={formData.match_date}
                variant="faded"
                onValueChange={(v) => handleChange("match_date", v)}
              />
              <Input
                isRequired
                classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                errorMessage={errors.match_time}
                isInvalid={!!errors.match_time}
                label={t("tournamentForm.labels.time")}
                size="sm"
                type="time"
                value={formData.match_time}
                variant="faded"
                onValueChange={(v) => handleChange("match_time", v)}
              />
              <Input
                isRequired
                classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                errorMessage={errors.match_end_time}
                isInvalid={!!errors.match_end_time}
                label={t("tournamentForm.labels.end_time")}
                size="sm"
                type="time"
                value={formData.match_end_time}
                variant="faded"
                onValueChange={(v) => handleChange("match_end_time", v)}
              />
            </div>

            <div
              className="bg-[#160d21]/50 border border-[#2a1b3d] rounded-2xl p-4 flex items-center justify-between group cursor-pointer"
              onClick={() => showLockedInfo("jersey")}
            >
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-purple-400 tracking-widest pl-1">
                  {t("matchForm.labels.jersey_color", "Couleurs de maillot")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold pl-1">
                    {formData.jersey_color || t("tournamentForm.labels.unspecified")}
                  </span>
                  {formData.jersey_color && (
                    <JerseyColorDots colors={formData.jersey_color} size="md" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 bg-purple-500/10 text-purple-400 text-[9px] font-black px-3 py-1.5 rounded-full border border-purple-500/20 group-hover:bg-purple-500/20 transition-all">
                <span>🔒</span>
                <span className="mb-[1px]">{t("matchForm.labels.edit_in_account")}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar Container */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex justify-between items-center bg-zinc-800/50 p-3 rounded-xl border border-white/5">
          <p className="text-[10px] font-black tracking-[0.2em] text-default-400 uppercase">
            {t("tournamentForm.labels.progress_announcement")}
          </p>
          <p className="text-xs font-black text-primary animate-pulse">
            {(() => {
              const fields = [
                formData.name,
                formData.max_teams,
                formData.registration_fee, // Changed from price to registration_fee
                formData.match_date, // Changed from date to match_date
                formData.match_time, // Changed from time to match_time
                formData.email, // Changed from contact_email to email
                formData.notes,
              ];
              const filled = fields.filter(
                (f) =>
                  f !== undefined &&
                  f !== null &&
                  f.toString().trim().length > 0,
              ).length;
              return Math.round((filled / fields.length) * 100);
            })()}
            %
          </p>
        </div>
        <Progress
          aria-label="Progression"
          className="h-2"
          classNames={{
            indicator: "bg-gradient-to-r from-purple-600 to-purple-400 rounded-full", // Corrected classNames
            base: "bg-purple-900/20 rounded-full overflow-hidden", // Added base classNames
          }}
          value={(() => {
            const fields = [
              formData.name,
              formData.max_teams,
              formData.registration_fee, // Changed from price to registration_fee
              formData.match_date, // Changed from date to match_date
              formData.match_time, // Changed from time to match_time
              formData.email, // Changed from contact_email to email
              formData.notes,
            ];
            const filled = fields.filter(
              (f) =>
                f !== undefined &&
                f !== null &&
                f.toString().trim().length > 0,
            ).length;
            return Math.round((filled / fields.length) * 100);
          })()}
        />
      </div>
        </CardBody>
      </Card>

      {/* Second Card: Contact & Notes */}
      <Card className="shadow-none border-none bg-transparent">
        <CardHeader className="bg-[#160d21] rounded-t-2xl px-6 py-3 border-b border-white/5">
          <p className="text-sm font-black text-white tracking-tight">
            {t("tournamentForm.labels.contact_additional")}
          </p>
        </CardHeader>
        <CardBody className="bg-[#0f0717] rounded-b-2xl p-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              isRequired
              classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
              label={t("tournamentForm.labels.contact_email")}
              size="sm"
              type="email"
              value={formData.email}
              variant="faded"
              onValueChange={(v) => handleChange("email", v)}
            />
            <Input
              isRequired
              classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
              label={t("matchForm.labels.phone")}
              size="sm"
              value={formData.phone}
              variant="faded"
              onValueChange={(v) => handleChange("phone", v)}
            />
          </div>
          <Textarea
            classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
            label={t("tournamentForm.labels.notes")}
            minRows={3}
            placeholder={t("tournamentForm.labels.notes_placeholder")}
            value={formData.notes}
            variant="faded"
            onValueChange={(v) => handleChange("notes", v)}
          />

            <div className="flex justify-end gap-3 mt-4">
              <Button
                className="font-bold text-zinc-500"
                variant="light"
                onPress={() => (onCancel ? onCancel() : navigate("/tournaments"))}
              >
                {t("matchForm.buttons.cancel")}
              </Button>
              <Button
                className="bg-purple-600 font-black tracking-tighter px-12 rounded-xl shadow-lg shadow-purple-500/20"
                color="primary"
                isLoading={isSaving}
                type="submit"
              >
                {initialData ? t("tournamentForm.labels.update", "Mettre à jour le tournoi") : t("tournamentForm.labels.publish", "Publier le tournoi")}
              </Button>
            </div>
        </CardBody>
      </Card>
    </form>
  );
}
