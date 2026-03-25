import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Auth0User } from "@/types/auth0.types";
import { Permission } from "@/types/permissions";
import { SUPER_ADMIN_EMAIL, SUPREME_MASTER_ID } from "../utils/admin-helpers";

interface AdminUserTableProps {
  users: Auth0User[];
  mgmtToken: string | null;
  currentUserId: string;
  t: any;
  getIsAdmin: (u: Auth0User) => boolean;
  onOpenEditing: (userId: string) => void;
}

export const AdminUserTable = ({
  users,
  mgmtToken,
  currentUserId,
  t,
  getIsAdmin,
  onOpenEditing,
}: AdminUserTableProps) => {
  return (
    <Table
      isHeaderSticky
      aria-label={t("adminUsersPage.pageTitle")}
      classNames={{
        base: "max-h-[700px] overflow-x-auto",
        table: "min-w-[800px]",
      }}
    >
      <TableHeader>
        <TableColumn>{t("adminUsersPage.colUser")}</TableColumn>
        <TableColumn>{t("adminUsersPage.colEmail")}</TableColumn>
        <TableColumn>Club</TableColumn>
        <TableColumn>{t("adminUsersPage.colRole")}</TableColumn>
        <TableColumn>{t("adminUsersPage.colSubscription")}</TableColumn>
        <TableColumn>{t("adminUsersPage.colLogins")}</TableColumn>
        <TableColumn>{t("adminUsersPage.colActions")}</TableColumn>
      </TableHeader>
      <TableBody emptyContent={t("adminUsersPage.emptyUsers")}>
        {users.map((u) => {
          const isSupremeMaster = u.user_id === SUPREME_MASTER_ID;
          const isUserBlocked =
            u.app_metadata?.permissions?.includes(Permission.ROLE_BLOCKED) ||
            u.blocked;
          const isSuperAdmin = u.email === SUPER_ADMIN_EMAIL || isSupremeMaster;

          return (
            <TableRow
              key={u.user_id}
              className={
                isUserBlocked ? "bg-red-950/30 border-l-4 border-l-red-600" : ""
              }
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  {u.picture && (
                    <img
                      alt={u.name}
                      className={`w-8 h-8 rounded-full ${isUserBlocked ? "opacity-40 grayscale" : ""}`}
                      referrerPolicy="no-referrer"
                      src={u.picture}
                    />
                  )}
                  <div>
                    <p
                      className={`font-medium text-sm ${isUserBlocked ? "text-red-400 line-through" : ""}`}
                    >
                      {u.name || u.nickname}
                    </p>
                    <p className="text-xs text-default-400">{u.user_id}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-sm ${isUserBlocked ? "text-red-400" : ""}`}
                  >
                    {u.email}
                  </span>
                  {u.email_verified && (
                    <span className="text-success-500 text-xs">✓</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {u.club_name && !isSupremeMaster ? (
                  <Chip
                    className="h-5 text-[10px] sm:text-xs font-bold max-w-[100px] lg:max-w-[200px] truncate"
                    color="success"
                    size="sm"
                    title={u.club_name}
                    variant="flat"
                  >
                    🏠 {u.club_name}
                  </Chip>
                ) : (
                  <span className="text-[10px] text-default-400 italic">
                    Non lié
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {isSuperAdmin && (
                    <Chip
                      className="h-5 text-xs font-bold px-2"
                      color="success"
                      size="sm"
                      variant="solid"
                    >
                      Creator
                    </Chip>
                  )}
                  {!isSuperAdmin && getIsAdmin(u) && (
                    <Chip
                      className="h-5 text-xs"
                      color="primary"
                      size="sm"
                      variant="solid"
                    >
                      Admin
                    </Chip>
                  )}
                  {isUserBlocked && (
                    <Chip
                      className="h-5 text-xs font-black animate-pulse"
                      color="danger"
                      size="sm"
                      variant="solid"
                    >
                      🚫 Banni
                    </Chip>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Chip
                  color={
                    u.app_metadata?.subscription === "Ultime"
                      ? "warning"
                      : u.app_metadata?.subscription === "Pro"
                        ? "primary"
                        : "default"
                  }
                  size="sm"
                  variant="flat"
                >
                  {u.app_metadata?.subscription || "Free"}
                </Chip>
              </TableCell>
              <TableCell>
                <span className="text-sm">{u.logins_count ?? 0}</span>
              </TableCell>
              <TableCell>
                <div className="flex justify-center w-full">
                  <Button
                    className="font-bold px-6"
                    color="primary"
                    isDisabled={
                      !mgmtToken ||
                      (isSuperAdmin && u.user_id !== currentUserId)
                    }
                    size="sm"
                    variant="solid"
                    onPress={() => onOpenEditing(u.user_id)}
                  >
                    {t("adminUsersPage.btnViewProfile")}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
