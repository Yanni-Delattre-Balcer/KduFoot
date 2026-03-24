/**
 * Copyright (c) 2024-2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 *
 * Modal component displaying technical user/token information.
 * Shown in the bottom-right corner on desktop, centered on mobile.
 */

import { memo, useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { JWTPayload } from "jose";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { CopyButton } from "@/components/copy-button";
import { AuthenticationGuardWithPermission } from "@/authentication/auth-components";

interface UserTechnicalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name?: string;
    email?: string;
    sub?: string;
  };
  accessToken: string | null;
  tokenPayload: JWTPayload | null;
}

function formatExpiry(exp: number): string {
  return new Date(exp * 1000).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSecondsLeft(exp: number): number {
  return Math.max(0, Math.floor(exp - Date.now() / 1000));
}

export const UserTechnicalInfoModal = memo<UserTechnicalInfoModalProps>(
  ({ isOpen, onClose, user, accessToken, tokenPayload }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [secondsLeft, setSecondsLeft] = useState<number>(0);

    useEffect(() => {
      if (!tokenPayload?.exp) return;
      setSecondsLeft(getSecondsLeft(tokenPayload.exp));
      const interval = setInterval(() => {
        setSecondsLeft(getSecondsLeft(tokenPayload.exp!));
      }, 1000);

      return () => clearInterval(interval);
    }, [tokenPayload?.exp]);

    const permissions =
      (tokenPayload?.permissions as string[] | undefined) ?? [];
    const isExpiringSoon = secondsLeft < 120;

    return (
      <Modal
        classNames={{
          wrapper: "sm:items-end sm:justify-end sm:p-4",
          base: "sm:m-0 sm:max-w-[400px] bg-[#18181b] border border-default-100/20 shadow-2xl",
          header: "border-b border-default-100/10 pb-3",
          body: "px-5 py-4",
        }}
        isOpen={isOpen}
        motionProps={{
          variants: {
            enter: { opacity: 1, y: 0, transition: { duration: 0.2 } },
            exit: { opacity: 0, y: 16, transition: { duration: 0.15 } },
          },
        }}
        placement="auto"
        onClose={onClose}
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="font-black text-white text-base leading-tight">
                {t("nav.userDropdown.connectedAs")}
              </span>
              <span className="text-sm font-semibold text-primary truncate max-w-[300px]">
                {user.email}
              </span>
            </div>
          </ModalHeader>

          <ModalBody className="gap-4">
            {/* User Identity */}
            <div className="bg-default-100/5 border border-default-100/10 rounded-xl p-3 space-y-1">
              <p className="text-xs text-default-400 tracking-wider font-bold mb-2">
                Identité
              </p>
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <p className="text-xs text-default-500 font-mono break-all">
                ID: {user.sub}
              </p>
            </div>

            <Divider className="bg-default-100/10" />

            {/* Token Status */}
            <div className="space-y-2">
              <p className="text-xs text-default-400 tracking-wider font-bold">
                {t("nav.userDropdown.tokenStatus")}
              </p>
              {tokenPayload?.exp ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-default-500">
                      {t("nav.userDropdown.expiresIn")}
                    </span>
                    <Chip
                      className="font-mono font-bold text-xs"
                      color={isExpiringSoon ? "danger" : "success"}
                      size="sm"
                      variant="flat"
                    >
                      {secondsLeft}s
                    </Chip>
                  </div>
                  <div className="flex justify-between items-center text-xs text-default-500">
                    <span>Expiration</span>
                    <span className="font-mono text-default-400">
                      {formatExpiry(tokenPayload.exp)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-danger">
                  {t("nav.userDropdown.noExpiry")}
                </p>
              )}
            </div>

            {/* Permissions */}
            {permissions.length > 0 && (
              <>
                <Divider className="bg-default-100/10" />
                <div className="space-y-2">
                  <p className="text-xs text-default-400 tracking-wider font-bold">
                    Permissions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {permissions.map((perm) => {
                      if (perm === "auth0:admin:api") {
                        return (
                          <AuthenticationGuardWithPermission
                            key={perm}
                            permission="auth0:admin:api"
                          >
                            <Chip
                              aria-label={perm + " (Admin Panel)"}
                              className="text-xs font-mono cursor-pointer hover:bg-primary-600 transition-colors"
                              color="primary"
                              role="button"
                              size="sm"
                              tabIndex={0}
                              variant="solid"
                              onClick={() => {
                                navigate("/admin/users");
                                onClose();
                              }}
                              onKeyDown={(e: React.KeyboardEvent) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  navigate("/admin/users");
                                  onClose();
                                }
                              }}
                            >
                              {perm} (Admin Panel)
                            </Chip>
                          </AuthenticationGuardWithPermission>
                        );
                      }

                      return (
                        <Chip
                          key={perm}
                          className="text-xs font-mono"
                          color="secondary"
                          size="sm"
                          variant="flat"
                        >
                          {perm}
                        </Chip>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <Divider className="bg-default-100/10" />

            {/* Access Token */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-default-400 tracking-wider font-bold">
                  {t("nav.userDropdown.accessToken")}
                </p>
                <CopyButton
                  className="h-7 w-7 min-w-7"
                  color="default"
                  value={accessToken ?? ""}
                  variant="flat"
                />
              </div>
              <ScrollShadow
                className="h-[80px] w-full"
                orientation="horizontal"
              >
                <p className="text-xs sm:text-sm text-default-500 font-mono break-all leading-relaxed select-all">
                  {accessToken || t("nav.userDropdown.loading")}
                </p>
              </ScrollShadow>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  },
);

UserTechnicalInfoModal.displayName = "UserTechnicalInfoModal";
