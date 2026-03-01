import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { User } from '@/types/user.types';
import { isProfileComplete } from '@/utils/profile';
import { useWelcomeGateway } from '@/contexts/welcome-gateway-context';

interface UserContextType {
    user: User | null;
    isLoading: boolean;
    error: Error | null;
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

export function UserProvider({ children }: { children: ReactNode }) {
    const { getAccessTokenSilently, isAuthenticated } = useAuth0();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [notifications, setNotifications] = useState({ pendingRequests: 0, modifiedParticipations: 0 });
    const { isVisitor } = useWelcomeGateway();

    const profileComplete = isProfileComplete(user);
    const isLocked = !profileComplete && !isVisitor && !!user;

    const fetchUser = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsLoading(true);
        try {
            const token = await getAccessTokenSilently();
            // Using the batched context endpoint to save KV quotas
            const res = await fetch(`${import.meta.env.API_BASE_URL}/api/me/context`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch user context');
            const data = await res.json();
            setUser(data.user);
            if (data.notifications) {
                setNotifications(data.notifications);
            }
        } catch (e: any) {
            console.error(e);
            setError(e);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, getAccessTokenSilently]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchUser();
        } else {
            setUser(null);
            setNotifications({ pendingRequests: 0, modifiedParticipations: 0 });
        }
    }, [fetchUser, isAuthenticated]);

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
                // Not JSON
                errorMessage = `${errorMessage} (Status: ${res.status})`;
            }
            throw new Error(errorMessage);
        }

        const data = await res.json();
        setUser(data.user || data);
        return data;
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

        // Refresh user data
        await fetchUser();
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
        setUser(resData.user || resData);
        return resData;
    };

    return (
        <UserContext.Provider value={{
            user,
            isLoading,
            error,
            linkClub,
            unlinkClub,
            updateUser,
            refetch: fetchUser,
            profileComplete,
            isLocked,
            notifications
        }}>
            {children}
        </UserContext.Provider>
    );
}

import { useContext } from 'react';
export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
