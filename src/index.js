// -----------------------------------------------------------------------------
// SoMarkIt — Cloudflare Worker entry point
// -----------------------------------------------------------------------------

import { esc, json, redirect, getCookie, setCookie, sign, secureIfHttps } from './lib/crypto.js';
import {
  listCategories, listCategoriesPage, countToolsByCategory, listPublishedTools, listFeaturedTools, listToolsPage, listTrendingTools,
  getToolBySlug, getTool, listToolsAdmin, createTool, updateTool, deleteTool,
  incrementVisits, getCategoryBySlug, getCategory, createCategory, updateCategory,
  deleteCategory, slugify, logAudit, listAudit, listAuditPage, dashboardStats, topTools,
  listAdmins, listAdminsPage, setAdminActive, deleteAuditLog, findAdminByEmail,
  recordClick, analyticsSummary,
  createSubmission, recentSubmissionCount, listSubmissionsAdmin, countSubmissionsByStatus,
  getSubmission, approveSubmission, rejectSubmission, deleteSubmission,
} from './lib/db.js';
import { sendClickToGa } from './lib/ga.js';
import { gaDailySeries, isGaConfigured } from './lib/ga-report.js';
import { storeUpload, deleteMedia, ACCEPT_ATTR, MAX_LABEL } from './lib/media.js';
import { renderMarkdown } from './lib/markdown.js';
import {
  localizeTool, localizeTools, localizeCategory, localizeCategories,
} from './lib/localize.js';
import { ICONS } from './lib/icons.js';
import { homePage, toolPage, categoryPage, aboutPage, notFoundPage, submitPage, submitSuccessPage, toolCard, RAIL_PAGE_SIZE } from './templates/public.js';
import {
  dashboardPage, toolsPage, toolFormPage, categoriesPage, categoryFormPage,
  auditPage, adminsPage, loginPage,
  submissionsPage, submissionDetailPage,
} from './templates/admin.js';
import { analyticsPage } from './templates/analytics.js';
import {
  beginLogin, completeLogin, currentAdmin, logout, adminAllowList, isConfigured,
  SESSION_COOKIE, redirectUri,
} from './lib/auth.js';
import { normalizeLang, LANGS, splitLocale, localePath, DEFAULT_LANG } from './lib/i18n.js';

export default {
  async fetch(request, env, ctx) {
    try {
      return await router(request, env, ctx);
    } catch (err) {
      console.error('Unhandled error:', err && err.stack ? err.stack : err);
      const isAdmin = new URL(request.url).pathname.startsWith('/admin');
      if (isAdmin) {
        return new Response(
          `<!DOCTYPE html><html><body style="font-family:system-ui;padding:40px">
          <h1 style="color:#DC2626">服务器错误</h1>
          <pre style="background:#F5F5F4;padding:16px;border-radius:8px;overflow:auto">${esc(String(err && err.message || err))}</pre>
          <p><a href="/admin">返回后台</a></p></body></html>`,
          { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } }
        );
      }
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};

// ---------------------------------------------------------------------------
// Localised data access.
//
// The public site is multilingual: every query that feeds a public template is
// wrapped here so the templates receive already-localised content. Keeping the
// translation at the data boundary (rather than sprinkling `x_<code> || x`
// through the templates) means a new template automatically gets the right
// language.
// ---------------------------------------------------------------------------

async function loadPublished(db, lang) {
  return localizeTools(await listPublishedTools(db), lang);
}
async function loadCategories(db, lang, opts) {
  return localizeCategories(await listCategories(db, opts), lang);
}
async function loadTrending(db, lang) {
  return localizeTools(await listTrendingTools(db, { limit: 2, days: 30 }), lang);
}
async function loadToolBySlug(db, lang, slug) {
  return localizeTool(await getToolBySlug(db, slug), lang);
}
async function loadCategoryBySlug(db, lang, slug) {
  return localizeCategory(await getCategoryBySlug(db, slug), lang);
}

// ---------------------------------------------------------------------------

async function router(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method;
  const theme = getCookie(request, 'somarkit-theme') === 'dark' ? 'dark' : 'light';
  // GA4 measurement id for the public pages; empty string disables the tag.
  const gaId = String(env.GA_MEASUREMENT_ID || '').trim();

  // Language comes from the URL prefix alone (`/zh/...`, `/en/...`, `/ja/...`,
  // `/ko/...` — one per LANGS entry).
  //
  // There is no cookie and no Accept-Language sniffing: Googlebot sends
  // `Accept-Language: en`, so any guess would make the crawler index a language
  // the URL does not advertise. One URL = one language, always.
  const loc = splitLocale(path);
  const lang = loc.lang || DEFAULT_LANG;
  // Public paths are language-neutral ("/tools/chatgpt"); helpers below add the
  // prefix back so every generated link carries it.
  const pubPath = loc.rest;

  /** Build an in-site public URL for the current language. */
  const L = (p) => localePath(lang, p);

  /**
   * Finalise a public HTML response.
   *
   * Also handles the "no locale prefix" case: such a request renders the
   * default language, but it is not the canonical address. Instead of
   * rewriting HTML after the fact, the templates are told via `unprefixed`
   * (see the page builders) so they emit the /zh canonical and a noindex tag.
   * This keeps bare links working without letting two URLs compete in search.
   */
  const withLang = (res) => {
    if (!res.headers.has('Cache-Control')) {
      // `s-maxage` keeps Cloudflare's edge copy short; `must-revalidate`
      // stops the browser from reusing it without asking.
      res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=60, must-revalidate');
    }
    return res;
  };

  // Passed into every page builder: true when the request omitted the locale
  // prefix, which makes the page a non-canonical alias of the /zh URL.
  const pageFlags = { unprefixed: !loc.matched };

  // ---------------------------------------------------------------- API ---
  if (path === '/api/track' && method === 'POST') {
    // CORS is unnecessary (same origin) but the beacon must never fail loudly.
    let body = {};
    try { body = await request.json(); } catch { /* ignore */ }
    const id = Number(body && body.id);
    const visitor = String((body && body.visitor) || '').slice(0, 64);
    if (!(id > 0)) return new Response(null, { status: 204 });

    const tool = await getTool(env.DB, id);
    if (!tool) return new Response(null, { status: 204 });

    const [ipHash, country] = await Promise.all([
      hashIp(request, env),
      Promise.resolve(request.headers.get('cf-ipcountry') || ''),
    ]);

    ctx.waitUntil((async () => {
      try {
        const result = await recordClick(env.DB, {
          toolId: id,
          ipHash,
          visitor,
          country,
          referer: request.headers.get('referer') || '',
          path: String((body && body.path) || ''),
        });
        // Only mirror clicks we actually recorded, so both stores agree.
        if (result.recorded) {
          await sendClickToGa(env, { visitor, tool, country, referer: request.headers.get('referer') || '', path: String((body && body.path) || '') });
        }
      } catch (err) {
        console.error('track failed', err && err.stack || err);
      }
    })());

    // Echo the visitor id so the client can persist it for later clicks.
    return new Response(JSON.stringify({ ok: true, visitor }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }

  // Public API: accepts an optional locale prefix (/zh/api/search) so the
  // client can request a language; unprefixed falls back to the default.
  if ((pubPath === '/api/search' || path === '/api/search') && method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const tools = await loadPublished(env.DB, lang);
    // Match every language regardless of the visitor's language: someone on the
    // Japanese site may still search for a Chinese tool name and vice versa.
    // Every `_<code>` column is included, so search coverage grows with the
    // locale list instead of being pinned to en.
    const haystack = (t) => {
      const parts = [t.name, t.description, t.tags.join(' '), t.category_name];
      LANGS.forEach((l, i) => {
        if (i === 0) return;
        parts.push(t[`name_${l.code}`], t[`description_${l.code}`], t[`tags_${l.code}`]);
      });
      return parts.filter(Boolean).join(' ').toLowerCase();
    };
    const results = (q ? tools.filter((t) => haystack(t).includes(q)) : tools)
      .slice(0, 30).map((t) => ({
        id: t.id, name: t.name, slug: t.slug, url: t.url,
        description: t.description, category: t.category_name, pricing: t.pricing,
      }));
    return json({ query: q, count: results.length, results });
  }

  // Category page pagination.
  //
  //   GET /zh/api/rail?category=ai-chat&cursor=<sortOrder>:<name>:<id>&limit=9
  //
  // Returns one page of cards as HTML plus the next cursor. Only an open
  // category page uses this — the homepage rails are a fixed preview.
  if ((pubPath === '/api/rail' || path === '/api/rail') && method === 'GET') {
    const slug = String(url.searchParams.get('category') || '');
    if (!slug) return json({ ok: false, error: 'category required' }, 400);
    const limit = Math.max(1, Math.min(30, Number(url.searchParams.get('limit')) || RAIL_PAGE_SIZE));

    // Cursor is "sortOrder:<name>:<id>"; opaque to the client.
    let after = null;
    const raw = url.searchParams.get('cursor');
    if (raw) {
      const [s, name, i] = String(raw).split(':');
      const sortOrder = Number(s);
      const id = Number(i);
      if (Number.isFinite(sortOrder) && Number.isFinite(id)) {
        after = { sortOrder, name: decodeURIComponent(name || ''), id };
      }
    }

    const category = await getCategoryBySlug(env.DB, slug);
    if (!category) return json({ ok: false, error: 'unknown category' }, 404);

    const { tools, nextCursor } = await listToolsPage(env.DB, { categoryId: category.id, limit, after });
    const localized = localizeTools(tools, lang);
    return json({
      ok: true,
      category: slug,
      html: localized.map((x) => toolCard(x, lang)).join(''),
      count: localized.length,
      nextCursor: nextCursor
        ? `${nextCursor.sortOrder}:${encodeURIComponent(nextCursor.name)}:${nextCursor.id}`
        : null,
    });
  }

  // --------------------------------------------------------------- admin ---
  if (path.startsWith('/admin')) {
    return handleAdmin(request, env, ctx, path, url, theme);
  }

  // ------------------------------------------------------- public routes ---
  //
  // Everything below is a public page and must carry a locale prefix. A
  // request without one is a 404 by design: giving every page exactly one
  // address avoids duplicate content and keeps hreflang honest.
  // A path without a locale prefix still renders, in the default language, so
  // existing bookmarks and bare "/tools/x" links keep working. It is not a
  // canonical address though: canonical points at the /zh version and the page
  // is marked noindex (see head()), so the two addresses never compete.
  const unprefixed = !loc.matched;

  if (pubPath === '/' || pubPath === '/index.html') {
    return withLang(await renderHome(request, env, theme, lang, gaId, pubPath, pageFlags.unprefixed));
  }
  if (pubPath === '/about') {
    const [categories, counts, tools] = await Promise.all([
      loadCategories(env.DB, lang),
      countToolsByCategory(env.DB),
      loadPublished(env.DB, lang),
    ]);
    return withLang(aboutPage({ categories, counts, total: tools.length, theme, lang, gaId, basePath: pubPath,
        ...pageFlags, }));
  }

  // ------------------------------------------------------ submit a tool ---
  if (pubPath === '/submit') {
    if (method === 'GET') {
      const [categories, counts, tools] = await Promise.all([
        loadCategories(env.DB, lang),
        countToolsByCategory(env.DB),
        loadPublished(env.DB, lang),
      ]);
      return withLang(submitPage({ categories, counts, total: tools.length, theme, lang, gaId, basePath: pubPath,
        ...pageFlags, }));
    }
    if (method === 'POST') {
      return withLang(await handleSubmit(request, env, theme, lang, gaId, pubPath, pageFlags.unprefixed));
    }
  }
  if (pubPath === '/submit/thanks') {
    const [categories, counts, tools] = await Promise.all([
      loadCategories(env.DB, lang),
      countToolsByCategory(env.DB),
      loadPublished(env.DB, lang),
    ]);
    return withLang(submitSuccessPage({ categories, counts, total: tools.length, theme, lang, gaId, basePath: pubPath,
        ...pageFlags, }));
  }

  if (pubPath.startsWith('/tools/')) {
    const slug = pubPath.slice(7);
    const tool = await loadToolBySlug(env.DB, lang, slug);
    if (tool && tool.status !== 'draft') {
      const [categories, counts, allTools] = await Promise.all([
        loadCategories(env.DB, lang),
        countToolsByCategory(env.DB),
        loadPublished(env.DB, lang),
      ]);
      const related = allTools
        .filter((x) => x.id !== tool.id && x.category_id === tool.category_id)
        .slice(0, 6);
      const fallback = related.length >= 3 ? related
        : related.concat(allTools.filter((x) => x.id !== tool.id && x.category_id !== tool.category_id)).slice(0, 6);
      return withLang(toolPage({
        tool, categories, counts, related: fallback,
        total: allTools.length, theme, lang, gaId, basePath: pubPath,
        ...pageFlags,
      }));
    }
  }

  // ----------------------------------------------------------------- SEO ---
  // Site-level files, not pages: served at the origin root and also accepted
  // under a locale prefix. They must never depend on the locale.
  if (pubPath === '/sitemap.xml') {
    const [categories, tools] = await Promise.all([
      loadCategories(env.DB, lang),
      loadPublished(env.DB, lang),
    ]);
    return sitemap(categories, tools);
  }
  if (pubPath === '/robots.txt') {
    return new Response(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\nSitemap: https://somarkit.com/sitemap.xml\n`,
      { headers: { 'content-type': 'text/plain; charset=utf-8' } }
    );
  }

  // static assets fall through to bucket binding
  if (env.ASSETS) {
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
  }

  // Legacy: category pages used to live under /c/<slug>. Keep old links and
  // indexed URLs working with a permanent redirect to the locale-root path.
  if (pubPath.startsWith('/c/')) {
    const slug = pubPath.slice(3);
    const category = slug && !slug.includes('/') ? await loadCategoryBySlug(env.DB, lang, slug) : null;
    if (category) {
      const qs = url.search || '';
      return new Response(null, {
        status: 301,
        headers: { Location: `${L(`/${category.slug}`)}${qs}`, 'cache-control': 'public, max-age=86400' },
      });
    }
  }

  // ------------------------------------------------- category (catch-all) ---
  // Category pages live at the locale root (/zh/ai-coding) rather than under a
  // /c/ prefix. This runs last so it can never shadow a real route, an asset,
  // or a tool page — only single-segment paths that match a category slug.
  if (pubPath !== '/' && !pubPath.includes('/', 1)) {
    const slug = pubPath.slice(1);
    const category = await loadCategoryBySlug(env.DB, lang, slug);
    if (category && category.visible) {
      const [categories, counts, allTools, featured] = await Promise.all([
        loadCategories(env.DB, lang),
        countToolsByCategory(env.DB),
        loadPublished(env.DB, lang),
        loadTrending(env.DB, lang),
      ]);
      const tools = allTools.filter((x) => x.category_id === category.id);
      return withLang(categoryPage({
        category, categories, counts, tools, allTools, featured,
        total: allTools.length, catCount: categories.length, theme, lang, gaId,
        basePath: pubPath,
      }));
    }
  }

  const [categories, counts, tools] = await Promise.all([
    loadCategories(env.DB, lang),
    countToolsByCategory(env.DB),
    loadPublished(env.DB, lang),
  ]);
  return withLang(notFoundPage({ categories, counts, total: tools.length, theme, lang, gaId, basePath: pubPath,
        ...pageFlags, }));
}

// --- public render ----------------------------------------------------------

async function renderHome(request, env, theme, lang = DEFAULT_LANG, gaId = '', basePath = '/', unprefixed = false) {
  const [categories, counts, tools, featured] = await Promise.all([
    loadCategories(env.DB, lang),
    countToolsByCategory(env.DB),
    loadPublished(env.DB, lang),
    loadTrending(env.DB, lang),
  ]);

  const res = homePage({
    categories, counts, tools, featured,
    total: tools.length,
    catCount: categories.length,
    theme, lang, gaId, basePath, unprefixed,
  });
  // Cache policy is set centrally in withLang(); only the edge TTL is widened
  // here because the home listing is the hottest page.
  res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=60, must-revalidate');
  res.headers.set('Vary', 'Cookie');
  return res;
}

function sitemap(categories, tools) {
  const base = 'https://somarkit.com';
  const today = new Date().toISOString().slice(0, 10);

  // Every page is listed once per locale, and each entry advertises all of its
  // translations via xhtml:link so search engines tie the pair together
  // instead of treating them as duplicate content.
  const entry = (neutralPath, lastmod, changefreq, priority) => {
    const body = LANGS.map((l) => `  <url>
    <loc>${base}${localePath(l.code, neutralPath)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${LANGS.map((x) => `    <xhtml:link rel="alternate" hreflang="${x.code}" href="${base}${localePath(x.code, neutralPath)}"/>`).join('\n')}
  </url>`);
    return body;
  };

  const urls = [
    ...entry('/', today, 'daily', '1.0'),
    ...entry('/about', today, 'monthly', '0.4'),
    ...categories.flatMap((c) => entry(`/${c.slug}`, today, 'weekly', '0.8')),
    // A tool can opt out of the sitemap, and a noindex page must never be
    // advertised here either.
    ...tools
      .filter((t) => t.in_sitemap !== 0 && t.noindex !== 1)
      .flatMap((t) => entry(`/tools/${t.slug}`, String(t.updated_at).slice(0, 10), 'weekly', '0.6')),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>`,
    { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } }
  );
}

// --- public: submit a tool --------------------------------------------------

async function handleSubmit(request, env, theme, lang, gaId, basePath = '/', unprefixed = false) {
  let form;
  try {
    form = await request.formData();
  } catch {
    form = new FormData();
  }
  const get = (k) => String(form.get(k) || '').trim();

  const values = {
    name: get('name'),
    url: get('url'),
    description: get('description'),
    category_id: get('category_id'),
    tags: get('tags'),
    pricing: get('pricing'),
    submitter_name: get('submitter_name'),
    submitter_email: get('submitter_email'),
    note: get('note'),
  };

  const renderError = async (msg) => {
    const [categories, counts, tools] = await Promise.all([
      loadCategories(env.DB, lang),
      countToolsByCategory(env.DB),
      loadPublished(env.DB, lang),
    ]);
    return submitPage({
      categories, counts, total: tools.length, theme, lang, gaId, basePath, unprefixed,
      error: msg, values,
    });
  };

  const { t } = await import('./lib/i18n.js');

  // Honeypot: bots fill hidden fields, humans do not.
  if (get('website')) return new Response(null, { status: 204 });

  if (!values.name) return renderError(t(lang, 'submit.errName'));

  const url = normalizeUrl(values.url);
  if (!url) return renderError(t(lang, 'submit.errUrl'));

  const categoryId = Number(values.category_id);
  if (!categoryId) return renderError(t(lang, 'submit.errCategory'));

  // Light abuse control: max 5 submissions per IP per hour.
  const ipHash = await hashIp(request, env);
  if (ipHash) {
    const recent = await recentSubmissionCount(env.DB, ipHash, 60);
    if (recent >= 5) return renderError(t(lang, 'submit.errRate'));
  }

  const pricing = ['free', 'freemium', 'paid', 'opensource'].includes(values.pricing)
    ? values.pricing
    : 'freemium';

  try {
    await createSubmission(env.DB, {
      name: values.name.slice(0, 80),
      url,
      description: values.description.slice(0, 300),
      category_id: categoryId,
      tags: normalizeTags(values.tags).join(','),
      pricing,
      submitter_name: values.submitter_name.slice(0, 60),
      submitter_email: values.submitter_email.slice(0, 120),
      note: values.note.slice(0, 800),
      ip_hash: ipHash,
      user_agent: request.headers.get('user-agent') || '',
    });
  } catch (e) {
    console.error('submit failed', e);
    return renderError(t(lang, 'submit.errGeneric'));
  }

  // Stay in the language the form was submitted from: the success page must not
  // drop the visitor back into the default locale.
  return redirect(localePath(lang, '/submit/thanks'));
}

/** Salted SHA-256 of the client IP — privacy-preserving rate-limit key. */
async function hashIp(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || '';
  if (!ip) return '';
  const { sha256Hex } = await import('./lib/crypto.js');
  return sha256Hex(`${env.SESSION_SECRET || 'somarkit'}:${ip}`);
}

// --- admin ------------------------------------------------------------------

function readFlash(url) {
  const ok = url.searchParams.get('ok');
  const err = url.searchParams.get('err');
  if (ok) return { type: 'success', message: ok };
  if (err) return { type: 'error', message: err };
  return null;
}

async function handleAdmin(request, env, ctx, path, url, theme) {
  const method = request.method;

  // Public auth routes -----------------------------------------------------
  if (path === '/admin/login') {
    if (method === 'POST') {
      // Guard against accidental POSTs to the login page.
      return redirect('/admin/login');
    }
    const existing = await currentAdmin(request, env);
    if (existing) return redirect('/admin');
    return html(loginPage({ env, error: url.searchParams.get('err') || '' }));
  }
  if (path === '/admin/login/start') {
    return beginLogin(request, env);
  }
  if (path === '/admin/auth/callback') {
    return completeLogin(request, env);
  }
  if (path === '/admin/logout') {
    return logout(request, env);
  }
  // Development-only bypass. Only active when DEV_LOGIN_EMAIL is explicitly
  // set in a local .dev.vars file — never present in production secrets.
  if (path === '/admin/dev-login' && env.DEV_LOGIN_EMAIL) {
    const email = env.DEV_LOGIN_EMAIL.toLowerCase();
    let admin = await findAdminByEmail(env.DB, email);
    if (!admin) {
      await env.DB.prepare(
        "INSERT INTO admins (email, name, role, active) VALUES (?, 'Dev User', 'owner', 1)"
      ).bind(email).run();
      admin = await findAdminByEmail(env.DB, email);
    }
    const token = await sign(
      JSON.stringify({ sub: admin.id, email: admin.email, name: admin.name, role: admin.role, iat: Date.now() }),
      env.SESSION_SECRET || 'dev-secret'
    );
    const res = redirect('/admin');
    res.headers.append('Set-Cookie', secureIfHttps(request, setCookie(SESSION_COOKIE, token, { maxAge: 3600, path: '/' })));
    return res;
  }

  // Everything below requires a session ------------------------------------
  const user = await currentAdmin(request, env);
  if (!user) {
    if (path === '/admin' && method === 'GET') return redirect('/admin/login');
    return redirect('/admin/login');
  }

  // ------------------------------------------------------------ uploads ---
  // Image upload endpoint used by the logo field and the Markdown editor.
  // Requires an admin session (checked above); returns JSON.
  if (path === '/admin/api/upload' && method === 'POST') {
    try {
      const form = await request.formData();
      const file = form.get('file');
      const kind = String(form.get('kind') || 'logo');
      const slug = String(form.get('slug') || '');
      const result = await storeUpload(env, { file, kind, slug });
      if (!result.ok) return json({ ok: false, error: result.error }, 400);
      await logAudit(env.DB, user.email, 'media.upload', 'media', null, `${kind}: ${result.key}`);
      return json({ ok: true, key: result.key, url: result.url, bytes: result.bytes });
    } catch (err) {
      return json({ ok: false, error: String(err && err.message || err) }, 500);
    }
  }

  // Markdown preview for the editor. It runs the SAME renderer the public site
  // uses, so what the author sees while typing is exactly what visitors get —
  // the old client-side preview only handled headings and lists.
  if (path === '/admin/api/render' && method === 'POST') {
    try {
      const body = await request.json();
      const md = String((body && body.md) || '');
      // Guard against accidental huge payloads (the editor autosaves locally).
      if (md.length > 200_000) return json({ ok: false, error: '内容过长' }, 413);
      return json({ ok: true, html: renderMarkdown(md) });
    } catch (err) {
      return json({ ok: false, error: String(err && err.message || err) }, 400);
    }
  }

  // ---------------------------------------------------------------- GET ---
  if (method === 'GET') {
    return adminGet(env, ctx, request, path, url, user);
  }

  // --------------------------------------------------------------- POST ---
  if (method === 'POST') {
    return adminPost(env, ctx, request, path, url, user);
  }

  return new Response('Method Not Allowed', { status: 405 });
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** Rows per page for the admin tables; clamped so a crafted URL can't ask for 100k. */
const PER_PAGE_OPTIONS = [10, 20, 50, 100];
function parsePerPage(url, fallback = 20) {
  const n = Number(url.searchParams.get('perPage'));
  return PER_PAGE_OPTIONS.includes(n) ? n : fallback;
}

async function adminGet(env, ctx, request, path, url, user) {
  const flash = readFlash(url);

  if (path === '/admin') {
    // Dashboard cards: 最近更新 shows the latest 10 edits, 访问排行 the top 10.
    const [stats, top, recent, categories, audit] = await Promise.all([
      dashboardStats(env.DB),
      topTools(env.DB, 10),
      listToolsAdmin(env.DB, { perPage: 10 }).then((r) => r.tools),
      listCategories(env.DB, { includeHidden: true }),
      listAudit(env.DB, 8),
    ]);
    return html(dashboardPage({ user, env, stats, top, recent, categories, audit }));
  }

  // tools
  if (path === '/admin/tools') {
    const q = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || '';
    const status = url.searchParams.get('status') || '';
    const sort = url.searchParams.get('sort') || 'updated';
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const perPage = parsePerPage(url);
    const [data, categories] = await Promise.all([
      listToolsAdmin(env.DB, { q, category, status, sort, page, perPage }),
      listCategories(env.DB, { includeHidden: true }),
    ]);
    const pages = Math.max(1, Math.ceil(data.total / perPage));
    return html(toolsPage({
      user, env, tools: data.tools, total: data.total, page, perPage, pages,
      q, category, status, sort, categories, flash,
    }));
  }

  if (path === '/admin/tools/new') {
    const categories = await listCategories(env.DB, { includeHidden: true });
    return html(toolFormPage({ user, env, tool: null, categories, flash, isNew: true }));
  }

  let m = path.match(/^\/admin\/tools\/(\d+)\/edit$/);
  if (m) {
    const [tool, categories] = await Promise.all([
      getTool(env.DB, Number(m[1])),
      listCategories(env.DB, { includeHidden: true }),
    ]);
    if (!tool) return redirect('/admin/tools?err=' + encodeURIComponent('工具不存在'));
    return html(toolFormPage({ user, env, tool, categories, flash, isNew: false }));
  }

  // categories
  if (path === '/admin/categories') {
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const perPage = parsePerPage(url);
    const [data, counts] = await Promise.all([
      listCategoriesPage(env.DB, { includeHidden: true, page, perPage }),
      countToolsByCategory(env.DB, { includeUnpublished: true }),
    ]);
    const pages = Math.max(1, Math.ceil(data.total / perPage));
    return html(categoriesPage({
      user, env, categories: data.categories, counts, total: data.total,
      page, perPage, pages, flash,
    }));
  }
  if (path === '/admin/categories/new') {
    return html(categoryFormPage({
      user, env, category: null, icons: Object.keys(ICONS), flash, isNew: true,
    }));
  }
  m = path.match(/^\/admin\/categories\/(\d+)\/edit$/);
  if (m) {
    const category = await getCategory(env.DB, Number(m[1]));
    if (!category) return redirect('/admin/categories?err=' + encodeURIComponent('分类不存在'));
    return html(categoryFormPage({
      user, env, category, icons: Object.keys(ICONS), flash, isNew: false,
    }));
  }

  // submissions
  if (path === '/admin/submissions') {
    const status = url.searchParams.get('status') || '';
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const perPage = parsePerPage(url);
    const [data, counts] = await Promise.all([
      listSubmissionsAdmin(env.DB, { status, page, perPage }),
      countSubmissionsByStatus(env.DB),
    ]);
    const pages = Math.max(1, Math.ceil(data.total / perPage));
    return html(submissionsPage({
      user, env, submissions: data.submissions, total: data.total,
      page, perPage, pages, status, counts, flash,
    }));
  }
  let subMatch = path.match(/^\/admin\/submissions\/(\d+)$/);
  if (subMatch) {
    const s = await getSubmission(env.DB, Number(subMatch[1]));
    if (!s) return redirect('/admin/submissions?err=' + encodeURIComponent('提交记录不存在'));
    const cat = s.category_id ? await getCategory(env.DB, s.category_id) : null;
    return html(submissionDetailPage({
      user, env, s: { ...s, category_name: cat ? cat.name : '' }, flash,
    }));
  }

  // analytics — click statistics dashboard
  if (path === '/admin/analytics') {
    const days = [7, 30, 90].includes(Number(url.searchParams.get('days')))
      ? Number(url.searchParams.get('days'))
      : 30;
    const [data, ga] = await Promise.all([
      analyticsSummary(env.DB, { days }),
      gaDailySeries(env, { days }),
    ]);
    return html(analyticsPage({
      user, env, data, days, flash, ga,
      gaConfigured: isGaConfigured(env),
    }));
  }

  // audit
  if (path === '/admin/audit') {
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const perPage = parsePerPage(url);
    const actor = url.searchParams.get('actor') || '';
    const data = await listAuditPage(env.DB, { page, perPage, actor });
    const pages = Math.max(1, Math.ceil(data.total / perPage));
    return html(auditPage({
      user, env, entries: data.entries, total: data.total,
      page, perPage, pages, actor, flash,
    }));
  }

  // admins
  if (path === '/admin/admins') {
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const perPage = parsePerPage(url);
    const data = await listAdminsPage(env.DB, { page, perPage });
    const pages = Math.max(1, Math.ceil(data.total / perPage));
    return html(adminsPage({
      user, env, admins: data.admins, allowList: adminAllowList(env),
      total: data.total, page, perPage, pages, flash,
    }));
  }

  return redirect('/admin?err=' + encodeURIComponent('页面不存在'));
}

async function adminPost(env, ctx, request, path, url, user) {
  const type = request.headers.get('content-type') || '';
  const wantsJson = type.includes('application/json');
  let body = null;
  const getBody = async () => {
    if (body) return body;
    if (wantsJson) body = await request.json();
    else {
      const fd = await request.formData();
      body = {};
      for (const [k, v] of fd.entries()) {
        if (typeof v === 'string') body[k] = v;
        else body[k] = v; // File
      }
    }
    return body;
  };

  // tools ---------------------------------------------------------------
  if (path === '/admin/tools') {
    const b = await getBody();
    try {
      const name = String(b.name || '').trim();
      const rawUrl = String(b.url || '').trim();
      if (!name) throw new Error('工具名称不能为空');
      const url2 = normalizeUrl(rawUrl);
      if (!url2) throw new Error('官网链接格式不正确');
      let slug = slugify(b.slug || name);
      const clash = await env.DB.prepare('SELECT id FROM tools WHERE slug = ?').bind(slug).first();
      if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

      const id = await createTool(env.DB, {
        slug, name, url: url2,
        description: String(b.description || '').trim(),
        category_id: b.category_id ? Number(b.category_id) : null,
        tags: normalizeTags(b.tags),
        pricing: b.pricing || 'free',
        logo_url: normalizeLogo(b.logo_url),
        is_hot: b.is_hot === '1' || b.is_hot === 'on' || b.is_hot === true,
        is_new: b.is_new === '1' || b.is_new === 'on' || b.is_new === true,
        is_featured: b.is_featured === '1' || b.is_featured === 'on' || b.is_featured === true,
        nofollow: b.nofollow === '1' || b.nofollow === 'on' || b.nofollow === true,
        noindex: b.noindex === '1' || b.noindex === 'on' || b.noindex === true,
        in_sitemap: b.in_sitemap === '1' || b.in_sitemap === 'on' || b.in_sitemap === true,
        status: b.status || 'published',
        sort_order: Number(b.sort_order) || 0,
        review_md: String(b.review_md || ''),
        ...readLocalizedFields(b),
        source: 'admin',
      });
      await logAudit(env.DB, user.email, 'tool.create', 'tool', id, name);
      return redirect(`/admin/tools?ok=${encodeURIComponent(`已创建「${name}」`)}`);
    } catch (e) {
      return redirect(`/admin/tools/new?err=${encodeURIComponent(e.message)}`);
    }
  }

  let m = path.match(/^\/admin\/tools\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    const b = await getBody();
    try {
      const cur = await getTool(env.DB, id);
      if (!cur) throw new Error('工具不存在');
      const name = String(b.name || '').trim();
      if (!name) throw new Error('工具名称不能为空');
      const url2 = normalizeUrl(String(b.url || '').trim());
      if (!url2) throw new Error('官网链接格式不正确');

      let slug = slugify(b.slug || cur.slug || name);
      if (slug !== cur.slug) {
        const clash = await env.DB.prepare('SELECT id FROM tools WHERE slug = ? AND id != ?').bind(slug, id).first();
        if (clash) slug = `${slug}-${id}`;
      }

      await updateTool(env.DB, id, {
        slug, name, url: url2,
        description: String(b.description || '').trim(),
        category_id: b.category_id ? Number(b.category_id) : null,
        tags: normalizeTags(b.tags),
        pricing: b.pricing || 'free',
        logo_url: normalizeLogo(b.logo_url),
        is_hot: b.is_hot === '1' || b.is_hot === 'on' || b.is_hot === true,
        is_new: b.is_new === '1' || b.is_new === 'on' || b.is_new === true,
        is_featured: b.is_featured === '1' || b.is_featured === 'on' || b.is_featured === true,
        nofollow: b.nofollow === '1' || b.nofollow === 'on' || b.nofollow === true,
        noindex: b.noindex === '1' || b.noindex === 'on' || b.noindex === true,
        in_sitemap: b.in_sitemap === '1' || b.in_sitemap === 'on' || b.in_sitemap === true,
        status: b.status || 'published',
        sort_order: Number(b.sort_order) || 0,
        review_md: String(b.review_md || ''),
        ...readLocalizedFields(b),
      });
      await logAudit(env.DB, user.email, 'tool.update', 'tool', id, name);
      return redirect(`/admin/tools/${id}/edit?ok=${encodeURIComponent('已保存')}`);
    } catch (e) {
      return redirect(`/admin/tools/${id}/edit?err=${encodeURIComponent(e.message)}`);
    }
  }

  m = path.match(/^\/admin\/tools\/(\d+)\/delete$/);
  if (m) {
    const id = Number(m[1]);
    const t = await getTool(env.DB, id);
    await deleteTool(env.DB, id);
    await logAudit(env.DB, user.email, 'tool.delete', 'tool', id, t ? t.name : '');
    return redirect(`/admin/tools?ok=${encodeURIComponent('已删除')}`);
  }

  // categories ----------------------------------------------------------
  if (path === '/admin/categories') {
    const b = await getBody();
    try {
      const name = String(b.name || '').trim();
      if (!name) throw new Error('分类名称不能为空');
      let slug = slugify(b.slug || name);
      const clash = await env.DB.prepare('SELECT id FROM categories WHERE slug = ?').bind(slug).first();
      if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      const id = await createCategory(env.DB, {
        slug, name,
        icon: b.icon || 'grid',
        description: String(b.description || ''),
        ...readLocalizedCategoryFields(b),
        sort_order: Number(b.sort_order) || 0,
        visible: b.visible === '1' || b.visible === 'on' || b.visible === true,
      });
      await logAudit(env.DB, user.email, 'category.create', 'category', id, name);
      return redirect(`/admin/categories?ok=${encodeURIComponent(`已创建分类「${name}」`)}`);
    } catch (e) {
      return redirect(`/admin/categories/new?err=${encodeURIComponent(e.message)}`);
    }
  }

  m = path.match(/^\/admin\/categories\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    const b = await getBody();
    try {
      const cur = await getCategory(env.DB, id);
      if (!cur) throw new Error('分类不存在');
      const name = String(b.name || '').trim();
      if (!name) throw new Error('分类名称不能为空');
      let slug = slugify(b.slug || cur.slug || name);
      if (slug !== cur.slug) {
        const clash = await env.DB.prepare('SELECT id FROM categories WHERE slug = ? AND id != ?').bind(slug, id).first();
        if (clash) slug = `${slug}-${id}`;
      }
      await updateCategory(env.DB, id, {
        slug, name,
        icon: b.icon || 'grid',
        description: String(b.description || ''),
        ...readLocalizedCategoryFields(b),
        sort_order: Number(b.sort_order) || 0,
        visible: b.visible === '1' || b.visible === 'on' || b.visible === true,
      });
      await logAudit(env.DB, user.email, 'category.update', 'category', id, name);
      return redirect(`/admin/categories?ok=${encodeURIComponent('已保存')}`);
    } catch (e) {
      return redirect(`/admin/categories/${id}/edit?err=${encodeURIComponent(e.message)}`);
    }
  }

  m = path.match(/^\/admin\/categories\/(\d+)\/delete$/);
  if (m) {
    const id = Number(m[1]);
    const c = await getCategory(env.DB, id);
    await deleteCategory(env.DB, id);
    await logAudit(env.DB, user.email, 'category.delete', 'category', id, c ? c.name : '');
    return redirect(`/admin/categories?ok=${encodeURIComponent('已删除')}`);
  }

  // submissions ---------------------------------------------------------
  let subPost = path.match(/^\/admin\/submissions\/(\d+)\/(approve|reject|delete)$/);
  if (subPost) {
    const id = Number(subPost[1]);
    const action = subPost[2];
    const s = await getSubmission(env.DB, id);
    if (!s) {
      return redirect(`/admin/submissions?err=${encodeURIComponent('提交记录不存在')}`);
    }

    if (action === 'approve') {
      const { toolId, existed } = await approveSubmission(env.DB, s, user.email);
      await logAudit(env.DB, user.email, 'submission.approve', 'submission', id,
        `${s.name} → tool#${toolId}${existed ? '（已存在）' : ''}`);
      return redirect(
        `/admin/submissions?ok=${encodeURIComponent(existed ? `「${s.name}」已存在，已关联` : `已收录「${s.name}」`)}`
      );
    }

    if (action === 'reject') {
      let reason = '';
      try {
        if (type.includes('form') || type.includes('json')) {
          const b = await getBody();
          reason = String(b.reason || '').slice(0, 200);
        }
      } catch { /* body optional */ }
      await rejectSubmission(env.DB, id, user.email, reason);
      await logAudit(env.DB, user.email, 'submission.reject', 'submission', id, s.name);
      return redirect(`/admin/submissions?ok=${encodeURIComponent('已拒绝')}`);
    }

    // delete
    await deleteSubmission(env.DB, id);
    await logAudit(env.DB, user.email, 'submission.delete', 'submission', id, s.name);
    return redirect(`/admin/submissions?ok=${encodeURIComponent('已删除提交记录')}`);
  }

  // audit ---------------------------------------------------------------
  if (path === '/admin/audit/clear') {
    await deleteAuditLog(env.DB);
    await logAudit(env.DB, user.email, 'audit.clear', 'audit', null, '');
    return redirect(`/admin/audit?ok=${encodeURIComponent('日志已清空')}`);
  }

  // admins --------------------------------------------------------------
  m = path.match(/^\/admin\/admins\/(\d+)\/toggle$/);
  if (m) {
    const id = Number(m[1]);
    const row = await env.DB.prepare('SELECT * FROM admins WHERE id = ?').bind(id).first();
    if (row) {
      if (row.email === user.email) {
        return redirect(`/admin/admins?err=${encodeURIComponent('不能停用当前登录账号')}`);
      }
      await setAdminActive(env.DB, id, !row.active);
      await logAudit(env.DB, user.email, 'admin.toggle', 'admin', id, `${row.email} → ${row.active ? '停用' : '启用'}`);
    }
    return redirect(`/admin/admins?ok=${encodeURIComponent('已更新')}`);
  }

  m = path.match(/^\/admin\/admins\/(\d+)\/delete$/);
  if (m) {
    const id = Number(m[1]);
    const row = await env.DB.prepare('SELECT * FROM admins WHERE id = ?').bind(id).first();
    if (row) {
      if (row.email === user.email) {
        return redirect(`/admin/admins?err=${encodeURIComponent('不能删除当前登录账号')}`);
      }
      await env.DB.prepare('DELETE FROM admins WHERE id = ?').bind(id).run();
      await logAudit(env.DB, user.email, 'admin.delete', 'admin', id, row.email);
    }
    return redirect(`/admin/admins?ok=${encodeURIComponent('已删除')}`);
  }

  return redirect(`/admin?err=${encodeURIComponent('未知操作')}`);
}

// --- helpers ----------------------------------------------------------------

function normalizeUrl(raw) {
  if (!raw) return null;
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    if (!parsed.hostname.includes('.')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeTags(raw) {
  if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean).slice(0, 8);
  return String(raw || '')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeLogo(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return '';
}

/**
 * Collect the per-language columns of a tool from a submitted form body.
 *
 * The first language is stored in the bare column (`name`, `description`,
 * `tags`, `review_md`); every other language uses `<field>_<code>`. Reading
 * them from LANGS means adding a locale needs no change here — the form simply
 * has more inputs.
 *
 * @param {object} body parsed form body (plain object of string values)
 * @returns {object} e.g. { name_en: '…', description_en: '…', … }
 */
function readLocalizedFields(body) {
  const out = {};
  LANGS.forEach((l, i) => {
    if (i === 0) return; // first language lives in the bare columns
    const code = l.code;
    out[`name_${code}`] = String(body[`name_${code}`] || '').trim();
    out[`description_${code}`] = String(body[`description_${code}`] || '').trim();
    out[`tags_${code}`] = String(body[`tags_${code}`] || '').trim();
    out[`review_md_${code}`] = String(body[`review_md_${code}`] || '');
  });
  return out;
}

/**
 * Same idea for categories: `name_<code>` / `description_<code>` for every
 * locale after the first. Kept separate because categories have no tags or
 * review body.
 */
function readLocalizedCategoryFields(body) {
  const out = {};
  LANGS.forEach((l, i) => {
    if (i === 0) return;
    const code = l.code;
    out[`name_${code}`] = String(body[`name_${code}`] || '').trim();
    out[`description_${code}`] = String(body[`description_${code}`] || '').trim();
  });
  return out;
}
