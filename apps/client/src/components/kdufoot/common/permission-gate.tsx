
import { usePermissions, Permission } from '@/hooks/use-permissions';
import { Card, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface PermissionGateProps {
    permission: Permission | string;
    showUpgrade?: boolean;
    children: ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
    permission,
    showUpgrade = true,
    children
}) => {
    const { t } = useTranslation();
    const { hasPermission, isLoading } = usePermissions();

    if (isLoading) return null;

    if (hasPermission(permission)) {
        return <>{children}</>;
    }

    if (showUpgrade) {
        return (
            <Card className="border-2 border-warning">
                <CardBody className="text-center p-8">
                    <div className="text-4xl mb-4">🔒</div>
                    <h3 className="text-xl font-bold mb-2">
                        {t('permissions.upgradeRequired')}
                    </h3>
                    <p className="text-gray-600 mb-4">
                        {t('permissions.featureRequiresUpgrade')}
                    </p>
                    <Button as={Link} to="/pricing" color="primary">
                        {t('permissions.viewPlans')}
                    </Button>
                </CardBody>
            </Card>
        );
    }

    return null;
};
