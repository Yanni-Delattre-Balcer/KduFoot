import React, { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { ChevronRight, X, Calendar } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocation } from "react-router-dom";
import { api } from "../services/api";
import { addToast } from "@heroui/toast";
import { useUser } from "../authentication";

export const CalendarSyncBanner: React.FC = () => {
    const { getAccessTokenSilently, isAuthenticated } = useAuth0();
    const { user } = useUser();
    const location = useLocation();
    const [isVisible, setIsVisible] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isStep1Active, setIsStep1Active] = useState(true);

    useEffect(() => {
        const checkStep1 = () => {
            const sess = sessionStorage.getItem('kdufoot-pwa-session-dismiss') === 'true';
            const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
            
            if (sess || standalone) {
                setIsStep1Active(false);
            } else {
                setIsStep1Active(true);
            }
        };

        checkStep1();
        
        window.addEventListener('kdufoot_pwa_step_complete', checkStep1);
        return () => window.removeEventListener('kdufoot_pwa_step_complete', checkStep1);
    }, []);

    useEffect(() => {
        const checkVisibility = () => {
            if (user?.calendar_token) {
                setIsVisible(false);
                return;
            }

            const isNeverShow = localStorage.getItem("calendar-banner-never-show") === "true";
            if (isNeverShow) {
                setIsVisible(false);
                return;
            }

            const isDismissed = sessionStorage.getItem("calendar-banner-dismissed") === "true";
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

    const handleCalendarSync = async () => {
        setIsSyncing(true);
        console.log("[Calendar] Starting synchronization from banner...");
        
        try {
            const data = await api.get("/api/users/me/calendar-link", getAccessTokenSilently);
            if (data && (data as any).url) {
                const finalUrl = (data as any).url.replace(/^https?:\/\//, 'webcal://');
                window.location.href = finalUrl;
                addToast({ title: "Synchronisation calendrier lancée !", color: "success" });
            }
        } catch (error) {
            console.error("Failed to fetch calendar link", error);
            addToast({ title: "Échec de la synchronisation calendrier", color: "danger" });
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

    if (!isAuthenticated || !isVisible || isStep1Active || location.pathname === '/') return null;

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
                            <h3 className="font-bold text-white tracking-tight">Sync Calendrier</h3>
                            <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mt-0.5">Nouveauté</p>
                        </div>
                    </div>
                    <Button 
                        isIconOnly 
                        variant="light" 
                        size="sm" 
                        onPress={handleDismiss} 
                        className="text-white/40 hover:text-white/80 -mr-2 -mt-2"
                    >
                        <X size={18} />
                    </Button>
                </div>

                <p className="text-sm text-white/70 leading-relaxed">
                    Ne manquez aucun match ! Synchronisez vos rencontres directement avec l'application calendrier de votre téléphone.
                </p>

                <div className="flex flex-col gap-2.5 mt-2">
                    <Button 
                        color="secondary" 
                        onPress={handleCalendarSync}
                        isLoading={isSyncing}
                        className="w-full font-black tracking-tight h-12 bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20 group"
                        endContent={!isSyncing && <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />}
                    >
                        Connecter mon calendrier
                    </Button>
                    
                    <div className="flex gap-2">
                        <Button 
                            variant="flat" 
                            onPress={handleDismiss}
                            className="flex-1 font-bold text-xs h-9 bg-white/5 hover:bg-white/10 text-white/70"
                        >
                            Pas maintenant
                        </Button>
                        <Button 
                            variant="light" 
                            onPress={handleNever}
                            className="flex-1 font-bold text-xs h-9 text-white/40 hover:text-white/60"
                        >
                            Je ne veux pas
                        </Button>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
};
