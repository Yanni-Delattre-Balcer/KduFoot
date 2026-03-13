-- apps/cloudflare-worker/migrations/0022_add_push_subscription.sql
-- Add column to store Web Push subscription (JSON string)

ALTER TABLE users ADD COLUMN push_subscription TEXT;
