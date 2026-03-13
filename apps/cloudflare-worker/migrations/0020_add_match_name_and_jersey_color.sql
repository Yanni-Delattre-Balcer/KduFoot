-- Migration number: 0020 	 2024-05-23T12:00:00.000Z
ALTER TABLE matches ADD COLUMN name TEXT;
ALTER TABLE matches ADD COLUMN jersey_color TEXT;
