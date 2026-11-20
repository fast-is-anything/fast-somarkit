import { LANGS } from './i18n.js';

/**
 * Everything about a tool that should be searchable, lowercased.
 *
 * Every locale's columns are included regardless of the visitor's language: a
 * Japanese visitor may still search for a Chinese tool name and vice versa.
 * Adding a locale grows the haystack automatically instead of needing an edit
 * here.
 */
export function toolHaystack(tool) {
  const parts = [tool.name, tool.description, (tool.tags || []).join(' '), tool.category_name];
  for (let i = 1; i < LANGS.length; i++) {
    const code = LANGS[i].code;
    parts.push(tool[`name_${code}`], tool[`description_${code}`], tool[`tags_${code}`]);
  }
  return parts.filter(Boolean).join(' ').toLowerCase();
}

/**
 * Filter tools by a query string.
 *
 * A query is split on whitespace and every word must match ("ai 写作" finds only
 * tools covering both), which is much closer to what people expect than a plain
 * substring match on the whole phrase.
 */
export function matchTools(tools, query) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return tools.filter((tool) => {
    const hay = tool._hay || (tool._hay = toolHaystack(tool));
    return words.every((w) => hay.includes(w));
  });
}
