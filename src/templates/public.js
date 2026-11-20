// -----------------------------------------------------------------------------
// Public site templates
// -----------------------------------------------------------------------------

import { esc, html } from '../lib/crypto.js';
import { ICONS, UI, icon } from '../lib/icons.js';
import { logoGlyph } from '../lib/logo.js';
import { t, pricingLabel, LANGS, normalizeLang, localePath, splitLocale, DEFAULT_LANG, UNPREFIXED_LANG } from '../lib/i18n.js';
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
 * it so every locale gets an absolute URL of its own. `x-default` is the page
 * the bare, prefix-less URLs serve (English), so a visitor who matches no
 * language lands on the same page they would get without a prefix.
 */
function hreflangLinks(canonical, lang) {
  const path = canonical ? new URL(canonical).pathname : '/';
  const neutral = splitLocale(path).rest;
  const base = 'https://somarkit.com';
  const links = LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l.code}" href="${base}${localePath(l.code, neutral)}">`
  );
  links.push(`<link rel="alternate" hreflang="x-default" href="${base}${localePath(UNPREFIXED_LANG, neutral)}">`);
  return links.join('\n');
}

function head({ title, description, canonical, siteName = 'SoMarkIt', jsonLd = [], theme = 'light', lang = DEFAULT_LANG, gaId = '', noindex = false, keywords = '', ogType = 'website', ogImage = 'https://somarkit.com/og-cover.png', modifiedTime = '', noHreflang = false }) {
  // <html lang>/og:locale come from the LANGS entry, so a new locale is
  // announced correctly without touching this template.
  const meta = langMeta(lang);
  const kw = keywords || t(lang, 'seo.keywords');
  const isoTime = toIsoDateTime(modifiedTime);
  const articleTime = isoTime
    ? `<meta property="article:modified_time" content="${esc(isoTime)}">`
    : '';
  return `<!DOCTYPE html>
<html lang="${esc(meta.htmlLang)}" data-lang="${esc(meta.code)}" data-theme="${theme}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="keywords" content="${esc(kw)}">
<meta name="robots" content="${noindex
  ? 'noindex, follow'
  : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}">
<meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0B1120" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
${canonical && !noHreflang ? hreflangLinks(canonical, lang) : ''}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="${esc(ogType)}">
<meta property="og:site_name" content="${esc(siteName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:secure_url" content="${esc(ogImage)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(t(lang, 'seo.ogAlt'))}">
<meta property="og:locale" content="${esc(meta.ogLocale)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
${articleTime}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<meta name="twitter:image:alt" content="${esc(t(lang, 'seo.ogAlt'))}">
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
            placeholder="${esc(t(lang, 'nav.search'))}" autocomplete="off" aria-label="${esc(t(lang, 'nav.searchAria'))}"
            data-search-url="${esc(localePath(lang, '/search'))}"
            data-search-api="${esc(localePath(lang, '/api/search'))}"
            data-no-results="${esc(t(lang, 'search.noResults'))}"
            data-all-label="${esc(t(lang, 'search.viewAll'))}"
            data-loading-label="${esc(t(lang, 'search.loading'))}">
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

function hero({ total, catCount, featured, lang = DEFAULT_LANG, titleLines, subtitle, showFeatured = true, featuredTitle = '', breadcrumb = '' }) {
  let rail = '';
  if (showFeatured && featured.length) {
    // Two rich colour cards on top, matching the reference density.
    const rows = featured.slice(0, 2).map((item, i) => {
      const kicker = item.tags[0] || item.category_name || '';
      const tags = item.tags.slice(0, 3)
        .map((tag) => `<span class="hero-agent-tag">${esc(tag)}</span>`)
        .join('');
      // The card opens our own review page. It deliberately carries no
      // `data-tool-id`: the tracker treats any such link as a visit to the
      // product's site, and the outbound CTA on the detail page already does
      // that job (and is the only place a visit should be counted).
      return `<a class="hero-agent-card hero-agent-accent-${i % 4}"
          href="${esc(localePath(lang, `/tools/${item.slug}`))}">
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
      <h2 class="hero-featured-title" id="featured-heading"><span class="i-flame">${UI.flame}</span>${esc(featuredTitle || t(lang, 'hero.featured'))}</h2>
      <div class="hero-featured-list">${rows.join('\n')}</div>
    </div>`;
  }

  return `<header class="hero">
    <div class="hero-inner">
      <div class="hero-combined ${rail ? '' : 'hero-combined-solo'}">
        <div class="hero-content">
          ${breadcrumb ? `<nav class="hero-breadcrumb" aria-label="breadcrumb">${breadcrumb}</nav>` : ''}
          <h1 class="hero-title">${(titleLines || [t(lang, 'hero.title.1'), t(lang, 'hero.title.2')])
            .map((line) => `<span class="hero-title-line">${esc(line)}</span>`).join('')}</h1>
          <p class="hero-subtitle">${esc(subtitle || t(lang, 'hero.subtitle', total, catCount))}</p>
          <div class="hero-search" role="search" aria-label="${esc(t(lang, 'hero.searchAria'))}">
            <div class="hero-search-wrapper">
              <span class="search-icon">${UI.search}</span>
              <input type="search" class="hero-search-input js-search" id="heroSearchInput"
                placeholder="${esc(t(lang, 'hero.searchPlaceholder'))}" data-ph-short="${esc(t(lang, 'hero.searchPlaceholderShort'))}" autocomplete="off" aria-label="${esc(t(lang, 'nav.searchAria'))}"
                data-search-url="${esc(localePath(lang, '/search'))}"
                data-search-api="${esc(localePath(lang, '/api/search'))}"
            data-no-results="${esc(t(lang, 'search.noResults'))}"
            data-all-label="${esc(t(lang, 'search.viewAll'))}"
            data-loading-label="${esc(t(lang, 'search.loading'))}">
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

/** SQLite `datetime('now')` → ISO 8601; already-ISO values pass through. */
function toIsoDateTime(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  if (/T.*Z$/.test(s)) return s;
  return `${s.replace(' ', 'T')}Z`;
}

/** Approximate rendered width: CJK counts as two Latin characters. */
function displayWidth(s = '') {
  let width = 0;
  for (const ch of String(s)) {
    const cp = ch.codePointAt(0);
    const wide = (cp >= 0x1100 && cp <= 0x115f)
      || (cp >= 0x2e80 && cp <= 0x303e)
      || (cp >= 0x3041 && cp <= 0x33ff)
      || (cp >= 0x3400 && cp <= 0x4dbf)
      || (cp >= 0x4e00 && cp <= 0x9fff)
      || (cp >= 0xac00 && cp <= 0xd7a3)
      || (cp >= 0xf900 && cp <= 0xfaff)
      || (cp >= 0xfe30 && cp <= 0xfe6f)
      || (cp >= 0xff00 && cp <= 0xff60);
    if (wide) width += 2;
    else if (/[A-Za-z0-9]/.test(ch)) width += 1;
  }
  return width;
}

/**
 * Brand logo tile: the stored image when there is one, the name's initials
 * otherwise. The real name is exposed to assistive tech, the image itself is
 * decorative (the adjacent tool name already announces it).
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
        <div class="tool-name">
          <a class="tool-name-link" href="${esc(localePath(lang, `/tools/${item.slug}`))}">${esc(item.name)}</a>
          ${item.is_hot ? `<span class="badge badge-hot">${esc(t(lang, 'badge.hot'))}</span>` : ''}
          ${item.is_new ? `<span class="badge badge-new">${esc(t(lang, 'badge.new'))}</span>` : ''}
        </div>
      </div>
    </div>
    <p class="tool-desc">${esc(item.description || t(lang, 'card.noDesc'))}</p>
    ${tags ? `<div class="tool-tags">${tags}</div>` : ''}
    <div class="tool-card-footer">
      <span class="pricing-tag pricing-${esc(item.pricing)}">${esc(pricingLabel(lang, item.pricing))}</span>
      <div class="tool-card-actions">
        <a href="${esc(localePath(lang, `/tools/${item.slug}`))}" class="tool-detail-link"
          title="${esc(t(lang, 'card.review'))}"
          data-label-resting="${esc(t(lang, 'card.review'))}"
          data-loading-label="${esc(t(lang, 'card.opening'))}">${esc(t(lang, 'card.review'))}</a>
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
function contentArea({ groups, categories, total, activeSlug = 'all', lang = DEFAULT_LANG, mode = 'subset', initialVisibleCount = null, paginateActive = false, page = 1, totalPages = 1, pagePath = '', relatedCategories = [] }) {
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
          <h2 class="cat-name">${esc(categoryLabel(g.category, lang))}</h2>
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

  // Crawlable pagination. The visible "load on scroll" stream stays for people;
  // these <a> links are what a crawler can follow past the first nine cards.
  let pager = '';
  if (totalPages > 1) {
    const href = (n) => `${localePath(lang, pagePath)}${n > 1 ? `?page=${n}` : ''}`;
    const item = (n, label, cls = '') => (n === page
      ? `<span class="search-page ${cls} cur" aria-current="page">${label}</span>`
      : `<a class="search-page ${cls}" href="${esc(href(n))}">${label}</a>`);
    const from = Math.max(1, Math.min(page - 2, totalPages - 4));
    const to = Math.min(totalPages, from + 4);
    let nums = '';
    for (let n = from; n <= to; n++) nums += item(n, String(n));
    pager = `<nav class="search-pager category-pager" aria-label="${esc(t(lang, 'search.pagerAria'))}">
      ${page > 1 ? item(page - 1, t(lang, 'search.prev'), 'step') : `<span class="search-page step disabled">${esc(t(lang, 'search.prev'))}</span>`}
      ${nums}
      ${page < totalPages ? item(page + 1, t(lang, 'search.next'), 'step') : `<span class="search-page step disabled">${esc(t(lang, 'search.next'))}</span>`}
    </nav>`;
  }

  // Sibling categories, framed as an index at the foot of the page. It renders
  // inside .content-area on purpose: the old version sat outside that column, so
  // its rule ran edge to edge while the cards above stayed inset, and it had no
  // padding against the footer.
  const relatedNav = relatedCategories.length
    ? `<nav class="related-categories" aria-label="${esc(t(lang, 'seo.relatedCategories'))}">
      <h2 class="related-categories-title">${esc(t(lang, 'seo.relatedCategories'))}</h2>
      <ul class="related-category-links">
        ${relatedCategories.map((c) => `<li>
          <a class="related-category" href="${esc(c.href)}">
            <span class="related-category-icon" aria-hidden="true">${icon(c.icon, 16)}</span>
            <span class="related-category-name">${esc(c.name)}</span>
            <em class="related-category-count">${c.count}</em>
          </a>
        </li>`).join('\n        ')}
      </ul>
    </nav>`
    : '';

  return `<div class="content-area">
    <div class="content-head" id="contentHead">
      <div class="content-title">${esc(t(lang, 'content.title'))}</div>
      <span class="tools-count" id="toolsCount" aria-live="polite">${esc(t(lang, 'content.toolsCount', shown))}</span>
      <span class="content-head-spacer"></span>
      <div class="filter-bar" role="group" aria-label="${esc(t(lang, 'content.filterAria'))}" data-lang="${esc(normalizeLang(lang))}">${chips}</div>
    </div>
    <div id="toolsContainer" role="list" aria-label="${esc(t(lang, 'content.title'))}" data-mode="${esc(mode)}" data-active="${esc(activeSlug)}">
      ${sections}
    </div>
    ${pager}
    <div class="empty-state" id="emptyState" style="display:none">
      ${UI.search}
      <div class="empty-title">${esc(t(lang, 'empty.title'))}</div>
      <p>${esc(t(lang, 'empty.hint'))}<a href="#" data-clear-filters style="color:var(--accent)">${esc(t(lang, 'empty.clear'))}</a></p>
    </div>
    ${relatedNav}
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

function shell({ title, description, canonical, jsonLd, categories, counts, groups, total, featured, activeSlug, theme, lang = DEFAULT_LANG, gaId = '', basePath = '/', unprefixed = false, mode = 'subset', initialVisibleCount = null, paginateActive = false, keywords = '', ogType = 'website', modifiedTime = '', heroTitleLines = null, heroSubtitle = '', heroShowFeatured = true, featuredTitle = '', page = 1, totalPages = 1, pagePath = '', noHreflang = false, heroBreadcrumb = '', relatedCategories = [] }) {
  return `${head({ title, description, canonical, jsonLd, theme, lang, gaId, noindex: unprefixed, keywords, ogType, modifiedTime, noHreflang })}
<body>
<noscript><div style="text-align:center;padding:1rem;background:#FEF2F2;color:#991B1B">本站需要启用 JavaScript 才能使用搜索与筛选功能。</div></noscript>
<a href="#main-content" class="skip-to-content">${esc(t(lang, 'detail.home'))}</a>
<div class="app-layout">
  ${sidebar({ categories, counts, activeSlug, total, lang, basePath })}
  <div class="main-wrapper">
    ${mobileHeader(lang, basePath)}
    ${topbar({ categories, activeSlug, lang, basePath })}
    <main id="main-content">
      ${hero({ total, catCount: categories.length, featured, lang, titleLines: heroTitleLines, subtitle: heroSubtitle, showFeatured: heroShowFeatured, featuredTitle, breadcrumb: heroBreadcrumb })}
      ${contentArea({ groups, categories, total, activeSlug, lang, mode, initialVisibleCount, paginateActive, page, totalPages, pagePath, relatedCategories })}
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
  const canonical = `https://somarkit.com${localePath(lang, '/')}`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'SoMarkIt',
      alternateName: ['AI 工具导航', 'AI Tools Directory'],
      url: canonical,
      description: siteDesc,
      inLanguage: langMeta(lang).htmlLang,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `https://somarkit.com${localePath(lang, '/search')}?q={search_term_string}` },
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
        url: `https://somarkit.com${localePath(lang, `/tools/${x.slug}`)}`,
      })),
    },
  ];

  return new Response(
    shell({
      title: t(lang, 'seo.homeTitle'),
      description: t(lang, 'seo.homeDesc'),
      keywords: t(lang, 'seo.keywords'),
      canonical,
      jsonLd,
      categories, counts, groups, total, featured,
      activeSlug: 'all', theme, lang, gaId, basePath, unprefixed,
      heroTitleLines: [t(lang, 'seo.homeH1.1'), t(lang, 'seo.homeH1.2')],
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
  const canonical = `https://somarkit.com${localePath(lang, `/tools/${tool.slug}`)}`;
  const offers = tool.pricing === 'paid'
    ? undefined
    : { '@type': 'Offer', price: '0', priceCurrency: 'USD' };
  const reviewHtml = renderMarkdown(tool.review_md || '');
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: tool.name,
      description: tool.description,
      url: tool.url,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      inLanguage: langMeta(lang).htmlLang,
      ...(offers ? { offers } : {}),
      ...(tool.updated_at ? { dateModified: toIsoDateTime(tool.updated_at) } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t(lang, 'detail.home'), item: `https://somarkit.com${localePath(lang, '/')}` },
        { '@type': 'ListItem', position: 2, name: catName, item: `https://somarkit.com${localePath(lang, `/${tool.category_slug || ''}`)}` },
        { '@type': 'ListItem', position: 3, name: tool.name, item: canonical },
      ],
    },
    ...(reviewHtml ? [{
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: { '@type': 'SoftwareApplication', name: tool.name, url: tool.url },
      author: { '@type': 'Organization', name: t(lang, 'detail.authorName'), url: `https://somarkit.com${localePath(lang, '/about')}` },
      publisher: { '@type': 'Organization', name: 'SoMarkIt', logo: { '@type': 'ImageObject', url: 'https://somarkit.com/apple-touch-icon.png' } },
      reviewBody: tool.description || '',
      inLanguage: langMeta(lang).htmlLang,
      ...(tool.created_at ? { datePublished: toIsoDateTime(tool.created_at) } : {}),
      ...(tool.updated_at ? { dateModified: toIsoDateTime(tool.updated_at) } : {}),
    }] : []),
  ];

  const relatedCards = related.slice(0, 6).map((x) => toolCard(x, lang)).join('');
  const tags = tool.tags.map((tag) => `<span class="tool-tag">${esc(tag)}</span>`).join('');
  // Plain-text tag list for the info-card row ("A · B · C").
  const tagsText = tool.tags.join(' · ');
  // Long-form editorial review.
  // `localizeTool` has already resolved review_md to this locale, falling back
  // to the default language when the translation is blank — so the template
  // stays language-agnostic.
  // Per-tool SEO overrides (admin → "SEO 标题与描述"). Only the exact locale's
  // column counts: borrowing the Chinese override would put a Chinese sentence
  // into an English <title>, which is worse than the localized template.
  const seoCode = normalizeLang(lang);
  const override = (field) => String(
    seoCode === DEFAULT_LANG ? (tool[field] || '') : (tool[`${field}_${seoCode}`] || '')
  ).trim();
  const customTitle = override('seo_title');
  const customDesc = override('seo_desc');
  const customKeywords = override('seo_keywords');

  // Tool titles are evergreen: no year. A year only earns its place on pages
  // whose query carries one (the category round-ups); on a brand review it just
  // spends title width and makes every page look bulk-generated.
  const titleFull = `${t(lang, 'seo.toolTitle', tool.name)} | SoMarkIt`;
  const titleShort = `${t(lang, 'seo.toolTitleShort', tool.name)} | SoMarkIt`;
  const pageTitle = customTitle || (displayWidth(titleFull) <= 60
    ? titleFull
    : (displayWidth(titleShort) <= 60 ? titleShort : `${tool.name} | SoMarkIt`));
  const baseDescription = (tool.description || siteDesc).trim();
  const separator = /[。！？.!?]$/.test(baseDescription)
    ? ' '
    : (lang === 'zh' || lang === 'ja' ? '。' : '. ');
  const templateDescription = displayWidth(baseDescription) >= 70
    ? baseDescription
    : `${baseDescription}${separator}${t(lang, 'seo.toolDescSuffix')}`.trim();
  const description = customDesc || templateDescription;

  const body = `${head({
    title: pageTitle,
    description,
    canonical,
    keywords: customKeywords
      || [tool.name, `${tool.name} ${t(lang, 'card.review')}`, catName, t(lang, 'seo.keywords')].join(','),
    ogType: 'article',
    modifiedTime: tool.updated_at || '',
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
          <h1 class="detail-title">${esc(t(lang, 'seo.toolH1', tool.name))}</h1>
          <div class="detail-meta">
            ${tool.is_hot ? `<span class="badge badge-hot">${esc(t(lang, 'badge.hot'))}</span>` : ''}
            ${tool.is_new ? `<span class="badge badge-new">${esc(t(lang, 'badge.new'))}</span>` : ''}
            <span class="pricing-tag pricing-${esc(tool.pricing)}">${esc(pricingLabel(lang, tool.pricing))}</span>
            <span class="detail-meta-item">${esc(catName)}</span>
            <span class="detail-meta-item">${esc(t(lang, 'detail.visits', tool.visit_count))}</span>
          </div>
        </div>
        <p class="detail-byline">
          <a href="${esc(localePath(lang, '/about'))}">${esc(t(lang, 'detail.author'))}</a>
          ${tool.updated_at ? `<span class="detail-updated">${esc(t(lang, 'seo.lastUpdated', String(tool.updated_at).slice(0, 10)))}</span>` : ''}
        </p>
        <h2 class="sr-only">${esc(t(lang, 'detail.about'))}</h2>
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
      <h2 class="sr-only">${esc(t(lang, 'detail.info'))}</h2>
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
      ${related.length ? `<h2 class="detail-section-title">${esc(t(lang, 'detail.related'))}</h2>
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

export function categoryPage({ category, categories, counts, tools, featured, total, catCount, theme, lang = DEFAULT_LANG, gaId = '', basePath = '/', unprefixed = false, page = 1 }) {
  // Only the active category is rendered. Shipping every other category in a
  // display:none container made each category page a near-copy of the whole
  // catalogue; the sidebar already links to the others with real navigation.
  const PAGE_SIZE = RAIL_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(tools.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageTools = tools.slice(start, start + PAGE_SIZE);
  const groups = [{
    category,
    tools: pageTools,
    total: tools.length,
    remaining: Math.max(0, tools.length - start - pageTools.length),
  }];
  const catName = categoryLabel(category, lang);
  const year = new Date().getFullYear();
  const baseCanonical = `https://somarkit.com${localePath(lang, `/${category.slug}`)}`;
  const canonical = currentPage > 1 ? `${baseCanonical}?page=${currentPage}` : baseCanonical;
  const h1 = t(lang, 'seo.categoryH1', catName);
  const titleFull = `${t(lang, 'seo.categoryTitle', catName, year)} | SoMarkIt`;
  const pageTitle = currentPage > 1
    ? `${catName}${t(lang, 'seo.pageSuffix', currentPage)} | SoMarkIt`
    : (displayWidth(titleFull) <= 60 ? titleFull : `${catName} | SoMarkIt`);
  const baseDescription = t(lang, 'seo.categoryDesc', catName);
  const description = currentPage > 1
    ? `${baseDescription}${t(lang, 'seo.pageDescSuffix', currentPage)}`
    : baseDescription;
  const descLength = [...String(category.description || '')].length;
  const intro = descLength >= 80
    ? category.description
    : (category.description
      ? `${category.description} ${t(lang, 'seo.categoryIntro', catName)}`
      : t(lang, 'seo.categoryIntro', catName));
  const keywords = [catName, t(lang, 'seo.keywords')].join(',');
  const heroBreadcrumb = `<a href="${esc(localePath(lang, '/'))}">${esc(t(lang, 'detail.home'))}</a><span aria-hidden="true">/</span><span>${esc(catName)}</span>`;
  const relatedCategories = categories
    .filter((c) => c.id !== category.id)
    .slice(0, 6)
    .map((c) => ({
      name: categoryLabel(c, lang),
      href: localePath(lang, `/${c.slug}`),
      count: counts[c.id] || 0,
      icon: c.icon || 'grid',
    }));
  // The right column of the hero is never left empty: a category with tools
  // shows its own top picks, an empty one falls back to the site-wide trending
  // pair (same card design, honest heading).
  const categoryPicks = tools
    .slice()
    .sort((a, b) => (Number(b.visit_count) || 0) - (Number(a.visit_count) || 0)
      || (Number(b.is_hot) || 0) - (Number(a.is_hot) || 0))
    .slice(0, 2);
  const heroFeatured = categoryPicks.length ? categoryPicks : featured;
  const heroFeaturedTitle = categoryPicks.length ? t(lang, 'seo.categoryFeatured') : t(lang, 'hero.featured');
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: h1,
      description,
      url: canonical,
      inLanguage: langMeta(lang).htmlLang,
      isPartOf: { '@type': 'WebSite', name: 'SoMarkIt', url: `https://somarkit.com${localePath(lang, '/')}` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t(lang, 'detail.home'), item: `https://somarkit.com${localePath(lang, '/')}` },
        { '@type': 'ListItem', position: 2, name: catName, item: canonical },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: h1,
      numberOfItems: pageTools.length,
      itemListElement: pageTools.map((x, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: x.name,
        url: `https://somarkit.com${localePath(lang, `/tools/${x.slug}`)}`,
      })),
    },
  ];

  return new Response(
    shell({
      title: pageTitle,
      description,
      keywords,
      canonical,
      jsonLd,
      categories, counts, groups, total, featured: heroFeatured,
      activeSlug: category.slug, theme, lang, gaId, basePath, unprefixed,
      heroTitleLines: [h1],
      heroSubtitle: intro,
      heroShowFeatured: true,
      featuredTitle: heroFeaturedTitle,
      heroBreadcrumb,
      relatedCategories,
      mode: 'subset',
      initialVisibleCount: tools.length,
      page: currentPage,
      totalPages,
      pagePath: `/${category.slug}`,
      noHreflang: currentPage > 1,
      // Page 1 keeps the scroll stream; later pages are plain crawlable lists.
      paginateActive: currentPage === 1,
    }),
    { headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

/**
 * Search results page.
 *
 * Server-rendered from the whole catalogue, so the topbar field works from any
 * page (a tool detail, a 404, the about page) and the URL is shareable. The
 * result cards are the same ones the listings use.
 *
 * Paginated: a query like "ai" matches most of the catalogue, and rendering
 * every match made the page long and slow for no benefit.
 */
export const SEARCH_PAGE_SIZE = 24;

export function searchPage({ q, results, page = 1, categories, counts, total, theme, lang = DEFAULT_LANG, gaId = '', basePath = '/', unprefixed = false }) {
  const query = String(q || '').trim();
  const matched = results.length;
  const pages = Math.max(1, Math.ceil(matched / SEARCH_PAGE_SIZE));
  const current = Math.min(Math.max(1, Number(page) || 1), pages);
  const start = (current - 1) * SEARCH_PAGE_SIZE;
  const pageItems = results.slice(start, start + SEARCH_PAGE_SIZE);

  const title = query ? t(lang, 'search.title', query) : t(lang, 'search.titleEmpty');

  const cards = matched
    ? `<div class="tools-grid">${pageItems.map((item) => toolCard(item, lang)).join('')}</div>`
    : `<div class="empty-state" id="emptyState">
        <div class="empty-icon">${UI.search}</div>
        <h2 class="empty-title">${esc(t(lang, 'search.noResults'))}</h2>
        <p class="empty-hint">${esc(t(lang, 'search.noResultsHint'))}</p>
        <a class="nav-btn nav-btn-primary" href="${esc(localePath(lang, '/'))}">${esc(t(lang, 'search.backHome'))}</a>
      </div>`;

  // Page links, with a window of 5 around the current page.
  let pager = '';
  if (pages > 1) {
    const link = (n, label, extra = '') =>
      `<a class="search-page ${extra}" href="${esc(localePath(lang, '/search'))}?q=${encodeURIComponent(query)}&page=${n}"
        ${extra === 'cur' ? 'aria-current="page"' : ''}>${label}</a>`;

    let nums = '';
    const from = Math.max(1, Math.min(current - 2, pages - 4));
    const to = Math.min(pages, from + 4);
    for (let n = from; n <= to; n++) nums += link(n, String(n), n === current ? 'cur' : '');

    pager = `<nav class="search-pager" aria-label="${esc(t(lang, 'search.pagerAria'))}">
      ${current > 1 ? link(current - 1, t(lang, 'search.prev'), 'step') : `<span class="search-page step disabled">${esc(t(lang, 'search.prev'))}</span>`}
      ${nums}
      ${current < pages ? link(current + 1, t(lang, 'search.next'), 'step') : `<span class="search-page step disabled">${esc(t(lang, 'search.next'))}</span>`}
    </nav>`;
  }

  return new Response(
    `${head({
      title: `${title} | SoMarkIt`,
      description: query
        ? t(lang, 'search.description', query, matched)
        : t(lang, 'seo.siteDesc'),
      // A result page is a view of an index, not content: keep it out of the
      // index so thousands of query permutations cannot bloat the site.
      noindex: true,
      theme, lang, gaId,
    })}
<body>
<div class="app-layout">
  ${sidebar({ categories, counts, activeSlug: 'all', total, lang, basePath })}
  <div class="main-wrapper">
    ${mobileHeader(lang, basePath)}
    ${topbar({ categories, lang, basePath })}
    <main id="main-content">
      <div class="content-area">
        <div class="search-head">
          <h1 class="search-title">${query ? esc(t(lang, 'search.heading', query)) : esc(t(lang, 'search.headingEmpty'))}</h1>
          <p class="search-count">${query
            ? (matched ? esc(t(lang, 'search.count', matched)) : esc(t(lang, 'search.countNone')))
            : esc(t(lang, 'search.hint'))}</p>
        </div>
        ${cards}
        ${pager}
      </div>
    </main>
    ${footer(new Date().getFullYear(), lang, basePath)}
  </div>
</div>
${pageLoader()}
<script src="/assets/site.js" defer></script>
</body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

export function aboutPage({ categories, counts, total, theme, lang = DEFAULT_LANG, gaId = '', basePath = '/', unprefixed = false }) {
  // Body copy lives in the dictionaries (about.*) so every locale is translated
  // by the same table rather than by an if/else in this template.
  const canonical = `https://somarkit.com${localePath(lang, '/about')}`;
  const updated = (categories || [])
    .map((c) => String(c.updated_at || '').slice(0, 10))
    .filter(Boolean)
    .sort()
    .pop() || '';
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: t(lang, 'about.h1'),
      description: t(lang, 'seo.aboutDesc'),
      url: canonical,
      inLanguage: langMeta(lang).htmlLang,
      isPartOf: { '@type': 'WebSite', name: 'SoMarkIt', url: `https://somarkit.com${localePath(lang, '/')}` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'SoMarkIt',
      url: 'https://somarkit.com/',
      logo: 'https://somarkit.com/apple-touch-icon.png',
      description: t(lang, 'seo.siteDesc'),
      email: 'support@somarkit.com',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@somarkit.com',
        availableLanguage: ['zh', 'en', 'ja', 'ko'],
      },
    },
  ];
  const body = `${head({
    title: t(lang, 'seo.aboutTitle'),
    description: t(lang, 'seo.aboutDesc'),
    keywords: [t(lang, 'about.h1'), 'SoMarkIt', 'AI 工具导航', 'AI tools directory'].join(','),
    canonical,
    jsonLd,
    theme,
    lang,
    gaId,
    noindex: unprefixed,
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
        <h2 class="detail-section-title">${esc(t(lang, 'about.h2Who'))}</h2>
        <div class="detail-body">
          <p>${esc(t(lang, 'about.p1'))}</p>
          <p>${esc(t(lang, 'about.p2'))}</p>
        </div>
        <h2 class="detail-section-title">${esc(t(lang, 'about.h2Team'))}</h2>
        <p class="detail-body">${esc(t(lang, 'about.teamBio'))}</p>
        <h2 class="detail-section-title">${esc(t(lang, 'about.h2How'))}</h2>
        <ul class="detail-list">
          <li>${esc(t(lang, 'about.how1'))}</li>
          <li>${esc(t(lang, 'about.how2'))}</li>
          <li>${esc(t(lang, 'about.how3'))}</li>
        </ul>
        <h2 class="detail-section-title">${esc(t(lang, 'about.h2What'))}</h2>
        <ul class="detail-list">
          <li>${esc(t(lang, 'about.li1'))}</li>
          <li>${esc(t(lang, 'about.li2'))}</li>
          <li>${esc(t(lang, 'about.li3'))}</li>
        </ul>
        <h2 class="detail-section-title">${esc(t(lang, 'about.h2Fix'))}</h2>
        <p class="detail-body">${esc(t(lang, 'about.fixNote'))}</p>
        <h2 class="detail-section-title">${esc(t(lang, 'about.h2Contact'))}</h2>
        <p class="detail-body">${esc(t(lang, 'about.contactNote'))}</p>
        <p class="detail-body"><a href="mailto:support@somarkit.com">support@somarkit.com</a></p>
        ${updated ? `<p class="detail-updated">${esc(t(lang, 'seo.lastUpdated', updated))}</p>` : ''}
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

/**
 * Illustration for the 404 page: a magnifier sweeping past a "4 … 4".
 *
 * Inlined rather than loaded as a file so the empty state never flashes a
 * broken image, and kept as plain paths so it scales cleanly. The art is pure
 * greyscale, which lets dark mode invert it with a CSS filter instead of
 * shipping a second copy.
 */
const NOT_FOUND_ART = `<svg class="nf-svg" viewBox="0 0 1792 1024" role="img" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <path d="M494.08 570c0 217.248 176.112 393.344 393.344 393.344 217.248 0 393.344-176.096 393.344-393.344 0-217.232-176.096-393.328-393.344-393.328-217.232 0-393.328 176.096-393.328 393.328z" fill="#949494"/>
  <path d="M887.424 176.672c-157.92 0-294.208 93.264-356.608 227.52a392.384 392.384 0 0 0-3.84 54.304c0 217.168 176.16 393.328 393.344 393.328 157.92 0 294.224-93.264 356.624-227.52 2.48-17.808 3.84-35.84 3.84-54.304 0-217.168-175.952-393.328-393.36-393.328z" fill="#A6A6A6"/>
  <path d="M887.424 376.48a137.648 137.648 0 1 0 275.296 0 137.648 137.648 0 1 0-275.296 0z" fill="#868787"/>
  <path d="M1012 255.296a136.672 136.672 0 0 0-100.688 43.92 136.384 136.384 0 0 0-23.888 77.28c0 75.92 61.728 137.648 137.648 137.648a136.672 136.672 0 0 0 100.704-43.936 136.384 136.384 0 0 0 23.888-77.28 137.632 137.632 0 0 0-137.648-137.632z" fill="#949494"/>
  <path d="M579.472 606.048a93.488 93.488 0 1 0 186.976 0 93.488 93.488 0 1 0-186.976 0z" fill="#868787"/>
  <path d="M663.952 523.6a92.8 92.8 0 0 0-68.256 29.728 93.376 93.376 0 0 0-16.224 52.496 93.552 93.552 0 0 0 93.488 93.488 92.8 92.8 0 0 0 68.256-29.728 93.376 93.376 0 0 0 16.224-52.48 93.552 93.552 0 0 0-93.488-93.504z" fill="#949494"/>
  <path d="M1016.96 754.288a76.16 76.16 0 0 0 152.288 0 76.16 76.16 0 0 0-152.288 0z" fill="#868787"/>
  <path d="M1085.904 687.152c-22.08 0-41.904 9.456-55.872 24.32a75.648 75.648 0 0 0-13.072 42.816 76.048 76.048 0 0 0 76.16 76.144c22.08 0 41.888-9.472 55.856-24.32 8.336-12.176 13.072-27.04 13.072-42.816a76.048 76.048 0 0 0-76.16-76.144z" fill="#949494"/>
  <path d="M810.384 800.912a45.952 45.952 0 1 0 91.92 0 45.952 45.952 0 1 0-91.92 0z" fill="#868787"/>
  <path d="M852.064 760.592c-13.28 0-25.232 5.632-33.568 14.64a46.096 46.096 0 0 0-7.888 25.68 46 46 0 0 0 45.952 45.968c13.296 0 25.232-5.632 33.568-14.656 4.96-7.424 7.888-16.208 7.888-25.68a46 46 0 0 0-45.952-45.952z" fill="#949494"/>
  <path d="M720.272 355.312a45.952 45.952 0 1 0 91.92 0 45.952 45.952 0 1 0-91.92 0z" fill="#868787"/>
  <path d="M761.952 314.768c-13.28 0-25.232 5.632-33.568 14.64a46.096 46.096 0 0 0-7.888 25.68 46 46 0 0 0 45.952 45.952c13.296 0 25.232-5.632 33.568-14.64 4.96-7.44 7.888-16.224 7.888-25.68-0.224-25.232-20.72-45.952-45.952-45.952z" fill="#949494"/>
  <path d="M1270.864 96.24a77.04 77.04 0 0 0 154.08 0 77.04 77.04 0 0 0-154.08 0zM1135.68 52.992a32 32 0 0 0 64 0 32 32 0 0 0-64 0zM427.856 977.088a32 32 0 0 0 63.984 0 32 32 0 0 0-63.984 0zM66.512 216.32a20.96 20.96 0 1 0 41.904 0 20.96 20.96 0 1 0-41.92 0z" fill="#999999"/>
  <path d="M218.352 812.4v-125.472H33.6v-92.144l197.12-343.104h127.968v336.8h75.68v98.448h-75.68v125.472h-140.352z m1.568-222.352v-155.2a913.904 913.904 0 0 1-24.784 55.408 1276.24 1276.24 0 0 1-33.328 62.848l-20.288 36.96h78.4zM1542.56 812.4v-125.472H1357.792v-92.144l197.12-343.104h127.968v336.8h75.68v98.448h-75.68v125.472h-140.352z m1.568-222.352v-155.2a913.904 913.904 0 0 1-24.8 55.408 1276.24 1276.24 0 0 1-33.328 62.848l-20.496 36.96h78.624z" fill="#A6A6A6"/>
</svg>`;

export function notFoundPage({ categories, counts, total, theme, lang = DEFAULT_LANG, gaId = '', basePath = '/', unprefixed = false }) {
  // A handful of category shortcuts so a lost visitor has somewhere to go
  // instead of a dead end.
  const suggestions = (categories || [])
    .slice(0, 6)
    .map((c) => `<a class="nf-chip" href="${esc(localePath(lang, `/${c.slug}`))}">
        <span class="nf-chip-icon">${icon(c.icon)}</span>${esc(categoryLabel(c, lang))}
      </a>`)
    .join('');

  return new Response(
    `${head({
      title: t(lang, 'notFound.title'),
      description: t(lang, 'notFound.body'),
      theme, lang, gaId,
      // A 404 must never be indexed, even though it is a full page.
      noindex: true,
    })}
<body>
<div class="app-layout">
  ${sidebar({ categories, counts, activeSlug: 'all', total, lang, basePath })}
  <div class="main-wrapper">${mobileHeader(lang, basePath)}${topbar({ categories, lang, basePath })}
    <main id="main-content" class="detail-wrap">
      <div class="nf">
        <div class="nf-art">${NOT_FOUND_ART}</div>
        <h1 class="nf-title">${esc(t(lang, 'notFound.h1'))}</h1>
        <p class="nf-text">${esc(t(lang, 'notFound.body'))}</p>

        <div class="nf-actions">
          <a href="${esc(localePath(lang, '/'))}" class="nav-btn nav-btn-primary nf-btn">
            ${esc(t(lang, 'notFound.back'))}
          </a>
          <a href="${esc(localePath(lang, '/'))}#all" class="nav-btn nf-btn">
            ${esc(t(lang, 'notFound.browse'))}
          </a>
        </div>

        ${suggestions ? `<div class="nf-divider"><span>${esc(t(lang, 'notFound.suggest'))}</span></div>
        <div class="nf-chips">${suggestions}</div>` : ''}
      </div>
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
