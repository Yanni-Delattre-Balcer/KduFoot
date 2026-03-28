import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

export const OfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { t } = useTranslation();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-0 left-0 right-0 z-9999 flex justify-center p-2"
          exit={{ opacity: 0, y: -50 }}
          initial={{ opacity: 0, y: -50 }}
        >
          <div className="bg-danger/90 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-white/20">
            <svg
              className="w-5 h-5 animate-pulse"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 3l18 18M9.015 9.015a6.75 6.75 0 0 1 8.97 8.97M12 21H3v-9m18 0v9h-9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-bold text-sm">
              {t("common.offline_mode", "Mode hors-ligne - Connexion perdue")}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
