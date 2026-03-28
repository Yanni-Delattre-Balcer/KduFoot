import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Auth0User } from "@/types/auth0.types";
import { SiretSection } from "./siret-section";
import { PermissionSection } from "./permission-section";
import { SecuritySection } from "./security-section";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Auth0User | null;
  mgmtToken: string | null;
  currentUserId: string;
  t: any;
  permissions: any[];
  editing: any;
  onPermissionChange: (userId: string, key: string, val: boolean) => void;
  onSavePermissions: (userId: string) => void;
  savingUserId: string | null;

  // SIRET
  siretLoading: boolean;
  siretData: any;
  newSiret: string;
  setNewSiret: (v: string) => void;
  forceSiret: boolean;
  setForceSiret: (v: boolean) => void;
  onAddSiret: () => void;
  onRemoveSiret: (s: string) => void;

  // Profile metadata
  adminStadiumAddress: string;
  setAdminStadiumAddress: (v: string) => void;
  adminBlockCount: number;
  setAdminBlockCount: (v: number) => void;
  adminSiretChangeCount: number;
  setAdminSiretChangeCount: (v: number) => void;
  isSavingProfile: boolean;
  onUpdateProfile: () => void;

  // Security
  onDeleteUser: (id: string) => void;
  onBlockUser: (id: string, email?: string) => void;
  onUnblockUser: (id: string) => void;
}

export const UserProfileModal = ({
  isOpen,
  onClose,
  user,
  mgmtToken,
  currentUserId,
  t,
  permissions,
  editing,
  onPermissionChange,
  onSavePermissions,
  savingUserId,
  siretLoading,
  siretData,
  newSiret,
  setNewSiret,
  forceSiret,
  setForceSiret,
  onAddSiret,
  onRemoveSiret,
  adminStadiumAddress,
  setAdminStadiumAddress,
  adminBlockCount,
  setAdminBlockCount,
  adminSiretChangeCount,
  setAdminSiretChangeCount,
  isSavingProfile,
  onUpdateProfile,
  onDeleteUser,
  onBlockUser,
  onUnblockUser,
}: UserProfileModalProps) => {
  if (!user) return null;

  return (
    <Modal
      backdrop="blur"
      className="bg-zinc-950 text-white border border-white/10"
      isOpen={isOpen}
      scrollBehavior="inside"
      size="5xl"
      onOpenChange={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 border-b border-white/5 py-6">
          <div className="flex items-center gap-4">
            {user.picture && (
              <img
                alt={user.name}
                className="w-12 h-12 rounded-full ring-2 ring-primary-500/30"
                referrerPolicy="no-referrer"
                src={user.picture}
              />
            )}
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase">
                {user.name || user.nickname}
              </h2>
              <p className="text-xs text-default-400 font-mono">
                {user.user_id}
              </p>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="py-8 space-y-10">
          {/* Metadata Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary-400">
              Métadonnées Profil (D1)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Adresse Stade"
                size="sm"
                value={adminStadiumAddress}
                onValueChange={setAdminStadiumAddress}
              />
              <Input
                label="Compteur Bloquages"
                size="sm"
                type="number"
                value={String(adminBlockCount)}
                onValueChange={(v) => setAdminBlockCount(Number(v))}
              />
              <Input
                label="Changements SIRET"
                size="sm"
                type="number"
                value={String(adminSiretChangeCount)}
                onValueChange={(v) => setAdminSiretChangeCount(Number(v))}
              />
            </div>
            <Button
              className="font-bold"
              color="primary"
              isLoading={isSavingProfile}
              size="sm"
              onPress={onUpdateProfile}
            >
              Mettre à jour les compteurs
            </Button>
          </section>

          {/* SIRET Section */}
          <SiretSection
            forceSiret={forceSiret}
            newSiret={newSiret}
            setForceSiret={setForceSiret}
            setNewSiret={setNewSiret}
            siretData={siretData}
            siretLoading={siretLoading}
            t={t}
            onAddSiret={onAddSiret}
            onRemoveSiret={onRemoveSiret}
          />

          {/* Permissions Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-warning-400">
                Permissions Auth0
              </h3>
              <Button
                className="font-bold"
                color="primary"
                isDisabled={!mgmtToken}
                isLoading={savingUserId === user.user_id}
                size="sm"
                onPress={() => onSavePermissions(user.user_id)}
              >
                Enregistrer les Permissions
              </Button>
            </div>
            <PermissionSection
              editing={editing}
              permissions={permissions}
              t={t}
              userId={user.user_id}
              userPermissions={user.app_metadata?.permissions || []}
              onPermissionChange={onPermissionChange}
            />
          </section>

          {/* Security Section */}
          <SecuritySection
            currentUserId={currentUserId}
            t={t}
            u={user}
            onBlock={onBlockUser}
            onDelete={onDeleteUser}
            onUnblock={onUnblockUser}
          />
        </ModalBody>

        <ModalFooter className="border-t border-white/5 bg-zinc-900/50">
          <Button
            className="font-bold"
            color="danger"
            variant="light"
            onPress={onClose}
          >
            {t("common.close")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
