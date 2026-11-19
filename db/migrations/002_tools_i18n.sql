-- ===========================================================================
-- Migration 002: bilingual content for tools (and category descriptions).
--
-- The site ships zh + en. Every user-facing text field gets an `_en` twin;
-- an empty value means "not translated yet" and the front end falls back to
-- the Chinese original.
--
--   local : npm run db:migrate:local
--   remote: npx wrangler d1 execute somarkit --remote --file=./db/migrations/002_tools_i18n.sql
--
-- The ALTERs are not idempotent in SQLite; re-running the file reports
-- "duplicate column name" which is safe to ignore (the statement is skipped).
-- ===========================================================================

-- Tool name: often already English (ChatGPT, Claude…), so the front end
-- falls back to `name` when `name_en` is empty.
ALTER TABLE tools ADD COLUMN name_en TEXT DEFAULT '';

ALTER TABLE tools ADD COLUMN description_en TEXT DEFAULT '';

-- Comma separated, mirrors `tags`.
ALTER TABLE tools ADD COLUMN tags_en TEXT DEFAULT '';

-- Categories already have name_en; add the matching description.
ALTER TABLE categories ADD COLUMN description_en TEXT DEFAULT '';

UPDATE tools SET name_en = '' WHERE name_en IS NULL;
UPDATE tools SET description_en = '' WHERE description_en IS NULL;
UPDATE tools SET tags_en = '' WHERE tags_en IS NULL;
UPDATE categories SET description_en = '' WHERE description_en IS NULL;
