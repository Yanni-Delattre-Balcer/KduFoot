/*
 * Copyright (c) 2026 Ronan LE MEILLAT
 * License: AGPL-3.0-or-later
 */

import { Category } from "./exercise.types";

export interface Match {
  id: string;
  owner_id: string;
  club_id: string;
  club: Club;
  type: "match" | "tournament";
  name?: string;
  category: Category;
  format: Format;
  level?: Level;
  match_date: string; // ISO 8601
  match_time: string; // HH:MM
  match_end_time?: string;
  venue: Venue;
  location_address?: string;
  location_city?: string;
  location_zip?: string;
  pitch_type?: PitchType;
  jersey_color?: string;
  email: string;
  phone: string;
  notes?: string;
  max_teams?: number;
  registration_fee?: number;
  status: MatchStatus;
  contacts?: MatchContact[];
  contacts_count?: number;
  accepted_count?: number;
  updated_at: string;
  // Distance fields (returned when radius filter is active)
  distance_km?: number;
  distance_approximate?: boolean;
  pairings?: TournamentPairing[];
}

export type MatchDiff = Partial<Record<keyof Match, boolean>>;

export interface TournamentPairing {
  id: string;
  match_id: string;
  team_a_club_id: string;
  team_b_club_id: string;
  team_a_club_name?: string;
  team_a_club_logo?: string;
  team_b_club_name?: string;
  team_b_club_logo?: string;
  scheduled_time: string; // HH:MM
  created_at: string;
  updated_at: string;
}

export type Format = "11v11" | "8v8" | "7v7" | "5v5" | "Futsal";
export type Venue = "Domicile" | "Extérieur";
export type PitchType =
  | "Herbe"
  | "Synthétique"
  | "Hybride"
  | "Stabilisé"
  | "Toutes surfaces";
export enum Level {
  LIGUE_1 = "Ligue 1",
  LIGUE_2 = "Ligue 2",
  NATIONAL = "National",
  NATIONAL_2 = "National 2",
  NATIONAL_3 = "National 3",
  REGIONAL_1 = "Régional 1",
  REGIONAL_2 = "Régional 2",
  REGIONAL_3 = "Régional 3",
  DEPARTEMENTAL_1 = "Départemental 1",
  DEPARTEMENTAL_2 = "Départemental 2",
  DEPARTEMENTAL_3 = "Départemental 3",
  DEPARTEMENTAL_4 = "Départemental 4",
  DEPARTEMENTAL_5 = "Départemental 5",
  AUTRE = "Autre",
}
export type MatchStatus = "active" | "found" | "expired";

export interface MatchContact {
  user_id: string;
  club_id?: string;
  club_name?: string;
  club_logo?: string;
  message: string;
  contacted_at: string;
  status: "pending" | "accepted" | "refused" | "withdrawn";
  home_jersey_color?: string;
  away_jersey_color?: string;
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

export interface CreateMatchDto {
  club_id: string;
  type: "match" | "tournament";
  name?: string;
  category: Category;
  level?: Level;
  format: Format;
  match_date: string;
  match_time: string;
  match_end_time?: string;
  venue: Venue;
  location_address?: string;
  location_city?: string;
  location_zip?: string;
  pitch_type?: PitchType;
  jersey_color?: string;
  email: string;
  phone: string;
  notes?: string;
  max_teams?: number;
  registration_fee?: number;
}

export interface UpdateMatchDto extends Partial<CreateMatchDto> {
  status?: MatchStatus;
}

export interface ContactMatchDto {
  message: string;
}

export interface MatchFilters {
  type?: "match" | "tournament";
  category?: Category;
  level?: Level;
  format?: Format;
  venue?: Venue | "Peu importe";
  pitch_type?: PitchType;
  status?: MatchStatus;
  date?: string;
  location_city?: string;
  location_zip?: string;
  radius_km?: number;
  user_lat?: number;
  user_lng?: number;
  limit?: number;
  cursor?: string;
  notes?: string;
  ownerId?: string;
  include_past?: boolean;
}

export interface MatchRequest {
  match_id: string;
  match_type: "match" | "tournament";
  match_date: string;
  match_time: string;
  match_category?: Category;
  match_max_teams?: number;
  venue: Venue;
  location_city?: string;
  requester_user_id: string;
  requester_firstname?: string;
  requester_lastname?: string;
  requester_club_name?: string;
  requester_club_logo?: string;
  requester_city?: string;
  requester_category?: Category;
  requester_level?: Level;
  requester_club_address?: string;
  requester_phone?: string;
  requester_email?: string;
  requester_home_jersey_color?: string;
  requester_away_jersey_color?: string;
  request_status: "pending" | "accepted" | "refused" | "withdrawn";
  message?: string;
  contacted_at: string;
  accepted_count?: number;
  match_format?: Format;
  match_level?: Level;
  match_pitch_type?: PitchType;
  // Normalized/Legacy fields for dashboard mapping
  format?: Format;
  category?: Category;
  level?: Level;
  pitch_type?: PitchType;
  notification_state?: number;
  owner_id?: string;
  is_organizer?: boolean;
}

export interface MatchParticipation extends MatchRequest {
  host_club_name?: string;
  host_club_logo?: string;
  host_city?: string;
  host_category?: Category;
  host_level?: Level;
  host_club_colors?: string;
  host_stadium_address?: string;
  host_firstname?: string;
  host_lastname?: string;
  host_phone?: string;
  host_email?: string;
  host_home_jersey_color?: string;
  host_away_jersey_color?: string;
  notification_state?: number; // 0: normal, 1: modified
}

export interface DashboardMatch extends MatchParticipation {
  _source: "organizer" | "participant";
  opponent_club_name?: string;
  opponent_club_logo?: string;
  opponent_city?: string;
  opponent_category?: Category;
  opponent_level?: Level;
  opponent_club_address?: string;
  opponent_home_jersey_color?: string;
  opponent_away_jersey_color?: string;
  opponent_pitch_type?: PitchType;
  opponent_stadium_address?: string;
  opponent_club_colors?: string;
  isUserHome?: boolean;
  max_teams?: number;
  accepted_count: number;
  accepted_teams?: { name?: string; logo_url?: string }[];
  name?: string;
  host_home_jersey_color?: string;
  host_away_jersey_color?: string;
  entry_fee?: number;
  location_address?: string;
  host_phone?: string;
  opponent_phone?: string;
  // Normalized field mapping fallbacks
  format?: Format;
  category?: Category;
  level?: Level;
  pitch_type?: PitchType;
}
