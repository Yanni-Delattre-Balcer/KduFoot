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
          // eslint-disable-next-line no-console
          console.error("Failed to get or verify access token", err);
        });
    } else {
      setAccessToken(null);
      setTokenPayload(null);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  return (
    <div className="relative flex flex-col min-h-screen overflow-x-hidden">
      <Navbar />
      <ConnectivityStatus />
      {/* Spacer pour compenser la navbar fixed, avec prise en compte de la Safe Area iOS */}
      <div className="h-16 lg:h-28 shrink-0" />
      <main className={`container mx-auto ${maxWidth} px-4 lg:px-6 grow pb-16`}>
        {children}
      </main>
      <footer className="relative w-full border-t border-default-100 bg-background/80 backdrop-blur-md mt-auto">
        <div className="container mx-auto px-6 py-8 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-default-600 tracking-tight">{t('support.other_inquiry')}</span>
            <span className="text-[10px] sm:text-xs text-default-400 font-medium italic whitespace-nowrap">{t('support.other_inquiry_desc')}</span>
          </div>

          <div className="pt-4 pb-12 sm:pb-0 border-t border-default-100 w-full text-center">
            <p className="text-xs sm:text-sm text-default-400 tracking-widest font-bold opacity-50">
              © 2026 KduFoot
            </p>
          </div>
        </div>

        {isAuthenticated && user && (
          <>
            {/* Floating trigger button — bottom-right on desktop */}
            <div className="fixed bottom-4 right-4 z-50">
              <Button
                variant="flat"
                size="sm"
                className="bg-background/80 backdrop-blur-xl border border-default-200 shadow-2xl px-4 font-bold text-xs"
                onPress={() => setIsModalOpen(true)}
                aria-label={t('nav.userPrefix') + ' ' + user.name}
              >
                {t("nav.userPrefix")} {user.name}
              </Button>
            </div>

            {/* Technical info modal */}
            <UserTechnicalInfoModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              user={user}
              accessToken={accessToken}
              tokenPayload={tokenPayload}
            />
          </>
        )}
      </footer>
    </div>
  );
}
