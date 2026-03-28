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

import type React from "react";
import type { NavigateOptions } from "react-router-dom";

import { HeroUIProvider } from "@heroui/system";
import { ToastProvider } from "@heroui/toast";
import { useHref, useNavigate } from "react-router-dom";
import { SWRConfig } from "swr";
import { useEffect, useState } from "react";
import { db } from "./utils/db";

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

export function Provider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isHydrated, setIsHydrated] = useState(false);
  const [initialCache, setInitialCache] = useState<any>(new Map());

  // Rehydrate SWR Cache from IndexedDB on mount
  useEffect(() => {
    async function hydrate() {
      const allCache = await db.cache.toArray();
      const map = new Map();

      allCache.forEach((entry) => map.set(entry.key, entry.value));
      setInitialCache(map);
      setIsHydrated(true);
    }
    hydrate();
  }, []);

  if (!isHydrated) return null; // Prevent flicker before cache is ready

  return (
    <SWRConfig
      value={{
        provider: () => initialCache,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        keepPreviousData: true,
        // Sync cache back to Dexie on each mutation
        onSuccess: (data: any, key: any) => {
          db.cache.put({ key, value: data, timestamp: Date.now() });
        },
        onError: (error) => {
          if (error?.status === 429) {
            import("@heroui/toast").then(({ addToast }) => {
              addToast({
                title: "Forte affluence",
                description:
                  "Le serveur est saturé. La page sera actualisée automatiquement quand ce sera passé.",
                color: "warning",
                timeout: 5000,
              });
            });
          }
        },
      }}
    >
      <HeroUIProvider navigate={navigate} useHref={useHref}>
        <ToastProvider
          maxVisibleToasts={3}
          placement="top-center"
          toastProps={{
            classNames: {
              base: "mt-[80px] sm:mt-0 w-auto max-w-lg min-w-fit",
              title: "line-clamp-none whitespace-normal text-sm font-bold",
              description:
                "line-clamp-none whitespace-normal text-xs font-medium",
            },
          }}
        />
        {children}
      </HeroUIProvider>
    </SWRConfig>
  );
}
