-- ===========================================================================
-- Migration: add the editorial review column to tools.
--
-- `db/schema.sql` only creates tables that do not exist yet, so an existing
-- database needs this ALTER to pick up the new column. Safe to re-run: the
-- ALTER is skipped when the column is already present (D1 reports an error we
-- tolerate), and the UPDATE below is a no-op in that case.
--
--   local : npm run db:migrate:local
--   remote: npx wrangler d1 execute somarkit --remote --file=./db/migrations/001_review_md.sql
-- ===========================================================================

ALTER TABLE tools ADD COLUMN review_md TEXT DEFAULT '';

UPDATE tools SET review_md = '' WHERE review_md IS NULL;

-- English translation of the review (added with the bilingual feature).
ALTER TABLE tools ADD COLUMN review_md_en TEXT DEFAULT '';

UPDATE tools SET review_md_en = '' WHERE review_md_en IS NULL;
