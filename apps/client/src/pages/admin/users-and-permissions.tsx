import { Tabs, Tab } from "@heroui/tabs";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { addToast } from "@heroui/toast";

import DefaultLayout from "../../layouts/default";

import { useAdminUsers } from "./hooks/use-admin-users";
import { getApiUrl } from "@/config/api";
import { AdminUserTable } from "./components/admin-user-table";
import { AdminUserCard } from "./components/admin-user-card";
import { UserProfileModal } from "./components/user-profile-modal";
import { BanReasonModal } from "./components/ban-reason-modal";
import { getKdufootPermissions } from "./utils/admin-helpers";

export default function UsersAndPermissionsPage() {
  const {
    mgmtToken,
    users,
    loadingUsers,
    roleFilter,
    setRoleFilter,
    filteredUsers,
    editing,
    setEditing,
    selectedUserId,
    setSelectedUserId,
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
    siretLoading,
    newSiret,
    setNewSiret,
    forceSiret,
    setForceSiret,
    adminStadiumAddress,
    setAdminStadiumAddress,
    adminBlockCount,
    setAdminBlockCount,
    adminSiretChangeCount,
    setAdminSiretChangeCount,
    isSavingProfile,
    loadUsers,
    loadSirets,
    loadUserPermissions,
    loadingPermissions,
    syncAuth0Permissions,
    savePermissions,
    deleteUser,
    confirmBlock,
    onUnblockUser,
    handleUpdateUserProfile,
    getIsAdmin,
    currentUserId,
    t,
    getAccessTokenSilently,
  } = useAdminUsers();

  const permissions = getKdufootPermissions(t);
  const selectedUser = users.find((u) => u.user_id === selectedUserId) || null;

  const handleOpenEditing = (userId: string) => {
    setSelectedUserId(userId);
    loadSirets(userId);
    loadUserPermissions(userId);
  };

  const handleAddSiret = async (isPrimary: boolean = false) => {
    if (!selectedUserId) {
      addToast({
        title: "Erreur",
        description: "Utilisateur non sélectionné",
        color: "danger",
      });

      return;
    }
    const cleanSiret = newSiret.replace(/\s/g, "");

    if (!cleanSiret || (cleanSiret.length !== 9 && cleanSiret.length !== 14)) {
      addToast({
        title: "Erreur",
        description:
          "Veuillez entrer un SIRET (14 chiffres) ou SIREN (9 chiffres) valide.",
        color: "danger",
      });

      return;
    }
    try {
      const token = await getAccessTokenSilently();
      const endpoint = isPrimary ? "primary-siret" : "additional-sirets";
      const res = await fetch(
        getApiUrl(
          `/api/admin/users/${encodeURIComponent(selectedUserId)}/${endpoint}`,
        ),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ siret: cleanSiret, force: forceSiret }),
        },
      );

      if (res.ok) {
        setNewSiret("");
        loadSirets(selectedUserId);
        addToast({
          title: "Succès",
          description: "Le club a été ajouté avec succès.",
          color: "success",
        });
      } else {
        const errorData = await res.json().catch(() => null);

        addToast({
          title: "Erreur",
          description: errorData?.error || "Erreur serveur lors de l'ajout",
          color: "danger",
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        title: "Erreur",
        description: "Problème de connexion",
        color: "danger",
      });
    }
  };

  const handleRemoveSiret = async (siret: string) => {
    if (!selectedUserId) return;
    try {
      const token = await getAccessTokenSilently();
      const isPrimary = siretData?.primary_siret === siret;
      const endpoint = isPrimary
        ? getApiUrl(
            `/api/admin/users/${encodeURIComponent(selectedUserId)}/primary-siret`,
          )
        : getApiUrl(
            `/api/admin/users/${encodeURIComponent(selectedUserId)}/additional-sirets/${encodeURIComponent(siret)}`,
          );

      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        loadSirets(selectedUserId);
        addToast({
          title: "Succès",
          description: "Le club a été retiré.",
          color: "success",
        });
      } else {
        const errorData = await res.json().catch(() => null);

        addToast({
          title: "Erreur",
          description: errorData?.error || "Erreur lors de la suppression",
          color: "danger",
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        title: "Erreur",
        description: "Problème de connexion",
        color: "danger",
      });
    }
  };

  return (
    <DefaultLayout maxWidth="max-w-full">
      <div className="py-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase text-white mb-2">
              Dashboard <span className="text-primary-500">Admin</span>
            </h1>
            <p className="text-default-400 text-sm font-medium">
              Gestion des accès, permissions Auth0 et synchronisation D1.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="font-black tracking-widest uppercase text-xs"
              color={isUpToDate === false ? "warning" : "primary"}
              isLoading={isSyncing}
              size="sm"
              variant="shadow"
              onPress={syncAuth0Permissions}
            >
              {isUpToDate === false
                ? "⚠️ Sync Scopes Required"
                : "✓ Sync Scopes"}
            </Button>
            <Button
              className="font-black tracking-widest uppercase text-xs"
              color="secondary"
              isLoading={loadingUsers}
              size="sm"
              variant="flat"
              onPress={() => mgmtToken && loadUsers(mgmtToken)}
            >
              {t("common.refresh")}
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <Tabs
            aria-label="Role Filter"
            classNames={{
              tabList:
                "gap-6 w-full relative rounded-none p-0 border-b border-white/5",
              cursor: "w-full bg-primary-500",
              tab: "max-w-fit px-0 h-12",
              tabContent:
                "group-data-[selected=true]:text-primary-500 font-bold",
            }}
            color="primary"
            selectedKey={roleFilter}
            variant="underlined"
            onSelectionChange={(key) => setRoleFilter(key as any)}
          >
            <Tab key="all" title="Tous les utilisateurs" />
            <Tab key="subscribers" title="Abonnés" />
            <Tab key="admins" title="Administrateurs" />
            <Tab key="blocked" title="Bloqués" />
          </Tabs>
        </div>

        {loadingUsers ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Spinner color="primary" size="lg" />
            <p className="text-default-400 animate-pulse font-bold tracking-widest uppercase text-xs">
              Chargement de la base utilisateurs...
            </p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden lg:block">
              <AdminUserTable
                currentUserId={currentUserId}
                getIsAdmin={getIsAdmin}
                mgmtToken={mgmtToken}
                t={t}
                users={filteredUsers}
                onOpenEditing={handleOpenEditing}
              />
            </div>

            {/* Mobile View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
              {filteredUsers.map((u) => (
                <AdminUserCard
                  key={u.user_id}
                  getIsAdmin={getIsAdmin}
                  t={t}
                  u={u}
                  onOpenEditing={handleOpenEditing}
                />
              ))}
            </div>
          </>
        )}

        {/* Modals */}
        <UserProfileModal
          adminBlockCount={adminBlockCount}
          adminSiretChangeCount={adminSiretChangeCount}
          adminStadiumAddress={adminStadiumAddress}
          currentUserId={currentUserId}
          editing={editing}
          forceSiret={forceSiret}
          isOpen={!!selectedUserId}
          isSavingProfile={isSavingProfile}
          loadingPermissions={loadingPermissions}
          mgmtToken={mgmtToken}
          newSiret={newSiret}
          permissions={permissions}
          savingUserId={savingUserId}
          setAdminBlockCount={setAdminBlockCount}
          setAdminSiretChangeCount={setAdminSiretChangeCount}
          setAdminStadiumAddress={setAdminStadiumAddress}
          setForceSiret={setForceSiret}
          setNewSiret={setNewSiret}
          siretData={siretData}
          siretLoading={siretLoading}
          t={t}
          user={selectedUser}
          onAddSiret={handleAddSiret}
          onBlockUser={(id, email) => {
            setBanTarget({ id, email });
            setIsBanModalOpen(true);
          }}
          onClose={() => setSelectedUserId(null)}
          onDeleteUser={deleteUser}
          onPermissionChange={(uid, pk, sel) =>
            setEditing((prev) => ({
              ...prev,
              [uid]: { ...(prev[uid] || {}), [pk]: sel },
            }))
          }
          onRemoveSiret={handleRemoveSiret}
          onSavePermissions={savePermissions}
          onUnblockUser={(id) => onUnblockUser(id)}
          onUpdateProfile={handleUpdateUserProfile}
        />

        <BanReasonModal
          banReason={banReason}
          isOpen={isBanModalOpen}
          setBanReason={setBanReason}
          targetEmail={banTarget?.email}
          onClose={() => setIsBanModalOpen(false)}
          onConfirm={(reason) => {
            if (banTarget) confirmBlock(banTarget.id, reason);
            setIsBanModalOpen(false);
            setBanReason("");
          }}
        />
      </div>
    </DefaultLayout>
  );
}
