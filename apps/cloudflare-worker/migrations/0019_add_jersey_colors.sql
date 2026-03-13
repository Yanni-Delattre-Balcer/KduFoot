-- Migration number: 0019 	 2024-05-23T12:00:00.000Z
ALTER TABLE users ADD COLUMN home_jersey_color TEXT;
ALTER TABLE users ADD COLUMN away_jersey_color TEXT;
