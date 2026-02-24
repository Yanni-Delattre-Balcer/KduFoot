-- apps/cloudflare-worker/migrations/0006_add_match_details.sql
-- Table match_details

CREATE TABLE match_details (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  opponent_club_id TEXT,
  opponent_club_name TEXT,
  opponent_club_address TEXT,
  opponent_club_city TEXT,
  opponent_club_zip TEXT,
  opponent_club_country TEXT,
  match_type TEXT CHECK(match_type IN ('Championnat', 'Coupe', 'Amical', 'Tournoi')),
  match_status TEXT CHECK(match_status IN ('Prévu', 'En cours', 'Terminé')),
  result_home_score INTEGER,
  result_away_score INTEGER,
  result_details TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE INDEX idx_match_details_match_id ON match_details(match_id);
