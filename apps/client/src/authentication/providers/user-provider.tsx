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
    refetch: () => Promise<void>;
    profileComplete: boolean;
    isLocked: boolean;
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
    // Zéro Friction: Lock status depends ONLY on data, not on loading state to avoid UI lag
    const isLocked = !!user && !isVisitor && !isProfileComplete(user, true);

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

    const value = useMemo(() => ({
        user,
        isLoading,
        error,
        linkClub,
        unlinkClub,
        updateUser,
        refetch: async () => { await mutate(CONTEXT_KEY); },
        profileComplete,
        isLocked,
        notifications
    }), [user, isLoading, error, profileComplete, isLocked, notifications, getAccessTokenSilently]);

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
