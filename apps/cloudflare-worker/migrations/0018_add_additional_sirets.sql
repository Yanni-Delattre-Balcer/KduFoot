-- apps/cloudflare-worker/migrations/0018_add_additional_sirets.sql
-- Add additional_sirets column to users table

ALTER TABLE users ADD COLUMN additional_sirets TEXT DEFAULT '[]';
