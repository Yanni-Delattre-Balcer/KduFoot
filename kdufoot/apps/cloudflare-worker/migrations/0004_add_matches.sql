-- apps/cloudflare-worker/migrations/0004_add_matches.sql
-- Table matches
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  club_id TEXT NOT NULL,
  category TEXT NOT NULL,
  format TEXT NOT NULL CHECK(format IN ('11v11', '8v8', '5v5', 'Futsal')),
  match_date TEXT NOT NULL, -- ISO 8601
  match_time TEXT NOT NULL, -- HH:MM
  venue TEXT NOT NULL CHECK(venue IN ('Domicile', 'Extérieur', 'Neutre')),
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'found', 'expired')),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (club_id) REFERENCES clubs(id)
);

CREATE INDEX idx_matches_owner_id ON matches(owner_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_match_date ON matches(match_date);

-- Table match_contacts (clubs intéressés)
CREATE TABLE match_contacts (
  match_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT,
  contacted_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (match_id, user_id),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
