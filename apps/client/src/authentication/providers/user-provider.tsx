import { createContext, useCallback, ReactNode, useMemo, useContext, useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { User } from '@/types/user.types';
import { isProfileComplete } from '@/utils/profile';
import { useWebSocketSync, WebSocketStatus } from '@/hooks/use-websocket';
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

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Hook moved below user definitions

    const fetcher = useCallback(async () => {
        if (!isAuthenticated) return null;
        try {
            return await getJson(`${import.meta.env.API_BASE_URL}${CONTEXT_KEY}`);
        } catch (error: any) {
            if (error.message.includes('403')) {
                const err = new Error('403_FORBIDDEN');
                (err as any).reason = error.message;
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

    const { status: syncStatus } = useWebSocketSync(isAuthenticated, user?.id);

    const isBlocked = !!user?.is_blocked || error?.message === '403_FORBIDDEN';

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
        await patchJson(`${import.meta.env.API_BASE_URL}/api/admin/users/${userId}/block`, { is_blocked: isBlocked, block_reason: reason });
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
        isOnline,
        syncStatus,
        notifications
    }), [user, isLoading, error, profileComplete, isLocked, isAdmin, isBlocked, isOnline, syncStatus, notifications, logout]);

    if (isLoading && isAuthenticated) {
        return (
            <UserContext.Provider value={value}>
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black">
                    <div className="w-10 h-10 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin"></div>
                </div>
            </UserContext.Provider>
        );
    }

    if (isBlocked) {
        return (
            <UserContext.Provider value={value}>
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black p-4 sm:p-6">
                    <div className="max-w-lg w-full bg-zinc-900 border-2 border-red-600 shadow-2xl shadow-red-900/40 rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center gap-5 animate-appearance-in">
                        {/* Icon */}
                        <div className="p-4 rounded-full bg-red-600/20 border-2 border-red-600/40">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-14 h-14 text-red-500">
                                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                            </svg>
                        </div>

                        {/* Title */}
                        <h1 className="text-xl sm:text-2xl font-black text-red-500 uppercase tracking-tight leading-tight">
                            VOUS AVEZ ÉTÉ BANNI PAR L'ADMINISTRATEUR KDUFOOT
                        </h1>

                        {/* Motif */}
                        <div className="w-full bg-red-950/40 border border-red-800/40 rounded-2xl p-4">
                            <p className="text-xs sm:text-sm font-bold text-red-400/60 uppercase tracking-widest mb-1">Motif du bannissement</p>
                            <p className="text-sm sm:text-base font-semibold text-white/90 leading-relaxed">
                                {user?.block_reason || (error as any)?.reason || 'Aucun motif spécifié'}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 w-full mt-2">
                            <a
                                href="mailto:support@kdufoot.com?subject=Demande%20de%20débannissement%20KduFoot"
                                className="flex items-center justify-center gap-2 bg-white text-black font-black uppercase tracking-tight rounded-2xl h-12 text-sm shadow-lg hover:shadow-white/20 hover:scale-[1.02] transition-all w-full"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                                </svg>
                                CONTACTER LE SUPPORT
                            </a>
                            <button
                                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-tight rounded-2xl h-12 text-sm shadow-lg transition-all w-full cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                                </svg>
                                DÉCONNEXION
                            </button>
                        </div>

                        <p className="text-xs sm:text-sm text-white/20 mt-2">support@kdufoot.com</p>
                    </div>
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
