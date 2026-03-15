import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Progress } from "@heroui/progress";
import { addToast } from "@heroui/toast";

import {
  CreateMatchDto,
  Match,
  Level,
  Venue,
  PitchType,
} from "@/types/match.types";
import { Category } from "@/types/exercise.types";
import { useMatches } from "@/hooks/use-matches";
import { useUser } from "@/hooks/use-user";
import { JerseyColorDots } from "@/components/jersey-color-dots";

interface MatchFormProps {
  initialData?: Match;
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

export default function MatchForm({
  initialData,
  onSuccess,
  onCancel,
}: MatchFormProps) {
  const { t } = useTranslation();
  const { createMatch, updateMatch } = useMatches();
  const { user } = useUser();
  const navigate = useNavigate();

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data
  const [formData, setFormData] = useState<Partial<CreateMatchDto>>({
    category: Category.SENIORS,
    level: Level.DEPARTEMENTAL_1,
    format: "11v11",
    venue: "Domicile",
    match_date: new Date(
      new Date().getTime() - new Date().getTimezoneOffset() * 60000,
    )
      .toISOString()
      .split("T")[0],
    match_time: "15:00",
    email: "",
    phone: "",
    notes: "",
    club_id: "",
    location_address: "",
    location_city: "",
    location_zip: "",
    pitch_type: undefined,
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
        category: initialData.category,
        level: initialData.level,
        format: initialData.format,
        venue: initialData.venue,
        match_date: initialData.match_date,
        match_time: initialData.match_time,
        email: initialData.email,
        phone: initialData.phone,
        notes: cleanNotes,
        club_id: initialData.club_id,
        location_address: initialData.location_address || "",
        location_city: initialData.location_city || "",
        location_zip: initialData.location_zip || "",
        pitch_type: initialData.pitch_type,
        jersey_color: initialData.jersey_color || "",
      });
    } else if (user) {
      setFormData((prev) => ({
        ...prev,
        club_id: prev.club_id || user.club?.id,
        location_address:
          prev.club_id === user.club?.id
            ? user.stadium_address || prev.location_address || ""
            : prev.location_address,
        location_city:
          prev.club_id === user.club?.id
            ? user.club?.city || prev.location_city || ""
            : prev.location_city,
        location_zip:
          prev.club_id === user.club?.id
            ? user.club?.zip || prev.location_zip || ""
            : prev.location_zip,
        email: user.email || prev.email || "",
        phone: user.phone || prev.phone || "",
        category: (user.category as Category) || prev.category,
        level: (user.level as Level) || prev.level,
        pitch_type: (user.pitch_type as PitchType) || prev.pitch_type,
        jersey_color:
          prev.venue === "Domicile"
            ? user.home_jersey_color || ""
            : prev.venue === "Extérieur"
              ? user.away_jersey_color || ""
              : "",
      }));
    }
  }, [initialData, user]);

  useEffect(() => {
    if (!initialData && user && formData.club_id) {
      if (formData.club_id === user.club?.id) {
        setFormData((prev) => ({
          ...prev,
          location_address: user.stadium_address || prev.location_address || "",
          location_city: user.club?.city || prev.location_city || "",
          location_zip: user.club?.zip || prev.location_zip || "",
        }));
      } else {
        const addClub = user.additional_clubs?.find(
          (c) => c.id === formData.club_id,
        );

        setFormData((prev) => ({
          ...prev,
          location_address: addClub?.stadium_address || "",
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

  const handleChange = (field: keyof CreateMatchDto, value: any) => {
    if (errors[field as string]) {
      setErrors((prev) => ({ ...prev, [field as string]: "" }));
    }
    if (field === "phone") {
      const formatted = formatPhoneNumber(value);

      setFormData((prev) => ({ ...prev, [field]: formatted }));
    } else if (field === "venue") {
      const venue = value as Venue;
      let jerseyColor = formData.jersey_color;

      if (user) {
        if (venue === "Domicile") jerseyColor = user.home_jersey_color || "";
        else if (venue === "Extérieur")
          jerseyColor = user.away_jersey_color || "";
      }
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        jersey_color: jerseyColor,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.category)
      newErrors.category = t("account.errors.category_required");
    if (!formData.level) newErrors.level = t("account.errors.level_required");
    if (!formData.format)
      newErrors.format = t("account.errors.format_required");
    if (!formData.match_date) {
      newErrors.match_date = t("matchForm.alerts.date_required");
    } else {
      const now = new Date();
      const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const selectedDate = formData.match_date;

      if (selectedDate < todayStr) {
        newErrors.match_date = t("matchForm.alerts.date_past_error", "Date passée : Le match ne peut pas être dans le passé.");
      } else if (selectedDate === todayStr) {
        // Restriction de 2h uniquement pour AUJOURD'HUI
        if (formData.match_time) {
          const [hours, minutes] = formData.match_time.split(":").map(Number);
          const matchDateTime = new Date(`${selectedDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
          const minTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

          if (matchDateTime < minTime) {
            newErrors.match_time = t("matchForm.alerts.delay_short_error", "Délai trop court : Un match aujourd'hui doit être créé au moins 2 heures avant le coup d'envoi.");
          }
        }
      }
    }
    if (!formData.match_time)
      newErrors.match_time = t("matchForm.alerts.time_required");
    if (!formData.venue) newErrors.venue = t("matchForm.alerts.venue_required");
    if (!formData.pitch_type)
      newErrors.pitch_type = t("account.errors.pitch_required");
    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email))
      newErrors.email = t("account.errors.email_invalid");
    if (!formData.phone || formData.phone.replace(/\D/g, "").length < 11)
      newErrors.phone = t("account.errors.phone_required");

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
        notes: `Genre: ${gender}\n${formData.notes || ""}`.trim(),
      };

      if (initialData?.id) {
        await updateMatch(initialData.id, payload as any);
        addToast({
          title: t("success"),
          description: t("matchForm.alerts.update_success"),
          color: "success",
        });
      } else {
        await createMatch(payload as any);
        addToast({
          title: t("success"),
          description: t("matchForm.alerts.create_success"),
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

  return (
    <form
      className="flex flex-col gap-6 animate-appearance-in pb-12"
      onSubmit={handleSubmit}
    >
      <Card className="shadow-none border-none bg-transparent">
        <CardHeader className="flex gap-3 bg-[#1a0b2e] rounded-t-2xl px-6 py-4 border-b border-white/5">
          <div className="p-2.5 bg-violet-800/30 rounded-xl text-violet-400">
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                clipRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                fillRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <p className="text-base font-black text-white tracking-tight leading-none mb-1">
              {t("matchForm.title")}
            </p>
            <p className="text-[11px] text-zinc-400 font-medium">
              {t("matchForm.subtitle")}
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
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-emerald-500/70 tracking-tighter">
                    {t("matchForm.labels.linked_club")}
                  </span>
                  <span className="text-sm font-black text-emerald-100 whitespace-normal break-words leading-tight">
                    {user?.club?.name || t("matchForm.labels.not_linked")}
                  </span>
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

          {/* Main match details grid (4 columns) */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                isRequired
                classNames={{ trigger: "bg-[#160d21] border-[#2a1b3d]" }}
                label={t("matchForm.labels.category")}
                selectedKeys={[formData.category || ""]}
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
                selectedKeys={[formData.level || ""]}
                size="sm"
                variant="faded"
                onChange={(e) => handleChange("level", e.target.value)}
              >
                {Object.values(Level).map((lvl) => (
                  <SelectItem key={lvl}>{t(`enums.level.${lvl}`)}</SelectItem>
                ))}
              </Select>
              <Select
                isRequired
                classNames={{ trigger: "bg-[#160d21] border-[#2a1b3d]" }}
                label={t("matchForm.labels.format")}
                selectedKeys={[formData.format || ""]}
                size="sm"
                variant="faded"
                onChange={(e) => handleChange("format", e.target.value)}
              >
                {["11v11", "8v8", "7v7", "5v5"].map((f) => (
                  <SelectItem key={f}>{f.replace("v", " vs ")}</SelectItem>
                ))}
              </Select>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                isRequired
                classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
                errorMessage={errors.match_date}
                isInvalid={!!errors.match_date}
                label={t("matchForm.labels.date")}
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
                label={t("matchForm.labels.time")}
                size="sm"
                type="time"
                value={formData.match_time}
                variant="faded"
                onValueChange={(v) => handleChange("match_time", v)}
              />
              <Select
                isRequired
                classNames={{ trigger: "bg-[#160d21] border-[#2a1b3d]" }}
                label={t("matchForm.labels.venue")}
                selectedKeys={[formData.venue || ""]}
                size="sm"
                variant="faded"
                onChange={(e) => handleChange("venue", e.target.value)}
              >
                <SelectItem key="Domicile">{t("enums.venue.Domicile")}</SelectItem>
                <SelectItem key="Extérieur">
                  {t("enums.venue.Extérieur")}
                </SelectItem>
              </Select>
              <Select
                isRequired
                classNames={{ trigger: "bg-[#160d21] border-[#2a1b3d]" }}
                label={t("matchForm.labels.pitch_type")}
                selectedKeys={formData.pitch_type ? [formData.pitch_type] : []}
                size="sm"
                variant="faded"
                onChange={(e) => handleChange("pitch_type", e.target.value)}
              >
                {PITCH_TYPES.map((type) => (
                  <SelectItem key={type}>{t(`enums.pitch.${type}`)}</SelectItem>
                ))}
              </Select>
            </div>

            <div
              className="bg-[#160d21]/50 border border-[#2a1b3d] rounded-2xl p-4 flex items-center justify-between group cursor-pointer"
              onClick={() => showLockedInfo("jersey")}
            >
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-violet-400 tracking-widest pl-1">
                  {t("matchForm.labels.jersey_color", "Couleurs de maillot")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold pl-1">
                    {formData.jersey_color || t("common:not_provided")}
                  </span>
                  {formData.jersey_color && (
                    <JerseyColorDots colors={formData.jersey_color} size="md" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 bg-violet-500/10 text-violet-400 text-[9px] font-black px-3 py-1.5 rounded-full border border-violet-500/20 group-hover:bg-violet-500/20 transition-all">
                <span>🔒</span>
                <span className="mb-[1px]">{t("matchForm.labels.edit_in_account", "Modifier dans mon compte")}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar Section */}
          <div className="flex flex-col gap-2 mt-4">
            <div className="flex justify-center text-center px-4">
              <span className="text-[11px] font-black text-violet-300 tracking-[0.15em] leading-tight">
                {t("matchForm.progress")}: 100%
              </span>
            </div>
            <Progress
              aria-label="Preparation"
              className="h-2"
              classNames={{
                base: "bg-violet-900/20 rounded-full overflow-hidden",
                indicator:
                  "bg-gradient-to-r from-violet-600 to-violet-400 rounded-full",
              }}
              value={100}
            />
          </div>
        </CardBody>
      </Card>

      {/* Second Card: Contact & Notes */}
      <Card className="shadow-none border-none bg-transparent">
        <CardHeader className="bg-[#160d21] rounded-t-2xl px-6 py-3 border-b border-white/5">
          <p className="text-sm font-black text-white tracking-tight">
            {t("matchForm.labels.contact_notes")}
          </p>
        </CardHeader>
        <CardBody className="bg-[#0f0717] rounded-b-2xl p-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              isRequired
              classNames={{ inputWrapper: "bg-[#160d21] border-[#2a1b3d]" }}
              label={t("matchForm.labels.email")}
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
            label={t("matchForm.labels.notes")}
            minRows={3}
            placeholder={t("matchForm.labels.notes_placeholder")}
            value={formData.notes}
            variant="faded"
            onValueChange={(v) => handleChange("notes", v)}
          />

          {/* Floating Action Bar at the bottom of screen (or just bottom of form) */}
          <div className="flex justify-end gap-3 mt-4">
            <Button
              className="font-bold text-zinc-500"
              variant="light"
              onPress={() => (onCancel ? onCancel() : navigate("/matches"))}
            >
              {t("matchForm.buttons.cancel")}
            </Button>
            <Button
              className="bg-violet-600 font-black tracking-tighter px-12 rounded-xl shadow-lg shadow-violet-500/20"
              color="primary"
              isLoading={isSaving}
              type="submit"
            >
              {initialData ? t("matchForm.buttons.update") : t("matchForm.buttons.create")}
            </Button>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
