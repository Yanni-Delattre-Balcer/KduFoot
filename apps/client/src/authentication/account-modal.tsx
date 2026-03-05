import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { AccountSettings } from "@/components/account-settings";
import { useUser } from "@/hooks/use-user";
import { isProfileComplete } from "@/utils/profile";
import { useWelcomeGateway } from "@/contexts/welcome-gateway-context";
import { useMemo } from "react";

interface AccountModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export const AccountModal = ({ isOpen, onOpenChange }: AccountModalProps) => {
    const { user } = useUser();
    const { isVisitor } = useWelcomeGateway();

    const isLocked = useMemo(() => {
        if (!user || isVisitor) return false;
        return !isProfileComplete(user);
    }, [user, isVisitor]);

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            backdrop="blur"
            size="2xl"
            scrollBehavior="inside"
            classNames={{
                base: "bg-background border border-default-100 mx-2",
                header: "border-b border-default-100",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span>Mon Compte</span>
                                {isLocked && (
                                    <span className="text-xs sm:text-sm bg-danger/10 text-danger px-2 py-0.5 rounded-full animate-pulse border border-danger/20 font-black uppercase">
                                        Configuration Requise
                                    </span>
                                )}
                            </div>
                        </ModalHeader>
                        <ModalBody className="py-6 overflow-y-auto">
                            <AccountSettings onSaveSuccess={() => {
                                if (!isLocked) onClose();
                            }} />
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

