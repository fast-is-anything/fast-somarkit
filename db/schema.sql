-- ===========================================================================
-- SoMarkIt — D1 schema
-- ===========================================================================

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  name_en     TEXT    DEFAULT '',
  icon        TEXT    DEFAULT 'grid',     -- key into ICONS map in src/lib/icons.js
  description TEXT    DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  visible     INTEGER NOT NULL DEFAULT 1, -- 1 = show on the public site
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories (sort_order, id);

CREATE TABLE IF NOT EXISTS tools (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT    NOT NULL UNIQUE,
  name            TEXT    NOT NULL,
  url             TEXT    NOT NULL,
  description     TEXT    DEFAULT '',
  category_id     INTEGER REFERENCES categories (id) ON DELETE SET NULL,
  tags            TEXT    DEFAULT '',      -- comma separated
  pricing         TEXT    NOT NULL DEFAULT 'free',  -- free | freemium | paid | opensource
  logo_url        TEXT    DEFAULT '',
  is_hot          INTEGER NOT NULL DEFAULT 0,
  is_new          INTEGER NOT NULL DEFAULT 0,
  is_featured     INTEGER NOT NULL DEFAULT 0, -- shows in hero "trending" rail
  status          TEXT    NOT NULL DEFAULT 'published', -- draft | published | archived
  sort_order      INTEGER NOT NULL DEFAULT 0,
  visit_count     INTEGER NOT NULL DEFAULT 0,
  source          TEXT    DEFAULT '',      -- provenance for batch imports
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools (category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tools_status   ON tools (status);
CREATE INDEX IF NOT EXISTS idx_tools_name     ON tools (name);

CREATE TABLE IF NOT EXISTS admins (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT DEFAULT '',
  picture    TEXT DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'editor', -- owner | editor
  active     INTEGER NOT NULL DEFAULT 1,
  last_login TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor      TEXT DEFAULT '',
  action     TEXT NOT NULL,
  entity     TEXT DEFAULT '',
  entity_id  INTEGER,
  detail     TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at DESC);

-- Full text-ish search helper -------------------------------------------------
-- D1 (SQLite) LIKE is used for search; keep an index-friendly lowercase copy.
-- (Generated columns are supported, but LIKE with leading wildcard still scans;
--  the dataset is small enough that this is fine and keeps the schema portable.)

-- Simple click tracking for the "popular" ordering ---------------------------
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ===========================================================================
-- Tool submissions — the public "提交工具" form.
-- A submission is a *proposal*; it becomes a real tool only when an admin
-- approves it (which inserts into `tools` and links back via tool_id).
-- ===========================================================================
CREATE TABLE IF NOT EXISTS submissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  url           TEXT    NOT NULL,
  description   TEXT    DEFAULT '',
  category_id   INTEGER REFERENCES categories (id) ON DELETE SET NULL,
  tags          TEXT    DEFAULT '',
  pricing       TEXT    NOT NULL DEFAULT 'free',
  submitter_name  TEXT  DEFAULT '',
  submitter_email TEXT  DEFAULT '',
  note          TEXT    DEFAULT '',     -- "why should we list it"
  status        TEXT    NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  review_note   TEXT    DEFAULT '',     -- admin's reason for the decision
  tool_id       INTEGER REFERENCES tools (id) ON DELETE SET NULL,
  ip_hash       TEXT    DEFAULT '',     -- abuse control, never the raw IP
  user_agent    TEXT    DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  reviewed_at   TEXT,
  reviewed_by   TEXT    DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_submissions_status  ON submissions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_ip      ON submissions (ip_hash, created_at);
