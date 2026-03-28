import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export const ConnectivityBanner = () => {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      setTimeout(() => setShowBackOnline(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };

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
          animate={{ y: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-danger text-white px-4 py-2 flex items-center justify-center gap-2 font-bold text-sm shadow-lg"
          exit={{ y: -100 }}
          initial={{ y: -100 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <span className="animate-pulse">⚠️</span>
          {t(
            "common.offline_mode",
            "Mode hors-ligne : Les données peuvent être obsolètes",
          )}
        </motion.div>
      )}
      {showBackOnline && (
        <motion.div
          animate={{ y: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-success text-white px-4 py-2 flex items-center justify-center gap-2 font-bold text-sm shadow-lg"
          exit={{ y: -100 }}
          initial={{ y: -100 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <span>✅</span>
          {t("common.back_online", "Connexion rétablie")}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
