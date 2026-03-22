-- RGPD Audit Log table + inactive users tracking
-- Run: npx wrangler d1 execute kdufoot-db --file=add_rgpd_audit.sql

-- Table for RGPD compliance audit trail
CREATE TABLE IF NOT EXISTS rgpd_audit_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('export', 'delete', 'access', 'rectification')),
    details TEXT,
    performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_rgpd_audit_user ON rgpd_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_rgpd_audit_action ON rgpd_audit_log(action);

-- Add inactive_since column to users for data retention policy
ALTER TABLE users ADD COLUMN inactive_since DATETIME DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_users_inactive ON users(inactive_since) WHERE inactive_since IS NOT NULL;
