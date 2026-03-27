-- Migration: Add rgpd_audit_log table for tracking data exports and deletions
-- This ensures compliance with GDPR requirements.

CREATE TABLE IF NOT EXISTS rgpd_audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'export', 'delete', 'update_pii'
    details TEXT,
    performed_at INTEGER DEFAULT (unixepoch()),
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rgpd_audit_user_id ON rgpd_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_rgpd_audit_performed_at ON rgpd_audit_log(performed_at DESC);
