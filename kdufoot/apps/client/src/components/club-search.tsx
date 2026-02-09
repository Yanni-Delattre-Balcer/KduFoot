
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { useAsyncList } from "@react-stately/data";
import { Club } from "@/types/match.types";
import { clubService } from "@/services/clubs";
import { Key } from "@react-types/shared";

interface ClubSearchProps {
    onSelect: (club: Club | null) => void;
    label?: string;
    placeholder?: string;
    initialInputValue?: string;
}

export default function ClubSearch({ onSelect, label = "Club", placeholder = "Rechercher un club...", initialInputValue = "" }: ClubSearchProps) {

    // Use useAsyncList for handling async search
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
            } catch (e) {
                return { items: [] };
            }
        },
    });

    return (
        <Autocomplete
            label={label}
            placeholder={placeholder}
            variant="bordered"
            defaultInputValue={initialInputValue}
            inputValue={list.filterText}
            isLoading={list.isLoading}
            items={list.items}
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
                        <span className="text-tiny text-default-400">{item.city} ({item.zip})</span>
                    </div>
                </AutocompleteItem>
            )}
        </Autocomplete>
    );
}
