import { useAuth0 } from '@auth0/auth0-react';
import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types/user.types';

const API_URL = import.meta.env.VITE_API_URL;

export function useUser() {
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
            setError(e);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, getAccessTokenSilently]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

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
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to link club');
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

    return { user, isLoading, error, linkClub, unlinkClub, updateUser, refetch: fetchUser };
}
