-- Performance indexes for geospatial queries, filtered searches, and joins
-- These complement the indexes added in earlier migrations.

-- Composite index for bounding-box geospatial pre-filtering (clubs lat/lng)
CREATE INDEX IF NOT EXISTS idx_clubs_lat_lng ON clubs(latitude, longitude);

-- Match filter indexes (category, level, deleted_at are frequently filtered)
CREATE INDEX IF NOT EXISTS idx_matches_category ON matches(category);
CREATE INDEX IF NOT EXISTS idx_matches_level ON matches(level);
CREATE INDEX IF NOT EXISTS idx_matches_deleted_at ON matches(deleted_at);

-- match_contacts: user-side queries and status filters
CREATE INDEX IF NOT EXISTS idx_match_contacts_user_id ON match_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_match_contacts_status ON match_contacts(status);

-- Training sessions: date-range queries and soft-delete filtering
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_date ON training_sessions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON training_sessions(deleted_at);

-- score_updates: match-id lookup
CREATE INDEX IF NOT EXISTS idx_score_updates_match_id ON score_updates(match_id);
