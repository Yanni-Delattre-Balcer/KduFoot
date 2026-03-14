export interface User {
  id: string;
  auth0_sub: string;
  email: string;
  firstname: string;
  lastname: string;
  club_id?: string | null;
  siret?: string | null;
  location?: string | null; // This is actually the user's city
  phone?: string | null;
  license_id?: string | null;
  category?: string | null;
  level?: string | null;
  pitch_type?: string | null;
  club_colors?: string | null;
  home_jersey_color?: string | null;
  away_jersey_color?: string | null;
  stadium_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  picture?: string | null;
  subscription: "Free" | "Pro" | "Ultime";
  is_blocked?: boolean;
  block_reason?: string | null;
  calendar_token?: string | null;
  additional_sirets?:
    | (string | { siret: string; stadium_address?: string | null })[]
    | null;
  additional_clubs?:
    | {
        id: string;
        siret: string;
        name: string;
        address?: string;
        city?: string;
        zip?: string;
        latitude?: number | null;
        longitude?: number | null;
        stadium_address?: string | null;
      }[]
    | null;
  created_at: number;
  updated_at: number;
  club?: Club; // Computed/Joined field if needed
}

export interface Club {
  id: string;
  siret: string;
  name: string;
  city: string;
  address?: string;
  zip?: string;
  logo_url?: string;
  latitude?: number;
  longitude?: number;
  home_jersey_color?: string;
  away_jersey_color?: string;
}

export interface LinkClubDto {
  siret: string;
}
