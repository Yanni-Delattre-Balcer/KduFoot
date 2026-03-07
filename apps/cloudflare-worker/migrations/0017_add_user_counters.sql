-- apps/cloudflare-worker/migrations/0017_add_user_counters.sql
-- Add block_count and siret_change_count to users table if they don't exist

ALTER TABLE users ADD COLUMN block_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN siret_change_count INTEGER DEFAULT 0;
