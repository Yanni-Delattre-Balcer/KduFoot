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
    (!!user.club?.name || !!user.club_id) && !!user.stadium_address;

  // 4. Équipement : Couleur maillot Domicile, Couleur maillot Extérieur
  const hasFullEquipment = !!user.home_jersey_color && !!user.away_jersey_color;

  const isPrimaryComplete =
    hasFullIdentity && hasFullSportsInfo && hasFullLocation && hasFullEquipment;

  // 5. Clubs additionnels : Chaque club doit avoir ses adresses et son profil sportif
  let areAdditionalClubsComplete = true;

  if (user.additional_sirets && Array.isArray(user.additional_sirets)) {
    for (const item of user.additional_sirets) {
      if (typeof item === "string") {
        // Juste un SIRET sans données -> Incomplet
        areAdditionalClubsComplete = false;
        break;
      }
      // Vérification des champs requis pour un club secondaire (Tout doit être obligatoire)
      // Note: hq_address est obligatoire en théorie, mais comme il n'est pas éditable,
      // on ne bloque pas le compte s'il est manquant dans les données SIRET pour ne pas
      // créer d'impasse (soft requirement).
      const isClubComplete =
        !!item.category &&
        !!item.level &&
        !!item.home_jersey_color &&
        !!item.away_jersey_color &&
        !!item.stadium_address;

      if (!isClubComplete) {
        areAdditionalClubsComplete = false;
        break;
      }
    }
  }

  const isComplete = isPrimaryComplete && areAdditionalClubsComplete;

  if (lenient) {
    // En mode souple, on peut être moins strict sur certains champs si besoin,
    // mais pour l'instant on suit la règle unifiée demandée.
    return isComplete;
  }

  return isComplete;
};
