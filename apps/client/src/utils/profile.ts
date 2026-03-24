import { User } from "@/types/user.types";

export const isProfileComplete = (
  user: User | null,
  lenient: boolean = false,
): boolean => {
  if (!user) return false;

  // 1. Identité : Prénom, Nom, Téléphone
  const hasFullIdentity = !!user.firstname && !!user.lastname && !!user.phone;

  // 2. Sportif : Numéro de licence, Catégorie, Niveau
  const hasFullSportsInfo =
    !!user.license_id && !!user.category && !!user.level;

  // 3. Localisation : Nom du club, Ville, Adresse du stade
  // Note: club.name est souvent renseigné via club_id
  const hasFullLocation =
    (!!user.club?.name || !!user.club_id) &&
    !!user.location &&
    !!user.stadium_address;

  // 4. Équipement : Couleur maillot Domicile, Couleur maillot Extérieur
  const hasFullEquipment = !!user.home_jersey_color && !!user.away_jersey_color;

  const isComplete =
    hasFullIdentity && hasFullSportsInfo && hasFullLocation && hasFullEquipment;

  if (lenient) {
    // En mode souple, on peut être moins strict sur certains champs si besoin,
    // mais pour l'instant on suit la règle unifiée demandée.
    return isComplete;
  }

  return isComplete;
};
