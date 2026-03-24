import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { useTranslation } from "react-i18next";

import { JerseyColorDots } from "../jersey-color-dots";

import { Category } from "@/types/exercise.types";
import { Level } from "@/types/match.types";

const CATEGORIES = Object.values(Category);
const LEVELS = Object.values(Level);

interface SportsProfileSectionProps {
  baseId: string;
  category: string;
  setCategory: (v: string) => void;
  level: string;
  setLevel: (v: string) => void;
  homeJerseyColor: string;
  setHomeJerseyColor: (v: string) => void;
  awayJerseyColor: string;
  setAwayJerseyColor: (v: string) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const SportsProfileSection = ({
  baseId,
  category,
  setCategory,
  level,
  setLevel,
  homeJerseyColor,
  setHomeJerseyColor,
  awayJerseyColor,
  setAwayJerseyColor,
  errors,
  setErrors,
}: SportsProfileSectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-default-400 ml-1 mt-2">
        {t("account.sections.sports_profile")}
      </p>
      <div className="bg-default-100/5 p-4 rounded-2xl border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          aria-label={t("account.fields.category")}
          errorMessage={errors.category}
          id={`${baseId}_category`}
          isInvalid={!!errors.category}
          label={t("account.fields.category")}
          name="acc_category"
          placeholder={t("common:choose", "Choisir...")}
          selectedKeys={category ? [category] : []}
          size="sm"
          variant="bordered"
          onChange={(e) => {
            setCategory(e.target.value);
            if (errors.category)
              setErrors((prev) => ({ ...prev, category: "" }));
          }}
        >
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat} textValue={t(`enums.category.${cat}`)}>
              {t(`enums.category.${cat}`)}
            </SelectItem>
          ))}
        </Select>
        <Select
          aria-label={t("account.fields.level")}
          errorMessage={errors.level}
          id={`${baseId}_level`}
          isInvalid={!!errors.level}
          label={t("account.fields.level")}
          name="acc_level"
          placeholder={t("common:choose", "Choisir...")}
          selectedKeys={level ? [level] : []}
          size="sm"
          variant="bordered"
          onChange={(e) => {
            setLevel(e.target.value);
            if (errors.level) setErrors((prev) => ({ ...prev, level: "" }));
          }}
        >
          {LEVELS.map((lvl) => (
            <SelectItem key={lvl} textValue={t(`enums.level.${lvl}`)}>
              {t(`enums.level.${lvl}`)}
            </SelectItem>
          ))}
        </Select>
        <Input
          isRequired
          aria-label={t("account.fields.home_jersey")}
          endContent={<JerseyColorDots colors={homeJerseyColor} size="md" />}
          errorMessage={errors.homeJerseyColor}
          id={`${baseId}_home_jersey`}
          isInvalid={!!errors.homeJerseyColor}
          label={t("account.fields.home_jersey", "Couleur maillot Domicile")}
          name="acc_home_jersey"
          placeholder={t(
            "account.fields.home_jersey_placeholder",
            "Ex: Rouge et Blanc",
          )}
          size="sm"
          value={homeJerseyColor}
          variant="bordered"
          onValueChange={(v) => {
            setHomeJerseyColor(v);
            if (errors.homeJerseyColor)
              setErrors((prev) => ({ ...prev, homeJerseyColor: "" }));
          }}
        />
        <Input
          isRequired
          aria-label={t("account.fields.away_jersey")}
          endContent={<JerseyColorDots colors={awayJerseyColor} size="md" />}
          errorMessage={errors.awayJerseyColor}
          id={`${baseId}_away_jersey`}
          isInvalid={!!errors.awayJerseyColor}
          label={t("account.fields.away_jersey", "Couleur maillot Extérieur")}
          name="acc_away_jersey"
          placeholder={t(
            "account.fields.away_jersey_placeholder",
            "Ex: Bleu et Noir",
          )}
          size="sm"
          value={awayJerseyColor}
          variant="bordered"
          onValueChange={(v) => {
            setAwayJerseyColor(v);
            if (errors.awayJerseyColor)
              setErrors((prev) => ({ ...prev, awayJerseyColor: "" }));
          }}
        />
      </div>
    </div>
  );
};
