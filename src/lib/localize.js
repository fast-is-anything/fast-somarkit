// -----------------------------------------------------------------------------
// Content localisation.
//
// Every user-facing text field has a Chinese original and an optional English
// twin (`<field>_en`). The rules are deliberately simple and identical
// everywhere so a page never mixes languages inconsistently:
//
//   • the requested language has a non-empty value → use it
//   • otherwise                                   → fall back to Chinese
//
// `name` is special-cased: most tool names are already English words
// (ChatGPT, Claude, Cursor), so an empty `name_en` simply reuses `name`.
// -----------------------------------------------------------------------------

import { normalizeLang, DEFAULT_LANG } from './i18n.js';

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
 * Localise one tool for a language.
 *
 * Language-neutral: for any locale other than the default it reads the
 * `<field>_<code>` column and falls back to the default-language value when the
 * translation is blank. Adding a locale needs a column of that shape; this
 * function picks it up without further changes.
 *
 * Returns a shallow copy with `name`, `description`, `tags` (array) and
 * `review_md` resolved to the requested language.
 */
export function localizeTool(tool, lang) {
  if (!tool) return tool;
  const code = normalizeLang(lang);
  const translated = code !== DEFAULT_LANG;
  // `<field>_<code>` holds the translation; the bare column is the original.
  const forLang = (field) => (translated ? pick(tool[`${field}_${code}`], tool[field]) : pick(tool[field]));
  // `tags` is stored as a comma separated string; expose both forms.
  const rawTags = forLang('tags');
  return {
    ...tool,
    name: forLang('name'),
    description: forLang('description'),
    tags: rawTags
      ? String(rawTags).split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    review_md: forLang('review_md'),
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

/**
 * Localise one category.
 * Same language-neutral rule as localizeTool: read `<field>_<code>` for any
 * non-default locale, falling back to the default-language column.
 */
export function localizeCategory(category, lang) {
  if (!category) return category;
  const code = normalizeLang(lang);
  const translated = code !== DEFAULT_LANG;
  const forLang = (field) =>
    (translated ? pick(category[`${field}_${code}`], category[field]) : pick(category[field]));
  return {
    ...category,
    name: forLang('name'),
    description: forLang('description'),
  };
}

/** Localise a list of categories. */
export function localizeCategories(categories, lang) {
  return (Array.isArray(categories) ? categories : []).map((c) => localizeCategory(c, lang));
}
