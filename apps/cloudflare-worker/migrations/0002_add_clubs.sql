-- apps/cloudflare-worker/migrations/0002_add_clubs.sql
-- Table clubs (cache API SIRENE)
CREATE TABLE clubs (
  id TEXT PRIMARY KEY,
  siret TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  zip TEXT,
  logo_url TEXT,
  latitude REAL,
  longitude REAL,
  cached_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER
);

CREATE INDEX idx_clubs_siret ON clubs(siret);
CREATE INDEX idx_clubs_city ON clubs(city);
