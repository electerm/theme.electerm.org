-- theme.electerm.org D1 schema
-- Apply locally:  npm run db:migrate
-- Apply remote:   npm run db:migrate:remote
--
-- Design: all tables are standalone — no foreign key constraints.
-- Cross-table references are done in application code via primary key
-- lookups for maximum insert performance and simplicity.

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,
  github_id           TEXT UNIQUE,
  github_handle       TEXT,
  name                TEXT,
  email               TEXT,
  avatar_url          TEXT,
  role                TEXT NOT NULL DEFAULT 'user',     -- user | admin
  status              TEXT NOT NULL DEFAULT 'active',   -- active | disabled
  theme_ids           TEXT NOT NULL DEFAULT '[]',        -- JSON array of theme ids
  liked_theme_ids     TEXT NOT NULL DEFAULT '[]',        -- JSON array of liked theme ids
  liked_themes_count  INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Themes table
CREATE TABLE IF NOT EXISTS themes (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,                       -- references users.id (app-level)
  name              TEXT NOT NULL,
  theme_config      TEXT NOT NULL DEFAULT '{}',          -- JSON: terminal colors
  ui_theme_config   TEXT NOT NULL DEFAULT '{}',          -- JSON: UI colors
  is_public         INTEGER NOT NULL DEFAULT 0,
  like_count        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_themes_user ON themes(user_id);
CREATE INDEX IF NOT EXISTS idx_themes_public ON themes(is_public);
CREATE INDEX IF NOT EXISTS idx_themes_likes ON themes(like_count DESC);

-- Meta table (key-value store for site-level stats)
CREATE TABLE IF NOT EXISTS meta (
  key             TEXT PRIMARY KEY,
  value           TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Insert default meta
INSERT OR IGNORE INTO meta (key, value) VALUES ('total_themes', '0');
INSERT OR IGNORE INTO meta (key, value) VALUES ('total_users', '0');
INSERT OR IGNORE INTO meta (key, value) VALUES ('total_likes', '0');
INSERT OR IGNORE INTO meta (key, value) VALUES ('public_theme_ids', '[]');
