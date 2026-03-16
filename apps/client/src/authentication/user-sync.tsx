import { useEffect, useRef } from "react";

import { useAuth } from "./providers/use-auth";

export const UserSync = () => {
  const { isAuthenticated, user, postJson } = useAuth();
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user && user.sub && syncedRef.current !== user.sub) {
      const currentSub = user.sub;
      syncedRef.current = currentSub;

      postJson(`${import.meta.env.API_BASE_URL}/api/users/sync`, user)
        .then(async (res: any) => {
          if (res.success) {
            const { mutate } = await import("swr");
            await mutate("/api/me/context");
          } else {
            console.error("User sync returned error:", res.error);
            // Don't reset immediately to avoid infinite loop on persistent errors
          }
        })
        .catch((err: any) => {
          console.error("User sync failed", err);
          // If we fail, we don't want to loop. We'll let the next mount or user change deal with it.
          // Or we could implement a backoff. For now, just logging is safer.
        });
    } else if (!isAuthenticated) {
      // Clear PWA session dismissal on logout so it reappears next time
      localStorage.removeItem("kdufoot-pwa-session-dismiss");
      syncedRef.current = null;
    }
  }, [isAuthenticated, user?.sub, postJson]); // Only depend on sub, not the whole user object

  return null;
};
