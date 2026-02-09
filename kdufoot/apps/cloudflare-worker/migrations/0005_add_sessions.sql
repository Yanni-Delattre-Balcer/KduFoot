-- apps/cloudflare-worker/migrations/0005_add_sessions.sql
-- Table training_sessions
CREATE TABLE training_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  category TEXT,
  level TEXT,
  total_duration INTEGER,
  constraints TEXT, -- JSON
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'scheduled', 'completed')),
  scheduled_date TEXT, -- ISO 8601
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON training_sessions(user_id);
CREATE INDEX idx_sessions_status ON training_sessions(status);

-- Table session_exercises (jonction)
CREATE TABLE session_exercises (
  session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  duration INTEGER,
  players INTEGER,
  adapted_data TEXT, -- JSON si exercice adapté
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (session_id, exercise_id),
  FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

-- Table history
CREATE TABLE history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  completed_at INTEGER NOT NULL,
  duration_seconds INTEGER,
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_history_user_id ON history(user_id);
CREATE INDEX idx_history_completed_at ON history(completed_at DESC);
