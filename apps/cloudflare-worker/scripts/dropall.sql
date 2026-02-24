-- Drop index if exists
DROP INDEX IF EXISTS idx_users_auth0_sub;
DROP INDEX IF EXISTS idx_users_email;

-- Drop table if exists
DROP TABLE IF EXISTS users;
-- Drop index if exists
DROP INDEX IF EXISTS idx_clubs_siret;
DROP INDEX IF EXISTS idx_clubs_city;
-- Drop indexes
DROP INDEX IF EXISTS idx_exercises_user_id;
DROP INDEX IF EXISTS idx_exercises_category;
DROP INDEX IF EXISTS idx_exercises_level;
DROP INDEX IF EXISTS idx_exercises_created_at;
-- Drop indexes
DROP INDEX IF EXISTS idx_matches_owner_id;
DROP INDEX IF EXISTS idx_matches_status;
DROP INDEX IF EXISTS idx_matches_match_date;
-- Drop table if exists
DROP TABLE IF EXISTS d1_migrations;
DROP TABLE IF EXISTS clubs;

-- Drop tables
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS exercises;


-- Drop tables
DROP TABLE IF EXISTS match_contacts;
DROP TABLE IF EXISTS matches;
-- Drop indexes
DROP INDEX IF EXISTS idx_match_details_match_id;

-- Drop table if exists
DROP TABLE IF EXISTS match_details;
-- Drop indexes
DROP INDEX IF EXISTS idx_sessions_user_id;
DROP INDEX IF EXISTS idx_sessions_status;

-- Drop tables
DROP TABLE IF EXISTS history;
DROP TABLE IF EXISTS session_exercises;
DROP TABLE IF EXISTS training_sessions;