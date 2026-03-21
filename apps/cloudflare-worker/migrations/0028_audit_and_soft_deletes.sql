-- Soft Deletes
ALTER TABLE matches ADD COLUMN deleted_at DATETIME DEFAULT NULL;
ALTER TABLE matches ADD COLUMN score_a INTEGER DEFAULT NULL;
ALTER TABLE matches ADD COLUMN score_b INTEGER DEFAULT NULL;
ALTER TABLE training_sessions ADD COLUMN deleted_at DATETIME DEFAULT NULL;

-- Audit Trail Scores
CREATE TABLE score_updates (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    admin_user_id TEXT NOT NULL,
    old_score_a INTEGER,
    old_score_b INTEGER,
    new_score_a INTEGER,
    new_score_b INTEGER,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (match_id) REFERENCES matches(id),
    FOREIGN KEY (admin_user_id) REFERENCES users(id)
);
