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

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from 'virtual:pwa-register';

import App from "./App.tsx";
import "./i18n";
import { Provider } from "./provider.tsx";
import "@/styles/globals.css";
import { CookieConsentProvider } from "./contexts/cookie-consent-context.tsx";
import { CookieConsent } from "./components/cookie-consent.tsx";
import { AuthenticationProvider } from "./authentication";
import { UserProvider } from "./authentication/providers/user-provider";
import { WelcomeGatewayProvider } from "./contexts/welcome-gateway-context.tsx";

// Request persistent storage to prevent browsers from clearing PWA data
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then((persistent) => {
    if (persistent) {
      console.log("[Storage] Persistence granted");
    } else {
      console.log("[Storage] Persistence not granted");
    }
  });
}

// Register Service Worker for PWA support
if (import.meta.env.PROD) {
  registerSW({
    onNeedRefresh() {
      if (confirm('Une nouvelle version est disponible. Mettre à jour ?')) {
        window.location.reload();
      }
    },
    onOfflineReady() {
      console.log('Application prête pour une utilisation hors ligne.');
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Provider>
        <CookieConsentProvider>
          <AuthenticationProvider
            providerType={
              import.meta.env.AUTHENTICATION_PROVIDER_TYPE || "auth0"
            }
          >
            <WelcomeGatewayProvider>
              <UserProvider>
                <CookieConsent />
                <App />
              </UserProvider>
            </WelcomeGatewayProvider>
          </AuthenticationProvider>
        </CookieConsentProvider>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>,
);
