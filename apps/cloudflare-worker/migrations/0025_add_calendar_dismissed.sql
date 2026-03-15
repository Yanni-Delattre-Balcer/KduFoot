-- Migration: Add calendar_dismissed to users table
ALTER TABLE users ADD COLUMN calendar_dismissed BOOLEAN DEFAULT 0;
