#!/usr/bin/env node
/**
 * seo-audit.mjs — AITDK-style on-page SEO checker for the SoMarkIt Worker.
 *
 * The browser extension reads a page's TDK (title / description / keywords),
 * its heading outline and a handful of technical tags. This script reproduces
 * that reading server-side, adds the cross-page checks an extension cannot do
 * (duplicate TDK, sitemap ↔ canonical consistency, hreflang reciprocity,
 * untranslated locales) and writes the result as Markdown, JSON and a
 * self-contained HTML dashboard.
 *
 * No dependencies: it fetches the deployed HTML, so it audits what a crawler
 * actually receives rather than what the template source implies.
 *
 * Usage:
 *   node scripts/seo-audit.mjs
 *   node scripts/seo-audit.mjs --base=http://localhost:8799 --lang=zh
 *   node scripts/seo-audit.mjs --url=https://somarkit.com/zh/about --no-sitemap
 *   node scripts/seo-audit.mjs --max=40 --concurrency=8 --out=.research/seo-audit
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const opt = {
  base: 'https://somarkit.com',
  lang: 'zh',
  out: '.research/seo-audit',
  max: 250,
  concurrency: 6,
  timeout: 25000,
  q: 'AI',
  sitemap: true,
  ua: 'Mozilla/5.0 (compatible; SoMarkItSEOAudit/1.0; +https://somarkit.com/)',
  extra: [],
};

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) { opt.extra.push(a); continue; }
  const body = a.slice(2);
  const eq = body.indexOf('=');
  const rawKey = eq >= 0 ? body.slice(0, eq) : body;
  const key = rawKey.trim();
  if (key === 'no-sitemap') { opt.sitemap = false; continue; }
  const val = eq >= 0 ? body.slice(eq + 1) : argv[++i];
  if (key === 'base') opt.base = String(val).replace(/\/+$/, '');
  else if (key === 'lang') opt.lang = String(val);
  else if (key === 'out') opt.out = String(val);
  else if (key === 'max') opt.max = Math.max(1, Number(val) || opt.max);
  else if (key === 'concurrency') opt.concurrency = Math.max(1, Number(val) || opt.concurrency);
  else if (key === 'timeout') opt.timeout = Math.max(1000, Number(val) || opt.timeout);
  else if (key === 'q') opt.q = String(val);
  else if (key === 'url') opt.extra.push(String(val));
  else if (key === 'ua') opt.ua = String(val);
}

const BASE = opt.base;
const OUT_DIR = resolve(opt.out);
const LOCALES = ['zh', 'en', 'ja', 'ko'];
const SITE_HOST = new URL(BASE).host;
// When auditing a local preview the canonical/og URLs still point at
// production, so host comparisons and remote asset probes are meaningless.
const IS_LOCAL = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(new URL(BASE).hostname);

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];
const SEVERITY_LABEL = {
  critical: '严重',
  high: '高',
  medium: '中',
  low: '低',
  info: '提示',
};
const SEVERITY_WEIGHT = { critical: 20, high: 10, medium: 4, low: 1, info: 0 };

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  copy: '©', reg: '®', hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', middot: '·',
};

function decodeEntities(s = '') {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCp(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCp(parseInt(d, 10)))
    .replace(/&([a-z][a-z0-9]+);/gi, (m, n) => (ENTITIES[n.toLowerCase()] !== undefined ? ENTITIES[n.toLowerCase()] : m));
}

function safeCp(cp) {
  try { return String.fromCodePoint(cp); } catch { return ''; }
}

function stripTags(html = '') {
  return decodeEntities(String(html).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function textOfTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? stripTags(m[1]) : '';
}

function attrsOf(source = '') {
  const out = {};
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(source))) {
    const k = m[1].toLowerCase();
    if (k === '/') continue;
    out[k] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

/** Character count, CJK count and "half-width" display width (CJK = 2). */
function metrics(s = '') {
  const chars = [...String(s)];
  let cjk = 0;
  let width = 0;
  for (const ch of chars) {
    const cp = ch.codePointAt(0);
    const wide = isWide(cp);
    if (wide) cjk++; else if (/[A-Za-z0-9]/.test(ch)) width += 1;
    if (wide) width += 2;
  }
  return { chars: chars.length, cjk, width, latin: chars.length - cjk };
}

function isWide(cp) {
  return (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    (cp >= 0x2e80 && cp <= 0x303e) || // CJK radicals / punctuation
    (cp >= 0x3041 && cp <= 0x33ff) || // kana, CJK compat
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  );
}

function cjkRatio(s = '') {
  const chars = [...String(s)].filter((ch) => !/\s/.test(ch));
  if (!chars.length) return 0;
  const cjk = chars.filter((ch) => /[\u3400-\u4dbf\u4e00-\u9fff]/.test(ch)).length;
  return cjk / chars.length;
}

/**
 * Is a description still the Chinese original?
 *
 * `cjkRatio` alone cannot tell Chinese from Japanese (kanji) or Korean (hanja),
 * so each locale is checked for its own script first.
 */
function looksUntranslated(text = '', locale = '') {
  const s = String(text);
  if (!/[\u4e00-\u9fff]{4,}/.test(s)) return false;
  if (locale === 'ja') return !/[\u3040-\u30ff]/.test(s);
  if (locale === 'ko') return !/[\uac00-\ud7af]/.test(s);
  if (locale === 'en') return /[\u4e00-\u9fff]{4,}/.test(s) && (s.match(/[A-Za-z]/g) || []).length < 12;
  return false;
}

function normUrl(u) {
  try {
    const x = new URL(u);
    const p = x.pathname.replace(/\/+$/, '') || '/';
    return `${x.protocol}//${x.host}${p}${x.search}`;
  } catch {
    return String(u);
  }
}

function absUrl(href, base) {
  try { return new URL(href, base).href; } catch { return ''; }
}

/**
 * Do a canonical and the page URL address the same page?
 *
 * In a local preview the canonical still names the production host, so only the
 * path is comparable; otherwise the full normalized URL is.
 */
function samePageUrl(a, b) {
  if (!a || !b) return false;
  if (!IS_LOCAL) return normUrl(a) === normUrl(b);
  try {
    const pa = new URL(a).pathname.replace(/\/+$/, '') || '/';
    const pb = new URL(b).pathname.replace(/\/+$/, '') || '/';
    return pa === pb;
  } catch {
    return false;
  }
}

function splitLocalePath(pathname) {
  const seg = String(pathname || '/').split('/');
  if (LOCALES.includes(seg[1])) return { lang: seg[1], rest: `/${seg.slice(2).join('/')}`.replace(/\/+$/, '') || '/' };
  return { lang: null, rest: pathname || '/' };
}

function pageTypeOf(pathname) {
  const { rest } = splitLocalePath(pathname);
  if (rest === '/' || rest === '') return 'home';
  if (rest === '/about') return 'about';
  if (rest === '/search') return 'search';
  if (rest === '/submit' || rest === '/submit/thanks') return 'submit';
  if (rest.startsWith('/tools/')) return 'tool';
  if (!rest.slice(1).includes('/')) return 'category';
  return 'other';
}

const TYPE_LABEL = {
  home: '首页',
  category: '分类页',
  tool: '评测页',
  search: '搜索页',
  about: '关于页',
  submit: '提交页',
  other: '其他',
};

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function mdCell(s = '') {
  return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function truncate(s = '', n = 120) {
  const a = [...String(s)];
  return a.length > n ? `${a.slice(0, n).join('')}…` : a.join('');
}

function uniq(a) { return [...new Set(a)]; }

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

/** Local date, not UTC: a report generated at 00:30 +08 is still "today". */
function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function localDateTime(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${localDate(d)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

const fetchCache = new Map();

function get(url) {
  if (!fetchCache.has(url)) fetchCache.set(url, doFetch(url));
  return fetchCache.get(url);
}

async function doFetch(url) {
  const started = performance.now();
  let lastError = '';
  // Cloudflare occasionally drops a burst connection (status 0) or answers
  // 429/5xx; a couple of retries keeps the audit from inventing criticals.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: {
          'user-agent': opt.ua,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(opt.timeout),
      });
      const body = await res.text();
      if ((res.status === 429 || res.status >= 500) && attempt < 2) {
        await sleep(700 * (attempt + 1));
        continue;
      }
      return {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body,
        ms: Math.round(performance.now() - started),
        finalUrl: res.url || url,
      };
    } catch (err) {
      lastError = String(err && err.message || err);
      if (attempt < 2) await sleep(700 * (attempt + 1));
    }
  }
  return {
    ok: false, status: 0, statusText: 'FETCH_ERROR', headers: {}, body: '',
    ms: Math.round(performance.now() - started), error: lastError, finalUrl: url,
  };
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, Math.max(1, items.length)) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      try { out[idx] = await fn(items[idx], idx); } catch (err) { out[idx] = { error: String(err && err.message || err), item: items[idx] }; }
    }
  });
  await Promise.all(workers);
  return out;
}

// ---------------------------------------------------------------------------
// HTML parsing
// ---------------------------------------------------------------------------

function hiddenRanges(html) {
  const ranges = [];
  const re = /<(section|div|article|aside|li)\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[2];
    const hidden = /\shidden(\s|=|>)/i.test(attrs)
      || /style\s*=\s*["'][^"']*display\s*:\s*none/i.test(attrs);
    if (!hidden) continue;
    const tag = m[1].toLowerCase();
    const closeRe = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
    closeRe.lastIndex = m.index;
    let depth = 0;
    let end = -1;
    let t;
    while ((t = closeRe.exec(html))) {
      if (t[0][1] === '/') {
        depth--;
        if (depth === 0) { end = t.index + t[0].length; break; }
      } else {
        depth++;
      }
    }
    const stop = end > 0 ? end : html.length;
    ranges.push([m.index, stop]);
    re.lastIndex = stop;
  }
  return ranges;
}

function removeRanges(html, ranges) {
  if (!ranges.length) return html;
  const sorted = [...ranges].sort((a, b) => b[0] - a[0]);
  let out = html;
  for (const [s, e] of sorted) out = `${out.slice(0, s)} ${out.slice(e)}`;
  return out;
}

function inRanges(index, ranges) {
  return ranges.some(([s, e]) => index >= s && index < e);
}

function visibleText(html) {
  return stripTags(
    String(html)
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<template\b[\s\S]*?<\/template>/gi, ' ')
  );
}

function parseMeta(head) {
  const metas = [];
  const re = /<meta\b([^>]*?)\/?>/gi;
  let m;
  while ((m = re.exec(head))) metas.push(attrsOf(m[1]));
  return metas;
}

function metaContent(metas, key) {
  const k = key.toLowerCase();
  const hit = metas.find((x) => (x.name || '').toLowerCase() === k || (x.property || '').toLowerCase() === k);
  return hit ? String(hit.content || '') : '';
}

function parseHeadings(html, ranges) {
  const out = [];
  const re = /<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1\s*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = attrsOf(m[2]);
    out.push({
      level: Number(m[1]),
      text: stripTags(m[3]).replace(/\s+/g, ' ').trim(),
      hidden: inRanges(m.index, ranges),
      id: attrs.id || '',
    });
  }
  return out;
}

function parseJsonLd(html) {
  const out = [];
  const re = /<script\b([^>]*type\s*=\s*["']application\/ld\+json["'][^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[2].trim();
    try {
      const data = JSON.parse(raw);
      const types = [];
      const collect = (v) => {
        if (Array.isArray(v)) return v.forEach(collect);
        if (!v || typeof v !== 'object') return;
        if (v['@type']) types.push(...(Array.isArray(v['@type']) ? v['@type'] : [v['@type']]));
        if (v['@graph']) collect(v['@graph']);
      };
      collect(data);
      out.push({ ok: true, raw, data, types: uniq(types) });
    } catch (err) {
      out.push({ ok: false, raw, error: String(err && err.message || err), types: [] });
    }
  }
  return out;
}

function parseLinks(html) {
  const out = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const a = attrsOf(m[1]);
    if (!a.href) continue;
    out.push({
      href: a.href,
      rel: (a.rel || '').toLowerCase(),
      text: stripTags(m[2]).replace(/\s+/g, ' ').trim(),
    });
  }
  return out;
}

function parseImages(html) {
  const out = [];
  const re = /<img\b([^>]*?)\/?>/gi;
  let m;
  while ((m = re.exec(html))) {
    const a = attrsOf(m[1]);
    out.push({
      src: a.src || '',
      hasAlt: Object.prototype.hasOwnProperty.call(a, 'alt'),
      alt: a.alt || '',
      hasDims: Boolean(a.width && a.height),
      loading: a.loading || '',
    });
  }
  return out;
}

function parsePage(html, url, res) {
  const headMatch = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  const head = headMatch ? headMatch[1] : html;
  const body = headMatch ? html.slice(headMatch.index + headMatch[0].length) : html;
  const metas = parseMeta(head);
  const { lang: locale, rest } = splitLocalePath(new URL(url).pathname);
  const type = pageTypeOf(new URL(url).pathname);
  const ranges = hiddenRanges(body);

  const title = stripTags((head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const description = metaContent(metas, 'description');
  const keywords = metaContent(metas, 'keywords');
  const robots = metaContent(metas, 'robots');
  const langAttr = (html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']*)["']/i) || [])[1] || '';

  const canonical = (head.match(/<link\b[^>]*rel\s*=\s*["'][^"']*\bcanonical\b[^"']*["'][^>]*>/i) || [])[0];
  const canonicalHref = canonical ? attrsOf(canonical.replace(/^<link/i, '').replace(/>$/, '')).href || '' : '';

  const alternates = [];
  const linkRe = /<link\b([^>]*?)>/gi;
  let lm;
  while ((lm = linkRe.exec(head))) {
    const a = attrsOf(lm[1]);
    const rel = (a.rel || '').toLowerCase();
    if (rel.split(/\s+/).includes('alternate') && a.hreflang) {
      alternates.push({ hreflang: a.hreflang, href: a.href || '' });
    }
  }

  const headings = parseHeadings(body, ranges);
  const jsonLd = parseJsonLd(html);
  const links = parseLinks(body);
  const images = parseImages(body);
  const hiddenHtml = ranges.length ? ranges.map(([s, e]) => body.slice(s, e)).join(' ') : '';
  const hiddenCards = (hiddenHtml.match(/class="tool-card"/g) || []).length;

  const mainMatch = body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const mainRaw = mainMatch ? mainMatch[1] : body;
  const mainClean = removeRanges(mainRaw, ranges.filter(([s, e]) => s >= (mainMatch ? mainMatch.index : 0)).map(([s, e]) => [s - (mainMatch ? mainMatch.index : 0), e - (mainMatch ? mainMatch.index : 0)]));
  const mainText = visibleText(mainClean);
  const bodyText = visibleText(removeRanges(body, ranges));

  const tm = metrics(mainText);
  const bm = metrics(bodyText);

  const toolCountText = (html.match(/id="toolsCount"[^>]*>([\s\S]*?)<\/span>/i) || [])[1] || '';
  const toolCountNum = (toolCountText.match(/\d+/) || [])[0];

  const activeCat = (html.match(/class="category-item active"[\s\S]*?<span class="cat-name">([\s\S]*?)<\/span>/i) || [])[1] || '';
  const sections = [];
  const secRe = /<section\b([^>]*)>/gi;
  let sm;
  while ((sm = secRe.exec(html))) {
    const a = attrsOf(sm[1]);
    if (!a['data-category']) continue;
    sections.push({
      category: a['data-category'],
      rendered: Number(a['data-rendered'] || 0),
      total: Number(a['data-total'] || a['data-rendered'] || 0),
      hidden: /display\s*:\s*none/i.test(a.style || ''),
    });
  }

  const internal = [];
  const external = [];
  for (const l of links) {
    const abs = absUrl(l.href, url);
    if (!abs) continue;
    try {
      const u = new URL(abs);
      if (u.host === SITE_HOST) internal.push({ ...l, abs }); else external.push({ ...l, abs });
    } catch { /* ignore */ }
  }

  const schemaUrls = [];
  const walk = (v) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!v || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) {
      if (typeof x === 'string' && /^https?:\/\//.test(x)) schemaUrls.push({ key: k, url: x });
      else walk(x);
    }
  };
  jsonLd.filter((j) => j.ok).forEach((j) => walk(j.data));

  return {
    url,
    finalUrl: res.finalUrl,
    path: new URL(url).pathname,
    locale,
    rest,
    type,
    status: res.status,
    statusText: res.statusText,
    ms: res.ms,
    bytes: Buffer.byteLength(html, 'utf8'),
    headers: res.headers,
    lang: langAttr,
    title,
    description,
    keywords,
    robots,
    canonical: canonicalHref,
    alternates,
    og: {
      type: metaContent(metas, 'og:type'),
      title: metaContent(metas, 'og:title'),
      description: metaContent(metas, 'og:description'),
      image: metaContent(metas, 'og:image'),
      url: metaContent(metas, 'og:url'),
      locale: metaContent(metas, 'og:locale'),
      siteName: metaContent(metas, 'og:site_name'),
    },
    twitter: {
      card: metaContent(metas, 'twitter:card'),
      title: metaContent(metas, 'twitter:title'),
      description: metaContent(metas, 'twitter:description'),
      image: metaContent(metas, 'twitter:image'),
    },
    headings,
    jsonLd,
    schemaTypes: uniq(jsonLd.flatMap((j) => j.types)),
    schemaUrls,
    links: { total: links.length, internal, external },
    images,
    text: {
      mainChars: tm.chars, mainCjk: tm.cjk, mainUnits: tm.cjk + tm.latin,
      bodyChars: bm.chars, bodyCjk: bm.cjk,
      ratio: html.length ? Math.round((bodyText.length / html.length) * 1000) / 10 : 0,
    },
    toolCount: toolCountNum === undefined ? null : Number(toolCountNum),
    activeCategory: activeCat.replace(/\s+\d+\s*$/, '').trim(),
    sections,
    hiddenCards,
    hiddenHeadingCount: headings.filter((h) => h.hidden).length,
  };
}

// ---------------------------------------------------------------------------
// Per-page checks
// ---------------------------------------------------------------------------

const INDEXABLE_TYPES = new Set(['home', 'category', 'tool', 'about', 'submit']);

function auditPage(page) {
  const issues = [];
  const add = (severity, area, code, message, fix, detail = '') =>
    issues.push({ severity, area, code, message, fix, detail });

  const isSearchOr404 = page.type === 'search' || page.type === 'other';
  const noindex = /noindex/i.test(page.robots || '') || /noindex/i.test(page.headers['x-robots-tag'] || '');
  const indexable = INDEXABLE_TYPES.has(page.type) && !noindex;

  // A noindex search page is a tool, not a landing page: length/heading rules
  // do not apply to it, only indexability and the basics.
  const skipCopyChecks = page.type === 'search';

  // --- technical -----------------------------------------------------------
  if (page.status !== 200) {
    add('critical', 'Technical', 'http-status', `HTTP ${page.status || page.statusText}`,
      '确认该 URL 在部署环境可访问；若已下线应 301 或 410，而不是 404/5xx。');
  }
  if (page.finalUrl && normUrl(page.finalUrl) !== normUrl(page.url)) {
    add('medium', 'Technical', 'url-redirect', `请求被重定向到 ${page.finalUrl}`,
      '站点地图与内链应直接指向最终 URL，避免多跳重定向。');
  }
  if (!page.headers['cache-control']) {
    add('low', 'Technical', 'cache-control', '缺少 Cache-Control 响应头',
      '为 HTML 设置 public, max-age=0, s-maxage=60, must-revalidate。');
  }
  if (!page.lang) {
    add('high', 'Technical', 'html-lang', '<html> 缺少 lang 属性',
      '每个语言版本必须声明对应的 lang（zh-CN / en / ja / ko）。');
  } else if (page.locale && !page.lang.toLowerCase().startsWith(page.locale)) {
    add('critical', 'Technical', 'html-lang-mismatch', `<html lang="${page.lang}"> 与 URL 语言 /${page.locale} 不一致`,
      'URL 前缀与 html lang 必须一致；否则 Google 会按错误语言索引。');
  }

  if (skipCopyChecks) {
    if (!noindex) {
      add('high', 'Technical', 'search-indexable', '/search 结果页未设置 noindex',
        '搜索结果页应保持 noindex, follow，避免查询参数组合膨胀索引。');
    }
    const score = Math.max(0, 100 - issues.reduce((n, i) => n + (SEVERITY_WEIGHT[i.severity] || 0), 0));
    return { issues, score, noindex };
  }

  // --- title ---------------------------------------------------------------
  if (!page.title) {
    add('critical', 'TDK', 'title-missing', '缺少 <title>', '每个可索引页面必须有唯一标题。');
  } else {
    const m = metrics(page.title);
    if (m.width > 60) {
      add('medium', 'TDK', 'title-too-long', `标题约 ${m.width} 个字符宽（${m.chars} 字），超过 60 会被截断`,
        '把核心词前置，压到 30–60 字符宽（中文约 15–30 字）。', page.title);
    }
    if (m.width < 25) {
      add('medium', 'TDK', 'title-too-short', `标题仅 ${m.width} 个字符宽（${m.chars} 字），关键词覆盖不足`,
        '补足「品类词 + 场景词 + 年份/数量」等修饰，控制在 30–60 字符宽。', page.title);
    }
    if (page.type === 'category' && page.activeCategory && !page.title.includes(page.activeCategory)) {
      add('high', 'TDK', 'title-subject', '分类页标题未包含分类名', '标题应以分类名开头，例如「AI 对话助手工具 — 精选推荐 | SoMarkIt」。', page.title);
    }
    if (page.type === 'tool') {
      const h1 = page.headings.find((h) => h.level === 1 && !h.hidden)?.text || '';
      const slug = page.path.split('/').pop() || '';
      const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
      if (slug && !norm(page.title).includes(norm(slug)) && h1 && !page.title.includes(h1.split(/\s+/)[0])) {
        add('high', 'TDK', 'title-subject', '评测页标题未包含工具名', '标题以工具名开头，后接「评测 / 功能 / 价格」。', page.title);
      }
    }
    if ((page.type === 'home' || page.type === 'about') && !/AI|工具|tool|directory/i.test(page.title)) {
      add('medium', 'TDK', 'title-keyword', '标题缺少核心品类词（AI 工具 / AI tool directory）',
        '首页与关于页标题都应出现站点定位词。', page.title);
    }
  }

  // --- description ---------------------------------------------------------
  if (!page.description) {
    add('high', 'TDK', 'desc-missing', '缺少 meta description',
      '每个可索引页面写 70–160 字符宽的独立描述，包含页面主题与行动号召。');
  } else {
    const m = metrics(page.description);
    if (m.width > 165) {
      add('medium', 'TDK', 'desc-too-long', `描述约 ${m.width} 字符宽（${m.chars} 字），超过 165 会被截断`,
        '压到 70–160 字符宽（中文约 35–80 字），把结论放前 120 字符。', page.description);
    }
    if (m.width < 70) {
      add('medium', 'TDK', 'desc-too-short', `描述仅 ${m.width} 字符宽（${m.chars} 字），信息量不足`,
        '补充收录范围、目标用户、更新频率等具体信息。', page.description);
    }
    if (page.description === page.title) {
      add('medium', 'TDK', 'desc-equals-title', '描述与标题完全相同', '描述应是标题的补充，而不是重复。');
    }
    if (/, \d+\.\s/.test(page.description)) {
      add('high', 'TDK', 'desc-template-bug', '描述出现拼接残留（孤立数字 + 英文句点）',
        '模板把计数与固定文案硬拼在一起，应改成完整的 SEO 描述模板。', page.description);
    }
  }

  // --- keywords ------------------------------------------------------------
  if (!page.keywords) {
    add('low', 'TDK', 'keywords-missing', '缺少 meta keywords',
      'Google 已忽略该标签，但 AITDK/部分站长工具仍会读取；可按页面补 5–8 个词保持一致。');
  } else if (page.locale && page.locale !== 'zh' && cjkRatio(page.keywords) > 0.4) {
    add('low', 'TDK', 'keywords-lang', '外文页面的 keywords 仍是中文',
      '按语言生成对应的关键词列表，避免整站复用同一串中文词。');
  }

  // --- robots --------------------------------------------------------------
  if (page.type === 'other') {
    // 404 is expected to be noindex.
  } else if (!/noindex/i.test(page.robots || '') && !/index/i.test(page.robots || '')) {
    add('low', 'Technical', 'robots-missing', '缺少 robots meta', '补 index, follow, max-image-preview:large。');
  }

  // --- canonical -----------------------------------------------------------
  if (indexable && !page.canonical) {
    add('high', 'Technical', 'canonical-missing', '缺少 canonical', '每个可索引页面加自引用 canonical。');
  }
  if (page.canonical) {
    if (!/^https?:\/\//i.test(page.canonical)) {
      add('medium', 'Technical', 'canonical-relative', 'canonical 不是绝对地址', '使用 https://somarkit.com/... 绝对地址。', page.canonical);
    } else if (!samePageUrl(page.canonical, page.url)) {
      add('high', 'Technical', 'canonical-mismatch', `canonical 指向 ${page.canonical}，与当前 URL 不一致`,
        'canonical 必须自引用；语言别名应 301 到带前缀的规范地址。', page.canonical);
    }
    if (/[?&]/.test(page.canonical)) {
      add('low', 'Technical', 'canonical-query', 'canonical 带查询参数', 'canonical 不要包含 q/page 等参数。', page.canonical);
    }
  }

  // --- hreflang ------------------------------------------------------------
  if (page.canonical && !page.alternates.length) {
    add('high', 'i18n', 'hreflang-missing', '缺少 hreflang 语言版本声明',
      '多语言站点每个页面都要输出全语言 hreflang + x-default 并自引用。');
  } else if (page.alternates.length) {
    const codes = page.alternates.map((a) => a.hreflang.toLowerCase());
    if (!codes.includes('x-default')) {
      add('medium', 'i18n', 'hreflang-xdefault', '缺少 hreflang="x-default"', '为默认语言版本补 x-default。');
    }
    if (page.locale && !codes.includes(page.locale)) {
      add('high', 'i18n', 'hreflang-self', `hreflang 集合缺少自引用（${page.locale}）`,
        'hreflang 必须包含当前页面自身。');
    }
    if (uniq(codes).length !== codes.length) {
      add('low', 'i18n', 'hreflang-duplicate', 'hreflang 语言码重复', '每种语言只输出一次。');
    }
    if (page.alternates.some((a) => !/^https?:\/\//i.test(a.href))) {
      add('medium', 'i18n', 'hreflang-relative', 'hreflang href 不是绝对地址', 'hreflang 必须使用绝对 URL。');
    }
  }

  // --- headings ------------------------------------------------------------
  const visible = page.headings.filter((h) => !h.hidden);
  const h1s = visible.filter((h) => h.level === 1);
  const empty = visible.filter((h) => !h.text);
  if (!h1s.length) {
    add('critical', 'Headings', 'h1-missing', '页面没有可见的 H1', '每个页面保留且仅保留一个 H1，写明页面主题。');
  } else if (h1s.length > 1) {
    add('high', 'Headings', 'h1-multiple', `页面有 ${h1s.length} 个 H1`, '合并为一个 H1，其余降为 H2。');
  }
  if (visible.length && visible[0].level !== 1) {
    add('high', 'Headings', 'h1-order', `第一个标题是 H${visible[0].level}，不是 H1`, '正文第一个标题必须是 H1。');
  }
  for (let i = 1; i < visible.length; i++) {
    if (visible[i].level > visible[i - 1].level + 1) {
      add('medium', 'Headings', 'heading-skip', `标题层级跳跃：H${visible[i - 1].level} → H${visible[i].level}（${truncate(visible[i].text, 24)}）`,
        '按 H1 → H2 → H3 递进，不要跳级。');
      break;
    }
  }
  if (empty.length) {
    add('medium', 'Headings', 'heading-empty', `${empty.length} 个标题没有文字`, '空标题会稀释结构信号，删除或补文案。');
  }
  if (page.hiddenHeadingCount >= 3) {
    add('medium', 'Headings', 'heading-hidden', `DOM 中还有 ${page.hiddenHeadingCount} 个隐藏标题（display:none）`,
      '隐藏容器仍会被解析；服务端只渲染当前分类，其余分类不要下发。');
  }
  if (page.hiddenCards >= 10) {
    add('high', 'Content', 'hidden-cards', `分类页在 display:none 容器里还渲染了 ${page.hiddenCards} 张其他分类的工具卡片`,
      '服务端只渲染当前分类，其余分类用链接跳转；否则每个分类页都近似全站重复内容，HTML 体积也会翻倍。');
  }
  if (indexable && visible.length < 2) {
    add('medium', 'Headings', 'headings-few', `可见标题仅 ${visible.length} 个`, '至少保留 H1 与一个 H2，用 H2 划分页面主题块。');
  }

  if (page.type === 'home' && h1s.length === 1) {
    const t = h1s[0].text;
    if (!/\bAI\b|人工智能|AI\s*工具/i.test(t)) {
      add('high', 'Headings', 'h1-keyword', '首页 H1 是纯口号，不含「AI 工具/AI 导航」核心词',
        'H1 改成「AI 工具导航」类主题句，口号放副标题。', t);
    }
  }
  if (page.type === 'category' && page.activeCategory && h1s.length === 1) {
    if (!h1s[0].text.includes(page.activeCategory)) {
      add('high', 'Headings', 'h1-subject', `分类页 H1 未使用分类名「${page.activeCategory}」`,
        '分类页应有独立 H1（如「AI 对话助手工具」），而不是复用首页口号。', h1s[0].text);
    }
  }
  if (page.type === 'category' && page.activeCategory) {
    if (!visible.some((h) => h.level === 2 && h.text.includes(page.activeCategory))) {
      add('medium', 'Headings', 'category-h2', '分类页没有以分类名命名的 H2，主题只靠 H1 支撑',
        '把列表区标题从「工具列表」换成「AI 对话助手工具推荐」，并补一段分类导语。');
    }
  }
  if (page.type === 'tool' && visible.filter((h) => h.level === 2).length < 2) {
    add('high', 'Headings', 'tool-no-h2', '评测页正文没有 H2 分节（只有「相关工具」一个 H2）',
      '用 H2 组织「简介 / 核心功能 / 定价 / 优缺点 / 替代品 / 常见问题」。');
  }

  // --- content -------------------------------------------------------------
  const units = page.text.mainUnits;
  if (page.type === 'tool' && units < 600) {
    add('high', 'Content', 'thin-review', `评测正文约 ${units} 字/词，内容过薄`,
      '补充 800–1500 字的真实评测：功能实测、价格、优缺点、适用人群、替代方案。');
  } else if (page.type === 'about' && units < 500) {
    add('high', 'Content', 'thin-about', `关于页正文约 ${units} 字/词，E-E-A-T 信息不足`,
      '补充团队/作者、筛选与评测标准、更新频率、联系方式、编辑政策。');
  } else if (page.type === 'home' && units < 800) {
    add('medium', 'Content', 'thin-home', `首页正文约 ${units} 字/词`, '增加一段站点介绍与分类导语，帮助搜索引擎理解主题。');
  } else if (page.type === 'category' && units < 500) {
    add('medium', 'Content', 'thin-category', `分类页正文约 ${units} 字/词`,
      '为分类补 150–300 字导语（这个分类解决什么问题、怎么选、收录标准）。');
  }

  // --- structured data -----------------------------------------------------
  const badLd = page.jsonLd.filter((j) => !j.ok);
  if (badLd.length) {
    add('critical', 'Structured Data', 'jsonld-invalid', `${badLd.length} 段 JSON-LD 解析失败`,
      '修复 JSON 语法；用 Rich Results Test 验证。', badLd[0].error);
  }
  const expected = {
    home: ['WebSite', 'Organization'],
    category: ['CollectionPage'],
    tool: ['SoftwareApplication', 'BreadcrumbList'],
    about: ['AboutPage', 'Organization'],
  }[page.type] || [];
  const missingTypes = expected.filter((t) => !page.schemaTypes.includes(t));
  if (expected.length && missingTypes.length) {
    add('medium', 'Structured Data', 'schema-expected', `缺少结构化类型：${missingTypes.join(', ')}`,
      '按页面类型补齐 JSON-LD，并与可见内容一致。');
  }

  if (page.type === 'home') {
    const website = page.jsonLd.find((j) => j.ok && j.types.includes('WebSite'));
    const action = website && website.data && website.data.potentialAction;
    const target = action && (action.target?.urlTemplate || action.target?.url || '');
    if (target && !target.includes('/search')) {
      add('medium', 'Structured Data', 'searchaction-target', `SearchAction 指向 ${target}，但站内搜索在 /search`,
        '改为 https://somarkit.com/{lang}/search?q={search_term_string}，否则该动作无效。', target);
    }
  }

  if (page.type === 'tool') {
    const app = page.jsonLd.find((j) => j.ok && j.types.includes('SoftwareApplication'))?.data;
    if (app && app.offers && app.offers.price === undefined) {
      add('medium', 'Structured Data', 'offer-price', 'SoftwareApplication 的 Offer 缺少 price',
        '免费/免费增值写 price: "0"；付费写最低价，避免产生不完整 Offer。');
    }
    if (app && !app.dateModified) {
      add('low', 'Structured Data', 'schema-datemodified', 'SoftwareApplication 缺少 dateModified',
        '补 dateModified，让搜索引擎知道评测的更新时间。');
    }
  }

  // --- social --------------------------------------------------------------
  if (!page.og.image) {
    add('high', 'Social', 'og-image-missing', '缺少 og:image', '提供 1200×630 的 PNG/JPG 社交分享图。');
  }
  if (!page.twitter.card) {
    add('low', 'Social', 'twitter-card', '缺少 twitter:card', '补 summary_large_image。');
  }
  if (page.og.title && page.title && page.og.title.trim() !== page.title.trim()) {
    add('low', 'Social', 'og-title-mismatch', 'og:title 与 <title> 不一致', '两者保持一致，避免分享卡片与搜索结果割裂。');
  }
  if (page.type === 'tool' && page.og.type === 'website') {
    add('low', 'Social', 'og-type', '评测页 og:type 仍是 website', '评测/文章型页面用 article，并补 published_time / modified_time。');
  }

  // --- images --------------------------------------------------------------
  const noAlt = page.images.filter((i) => !i.hasAlt).length;
  if (noAlt) {
    add('medium', 'Images', 'img-alt', `${noAlt} 个 <img> 完全没有 alt 属性`,
      '内容图写描述性 alt；纯装饰图写 alt=""。');
  }
  const noDims = page.images.filter((i) => !i.hasDims).length;
  if (noDims > 2) {
    add('low', 'Images', 'img-dims', `${noDims} 个 <img> 缺少 width/height`, '补尺寸避免 CLS。');
  }

  // --- links ---------------------------------------------------------------
  if (page.linkCount !== undefined && page.links.internal.length < 8 && page.type !== 'search') {
    add('low', 'Links', 'internal-links-few', `站内链接仅 ${page.links.internal.length} 个`, '补上下文内链，连接到分类页与相关评测。');
  }

  const score = Math.max(0, 100 - issues.reduce((n, i) => n + (SEVERITY_WEIGHT[i.severity] || 0), 0));
  return { issues, score, noindex };
}

// ---------------------------------------------------------------------------
// Site-level checks
// ---------------------------------------------------------------------------

function parseSitemap(xml) {
  const urls = [];
  const re = /<url>([\s\S]*?)<\/url>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const loc = textOfTag(block, 'loc');
    if (!loc) continue;
    const alternates = [];
    const lre = /<xhtml:link\b([^>]*?)\/?>/g;
    let lm;
    while ((lm = lre.exec(block))) {
      const a = attrsOf(lm[1]);
      if (a.hreflang && a.href) alternates.push({ hreflang: a.hreflang, href: a.href });
    }
    urls.push({
      loc,
      lastmod: textOfTag(block, 'lastmod'),
      changefreq: textOfTag(block, 'changefreq'),
      priority: textOfTag(block, 'priority'),
      alternates,
    });
  }
  return { urls, isIndex: /<sitemapindex\b/i.test(xml) };
}

async function auditSite(pages, sitemap, robotsRes) {
  const issues = [];
  const add = (severity, area, code, message, fix, detail = '') =>
    issues.push({ severity, area, code, message, fix, detail });

  const indexable = pages.filter((p) => INDEXABLE_TYPES.has(p.type) && p.status === 200 && !/noindex/i.test(p.robots || ''));
  const noindexPages = pages.filter((p) => /noindex/i.test(p.robots || '') || /noindex/i.test(p.headers['x-robots-tag'] || ''));

  // --- duplicate TDK -------------------------------------------------------
  for (const field of ['title', 'description']) {
    const byLocale = new Map();
    for (const p of indexable) {
      const key = `${p.locale || 'none'}|${(p[field] || '').trim().toLowerCase()}`;
      if (!byLocale.has(key)) byLocale.set(key, []);
      byLocale.get(key).push(p);
    }
    for (const [key, list] of byLocale) {
      if (!key.split('|')[1] || list.length < 2) continue;
      add('high', 'TDK', `duplicate-${field}`, `${list.length} 个 ${list[0].locale} 页面共用同一 ${field}`,
        `为每个页面写独立的 ${field}；列表页用分类/页码区分，详情页用工具名区分。`,
        list.slice(0, 6).map((p) => p.path).join(', '));
    }
  }

  // --- keywords template ---------------------------------------------------
  const kw = uniq(indexable.map((p) => p.keywords).filter(Boolean));
  if (indexable.length > 4 && kw.length === 1) {
    add('medium', 'TDK', 'keywords-template', `全站 ${indexable.length} 个页面共用同一串 meta keywords`,
      '按页面生成关键词（首页=品牌+品类，分类页=分类词，评测页=工具名+评测/价格/替代）。', truncate(kw[0], 90));
  }

  // --- locale coverage -----------------------------------------------------
  const translatedLocales = ['en', 'ja', 'ko'];
  for (const loc of translatedLocales) {
    const locPages = indexable.filter((p) => p.locale === loc);
    if (!locPages.length) continue;
    const untranslated = locPages.filter((p) => looksUntranslated(p.description, loc));
    if (untranslated.length) {
      add('high', 'i18n', 'locale-untranslated', `/${loc} 下有 ${untranslated.length}/${locPages.length} 个页面描述仍是中文`,
        'hreflang 声称这些页面是该语言的翻译版本，但正文未翻译，属于重复内容；补齐该语言的 category/tool 描述。',
        untranslated.slice(0, 5).map((p) => p.path).join(', '));
    }
  }

  // --- social: one template, one finding -----------------------------------
  const svgOg = indexable.filter((p) => /\.svg(\?|$)/i.test(p.og.image));
  if (svgOg.length) {
    add('high', 'Social', 'og-image-svg', `${svgOg.length}/${indexable.length} 个页面的 og:image 是 SVG`,
      'Facebook / X / LinkedIn 不渲染 SVG 分享图；换一张 1200×630 的 PNG 或 JPG，并补 og:image:width / height / alt。',
      svgOg[0].og.image);
  }

  // --- structured data URLs must use the same locale prefix as canonical ---
  const schemaPaths = uniq(indexable.flatMap((p) => p.schemaUrls
    .filter(({ url }) => {
      try {
        const u = new URL(url);
        if (u.host !== SITE_HOST) return false;
        if (/\.(png|jpe?g|svg|webp|ico|xml|txt|js|css)$/i.test(u.pathname)) return false;
        if (u.pathname === '/') return false;
        return !LOCALES.includes(u.pathname.split('/')[1]);
      } catch { return false; }
    })
    .map(({ url }) => new URL(url).pathname)));
  if (schemaPaths.length) {
    add('medium', 'Structured Data', 'schema-url-locale', `${schemaPaths.length} 个 JSON-LD 站内 URL 缺少语言前缀`,
      'ItemList / BreadcrumbList 里的 URL 必须与 canonical 完全一致，统一加 /zh 等前缀。',
      schemaPaths.slice(0, 6).join(', '));
  }

  // --- hreflang reciprocity ------------------------------------------------
  const samples = ['home', 'category', 'tool', 'about']
    .map((t) => pages.find((p) => p.type === t && p.locale === opt.lang && p.status === 200))
    .filter(Boolean);
  for (const sample of samples) {
    if (IS_LOCAL) break; // the alternates point at production
    const alts = sample.alternates.filter((a) => a.hreflang !== 'x-default');
    if (!alts.length) continue;
    const results = await mapLimit(alts, 4, async (alt) => {
      const res = await get(alt.href);
      if (res.status !== 200) return { alt, status: res.status };
      const p = parsePage(res.body, alt.href, res);
      return {
        alt,
        status: res.status,
        canonical: p.canonical,
        hasBack: p.alternates.some((x) => normUrl(x.href) === normUrl(sample.url)),
        lang: p.lang,
      };
    });
    const broken = results.filter((r) => r.status !== 200);
    if (broken.length) {
      add('critical', 'i18n', 'hreflang-broken', `${sample.path} 的 hreflang 有 ${broken.length} 个目标打不开`,
        'hreflang 只能指向 200 的规范页面。', broken.map((b) => `${b.alt.hreflang}:${b.status}`).join(', '));
      continue;
    }
    const noBack = results.filter((r) => !r.hasBack);
    if (noBack.length) {
      add('high', 'i18n', 'hreflang-not-reciprocal', `${sample.path} 的 hreflang 缺少回链（${noBack.length} 个）`,
        '每个语言版本都必须列出全部语言版本，包括自己。', noBack.map((r) => r.alt.hreflang).join(', '));
    }
    const canonicalMismatch = results.filter((r) => normUrl(r.canonical) !== normUrl(r.alt.href));
    if (canonicalMismatch.length) {
      add('high', 'i18n', 'hreflang-canonical', `${sample.path} 的 hreflang 目标 canonical 不指向自身（${canonicalMismatch.length} 个）`,
        'hreflang 目标页必须自引用 canonical。', canonicalMismatch.map((r) => `${r.alt.hreflang} → ${r.canonical}`).join(', '));
    }
  }

  // --- sitemap -------------------------------------------------------------
  if (!sitemap) {
    if (opt.sitemap) add('critical', 'Sitemap', 'sitemap-missing', '无法获取 /sitemap.xml', '确保站点地图可访问且返回 application/xml。');
  } else {
    if (!sitemap.urls.length) {
      add('critical', 'Sitemap', 'sitemap-empty', '站点地图里没有 URL', '输出至少首页与分类页。');
    }
    const today = localDate();
    const todayCount = sitemap.urls.filter((u) => u.lastmod === today).length;
    if (sitemap.urls.length > 4 && todayCount / sitemap.urls.length > 0.8) {
      add('medium', 'Sitemap', 'sitemap-lastmod-static', `${todayCount}/${sitemap.urls.length} 个 URL 的 lastmod 都是今天`,
        'lastmod 应反映内容真实更新时间；每次生成都写今天会让爬虫忽略该字段。首页/分类页用真实变更日，或直接省略。');
    }
    const future = sitemap.urls.filter((u) => u.lastmod && u.lastmod > today);
    if (future.length) {
      add('high', 'Sitemap', 'sitemap-lastmod-future', `${future.length} 个 URL 的 lastmod 在未来`, 'lastmod 不能晚于当前时间。');
    }
    const hreflangInconsistent = sitemap.urls.filter((u) => !u.alternates.length);
    if (hreflangInconsistent.length) {
      add('medium', 'Sitemap', 'sitemap-hreflang', `${hreflangInconsistent.length} 个 URL 缺少 xhtml:link 语言版本`,
        '多语言站点在地图里同步输出 hreflang，或干脆不在 sitemap 里写。');
    }

    // Verify every sitemap URL: status + canonical + noindex.
    const checks = await mapLimit(sitemap.urls, Math.max(4, opt.concurrency), async (entry) => {
      const res = await get(entry.loc);
      if (res.status !== 200) return { entry, status: res.status };
      const p = parsePage(res.body, entry.loc, res);
      return {
        entry,
        status: res.status,
        canonical: p.canonical,
        noindex: /noindex/i.test(p.robots || '') || /noindex/i.test(p.headers['x-robots-tag'] || ''),
      };
    });
    const badStatus = checks.filter((c) => c.status !== 200);
    if (badStatus.length) {
      add('critical', 'Sitemap', 'sitemap-status', `站点地图中有 ${badStatus.length} 个 URL 返回非 200`,
        '移除 404/5xx/重定向 URL，只保留 200 的规范地址。',
        badStatus.slice(0, 8).map((c) => `${c.entry.loc} → ${c.status}`).join(', '));
    }
    const canonicalMismatch = checks.filter((c) => c.canonical && !samePageUrl(c.canonical, c.entry.loc));
    if (canonicalMismatch.length) {
      add('high', 'Sitemap', 'sitemap-canonical', `${canonicalMismatch.length} 个 sitemap URL 与页面 canonical 不一致`,
        '站点地图只列 canonical URL。',
        canonicalMismatch.slice(0, 6).map((c) => `${c.entry.loc} → ${c.canonical}`).join(', '));
    }
    const noindexInSitemap = checks.filter((c) => c.noindex);
    if (noindexInSitemap.length) {
      add('high', 'Sitemap', 'sitemap-noindex', `${noindexInSitemap.length} 个 noindex 页面被写进站点地图`,
        'noindex 页面不应出现在 sitemap。', noindexInSitemap.slice(0, 6).map((c) => c.entry.loc).join(', '));
    }
    const urlLocaleSet = uniq(sitemap.urls.map((u) => splitLocalePath(new URL(u.loc).pathname).lang || 'none'));
    if (urlLocaleSet.length < 2) {
      add('low', 'Sitemap', 'sitemap-locales', `站点地图只覆盖 ${urlLocaleSet.join(', ')}`, '多语言站点的 sitemap 应覆盖全部语言版本。');
    }
    const searchInSitemap = sitemap.urls.filter((u) => /\/search(\?|$)/.test(u.loc));
    if (searchInSitemap.length) {
      add('high', 'Sitemap', 'sitemap-search', '搜索结果页出现在站点地图中', '移除 /search，避免索引膨胀。');
    }
  }

  // --- robots.txt ----------------------------------------------------------
  if (!robotsRes || robotsRes.status !== 200) {
    add('critical', 'Technical', 'robots-missing', 'robots.txt 不可访问', '返回 200 的 text/plain 并指向 sitemap。');
  } else {
    const txt = robotsRes.body;
    if (!/^\s*sitemap\s*:/im.test(txt)) {
      add('medium', 'Technical', 'robots-sitemap', 'robots.txt 没有 Sitemap 指令', '补 Sitemap: https://somarkit.com/sitemap.xml。');
    } else {
      const smUrl = (txt.match(/^\s*sitemap\s*:\s*(\S+)/im) || [])[1];
      if (smUrl && !/^https?:\/\//i.test(smUrl)) {
        add('low', 'Technical', 'robots-sitemap-relative', 'Sitemap 指令应为绝对 URL', '写完整的 https:// 地址。');
      }
    }
    if (/^\s*disallow\s*:\s*\/\s*$/im.test(txt)) {
      add('critical', 'Technical', 'robots-block-all', 'robots.txt 屏蔽了全站', '只精确屏蔽 /admin 与 /api。');
    }
    if (!/disallow\s*:\s*\/admin/i.test(txt)) {
      add('medium', 'Technical', 'robots-admin', 'robots.txt 未屏蔽 /admin', '补 Disallow: /admin 与 /api。');
    }
  }

  // --- OG image asset ------------------------------------------------------
  const ogImages = uniq(indexable.map((p) => p.og.image).filter(Boolean));
  for (const img of ogImages.slice(0, 4)) {
    if (IS_LOCAL) break;
    if (/\.svg(\?|$)/i.test(img)) continue; // already reported per page
    const res = await get(img);
    const ct = (res.headers['content-type'] || '').toLowerCase();
    if (res.status !== 200) {
      add('high', 'Social', 'og-image-broken', `og:image 无法访问：${img} (${res.status})`, '上传可公开访问的分享图。');
    } else if (!/^image\//.test(ct)) {
      add('medium', 'Social', 'og-image-type', `og:image Content-Type 是 ${ct}`, '返回 image/png 或 image/jpeg。');
    }
  }

  // --- title template ------------------------------------------------------
  const toolTitles = indexable.filter((p) => p.type === 'tool');
  if (toolTitles.length >= 2) {
    const patterned = toolTitles.filter((p) => /—\s*(免费增值|免费|付费|开源|Free|Freemium|Paid|Open source)\s*\|/i.test(p.title));
    if (patterned.length === toolTitles.length) {
      add('medium', 'TDK', 'title-tool-pattern', '所有评测页标题都用「工具名 — 定价 | SoMarkIt」模板',
        '定价不是搜索词；模板改成「工具名 评测：功能、价格与替代方案（2026）」，把定价放进描述。');
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scoreOf(pages, siteIssues) {
  // Score only indexable content pages: noindex search/404 pages and empty
  // category placeholders would otherwise inflate or deflate the average.
  const scored = pages.filter((p) => p.status === 200 && !p.noindex && p.type !== 'other' && p.type !== 'search');
  const avg = scored.length ? scored.reduce((n, p) => n + p.score, 0) / scored.length : 100;
  const sitePenalty = Math.min(30, siteIssues.reduce((n, i) => n + (SEVERITY_WEIGHT[i.severity] || 0) * 0.5, 0));
  const score = Math.max(0, Math.min(100, Math.round(avg - sitePenalty)));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 65 ? 'C' : score >= 50 ? 'D' : 'E';
  return { score, grade };
}

// ---------------------------------------------------------------------------
// Report: Markdown
// ---------------------------------------------------------------------------

function severityBadge(s) {
  return `\`${SEVERITY_LABEL[s] || s}\``;
}

function headingTreeMarkdown(headings, max = 30) {
  if (!headings.length) return '_无标题_';
  return headings.slice(0, max).map((h) => {
    const hidden = h.hidden ? ' _(hidden)_' : '';
    return `${'  '.repeat(Math.max(0, h.level - 1))}- **H${h.level}** ${mdCell(truncate(h.text, 80))}${hidden}`;
  }).join('\n');
}

function renderMarkdown(data) {
  const { meta, pages, siteIssues, sitemap, robots } = data;
  const lines = [];
  lines.push('# SoMarkIt SEO 审计报告');
  lines.push('');
  lines.push(`- 站点：${meta.base}`);
  lines.push(`- 抓取时间：${meta.generatedAt}`);
  lines.push(`- 抓取页面：${pages.length} 个（HTML），站点地图 ${sitemap ? sitemap.urls.length : 0} 个 URL`);
  lines.push(`- SEO 总分：**${meta.score}/100（${meta.grade}）**`);
  lines.push('');
  lines.push('> 本报告由 `scripts/seo-audit.mjs` 生成。检查口径参考 AITDK：Title / Description / Keywords、H1–H6 结构、canonical、robots、hreflang、OG、结构化数据，并补充跨页面重复与 sitemap 一致性检查。');
  lines.push('');

  lines.push('## 一、问题分布');
  lines.push('');
  lines.push('| 级别 | 页面问题 | 全站问题 |');
  lines.push('|---|---:|---:|');
  const all = [...pages.flatMap((p) => p.issues), ...siteIssues];
  for (const s of SEVERITY_ORDER) {
    const p = pages.flatMap((x) => x.issues).filter((i) => i.severity === s).length;
    const g = siteIssues.filter((i) => i.severity === s).length;
    lines.push(`| ${SEVERITY_LABEL[s]} | ${p} | ${g} |`);
  }
  lines.push('');

  lines.push('## 二、页面 TDK 总表');
  lines.push('');
  lines.push('| 页面 | 类型 | 状态 | Title（宽） | Description（宽） | H1 | 标题数 | 分数 |');
  lines.push('|---|---|---:|---:|---:|---|---:|---:|');
  for (const p of pages) {
    const tw = p.title ? metrics(p.title).width : 0;
    const dw = p.description ? metrics(p.description).width : 0;
    const h1 = p.headings.find((h) => h.level === 1 && !h.hidden);
    lines.push(`| ${mdCell(p.path)} | ${TYPE_LABEL[p.type] || p.type} | ${p.status} | ${tw} | ${dw} | ${mdCell(truncate(h1 ? h1.text : '—', 30))} | ${p.headings.filter((h) => !h.hidden).length} | ${p.score} |`);
  }
  lines.push('');

  lines.push('## 三、重点页面结构');
  lines.push('');
  const samples = ['home', 'category', 'tool', 'about', 'search']
    .map((t) => pages.find((p) => p.type === t && p.locale === opt.lang && !p.empty)
      || pages.find((p) => p.type === t && p.locale === opt.lang))
    .filter(Boolean);
  for (const p of samples) {
    lines.push(`### ${TYPE_LABEL[p.type]}：\`${p.path}\``);
    lines.push('');
    lines.push(`- URL：${p.url}`);
    lines.push(`- 状态：${p.status} · ${p.ms}ms · ${(p.bytes / 1024).toFixed(1)} KB`);
    lines.push(`- Title：${p.title ? `\`${p.title}\`（${metrics(p.title).width} 字符宽 / ${metrics(p.title).chars} 字）` : '_缺失_'}`);
    lines.push(`- Description：${p.description ? `\`${truncate(p.description, 180)}\`（${metrics(p.description).width} 字符宽）` : '_缺失_'}`);
    lines.push(`- Keywords：${p.keywords ? `\`${truncate(p.keywords, 120)}\`` : '_缺失_'}`);
    lines.push(`- Canonical：${p.canonical || '_缺失_'}`);
    lines.push(`- Robots：${p.robots || '_缺失_'}`);
    lines.push(`- Hreflang：${p.alternates.map((a) => a.hreflang).join(' / ') || '_缺失_'}`);
    lines.push(`- 正文：约 ${p.text.mainUnits} 字/词，可见标题 ${p.headings.filter((h) => !h.hidden).length} 个，隐藏标题 ${p.hiddenHeadingCount} 个`);
    lines.push('');
    lines.push('标题结构：');
    lines.push('');
    lines.push(headingTreeMarkdown(p.headings, 24));
    lines.push('');
    if (p.issues.length) {
      lines.push('本页问题：');
      lines.push('');
      for (const i of p.issues) {
        lines.push(`- ${severityBadge(i.severity)} **${i.area}** ${i.message}  `);
        lines.push(`  修复：${i.fix}`);
      }
      lines.push('');
    }
  }

  lines.push('## 四、全站问题');
  lines.push('');
  if (!siteIssues.length) lines.push('_未发现全站级问题。_');
  for (const s of SEVERITY_ORDER) {
    const list = siteIssues.filter((i) => i.severity === s);
    if (!list.length) continue;
    lines.push(`### ${SEVERITY_LABEL[s]}`);
    lines.push('');
    for (const i of list) {
      lines.push(`- **${i.code}** ${i.message}  `);
      lines.push(`  修复：${i.fix}  `);
      if (i.detail) lines.push(`  证据：${i.detail}`);
    }
    lines.push('');
  }

  lines.push('## 五、站点地图');
  lines.push('');
  if (sitemap) {
    lines.push(`- URL 数：${sitemap.urls.length}`);
    lines.push(`- 语言覆盖：${uniq(sitemap.urls.map((u) => splitLocalePath(new URL(u.loc).pathname).lang || 'none')).join(', ')}`);
    lines.push(`- lastmod 取值：${uniq(sitemap.urls.map((u) => u.lastmod)).join(', ') || '—'}`);
    lines.push(`- hreflang 覆盖：${sitemap.urls.filter((u) => u.alternates.length).length}/${sitemap.urls.length}`);
    lines.push('');
    lines.push('| # | URL | lastmod | changefreq | priority | 语言版本 |');
    lines.push('|---:|---|---|---|---:|---:|');
    sitemap.urls.slice(0, 200).forEach((u, i) => {
      lines.push(`| ${i + 1} | ${mdCell(u.loc)} | ${u.lastmod || '—'} | ${u.changefreq || '—'} | ${u.priority || '—'} | ${u.alternates.length} |`);
    });
    if (sitemap.urls.length > 200) lines.push(`| … | 其余 ${sitemap.urls.length - 200} 条见 HTML 报告 | | | | |`);
  } else {
    lines.push('_未获取到站点地图。_');
  }
  lines.push('');

  lines.push('## 六、robots.txt');
  lines.push('');
  lines.push('```');
  lines.push(robots ? robots.body.trim() : '(不可访问)');
  lines.push('```');
  lines.push('');

  lines.push('## 七、可修改项汇总');
  lines.push('');
  const groups = new Map();
  for (const i of [...siteIssues, ...pages.flatMap((p) => p.issues)]) {
    const key = `${i.severity}|${i.code}`;
    if (!groups.has(key)) groups.set(key, { ...i, count: 0, pages: [] });
    const g = groups.get(key);
    g.count++;
    if (i.detail) g.pages.push(i.detail);
  }
  const sorted = [...groups.values()].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || b.count - a.count);
  lines.push('| 优先级 | 区域 | 问题 | 次数 | 建议 |');
  lines.push('|---|---|---|---:|---|');
  for (const g of sorted) {
    lines.push(`| ${SEVERITY_LABEL[g.severity]} | ${g.area} | ${mdCell(g.message)} | ${g.count} | ${mdCell(g.fix)} |`);
  }
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Report: HTML dashboard
// ---------------------------------------------------------------------------

function renderHtml(data) {
  const { meta, pages, siteIssues, sitemap, robots } = data;
  const all = [...siteIssues, ...pages.flatMap((p) => p.issues)];
  const counts = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, all.filter((i) => i.severity === s).length]));

  const pageCard = (p) => {
    const tw = p.title ? metrics(p.title).width : 0;
    const dw = p.description ? metrics(p.description).width : 0;
    const h1 = p.headings.find((h) => h.level === 1 && !h.hidden);
    const tree = p.headings.length
      ? p.headings.map((h) => `<div class="hrow lv${h.level}${h.hidden ? ' hid' : ''}"><span class="lvl">H${h.level}</span><span class="ht">${escapeHtml(h.text || '(空)')}</span>${h.hidden ? '<span class="hbadge">隐藏</span>' : ''}</div>`).join('')
      : '<div class="muted">无标题</div>';
    const issues = p.issues.length
      ? p.issues.map((i) => `<li class="iss ${i.severity}"><span class="dot"></span><div><b>${escapeHtml(i.message)}</b><div class="fix">${escapeHtml(i.fix)}</div>${i.detail ? `<div class="ev">${escapeHtml(i.detail)}</div>` : ''}</div></li>`).join('')
      : '<li class="iss ok"><span class="dot"></span><div><b>未发现问题</b></div></li>';
    return `<article class="page" data-type="${p.type}" data-locale="${p.locale || ''}" data-search="${escapeHtml(`${p.path} ${p.title} ${h1?.text || ''}`.toLowerCase())}">
      <header class="phead">
        <span class="type t-${p.type}">${TYPE_LABEL[p.type] || p.type}</span>
        <a class="purl" href="${escapeHtml(p.url)}" target="_blank" rel="noopener">${escapeHtml(p.path)}</a>
        <span class="pstat">${p.status} · ${p.ms}ms · ${(p.bytes / 1024).toFixed(0)}KB</span>
        <span class="pscore ${p.score >= 80 ? 'good' : p.score >= 60 ? 'mid' : 'bad'}">${p.score}</span>
      </header>
      <div class="tdk">
        <div class="row"><span class="k">Title</span><span class="v">${escapeHtml(p.title || '(缺失)')}</span><span class="len ${tw > 60 ? 'warn' : tw < 25 ? 'warn' : 'ok'}">${tw} 宽 / ${p.title ? metrics(p.title).chars : 0} 字</span></div>
        <div class="row"><span class="k">Desc</span><span class="v">${escapeHtml(p.description || '(缺失)')}</span><span class="len ${dw > 165 ? 'warn' : dw < 70 ? 'warn' : 'ok'}">${dw} 宽</span></div>
        <div class="row"><span class="k">Keywords</span><span class="v small">${escapeHtml(p.keywords || '(缺失)')}</span></div>
        <div class="row"><span class="k">Canonical</span><span class="v small">${escapeHtml(p.canonical || '(缺失)')}</span></div>
        <div class="row"><span class="k">Robots</span><span class="v small">${escapeHtml(p.robots || '(缺失)')}</span></div>
        <div class="row"><span class="k">Hreflang</span><span class="v small">${escapeHtml(p.alternates.map((a) => a.hreflang).join(' / ') || '(缺失)')}</span></div>
      </div>
      <div class="cols">
        <div class="hcol"><div class="colhead">标题结构 <span>${p.headings.filter((h) => !h.hidden).length} 可见 / ${p.hiddenHeadingCount} 隐藏</span></div><div class="tree">${tree}</div></div>
        <div class="icol"><div class="colhead">问题 <span>${p.issues.length}</span></div><ul class="isslist">${issues}</ul></div>
      </div>
    </article>`;
  };

  const siteIssueHtml = siteIssues.length
    ? siteIssues.map((i) => `<li class="iss ${i.severity}"><span class="dot"></span><div><b>${escapeHtml(i.message)}</b><div class="fix">${escapeHtml(i.fix)}</div>${i.detail ? `<div class="ev">${escapeHtml(i.detail)}</div>` : ''}</div></li>`).join('')
    : '<li class="iss ok"><span class="dot"></span><div><b>未发现全站级问题</b></div></li>';

  const sitemapRows = sitemap ? sitemap.urls.map((u, i) => `<tr><td>${i + 1}</td><td><a href="${escapeHtml(u.loc)}" target="_blank" rel="noopener">${escapeHtml(u.loc.replace(/^https?:\/\/[^/]+/, ''))}</a></td><td>${escapeHtml(u.lastmod || '')}</td><td>${escapeHtml(u.changefreq || '')}</td><td>${escapeHtml(u.priority || '')}</td><td>${u.alternates.length}</td></tr>`).join('') : '';

  const groups = new Map();
  for (const i of all) {
    const key = `${i.severity}|${i.code}`;
    if (!groups.has(key)) groups.set(key, { ...i, count: 0 });
    groups.get(key).count++;
  }
  const fixRows = [...groups.values()]
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || b.count - a.count)
    .map((g) => `<tr class="fix-${g.severity}"><td><span class="sev ${g.severity}">${SEVERITY_LABEL[g.severity]}</span></td><td>${escapeHtml(g.area)}</td><td><b>${escapeHtml(g.message)}</b><div class="fix">${escapeHtml(g.fix)}</div></td><td class="num">${g.count}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SoMarkIt SEO 审计报告 · ${escapeHtml(meta.generatedAt)}</title>
<style>
:root{--bg:#f4f5f7;--card:#fff;--ink:#111827;--muted:#6b7280;--line:#e5e7eb;--accent:#4f46e5;--crit:#dc2626;--high:#ea580c;--med:#d97706;--low:#2563eb;--info:#6b7280;--ok:#059669}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1280px;margin:0 auto;padding:0 20px 80px}
.top{background:linear-gradient(135deg,#312e81,#4f46e5 60%,#7c3aed);color:#fff;padding:28px 0 24px;margin-bottom:22px}
.top .wrap{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap}
.brand{font-size:22px;font-weight:700;letter-spacing:.2px}.brand span{display:block;font-size:11px;font-weight:600;letter-spacing:.18em;opacity:.75;margin-top:4px}
.meta{font-size:12px;opacity:.85;text-align:right;line-height:1.8}
.scorebox{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);padding:10px 16px;border-radius:14px}
.scoren{font-size:38px;font-weight:800;line-height:1}.scoren small{font-size:13px;font-weight:500;opacity:.8}
.grade{font-size:13px;opacity:.9}
.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:22px}
.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.stat b{display:block;font-size:24px;line-height:1.1}.stat span{font-size:12px;color:var(--muted)}
.stat.crit b{color:var(--crit)}.stat.high b{color:var(--high)}.stat.med b{color:var(--med)}
nav.tabs{position:sticky;top:0;z-index:5;background:rgba(244,245,247,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);margin-bottom:20px}
nav.tabs .wrap{display:flex;gap:4px;padding-top:8px;padding-bottom:0}
nav.tabs a{padding:10px 14px;font-weight:600;color:var(--muted);border-bottom:2px solid transparent;font-size:13px}
nav.tabs a:hover{color:var(--ink);text-decoration:none}
section{margin:0 0 34px}
h2{font-size:19px;margin:0 0 12px;display:flex;align-items:center;gap:8px}
h2 small{font-size:12px;font-weight:500;color:var(--muted)}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.filter{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}
.filter input{flex:1;min-width:220px;padding:9px 12px;border:1px solid var(--line);border-radius:10px;font-size:13px;background:#fff}
.filter button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 13px;font-size:12px;cursor:pointer;color:var(--muted)}
.filter button.on{background:var(--ink);border-color:var(--ink);color:#fff}
.page{background:var(--card);border:1px solid var(--line);border-radius:14px;margin-bottom:14px;overflow:hidden}
.phead{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--line);background:#fafafa;flex-wrap:wrap}
.type{font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:#eef2ff;color:#4338ca}
.type.t-tool{background:#ecfdf5;color:#047857}.type.t-category{background:#fff7ed;color:#c2410c}.type.t-about{background:#f5f3ff;color:#6d28d9}.type.t-search{background:#f1f5f9;color:#475569}
.purl{font-weight:600;font-size:13px}
.pstat{margin-left:auto;font-size:11px;color:var(--muted)}
.pscore{min-width:36px;text-align:center;font-weight:800;font-size:13px;padding:3px 7px;border-radius:8px;background:#f3f4f6}
.pscore.good{background:#ecfdf5;color:#047857}.pscore.mid{background:#fffbeb;color:#b45309}.pscore.bad{background:#fef2f2;color:#b91c1c}
.tdk{padding:12px 16px;border-bottom:1px solid var(--line)}
.row{display:grid;grid-template-columns:86px 1fr auto;gap:10px;padding:5px 0;align-items:start;border-top:1px dashed #f1f1f1}
.row:first-child{border-top:0}
.k{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;padding-top:2px}
.v{font-size:13px;word-break:break-word}.v.small{font-size:12px;color:#374151}
.len{font-size:11px;color:var(--muted);white-space:nowrap;padding-top:2px}.len.ok{color:var(--ok)}.len.warn{color:var(--high)}
.cols{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:0}
.hcol,.icol{padding:12px 16px}
.hcol{border-right:1px solid var(--line)}
.colhead{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;display:flex;justify-content:space-between}
.colhead span{font-weight:500;letter-spacing:0;text-transform:none}
.tree{max-height:260px;overflow:auto;padding-right:6px}
.hrow{display:flex;gap:8px;align-items:flex-start;padding:2px 0;font-size:12px}
.hrow.lv1{margin-left:0;font-weight:700}.hrow.lv2{margin-left:14px;font-weight:600}.hrow.lv3{margin-left:28px}.hrow.lv4{margin-left:42px}.hrow.lv5{margin-left:52px}.hrow.lv6{margin-left:60px}
.hrow.hid{opacity:.45}
.lvl{font-size:9px;font-weight:800;background:#eef2ff;color:#4338ca;border-radius:4px;padding:1px 4px;margin-top:1px;flex:none}
.ht{word-break:break-word}
.hbadge{font-size:9px;background:#f3f4f6;color:#6b7280;border-radius:4px;padding:1px 4px;flex:none}
.isslist{list-style:none;margin:0;padding:0;max-height:300px;overflow:auto}
.iss{display:flex;gap:8px;padding:7px 0;border-top:1px dashed #f1f1f1;font-size:12px}
.iss:first-child{border-top:0}
.dot{width:7px;height:7px;border-radius:50%;background:var(--muted);flex:none;margin-top:5px}
.iss.critical .dot{background:var(--crit)}.iss.high .dot{background:var(--high)}.iss.medium .dot{background:var(--med)}.iss.low .dot{background:var(--low)}.iss.ok .dot{background:var(--ok)}
.iss b{font-weight:600;display:block;line-height:1.45}
.fix{color:var(--muted);margin-top:2px;line-height:1.45}
.ev{color:#9ca3af;font-size:11px;margin-top:2px;word-break:break-all}
.muted{color:var(--muted);font-size:12px}
table{width:100%;border-collapse:collapse;font-size:12px;background:#fff}
th,td{padding:9px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);background:#fafafa;position:sticky;top:49px}
td.num{text-align:right}
.sev{font-size:10px;font-weight:700;padding:2px 6px;border-radius:5px;white-space:nowrap}
.sev.critical{background:#fef2f2;color:#b91c1c}.sev.high{background:#fff7ed;color:#c2410c}.sev.medium{background:#fffbeb;color:#b45309}.sev.low{background:#eff6ff;color:#1d4ed8}.sev.info{background:#f3f4f6;color:#4b5563}
.tblwrap{max-height:560px;overflow:auto;border:1px solid var(--line);border-radius:12px;background:#fff}
@media(max-width:860px){.stats{grid-template-columns:repeat(2,1fr)}.cols{grid-template-columns:1fr}.hcol{border-right:0;border-bottom:1px solid var(--line)}.meta{text-align:left}th{position:static}}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <div class="brand">SoMarkIt<span>SEO AUDIT · AITDK 视角</span></div>
  <div class="scorebox"><div class="scoren">${meta.score}<small>/100</small></div><div class="grade">等级 ${meta.grade}<br>${pages.length} 个页面</div></div>
  <div class="meta">${escapeHtml(meta.base)}<br>${escapeHtml(meta.generatedAt)} · 耗时 ${(meta.elapsedMs / 1000).toFixed(1)}s</div>
</div></header>
<div class="wrap">
  <div class="stats">
    <div class="stat"><b>${pages.length}</b><span>抓取页面</span></div>
    <div class="stat crit"><b>${counts.critical}</b><span>严重问题</span></div>
    <div class="stat high"><b>${counts.high}</b><span>高优先级</span></div>
    <div class="stat med"><b>${counts.medium}</b><span>中优先级</span></div>
    <div class="stat"><b>${sitemap ? sitemap.urls.length : 0}</b><span>站点地图 URL</span></div>
  </div>

  <nav class="tabs"><div class="wrap">
    <a href="#overview">总览</a><a href="#pages">页面 TDK / 标题</a><a href="#sitemap">站点地图</a><a href="#fixes">修改清单</a><a href="#robots">robots.txt</a>
  </div></nav>

  <section id="overview"><h2>全站问题 <small>${siteIssues.length} 项</small></h2>
    <div class="card" style="padding:6px 16px"><ul class="isslist" style="max-height:none">${siteIssueHtml}</ul></div>
  </section>

  <section id="pages"><h2>页面 TDK 与标题结构 <small>点击筛选</small></h2>
    <div class="filter">
      <input id="q" type="search" placeholder="搜索 URL / 标题 / H1…">
      <button data-f="all" class="on">全部</button>
      <button data-f="home">首页</button><button data-f="category">分类页</button><button data-f="tool">评测页</button><button data-f="about">关于页</button><button data-f="search">搜索页</button>
    </div>
    <div id="pagelist">${pages.map(pageCard).join('')}</div>
  </section>

  <section id="sitemap"><h2>站点地图 <small>${sitemap ? sitemap.urls.length : 0} 条</small></h2>
    <div class="tblwrap"><table><thead><tr><th>#</th><th>URL</th><th>lastmod</th><th>changefreq</th><th>priority</th><th>hreflang</th></tr></thead><tbody>${sitemapRows}</tbody></table></div>
  </section>

  <section id="fixes"><h2>可修改项汇总 <small>按严重程度排序</small></h2>
    <div class="tblwrap"><table><thead><tr><th>优先级</th><th>区域</th><th>问题与修复建议</th><th>次数</th></tr></thead><tbody>${fixRows}</tbody></table></div>
  </section>

  <section id="robots"><h2>robots.txt</h2>
    <div class="card"><pre style="margin:0;padding:16px;font-size:12px;overflow:auto">${escapeHtml(robots ? robots.body.trim() : '(不可访问)')}</pre></div>
  </section>
</div>
<script>
(function(){
  var q=document.getElementById('q'),list=document.getElementById('pagelist'),btns=document.querySelectorAll('.filter button');
  var cur='all';
  function apply(){
    var term=(q.value||'').trim().toLowerCase();
    list.querySelectorAll('.page').forEach(function(el){
      var okType=cur==='all'||el.dataset.type===cur;
      var okTerm=!term||el.dataset.search.indexOf(term)>-1;
      el.style.display=okType&&okTerm?'':'none';
    });
  }
  q.addEventListener('input',apply);
  btns.forEach(function(b){b.addEventListener('click',function(){btns.forEach(function(x){x.classList.remove('on')});b.classList.add('on');cur=b.dataset.f;apply();})});
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const started = Date.now();
  console.log(`\nSoMarkIt SEO audit → ${BASE}\n`);

  const sitemapUrl = `${BASE}/sitemap.xml`;
  let sitemap = null;
  let sitemapRes = null;
  if (opt.sitemap) {
    sitemapRes = await get(sitemapUrl);
    if (sitemapRes.status === 200 && /<(urlset|sitemapindex)/i.test(sitemapRes.body)) {
      sitemap = parseSitemap(sitemapRes.body);
      if (sitemap.isIndex) {
        const children = sitemap.urls.map((u) => u.loc).slice(0, 10);
        const parts = await mapLimit(children, 4, async (u) => {
          const r = await get(u);
          return r.status === 200 ? parseSitemap(r.body).urls : [];
        });
        sitemap.urls = parts.flat();
      }
      // A local preview serves the same paths; rewrite absolute production
      // URLs to the preview origin so the sitemap checks hit the local Worker.
      if (IS_LOCAL) {
        for (const u of sitemap.urls) {
          const pathname = new URL(u.loc).pathname;
          u.loc = `${BASE}${pathname}`;
          u.alternates = u.alternates.map((a) => ({ ...a, href: `${BASE}${new URL(a.href).pathname}` }));
        }
      }
      console.log(`  sitemap: ${sitemap.urls.length} URLs`);
    } else {
      console.log(`  sitemap: unavailable (${sitemapRes.status})`);
    }
  }

  const targets = [];
  if (opt.extra.length) {
    targets.push(...opt.extra.map((u) => absUrl(u, BASE)));
  } else if (sitemap && sitemap.urls.length) {
    targets.push(...sitemap.urls.map((u) => u.loc));
    const searchUrl = `${BASE}/${opt.lang}/search?q=${encodeURIComponent(opt.q)}`;
    if (!targets.some((t) => normUrl(t) === normUrl(searchUrl))) targets.push(searchUrl);
  } else {
    targets.push(`${BASE}/${opt.lang}`, `${BASE}/${opt.lang}/about`, `${BASE}/${opt.lang}/search?q=${encodeURIComponent(opt.q)}`);
  }

  const uniqueTargets = uniq(targets.map(normUrl)).slice(0, opt.max);
  console.log(`  crawling ${uniqueTargets.length} pages…`);

  const pages = [];
  await mapLimit(uniqueTargets, opt.concurrency, async (url) => {
    const res = await get(url);
    if (!/text\/html/i.test(res.headers['content-type'] || '') && !/<!doctype|<html/i.test(res.body.slice(0, 400))) {
      return null;
    }
    const page = parsePage(res.body, url, res);
    page.linkCount = page.links.total;
    const audit = auditPage(page);
    page.issues = audit.issues;
    page.score = audit.score;
    page.noindex = audit.noindex;
    pages.push(page);
    return page;
  });

  pages.sort((a, b) => {
    const order = { home: 0, category: 1, tool: 2, about: 3, search: 4, submit: 5, other: 6 };
    const locOrder = { zh: 0, en: 1, ja: 2, ko: 3 };
    return (order[a.type] ?? 9) - (order[b.type] ?? 9)
      || (locOrder[a.locale] ?? 9) - (locOrder[b.locale] ?? 9)
      || Number(Boolean(a.empty)) - Number(Boolean(b.empty))
      || a.path.localeCompare(b.path);
  });

  const robotsRes = await get(`${BASE}/robots.txt`);
  const robots = robotsRes.status === 200 ? robotsRes : null;

  const siteIssues = await auditSite(pages, sitemap, robots);
  const { score, grade } = scoreOf(pages, siteIssues);

  const data = {
    meta: {
      base: BASE,
      lang: opt.lang,
      generatedAt: localDateTime(),
      elapsedMs: Date.now() - started,
      score,
      grade,
      pages: pages.length,
      sitemapUrls: sitemap ? sitemap.urls.length : 0,
    },
    pages,
    siteIssues,
    sitemap: sitemap ? { urls: sitemap.urls } : null,
    robots: robots ? { status: robots.status, body: robots.body } : null,
  };

  await mkdir(OUT_DIR, { recursive: true });
  const md = renderMarkdown(data);
  const html = renderHtml(data);
  const json = JSON.stringify(data, (k, v) => (k === 'headers' ? v : v), 2);

  await Promise.all([
    writeFile(resolve(OUT_DIR, 'seo-audit.md'), md, 'utf8'),
    writeFile(resolve(OUT_DIR, 'seo-audit.html'), html, 'utf8'),
    writeFile(resolve(OUT_DIR, 'seo-audit.json'), json, 'utf8'),
  ]);

  const all = [...pages.flatMap((p) => p.issues), ...siteIssues];
  const bySev = (s) => all.filter((i) => i.severity === s).length;
  console.log(`\n  score ${score}/100 (${grade})`);
  console.log(`  pages ${pages.length} · critical ${bySev('critical')} · high ${bySev('high')} · medium ${bySev('medium')} · low ${bySev('low')}`);
  console.log(`\n  report → ${resolve(OUT_DIR, 'seo-audit.html')}`);
  console.log(`           ${resolve(OUT_DIR, 'seo-audit.md')}`);
  console.log(`           ${resolve(OUT_DIR, 'seo-audit.json')}\n`);
}

main().catch((err) => {
  console.error(err && err.stack || err);
  process.exitCode = 1;
});
