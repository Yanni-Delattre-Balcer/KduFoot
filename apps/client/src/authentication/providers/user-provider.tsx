import { createContext, useCallback, ReactNode, useMemo, useContext, useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { User } from '@/types/user.types';
import { isProfileComplete } from '@/utils/profile';
import { useWebSocketSync, WebSocketStatus, BanStatus } from '@/hooks/use-websocket';
import { useAuth } from './use-auth';

interface UserContextType {
    user: User | null;
    isLoading: boolean;
    error: any;
    linkClub: (siret: string) => Promise<any>;
    unlinkClub: () => Promise<void>;
    updateUser: (data: Partial<User>) => Promise<any>;
    blockUser: (userId: string, isBlocked: boolean, reason?: string) => Promise<void>;
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
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

const CONTEXT_KEY = '/api/me/context';

export function UserProvider({ children }: { children: ReactNode }) {
    const { getJson, postJson, putJson, patchJson, isAuthenticated, logout } = useAuth();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [localBanOverride, setLocalBanOverride] = useState<BanStatus | null>(null);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        const handleBanSignal = (e: any) => {
            console.log('[UserProvider] Signal de bannissement forcé reçu:', e.detail);
            setLocalBanOverride({ isBanned: true, reason: e.detail?.reason });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('user_banned_signal', handleBanSignal);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('user_banned_signal', handleBanSignal);
        };
    }, []);

    // Hook moved below user definitions

    const fetcher = useCallback(async () => {
        if (!isAuthenticated) return null;
        try {
            return await getJson(`${import.meta.env.API_BASE_URL}${CONTEXT_KEY}`);
        } catch (error: any) {
            if (error.status === 403 || error.isBlocked || error.message?.includes('403')) {
                const err = new Error('403_FORBIDDEN');
                (err as any).status = 403;
                const prefix = "Votre compte a été suspendu pour le motif suivant : ";
                if (error.message?.startsWith(prefix)) {
                    (err as any).reason = error.message.replace(prefix, "");
                } else {
                    (err as any).reason = error.message;
                }
                throw err;
            }
            throw error;
        }
    }, [isAuthenticated, getJson]);

    const { data, error, isLoading } = useSWR(
        isAuthenticated ? CONTEXT_KEY : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnMount: true,
            revalidateIfStale: true,
            shouldRetryOnError: false
        }
    );

    const user = data?.user || null;
    const notifications = data?.notifications || { pendingRequests: 0, modifiedParticipations: 0 };
    const profileComplete = isProfileComplete(user);

    const [wsToken, setWsToken] = useState<string | null>(null);
    const { getAccessToken } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            getAccessToken().then(setWsToken).catch(() => setWsToken(null));
        } else {
            setWsToken(null);
        }
    }, [isAuthenticated, getAccessToken]);

    const isBlocked = localBanOverride?.isBanned ||
        !!user?.is_blocked ||
        error?.message === '403_FORBIDDEN' ||
        (error && (error as any).status === 403) ||
        (error && error.message?.includes('Permission refusée')) ||
        (error && error.message?.includes('401'));

    const { status: syncStatus } = useWebSocketSync(
        isAuthenticated,
        user?.auth0_sub,
        (status: BanStatus) => {
            console.log('[UserProvider] Ban status change detected:', status);
            setLocalBanOverride(status);
        },
        wsToken,
        isBlocked
    );

    const blockReason = localBanOverride?.reason || user?.block_reason || (error as any)?.reason || (error?.message?.includes('Permission refusée') ? "Accès refusé par le serveur" : undefined);


    // SÉCURITÉ : Connecté + profil incomplet = verrouillé (le DataWall est le gardien)
    const isLocked = isAuthenticated && (!user || !isProfileComplete(user, true)) && !isBlocked;

    const isAdmin = user?.email === 'yannidelattrebalcer.artois@gmail.com';

    const linkClub = async (siret: string) => {
        const resData = await postJson(`${import.meta.env.API_BASE_URL}/api/users/link-club`, { siret });
        await mutate(CONTEXT_KEY);
        return resData;
    };

    const unlinkClub = async () => {
        await postJson(`${import.meta.env.API_BASE_URL}/api/users/unlink-club`, {});
        await mutate(CONTEXT_KEY);
    };

    const updateUser = async (data: Partial<User>) => {
        const resData = await putJson(`${import.meta.env.API_BASE_URL}/api/users/me`, data);
        await mutate(CONTEXT_KEY);
        return resData;
    };

    const blockUser = async (userId: string, isBlocked: boolean, reason?: string) => {
        await patchJson(`${import.meta.env.API_BASE_URL}/api/admin/users/${encodeURIComponent(userId)}/block`, { is_blocked: isBlocked, block_reason: reason });
        await mutate(CONTEXT_KEY);
    };

    const value = useMemo(() => ({
        user,
        isLoading,
        error,
        linkClub,
        unlinkClub,
        updateUser,
        blockUser,
        refetch: async () => { await mutate(CONTEXT_KEY); },
        profileComplete,
        isLocked,
        isAdmin,
        isBlocked,
        blockReason,
        isOnline,
        syncStatus,
        notifications
    }), [user, isLoading, error, profileComplete, isLocked, isAdmin, isBlocked, isOnline, syncStatus, notifications, logout]);

    if (isLoading && isAuthenticated && !isBlocked) {
        return (
            <UserContext.Provider value={value}>
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black">
                    <div className="w-10 h-10 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin"></div>
                </div>
            </UserContext.Provider>
        );
    }

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
