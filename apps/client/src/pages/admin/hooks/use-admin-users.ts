import type {
  Auth0ManagementTokenResponse,
  Auth0User,
  Auth0Permission,
} from "@/types/auth0.types";

import { useEffect, useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { addToast } from "@heroui/toast";
import { useAuth0 } from "@auth0/auth0-react";
import {
  useSecuredApi,
  updateUserInCache,
} from "@/authentication/auth-components";
import { useUser } from "@/hooks/use-user";
import { Permission } from "@/types/permissions";

const SUPER_ADMIN_EMAIL = "yannidelattrebalcer.artois@gmail.com";
const SUPREME_MASTER_ID = "6f62d717-2136-49d7-8c51-fee07eaeebce";

export type RoleFilter = "all" | "subscribers" | "admins" | "blocked";

export function useAdminUsers() {
  const { user: currentUser, getAccessTokenSilently } = useAuth0();
  const currentUserId = (currentUser?.sub ?? "").toString().trim();
  const { t } = useTranslation("kdufoot");
  const { blockUser } = useUser();

  const {
    getAuth0ManagementToken,
    listAuth0Users,
    getD1UserMetadata,
    getUserPermissions,
    addPermissionsToUser,
    removePermissionsFromUser,
    deleteAuth0User,
    updateResourceServerScopesWithAudience,
    updateUserAppMetadata,
  } = useSecuredApi();

  const [mgmtToken, setMgmtToken] = useState<string | null>(null);
  const [tokenFromCache, setTokenFromCache] = useState<boolean>(false);
  const [users, setUsers] = useState<Auth0User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const [editing, setEditing] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUpToDate, setIsUpToDate] = useState<boolean | null>(null);

  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<{
    id: string;
    email?: string;
  } | null>(null);
  const [banReason, setBanReason] = useState("");

  const [siretData, setSiretData] = useState<{
    primary_siret: string | null;
    primary_name?: string | null;
    additional_sirets: { siret: string; name: string }[];
    block_count?: number;
    siret_change_count?: number;
  } | null>(null);
  const [newSiret, setNewSiret] = useState("");
  const [forceSiret, setForceSiret] = useState(false);
  const [siretLoading, setSiretLoading] = useState(false);
  const [adminStadiumAddress, setAdminStadiumAddress] = useState("");
  const [adminBlockCount, setAdminBlockCount] = useState<number>(0);
  const [adminSiretChangeCount, setAdminSiretChangeCount] = useState<number>(0);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const lastRequestTimestamp = useRef<number>(0);
  const lastLoadUsersCall = useRef<number>(0);

  const loadUsers = async (token: string, silent: boolean = false) => {
    const now = Date.now();

    if (now - lastLoadUsersCall.current < 2000) return;
    lastLoadUsersCall.current = now;

    if (!silent) setLoadingUsers(true);
    const requestTimestamp = Date.now();

    lastRequestTimestamp.current = requestTimestamp;

    try {
      const [u, userMetadata] = await Promise.all([
        listAuth0Users(token),
        getD1UserMetadata(true),
      ]);

      if (lastRequestTimestamp.current !== requestTimestamp) return;

      const mergedUsers = userMetadata.map((metadata) => {
        const user = (u ?? []).find(
          (a) => a.user_id === metadata.auth0_sub,
        ) || {
          user_id: metadata.auth0_sub,
          email: metadata.email,
          name: metadata.name,
          nickname: metadata.name,
          picture: "",
          email_verified: true,
          logins_count: 0,
          created_at: metadata.created_at || new Date().toISOString(),
          updated_at:
            metadata.last_login ||
            metadata.created_at ||
            new Date().toISOString(),
          last_login:
            metadata.last_login ||
            metadata.created_at ||
            new Date().toISOString(),
          app_metadata: { permissions: [] },
        };

        const isBlockedInD1 = metadata?.is_blocked === true;
        const currentPerms = user.app_metadata?.permissions || [];
        const isSuperAdmin =
          user.email === SUPER_ADMIN_EMAIL ||
          user.user_id === SUPREME_MASTER_ID;

        let updatedPerms = [...currentPerms];

        if (isSuperAdmin) {
          updatedPerms = Object.values(Permission).filter(
            (p) => p !== Permission.ROLE_BLOCKED,
          );
        } else if (
          isBlockedInD1 &&
          !currentPerms.includes(Permission.ROLE_BLOCKED)
        ) {
          updatedPerms = [...currentPerms, Permission.ROLE_BLOCKED];
        } else if (
          !isBlockedInD1 &&
          currentPerms.includes(Permission.ROLE_BLOCKED)
        ) {
          updatedPerms = currentPerms.filter(
            (p) => p !== Permission.ROLE_BLOCKED,
          );
        }

        return {
          ...user,
          blocked: isSuperAdmin ? false : isBlockedInD1,
          block_reason: isSuperAdmin ? null : metadata?.block_reason || null,
          club_name: metadata?.club_name || null,
          app_metadata: { ...user.app_metadata, permissions: updatedPerms },
        };
      });

      setUsers(mergedUsers);
    } catch (err: unknown) {
      console.error("Erreur chargement utilisateurs:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadSirets = async (userId: string) => {
    setSiretLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/users/${encodeURIComponent(userId)}/sirets`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();

      if (data.success) {
        setSiretData({
          primary_siret: data.primary_siret,
          primary_name: data.primary_name,
          additional_sirets: data.additional_sirets || [],
          block_count: data.block_count || 0,
          siret_change_count: data.siret_change_count || 0,
        });
        setAdminStadiumAddress(data.stadium_address || "");
        setAdminBlockCount(data.block_count || 0);
        setAdminSiretChangeCount(data.siret_change_count || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSiretLoading(false);
    }
  };

  const savePermissions = async (userId: string) => {
    if (!mgmtToken) return;
    setSavingUserId(userId);
    try {
      const edits = editing[userId] ?? {};
      const currentPerms: Auth0Permission[] = await getUserPermissions(
        mgmtToken,
        userId,
      );
      const audience = import.meta.env.AUTH0_AUDIENCE ?? "";
      const currentNames = currentPerms
        .filter((p) => {
          const rs = p.resource_server_identifier ?? "";

          return (
            !audience ||
            rs === audience ||
            rs.includes(audience) ||
            audience.includes(rs)
          );
        })
        .map((p) => p.permission_name);

      const toAdd: string[] = [];
      const toRemove: string[] = [];
      let handleBlockLogic = false;
      let targetBlockState = false;

      for (const permKey in edits) {
        const p = Object.values(Permission).find(
          (val) => (val as string).replace(/:/g, "_") === permKey,
        );

        if (!p) continue;

        const shouldHave = edits[permKey];
        const hasIt = currentNames.includes(p);

        if (permKey === "role_blocked") {
          const userWasBlocked = !!users.find((u) => u.user_id === userId)
            ?.blocked;

          if (shouldHave !== userWasBlocked) {
            handleBlockLogic = true;
            targetBlockState = shouldHave;
          }
          continue;
        }

        if (shouldHave && !hasIt) toAdd.push(p);
        else if (!shouldHave && hasIt) toRemove.push(p);
      }

      if (handleBlockLogic) {
        await blockUser(
          userId,
          targetBlockState,
          targetBlockState ? "Suspension administrative" : undefined,
        );
      }

      if (toAdd.length > 0)
        await addPermissionsToUser(mgmtToken, userId, toAdd);
      if (toRemove.length > 0)
        await removePermissionsFromUser(mgmtToken, userId, toRemove);

      const finalPerms = Object.entries(edits)
        .filter(([key, active]) => active && key !== "role_blocked")
        .map(([key]) =>
          Object.values(Permission).find(
            (val) => (val as string).replace(/:/g, "_") === key,
          ),
        )
        .filter(Boolean) as string[];

      await updateUserAppMetadata(mgmtToken, userId, {
        permissions: finalPerms,
      });

      addToast({
        title: t("success"),
        description: t("adminUsersPage.toasts.successUpdate"),
        variant: "solid",
      });

      setUsers((prev) =>
        prev.map((u) => {
          if (u.user_id !== userId) return u;
          let updatedPerms = [...finalPerms];
          let newBlockedState = u.blocked;

          if (handleBlockLogic) {
            newBlockedState = targetBlockState;
            if (
              targetBlockState &&
              !updatedPerms.includes(Permission.ROLE_BLOCKED)
            )
              updatedPerms.push(Permission.ROLE_BLOCKED);
            else if (!targetBlockState)
              updatedPerms = updatedPerms.filter(
                (p) => p !== Permission.ROLE_BLOCKED,
              );
          }

          return {
            ...u,
            blocked: newBlockedState,
            app_metadata: { ...u.app_metadata, permissions: updatedPerms },
          };
        }),
      );

      setSelectedUserId(null);
      setEditing((prev) => ({ ...prev, [userId]: {} }));
    } catch (err: unknown) {
      console.error(err);
      addToast({
        title: t("error.title"),
        description: t("error-updating-user"),
        variant: "solid",
      });
    } finally {
      setSavingUserId(null);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!mgmtToken || userId === currentUserId) return;
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/users/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) throw new Error("Failed to delete from D1");
      await deleteAuth0User(mgmtToken, userId);
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
      addToast({
        title: t("success"),
        description: t("adminUsersPage.toasts.successDelete"),
        variant: "solid",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const confirmBlock = async (d1UserId: string, reason: string) => {
    try {
      const finalReason = reason || "Suspension administrative";

      // UPDATE STATE IMMEDIATELY (ZERO CACHE)
      setUsers((prev) =>
        prev.map((u) => {
          if (u.user_id !== d1UserId) return u;

          return {
            ...u,
            blocked: true,
            block_reason: finalReason,
            app_metadata: {
              ...u.app_metadata,
              permissions: [
                ...(u.app_metadata?.permissions || []),
                Permission.ROLE_BLOCKED,
              ],
            },
          };
        }),
      );

      // Perform background reach-out
      await blockUser(d1UserId, true, finalReason);

      // Force cache clear for next manual refresh
      updateUserInCache(d1UserId, (u) => ({ ...u, blocked: true }));
    } catch (err: unknown) {
      addToast({
        title: t("error.title"),
        description: String(err),
        color: "danger",
      });
    }
  };

  const onUnblockUser = async (d1UserId: string) => {
    try {
      // UPDATE STATE IMMEDIATELY (ZERO CACHE)
      setUsers((prev) =>
        prev.map((u) => {
          if (u.user_id !== d1UserId) return u;

          return {
            ...u,
            blocked: false,
            block_reason: null,
            app_metadata: {
              ...u.app_metadata,
              permissions: (u.app_metadata?.permissions || []).filter(
                (p) => p !== Permission.ROLE_BLOCKED,
              ),
            },
          };
        }),
      );

      await blockUser(d1UserId, false);
      updateUserInCache(d1UserId, (u) => ({ ...u, blocked: false }));
    } catch (err: unknown) {
      addToast({
        title: t("error.title"),
        description: String(err),
        color: "danger",
      });
    }
  };

  const handleUpdateUserProfile = async () => {
    if (!selectedUserId) return;
    setIsSavingProfile(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/users/${encodeURIComponent(selectedUserId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            stadium_address: adminStadiumAddress,
            block_count: Number(adminBlockCount),
            siret_change_count: Number(adminSiretChangeCount),
          }),
        },
      );

      if (res.ok)
        addToast({
          title: t("success"),
          description: "Profil mis à jour.",
          color: "success",
        });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const syncAuth0Permissions = async () => {
    if (!mgmtToken) return;
    setIsSyncing(true);
    try {
      const audience = import.meta.env.AUTH0_AUDIENCE;
      const targetScopes = Object.values(Permission).map((val) => {
        const value = val as string;
        const key = value.replace(/:/g, "_");

        return { value, description: t(`permission.${key}`) };
      });

      await updateResourceServerScopesWithAudience(
        mgmtToken,
        audience,
        targetScopes,
      );
      setIsUpToDate(true);
      addToast({
        title: t("success"),
        description: t("adminUsersPage.toasts.syncSuccess"),
        variant: "solid",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    getAuth0ManagementToken().then(async (resp) => {
      if ("access_token" in resp) {
        const tokenResp = resp as Auth0ManagementTokenResponse;

        setMgmtToken(tokenResp.access_token);
        setTokenFromCache(tokenResp.from_cache ?? false);
        loadUsers(tokenResp.access_token);
      }
    });
  }, []);

  const getIsAdmin = (u: Auth0User) => {
    const perms = u.app_metadata?.permissions || [];
    const isMasterOrSuper =
      u.user_id === SUPREME_MASTER_ID || u.email === SUPER_ADMIN_EMAIL;

    return (
      isMasterOrSuper ||
      perms.includes("auth0:admin:api") ||
      perms.includes("auth0:superadmin") ||
      perms.some(
        (p: string) => p.startsWith("admin:") || p.startsWith("auth0:"),
      )
    );
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const hasBlockedRole =
        u.app_metadata?.permissions?.includes(Permission.ROLE_BLOCKED) ||
        u.blocked;
      const isAdmin = getIsAdmin(u);

      if (roleFilter === "all") return true;
      if (roleFilter === "blocked") return hasBlockedRole;
      if (roleFilter === "admins") return isAdmin;
      if (roleFilter === "subscribers") return !hasBlockedRole && !isAdmin;

      return true;
    });
  }, [users, roleFilter]);

  return {
    mgmtToken,
    tokenFromCache,
    users,
    loadingUsers,
    roleFilter,
    setRoleFilter,
    filteredUsers,
    editing,
    setEditing,
    selectedUserId,
    setSelectedUserId,
    modalLoading,
    setModalLoading,
    savingUserId,
    isSyncing,
    isUpToDate,
    isBanModalOpen,
    setIsBanModalOpen,
    banTarget,
    setBanTarget,
    banReason,
    setBanReason,
    siretData,
    setSiretData,
    newSiret,
    setNewSiret,
    forceSiret,
    setForceSiret,
    siretLoading,
    adminStadiumAddress,
    setAdminStadiumAddress,
    adminBlockCount,
    setAdminBlockCount,
    adminSiretChangeCount,
    setAdminSiretChangeCount,
    isSavingProfile,
    loadUsers,
    loadSirets,
    syncAuth0Permissions,
    savePermissions,
    deleteUser,
    getIsAdmin,
    confirmBlock,
    onUnblockUser,
    handleUpdateUserProfile,
    currentUserId,
    t,
    blockUser,
    updateUserInCache,
    getAccessTokenSilently,
  };
}
