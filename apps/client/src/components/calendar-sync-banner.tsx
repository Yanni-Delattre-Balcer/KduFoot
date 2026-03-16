import React, { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { X, Calendar } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocation } from "react-router-dom";
import { addToast } from "@heroui/toast";
import { useTranslation } from "react-i18next";

import { api } from "../services/api";
import { useUser } from "../authentication";

export const CalendarSyncBanner: React.FC = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { user } = useUser();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isStep1Active, setIsStep1Active] = useState(true);
  const { t } = useTranslation("kdufoot");

  const isAndroid = /Android/i.test(navigator.userAgent);

  useEffect(() => {
    const checkStep1 = () => {
      const sess =
        sessionStorage.getItem("kdufoot-pwa-session-dismiss") === "true";
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone;

      if (sess || standalone) {
        setIsStep1Active(false);
      } else {
        setIsStep1Active(true);
      }
    };

    checkStep1();

    window.addEventListener("kdufoot_pwa_step_complete", checkStep1);

    return () =>
      window.removeEventListener("kdufoot_pwa_step_complete", checkStep1);
  }, []);

  useEffect(() => {
    const checkVisibility = () => {
      if (user?.calendar_token) {
        setIsVisible(false);

        return;
      }

      const isNeverShow =
        localStorage.getItem("calendar-banner-never-show") === "true";

      if (isNeverShow) {
        setIsVisible(false);

        return;
      }

      const isDismissed =
        sessionStorage.getItem("calendar-banner-dismissed") === "true";

      if (isDismissed) {
        setIsVisible(false);

        return;
      }

      if (!isStep1Active) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    checkVisibility();
  }, [user?.calendar_token, isStep1Active]);

  const handleCalendarSync = async (type: "default" | "google" | "copy" = "default") => {
    setIsSyncing(true);
    console.log(`[Calendar] Starting synchronization (${type}) from banner...`);

    try {
      const data = await api.get(
        "/api/users/me/calendar-link",
        getAccessTokenSilently,
      );

      if (data && (data as any).url) {
        const url = (data as any).url;

        if (type === "google") {
          const googleUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(url.replace(/^webcal:\/\//, "https://"))}`;
          window.open(googleUrl, "_blank");
        } else if (type === "copy") {
          await navigator.clipboard.writeText(url.replace(/^webcal:\/\//, "https://"));
          addToast({
            title: t("onboarding.calendar.link_copied"),
            color: "success",
          });
        } else {
          const finalUrl = url.replace(/^https?:\/\//, "webcal://");
          window.location.href = finalUrl;
          addToast({
            title: isAndroid 
              ? t("onboarding.calendar.instructions_android")
              : t("onboarding.calendar.toast_success"),
            color: "success",
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch calendar link", error);
      addToast({
        title: t("onboarding.calendar.toast_error"),
        color: "danger",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("calendar-banner-dismissed", "true");
  };

  const handleNever = () => {
    setIsVisible(false);
    localStorage.setItem("calendar-banner-never-show", "true");
  };

  if (
    !isAuthenticated ||
    !isVisible ||
    isStep1Active ||
    location.pathname === "/"
  )
    return null;

  return (
    <Card
      className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-[400px] z-[100] border-none bg-black/60 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-500"
      radius="lg"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />

      <CardBody className="p-5 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
              <Calendar size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold text-white tracking-tight">
                {t("onboarding.calendar.title")}
              </h3>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mt-0.5">
                Nouveauté
              </p>
            </div>
          </div>
          <Button
            isIconOnly
            className="text-white/40 hover:text-white/80 -mr-2 -mt-2"
            size="sm"
            variant="light"
            onPress={handleDismiss}
          >
            <X size={18} />
          </Button>
        </div>

        <p className="text-sm text-white/70 leading-relaxed">
          {isAndroid 
            ? t("onboarding.calendar.instructions_android")
            : t("onboarding.calendar.description")}
        </p>

        <div className="flex flex-col gap-3 mt-2">
          <div className="flex gap-2.5">
            <Button
              className="flex-[2] font-black tracking-tight h-12 bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20 group"
              color="secondary"
              isLoading={isSyncing}
              onPress={() => handleCalendarSync(isAndroid ? "google" : "default")}
            >
              {isAndroid ? t("onboarding.calendar.add_google") : t("onboarding.calendar.button")}
            </Button>
            <Button
              className="flex-1 font-bold text-xs h-12 border-white/10 text-white/40 hover:text-white/60"
              variant="bordered"
              onPress={handleNever}
            >
              {t("onboarding.calendar.dismiss")}
            </Button>
          </div>

          <Button
            className="w-full font-bold text-xs h-9 bg-white/5 hover:bg-white/10 text-white/60"
            variant="flat"
            onPress={handleDismiss}
          >
            {t("onboarding.calendar.later")}
          </Button>
          
          {isAndroid && (
             <div className="flex gap-2">
               <Button
                 className="flex-1 font-bold text-[10px] h-8 bg-white/5 text-white/40"
                 variant="flat"
                 size="sm"
                 onPress={() => handleCalendarSync("default")}
               >
                 App Directe
               </Button>
               <Button
                 className="flex-1 font-bold text-[10px] h-8 bg-white/5 text-white/40"
                 variant="flat"
                 size="sm"
                 onPress={() => handleCalendarSync("copy")}
               >
                 {t("onboarding.calendar.copy_link")}
               </Button>
             </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};
