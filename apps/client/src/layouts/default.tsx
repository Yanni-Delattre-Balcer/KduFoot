/**
 * Copyright (c) 2024-2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import { jwtVerify, JWTPayload } from "jose";
import { Mail, Handshake } from "lucide-react";
import { Link } from "react-router-dom";

import { getLocalJwkSet } from "@/authentication/utils/jwks";
import { Navbar } from "@/components/navbar";
import { UserTechnicalInfoModal } from "@/modals/user-technical-info";
import { ConnectivityStatus } from "@/components/connectivity-status";

export default function DefaultLayout({
  children,
  maxWidth = "max-w-7xl",
}: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const { t } = useTranslation();
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenPayload, setTokenPayload] = useState<JWTPayload | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      getAccessTokenSilently()
        .then(async (token) => {
          setAccessToken(token);
          const domain = import.meta.env.AUTH0_DOMAIN;
          const JWKS = await getLocalJwkSet(domain);
          const { payload } = await jwtVerify(token, JWKS, {
            issuer: `https://${domain}/`,
            audience: import.meta.env.AUTH0_AUDIENCE,
          });

          setTokenPayload(payload);
        })
        .catch((err) => {
          console.error("Failed to get or verify access token", err);
        });
    } else {
      setAccessToken(null);
      setTokenPayload(null);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  return (
    <div className="relative flex flex-col min-h-screen overflow-x-hidden">
      {/* Accessibility: Skip-link for keyboard navigation */}
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-bold"
        href="#main-content"
      >
        Aller au contenu principal
      </a>
      <Navbar />
      <ConnectivityStatus />
      {/* Spacer pour compenser la navbar fixed, avec prise en compte de la Safe Area iOS */}
      <div className="h-16 lg:h-28 shrink-0" />
      <main
        className={`container mx-auto ${maxWidth} px-4 lg:px-6 grow pb-16`}
        id="main-content"
      >
        {children}
      </main>
      <footer className="relative w-full border-t border-default-100 bg-background/80 backdrop-blur-md mt-auto">
        <div className="container mx-auto px-6 py-10 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full px-4">
              <div className="flex flex-col gap-2">
                <Button
                  as="a"
                  className="w-full font-bold h-12 bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/20 text-blue-400 hover:border-blue-500/40 hover:bg-blue-600/20 transition-all shadow-[0_0_20px_rgba(59,130,246,0.1)] rounded-xl"
                  href={`mailto:support@kdufoot.com?subject=${t("support.technical_issue_subject")}`}
                  startContent={<Mail size={18} strokeWidth={2.5} />}
                >
                  {t("support.technical_issue")}
                </Button>
                <p className="text-[10px] sm:text-xs text-center text-default-500 font-medium italic px-2 lg:px-0">
                  {t("support.technical_issue_desc")}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  as="a"
                  className="w-full font-bold h-12 bg-default-100/50 border border-default-200/50 text-default-600 hover:bg-default-200/50 hover:text-default-700 transition-all rounded-xl"
                  href={`mailto:contact@kdufoot.com?subject=${t("support.other_inquiry_subject")}`}
                  startContent={<Handshake size={20} />}
                >
                  {t("support.other_inquiry")}
                </Button>
                <p className="text-[10px] sm:text-xs text-center text-default-500 font-medium italic px-2 lg:px-0">
                  {t("support.other_inquiry_desc")}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 pb-12 sm:pb-0 border-t border-default-100 w-full flex flex-col items-center gap-2 text-center">
            <Link
              className="text-xs text-default-500 hover:text-primary transition-colors underline-offset-4 hover:underline"
              to="/gdpr"
            >
              Politique de Confidentialité & RGPD
            </Link>
            <p className="text-xs sm:text-sm text-default-500 tracking-widest font-bold">
              © 2026 KduFoot
            </p>
          </div>
        </div>

        {isAuthenticated && user && (
          <>
            {/* Floating trigger button — bottom-right on desktop */}
            <div className="fixed bottom-4 right-4 z-50">
              <Button
                aria-label={t("nav.userPrefix") + " " + user.name}
                className="bg-background/80 backdrop-blur-xl border border-default-200 shadow-2xl px-4 font-bold text-xs"
                size="sm"
                variant="flat"
                onPress={() => setIsModalOpen(true)}
              >
                {t("nav.userPrefix")} {user.name}
              </Button>
            </div>

            {/* Technical info modal */}
            <UserTechnicalInfoModal
              accessToken={accessToken}
              isOpen={isModalOpen}
              tokenPayload={tokenPayload}
              user={user}
              onClose={() => setIsModalOpen(false)}
            />
          </>
        )}
      </footer>
    </div>
  );
}
