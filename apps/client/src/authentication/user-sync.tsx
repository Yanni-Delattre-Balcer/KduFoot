import { useEffect, useRef } from "react";

import { useAuth } from "./providers/use-auth";

export const UserSync = () => {
  const { isAuthenticated, user, postJson } = useAuth();
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user && user.sub && syncedRef.current !== user.sub) {
      // Avoid double calls if user object reference changes but sub is same
      syncedRef.current = user.sub;

      postJson(`${import.meta.env.API_BASE_URL}/api/users/sync`, user)
        .then((res: any) => {
          if (res.success) {
          } else {
            console.error("User sync returned error:", res.error);
          }
        })
        .catch((err: any) => {
          console.error("User sync failed", err);
          // Reset to allow retry? Or maybe use React Query logic later.
          syncedRef.current = null;
        });
    } else if (!isAuthenticated) {
      // Clear PWA session dismissal on logout so it reappears next time
      localStorage.removeItem("kdufoot-pwa-session-dismiss");
      syncedRef.current = null;
    }
  }, [isAuthenticated, user, postJson]);

  return null;
};
