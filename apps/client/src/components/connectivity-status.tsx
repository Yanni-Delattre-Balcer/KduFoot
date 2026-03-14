import { Chip } from "@heroui/chip";
import { useTranslation } from "react-i18next";

import { useUser } from "@/authentication";

export const ConnectivityStatus = () => {
  const { isOnline, syncStatus, isAuthenticated } = useUser() as any;
  const { t } = useTranslation();

  // On n'affiche rien si tout va bien
  if (isOnline && syncStatus === "connected") return null;
  if (!isAuthenticated && isOnline) return null;

  let message = "";
  let color: "danger" | "warning" = "warning";

  if (!isOnline) {
    message = t(
      "connectivity.offline",
      "Vous êtes hors ligne. Vérifiez votre connexion.",
    );
    color = "danger";
  } else if (syncStatus === "connecting") {
    message = t(
      "connectivity.reconnecting",
      "Connexion instable, mise à jour en cours...",
    );
    color = "warning";
  } else if (syncStatus === "disconnected") {
    // Si déconnecté mais online, on essaie probablement de se reconnecter
    return null;
  }

  if (!message) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in">
      <Chip
        aria-label={message}
        className="h-10 px-4 font-bold border border-white/20 shadow-xl"
        color={color}
        startContent={
          <span className="mr-1">{color === "danger" ? "🚫" : "🔄"}</span>
        }
        variant="shadow"
      >
        {message}
      </Chip>
    </div>
  );
};
