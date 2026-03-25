import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { groupColor } from "../utils/admin-helpers";

interface PermissionSectionProps {
  userId: string;
  permissions: {
    key: string;
    label: string;
    value: string;
    group: string;
    groupLabel: string;
  }[];
  editing: Record<string, Record<string, boolean>>;
  onPermissionChange: (
    userId: string,
    permKey: string,
    isSelected: boolean,
  ) => void;
  userPermissions: string[];
}

export const PermissionSection = ({
  userId,
  permissions,
  editing,
  onPermissionChange,
  userPermissions,
}: PermissionSectionProps) => {
  // Grouper les permissions
  const groups = permissions.reduce(
    (acc, p) => {
      if (!acc[p.group]) acc[p.group] = { label: p.groupLabel, items: [] };
      acc[p.group].items.push(p);

      return acc;
    },
    {} as Record<string, { label: string; items: any[] }>,
  );

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([groupKey, group]) => (
        <div
          key={groupKey}
          className="bg-zinc-800/30 p-4 rounded-xl border border-white/5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Chip
              className="border-none"
              color={groupColor(groupKey)}
              size="sm"
              variant="dot"
            >
              <span className="font-black uppercase tracking-tighter text-xs">
                {group.label}
              </span>
            </Chip>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {group.items.map((p) => {
              const isEdited =
                editing[userId] && editing[userId][p.key] !== undefined;
              const isSelected = isEdited
                ? editing[userId][p.key]
                : userPermissions.includes(p.value);

              return (
                <Checkbox
                  key={p.key}
                  classNames={{
                    label: `text-xs font-medium ${isEdited ? "text-primary-400 font-bold" : "text-default-500"}`,
                    base: `max-w-full p-2 rounded-lg hover:bg-white/5 transition-colors ${isEdited ? "bg-primary-500/10 border border-primary-500/20" : ""}`,
                  }}
                  color={groupColor(groupKey)}
                  isSelected={isSelected}
                  size="sm"
                  onValueChange={(val) =>
                    onPermissionChange(userId, p.key, val)
                  }
                >
                  {p.label}
                </Checkbox>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
