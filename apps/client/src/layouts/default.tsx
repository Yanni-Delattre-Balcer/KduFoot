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

import { Link } from "@heroui/link";
import { useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import { jwtVerify, JWTPayload } from "jose";
import { getLocalJwkSet } from "@/authentication/utils/jwks";
import { Navbar } from "@/components/navbar";
import { UserTechnicalInfoModal } from "@/modals/user-technical-info";

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
      {/* Floating Logo - Independent of Navbar - Responsive */}
      <div className="fixed top-0 left-4 lg:left-6 z-50 py-1 lg:py-2 pointer-events-none">
        <a href="/" className="pointer-events-auto block">
          <img
            src="/logo.png"
            alt="KduFoot Logo"
            className="h-14 lg:h-20 w-auto object-contain"
          />
        </a>
      </div>

      <Navbar />
      <main className={`container mx-auto ${maxWidth} px-6 grow pt-16 lg:pt-24 pb-16`}>
        {children}
      </main>
      <footer className="absolute bottom-0 w-full flex items-center justify-center py-3">
        {isAuthenticated && user && (
          <>
            {/* Floating trigger button — bottom-right on desktop */}
            <div className="fixed bottom-4 right-4 z-50">
              <Button
                variant="flat"
                size="sm"
                className="bg-background/60 backdrop-blur-md border border-default-200 shadow-lg px-4"
                onPress={() => setIsModalOpen(true)}
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
        <Link
          isExternal
          className="flex items-center gap-1 text-current"
          href="https://github.com/sctg-development/vite-react-heroui-auth0-template"
          title="React template"
        >
          <span className="text-default-600">
            {t("footer.poweredBy")}
          </span>
          <p className="text-primary font-bold">React template</p>
        </Link>
      </footer>
    </div>
  );
}
