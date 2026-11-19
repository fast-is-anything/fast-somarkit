// -----------------------------------------------------------------------------
// Minimal, dependency-free Markdown → HTML renderer.
//
// Scope: exactly what an editorial tool review needs. Anything outside this
// subset is escaped as plain text rather than passed through, so authoring
// Markdown can never inject raw HTML into a page.
//
// Supported
//   # ## ### headings          - / * / + and 1. lists (nested by 2 spaces)
//   **bold**  *italic*  `code` [text](url)  ![alt](url)
//   > blockquote               --- horizontal rule
//   ``` fenced code blocks ``` |> tables
//   blank-line separated paragraphs, single newlines become <br>
// -----------------------------------------------------------------------------

import { esc } from './crypto.js';

/** Only allow http(s), mailto and site-relative links in rendered output. */
function safeUrl(raw) {
  const url = String(raw || '').trim();
  if (!url) return '';
  if (/^(https?:\/\/|mailto:|\/|#)/i.test(url)) return url;
  // Anything else (javascript:, data:, vbscript:, …) is dropped.
  return '';
}

/** Inline formatting: code spans first so their contents stay literal. */
function inline(text) {
  const codes = [];
  let s = String(text).replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${esc(code)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });

  s = esc(s);

  // Images before links (same leading syntax for links).
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (m, alt, src, title) => {
    const u = safeUrl(src);
    if (!u) return m;
    const t = title ? ` title="${title}"` : '';
    return `<img src="${u}" alt="${alt}"${t} loading="lazy" decoding="async">`;
  });

  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (m, label, href, title) => {
    const u = safeUrl(href);
    if (!u) return label;
    const external = /^https?:\/\//i.test(u);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer nofollow"' : '';
    const t = title ? ` title="${title}"` : '';
    return `<a href="${u}"${attrs}${t}>${label}</a>`;
  });

  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  // Restore code spans.
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
  return s;
}

/** Split a table row into cells, honouring escaped pipes. */
function tableCells(line) {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'));
}

/**
 * Render Markdown to HTML.
 * @param {string} md raw Markdown from the editor
 * @returns {string} HTML (already escaped/safe)
 */
export function renderMarkdown(md) {
  const src = String(md || '').replace(/\r\n?/g, '\n');
  if (!src.trim()) return '';

  const lines = src.split('\n');
  const out = [];
  let i = 0;

  // --- helpers -----------------------------------------------------------
  const isBlank = (l) => !l || !l.trim();

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) { i++; continue; }

    // Fenced code block ---------------------------------------------------
    const fence = line.match(/^\s*(```|~~~)\s*([\w-]*)\s*$/);
    if (fence) {
      const marker = fence[1];
      const lang = fence[2];
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(marker)) {
        buf.push(lines[i]);
        i++;
      }
      i++; // consume closing fence
      const cls = lang ? ` class="language-${esc(lang)}"` : '';
      out.push(`<pre><code${cls}>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // Table ---------------------------------------------------------------
    if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const head = tableCells(line);
      i += 2; // header + separator
      const body = [];
      while (i < lines.length && /\|/.test(lines[i]) && !isBlank(lines[i])) {
        body.push(tableCells(lines[i]));
        i++;
      }
      const th = head.map((c) => `<th>${inline(c)}</th>`).join('');
      const rows = body
        .map((cells) => `<tr>${head.map((_, k) => `<td>${inline(cells[k] || '')}</td>`).join('')}</tr>`)
        .join('');
      out.push(`<div class="md-table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`);
      continue;
    }

    // Horizontal rule -----------------------------------------------------
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // Heading -------------------------------------------------------------
    const h = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (h) {
      const level = Math.min(6, Math.max(2, h[1].length + 1)); // # -> h2 (page already has an h1)
      out.push(`<h${level}>${inline(h[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote ----------------------------------------------------------
    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${renderMarkdown(buf.join('\n'))}</blockquote>`);
      continue;
    }

    // Lists ---------------------------------------------------------------
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*([-*+]|\d+\.)\s+(.*)$/);
        if (!m) {
          // A continuation line (indented) belongs to the previous item.
          if (items.length && /^\s{2,}\S/.test(lines[i])) {
            items[items.length - 1] += ' ' + lines[i].trim();
            i++;
            continue;
          }
          break;
        }
        items.push(m[2]);
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</${tag}>`);
      continue;
    }

    // Paragraph -----------------------------------------------------------
    const buf = [];
    while (i < lines.length && !isBlank(lines[i])
      && !/^\s*(#{1,6}\s|>|```|~~~)/.test(lines[i])
      && !/^\s*([-*+]|\d+\.)\s+/.test(lines[i])
      && !/^\s*([-*_])\s*(\1\s*){2,}$/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    if (!buf.length) { i++; continue; }
    // Single newlines inside a paragraph are intentional line breaks.
    out.push(`<p>${buf.map((l) => inline(l)).join('<br>')}</p>`);
  }

  return out.join('\n');
}

/** Rough plain-text excerpt, used for meta descriptions and previews. */
export function markdownToText(md, max = 160) {
  const text = String(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
