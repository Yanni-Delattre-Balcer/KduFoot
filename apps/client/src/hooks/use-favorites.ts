import { useState, useEffect } from 'react';

type FavoriteType = 'exercise' | 'match';

export function useFavorites() {
    const [favorites, setFavorites] = useState<{ exercises: string[], matches: string[] }>({
        exercises: [],
        matches: []
    });

    useEffect(() => {
        const stored = localStorage.getItem('kdufoot_favorites');
        if (stored) {
            try {
                setFavorites(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse favorites", e);
            }
        }
    }, []);

    const saveFavorites = (newFavs: { exercises: string[], matches: string[] }) => {
        setFavorites(newFavs);
        localStorage.setItem('kdufoot_favorites', JSON.stringify(newFavs));
    };

    const toggleFavorite = (id: string, type: FavoriteType) => {
        const list = type === 'exercise' ? favorites.exercises : favorites.matches;
        const exists = list.includes(id);
        const newList = exists ? list.filter(fid => fid !== id) : [...list, id];

        const newFavs = {
            ...favorites,
            [type === 'exercise' ? 'exercises' : 'matches']: newList
        };
        saveFavorites(newFavs);
    };

    const isFavorite = (id: string, type: FavoriteType) => {
        return (type === 'exercise' ? favorites.exercises : favorites.matches).includes(id);
    };

    return { favorites, toggleFavorite, isFavorite };
}
