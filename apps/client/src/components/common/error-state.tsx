import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHome?: boolean;
}

export const ErrorState = ({
  title,
  message,
  onRetry,
  showHome = true,
}: ErrorStateProps) => {
  const { t } = useTranslation();

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center"
      role="alert"
    >
      <Card className="max-w-md w-full border-danger bg-danger-50 dark:bg-danger-100/10">
        <CardBody className="flex flex-col items-center gap-4 py-8">
          <div
            aria-hidden="true"
            className="p-3 bg-danger/10 rounded-full text-danger"
          >
            <AlertTriangle size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground">
              {title || t("error_state.title")}
            </h3>
            <p className="text-sm text-default-500">
              {message || t("error_state.message")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {onRetry && (
              <Button
                color="primary"
                startContent={<RefreshCw size={18} />}
                onPress={onRetry}
              >
                {t("error_state.retry")}
              </Button>
            )}
            {showHome && (
              <Button
                as={Link}
                startContent={<Home size={18} />}
                to="/"
                variant="flat"
              >
                {t("error_state.go_home")}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
