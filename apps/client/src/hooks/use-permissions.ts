import { useState, useEffect } from "react";

import { useAuth } from "@/authentication";
import { Permission } from "@/types/permissions";

export function usePermissions() {
  const auth = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPermissions() {
      // If not authenticated, clear permissions
      if (!auth.isAuthenticated) {
        setPermissions([]);
        setIsLoading(false);

        return;
      }

      try {
        const token = await auth.getAccessToken();

        if (token) {
          // Decode JWT payload (standard structure: header.payload.signature)
          const payloadPart = token.split(".")[1];

          if (payloadPart) {
            const payload = JSON.parse(atob(payloadPart));

            setPermissions(payload.permissions || []);
          }
        }
      } catch (error) {
        console.error("Error loading permissions:", error);
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadPermissions();
  }, [auth.isAuthenticated, auth.user]); // Reload if user context changes

  const hasPermission = (permission: Permission | string): boolean => {
    return permissions.includes(permission);
  };

  return { hasPermission, isLoading, permissions };
}
