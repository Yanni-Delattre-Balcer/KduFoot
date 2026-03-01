import { User } from '@/types/user.types';

export const isProfileComplete = (user: User | null): boolean => {
    if (!user) return false;

    // Based on user requirements: "Nom du club, SIRET, responsable, etc."
    const hasClub = !!user.club?.id && !!user.club?.siret && !!user.club?.name;
    const hasPersonalInfo = !!user.firstname && !!user.lastname && !!user.phone;
    const hasSportsProfile = !!user.category && !!user.level;

    return hasClub && hasPersonalInfo && hasSportsProfile;
};
