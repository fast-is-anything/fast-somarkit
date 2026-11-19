// -----------------------------------------------------------------------------
// Content localisation.
//
// Every user-facing text field has a Chinese original and one optional
// translation per additional locale (`<field>_en`, `<field>_ja`,
// `<field>_ko`). The rules are deliberately simple and identical everywhere so
// a page never mixes languages inconsistently:
//
//   • the requested language has a non-empty value → use it
//   • otherwise                                    → fall back to Chinese
//
// `name` is special-cased: most tool names are already English words
// (ChatGPT, Claude, Cursor), so an empty `name_<code>` simply reuses `name`.
//
// The locale list comes from LANGS, so a locale added there needs only its
// database columns (see db/migrations) — nothing in this file changes.
// -----------------------------------------------------------------------------

import { LANGS, normalizeLang, DEFAULT_LANG } from './i18n.js';

/** First non-empty, trimmed candidate. */
function pick(...candidates) {
  for (const c of candidates) {
    if (c === null || c === undefined) continue;
    const s = String(c).trim();
    if (s) return s;
  }
  return '';
}

/**
 * Read one field for a language.
 *
 * For the default language this is the bare column. For any other language the
 * `<field>_<code>` column is preferred and the fallback chain walks the
 * remaining locales in LANGS order (Chinese first) before giving up — so a
 * missing Japanese translation shows the Chinese original rather than an
 * empty or English string.
 */
function readField(row, field, code) {
  if (code === DEFAULT_LANG) return pick(row[field]);
  // Fallbacks: every other locale, default language first.
  const chain = LANGS.filter((l) => l.code !== code)
    .sort((a, b) => (a.code === DEFAULT_LANG ? -1 : b.code === DEFAULT_LANG ? 1 : 0))
    .map((l) => (l.code === DEFAULT_LANG ? row[field] : row[`${field}_${l.code}`]));
  return pick(row[`${field}_${code}`], ...chain);
}

/**
 * Localise one tool for a language.
 *
 * Returns a shallow copy with `name`, `description`, `tags` (array) and
 * `review_md` resolved to the requested language.
 */
export function localizeTool(tool, lang) {
  if (!tool) return tool;
  const code = normalizeLang(lang);
  const translated = code !== DEFAULT_LANG;
  // `tags` is stored as a comma separated string; expose both forms.
  const rawTags = readField(tool, 'tags', code);
  return {
    ...tool,
    name: readField(tool, 'name', code),
    description: readField(tool, 'description', code),
    tags: rawTags
      ? String(rawTags).split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    review_md: readField(tool, 'review_md', code),
    // Which fields actually came from a translation, for admin hints.
    isTranslated: {
      name: Boolean(translated && pick(tool[`name_${code}`])),
      description: Boolean(translated && pick(tool[`description_${code}`])),
      tags: Boolean(translated && pick(tool[`tags_${code}`])),
      review: Boolean(translated && pick(tool[`review_md_${code}`])),
    },
  };
}

/** Localise a list of tools. */
export function localizeTools(tools, lang) {
  return (Array.isArray(tools) ? tools : []).map((t) => localizeTool(t, lang));
}

/** Localise one category (name + description). */
export function localizeCategory(category, lang) {
  if (!category) return category;
  const code = normalizeLang(lang);
  return {
    ...category,
    name: readField(category, 'name', code),
    description: readField(category, 'description', code),
  };
}

/** Localise a list of categories. */
export function localizeCategories(categories, lang) {
  return (Array.isArray(categories) ? categories : []).map((c) => localizeCategory(c, lang));
}
