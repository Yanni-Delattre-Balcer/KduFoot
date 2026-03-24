import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { useAsyncList } from "@react-stately/data";
import { Key } from "@react-types/shared";
import { useTranslation } from "react-i18next";

import { Club } from "@/types/match.types";
import { clubService } from "@/services/clubs";

interface ClubSearchProps {
  onSelect: (club: Club | null) => void;
  label?: string;
  placeholder?: string;
  initialInputValue?: string;
}

export default function ClubSearch({
  onSelect,
  label,
  placeholder,
  initialInputValue = "",
}: ClubSearchProps) {
  const { t } = useTranslation();

  let list = useAsyncList<Club>({
    async load({ filterText }) {
      const query = filterText;

      // Wait for at least 3 chars
      if (!query || query.length < 3) {
        return { items: [] };
      }

      try {
        const items = await clubService.search(query);

        return { items };
      } catch {
        return { items: [] };
      }
    },
  });

  return (
    <Autocomplete
      defaultInputValue={initialInputValue}
      inputValue={list.filterText}
      isLoading={list.isLoading}
      items={list.items}
      label={label || t("club_search.label")}
      placeholder={placeholder || t("club_search.placeholder")}
      variant="bordered"
      onInputChange={list.setFilterText}
      onSelectionChange={(key: Key | null) => {
        const selectedClub = list.items.find((item) => item.id === key) || null;

        onSelect(selectedClub);
      }}
    >
      {(item: Club) => (
        <AutocompleteItem key={item.id} textValue={item.name}>
          <div className="flex flex-col">
            <span className="text-small">{item.name}</span>
            <span className="text-tiny text-default-400">
              {item.city} ({item.zip})
            </span>
          </div>
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
}
