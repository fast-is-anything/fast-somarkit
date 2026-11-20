// -----------------------------------------------------------------------------
// Markdown → HTML, powered by markdown-it.
//
// This is the single renderer used by BOTH the public detail page and the
// admin editor preview, so an author always sees exactly what visitors get.
//
// Beyond CommonMark + GFM tables it adds:
//   • ::: tip / ::: warning / ::: card    — callout cards
//   • footnotes                           — via markdown-it-footnote
//   • heading anchors (slug ids)          — good for SEO and in-page links
//   • link hardening                      — only http(s)/mailto/relative links
//
// Raw HTML in the source is disabled (`html: false`), so authoring Markdown can
// never inject <script> or event handlers.
// -----------------------------------------------------------------------------

import MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';
import footnote from 'markdown-it-footnote';
import { esc } from './crypto.js';

/**
 * Callout containers. `::: tip 可选标题` opens a card; the following lines are
 * rendered as normal Markdown inside it, closed by a bare `:::`.
 *
 * `info` in the source is the text after the container name and is used as the
 * card title when present.
 */
const CALLOUTS = {
  tip: { cls: 'md-card md-card-tip', icon: '💡' },
  warning: { cls: 'md-card md-card-warn', icon: '⚠️' },
  info: { cls: 'md-card md-card-info', icon: 'ℹ️' },
  card: { cls: 'md-card', icon: '' },
};

/**
 * Profile card. The info string carries `key=value` pairs:
 *
 *   ::: person name=张三 role=产品设计师 avatar=https://…/a.png
 *   简介文字（Markdown）
 *   :::
 *
 * `avatar` is optional — without it the card falls back to initials, so an
 * author never has to hunt for an image to get a decent-looking card.
 */
function personCard(tokens, idx) {
  const info = tokens[idx].info.trim().slice('person'.length).trim();
  const attrs = {};
  for (const m of info.matchAll(/(\w+)\s*=\s*("([^"]*)"|'([^']*)'|(\S+))/g)) {
    attrs[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? '';
  }

  if (tokens[idx].nesting !== 1) return '</div></div>';

  const name = attrs.name || '';
  const role = attrs.role || '';
  const avatar = safeUrl(attrs.avatar || '');
  const url = safeUrl(attrs.url || '');

  // Avatar: image when supplied, otherwise the first character of the name.
  const initial = name ? [...name][0] : '?';
  const avatarHtml = avatar
    ? `<img class="md-person-avatar" src="${esc(avatar)}" alt="" loading="lazy" decoding="async">`
    : `<span class="md-person-avatar md-person-avatar-text" aria-hidden="true">${esc(initial)}</span>`;

  const head = `<div class="md-person-top">${avatarHtml}<div class="md-person-meta">`
    + (name ? `<div class="md-person-name">${esc(name)}</div>` : '')
    + (role ? `<div class="md-person-role">${esc(role)}</div>` : '')
    + '</div></div>';

  // The whole card becomes a link when `url=` is given.
  const open = url
    ? `<div class="md-card md-person"><a class="md-person-link" href="${url}" target="_blank" rel="noopener noreferrer nofollow">`
    : '<div class="md-card md-person">';

  return `${open}${head}<div class="md-person-body">`;
}

/** Only these link schemes survive; everything else is dropped to plain text. */
function safeUrl(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^(https?:\/\/|mailto:|\/|#)/i.test(u)) return u;
  return '';
}

/** Turn a heading's text into a stable, readable anchor id. */
function slugifyHeading(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'section';
}

let mdInstance = null;

function getMd() {
  if (mdInstance) return mdInstance;

  const md = new MarkdownIt({
    html: false,        // never pass raw HTML through
    linkify: true,      // bare URLs become links
    breaks: false,      // CommonMark: single newline is not a <br>
    typographer: false, // keep quotes/ellipses literal for CJK text
  });

  md.use(footnote);

  // Review bodies are rendered inside a page that already owns the only H1.
  // Normalise the document's top heading to H2 and shift the rest relatively,
  // so authors can start at `#` or `##` without creating a second H1 or
  // skipping a level.
  md.core.ruler.push('normalize_review_headings', (state) => {
    const opens = state.tokens.filter((token) => token.type === 'heading_open');
    if (!opens.length) return;
    const min = Math.min(...opens.map((token) => Number(token.tag.slice(1))));
    const shift = 2 - min;
    for (const token of state.tokens) {
      if (token.type !== 'heading_open' && token.type !== 'heading_close') continue;
      const level = Math.min(6, Math.max(2, Number(token.tag.slice(1)) + shift));
      token.tag = `h${level}`;
    }
  });

  // Heading anchors (slug instead of URL-encoded ids).
  md.use((instance) => {
    instance.core.ruler.push('heading_anchors', (state) => {
      const seen = new Map();
      for (const token of state.tokens) {
        if (token.type !== 'heading_open') continue;
        if (!token.attrGet('id')) {
          const idx = state.tokens.indexOf(token);
          const inline = state.tokens[idx + 1];
          const text = inline && inline.type === 'inline' ? inline.content : '';
          let base = slugifyHeading(text);
          const n = (seen.get(base) || 0) + 1;
          seen.set(base, n);
          if (n > 1) base = `${base}-${n}`;
          token.attrSet('id', base);
        }
        token.attrSet('tabindex', '-1');
      }
    });
  });

  // Callout cards.
  for (const [name, cfg] of Object.entries(CALLOUTS)) {
    md.use(container, name, {
      validate: (params) => params.trim().startsWith(name),
      render(tokens, idx) {
        if (tokens[idx].nesting === 1) {
          // `::: tip Some title` → title = "Some title"
          const title = tokens[idx].info.trim().slice(name.length).trim();
          const icon = cfg.icon ? `<span class="md-card-icon" aria-hidden="true">${cfg.icon}</span>` : '';
          const head = title
            ? `<div class="md-card-head">${icon}<span class="md-card-title">${esc(title)}</span></div>`
            : (icon ? `<div class="md-card-head">${icon}</div>` : '');
          return `<div class="${cfg.cls}">${head}`;
        }
        return '</div>';
      },
    });
  }

  // Profile card with avatar.
  md.use(container, 'person', {
    validate: (params) => params.trim().startsWith('person'),
    render: personCard,
  });

  // Link/image hardening: drop unsafe schemes, mark external links.
  const defaultLinkOpen = md.renderer.rules.link_open
    || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const href = token.attrGet('href') || '';
    const safe = safeUrl(href);
    if (!safe) {
      // Unwrap: render the text only.
      token.tag = 'span';
      return defaultLinkOpen(tokens, idx, options, env, self);
    }
    token.attrSet('href', safe);
    if (/^https?:\/\//i.test(safe)) {
      token.attrSet('target', '_blank');
      token.attrSet('rel', 'noopener noreferrer nofollow');
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const src = token.attrGet('src') || '';
    const safe = safeUrl(src);
    if (!safe) return '';
    token.attrSet('src', safe);
    token.attrSet('loading', 'lazy');
    token.attrSet('decoding', 'async');
    return self.renderToken(tokens, idx, options);
  };

  // Tables get a scroll container so wide tables never break the layout.
  const defaultTableOpen = md.renderer.rules.table_open
    || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.table_open = (tokens, idx, options, env, self) =>
    `<div class="md-table-wrap">${defaultTableOpen(tokens, idx, options, env, self)}`;
  const defaultTableClose = md.renderer.rules.table_close
    || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.table_close = (tokens, idx, options, env, self) =>
    `${defaultTableClose(tokens, idx, options, env, self)}</div>`;

  mdInstance = md;
  return md;
}

/**
 * Render Markdown to HTML.
 * @param {string} source raw Markdown
 * @returns {string} HTML (escaped/sanitised by the renderer configuration)
 */
export function renderMarkdown(source) {
  const src = String(source || '').replace(/\r\n?/g, '\n');
  if (!src.trim()) return '';
  return getMd().render(src);
}

/** Rough plain-text excerpt, used for meta descriptions and previews. */
export function markdownToText(source, max = 160) {
  const src = String(source || '').replace(/\r\n?/g, '\n');
  if (!src.trim()) return '';
  // Strip markup by rendering then flattening, which handles every construct.
  const html = renderMarkdown(src)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ');
  const text = html.replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Exposed for the editor's syntax hint. */
export const MARKDOWN_CALLOUTS = Object.keys(CALLOUTS);
