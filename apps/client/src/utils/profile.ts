import { User } from '@/types/user.types';

export const isProfileComplete = (user: User | null): boolean => {
    if (!user) return false;

    // Strict 100% completeness check
    const hasClub = !!user.club?.siret && !!user.club?.name;
    const hasPersonalInfo = !!user.firstname && !!user.lastname && !!user.phone;
    const hasSportsProfile = !!user.category && !!user.level && !!user.pitch_type && !!user.club_colors;

    return hasClub && hasPersonalInfo && hasSportsProfile;
};
