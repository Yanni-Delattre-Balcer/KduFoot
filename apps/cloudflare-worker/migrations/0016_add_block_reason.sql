-- apps/cloudflare-worker/migrations/0016_add_block_reason.sql
-- Add block_reason column for banned users motif

ALTER TABLE users ADD COLUMN block_reason TEXT DEFAULT NULL;
