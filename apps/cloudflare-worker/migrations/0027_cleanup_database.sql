-- Migration: Cleanup redundant tables and columns
-- 1. Remove unused legacy tables
DROP TABLE IF EXISTS match_details;
DROP TABLE IF EXISTS history;

-- 2. Remove redundant columns from users table
-- SQLite doesn't support DROP COLUMN in older versions, but Cloudflare D1 (SQLite 3) does.
ALTER TABLE users DROP COLUMN club_colors;
ALTER TABLE users DROP COLUMN calendar_dismissed;
