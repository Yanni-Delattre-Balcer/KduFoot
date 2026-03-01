import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { AccountSettings } from "@/components/account-settings";

interface AccountModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export const AccountModal = ({ isOpen, onOpenChange }: AccountModalProps) => {
    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            backdrop="blur"
            size="md"
            scrollBehavior="inside"
            classNames={{
                base: "bg-background border border-default-100 mx-2",
                header: "border-b border-default-100",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">Mon Compte</ModalHeader>
                        <ModalBody className="py-6 overflow-y-auto">
                            <AccountSettings onSaveSuccess={() => onClose()} />
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

