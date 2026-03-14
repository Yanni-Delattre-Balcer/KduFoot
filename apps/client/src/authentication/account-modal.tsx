import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

import { AccountSettings } from "@/components/account-settings";
import { useUser } from "@/hooks/use-user";
import { isProfileComplete } from "@/utils/profile";
import { useWelcomeGateway } from "@/contexts/welcome-gateway-context";

interface AccountModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const AccountModal = ({ isOpen, onOpenChange }: AccountModalProps) => {
  const { t } = useTranslation();
  const { user } = useUser();
  const { isVisitor } = useWelcomeGateway();

  const isLocked = useMemo(() => {
    if (!user || isVisitor) return false;

    return !isProfileComplete(user);
  }, [user, isVisitor]);

  return (
    <Modal
      backdrop="blur"
      classNames={{
        base: "bg-background border border-default-100 mx-2",
        header: "border-b border-default-100",
      }}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="2xl"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span>{t("auth.account")}</span>
                {isLocked && (
                  <span className="text-xs sm:text-sm bg-danger/10 text-danger px-2 py-0.5 rounded-full animate-pulse border border-danger/20 font-black">
                    {t("account.errors.form_incomplete")}
                  </span>
                )}
              </div>
            </ModalHeader>
            <ModalBody className="py-6 overflow-y-auto">
              <AccountSettings
                onSaveSuccess={() => {
                  onClose();
                }}
              />
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
