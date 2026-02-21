import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { User } from '@/types/user.types';

const API_URL = import.meta.env.VITE_API_URL;

interface UserContextType {
    user: User | null;
    isLoading: boolean;
    error: Error | null;
    linkClub: (siret: string) => Promise<any>;
    unlinkClub: () => Promise<void>;
    updateUser: (data: Partial<User>) => Promise<any>;
    refetch: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const { getAccessTokenSilently, isAuthenticated } = useAuth0();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchUser = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsLoading(true);
        try {
            const token = await getAccessTokenSilently();
            const res = await fetch(`${API_URL}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch user');
            const data = await res.json();
            setUser(data.user || data);
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
        }
    }, [fetchUser, isAuthenticated]);

    const linkClub = async (siret: string) => {
        const token = await getAccessTokenSilently();
        const res = await fetch(`${API_URL}/api/users/link-club`, {
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
        const res = await fetch(`${API_URL}/api/users/unlink-club`, {
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
        const res = await fetch(`${API_URL}/api/users/me`, {
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
        <UserContext.Provider value={{ user, isLoading, error, linkClub, unlinkClub, updateUser, refetch: fetchUser }}>
            {children}
        </UserContext.Provider>
    );
}
