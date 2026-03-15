-- Migration: Add has_synced_calendar to users table
ALTER TABLE users ADD COLUMN has_synced_calendar BOOLEAN DEFAULT 0;
