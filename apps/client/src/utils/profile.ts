import { User } from '@/types/user.types';

export const isProfileComplete = (user: User | null): boolean => {
    if (!user) return false;

    // Configuration 100% Strict : TOUTES les informations sont obligatoires pour débloquer le cadenas
    const cleanSiret = user.siret?.replace(/\s/g, '') || "";
    const hasFullClub = (cleanSiret.length === 9 || cleanSiret.length === 14) && (!!user.club?.name || !!user.club_id);
    const hasFullPersonalInfo = !!user.firstname && !!user.lastname && !!user.phone && !!user.license_id;
    const hasFullSportsProfile = !!user.category && !!user.level && !!user.pitch_type && !!user.club_colors;

    const isComplete = hasFullClub && hasFullPersonalInfo && hasFullSportsProfile;

    // L'argument 'lenient' est ignoré pour garantir une sécurité totale partout
    return isComplete;
};
