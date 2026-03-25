import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

interface BanReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  banReason: string;
  setBanReason: (v: string) => void;
  targetEmail?: string;
}

export const BanReasonModal = ({
  isOpen,
  onClose,
  onConfirm,
  banReason,
  setBanReason,
  targetEmail,
}: BanReasonModalProps) => {
  return (
    <Modal isOpen={isOpen} size="md" onOpenChange={onClose}>
      <ModalContent className="bg-zinc-950 text-white border border-white/10">
        <ModalHeader className="flex flex-col gap-1 py-6">
          <h2 className="text-xl font-black uppercase tracking-tighter text-red-500">
            Confirmer le Bannissement
          </h2>
          {targetEmail && (
            <p className="text-xs text-default-400">{targetEmail}</p>
          )}
        </ModalHeader>
        <ModalBody className="py-6">
          <Input
            autoFocus
            label="Motif du bannissement"
            placeholder="Ex: Violation des conditions d'utilisation..."
            value={banReason}
            variant="bordered"
            onValueChange={setBanReason}
          />
          <p className="text-[10px] text-default-500 italic mt-2">
            Ce motif sera enregistré dans la base de données D1 et l'utilisateur
            perdra instantanément l'accès au système.
          </p>
        </ModalBody>
        <ModalFooter className="border-t border-white/5 bg-zinc-900/40">
          <Button className="font-bold" variant="light" onPress={onClose}>
            Annuler
          </Button>
          <Button
            className="font-black"
            color="danger"
            onPress={() => onConfirm(banReason)}
          >
            Bannir Définitivement
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
