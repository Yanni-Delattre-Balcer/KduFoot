-- apps/cloudflare-worker/migrations/0021_add_calendar_token.sql
-- Add calendar_token to users table for secure public ICS access

ALTER TABLE users ADD COLUMN calendar_token TEXT;
CREATE UNIQUE INDEX idx_users_calendar_token ON users(calendar_token);

-- Initialize existing users with a random UUID
-- Note: SQLite randomblob(16) generates binary, we want string. 
-- In D1, we might need a script to update existing rows properly if we want true UUIDs,
-- but for the migration, we'll just add the column and index.
-- The Service layer will handle generating tokens for users on next load/sync.
