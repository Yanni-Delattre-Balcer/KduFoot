import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Permission } from "@/types/permissions";
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
  t: any;
}

export const PermissionSection = ({
  userId,
  permissions,
  editing,
  onPermissionChange,
  userPermissions,
  t,
}: PermissionSectionProps) => {
  const applyPreset = (role: "free" | "premium" | "admin" | "super") => {
    let targetPerms: string[] = [];

    if (role === "free") {
      targetPerms = [Permission.READ_API, Permission.MATCHES_CONTACT];
    } else if (role === "premium") {
      targetPerms = [
        Permission.READ_API,
        Permission.WRITE_API,
        Permission.EXERCISES_READ,
        Permission.EXERCISES_CREATE,
        Permission.SESSIONS_CREATE,
        Permission.MATCHES_PREMIUM,
        Permission.EXPORT_PDF,
        Permission.MATCHES_CONTACT,
      ];
    } else if (role === "admin") {
      targetPerms = [
        Permission.READ_API,
        Permission.WRITE_API,
        Permission.EXERCISES_READ,
        Permission.EXERCISES_CREATE,
        Permission.SESSIONS_CREATE,
        Permission.MATCHES_PREMIUM,
        Permission.EXPORT_PDF,
        Permission.MATCHES_CONTACT,
        Permission.ADMIN_USERS,
        Permission.ADMIN_EXERCISES,
        Permission.ADMIN_MATCHES,
        Permission.ADMIN_ANALYTICS,
        Permission.ADMIN_BILLING,
        Permission.ADMIN_AUTH0,
      ];
    } else if (role === "super") {
      targetPerms = Object.values(Permission).filter(
        (p) => p !== Permission.ROLE_BLOCKED,
      );
    }

    // Reset current edits and apply preset
    permissions.forEach((p) => {
      onPermissionChange(
        userId,
        p.key,
        targetPerms.includes(p.value as Permission),
      );
    });
  };

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
      {/* Attribution Rapide */}
      <div className="bg-zinc-900 p-4 rounded-xl border border-white/10 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-default-400">
          {t("adminUsersPage.quickAssignLabel")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="flat" onPress={() => applyPreset("free")}>
            {t("adminUsersPage.roleFree")}
          </Button>
          <Button
            color="primary"
            size="sm"
            variant="flat"
            onPress={() => applyPreset("premium")}
          >
            {t("adminUsersPage.rolePremium")}
          </Button>
          <Button
            color="secondary"
            size="sm"
            variant="flat"
            onPress={() => applyPreset("admin")}
          >
            {t("adminUsersPage.roleAdmin")}
          </Button>
          <Button
            className="font-bold"
            color="warning"
            size="sm"
            variant="solid"
            onPress={() => applyPreset("super")}
          >
            {t("adminUsersPage.roleSuperAdmin")}
          </Button>
        </div>
      </div>

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
