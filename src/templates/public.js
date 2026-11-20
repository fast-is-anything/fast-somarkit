// -----------------------------------------------------------------------------
// Public site templates
// -----------------------------------------------------------------------------

import { esc, html } from '../lib/crypto.js';
import { ICONS, UI, icon } from '../lib/icons.js';
import { logoGlyph } from '../lib/logo.js';
import { t, pricingLabel, LANGS, normalizeLang, localePath, splitLocale, DEFAULT_LANG } from '../lib/i18n.js';
import { renderMarkdown } from '../lib/markdown.js';

/**
 * How many cards each homepage rail renders. A rail is a fixed preview — it
 * never streams more; readers follow the "View all" link for the full list.
 */
export const RAIL_PAGE_SIZE = 9;

function brandMark() {
  return `<span class="brand-mark" aria-hidden="true">${logoGlyph(22)}</span>`;
}

/** The LANGS entry for a language code (normalised, never undefined). */
function langMeta(lang) {
  return LANGS.find((l) => l.code === normalizeLang(lang)) || LANGS[0];
}

/**
 * Display name of a category.
 *
 * `localizeCategory` has already resolved `name` to the requested language,
 * falling back to Chinese when a translation is blank — so the stored value is
 * used as-is. (`c.name_<code>` is only consulted for rows that skipped
 * localisation.)
 */
function categoryLabel(c, lang) {
  const code = normalizeLang(lang);
  return c[`name_${code}`] || c.name || '';
}

/**
 * rel attribute for a tool's outbound links.
 *
 * `noopener noreferrer` is always present (security + privacy). `nofollow` is
 * added unless the admin explicitly allowed following for this tool, so by
 * default a directory never passes link equity to third-party sites.
 */
function outboundRel(tool) {
  return tool && tool.nofollow === 0
    ? 'noopener noreferrer'
    : 'noopener noreferrer nofollow';
}

/**
 * Full-screen loader markup, toggled by `body.is-loading`.
 * Kept in the initial HTML (not injected) so it paints on the very first frame
 * of a document navigation instead of after the JS bundle runs.
 */
function pageLoader() {
  return `<div class="page-loader" id="pageLoader" aria-hidden="true">
    <div class="longfazers">
      <span></span><span></span><span></span><span></span>
    </div>
    <div class="loader">
      <span><span></span><span></span><span></span><span></span></span>
      <div class="base">
        <span></span>
        <div class="face"></div>
      </div>
    </div>
  </div>`;
}

/**
 * Language dropdown used in both the desktop topbar and the mobile header.
 * Each option is a real link to the same page in the other locale
 * (`/zh/tools/x` ⇄ `/en/tools/x`), so switching is shareable and crawlable.
 */
function langSwitcher(lang, { mobile = false, basePath = '/' } = {}) {
  const current = LANGS.find((l) => l.code === normalizeLang(lang)) || LANGS[0];
  const opts = LANGS.map(
    (l) => `<a class="lang-option ${l.code === current.code ? 'active' : ''}"
        href="${esc(localePath(l.code, basePath))}" data-lang="${esc(l.code)}"
        role="option" aria-selected="${l.code === current.code ? 'true' : 'false'}"
        ${l.code === current.code ? 'aria-current="true"' : ''}>
        <span class="lang-option-short">${esc(l.short)}</span>
        <span class="lang-option-label">${esc(l.label)}</span>
        ${l.code === current.code ? UI.check : ''}
      </a>`
  ).join('');

  return `<div class="lang-switcher ${mobile ? 'lang-switcher-mobile' : ''}" data-lang-switcher>
    <button class="nav-btn lang-toggle" type="button" aria-haspopup="listbox"
      aria-expanded="false" aria-label="${esc(t(lang, 'nav.language'))}"
      title="${esc(t(lang, 'nav.language'))}">
      ${UI.globe}
      <span class="lang-current">${esc(current.short)}</span>
      ${UI.chevronDown}
    </button>
    <div class="lang-dropdown" role="listbox" aria-label="${esc(t(lang, 'nav.language'))}">
      ${opts}
    </div>
  </div>`;
}

/**
 * hreflang set for the current page.
 *
 * `canonical` points at one locale; the language-neutral path is recovered from
 * it so every locale gets an absolute URL of its own. `x-default` is the
 * Chinese page because Chinese is the site default.
 */
function hreflangLinks(canonical, lang) {
  const path = canonical ? new URL(canonical).pathname : '/';
  const neutral = splitLocale(path).rest;
  const base = 'https://somarkit.com';
  const links = LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l.code}" href="${base}${localePath(l.code, neutral)}">`
  );
  links.push(`<link rel="alternate" hreflang="x-default" href="${base}${localePath(DEFAULT_LANG, neutral)}">`);
  return links.join('\n');
}

function head({ title, description, canonical, siteName = 'SoMarkIt', jsonLd = [], theme = 'light', lang = DEFAULT_LANG, gaId = '', noindex = false }) {
  // <html lang>/og:locale come from the LANGS entry, so a new locale is
  // announced correctly without touching this template.
  const meta = langMeta(lang);
  return `<!DOCTYPE html>
<html lang="${esc(meta.htmlLang)}" data-lang="${esc(meta.code)}" data-theme="${theme}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="keywords" content="SoMarkIt,AI工具,AI导航,AI工具导航,ChatGPT,Claude,DeepSeek,AI绘画,AI视频,AI编程,AI写作,人工智能工具">
<meta name="robots" content="${noindex
  ? 'noindex, follow'
  : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}">
<meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0B1120" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
${hreflangLinks(canonical, lang)}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(siteName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="https://somarkit.com/og-cover.svg">
<meta property="og:locale" content="${esc(meta.ogLocale)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="https://somarkit.com/og-cover.svg">
<link rel="stylesheet" href="/assets/site.css">
<script>
(function(){try{var t=localStorage.getItem('somarkit-theme');
if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
document.documentElement.setAttribute('data-theme',t);}catch(e){}})();
</script>
${jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
${gaId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(gaId)}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${JSON.stringify(gaId)}, { send_page_view: true });
</script>` : ''}
</head>`;
}

function sidebar({ categories, counts, activeSlug = 'all', total, lang = DEFAULT_LANG, basePath = '/' }) {
  // Real links (not JS-only buttons) so each category page is addressable,
  // shareable and crawlable in whichever locale the URL names.
  //
  // data-category is what the click handler reads to decide whether the
  // switch can happen client-side; without it the anchor degrades to a plain
  // navigation and the "highlight the rail, then show the loader" sequence
  // never runs.
  const items = [
    `<a class="category-item ${activeSlug === 'all' ? 'active' : ''}" data-category="all" href="${esc(localePath(lang, '/'))}" title="${esc(t(lang, 'nav.allTools'))}">
      <span class="cat-icon">${ICONS.globe}</span>
      <span class="cat-name">${esc(t(lang, 'nav.allTools'))}</span>
      <span class="cat-count-badge">${total}</span>
    </a>`,
  ];
  for (const c of categories) {
    const label = categoryLabel(c, lang);
    items.push(
      `<a class="category-item ${activeSlug === c.slug ? 'active' : ''}" data-category="${esc(c.slug)}" href="${esc(localePath(lang, `/${c.slug}`))}" title="${esc(label)}">
        <span class="cat-icon">${icon(c.icon)}</span>
        <span class="cat-name">${esc(label)}</span>
        <span class="cat-count-badge">${counts[c.id] || 0}</span>
      </a>`
    );
  }

  return `<aside class="sidebar" id="sidebar" aria-label="${esc(t(lang, 'nav.categories'))}">
    <div class="sidebar-header">
      <a href="${esc(localePath(lang, '/'))}" class="nav-brand" id="sidebarBrand" aria-label="${esc(t(lang, 'sidebar.home'))}" title="SoMarkIt">
        ${brandMark()}<span class="brand-text">SoMarkIt</span>
      </a>
      <button class="sidebar-collapse-btn" id="sidebarCollapse" type="button"
        aria-label="${esc(t(lang, 'sidebar.collapse'))}" aria-expanded="true" title="${esc(t(lang, 'sidebar.collapse'))}">
        ${UI.panelLeft}
      </button>
    </div>
    <nav class="sidebar-nav">
      ${items.join('\n')}
    </nav>
  </aside>
  <div class="sidebar-overlay" id="sidebarOverlay"></div>`;
}

function mobileHeader(lang = DEFAULT_LANG, basePath = '/') {
  return `<nav class="mobile-header" aria-label="${esc(t(lang, 'nav.categories'))}">
    <a href="${esc(localePath(lang, '/'))}" class="nav-brand">
      ${brandMark()}<span class="brand-text">SoMarkIt</span>
    </a>
    <div class="mobile-header-actions">
      ${langSwitcher(lang, { mobile: true, basePath })}
      <button class="nav-btn" data-theme-toggle type="button" aria-label="${esc(t(lang, 'nav.theme'))}" title="${esc(t(lang, 'nav.theme'))}">
        <span class="icon-moon">${UI.moon}</span><span class="icon-sun" style="display:none">${UI.sun}</span>
      </button>
      <button class="nav-btn" id="sidebarToggle" type="button" aria-label="${esc(t(lang, 'sidebar.open'))}" aria-expanded="false">
        ${UI.menu}
      </button>
    </div>
  </nav>`;
}

function topbar({ categories, activeSlug = 'all', lang = DEFAULT_LANG, basePath = '/' }) {
  return `<div class="topbar" id="navbar">
    <div class="topbar-inner">
      <div class="topbar-search" role="search">
        <div class="nav-search-wrapper">
          <span class="search-icon">${UI.search}</span>
          <input type="search" class="nav-search-input js-search" id="navSearchInput"
            placeholder="${esc(t(lang, 'nav.search'))}" autocomplete="off" aria-label="${esc(t(lang, 'nav.searchAria'))}">
        </div>
      </div>
      <div class="topbar-actions">
        <a href="${esc(localePath(lang, '/'))}#all" class="nav-btn" title="${esc(t(lang, 'nav.allTools'))}">${UI.sparkle}<span>${esc(t(lang, 'nav.allTools'))}</span></a>
        <a href="${esc(localePath(lang, '/submit'))}" class="nav-btn nav-btn-primary" title="${esc(t(lang, 'nav.submit'))}">
          ${UI.plus}<span>${esc(t(lang, 'nav.submit'))}</span>
        </a>
        ${langSwitcher(lang, { basePath })}
        <button class="nav-btn" data-theme-toggle type="button" aria-label="${esc(t(lang, 'nav.theme'))}" title="${esc(t(lang, 'nav.theme'))}">
          <span class="icon-moon">${UI.moon}</span><span class="icon-sun" style="display:none">${UI.sun}</span>
        </button>
      </div>
    </div>
  </div>`;
}

function hero({ total, catCount, featured, lang = DEFAULT_LANG }) {
  let rail = '';
  if (featured.length) {
    // Two rich colour cards on top, matching the reference density.
    const rows = featured.slice(0, 2).map((item, i) => {
      const kicker = item.tags[0] || item.category_name || '';
      const tags = item.tags.slice(0, 3)
        .map((tag) => `<span class="hero-agent-tag">${esc(tag)}</span>`)
        .join('');
      return `<a class="hero-agent-card hero-agent-accent-${i % 4}"
          href="${esc(item.url)}" target="_blank" rel="${outboundRel(item)}"
          data-tool-id="${item.id}">
        <div class="hero-agent-head">
          <span class="hero-agent-name">${esc(item.name)}</span>
          ${kicker ? `<span class="hero-agent-kicker">${esc(kicker)}</span>` : ''}
        </div>
        <span class="hero-agent-badge">${esc(pricingLabel(lang, item.pricing))}</span>
        <span class="hero-agent-desc">${esc(item.description || '')}</span>
        ${tags ? `<span class="hero-agent-tags">${tags}</span>` : ''}
      </a>`;
    });
    rail = `<div class="hero-featured" aria-labelledby="featured-heading">
      <h2 class="hero-featured-title" id="featured-heading"><span class="i-flame">${UI.flame}</span>${esc(t(lang, 'hero.featured'))}</h2>
      <div class="hero-featured-list">${rows.join('\n')}</div>
    </div>`;
  }

  return `<header class="hero">
    <div class="hero-inner">
      <div class="hero-combined">
        <div class="hero-content">
          <h1 class="hero-title"><span class="hero-title-line">${esc(t(lang, 'hero.title.1'))}</span><span class="hero-title-line">${esc(t(lang, 'hero.title.2'))}</span></h1>
          <p class="hero-subtitle">${esc(t(lang, 'hero.subtitle', total, catCount))}</p>
          <div class="hero-search" role="search" aria-label="${esc(t(lang, 'hero.searchAria'))}">
            <div class="hero-search-wrapper">
              <span class="search-icon">${UI.search}</span>
              <input type="search" class="hero-search-input js-search" id="heroSearchInput"
                placeholder="${esc(t(lang, 'hero.searchPlaceholder'))}" data-ph-short="${esc(t(lang, 'hero.searchPlaceholderShort'))}" autocomplete="off" aria-label="${esc(t(lang, 'nav.searchAria'))}">
              <button class="search-btn" type="button" aria-label="${esc(t(lang, 'hero.searchBtn'))}">${UI.arrowIn}</button>
            </div>
          </div>
          <div class="hero-stats" aria-label="${esc(t(lang, 'hero.statTools'))}">
            <div class="hero-stat"><div class="hero-stat-value" id="statToolCount">${total}</div><div class="hero-stat-label">${esc(t(lang, 'hero.statTools'))}</div></div>
            <div class="hero-stat"><div class="hero-stat-value" id="statCatCount">${catCount}</div><div class="hero-stat-label">${esc(t(lang, 'hero.statCategories'))}</div></div>
            <div class="hero-stat"><div class="hero-stat-value">${esc(t(lang, 'hero.statUpdateValue'))}</div><div class="hero-stat-label">${esc(t(lang, 'hero.statUpdate'))}</div></div>
          </div>
        </div>
        ${rail}
      </div>
    </div>
  </header>`;
}

function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/**
 * Two-letter monogram for a tool without a logo.
 *
 * The tiles are a fixed square, so a variable 1–2 character label reads as
 * inconsistent next to a neighbour's longer one. Every branch is therefore
 * normalised to exactly two glyphs, and a Latin brand is always preferred over
 * a descriptive CJK suffix:
 *   "ChatGPT"        → CH  (two Latin words → first letter of each)
 *   "GitHub Copilot" → GC
 *   "GPT 系列"       → GP  (brand word first, ignore the CJK descriptor)
 *   "Mistral 模型"   → MI
 *   "豆包"           → 豆包 (CJK has no letters → first two characters)
 *   "通义千问"       → 通义
 *   "扣子 Coze"      → 扣C  (CJK-first mixed name → one of each)
 *   "海螺 AI"        → 海A
 *   "X"              → X   (only one glyph exists)
 */
function initials(name) {
  const s = String(name || '').trim();
  if (!s) return '?';

  const CJK = /[\u3400-\u4dbf\u4e00-\u9fa5]/;
  const words = s.split(/\s+/).filter(Boolean);
  // Latin-led name ("GPT 系列", "v0", "AI 绘图助手"): the brand comes first,
  // so take the first two letters of its leading word and stop.
  const latinWords = words.filter((w) => /[A-Za-z0-9]/.test(w));

  if (latinWords.length >= 2) {
    const a = latinWords[0].match(/[A-Za-z0-9]/);
    const b = latinWords[1].match(/[A-Za-z0-9]/);
    return `${a[0]}${b[0]}`.toUpperCase();
  }

  const cjkChars = Array.from(s).filter((ch) => CJK.test(ch));

  if (latinWords.length === 1 && words[0] === latinWords[0]) {
    // Latin first word wins over any descriptive CJK tail.
    const head = latinWords[0].replace(/[^A-Za-z0-9]/g, '');
    return head.slice(0, 2).toUpperCase() || s.slice(0, 2).toUpperCase();
  }

  if (cjkChars.length >= 2) {
    // Mixed "扣子 Coze" / "海螺 AI" (CJK first, short Latin tail): one of each
    // reads better than two CJK characters.
    if (latinWords.length === 1 && cjkChars.length <= 2) {
      const tail = latinWords[0].match(/[A-Za-z0-9]/);
      if (tail) return `${cjkChars[0]}${tail[0]}`;
    }
    return cjkChars.slice(0, 2).join('');
  }
  if (cjkChars.length === 1) return cjkChars[0];

  // Pure Latin with no separators handled above.
  const head = s.replace(/[^A-Za-z0-9]/g, '');
  return head.slice(0, 2).toUpperCase() || s.slice(0, 2).toUpperCase();
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

/**
 * Brand logo tile: the stored image when there is one, the name's initials
 * otherwise. The real name is exposed to assistive tech, the image itself is
 * decorative (the adjacent <h3> already announces it).
 */
function logoBox(tool, cls) {
  const label = esc(tool.name || '');
  if (tool.logo_url) {
    return `<span class="logo-tile ${cls}" role="img" aria-label="${label}"><img src="${esc(tool.logo_url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></span>`;
  }
  return `<span class="logo-tile ${cls}" role="img" aria-label="${label}"><span class="logo-text" aria-hidden="true">${esc(initials(tool.name))}</span></span>`;
}

export function toolCard(item, lang = DEFAULT_LANG) {
  const tags = item.tags.slice(0, 4).map((tag) => `<span class="tool-tag">${esc(tag)}</span>`).join('');
  const haystack = [item.name, item.description, item.tags.join(' '), item.category_name, hostOf(item.url)]
    .filter(Boolean).join(' ').toLowerCase();

  return `<div class="tool-card" role="listitem"
    data-category="${esc(item.category_slug || '')}"
    data-pricing="${esc(item.pricing)}"
    data-cursor="${Number(item.sort_order) || 0}:${encodeURIComponent(item.name || '')}:${item.id}"
    data-search="${esc(haystack)}">
    <div class="tool-card-header">
      ${logoBox(item, 'tool-card-logo')}
      <div class="tool-info">
        <h3 class="tool-name">
          <span>${esc(item.name)}</span>
          ${item.is_hot ? `<span class="badge badge-hot">${esc(t(lang, 'badge.hot'))}</span>` : ''}
          ${item.is_new ? `<span class="badge badge-new">${esc(t(lang, 'badge.new'))}</span>` : ''}
        </h3>
      </div>
    </div>
    <p class="tool-desc">${esc(item.description || t(lang, 'card.noDesc'))}</p>
    ${tags ? `<div class="tool-tags">${tags}</div>` : ''}
    <div class="tool-card-footer">
      <span class="pricing-tag pricing-${esc(item.pricing)}">${esc(pricingLabel(lang, item.pricing))}</span>
      <div class="tool-card-actions">
        <a href="${esc(localePath(lang, `/tools/${item.slug}`))}" class="tool-detail-link" title="${esc(t(lang, 'card.review'))}">${esc(t(lang, 'card.review'))}</a>
        <a href="${esc(item.url)}" target="_blank" rel="${outboundRel(item)}"
          class="tool-visit-btn" data-tool-id="${item.id}">${esc(t(lang, 'card.visit'))} <span class="arrow">→</span></a>
      </div>
    </div>
  </div>`;
}

/**
 * Render the tool listing.
 *
 * Every listing page ships the FULL catalogue (one section per category) and
 * only marks non-active categories as initially hidden. That way any category
 * click can be handled client-side, on every page — no round-trip, no flash of
 * a loading screen after the first visit to a category page.
 */
function contentArea({ groups, categories, total, activeSlug = 'all', lang = DEFAULT_LANG, mode = 'subset', initialVisibleCount = null, paginateActive = false }) {
  // On a category page only the matching section starts visible; the rest are
  // hidden up front so the server-rendered HTML already looks correct (no
  // flash of other categories before JS runs). Keyed off initialVisibleCount
  // rather than `mode`, because category pages also ship the full catalogue
  // (mode 'all') and only differ in what is initially shown.
  const restrictToActive = initialVisibleCount != null;
  // Only a category page can paginate, and only the section it opened: the
  // homepage is a fixed preview. data-paginate is what the client checks before
  // attaching a sentinel, so a rail never starts growing by accident.
  const sections = groups
    .map((g) => {
      const cards = g.tools.map((tool) => toolCard(tool, lang)).join('\n');
      const isActiveSection = !restrictToActive || g.category.slug === activeSlug;
      const hiddenAttr = isActiveSection ? '' : ' style="display:none"';
      // Two different jobs for a section:
      //   home  – a fixed preview of the first page, no streaming ("View all"
      //           leads to the category page)
      //   open  – the reader asked for this category (it is the visible one on a
      //           category page), so it streams the remaining pages on scroll
      const open = paginateActive && isActiveSection && g.remaining > 0;
      const shown = g.tools.length;
      const more = g.remaining > 0;
      // Cursor for the next page; only written when this section can stream.
      const last = shown ? g.tools[shown - 1] : null;
      const cursorAttr = open && last
        ? ` data-cursor="${Number(last.sort_order) || 0}:${encodeURIComponent(last.name || '')}:${last.id}"`
        : '';
      // data-rendered is what this section actually contains — the count label
      // is based on it so a truncated rail reads "9 total", not "9 / 16". The
      // catalogue size is surfaced by the "View all" link instead.
      return `<section class="category-section" id="cat-${esc(g.category.slug)}"
        data-category="${esc(g.category.slug)}"
        data-rendered="${shown}"
        data-total="${g.total ?? shown}"
        ${paginateActive ? 'data-paginate="1"' : ''}
        ${open ? `data-has-more="1"${cursorAttr}` : ''}${hiddenAttr}>
        <div class="category-section-header">
          <span class="cat-icon">${icon(g.category.icon)}</span>
          <span class="cat-name">${esc(categoryLabel(g.category, lang))}</span>
          ${more && !open ? `<a class="section-more" href="${esc(localePath(lang, `/${g.category.slug}`))}">${esc(t(lang, 'content.viewAll'))} →</a>` : ''}
        </div>
        <div class="tools-grid" data-rail-grid>${cards}</div>
        ${open ? '<div class="rail-sentinel" data-rail-sentinel aria-hidden="true"></div>' : ''}
      </section>`;
    })
    .join('\n');

  const chips = ['all', 'free', 'freemium', 'paid', 'opensource']
    .map((k) => `<button class="chip ${k === 'all' ? 'active' : ''}" type="button" data-pricing-filter="${k}">${esc(pricingLabel(lang, k))}</button>`)
    .join('');

  const shown = initialVisibleCount == null ? total : initialVisibleCount;

  return `<div class="content-area">
    <div class="content-head" id="contentHead">
      <h2>${esc(t(lang, 'content.title'))}</h2>
      <span class="tools-count" id="toolsCount" aria-live="polite">${esc(t(lang, 'content.toolsCount', shown))}</span>
      <span class="content-head-spacer"></span>
      <div class="filter-bar" role="group" aria-label="${esc(t(lang, 'content.filterAria'))}" data-lang="${esc(normalizeLang(lang))}">${chips}</div>
    </div>
    <div id="toolsContainer" role="list" aria-label="${esc(t(lang, 'content.title'))}" data-mode="${esc(mode)}" data-active="${esc(activeSlug)}">
      ${sections}
    </div>
    <div class="empty-state" id="emptyState" style="display:none">
      ${UI.search}
      <h3>${esc(t(lang, 'empty.title'))}</h3>
      <p>${esc(t(lang, 'empty.hint'))}<a href="#" data-clear-filters style="color:var(--accent)">${esc(t(lang, 'empty.clear'))}</a></p>
    </div>
  </div>`;
}

function footer(year, lang = DEFAULT_LANG, basePath = '/') {
  return `<footer class="site-footer">
    <div class="site-footer-inner">
      <div>© ${year} SoMarkIt · ${esc(t(lang, 'footer.tagline'))}</div>
      <div class="footer-links">
        <a class="footer-link" href="${esc(localePath(lang, '/about'))}">${esc(t(lang, 'footer.about'))}</a>
        <a class="footer-link" href="/admin">${esc(t(lang, 'footer.admin'))}</a>
        <a class="footer-link" href="mailto:support@somarkit.com">${esc(t(lang, 'footer.contact'))}</a>
        <a class="footer-link" href="/sitemap.xml">${esc(t(lang, 'footer.sitemap'))}</a>
      </div>
    </div>
  </footer>`;
}

function shell({ title, description, canonical, jsonLd, categories, counts, groups, total, featured, activeSlug, theme, lang = DEFAULT_LANG, gaId = '', basePath = '/', unprefixed = false, mode = 'subset', initialVisibleCount = null, paginateActive = false }) {
  return `${head({ title, description, canonical, jsonLd, theme, lang, gaId, noindex: unprefixed })}
<body>
<noscript><div style="text-align:center;padding:1rem;background:#FEF2F2;color:#991B1B">本站需要启用 JavaScript 才能使用搜索与筛选功能。</div></noscript>
<a href="#main-content" class="skip-to-content">${esc(t(lang, 'detail.home'))}</a>
<div class="app-layout">
  ${sidebar({ categories, counts, activeSlug, total, lang, basePath })}
  <div class="main-wrapper">
    ${mobileHeader(lang, basePath)}
    ${topbar({ categories, activeSlug, lang, basePath })}
    <main id="main-content">
      ${hero({ total, catCount: categories.length, featured, lang })}
      ${contentArea({ groups, categories, total, activeSlug, lang, mode, initialVisibleCount, paginateActive })}
    </main>
    ${footer(new Date().getFullYear(), lang, basePath)}
  </div>
</div>
<button class="back-to-top" id="backToTop" type="button" aria-label="回到顶部">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
</button>
${pageLoader()}
<script src="/assets/site.js" defer></script>
</body>
</html>`;
}

/** Group published tools by category, in category order. */
function groupByCategory(categories, tools, perGroup = 0) {
  const byId = new Map();
  for (const c of categories) byId.set(c.id, { category: c, tools: [] });
  const orphan = [];
  for (const t of tools) {
    const g = byId.get(t.category_id);
    if (g) g.tools.push(t); else orphan.push(t);
  }
  let groups = [...byId.values()].filter((g) => g.tools.length > 0);
  if (orphan.length) {
    groups.push({
      category: { id: 0, slug: 'uncategorized', name: '未分类', icon: 'grid' },
      tools: orphan,
    });
  }
  // Keep only the first page per rail and record how many were withheld, so the
  // section can render a "View all" link and stream the rest on scroll.
  if (perGroup > 0) {
    groups = groups.map((g) => {
      const total = g.tools.length;
      return {
        ...g,
        tools: g.tools.slice(0, perGroup),
        total,
        remaining: Math.max(0, total - perGroup),
      };
    });
  }
  return groups;
}

// --- pages ------------------------------------------------------------------

export function homePage({ categories, counts, tools, featured, total, catCount, theme, lang = DEFAULT_LANG, gaId = '', basePath = '/', unprefixed = false }) {
  // Each rail shows at most RAIL_PAGE_SIZE tools; the rest are reachable from
  // the category page linked by "View all".
  const groups = groupByCategory(categories, tools, RAIL_PAGE_SIZE);
  const siteDesc = t(lang, 'seo.siteDesc');
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'SoMarkIt',
      alternateName: ['AI 工具导航', 'AI Tools Directory'],
      url: 'https://somarkit.com/',
      description: siteDesc,
      inLanguage: langMeta(lang).htmlLang,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: 'https://somarkit.com/?q={search_term_string}' },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'SoMarkIt',
      url: 'https://somarkit.com/',
      logo: 'https://somarkit.com/apple-touch-icon.png',
      description: siteDesc,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: t(lang, 'content.title'),
      numberOfItems: total,
      itemListElement: tools.slice(0, 50).map((x, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: x.name,
        url: `https://somarkit.com/tools/${x.slug}`,
      })),
    },
  ];

  return new Response(
    shell({
      title: t(lang, 'seo.homeTitle'),
      description: `${t(lang, 'content.toolsCount', total)}, ${catCount}. ${siteDesc}`,
      canonical: `https://somarkit.com${localePath(lang, '/')}` ,
      jsonLd,
      categories, counts, groups, total, featured,
      activeSlug: 'all', theme, lang, gaId, basePath, unprefixed,
      // The home page renders the whole catalogue, so the rail can filter
      // client-side. Category pages only hold a subset and must navigate.
      mode: 'all',
    }),
    { headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

export function toolPage({ tool, categories, counts, related, total, theme, lang = DEFAULT_LANG, gaId = '', basePath = '/', unprefixed = false }) {
  const siteDesc = t(lang, 'seo.siteDesc');
  const catName = tool.category_name || t(lang, 'detail.uncategorized');
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: tool.name,
      description: tool.description,
      url: tool.url,
      applicationCategory: 'AI Tool',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: tool.pricing === 'free' ? '0' : undefined, priceCurrency: 'USD' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t(lang, 'detail.home'), item: 'https://somarkit.com/' },
        { '@type': 'ListItem', position: 2, name: catName, item: `https://somarkit.com/${tool.category_slug || ''}` },
        { '@type': 'ListItem', position: 3, name: tool.name, item: `https://somarkit.com/tools/${tool.slug}` },
      ],
    },
  ];

  const relatedCards = related.slice(0, 6).map((x) => toolCard(x, lang)).join('');
  const tags = tool.tags.map((tag) => `<span class="tool-tag">${esc(tag)}</span>`).join('');
  // Plain-text tag list for the info-card row ("A · B · C").
  const tagsText = tool.tags.join(' · ');
  // Long-form editorial review.
  // `localizeTool` has already resolved review_md to this locale, falling back
  // to the default language when the translation is blank — so the template
  // stays language-agnostic.
  const reviewHtml = renderMarkdown(tool.review_md || '');

  const body = `${head({
    title: `${tool.name} — ${pricingLabel(lang, tool.pricing)} | SoMarkIt`,
    description: tool.description || siteDesc,
    canonical: `https://somarkit.com${localePath(lang, `/tools/${tool.slug}`)}`,
    jsonLd,
    theme,
    lang,
    gaId,
    // Per-tool switch: keeps the page out of the index but still follows links.
    // A locale-less request is a non-canonical alias: never index it.
    noindex: tool.noindex === 1 || unprefixed,
  })}
<body>
<a href="#main-content" class="skip-to-content">${esc(t(lang, 'detail.home'))}</a>
<div class="app-layout">
  ${sidebar({ categories, counts, activeSlug: tool.category_slug || 'all', total, lang, basePath })}
  <div class="main-wrapper">
    ${mobileHeader(lang, basePath)}
    ${topbar({ categories, lang, basePath })}
    <main id="main-content" class="detail-wrap">
      <p style="font-size:var(--text-sm);color:var(--text-tertiary);margin:0 0 16px">
        <a href="${esc(localePath(lang, '/'))}" style="color:inherit">${esc(t(lang, 'detail.home'))}</a> /
        <a href="${esc(localePath(lang, `/${tool.category_slug || ''}`))}" style="color:inherit">${esc(catName)}</a> /
        <span>${esc(tool.name)}</span>
      </p>
      <div class="detail-card">
        <div class="detail-head">
          ${logoBox(tool, 'detail-logo')}
          <h1 class="detail-title">
            ${esc(tool.name)}
            ${tool.is_hot ? `<span class="badge badge-hot">${esc(t(lang, 'badge.hot'))}</span>` : ''}
            ${tool.is_new ? `<span class="badge badge-new">${esc(t(lang, 'badge.new'))}</span>` : ''}
          </h1>
          <div class="detail-meta">
            <span class="pricing-tag pricing-${esc(tool.pricing)}">${esc(pricingLabel(lang, tool.pricing))}</span>
            <span class="detail-meta-item">${esc(catName)}</span>
            <span class="detail-meta-item">${esc(t(lang, 'detail.visits', tool.visit_count))}</span>
          </div>
        </div>
        <div class="detail-body">${esc(tool.description || t(lang, 'card.noDesc'))}</div>
        ${tags ? `<div class="tool-tags" style="margin-bottom:24px">${tags}</div>` : ''}
        <div class="detail-cta">
          <a href="${esc(tool.url)}" target="_blank" rel="${outboundRel(tool)}" class="nav-btn nav-btn-primary tool-visit-btn"
            style="height:42px;padding:0 20px;font-size:var(--text-sm)" data-tool-id="${tool.id}">
            ${esc(t(lang, 'detail.visitSite'))} ${UI.externalLink}
          </a>
        </div>
        <p class="detail-disclaimer">${esc(t(lang, 'detail.disclaimer'))}</p>
        ${reviewHtml ? `<div class="detail-divider" role="separator"></div>
        <section class="detail-review" aria-label="${esc(t(lang, 'detail.reviewLabel'))}">
          ${reviewHtml}
        </section>` : ''}
      </div>
      <div class="tool-info-grid">
        <div class="tool-info-card">
          <div class="info-label">${esc(t(lang, 'detail.infoCategory'))}</div>
          <div class="info-value">${tool.category_name ? esc(tool.category_name) : '—'}</div>
        </div>
        <div class="tool-info-card">
          <div class="info-label">${esc(t(lang, 'detail.infoPrice'))}</div>
          <div class="info-value">${tool.pricing ? esc(pricingLabel(lang, tool.pricing)) : '—'}</div>
        </div>
        <div class="tool-info-card">
          <div class="info-label">${esc(t(lang, 'detail.infoTags'))}</div>
          <div class="info-value">${tagsText ? esc(tagsText) : '—'}</div>
        </div>
        <div class="tool-info-card">
          <div class="info-label">${esc(t(lang, 'detail.infoWebsite'))}</div>
          <div class="info-value">${tool.url
            ? `<a href="${esc(tool.url)}" target="_blank" rel="noopener noreferrer" style="color:var(--color-primary);text-decoration:none;">${esc(hostOf(tool.url))}</a>`
            : '—'}</div>
        </div>
      </div>
      ${related.length ? `<h2 style="font-size:var(--text-lg);margin:36px 0 14px">${esc(t(lang, 'detail.related'))}</h2>
        <div class="tools-grid">${relatedCards}</div>` : ''}
    </main>
    ${footer(new Date().getFullYear(), lang, basePath)}
  </div>
</div>
${pageLoader()}
<script src="/assets/site.js" defer></script>
</body></html>`;

  return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export function categoryPage({ category, categories, counts, tools, allTools, featured, total, catCount, theme, lang = DEFAULT_LANG, gaId = '', basePath = '/', unprefixed = false }) {
  // Ship every category (not just this one) so switching to another category
  // can be handled client-side, exactly like on the home page. Each section is
  // capped at one page; the active one streams the rest on scroll because
  // contentArea() is told to paginate it.
  const groups = groupByCategory(categories, allTools || tools, RAIL_PAGE_SIZE);
  const catName = categoryLabel(category, lang);
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${catName} — SoMarkIt`,
      description: category.description || `${catName} — SoMarkIt`,
      url: `https://somarkit.com/${category.slug}`,
    },
  ];

  return new Response(
    shell({
      title: `${catName} — SoMarkIt`,
      description: category.description || `${catName} · ${t(lang, 'content.toolsCount', tools.length)}`,
      canonical: `https://somarkit.com${localePath(lang, `/${category.slug}`)}`,
      jsonLd,
      categories, counts, groups, total, featured,
      activeSlug: category.slug, theme, lang, gaId, basePath, unprefixed,
      // Full catalogue present → client-side switching, same as home.
      mode: 'all',
      initialVisibleCount: tools.length,
      // The reader explicitly asked for this category, so its section streams
      // the remaining tools on scroll (the home page does not).
      paginateActive: true,
    }),
    { headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

export function aboutPage({ categories, counts, total, theme, lang = DEFAULT_LANG, gaId = '', basePath = '/', unprefixed = false }) {
  // Body copy lives in the dictionaries (about.*) so every locale is translated
  // by the same table rather than by an if/else in this template.
  const body = `${head({
    title: t(lang, 'about.title'),
    description: t(lang, 'seo.siteDesc'),
    canonical: `https://somarkit.com${localePath(lang, '/about')}` ,
    jsonLd: [],
    theme,
    lang,
    gaId,
  })}
<body>
<div class="app-layout">
  ${sidebar({ categories, counts, activeSlug: 'about', total, lang, basePath })}
  <div class="main-wrapper">
    ${mobileHeader(lang, basePath)}
    ${topbar({ categories, lang, basePath })}
    <main id="main-content" class="detail-wrap">
      <div class="detail-card">
        <h1 class="detail-title">${esc(t(lang, 'about.h1'))}</h1>
        <div class="detail-body">
          <p>${esc(t(lang, 'about.p1'))}</p>
          <p>${esc(t(lang, 'about.p2'))}</p>
          <h2 style="font-size:var(--text-lg);color:var(--text-primary);margin:24px 0 8px">${esc(t(lang, 'about.h2What'))}</h2>
          <ul style="padding-left:20px">
            <li>${esc(t(lang, 'about.li1'))}</li>
            <li>${esc(t(lang, 'about.li2'))}</li>
            <li>${esc(t(lang, 'about.li3'))}</li>
          </ul>
          <h2 style="font-size:var(--text-lg);color:var(--text-primary);margin:24px 0 8px">${esc(t(lang, 'about.h2Submit'))}</h2>
          <p>${esc(t(lang, 'about.submitNote'))}</p>
        </div>
      </div>
    </main>
    ${footer(new Date().getFullYear(), lang, basePath)}
  </div>
</div>
${pageLoader()}
<script src="/assets/site.js" defer></script>
</body></html>`;
  return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export function notFoundPage({ categories, counts, total, theme, lang = DEFAULT_LANG, gaId = '', basePath = '/', unprefixed = false }) {
  return new Response(
    `${head({ title: t(lang, 'notFound.title'), description: t(lang, 'seo.siteDesc'), theme, lang, gaId })}
<body>
<div class="app-layout">
  ${sidebar({ categories, counts, activeSlug: 'all', total, lang, basePath })}
  <div class="main-wrapper">${mobileHeader(lang, basePath)}${topbar({ categories, lang, basePath })}
    <main id="main-content" class="detail-wrap" style="text-align:center;padding-top:120px">
      <div style="font-size:72px;font-weight:800;letter-spacing:-.04em;color:var(--text-tertiary)">404</div>
      <h1 class="detail-title" style="margin-top:8px">${esc(t(lang, 'notFound.h1'))}</h1>
      <p style="color:var(--text-tertiary);margin-bottom:24px">${esc(t(lang, 'notFound.body'))}</p>
      <a href="${esc(localePath(lang, '/'))}" class="nav-btn nav-btn-primary" style="height:40px;padding:0 18px">${esc(t(lang, 'notFound.back'))}</a>
    </main>
    ${footer(new Date().getFullYear(), lang, basePath)}
  </div>
</div>
${pageLoader()}
<script src="/assets/site.js" defer></script>
</body></html>`,
    { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

// --- submit a tool ----------------------------------------------------------

export function submitPage({ categories, counts, total, theme, lang = DEFAULT_LANG, gaId = '', error = '', values = {}, basePath = '/' }) {
  const v = values || {};

  const catOpts = categories
    .map((c) => `<option value="${c.id}" ${String(c.id) === String(v.category_id) ? 'selected' : ''}>${esc(categoryLabel(c, lang))}</option>`)
    .join('');

  const priceOpts = ['free', 'freemium', 'paid', 'opensource']
    .map((k) => `<option value="${k}" ${k === (v.pricing || 'freemium') ? 'selected' : ''}>${esc(pricingLabel(lang, k))}</option>`)
    .join('');

  const err = error ? `<div class="form-alert form-alert-error" role="alert">${esc(error)}</div>` : '';

  const body = `${head({
    title: `${t(lang, 'submit.title')} — SoMarkIt`,
    description: t(lang, 'submit.lead'),
    canonical: `https://somarkit.com${localePath(lang, '/submit')}` ,
    jsonLd: [],
    theme,
    lang,
    gaId,
  })}
<body>
<a href="#main-content" class="skip-to-content">${esc(t(lang, 'detail.home'))}</a>
<div class="app-layout">
  ${sidebar({ categories, counts, activeSlug: 'submit', total, lang, basePath })}
  <div class="main-wrapper">
    ${mobileHeader(lang, basePath)}
    ${topbar({ categories, lang, basePath })}
    <main id="main-content" class="detail-wrap">
      <div class="detail-card submit-card">
        <h1 class="detail-title">${esc(t(lang, 'submit.title'))}</h1>
        <p class="submit-lead">${esc(t(lang, 'submit.lead'))}</p>
        ${err}
        <form method="post" action="/submit" class="submit-form" novalidate>
          <div class="form-row">
            <label class="form-field">
              <span class="form-label">${esc(t(lang, 'submit.name'))} <em>*</em></span>
              <input class="form-input" type="text" name="name" required maxlength="80"
                value="${esc(v.name || '')}" placeholder="${esc(t(lang, 'submit.namePh'))}">
            </label>
            <label class="form-field">
              <span class="form-label">${esc(t(lang, 'submit.url'))} <em>*</em></span>
              <input class="form-input" type="url" name="url" required
                value="${esc(v.url || '')}" placeholder="${esc(t(lang, 'submit.urlPh'))}">
            </label>
          </div>

          <div class="form-row">
            <label class="form-field">
              <span class="form-label">${esc(t(lang, 'submit.category'))} <em>*</em></span>
              <select class="form-input" name="category_id" required>
                <option value="">${esc(t(lang, 'submit.categoryPh'))}</option>
                ${catOpts}
              </select>
            </label>
            <label class="form-field">
              <span class="form-label">${esc(t(lang, 'submit.pricing'))}</span>
              <select class="form-input" name="pricing">${priceOpts}</select>
            </label>
          </div>

          <label class="form-field">
            <span class="form-label">${esc(t(lang, 'submit.description'))}</span>
            <input class="form-input" type="text" name="description" maxlength="300"
              value="${esc(v.description || '')}" placeholder="${esc(t(lang, 'submit.descriptionPh'))}">
          </label>

          <label class="form-field">
            <span class="form-label">${esc(t(lang, 'submit.tags'))}</span>
            <input class="form-input" type="text" name="tags" maxlength="120"
              value="${esc(v.tags || '')}" placeholder="${esc(t(lang, 'submit.tagsPh'))}">
          </label>

          <div class="form-row">
            <label class="form-field">
              <span class="form-label">${esc(t(lang, 'submit.yourName'))}</span>
              <input class="form-input" type="text" name="submitter_name" maxlength="60"
                value="${esc(v.submitter_name || '')}" placeholder="${esc(t(lang, 'submit.yourNamePh'))}">
            </label>
            <label class="form-field">
              <span class="form-label">${esc(t(lang, 'submit.yourEmail'))}</span>
              <input class="form-input" type="email" name="submitter_email" maxlength="120"
                value="${esc(v.submitter_email || '')}" placeholder="${esc(t(lang, 'submit.yourEmailPh'))}">
            </label>
          </div>

          <label class="form-field">
            <span class="form-label">${esc(t(lang, 'submit.note'))}</span>
            <textarea class="form-input form-textarea" name="note" maxlength="800"
              placeholder="${esc(t(lang, 'submit.notePh'))}">${esc(v.note || '')}</textarea>
          </label>

          <!-- Honeypot: real users never see or fill this. -->
          <div class="hp-field" aria-hidden="true">
            <label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
          </div>

          <div class="submit-actions">
            <button class="nav-btn nav-btn-primary" type="submit" style="height:40px;padding:0 22px">${esc(t(lang, 'submit.submitBtn'))}</button>
            <a class="nav-btn" href="${esc(localePath(lang, '/'))}" style="height:40px;padding:0 16px">${esc(t(lang, 'submit.back'))}</a>
          </div>
          <p class="submit-privacy">${esc(t(lang, 'submit.privacy'))}</p>
        </form>
      </div>
    </main>
    ${footer(new Date().getFullYear(), lang, basePath)}
  </div>
</div>
${pageLoader()}
<script src="/assets/site.js" defer></script>
</body></html>`;

  return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export function submitSuccessPage({ categories, counts, total, theme, lang = DEFAULT_LANG, gaId = '', basePath = '/', unprefixed = false }) {
  const body = `${head({
    title: `${t(lang, 'submit.successTitle')} — SoMarkIt`,
    description: t(lang, 'submit.successBody'),
    canonical: `https://somarkit.com${localePath(lang, '/submit')}` ,
    jsonLd: [],
    theme,
    lang,
    gaId,
  })}
<body>
<div class="app-layout">
  ${sidebar({ categories, counts, activeSlug: 'submit', total, lang, basePath })}
  <div class="main-wrapper">
    ${mobileHeader(lang, basePath)}
    ${topbar({ categories, lang, basePath })}
    <main id="main-content" class="detail-wrap" style="text-align:center;padding-top:80px">
      <div class="submit-success-icon">${UI.check}</div>
      <h1 class="detail-title">${esc(t(lang, 'submit.successTitle'))}</h1>
      <p style="color:var(--text-tertiary);margin:8px 0 28px">${esc(t(lang, 'submit.successBody'))}</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <a href="${esc(localePath(lang, '/submit'))}" class="nav-btn" style="height:40px;padding:0 18px">${esc(t(lang, 'submit.again'))}</a>
        <a href="${esc(localePath(lang, '/'))}" class="nav-btn nav-btn-primary" style="height:40px;padding:0 18px">${esc(t(lang, 'submit.back'))}</a>
      </div>
    </main>
    ${footer(new Date().getFullYear(), lang, basePath)}
  </div>
</div>
${pageLoader()}
<script src="/assets/site.js" defer></script>
</body></html>`;

  return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
