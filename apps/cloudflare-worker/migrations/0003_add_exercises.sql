-- apps/cloudflare-worker/migrations/0003_add_exercises.sql
-- Table exercises
CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  synopsis TEXT,
  svg_schema TEXT,
  themes TEXT, -- JSON array: ["TECHNIQUE", "TACTIQUE"]
  nb_joueurs TEXT,
  dimensions TEXT,
  materiel TEXT,
  category TEXT,
  level TEXT,
  duration TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  video_start_seconds INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_exercises_user_id ON exercises(user_id);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_level ON exercises(level);
CREATE INDEX idx_exercises_created_at ON exercises(created_at DESC);

-- Table favorites
CREATE TABLE favorites (
  user_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, exercise_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);
