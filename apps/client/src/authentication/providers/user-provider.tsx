import {
  createContext,
  useCallback,
  ReactNode,
  useMemo,
  useContext,
  useState,
  useEffect,
} from "react";
import useSWR, { mutate } from "swr";

import { useAuth } from "./use-auth";

import { User } from "@/types/user.types";
import { isProfileComplete } from "@/utils/profile";
import {
  useWebSocketSync,
  WebSocketStatus,
  BanStatus,
} from "@/hooks/use-websocket";

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | { status: number; reason?: string } | null;
  linkClub: (siret: string) => Promise<unknown>;
  unlinkClub: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<unknown>;
  resetCalendarSync: () => Promise<void>;
  blockUser: (
    userId: string,
    isBlocked: boolean,
    reason?: string,
  ) => Promise<void>;
  refetch: () => Promise<void>;
  profileComplete: boolean;
  isLocked: boolean;
  isAdmin: boolean;
  isBlocked: boolean;
  blockReason?: string;
  isOnline: boolean;
  syncStatus: WebSocketStatus;
  notifications: {
    pendingRequests: number;
    modifiedParticipations: number;
  };
  isAuthenticated: boolean;
  last_calendar_sync_at?: number;
  needsCalendarReSync: boolean;
  isAccountModalOpen: boolean;

  setIsAccountModalOpen: (open: boolean) => void;
}

export const UserContext = createContext<UserContextType | undefined>(
  undefined,
);

const CONTEXT_KEY = "/api/me/context";

interface ContextResponse {
  user: User;
  notifications: {
    pendingRequests: number;
    modifiedParticipations: number;
  };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const { getJson, postJson, putJson, patchJson, isAuthenticated } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [localBanOverride, setLocalBanOverride] = useState<BanStatus | null>(
    null,
  );
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleBanSignal = (e: Event) => {
      const detail = (e as CustomEvent).detail;

      setLocalBanOverride({ isBanned: true, reason: detail?.reason });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("user_banned_signal", handleBanSignal);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("user_banned_signal", handleBanSignal);
    };
  }, []);

  // Hook moved below user definitions

  const fetcher = useCallback(async () => {
    if (!isAuthenticated) return null;
    try {
      return await getJson<ContextResponse>(
        `${import.meta.env.API_BASE_URL}${CONTEXT_KEY}`,
      );
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        ("status" in error || "message" in error)
      ) {
        const errObj = error as {
          status?: number;
          isBlocked?: boolean;
          message?: string;
        };

        if (
          errObj.status === 403 ||
          errObj.isBlocked ||
          errObj.message?.includes("403")
        ) {
          const err = new Error("403_FORBIDDEN") as Error & {
            status?: number;
            reason?: string;
          };

          err.status = 403;
          const prefix = "Votre compte a été suspendu pour le motif suivant : ";

          if (errObj.message?.startsWith(prefix)) {
            err.reason = errObj.message.replace(prefix, "");
          } else {
            err.reason = errObj.message;
          }
          throw err;
        }
      }
      throw error;
    }
  }, [isAuthenticated, getJson]);

  const {
    data,
    error,
    isLoading,
    mutate: boundMutate,
  } = useSWR(isAuthenticated ? CONTEXT_KEY : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
    revalidateIfStale: true,
    shouldRetryOnError: false,
  });

  const user = data?.user || null;
  const notifications = useMemo(
    () =>
      data?.notifications || {
        pendingRequests: 0,
        modifiedParticipations: 0,
      },
    [data?.notifications],
  );
  const profileComplete = isProfileComplete(user);

  const [wsToken, setWsToken] = useState<string | null>(null);
  const { getAccessToken } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      getAccessToken()
        .then(setWsToken)
        .catch(() => setWsToken(null));
    } else {
      setWsToken(null);
    }
  }, [isAuthenticated, getAccessToken]);

  const isBlocked =
    localBanOverride?.isBanned === true ||
    (localBanOverride?.isBanned !== false &&
      (!!user?.is_blocked ||
        error?.message === "403_FORBIDDEN" ||
        (error && (error as { status?: number }).status === 403) ||
        (error && error.message?.includes("Permission refusée")) ||
        (error && error.message?.includes("401"))));

  const handleBanStatusChange = useCallback((status: BanStatus) => {
    setLocalBanOverride(status);
  }, []);

  const { status: syncStatus } = useWebSocketSync(
    isAuthenticated,
    user?.auth0_sub,
    handleBanStatusChange,
    wsToken,
    isBlocked,
  );

  const blockReason =
    localBanOverride?.reason ||
    user?.block_reason ||
    (error as { reason?: string })?.reason ||
    (error?.message?.includes("Permission refusée")
      ? "Accès refusé par le serveur"
      : undefined);

  // SÉCURITÉ : Connecté + profil incomplet = verrouillé (le DataWall est le gardien)
  const isLocked =
    isAuthenticated && (!user || !isProfileComplete(user, true)) && !isBlocked;

  const needsCalendarReSync = useMemo(() => {
    if (!user) return false;

    // Si pas encore synchronisé, on demande tout le temps
    return !user.has_synced_calendar;
  }, [user]);

  const isAdmin = user?.email === "yannidelattrebalcer.artois@gmail.com";

  const linkClub = async (siret: string) => {
    const resData = await postJson(
      `${import.meta.env.API_BASE_URL}/api/users/link-club`,
      { siret },
    );

    await boundMutate();

    return resData;
  };

  const unlinkClub = async () => {
    await postJson(`${import.meta.env.API_BASE_URL}/api/users/unlink-club`, {});
    await boundMutate();
  };

  const updateUser = async (data: Partial<User>) => {
    const resData = await putJson<any>(
      `${import.meta.env.API_BASE_URL}/api/users/me`,
      data,
    );

    if (resData?.success && resData?.user) {
      // Force direct local cache update without revalidation
      await boundMutate(resData, { revalidate: false });
    } else {
      await boundMutate();
    }

    return resData;
  };

  const resetCalendarSync = async () => {
    await updateUser({ has_synced_calendar: false });
    // Supprimer aussi les flags de session/local pour forcer l'affichage immédiat
    sessionStorage.removeItem("kdufoot-calendar-suppressed");
    localStorage.removeItem("kdufoot-calendar-never-ask");
    // Dispatch event to force UnifiedOnboarding to refresh its local state
    window.dispatchEvent(new CustomEvent("kdufoot_calendar_status_changed"));
  };

  const blockUser = async (
    userId: string,
    isBlocked: boolean,
    reason?: string,
  ) => {
    await patchJson(
      `${import.meta.env.API_BASE_URL}/api/admin/users/${encodeURIComponent(userId)}/block`,
      { is_blocked: isBlocked, block_reason: reason },
    );
    await mutate(CONTEXT_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      error,
      linkClub,
      unlinkClub,
      updateUser,
      blockUser,
      refetch: async () => {
        await boundMutate();
      },
      profileComplete,
      isLocked,
      isAdmin,
      isBlocked,
      blockReason,
      isOnline,
      syncStatus,
      notifications,
      resetCalendarSync,
      last_calendar_sync_at: user?.last_calendar_sync_at,
      needsCalendarReSync,
      isAccountModalOpen,
      setIsAccountModalOpen,
      isAuthenticated,
    }),
    [
      user,
      isLoading,
      error,
      profileComplete,
      isLocked,
      isAdmin,
      isBlocked,
      isOnline,
      syncStatus,
      notifications,
      resetCalendarSync,
      needsCalendarReSync,
      isAccountModalOpen,
      isAuthenticated,
    ],
  );

  if (isLoading && isAuthenticated && !isBlocked && !user) {
    return (
      <UserContext.Provider value={value}>
        <div className="fixed inset-0 z-10000 flex items-center justify-center bg-black">
          <div className="w-10 h-10 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin" />
        </div>
      </UserContext.Provider>
    );
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUser = () => {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
};
