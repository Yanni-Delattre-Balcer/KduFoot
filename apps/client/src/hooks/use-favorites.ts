import { useState, useEffect } from 'react';

type FavoriteType = 'exercise' | 'match' | 'tournament';

export function useFavorites() {
    const [favorites, setFavorites] = useState<{ exercises: string[], matches: string[], tournaments: string[] }>(() => {
        if (typeof window === 'undefined') return { exercises: [], matches: [], tournaments: [] };
        const stored = localStorage.getItem('kdufoot_favorites');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse favorites", e);
            }
        }
        return { exercises: [], matches: [], tournaments: [] };
    });

    useEffect(() => {
        // Sync with storage events from other tabs if needed (optional but good)
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'kdufoot_favorites' && e.newValue) {
                setFavorites(JSON.parse(e.newValue));
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const saveFavorites = (newFavs: { exercises: string[], matches: string[], tournaments: string[] }) => {
        setFavorites(newFavs);
        localStorage.setItem('kdufoot_favorites', JSON.stringify(newFavs));
    };

    const toggleFavorite = (id: string, type: FavoriteType) => {
        const key = type === 'exercise' ? 'exercises' : type === 'match' ? 'matches' : 'tournaments';
        const list = favorites[key] || [];
        const exists = list.includes(id);
        const newList = exists ? list.filter(fid => fid !== id) : [...list, id];

        const newFavs = {
            ...favorites,
            [key]: newList
        };
        saveFavorites(newFavs);
    };

    const isFavorite = (id: string, type: FavoriteType) => {
        const key = type === 'exercise' ? 'exercises' : type === 'match' ? 'matches' : 'tournaments';
        return (favorites[key] || []).includes(id);
    };

    return { favorites, toggleFavorite, isFavorite };
}
