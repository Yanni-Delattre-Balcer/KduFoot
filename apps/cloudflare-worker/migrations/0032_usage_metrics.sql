-- apps/cloudflare-worker/migrations/0032_usage_metrics.sql
CREATE TABLE IF NOT EXISTS user_usage (
    user_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    last_reset_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, metric_name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_usage_user_id ON user_usage(user_id);
