-- apps/cloudflare-worker/migrations/0013_add_notifications_to_contacts.sql
-- Add columns to handle post-validation notifications and cancellations

ALTER TABLE match_contacts ADD COLUMN notification_state INTEGER DEFAULT 0; -- 0: none, 1: modified, 2: cancelled
ALTER TABLE match_contacts ADD COLUMN cancellation_reason TEXT;

-- Update status check if possible? 
-- SQLite doesn't support easy ALTER TABLE to change CHECK constraints. 
-- However, we can use the app logic to enforce new statuses: 'cancelled_by_owner', 'cancelled_by_guest'.
