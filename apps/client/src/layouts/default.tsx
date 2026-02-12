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
import { Trans, useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Button } from "@heroui/button";
import { Snippet } from "@heroui/snippet";
import { jwtVerify, JWTPayload } from "jose";
import { getLocalJwkSet } from "@/authentication/utils/jwks";
import { Navbar } from "@/components/navbar";

export default function DefaultLayout({
  children,
  maxWidth = "max-w-7xl",
}: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  useTranslation();
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenPayload, setTokenPayload] = useState<JWTPayload | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      getAccessTokenSilently()
        .then(async (token) => {
          setAccessToken(token);
          const domain = import.meta.env.VITE_AUTH0_DOMAIN;
          const JWKS = await getLocalJwkSet(domain);
          const { payload } = await jwtVerify(token, JWKS, {
            issuer: `https://${domain}/`,
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
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
    <div className="relative flex flex-col h-screen">
      <Navbar />
      <main className={`container mx-auto ${maxWidth} px-6 flex-grow pt-16`}>
        {children}
      </main>
      <footer className="w-full flex items-center justify-center py-3">
        {isAuthenticated && user && (
          <div className="fixed bottom-4 right-4 z-50">
            <Dropdown placement="top-end">
              <DropdownTrigger>
                <Button variant="flat" size="sm" className="bg-background/60 backdrop-blur-md border border-default-200 shadow-lg px-4">
                  Utilisateur : {user.name}
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Token Details" className="w-[340px]">
                <DropdownItem key="user-info" isReadOnly className="opacity-100 cursor-default">
                  <div className="flex flex-col gap-1 p-2">
                    <p className="font-bold text-primary">Connected as</p>
                    <p className="text-sm font-semibold">{user.email}</p>
                    <p className="text-xs text-default-500 font-mono mt-1 break-all">ID: {user.sub}</p>
                  </div>
                </DropdownItem>
                <DropdownItem key="token-status" isReadOnly className="opacity-100 cursor-default border-t border-default-100">
                  <div className="flex flex-col gap-1 p-2">
                    <p className="font-bold text-success">Token Status</p>
                    {tokenPayload?.exp ? (
                      <div className="flex justify-between items-center text-xs">
                        <span>Expires in:</span>
                        <span className="font-mono text-warning">
                          {Math.max(0, Math.floor(tokenPayload.exp - Date.now() / 1000))}s
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-danger">No expiry found</p>
                    )}
                  </div>
                </DropdownItem>
                <DropdownItem key="copy-token" variant="flat">
                  <div className="flex flex-col gap-2 p-1">
                    <p className="text-xs font-bold text-default-400">Access Token (Bearer)</p>
                    <Snippet variant="bordered" size="sm" symbol="" className="w-full">
                      {accessToken || "Loading..."}
                    </Snippet>
                  </div>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        )}
        <Link
          isExternal
          className="flex items-center gap-1 text-current"
          href="https://heroui.com/"
          title="heroui.com homepage"
        >
          <span className="text-default-600">
            <Trans i18nKey="powered-by">Powered by</Trans>
          </span>
          <p className="text-primary font-bold">HeroUI</p>
        </Link>
      </footer>
    </div>
  );
}
