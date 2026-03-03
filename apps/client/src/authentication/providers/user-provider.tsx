import { createContext, useCallback, ReactNode, useMemo, useContext } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import useSWR, { mutate } from 'swr';
import { User } from '@/types/user.types';
import { isProfileComplete } from '@/utils/profile';
import { useWelcomeGateway } from '@/contexts/welcome-gateway-context';

interface UserContextType {
    user: User | null;
    isLoading: boolean;
    error: any;
    linkClub: (siret: string) => Promise<any>;
    unlinkClub: () => Promise<void>;
    updateUser: (data: Partial<User>) => Promise<any>;
    blockUser: (userId: string, isBlocked: boolean) => Promise<void>;
    refetch: () => Promise<void>;
    profileComplete: boolean;
    isLocked: boolean;
    isAdmin: boolean;
    isBlocked: boolean;
    notifications: {
        pendingRequests: number;
        modifiedParticipations: number;
    };
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

const CONTEXT_KEY = '/api/me/context';

export function UserProvider({ children }: { children: ReactNode }) {
    const { getAccessTokenSilently, isAuthenticated } = useAuth0();
    const { isVisitor } = useWelcomeGateway();

    const fetcher = useCallback(async () => {
        if (!isAuthenticated) return null;
        const token = await getAccessTokenSilently();
        const res = await fetch(`${import.meta.env.API_BASE_URL}${CONTEXT_KEY}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch user context');
        return res.json();
    }, [isAuthenticated, getAccessTokenSilently]);

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

    // SÉCURITÉ RÉACTIVE : Le cadenas est activé par défaut à la connexion (isAuthenticated)
    // On ne déverrouille QUE si le profil est chargé ET complet, ou si on est en mode Visiteur.
    const isLocked = isAuthenticated && !isVisitor && (!user || !isProfileComplete(user, true));

    const isAdmin = user?.email === 'yannidelattrebalcer.artois@gmail.com';
    const isBlocked = !!user?.is_blocked;

    const linkClub = async (siret: string) => {
        const token = await getAccessTokenSilently();
        const res = await fetch(`${import.meta.env.API_BASE_URL}/api/users/link-club`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ siret }),
        });

        if (!res.ok) {
            const errorText = await res.text().catch(() => '');
            let errorMessage = 'Failed to link club';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = `${errorMessage} (Status: ${res.status})`;
            }
            throw new Error(errorMessage);
        }

        const resData = await res.json();
        // Trigger a global mutation to refresh all subscribers
        await mutate(CONTEXT_KEY);
        return resData;
    };

    const unlinkClub = async () => {
        const token = await getAccessTokenSilently();
        const res = await fetch(`${import.meta.env.API_BASE_URL}/api/users/unlink-club`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to unlink club');
        }

        await mutate(CONTEXT_KEY);
    };

    const updateUser = async (data: Partial<User>) => {
        const token = await getAccessTokenSilently();
        const res = await fetch(`${import.meta.env.API_BASE_URL}/api/users/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to update user');
        }

        const resData = await res.json();
        await mutate(CONTEXT_KEY);
        return resData;
    };

    const blockUser = async (userId: string, isBlocked: boolean) => {
        const token = await getAccessTokenSilently();
        const res = await fetch(`${import.meta.env.API_BASE_URL}/api/admin/users/${userId}/block`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ is_blocked: isBlocked }),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to block user');
        }
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
        notifications
    }), [user, isLoading, error, profileComplete, isLocked, isAdmin, isBlocked, notifications, getAccessTokenSilently]);

    return (
        <UserContext.Provider value={value}>
            {isBlocked && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-6">
                    <div className="max-w-md w-full bg-content1 border border-danger-200 shadow-2xl rounded-3xl p-8 text-center flex flex-col items-center gap-6 animate-appearance-in">
                        <div className="p-4 rounded-full bg-danger-100 text-danger border border-danger-200">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
                                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Accès Verrouillé</h1>
                        <p className="text-default-600 font-medium leading-relaxed">
                            Vous avez été bloqué temporairement par les gérants de <strong>Kdufoot</strong>.
                            Veuillez nous contacter par mail pour plus d'informations.
                        </p>
                        <a
                            href="mailto:support@kdufoot.com"
                            className="text-primary font-bold hover:underline"
                        >
                            support@kdufoot.com
                        </a>
                    </div>
                </div>
            )}
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
