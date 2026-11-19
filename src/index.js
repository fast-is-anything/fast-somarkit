// -----------------------------------------------------------------------------
// SoMarkIt — Cloudflare Worker entry point
// -----------------------------------------------------------------------------

import { esc, json, redirect, getCookie, setCookie, sign, secureIfHttps } from './lib/crypto.js';
import {
  listCategories, listCategoriesPage, countToolsByCategory, listPublishedTools, listFeaturedTools, listTrendingTools,
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
import { homePage, toolPage, categoryPage, aboutPage, notFoundPage, submitPage, submitSuccessPage } from './templates/public.js';
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
import { normalizeLang, LANG_COOKIE } from './lib/i18n.js';

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
// The public site is bilingual: every query that feeds a public template is
// wrapped here so the templates receive already-localised content. Keeping the
// translation at the data boundary (rather than sprinkling `x_en || x` through
// the templates) means a new template automatically gets the right language.
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

  // Language: an explicit ?lang= wins (and is persisted in a cookie); otherwise
  // the stored cookie, otherwise Chinese.
  //
  // Deliberately NOT derived from Accept-Language: Googlebot sends
  // `Accept-Language: en`, so guessing would make the crawler index the English
  // rendering of every Chinese URL. The Chinese site is the canonical one;
  // English lives at `?lang=en` and is advertised through hreflang.
  const explicitLang = url.searchParams.get('lang');
  const lang = normalizeLang(explicitLang || getCookie(request, LANG_COOKIE) || 'zh');
  const setLangCookie = explicitLang
    ? setCookie(LANG_COOKIE, lang, { maxAge: 60 * 60 * 24 * 365, httpOnly: false, secure: false })
    : null;
  /**
   * Attach the language cookie (if the user just switched) and an explicit
   * cache policy. Without a Cache-Control header browsers apply *heuristic*
   * caching and may keep serving a stale page long after a deploy — so every
   * public HTML response must state its policy explicitly.
   */
  const withLang = (res) => {
    if (setLangCookie) res.headers.append('Set-Cookie', setLangCookie);
    if (!res.headers.has('Cache-Control')) {
      // `s-maxage` keeps Cloudflare's edge copy short; `must-revalidate`
      // stops the browser from reusing it without asking.
      res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=60, must-revalidate');
    }
    res.headers.set('Vary', 'Cookie');
    return res;
  };

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

  if (path === '/api/search' && method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const tools = await loadPublished(env.DB, lang);
    // Match BOTH languages regardless of the visitor's language: someone on the
    // English site may still search for a Chinese tool name (and vice versa).
    // The haystack is built from the raw row so the Chinese original stays
    // searchable even when an English translation is shown.
    const haystack = (t) => [
      t.name, t.name_en, t.description, t.description_en,
      t.tags.join(' '), t.tags_en, t.category_name,
    ].filter(Boolean).join(' ').toLowerCase();
    const results = (q ? tools.filter((t) => haystack(t).includes(q)) : tools)
      .slice(0, 30).map((t) => ({
        id: t.id, name: t.name, slug: t.slug, url: t.url,
        description: t.description, category: t.category_name, pricing: t.pricing,
      }));
    return json({ query: q, count: results.length, results });
  }

  // --------------------------------------------------------------- admin ---
  if (path.startsWith('/admin')) {
    return handleAdmin(request, env, ctx, path, url, theme);
  }

  // ------------------------------------------------------- public routes ---
  if (path === '/' || path === '/index.html') {
    return withLang(await renderHome(request, env, theme, lang, gaId));
  }
  if (path === '/about') {
    const [categories, counts, tools] = await Promise.all([
      loadCategories(env.DB, lang),
      countToolsByCategory(env.DB),
      loadPublished(env.DB, lang),
    ]);
    return withLang(aboutPage({ categories, counts, total: tools.length, theme, lang, gaId }));
  }

  // ------------------------------------------------------ submit a tool ---
  if (path === '/submit') {
    if (method === 'GET') {
      const [categories, counts, tools] = await Promise.all([
        loadCategories(env.DB, lang),
        countToolsByCategory(env.DB),
        loadPublished(env.DB, lang),
      ]);
      return withLang(submitPage({ categories, counts, total: tools.length, theme, lang, gaId }));
    }
    if (method === 'POST') {
      return withLang(await handleSubmit(request, env, theme, lang, gaId));
    }
  }
  if (path === '/submit/thanks') {
    const [categories, counts, tools] = await Promise.all([
      loadCategories(env.DB, lang),
      countToolsByCategory(env.DB),
      loadPublished(env.DB, lang),
    ]);
    return withLang(submitSuccessPage({ categories, counts, total: tools.length, theme, lang, gaId }));
  }

  if (path.startsWith('/tools/')) {
    const slug = path.slice(7);
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
        total: allTools.length, theme, lang, gaId,
      }));
    }
  }

  // ----------------------------------------------------------------- SEO ---
  if (path === '/sitemap.xml') {
    const [categories, tools] = await Promise.all([
      loadCategories(env.DB, lang),
      loadPublished(env.DB, lang),
    ]);
    return sitemap(categories, tools);
  }
  if (path === '/robots.txt') {
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
  // indexed URLs working with a permanent redirect to the root-level path.
  if (path.startsWith('/c/')) {
    const slug = path.slice(3);
    const category = slug && !slug.includes('/') ? await loadCategoryBySlug(env.DB, lang, slug) : null;
    if (category) {
      const qs = url.search || '';
      return new Response(null, {
        status: 301,
        headers: { Location: `/${category.slug}${qs}`, 'cache-control': 'public, max-age=86400' },
      });
    }
  }

  // ------------------------------------------------- category (catch-all) ---
  // Category pages live at the site root (/ai-coding) rather than under a /c/
  // prefix. This runs last so it can never shadow a real route, an asset, or
  // a tool page — only single-segment paths that match a category slug.
  if (path !== '/' && !path.includes('/', 1)) {
    const slug = path.slice(1);
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
        total: allTools.length, catCount: categories.length, theme, lang,
      }));
    }
  }

  const [categories, counts, tools] = await Promise.all([
    loadCategories(env.DB, lang),
    countToolsByCategory(env.DB),
    loadPublished(env.DB, lang),
  ]);
  return withLang(notFoundPage({ categories, counts, total: tools.length, theme, lang, gaId }));
}

// --- public render ----------------------------------------------------------

async function renderHome(request, env, theme, lang = 'zh', gaId = '') {
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
    theme, lang, gaId,
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
  const urls = [
    `<url><loc>${base}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${base}/about</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.4</priority></url>`,
    ...categories.map((c) =>
      `<url><loc>${base}/${c.slug}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`),
    // A tool can be excluded from the sitemap on its own, and a noindex page
    // must never be advertised in the sitemap either.
    ...tools.filter((t) => t.in_sitemap !== 0 && t.noindex !== 1).map((t) =>
      `<url><loc>${base}/tools/${t.slug}</loc><lastmod>${String(t.updated_at).slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`,
    { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } }
  );
}

// --- public: submit a tool --------------------------------------------------

async function handleSubmit(request, env, theme, lang, gaId) {
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
      categories, counts, total: tools.length, theme, lang, gaId,
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

  return redirect('/submit/thanks');
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
        name_en: String(b.name_en || '').trim(),
        description_en: String(b.description_en || '').trim(),
        tags_en: String(b.tags_en || '').trim(),
        review_md: String(b.review_md || ''),
        review_md_en: String(b.review_md_en || ''),
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
        name_en: String(b.name_en || '').trim(),
        description_en: String(b.description_en || '').trim(),
        tags_en: String(b.tags_en || '').trim(),
        review_md: String(b.review_md || ''),
        review_md_en: String(b.review_md_en || ''),
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
        name_en: String(b.name_en || ''),
        icon: b.icon || 'grid',
        description: String(b.description || ''),
        description_en: String(b.description_en || ''),
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
        name_en: String(b.name_en || ''),
        icon: b.icon || 'grid',
        description: String(b.description || ''),
        description_en: String(b.description_en || ''),
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
