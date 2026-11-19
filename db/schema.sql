-- ===========================================================================
-- SoMarkIt — D1 schema
-- ===========================================================================

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,            -- Chinese (default language)
  -- Translations, one column per non-default locale in src/lib/i18n.js (LANGS):
  -- en, ja, ko. An empty value means "not translated yet"; the front end then
  -- falls back to the Chinese original. Adding a locale needs a matching set
  -- of `<field>_<code>` columns (see db/migrations/004_langs_ja_ko.sql).
  name_en     TEXT    DEFAULT '',
  name_ja     TEXT    DEFAULT '',
  name_ko     TEXT    DEFAULT '',
  icon        TEXT    DEFAULT 'grid',     -- key into ICONS map in src/lib/icons.js
  description TEXT    DEFAULT '',
  description_en TEXT DEFAULT '',
  description_ja TEXT DEFAULT '',
  description_ko TEXT DEFAULT '',
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
  -- ---------------------------------------------------------------------
  -- Per-tool SEO switches, all editable from the admin tool form.
  --   nofollow = 1  outbound links carry rel="nofollow" (default: a directory
  --                 should not pass link equity to hundreds of third parties)
  --   noindex  = 1  the detail page gets <meta name="robots" content="noindex">
  --                 and is excluded from the sitemap
  --   in_sitemap = 1 whether the detail page is listed in /sitemap.xml
  -- ---------------------------------------------------------------------
  nofollow        INTEGER NOT NULL DEFAULT 1,
  noindex         INTEGER NOT NULL DEFAULT 0,
  in_sitemap      INTEGER NOT NULL DEFAULT 1,
  status          TEXT    NOT NULL DEFAULT 'published', -- draft | published | archived
  sort_order      INTEGER NOT NULL DEFAULT 0,
  visit_count     INTEGER NOT NULL DEFAULT 0,
  -- Translations of the user-facing text above, one set per non-default locale
  -- (en, ja, ko — see LANGS in src/lib/i18n.js). An empty value means "not
  -- translated yet": the front end falls back to the Chinese original, and
  -- `name_<code>` in particular falls back to `name` (most tool names are
  -- already English).
  name_en         TEXT    DEFAULT '',
  description_en  TEXT    DEFAULT '',
  tags_en         TEXT    DEFAULT '',
  name_ja         TEXT    DEFAULT '',
  description_ja  TEXT    DEFAULT '',
  tags_ja         TEXT    DEFAULT '',
  name_ko         TEXT    DEFAULT '',
  description_ko  TEXT    DEFAULT '',
  tags_ko         TEXT    DEFAULT '',
  -- Long-form editorial review, authored as Markdown in the admin console and
  -- rendered on the tool detail page between the cards and the info grid.
  -- One column per site language: `review_md` is Chinese, `review_md_<code>`
  -- is the translation. A missing translation falls back to another language.
  review_md       TEXT    DEFAULT '',
  review_md_en    TEXT    DEFAULT '',
  review_md_ja    TEXT    DEFAULT '',
  review_md_ko    TEXT    DEFAULT '',
  source          TEXT    DEFAULT '',      -- provenance for imports
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

-- ===========================================================================
-- Click tracking — the source of truth for "访问" statistics.
--
-- Every click on a tool's 访问 button is recorded as one row here. The
-- `tools.visit_count` column is a denormalised cache of this table (kept in
-- sync by the same statement) so the public site can sort by popularity
-- without an aggregate over the log.
--
-- Columns are deliberately minimal and privacy-preserving
--   * ip_hash : salted SHA-256 of the client IP (never the raw address);
--               used only to drop duplicate clicks inside DEDUPE_WINDOW
--   * visitor : random per-browser id kept in localStorage, so distinct
--               visitors can be counted across sessions
--   * country / referer : coarse attribution, straight from the edge headers
--
-- The same click is also sent to GA4 via the Measurement Protocol, so both
-- stores stay comparable.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS click_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_id    INTEGER NOT NULL REFERENCES tools (id) ON DELETE CASCADE,
  ip_hash    TEXT    NOT NULL DEFAULT '',
  visitor    TEXT    NOT NULL DEFAULT '',
  country    TEXT    NOT NULL DEFAULT '',
  referer    TEXT    NOT NULL DEFAULT '',
  path       TEXT    NOT NULL DEFAULT '',
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clicks_tool_time ON click_events (tool_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_time      ON click_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_visitor   ON click_events (visitor, created_at DESC);
-- De-duplication probe: "did this IP click this tool in the last minute?"
CREATE INDEX IF NOT EXISTS idx_clicks_dedupe    ON click_events (ip_hash, tool_id, created_at DESC);

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
