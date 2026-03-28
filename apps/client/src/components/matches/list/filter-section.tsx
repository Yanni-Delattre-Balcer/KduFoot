import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Select, SelectItem } from "@heroui/select";
import { Input } from "@heroui/input";
import { useTranslation } from "react-i18next";

import { Category } from "@/types/exercise.types";
import {
  Format,
  PitchType,
  Venue,
  MatchFilters,
  Level,
} from "@/types/match.types";
import { User } from "@/types/user.types";

interface FilterSectionProps {
  filters: MatchFilters;
  handleFilterChange: (key: keyof MatchFilters, value: string) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  type: "match" | "tournament";
  radiusKm: number;
  setRadiusKm: (v: number) => void;
  user: User | null;
  canUseDistance: boolean;
}

const CATEGORIES = Object.values(Category);
const LEVELS = Object.values(Level);
const FORMATS: Format[] = ["11v11", "8v8", "5v5", "Futsal"];
const PITCH_TYPES: PitchType[] = [
  "Herbe",
  "Synthétique",
  "Hybride",
  "Stabilisé",
  "Toutes surfaces",
];
const VENUES: (Venue | "Peu importe")[] = [
  "Peu importe",
  "Domicile",
  "Extérieur",
];

export const FilterSection = ({
  filters,
  handleFilterChange,
  clearFilters,
  activeFilterCount,
  type,
  radiusKm,
  setRadiusKm,
  user,
  canUseDistance,
}: FilterSectionProps) => {
  const { t } = useTranslation();

  return (
    <Card
      className={`shadow-lg border ${type === "match" ? "shadow-violet-500/5 border-violet-800/50" : "shadow-fuchsia-500/5 border-fuchsia-500/20"} bg-[#232120] overflow-hidden`}
    >
      <CardHeader className="pb-0 pt-5 px-5 relative">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${type === "match" ? "bg-violet-800/20" : "bg-purple-300/20"}`}
            >
              <svg
                className={`w-4 h-4 ${type === "match" ? "text-violet-800 dark:text-violet-300" : "text-purple-400 dark:text-purple-200"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-default-900 dark:text-default-100">
              {t("matchesPage.filters.title")}
            </h3>
            {activeFilterCount > 0 && (
              <Chip
                className="bg-violet-900/20 text-violet-200 dark:bg-violet-500/20 dark:text-violet-300"
                color="secondary"
                size="sm"
                variant="flat"
              >
                {activeFilterCount} {t("matchesPage.filters.active")}
              </Chip>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button
              color="danger"
              size="sm"
              variant="light"
              onPress={clearFilters}
            >
              {t("matchesPage.filters.clear")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody className="px-5 pb-5 relative flex flex-col gap-4">
        <p className="text-small text-default-500 italic">
          {t("match.filters.explanation")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Select
            aria-label={t("matchesPage.filters.category")}
            classNames={{
              trigger:
                "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
              label: "text-zinc-400 font-medium",
            }}
            label={t("matchesPage.filters.category")}
            placeholder={t("matchesPage.filters.all")}
            selectedKeys={filters.category ? [filters.category] : []}
            size="sm"
            onChange={(e) => handleFilterChange("category", e.target.value)}
          >
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat}>{t(`enums.category.${cat}`)}</SelectItem>
            ))}
          </Select>

          <Select
            aria-label={t("matchesPage.filters.level")}
            classNames={{
              trigger:
                "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
              label: "text-zinc-400 font-medium",
            }}
            label={t("matchesPage.filters.level")}
            placeholder={t("matchesPage.filters.all")}
            selectedKeys={filters.level ? [filters.level] : []}
            size="sm"
            onChange={(e) => handleFilterChange("level", e.target.value)}
          >
            {LEVELS.map((lvl) => (
              <SelectItem key={lvl}>{t(`enums.level.${lvl}`)}</SelectItem>
            ))}
          </Select>

          <Select
            aria-label={t("matchesPage.filters.format")}
            classNames={{
              trigger:
                "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
              label: "text-zinc-400 font-medium",
            }}
            label={t("matchesPage.filters.format")}
            placeholder={t("matchesPage.filters.all")}
            selectedKeys={filters.format ? [filters.format] : []}
            size="sm"
            onChange={(e) => handleFilterChange("format", e.target.value)}
          >
            {FORMATS.map((f) => (
              <SelectItem key={f}>{t(`enums.format.${f}`, f)}</SelectItem>
            ))}
          </Select>

          <Select
            aria-label={t("matchesPage.filters.gender")}
            classNames={{
              trigger:
                "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
              label: "text-zinc-400 font-medium",
            }}
            label={t("matchesPage.filters.gender")}
            placeholder={t("matchesPage.filters.all")}
            selectedKeys={
              filters.notes && filters.notes.includes("Genre:")
                ? [filters.notes.split("Genre: ")[1]]
                : []
            }
            size="sm"
            onChange={(e) =>
              handleFilterChange(
                "notes",
                e.target.value ? `Genre: ${e.target.value}` : "",
              )
            }
          >
            <SelectItem key="Masculin">{t("enums.gender.Masculin")}</SelectItem>
            <SelectItem key="Féminin">{t("enums.gender.Féminin")}</SelectItem>
            <SelectItem key="Mixte">{t("enums.gender.Mixte")}</SelectItem>
            <SelectItem key="Non spécifié">
              {t("enums.gender.Non spécifié")}
            </SelectItem>
          </Select>

          <Select
            aria-label={t("matchesPage.filters.pitch_type")}
            classNames={{
              trigger:
                "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
              label: "text-zinc-400 font-medium",
            }}
            label={t("matchesPage.filters.pitch_type")}
            placeholder={t("matchesPage.filters.all")}
            selectedKeys={filters.pitch_type ? [filters.pitch_type] : []}
            size="sm"
            onChange={(e) => handleFilterChange("pitch_type", e.target.value)}
          >
            {PITCH_TYPES.map((pt) => (
              <SelectItem key={pt}>{t(`enums.pitch.${pt}`)}</SelectItem>
            ))}
          </Select>

          <Input
            aria-label={t("matchesPage.filters.date")}
            classNames={{
              inputWrapper:
                "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
              label: "text-zinc-400 font-medium",
            }}
            label={t("matchesPage.filters.date")}
            size="sm"
            type="date"
            value={filters.date || ""}
            onChange={(e) => handleFilterChange("date", e.target.value)}
          />

          <Select
            aria-label={t("matchesPage.filters.venue")}
            classNames={{
              trigger:
                "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
              label: "text-zinc-400 font-medium",
            }}
            label={t("matchesPage.filters.venue")}
            placeholder={t("matchesPage.filters.all")}
            selectedKeys={filters.venue ? [filters.venue] : []}
            size="sm"
            onChange={(e) => handleFilterChange("venue", e.target.value)}
          >
            {VENUES.map((v) => (
              <SelectItem key={v}>{t(`enums.venue.${v}`)}</SelectItem>
            ))}
          </Select>

          <Input
            isClearable
            aria-label={t("matchesPage.filters.city")}
            classNames={{
              inputWrapper:
                "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
              label: "text-zinc-400 font-medium",
            }}
            label={t("matchesPage.filters.city")}
            placeholder="Ex: Lens"
            size="sm"
            value={filters.location_city || ""}
            onChange={(e) =>
              handleFilterChange("location_city", e.target.value)
            }
            onClear={() => handleFilterChange("location_city", "")}
          />

          <Input
            isClearable
            aria-label={t("matchesPage.filters.zip")}
            classNames={{
              inputWrapper:
                "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
              label: "text-zinc-400 font-medium",
            }}
            label={t("matchesPage.filters.zip")}
            placeholder="Ex: 62300"
            size="sm"
            value={filters.location_zip || ""}
            onChange={(e) => handleFilterChange("location_zip", e.target.value)}
            onClear={() => handleFilterChange("location_zip", "")}
          />

          <Input
            aria-label={t("matchesPage.filters.radius")}
            classNames={{
              inputWrapper:
                "bg-zinc-900/80 border-white/20 hover:border-violet-500/50 transition-colors",
              label: "text-zinc-400 font-medium",
            }}
            description={
              !canUseDistance
                ? t("matchForm.alerts.must_link")
                : radiusKm > 0
                  ? `depuis ${user?.club?.city || "club"}`
                  : undefined
            }
            endContent={<span className="text-default-400 text-sm">km</span>}
            isDisabled={!canUseDistance}
            label={t("matchesPage.filters.radius")}
            max={200}
            min={0}
            placeholder={
              canUseDistance ? "Ex: 20" : t("matchForm.labels.siret")
            }
            size="sm"
            type="number"
            value={radiusKm > 0 ? String(radiusKm) : ""}
            onChange={(e) => setRadiusKm(parseInt(e.target.value) || 0)}
          />
        </div>
      </CardBody>
    </Card>
  );
};
