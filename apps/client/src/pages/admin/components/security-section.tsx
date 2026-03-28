import { Button } from "@heroui/button";
import { Auth0User } from "@/types/auth0.types";
import { SUPER_ADMIN_EMAIL, SUPREME_MASTER_ID } from "../utils/admin-helpers";

interface SecuritySectionProps {
  u: Auth0User;
  currentUserId: string;
  onDelete: (userId: string) => void;
  onBlock: (userId: string, email?: string) => void;
  onUnblock: (userId: string) => void;
  t: any;
}

export const SecuritySection = ({
  u,
  currentUserId,
  onDelete,
  onBlock,
  onUnblock,
  t,
}: SecuritySectionProps) => {
  const isSuperAdmin =
    u.email === SUPER_ADMIN_EMAIL || u.user_id === SUPREME_MASTER_ID;
  const isSelf = u.user_id === currentUserId;
  const isBlocked =
    u.blocked || u.app_metadata?.permissions?.includes("role:blocked");

  return (
    <div className="bg-red-950/10 p-4 rounded-xl border border-red-500/20 space-y-4">
      <h3 className="text-sm font-black uppercase tracking-widest text-red-500">
        Actions de Sécurité
      </h3>

      <div className="flex flex-wrap gap-4">
        {!isSuperAdmin && (
          <>
            {isBlocked ? (
              <Button
                className="font-bold h-9"
                color="success"
                size="sm"
                variant="flat"
                onPress={() => onUnblock(u.user_id)}
              >
                🔓 {t("adminUsersPage.btnUnblock")}
              </Button>
            ) : (
              <Button
                className="font-bold h-9"
                color="danger"
                size="sm"
                variant="flat"
                onPress={() => onBlock(u.user_id, u.email)}
              >
                🚫 {t("adminUsersPage.btnBlock")}
              </Button>
            )}
          </>
        )}

        <Button
          className="font-black h-9 bg-red-600 shadow-lg shadow-red-900/40"
          color="danger"
          isDisabled={isSuperAdmin || isSelf}
          size="sm"
          variant="solid"
          onPress={() => onDelete(u.user_id)}
        >
          🗑️ {t("adminUsersPage.btnDelete")}
        </Button>
      </div>

      {(isSuperAdmin || isSelf) && (
        <p className="text-[10px] text-default-400 italic">
          Protections système actives : impossible de supprimer ou bannir ce
          compte.
        </p>
      )}
    </div>
  );
};
