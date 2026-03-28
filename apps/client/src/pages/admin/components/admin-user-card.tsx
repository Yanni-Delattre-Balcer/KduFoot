import { Card } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Auth0User } from "@/types/auth0.types";
import { Permission } from "@/types/permissions";
import { SUPER_ADMIN_EMAIL, SUPREME_MASTER_ID } from "../utils/admin-helpers";

interface AdminUserCardProps {
  u: Auth0User;
  onOpenEditing: (userId: string) => void;
  getIsAdmin: (u: Auth0User) => boolean;
  t: any;
}

export const AdminUserCard = ({
  u,
  onOpenEditing,
  getIsAdmin,
  t,
}: AdminUserCardProps) => {
  const isUserBlocked =
    u.app_metadata?.permissions?.includes(Permission.ROLE_BLOCKED) || u.blocked;
  const isSupremeMaster = u.user_id === SUPREME_MASTER_ID;
  const isSuperAdmin = u.email === SUPER_ADMIN_EMAIL || isSupremeMaster;

  return (
    <Card
      key={u.user_id}
      className={`bg-zinc-900 border border-white/10 p-4 ${isUserBlocked ? "border-l-4 border-l-red-600 bg-red-950/20" : ""}`}
    >
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          {u.picture && (
            <img
              alt={u.name}
              className={`w-12 h-12 rounded-full border-2 border-white/5 shrink-0 ${isUserBlocked ? "opacity-40 grayscale" : ""}`}
              referrerPolicy="no-referrer"
              src={u.picture}
            />
          )}
          <div className="min-w-0 flex-1">
            <p
              className={`font-black text-base truncate ${isUserBlocked ? "text-red-400 line-through" : "text-white"}`}
            >
              {u.name || u.nickname}
            </p>
            <p className="text-xs text-default-400 truncate">{u.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1">
          {isSuperAdmin && (
            <Chip
              className="h-5 text-[10px] font-bold px-2"
              color="success"
              size="sm"
              variant="solid"
            >
              Creator
            </Chip>
          )}
          {!isSuperAdmin && getIsAdmin(u) && (
            <Chip
              className="h-5 text-[10px] font-bold px-2"
              color="primary"
              size="sm"
              variant="solid"
            >
              Admin
            </Chip>
          )}
          {isUserBlocked && (
            <Chip
              className="h-5 text-[10px] font-black"
              color="danger"
              size="sm"
              variant="solid"
            >
              🚫 {t("adminUsersPage.statusBanned")}
            </Chip>
          )}
          {u.club_name && !isSuperAdmin && (
            <Chip
              className="h-5 text-[10px] font-bold max-w-full truncate"
              color="success"
              size="sm"
              variant="flat"
            >
              🏠 {u.club_name}
            </Chip>
          )}
        </div>
      </div>

      <Button
        className="w-full font-black tracking-widest uppercase text-xs"
        color="primary"
        size="sm"
        variant="flat"
        onPress={() => onOpenEditing(u.user_id)}
      >
        {t("adminUsersPage.btnViewProfile")}
      </Button>
    </Card>
  );
};
