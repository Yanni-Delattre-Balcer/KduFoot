-- apps/cloudflare-worker/migrations/0023_update_match_format_constraint.sql
-- Update format constraint to allow 7v7 and ensure 'name' column exists

CREATE TABLE matches_new (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  club_id TEXT NOT NULL,
  type TEXT DEFAULT 'match' CHECK(type IN ('match', 'tournament')),
  name TEXT,
  category TEXT NOT NULL,
  level TEXT,
  format TEXT NOT NULL CHECK(format IN ('11v11', '8v8', '7v7', '5v5', 'Futsal')),
  match_date TEXT NOT NULL,
  match_time TEXT NOT NULL,
  match_end_time TEXT,
  venue TEXT NOT NULL CHECK(venue IN ('Domicile', 'Extérieur', 'Neutre')),
  location_address TEXT,
  location_city TEXT,
  location_zip TEXT,
  pitch_type TEXT,
  jersey_color TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  max_teams INTEGER,
  registration_fee REAL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'found', 'expired')),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (club_id) REFERENCES clubs(id)
);

-- Copy data explicitly (excluding 'name' from SELECT because it is likely missing from source)
INSERT INTO matches_new (
  id, owner_id, club_id, type, category, level, format, match_date, match_time, match_end_time,
  venue, location_address, location_city, location_zip, pitch_type, jersey_color,
  email, phone, notes, max_teams, registration_fee, status, created_at, updated_at
)
SELECT 
  id, owner_id, club_id, type, category, level, format, match_date, match_time, match_end_time,
  venue, location_address, location_city, location_zip, pitch_type, jersey_color,
  email, phone, notes, max_teams, registration_fee, status, created_at, updated_at
FROM matches;

DROP TABLE matches;
ALTER TABLE matches_new RENAME TO matches;

CREATE INDEX idx_matches_owner_id ON matches(owner_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_match_date ON matches(match_date);
