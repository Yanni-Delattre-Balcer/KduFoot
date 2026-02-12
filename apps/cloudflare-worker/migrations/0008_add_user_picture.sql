-- Migration number: 0008 	 2026-02-12T02:40:00.000Z
-- Add picture column to users table to persist custom avatars
ALTER TABLE users ADD COLUMN picture TEXT;
