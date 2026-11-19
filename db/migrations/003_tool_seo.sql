-- ===========================================================================
-- Migration 003: per-tool SEO switches.
--
--   nofollow   1 = outbound links carry rel="nofollow"  (default 1)
--   noindex    1 = detail page renders noindex and is dropped from the sitemap
--              (default 0)
--   in_sitemap 1 = detail page listed in /sitemap.xml   (default 1)
--
-- Defaults keep the current behaviour: links are nofollowed, pages are
-- indexable and listed. Admins can flip individual tools from the tool form.
--
--   local : npm run db:migrate:local
--   remote: npx wrangler d1 execute somarkit --remote --file=./db/migrations/003_tool_seo.sql
--
-- Re-running reports "duplicate column name", which is safe to ignore.
-- ===========================================================================

ALTER TABLE tools ADD COLUMN nofollow INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tools ADD COLUMN noindex INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tools ADD COLUMN in_sitemap INTEGER NOT NULL DEFAULT 1;

UPDATE tools SET nofollow = 1 WHERE nofollow IS NULL;
UPDATE tools SET noindex = 0 WHERE noindex IS NULL;
UPDATE tools SET in_sitemap = 1 WHERE in_sitemap IS NULL;
