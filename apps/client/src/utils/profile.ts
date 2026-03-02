import { User } from '@/types/user.types';

export const isProfileComplete = (user: User | null, lenient: boolean = false): boolean => {
    if (!user) return false;

    // Configuration Club
    const cleanSiret = user.siret?.replace(/\s/g, '') || "";
    const hasFullClub = (cleanSiret.length === 9 || cleanSiret.length === 14) && (!!user.club?.name || !!user.club_id);

    // Configuration Personnelle
    const hasFullPersonalInfo = !!user.firstname && !!user.lastname && !!user.phone && !!user.license_id;

    // Configuration Sportive
    const hasFullSportsProfile = !!user.category && !!user.level && !!user.pitch_type && !!user.club_colors;

    if (lenient) {
        // En mode souple, on débloque le dashboard si les infos de base et club sont là
        return hasFullClub && hasFullPersonalInfo;
    }

    return hasFullClub && hasFullPersonalInfo && hasFullSportsProfile;
};
