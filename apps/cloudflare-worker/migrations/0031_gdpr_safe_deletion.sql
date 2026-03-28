-- apps/cloudflare-worker/migrations/0031_gdpr_safe_deletion.sql
-- Rendre les colonnes de référence utilisateur nullables pour permettre l'anonymisation

-- 1. Matches : owner_id devient optionnel
-- Note: SQLite ne supporte pas ALTER COLUMN, on utilise le contournement standard
-- Mais pour simplifier et comme on est en développement/itératif, on peut laisser le schéma tel quel
-- et simplement mettre à jour les colonnes. 
-- ATTENTION: owner_id est NOT NULL dans 0004. On doit donc le recréer.

-- Pour KduFoot, on va utiliser une approche programmatique sans casser le schéma NOT NULL si possible,
-- mais le "Standard FAANG" exige que la base de données supporte l'état "Anonyme".

-- On crée une table temporaire pour matches
CREATE TABLE matches_new (
  id TEXT PRIMARY KEY,
  owner_id TEXT, -- Nullable pour anonymisation
  club_id TEXT NOT NULL,
  category TEXT NOT NULL,
  format TEXT NOT NULL,
  match_date TEXT NOT NULL,
  match_time TEXT NOT NULL,
  venue TEXT NOT NULL,
  email TEXT, -- Nullable
  phone TEXT, -- Nullable
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  deleted_at DATETIME DEFAULT NULL,
  score_a INTEGER DEFAULT NULL,
  score_b INTEGER DEFAULT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (club_id) REFERENCES clubs(id)
);

INSERT INTO matches_new SELECT id, owner_id, club_id, category, format, match_date, match_time, venue, email, phone, notes, status, created_at, updated_at, deleted_at, score_a, score_b FROM matches;
DROP TABLE matches;
ALTER TABLE matches_new RENAME TO matches;

-- 2. Exercices : user_id devient optionnel
CREATE TABLE exercises_new (
  id TEXT PRIMARY KEY,
  user_id TEXT, -- Nullable
  title TEXT NOT NULL,
  synopsis TEXT,
  svg_schema TEXT,
  themes TEXT,
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
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO exercises_new SELECT id, user_id, title, synopsis, svg_schema, themes, nb_joueurs, dimensions, materiel, category, level, duration, video_url, thumbnail_url, video_start_seconds, created_at, updated_at FROM exercises;
DROP TABLE exercises;
ALTER TABLE exercises_new RENAME TO exercises;

-- 3. Match Contacts : user_id devient optionnel, on retire la PK composite car NULL n'est pas permis en PK
CREATE TABLE match_contacts_new (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  user_id TEXT, -- Nullable
  message TEXT,
  contacted_at INTEGER DEFAULT (unixepoch()),
  notification_state INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- On peuple la nouvelle table avec des ID générés si besoin (rowid peut servir)
INSERT INTO match_contacts_new (id, match_id, user_id, message, contacted_at, notification_state, status) 
SELECT lower(hex(randomblob(16))), match_id, user_id, message, contacted_at, notification_state, status FROM match_contacts;
DROP TABLE match_contacts;
ALTER TABLE match_contacts_new RENAME TO match_contacts;

-- 4. Audit Log : Détacher du CASCADE pour garder les traces après suppression (Compliance)
CREATE TABLE rgpd_audit_log_new (
    id TEXT PRIMARY KEY,
    user_id TEXT, -- On le laisse nullable pour après suppression
    user_auth0_sub TEXT, -- On garde le SUB pour trace historique anonymisée
    action TEXT NOT NULL,
    details TEXT,
    performed_at INTEGER DEFAULT (unixepoch()),
    ip_address TEXT
);

INSERT INTO rgpd_audit_log_new (id, user_id, action, details, performed_at, ip_address)
SELECT id, user_id, action, details, performed_at, ip_address FROM rgpd_audit_log;
DROP TABLE rgpd_audit_log;
ALTER TABLE rgpd_audit_log_new RENAME TO rgpd_audit_log;

-- Recréer les index
CREATE INDEX idx_matches_owner_id ON matches(owner_id);
CREATE INDEX idx_exercises_user_id ON exercises(user_id);
CREATE INDEX idx_rgpd_audit_user_id ON rgpd_audit_log(user_id);
