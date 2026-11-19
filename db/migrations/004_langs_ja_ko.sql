-- ===========================================================================
-- Migration 004: Japanese and Korean content columns.
--
-- The site now ships zh / en / ja / ko (see LANGS in src/lib/i18n.js). The
-- first language keeps the bare columns (`name`, `description`, `tags`,
-- `review_md`); every other locale stores its translation in
-- `<field>_<code>` columns. en already exists (migration 002), so this one only
-- adds the ja/ko twins.
--
-- Nothing else has to change: db.js derives its INSERT/UPDATE column lists from
-- LANGS, localize.js reads `<field>_<code>` for any locale, and a blank value
-- falls back to the Chinese original.
--
--   local : npm run db:migrate:local
--   remote: npx wrangler d1 execute somarkit --remote --file=./db/migrations/004_langs_ja_ko.sql
--
-- The ALTERs are not idempotent in SQLite; re-running the file reports
-- "duplicate column name" which is safe to ignore (the statement is skipped).
-- ===========================================================================

-- --- tools -----------------------------------------------------------------
ALTER TABLE tools ADD COLUMN name_ja TEXT DEFAULT '';
ALTER TABLE tools ADD COLUMN description_ja TEXT DEFAULT '';
ALTER TABLE tools ADD COLUMN tags_ja TEXT DEFAULT '';
ALTER TABLE tools ADD COLUMN review_md_ja TEXT DEFAULT '';

ALTER TABLE tools ADD COLUMN name_ko TEXT DEFAULT '';
ALTER TABLE tools ADD COLUMN description_ko TEXT DEFAULT '';
ALTER TABLE tools ADD COLUMN tags_ko TEXT DEFAULT '';
ALTER TABLE tools ADD COLUMN review_md_ko TEXT DEFAULT '';

-- --- categories -------------------------------------------------------------
-- `name_en` already exists; the category description did not have a ja/ko twin.
ALTER TABLE categories ADD COLUMN name_ja TEXT DEFAULT '';
ALTER TABLE categories ADD COLUMN description_ja TEXT DEFAULT '';
ALTER TABLE categories ADD COLUMN name_ko TEXT DEFAULT '';
ALTER TABLE categories ADD COLUMN description_ko TEXT DEFAULT '';

-- Normalise NULLs to the empty string, which is what "not translated" means.
UPDATE tools SET name_ja = '' WHERE name_ja IS NULL;
UPDATE tools SET description_ja = '' WHERE description_ja IS NULL;
UPDATE tools SET tags_ja = '' WHERE tags_ja IS NULL;
UPDATE tools SET review_md_ja = '' WHERE review_md_ja IS NULL;
UPDATE tools SET name_ko = '' WHERE name_ko IS NULL;
UPDATE tools SET description_ko = '' WHERE description_ko IS NULL;
UPDATE tools SET tags_ko = '' WHERE tags_ko IS NULL;
UPDATE tools SET review_md_ko = '' WHERE review_md_ko IS NULL;

UPDATE categories SET name_ja = '' WHERE name_ja IS NULL;
UPDATE categories SET description_ja = '' WHERE description_ja IS NULL;
UPDATE categories SET name_ko = '' WHERE name_ko IS NULL;
UPDATE categories SET description_ko = '' WHERE description_ko IS NULL;
