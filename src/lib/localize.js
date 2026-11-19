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

import { normalizeLang } from './i18n.js';

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
 * Returns a shallow copy with `name`, `description`, `tags` (array) and
 * `review_md` resolved to the requested language.
 */
export function localizeTool(tool, lang) {
  if (!tool) return tool;
  const en = normalizeLang(lang) === 'en';
  // `tags` is stored as a comma separated string; expose both forms.
  const rawTags = en ? pick(tool.tags_en, tool.tags) : pick(tool.tags);
  return {
    ...tool,
    name: en ? pick(tool.name_en, tool.name) : pick(tool.name),
    description: en ? pick(tool.description_en, tool.description) : pick(tool.description),
    tags: rawTags
      ? String(rawTags).split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    review_md: en ? pick(tool.review_md_en, tool.review_md) : pick(tool.review_md),
    // Which fields actually came from a translation, for admin hints.
    isTranslated: {
      name: Boolean(en && pick(tool.name_en)),
      description: Boolean(en && pick(tool.description_en)),
      tags: Boolean(en && pick(tool.tags_en)),
      review: Boolean(en && pick(tool.review_md_en)),
    },
  };
}

/** Localise a list of tools. */
export function localizeTools(tools, lang) {
  return (Array.isArray(tools) ? tools : []).map((t) => localizeTool(t, lang));
}

/** Localise one category. */
export function localizeCategory(category, lang) {
  if (!category) return category;
  const en = normalizeLang(lang) === 'en';
  return {
    ...category,
    name: en ? pick(category.name_en, category.name) : pick(category.name),
    description: en ? pick(category.description_en, category.description) : pick(category.description),
  };
}

/** Localise a list of categories. */
export function localizeCategories(categories, lang) {
  return (Array.isArray(categories) ? categories : []).map((c) => localizeCategory(c, lang));
}
