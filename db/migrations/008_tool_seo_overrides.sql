-- ===========================================================================
-- Migration 008: per-tool SEO overrides (title, description, keywords).
--
-- Until now the <title> of a tool page was always built from a shared template
-- ("{name} Review: Features, Pricing & Alternatives"), so an editor could not
-- sharpen the headline for a specific tool or match a particular query. These
-- columns hold an optional override; empty means "use the generated value",
-- which is also what every existing row gets.
--
-- One column per locale, same convention as name / description / review_md:
-- the bare column is Chinese, `<field>_<code>` holds the translation. A missing
-- translation does NOT borrow the Chinese override — the localized template is
-- a better fallback than a Chinese sentence on an English page.
--
--   local : npx wrangler d1 execute somarkit --local  --file=./db/migrations/008_tool_seo_overrides.sql
--   remote: npx wrangler d1 execute somarkit --remote --file=./db/migrations/008_tool_seo_overrides.sql
--
-- SQLite has no "ADD COLUMN IF NOT EXISTS": run this once per database.
-- ===========================================================================

ALTER TABLE tools ADD COLUMN seo_title    TEXT DEFAULT '';
ALTER TABLE tools ADD COLUMN seo_title_en TEXT DEFAULT '';
ALTER TABLE tools ADD COLUMN seo_title_ja TEXT DEFAULT '';
ALTER TABLE tools ADD COLUMN seo_title_ko TEXT DEFAULT '';

ALTER TABLE tools ADD COLUMN seo_desc    TEXT DEFAULT '';
ALTER TABLE tools ADD COLUMN seo_desc_en TEXT DEFAULT '';
ALTER TABLE tools ADD COLUMN seo_desc_ja TEXT DEFAULT '';
ALTER TABLE tools ADD COLUMN seo_desc_ko TEXT DEFAULT '';

-- Keywords round out the head: the page emits <meta name="keywords"> from a
-- generated list (name + review + category + site keywords). This override
-- replaces that list. Note that Google has not used meta keywords for ranking
-- for years — the column exists for consistency with the rest of the head, not
-- as a ranking lever.
ALTER TABLE tools ADD COLUMN seo_keywords    TEXT DEFAULT '';
ALTER TABLE tools ADD COLUMN seo_keywords_en TEXT DEFAULT '';
ALTER TABLE tools ADD COLUMN seo_keywords_ja TEXT DEFAULT '';
ALTER TABLE tools ADD COLUMN seo_keywords_ko TEXT DEFAULT '';
