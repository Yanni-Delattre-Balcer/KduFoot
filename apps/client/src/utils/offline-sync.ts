import { db } from "./db";

/**
 * Registre un tag de synchronisation Background Sync
 */
async function registerSync(tag: string) {
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    const registration = await navigator.serviceWorker.ready;

    try {
      await (registration as any).sync.register(tag);
      console.log(`Sync registered: ${tag}`);
    } catch (err) {
      console.warn("Background Sync registration failed", err);
    }
  }
}

/**
 * Wrapper de fetch capable de stocker la requête en IndexedDB si offline.
 */
export async function fetchWithOffline(
  url: string,
  options: RequestInit = {},
): Promise<Response | null> {
  const method = options.method || "GET";
  const isWrite = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

  if (!navigator.onLine && isWrite) {
    // Enregistrer dans l'outbox
    await db.outbox.add({
      url,
      method,
      headers: (options.headers as any) || {},
      body: options.body ? JSON.parse(options.body as string) : null,
      timestamp: Date.now(),
    });

    await registerSync("sync-outbox");

    // Simuler une réponse de succès (Optimistic)
    return new Response(JSON.stringify({ success: true, offline: true }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }

  return fetch(url, options);
}

/**
 * SWR Cache Provider with Dexie persistence
 */
export const dexieStorage = {
  get: async (key: string) => {
    const entry = await db.cache.get(key);

    return entry ? entry.value : undefined;
  },
  set: async (key: string, value: any) => {
    await db.cache.put({ key, value, timestamp: Date.now() });
  },
  delete: async (key: string) => {
    await db.cache.delete(key);
  },
};
