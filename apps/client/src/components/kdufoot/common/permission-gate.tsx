import type { ReactNode } from "react";

import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Permission } from "@/types/permissions";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * The PermissionGate component is a common pattern to protect parts of the UI.
 * It only renders its children if the user has the required permission.
 */
interface PermissionGateProps {
  permission: Permission | string;
  showUpgrade?: boolean;
  children: ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  showUpgrade = true,
  children,
}) => {
  const { t } = useTranslation();
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) return null;

  /**
   * If the user has the permission, we show the protected content.
   */
  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  /**
   * If not, we can show an upgrade message (common in 'Freemium' apps).
   */
  if (showUpgrade) {
    return (
      <Card className="border-2 border-warning">
        <CardBody className="text-center p-8">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-xl font-bold mb-2">
            {t("permissions.upgradeRequired")}
          </h3>
          <p className="text-gray-600 mb-4">
            {t("permissions.featureRequiresUpgrade")}
          </p>
          <Button as={Link} color="primary" to="/pricing">
            {t("permissions.viewPlans")}
          </Button>
        </CardBody>
      </Card>
    );
  }

  return null;
};
