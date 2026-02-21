-- apps/cloudflare-worker/migrations/0006_automate_matches.sql

-- Add columns to matches for tournament support
ALTER TABLE matches ADD COLUMN type TEXT DEFAULT 'match' CHECK(type IN ('match', 'tournament'));
ALTER TABLE matches ADD COLUMN max_teams INTEGER;
ALTER TABLE matches ADD COLUMN registration_fee REAL;
ALTER TABLE matches ADD COLUMN match_end_time TEXT; -- HH:MM

-- Add status to match_contacts for the request workflow
ALTER TABLE match_contacts ADD COLUMN status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'refused'));
