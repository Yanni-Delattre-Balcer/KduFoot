-- apps/cloudflare-worker/migrations/0001_initial.sql
-- Table users (synchronisée avec Auth0)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  auth0_sub TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  firstname TEXT NOT NULL,
  lastname TEXT NOT NULL,
  club_id TEXT,
  siret TEXT,
  location TEXT,
  phone TEXT,
  license_id TEXT,
  category TEXT,
  level TEXT,
  stadium_address TEXT,
  latitude REAL,
  longitude REAL,
  subscription TEXT DEFAULT 'Free' CHECK(subscription IN ('Free', 'Pro', 'Ultime')),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_users_auth0_sub ON users(auth0_sub);
CREATE INDEX idx_users_email ON users(email);
