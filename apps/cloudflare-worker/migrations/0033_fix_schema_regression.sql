-- apps/cloudflare-worker/migrations/0033_fix_schema_regression.sql
-- URGENCE : Restaure les colonnes perdues lors de la migration 0031 (GDPR)
-- Cette migration recrée les tables matches et match_contacts avec le schéma complet.

-- 1. Table Matches
CREATE TABLE matches_tmp (
  id TEXT PRIMARY KEY,
  owner_id TEXT, -- GDPR Safe (Nullable)
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
  email TEXT, -- GDPR Safe
  phone TEXT, -- GDPR Safe
  notes TEXT,
  max_teams INTEGER,
  registration_fee REAL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'found', 'expired')),
  score_a INTEGER DEFAULT NULL,
  score_b INTEGER DEFAULT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  deleted_at DATETIME DEFAULT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (club_id) REFERENCES clubs(id)
);

-- On tente de récupérer les données existantes (les colonnes manquantes seront NULL pour les anciens records)
INSERT INTO matches_tmp (
    id, owner_id, club_id, category, format, match_date, match_time, venue, 
    email, phone, notes, status, created_at, updated_at, deleted_at, score_a, score_b
)
SELECT 
    id, owner_id, club_id, category, format, match_date, match_time, venue, 
    email, phone, notes, status, created_at, updated_at, deleted_at, score_a, score_b
FROM matches;

DROP TABLE matches;
ALTER TABLE matches_tmp RENAME TO matches;

-- 2. Table Match Contacts
CREATE TABLE match_contacts_tmp (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  user_id TEXT, -- GDPR Safe
  message TEXT,
  contacted_at INTEGER DEFAULT (unixepoch()),
  notification_state INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  cancellation_reason TEXT,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO match_contacts_tmp (id, match_id, user_id, message, contacted_at, notification_state, status)
SELECT id, match_id, user_id, message, contacted_at, notification_state, status FROM match_contacts;

DROP TABLE match_contacts;
ALTER TABLE match_contacts_tmp RENAME TO match_contacts;

-- 3. Rétablir les index de performance
CREATE INDEX idx_matches_owner_id ON matches(owner_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_match_date ON matches(match_date);
CREATE INDEX idx_match_contacts_match_id ON match_contacts(match_id);
CREATE INDEX idx_match_contacts_user_id ON match_contacts(user_id);
