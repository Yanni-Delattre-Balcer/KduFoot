import React from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

interface ErrorViewProps {
  status: number;
  message?: string;
  onRetry?: () => void;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  status,
  message,
  onRetry,
}) => {
  const { t } = useTranslation();

  const getErrorConfig = () => {
    switch (status) {
      case 403:
        return {
          title: t("error.403.title", "Accès Refusé"),
          description:
            message ||
            t(
              "error.403.description",
              "Vous n'avez pas les permissions nécessaires pour accéder à cette ressource.",
            ),
          icon: (
            <svg
              className="w-12 h-12 text-warning"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
              />
            </svg>
          ),
          action: (
            <Button as={Link} color="primary" to="/" variant="flat">
              {t("error.back_home", "Retour à l'accueil")}
            </Button>
          ),
        };
      case 429:
        return {
          title: t("error.429.title", "Trop de Requêtes"),
          description: t(
            "error.429.description",
            "Vous avez envoyé trop de requêtes en peu de temps. Veuillez patienter quelques minutes avant de réessayer.",
          ),
          icon: (
            <svg
              className="w-12 h-12 text-danger"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
              />
            </svg>
          ),
          action: (
            <Button
              color="danger"
              variant="flat"
              onPress={onRetry || (() => window.location.reload())}
            >
              {t("error.retry", "Réessayer")}
            </Button>
          ),
        };
      case 404:
        return {
          title: t("error.404.title", "Non Trouvé"),
          description: t(
            "error.404.description",
            "La ressource que vous recherchez n'existe pas ou a été déplacée.",
          ),
          icon: (
            <svg
              className="w-12 h-12 text-default-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
              />
            </svg>
          ),
          action: (
            <Button as={Link} to="/" variant="bordered">
              {t("error.back_home", "Retour à l'accueil")}
            </Button>
          ),
        };
      default:
        return {
          title: t("error.500.title", "Une erreur est survenue"),
          description: t(
            "error.500.description",
            "Nous rencontrons un problème technique. Nos équipes ont été notifiées.",
          ),
          icon: (
            <svg
              className="w-12 h-12 text-danger"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
              />
            </svg>
          ),
          action: (
            <Button
              color="primary"
              onPress={onRetry || (() => window.location.reload())}
            >
              {t("error.retry", "Rafraîchir la page")}
            </Button>
          ),
        };
    }
  };

  const config = getErrorConfig();

  return (
    <div
      className="flex items-center justify-center p-4 min-h-[400px]"
      role="alert"
    >
      <Card className="max-w-md w-full border-none bg-background/60 dark:bg-default-100/50 backdrop-blur-md shadow-xl overflow-hidden">
        <CardBody className="p-8 text-center flex flex-col items-center gap-6">
          <div
            aria-hidden="true"
            className="w-20 h-20 rounded-3xl bg-default-100 dark:bg-default-50 flex items-center justify-center shadow-inner"
          >
            {config.icon}
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">
              {config.title}
            </h2>
            <p className="text-default-500 text-sm leading-relaxed px-4">
              {config.description}
            </p>
          </div>
          <div className="flex flex-col w-full gap-2 mt-2">{config.action}</div>
        </CardBody>
      </Card>
    </div>
  );
};
