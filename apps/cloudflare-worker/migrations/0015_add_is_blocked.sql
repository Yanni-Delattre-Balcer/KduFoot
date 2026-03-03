-- apps/cloudflare-worker/migrations/0015_add_is_blocked.sql
-- Add is_blocked column to users table

ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT 0;
