/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

import { db } from "./utils/db";

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Cache Fonts
registerRoute(
  ({ url }) =>
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com" ||
    url.origin === "https://cdn.mathpix.com",
  new CacheFirst({
    cacheName: "google-fonts",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      }),
    ],
  }),
);

// Cache API (Read-only)
registerRoute(
  ({ url }) => url.pathname.includes("/api/"),
  new NetworkFirst({
    cacheName: "api-cache",
  }),
);

// BACKGROUND SYNC LOGIC
self.addEventListener("sync", (event: any) => {
  if (event.tag === "sync-outbox") {
    event.waitUntil(syncOutbox());
  }
});

async function syncOutbox() {
  const requests = await db.outbox.toArray();

  for (const req of requests) {
    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify(req.body),
      });

      if (response.ok) {
        await db.outbox.delete(req.id!);
      }
    } catch (error) {
      console.error("Failed to sync request:", error);
      // Will retry on next sync event
    }
  }
}

// Push notifications placeholder
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};

  event.waitUntil(
    self.registration.showNotification(data.title ?? "KduFoot", {
      body: data.body ?? "Nouveau message !",
      icon: "/logo.png",
    }),
  );
});
