import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Image } from "@heroui/image";
import { useNavigate, useLocation } from "react-router-dom";

import { useAuth, useUser } from "@/authentication";
import { useWelcomeGateway } from "@/contexts/welcome-gateway-context";

export const WelcomeGateway: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const { profileComplete, isLoading: isUserLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isOpen,
    closeGateway,
    setVisitorMode,
    clearVisitorMode,
    blockingMessage,
  } = useWelcomeGateway();

  // 1. ÉTAT CHARGEMENT
  if (isLoading || isUserLoading) return null;

  // 2. SILENCE RÉACTIF : Si le profil est 100% complet et pas de message bloquant, on ne montre rien
  if (isAuthenticated && profileComplete && !blockingMessage) return null;

  const handleRegister = () => {
    clearVisitorMode();
    const currentPath = location.pathname + location.search;
    const targetPath = `/account?from=${encodeURIComponent(currentPath)}`;

    navigate(targetPath);
    closeGateway();
  };

  return (
    <Modal
      backdrop="blur"
      classNames={{
        base: "bg-background border border-default-100 shadow-2xl overflow-hidden",
        header: "border-none pt-8",
        body: "flex flex-col items-center text-center gap-6 px-8 pb-8",
        footer: "border-none pb-8 pt-0 px-8 flex flex-col gap-3",
        closeButton: "hidden",
      }}
      isDismissable={false}
      isKeyboardDismissDisabled={true}
      isOpen={isOpen}
      size="2xl"
      onClose={closeGateway}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex justify-center">
              <Image
                alt="Kdufoot Logo"
                className="drop-shadow-sm"
                src="/logo.png"
                width={180}
              />
            </ModalHeader>
            <ModalBody>
              {!isAuthenticated ? (
                <>
                  <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight leading-tight mt-2">
                    Bienvenue sur KduFoot
                  </h1>
                  <p className="text-default-500 text-base max-w-md font-medium">
                    Veuillez vous connecter ou créer un compte pour accéder à la
                    plateforme.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-2xl lg:text-3xl font-black bg-[linear-gradient(to_right,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6,#ec4899)] bg-clip-text text-transparent leading-tight mt-2 italic">
                    Un dernier effort...
                  </h1>

                  {blockingMessage && (
                    <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-2xl w-full flex items-center gap-3 animate-bounce shadow-lg shadow-danger/10">
                      <svg
                        className="w-6 h-6 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="font-bold text-sm leading-tight text-center flex-1">
                        {blockingMessage}
                      </p>
                    </div>
                  )}

                  <p className="text-default-500 text-base max-w-md font-medium">
                    Pour débloquer l'accès aux données du site (matchs,
                    tournois...), veuillez compléter votre profil Coach.
                  </p>
                </>
              )}
            </ModalBody>
            <ModalFooter>
              {!isAuthenticated ? (
                <div className="flex flex-col gap-3 w-full">
                  <Button
                    className="bg-primary text-white font-black tracking-tighter w-full rounded-2xl h-14 text-lg shadow-lg shadow-primary/20"
                    size="lg"
                    onPress={() => login()}
                  >
                    Se connecter
                  </Button>

                  <Button
                    className="border-primary text-primary font-black tracking-tighter w-full rounded-2xl h-14 text-lg"
                    size="lg"
                    variant="bordered"
                    onPress={() =>
                      login({ authorizationParams: { screen_hint: "signup" } })
                    }
                  >
                    Créer un compte
                  </Button>

                  <div className="flex items-center gap-3 w-full my-1">
                    <div className="h-px bg-default-200 flex-1" />
                    <span className="text-xs sm:text-sm font-bold text-default-400">
                      ou
                    </span>
                    <div className="h-px bg-default-200 flex-1" />
                  </div>

                  <Button
                    className="bg-default-100 font-bold w-full rounded-2xl h-12 flex items-center justify-center gap-3"
                    startContent={
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                    }
                    variant="flat"
                    onPress={() =>
                      login({
                        authorizationParams: { connection: "google-oauth2" },
                      })
                    }
                  >
                    Continuer avec Google
                  </Button>

                  <Button
                    className="font-black h-10 text-default-500 hover:text-default-900 active:scale-95 transition-all tracking-widest text-xs"
                    variant="light"
                    onPress={closeGateway}
                  >
                    Continuer sans compte
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 w-full">
                  <Button
                    className="bg-danger text-white font-black tracking-tighter w-full rounded-2xl h-14 text-lg shadow-lg shadow-danger/20"
                    onPress={handleRegister}
                  >
                    Remplir mon profil Coach
                  </Button>

                  <Button
                    className="font-black h-10 text-default-500 hover:text-default-900 active:scale-95 transition-all tracking-widest text-xs"
                    variant="light"
                    onPress={setVisitorMode}
                  >
                    Visiter le site
                  </Button>
                </div>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
