import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { useTranslation } from "react-i18next";

interface DetailsModalsProps {
  match: any;
  isCancelOpen: boolean;
  onCancelOpenChange: () => void;
  isCancelling: boolean;
  handleCancelRequest: () => Promise<void>;
  isDeleteOpen: boolean;
  onDeleteOpenChange: () => void;
  isDeleting: boolean;
  handleDelete: () => Promise<void>;
  isAdminDeleteOpen: boolean;
  onAdminDeleteOpenChange: () => void;
  isAdminDeleting: boolean;
  handleAdminDelete: () => Promise<void>;
  isBlockOpen: boolean;
  onBlockOpenChange: () => void;
  isBlocking: boolean;
  handleBlockUser: () => Promise<void>;
  blockReason: string;
  setBlockReason: (v: string) => void;
  isCloseRegOpen: boolean;
  onCloseRegOpenChange: () => void;
  handleCloseRegistrations: () => Promise<void>;
  isCancelAcceptedOpen: boolean;
  onCancelAcceptedOpenChange: () => void;
  isLoadingCancelAccepted: boolean;
  handleCancelAccepted: () => Promise<void>;
}

export const DetailsModals = ({
  match,
  isCancelOpen,
  onCancelOpenChange,
  isCancelling,
  handleCancelRequest,
  isDeleteOpen,
  onDeleteOpenChange,
  isDeleting,
  handleDelete,
  isAdminDeleteOpen,
  onAdminDeleteOpenChange,
  isAdminDeleting,
  handleAdminDelete,
  isBlockOpen,
  onBlockOpenChange,
  isBlocking,
  handleBlockUser,
  blockReason,
  setBlockReason,
  isCloseRegOpen,
  onCloseRegOpenChange,
  handleCloseRegistrations,
  isCancelAcceptedOpen,
  onCancelAcceptedOpenChange,
  isLoadingCancelAccepted,
  handleCancelAccepted,
}: DetailsModalsProps) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Cancel Request Confirmation Modal */}
      <Modal
        backdrop="blur"
        isOpen={isCancelOpen}
        onOpenChange={onCancelOpenChange}
      >
        <ModalContent className="bg-[#1a1a1c] border border-white/10">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-white font-black tracking-tighter p-4 sm:p-6">
                {t("details.modal.withdraw_title")}
              </ModalHeader>
              <ModalBody className="p-4 pt-2 sm:p-6 sm:pt-2">
                <p className="text-default-400 font-medium">
                  {t("details.modal.withdraw_desc")}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button className="font-bold" variant="light" onPress={onClose}>
                  {t("cancel")}
                </Button>
                <Button
                  autoFocus
                  className="font-black tracking-tighter shadow-lg shadow-danger/20"
                  color="danger"
                  isLoading={isCancelling}
                  onPress={handleCancelRequest}
                >
                  {t("details.modal.withdraw_confirm")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        backdrop="blur"
        isOpen={isDeleteOpen}
        onOpenChange={onDeleteOpenChange}
      >
        <ModalContent className="bg-[#1a1a1c] border border-white/10">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-red-500 font-black tracking-tighter p-4 sm:p-6">
                {t("details.admin.delete_ad")}
              </ModalHeader>
              <ModalBody className="p-4 pt-2 sm:p-6 sm:pt-2">
                <p className="text-default-400 font-medium">
                  {match.type === "tournament"
                    ? t(
                        "match.confirm_delete_tournament",
                        "Es-tu sûr de vouloir supprimer ce tournoi ?",
                      )
                    : t(
                        "match.confirm_delete_match",
                        "Es-tu sûr de vouloir supprimer ce match ?",
                      )}{" "}
                  {t(
                    "details.modal.irreversible",
                    "Cette action est irréversible.",
                  )}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button className="font-bold" variant="light" onPress={onClose}>
                  {t("cancel")}
                </Button>
                <Button
                  autoFocus
                  className="font-black tracking-tighter shadow-lg shadow-danger/20"
                  color="danger"
                  isLoading={isDeleting}
                  onPress={handleDelete}
                >
                  {t("details.modal.delete_confirm")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Admin Delete Confirmation Modal */}
      <Modal
        backdrop="blur"
        isOpen={isAdminDeleteOpen}
        onOpenChange={onAdminDeleteOpenChange}
      >
        <ModalContent className="bg-[#1a1a1c] border border-white/10">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-white font-black tracking-tighter">
                {t("details.admin.moderation_tools")}
              </ModalHeader>
              <ModalBody>
                <p className="text-default-400 font-medium italic">
                  {t(
                    "details.modal.admin_delete_desc",
                    "⚠️ Attention : En tant qu'administrateur, vous allez supprimer cette annonce. L'action est définitive.",
                  )}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button className="font-bold" variant="light" onPress={onClose}>
                  {t("cancel")}
                </Button>
                <Button
                  autoFocus
                  className="font-black tracking-tighter shadow-lg shadow-danger/20"
                  color="danger"
                  isLoading={isAdminDeleting}
                  onPress={handleAdminDelete}
                >
                  {t("details.modal.admin_delete_confirm")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Block Confirmation Modal */}
      <Modal
        backdrop="blur"
        isOpen={isBlockOpen}
        onOpenChange={onBlockOpenChange}
      >
        <ModalContent className="bg-[#1a1a1c] border border-white/10">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-white font-black tracking-tighter">
                {t("details.admin.block_user")}
              </ModalHeader>
              <ModalBody>
                <p className="text-default-400 font-medium mb-2">
                  {t("details.modal.block_desc")}
                </p>
                <Textarea
                  isRequired
                  className="mt-2"
                  label={t("details.modal.block_reason_label")}
                  placeholder={t(
                    "details.modal.block_reason_placeholder",
                    "Saisissez la raison du blocage (ex: Comportement inapproprié, multiples désistements...)",
                  )}
                  value={blockReason}
                  variant="bordered"
                  onValueChange={setBlockReason}
                />
              </ModalBody>
              <ModalFooter>
                <Button className="font-bold" variant="light" onPress={onClose}>
                  {t("cancel")}
                </Button>
                <Button
                  autoFocus
                  className="font-black tracking-tighter shadow-lg shadow-danger/20"
                  color="danger"
                  isLoading={isBlocking}
                  onPress={async () => {
                    await handleBlockUser();
                    onClose();
                  }}
                >
                  {t("details.modal.block_confirm")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Close Registrations Modal */}
      <Modal
        backdrop="blur"
        isOpen={isCloseRegOpen}
        onOpenChange={onCloseRegOpenChange}
      >
        <ModalContent className="bg-[#1a1a1c] border border-white/10">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-white font-black tracking-tighter">
                {t("details.labels.registrations")}
              </ModalHeader>
              <ModalBody>
                <p className="text-default-400 font-medium">
                  {t("details.modal.close_registrations_desc")}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button className="font-bold" variant="light" onPress={onClose}>
                  {t("cancel")}
                </Button>
                <Button
                  className="font-black tracking-tighter shadow-lg shadow-success/20"
                  color="success"
                  onPress={async () => {
                    await handleCloseRegistrations();
                    onClose();
                  }}
                >
                  {t("details.modal.close_confirm", "Fermer les inscriptions")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Cancel Accepted Modal */}
      <Modal
        backdrop="blur"
        isOpen={isCancelAcceptedOpen}
        onOpenChange={onCancelAcceptedOpenChange}
      >
        <ModalContent className="bg-[#1a1a1c] border border-white/10">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-white font-black tracking-tighter">
                {match.type === "tournament"
                  ? t("details.buttons.cancel_tournament")
                  : t("details.buttons.cancel_duel")}
              </ModalHeader>
              <ModalBody>
                <p className="text-default-400 font-medium">
                  {match.type === "tournament"
                    ? t(
                        "details.modal.cancel_tournament_desc",
                        "Attention : En annulant, toutes les équipes acceptées seront notifiées de l'annulation du tournoi.",
                      )
                    : t(
                        "details.modal.cancel_duel_desc",
                        "Attention : En annulant, l'équipe acceptée sera notifiée de l'annulation du match.",
                      )}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button className="font-bold" variant="light" onPress={onClose}>
                  {t("cancel")}
                </Button>
                <Button
                  className="font-black tracking-tighter shadow-lg shadow-danger/20"
                  color="danger"
                  isLoading={isLoadingCancelAccepted}
                  onPress={async () => {
                    await handleCancelAccepted();
                    onClose();
                  }}
                >
                  {t(
                    "details.modal.confirm_cancel_action",
                    "Confirmer l'annulation",
                  )}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
