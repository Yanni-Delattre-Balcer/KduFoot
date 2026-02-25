-- Add location columns and level to matches table
ALTER TABLE matches ADD COLUMN location_address TEXT;
ALTER TABLE matches ADD COLUMN location_city TEXT;
ALTER TABLE matches ADD COLUMN location_zip TEXT;
-- Note: 'level' was already added in 0007_add_level_to_matches.sql, 
-- but location_address, location_city, location_zip were missing.
