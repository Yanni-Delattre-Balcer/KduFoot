-- apps/cloudflare-worker/migrations/0014_add_tournament_pairings.sql
-- Table tournament_pairings (Matches within a tournament)

CREATE TABLE tournament_pairings (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL, -- The tournament ID (from matches table)
  team_a_club_id TEXT NOT NULL,
  team_b_club_id TEXT NOT NULL,
  scheduled_time TEXT NOT NULL, -- HH:MM
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (team_a_club_id) REFERENCES clubs(id),
  FOREIGN KEY (team_b_club_id) REFERENCES clubs(id)
);

CREATE INDEX idx_tournament_pairings_match_id ON tournament_pairings(match_id);
