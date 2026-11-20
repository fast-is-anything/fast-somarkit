// -----------------------------------------------------------------------------
// Data access layer (D1)
// -----------------------------------------------------------------------------

import { LANGS } from './i18n.js';

/**
 * Translational columns for tools, derived from LANGS.
 *
 * The first language uses the bare columns (`name`, `description`, `tags`,
 * `review_md`); every subsequent locale adds `<field>_<code>`. Generating them
 * here means the INSERT/UPDATE statements and their bind lists stay in sync with
 * the locale list — adding a language only needs the migration that creates the
 * columns.
 */
const TOOL_I18N_FIELDS = ['name', 'description', 'tags', 'review_md'];

/** Column names for every locale after the first, in LANGS order. */
const TOOL_I18N_COLUMNS = LANGS.slice(1).flatMap((l) =>
  TOOL_I18N_FIELDS.map((f) => `${f}_${l.code}`)
);

/** Same for categories, which only carry a name and a description. */
const CATEGORY_I18N_COLUMNS = LANGS.slice(1).flatMap((l) =>
  ['name', 'description'].map((f) => `${f}_${l.code}`)
);

/** Blank placeholder list of the right length: "?, ?, ?" */
const placeholders = (n) => Array.from({ length: n }, () => '?').join(', ');

export const PRICING = {
  free: '免费',
  freemium: '免费增值',
  paid: '付费',
  opensource: '开源',
};

export const TOOL_STATUS = {
  published: '已发布',
  draft: '草稿',
  archived: '已归档',
};

const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

export function slugify(input) {
  const base = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `tool-${Date.now().toString(36)}`;
}

function rowToTool(r) {
  if (!r) return null;
  return {
    ...r,
    isHot: !!r.is_hot,
    isNew: !!r.is_new,
    isFeatured: !!r.is_featured,
    tags: r.tags ? String(r.tags).split(',').map((s) => s.trim()).filter(Boolean) : [],
  };
}

// --- categories -------------------------------------------------------------

export async function listCategories(db, { includeHidden = false } = {}) {
  const sql = includeHidden
    ? 'SELECT * FROM categories ORDER BY sort_order, id'
    : 'SELECT * FROM categories WHERE visible = 1 ORDER BY sort_order, id';
  const { results } = await db.prepare(sql).all();
  return results || [];
}

/** Paginated category list for the /admin/categories table. */
export async function listCategoriesPage(db, { includeHidden = true, page = 1, perPage = 20 } = {}) {
  const where = includeHidden ? '' : 'WHERE visible = 1';
  const countRow = await db.prepare(`SELECT COUNT(*) AS n FROM categories ${where}`).first();
  const total = countRow?.n || 0;
  const offset = (Math.max(1, page) - 1) * perPage;
  const { results } = await db
    .prepare(`SELECT * FROM categories ${where} ORDER BY sort_order, id LIMIT ? OFFSET ?`)
    .bind(perPage, offset)
    .all();
  return { categories: results || [], total, page, perPage };
}

export async function getCategoryBySlug(db, slug) {
  return db.prepare('SELECT * FROM categories WHERE slug = ?').bind(slug).first();
}

export async function getCategory(db, id) {
  return db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first();
}

export async function createCategory(db, data) {
  // Base columns + one block per locale after the first, mirroring tools.
  const baseCols = ['slug', 'name', 'icon', 'description', 'sort_order', 'visible', 'updated_at'];
  const cols = [...baseCols, ...CATEGORY_I18N_COLUMNS];
  const baseBinds = [
    data.slug,
    data.name,
    data.icon || 'grid',
    data.description || '',
    Number(data.sort_order) || 0,
    data.visible ? 1 : 0,
    now(),
  ];
  const i18nBinds = CATEGORY_I18N_COLUMNS.map((col) => data[col] || '');

  const { meta } = await db
    .prepare(
      `INSERT INTO categories (${cols.join(', ')})
       VALUES (${placeholders(cols.length)})`
    )
    .bind(...baseBinds, ...i18nBinds)
    .run();
  return meta.last_row_id;
}

export async function updateCategory(db, id, data) {
  const setCols = [
    'slug=?', 'name=?', 'icon=?', 'description=?', 'sort_order=?', 'visible=?',
    ...CATEGORY_I18N_COLUMNS.map((c) => `${c}=?`),
    'updated_at=?',
  ];
  const baseBinds = [
    data.slug,
    data.name,
    data.icon || 'grid',
    data.description || '',
    Number(data.sort_order) || 0,
    data.visible ? 1 : 0,
  ];
  const i18nBinds = CATEGORY_I18N_COLUMNS.map((col) => data[col] || '');

  await db
    .prepare(`UPDATE categories SET ${setCols.join(', ')} WHERE id=?`)
    .bind(...baseBinds, ...i18nBinds, now(), id)
    .run();
}

export async function deleteCategory(db, id) {
  await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
}

// --- tools ------------------------------------------------------------------

export async function countToolsByCategory(db, { includeUnpublished = false } = {}) {
  const sql = includeUnpublished
    ? 'SELECT category_id, COUNT(*) AS n FROM tools GROUP BY category_id'
    : "SELECT category_id, COUNT(*) AS n FROM tools WHERE status = 'published' GROUP BY category_id";
  const { results } = await db.prepare(sql).all();
  const map = {};
  for (const r of results || []) map[r.category_id] = r.n;
  return map;
}

export async function listPublishedTools(db) {
  const { results } = await db
    .prepare(
      `SELECT t.*, c.name AS category_name, c.slug AS category_slug
       FROM tools t LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.status = 'published'
       ORDER BY c.sort_order, t.sort_order, t.name`
    )
    .all();
  return (results || []).map(rowToTool);
}

/**
 * One page of published tools for a category page's infinite scroll.
 *
 * Keyset pagination on (sort_order, name, id) rather than OFFSET: the cursor
 * stays correct when rows are inserted or re-sorted between requests, and the
 * query cost does not grow with the page number. The ordering matches what the
 * server-rendered first page used, so page 2 continues exactly where it stopped.
 *
 * @param {object} opts
 *   categoryId  restrict to one category
 *   limit       page size
 *   after       cursor from a previous call: { sortOrder, name, id }
 * @returns {{ tools: object[], nextCursor: object|null }}
 */
export async function listToolsPage(db, { categoryId = null, limit = 9, after = null } = {}) {
  const size = Math.max(1, Math.min(60, Number(limit) || 9));
  const where = ["t.status = 'published'"];
  const binds = [];

  if (categoryId != null) {
    where.push('t.category_id = ?');
    binds.push(categoryId);
  }
  if (after && Number.isFinite(after.sortOrder) && after.id != null) {
    // Strictly "after" the cursor in (sort_order, name, id) order. The name
    // comparison mirrors SQLite's default BINARY collation on the same text.
    where.push(
      `(t.sort_order > ?
        OR (t.sort_order = ? AND t.name > ?)
        OR (t.sort_order = ? AND t.name = ? AND t.id > ?))`
    );
    binds.push(
      after.sortOrder,
      after.sortOrder, after.name ?? '',
      after.sortOrder, after.name ?? '', after.id
    );
  }

  // Fetch one extra row to learn whether another page exists.
  const { results } = await db
    .prepare(
      `SELECT t.*, c.name AS category_name, c.slug AS category_slug
       FROM tools t LEFT JOIN categories c ON c.id = t.category_id
       WHERE ${where.join(' AND ')}
       ORDER BY t.sort_order, t.name, t.id
       LIMIT ?`
    )
    .bind(...binds, size + 1)
    .all();

  const rows = results || [];
  const hasMore = rows.length > size;
  const page = hasMore ? rows.slice(0, size) : rows;
  const last = page[page.length - 1];

  return {
    tools: page.map(rowToTool),
    nextCursor: hasMore && last
      ? { sortOrder: Number(last.sort_order) || 0, name: String(last.name ?? ''), id: last.id }
      : null,
  };
}

/** Number of published tools per category (for the "全部" buttons). */
export async function countPublishedByCategory(db) {
  const { results } = await db
    .prepare("SELECT category_id, COUNT(*) AS n FROM tools WHERE status = 'published' GROUP BY category_id")
    .all();
  const map = {};
  for (const r of results || []) map[r.category_id] = r.n;
  return map;
}

export async function listFeaturedTools(db, limit = 6) {
  const { results } = await db
    .prepare(
      `SELECT * FROM tools
       WHERE status = 'published' AND (is_featured = 1 OR is_hot = 1)
       ORDER BY is_featured DESC, is_hot DESC, sort_order, id
       LIMIT ?`
    )
    .bind(limit)
    .all();
  return (results || []).map(rowToTool);
}

/**
 * Home-page "trending" rail: the most-clicked published tools over the last
 * `days` days, straight from click_events (not the visit_count cache, so the
 * window is real).
 *
 * Falls back to the editorial featured list when there are not enough clicks
 * yet — a brand-new site must not render an empty hero.
 */
export async function listTrendingTools(db, { limit = 2, days = 30 } = {}) {
  const since = `-${Math.max(1, days - 1)} days`;
  const { results } = await db
    .prepare(
      `SELECT t.*, c.name AS category_name, c.slug AS category_slug,
              COUNT(e.id) AS window_clicks,
              COUNT(DISTINCT e.visitor) AS window_visitors
       FROM click_events e
       JOIN tools t ON t.id = e.tool_id
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE e.created_at >= datetime('now', ?)
         AND t.status = 'published'
       GROUP BY t.id
       ORDER BY window_clicks DESC, window_visitors DESC, t.id DESC
       LIMIT ?`
    )
    .bind(since, limit)
    .all();

  const trending = (results || []).map(rowToTool);
  if (trending.length >= limit) return trending;

  // Pad with editorial picks, skipping anything already present.
  const seen = new Set(trending.map((t) => t.id));
  const fallback = await listFeaturedTools(db, limit * 3 + 2);
  for (const t of fallback) {
    if (trending.length >= limit) break;
    if (!seen.has(t.id)) { trending.push(t); seen.add(t.id); }
  }
  return trending.slice(0, limit);
}

export async function getToolBySlug(db, slug) {
  const r = await db
    .prepare(
      `SELECT t.*, c.name AS category_name, c.slug AS category_slug
       FROM tools t LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.slug = ?`
    )
    .bind(slug)
    .first();
  return rowToTool(r);
}

export async function getTool(db, id) {
  const r = await db.prepare('SELECT * FROM tools WHERE id = ?').bind(id).first();
  return rowToTool(r);
}

/** Orderings offered by the admin tool list (allow-listed: never interpolate raw input). */
const TOOL_SORTS = {
  updated: 't.updated_at DESC, t.id DESC',
  visits: 't.visit_count DESC, t.id DESC',
  name: 't.name ASC, t.id ASC',
};

export async function listToolsAdmin(db, { q = '', category = '', status = '', sort = 'updated', page = 1, perPage = 20 } = {}) {
  const where = [];
  const binds = [];
  if (q) {
    where.push('(t.name LIKE ? OR t.url LIKE ? OR t.tags LIKE ? OR t.description LIKE ?)');
    const like = `%${q}%`;
    binds.push(like, like, like, like);
  }
  if (category) { where.push('t.category_id = ?'); binds.push(Number(category)); }
  if (status) { where.push('t.status = ?'); binds.push(status); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = TOOL_SORTS[sort] || TOOL_SORTS.updated;

  const countRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM tools t ${whereSql}`)
    .bind(...binds)
    .first();
  const total = countRow?.n || 0;

  const offset = (Math.max(1, page) - 1) * perPage;
  const { results } = await db
    .prepare(
      `SELECT t.*, c.name AS category_name
       FROM tools t LEFT JOIN categories c ON c.id = t.category_id
       ${whereSql}
       ORDER BY ${orderSql}
       LIMIT ? OFFSET ?`
    )
    .bind(...binds, perPage, offset)
    .all();

  return { tools: (results || []).map(rowToTool), total, page, perPage };
}

export async function createTool(db, data) {
  // Base columns plus one block per language after the first. Column names come
  // from TOOL_I18N_COLUMNS, so a new locale only needs its DB columns.
  const baseCols = [
    'slug', 'name', 'url', 'description', 'category_id', 'tags', 'pricing', 'logo_url',
    'is_hot', 'is_new', 'is_featured', 'nofollow', 'noindex', 'in_sitemap',
    'status', 'sort_order',
    'review_md', 'source', 'updated_at',
  ];
  const cols = [...baseCols, ...TOOL_I18N_COLUMNS];

  const baseBinds = [
    data.slug,
    data.name,
    data.url,
    data.description || '',
    data.category_id || null,
    Array.isArray(data.tags) ? data.tags.join(',') : data.tags || '',
    data.pricing || 'free',
    data.logo_url || '',
    data.is_hot ? 1 : 0,
    data.is_new ? 1 : 0,
    data.is_featured ? 1 : 0,
    data.nofollow === false ? 0 : 1,
    data.noindex ? 1 : 0,
    data.in_sitemap === false ? 0 : 1,
    data.status || 'published',
    Number(data.sort_order) || 0,
    data.review_md || '',
    data.source || '',
    now(),
  ];
  const i18nBinds = TOOL_I18N_COLUMNS.map((col) => data[col] || '');

  const { meta } = await db
    .prepare(
      `INSERT INTO tools (${cols.join(', ')})
       VALUES (${placeholders(cols.length)})`
    )
    .bind(...baseBinds, ...i18nBinds)
    .run();
  return meta.last_row_id;
}

export async function updateTool(db, id, data) {
  const setCols = [
    'slug=?', 'name=?', 'url=?', 'description=?', 'category_id=?', 'tags=?',
    'pricing=?', 'logo_url=?', 'is_hot=?', 'is_new=?', 'is_featured=?',
    'nofollow=?', 'noindex=?', 'in_sitemap=?', 'status=?',
    'sort_order=?',
    'review_md=?',
    ...TOOL_I18N_COLUMNS.map((c) => `${c}=?`),
    'updated_at=?',
  ];

  const baseBinds = [
    data.slug,
    data.name,
    data.url,
    data.description || '',
    data.category_id || null,
    Array.isArray(data.tags) ? data.tags.join(',') : data.tags || '',
    data.pricing || 'free',
    data.logo_url || '',
    data.is_hot ? 1 : 0,
    data.is_new ? 1 : 0,
    data.is_featured ? 1 : 0,
    data.nofollow === false ? 0 : 1,
    data.noindex ? 1 : 0,
    data.in_sitemap === false ? 0 : 1,
    data.status || 'published',
    Number(data.sort_order) || 0,
    data.review_md || '',
  ];
  const i18nBinds = TOOL_I18N_COLUMNS.map((col) => data[col] || '');

  await db
    .prepare(`UPDATE tools SET ${setCols.join(', ')} WHERE id=?`)
    .bind(...baseBinds, ...i18nBinds, now(), id)
    .run();
}

export async function deleteTool(db, id) {
  await db.prepare('DELETE FROM tools WHERE id = ?').bind(id).run();
}

/**
 * Take a tool offline / put it back, without touching its content.
 *
 * `draft` is the "下架" state: the row keeps every field, but the public queries
 * all filter on `status = 'published'`, so the page, its sitemap entry and its
 * place in the listings disappear until it is published again.
 */
export async function setToolStatus(db, id, status) {
  const value = ['published', 'draft', 'archived'].includes(status) ? status : 'draft';
  await db
    .prepare('UPDATE tools SET status = ?, updated_at = ? WHERE id = ?')
    .bind(value, now(), id)
    .run();
  return value;
}

export async function incrementVisits(db, id) {
  await db.prepare('UPDATE tools SET visit_count = visit_count + 1 WHERE id = ?').bind(id).run();
}

// --- click tracking ---------------------------------------------------------
// Clicks on a tool's "访问" button. `click_events` is the source of truth;
// tools.visit_count is a cache of it.

/** Clicks allowed from one IP to one tool inside this window (seconds). */
export const DEDUPE_WINDOW = 60;

/**
 * Record one click.
 *
 * Returns `{ recorded: false, reason }` when the click is ignored:
 *   - tool does not exist or is not published
 *   - the same IP already clicked this tool within DEDUPE_WINDOW
 *
 * When recorded, the visitor id is echoed back so the caller can persist it
 * client-side for cross-session visitor counting.
 */
export async function recordClick(db, { toolId, ipHash = '', visitor = '', country = '', referer = '', path = '' }) {
  const tool = await db
    .prepare("SELECT id FROM tools WHERE id = ? AND status = 'published'")
    .bind(toolId)
    .first();
  if (!tool) return { recorded: false, reason: 'not_found' };

  if (ipHash) {
    const recent = await db
      .prepare(
        `SELECT 1 AS hit FROM click_events
         WHERE ip_hash = ? AND tool_id = ?
           AND created_at >= datetime('now', ?)
         LIMIT 1`
      )
      .bind(ipHash, toolId, `-${DEDUPE_WINDOW} seconds`)
      .first();
    if (recent) return { recorded: false, reason: 'duplicate' };
  }

  // Same transaction keeps the log and the popularity cache consistent.
  await db.batch([
    db
      .prepare(
        `INSERT INTO click_events (tool_id, ip_hash, visitor, country, referer, path)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(toolId, ipHash, visitor, country, referer.slice(0, 500), path.slice(0, 300)),
    db.prepare('UPDATE tools SET visit_count = visit_count + 1 WHERE id = ?').bind(toolId),
  ]);

  return { recorded: true, toolId };
}

/** Merge click rows into the visit_count cache (useful after manual edits). */
export async function rebuildVisitCounts(db) {
  await db
    .prepare(
      `UPDATE tools SET visit_count = (
         SELECT COUNT(*) FROM click_events e WHERE e.tool_id = tools.id
       )`
    )
    .run();
}

/**
 * Aggregated analytics for the /admin/analytics dashboard.
 * `days` bounds every series; all buckets are returned even when empty so the
 * charts keep a stable x-axis.
 */
export async function analyticsSummary(db, { days = 30 } = {}) {
  const since = `-${days - 1} days`;
  const [
    totals,
    daily,
    topTools,
    byCountry,
    byReferer,
  ] = await Promise.all([
    db
      .prepare(
        `SELECT
           COUNT(*) AS clicks,
           COUNT(DISTINCT visitor) AS visitors,
           COUNT(DISTINCT tool_id) AS tools,
           COUNT(DISTINCT date(created_at)) AS active_days
         FROM click_events
         WHERE created_at >= datetime('now', ?)`
      )
      .bind(since)
      .first(),
    db
      .prepare(
        `SELECT date(created_at) AS day, COUNT(*) AS clicks,
                COUNT(DISTINCT visitor) AS visitors
         FROM click_events
         WHERE created_at >= datetime('now', ?)
         GROUP BY day ORDER BY day`
      )
      .bind(since)
      .all(),
    db
      .prepare(
        `SELECT t.id, t.name, t.slug, t.status, t.pricing,
                c.name AS category_name,
                COUNT(e.id) AS clicks,
                COUNT(DISTINCT e.visitor) AS visitors
         FROM click_events e
         JOIN tools t ON t.id = e.tool_id
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE e.created_at >= datetime('now', ?)
         GROUP BY t.id
         ORDER BY clicks DESC, t.id DESC
         LIMIT 20`
      )
      .bind(since)
      .all(),
    db
      .prepare(
        `SELECT CASE WHEN country = '' THEN '(未知)' ELSE country END AS country,
                COUNT(*) AS clicks
         FROM click_events
         WHERE created_at >= datetime('now', ?)
         GROUP BY country
         ORDER BY clicks DESC
         LIMIT 10`
      )
      .bind(since)
      .all(),
    db
      .prepare(
        `SELECT CASE
                  WHEN referer = '' THEN '(直接访问)'
                  WHEN referer LIKE '%somarkit.com%' THEN '(站内)'
                  ELSE referer
                END AS source,
                COUNT(*) AS clicks
         FROM click_events
         WHERE created_at >= datetime('now', ?)
         GROUP BY source
         ORDER BY clicks DESC
         LIMIT 10`
      )
      .bind(since)
      .all(),
  ]);

  return {
    days,
    totals: {
      clicks: totals?.clicks || 0,
      visitors: totals?.visitors || 0,
      tools: totals?.tools || 0,
      activeDays: totals?.active_days || 0,
    },
    daily: daily.results || [],
    topTools: topTools.results || [],
    byCountry: byCountry.results || [],
    byReferer: byReferer.results || [],
  };
}

// --- admins -----------------------------------------------------------------

export async function findAdminByEmail(db, email) {
  return db.prepare('SELECT * FROM admins WHERE email = ? AND active = 1').bind(email.toLowerCase()).first();
}

export async function listAdmins(db) {
  const { results } = await db.prepare('SELECT * FROM admins ORDER BY id').all();
  return results || [];
}

/** Paginated admin list for the /admin/admins table (same shape as the others). */
export async function listAdminsPage(db, { page = 1, perPage = 20 } = {}) {
  const countRow = await db.prepare('SELECT COUNT(*) AS n FROM admins').first();
  const total = countRow?.n || 0;
  const offset = (Math.max(1, page) - 1) * perPage;
  const { results } = await db
    .prepare('SELECT * FROM admins ORDER BY id LIMIT ? OFFSET ?')
    .bind(perPage, offset)
    .all();
  return { admins: results || [], total, page, perPage };
}

export async function upsertAdminOnLogin(db, { email, name, picture }) {
  email = email.toLowerCase();
  const existing = await db.prepare('SELECT * FROM admins WHERE email = ?').bind(email).first();
  if (existing) {
    await db
      .prepare('UPDATE admins SET name = ?, picture = ?, last_login = ? WHERE email = ?')
      .bind(name || existing.name, picture || existing.picture, now(), email)
      .run();
    return db.prepare('SELECT * FROM admins WHERE email = ?').bind(email).first();
  }
  await db
    .prepare(
      `INSERT INTO admins (email, name, picture, role, active, last_login)
       VALUES (?, ?, ?, 'editor', 1, ?)`
    )
    .bind(email, name || '', picture || '', now())
    .run();
  return db.prepare('SELECT * FROM admins WHERE email = ?').bind(email).first();
}

export async function setAdminActive(db, id, active) {
  await db.prepare('UPDATE admins SET active = ? WHERE id = ?').bind(active ? 1 : 0, id).run();
}

// --- audit ------------------------------------------------------------------

export async function logAudit(db, actor, action, entity = '', entityId = null, detail = '') {
  await db
    .prepare(
      'INSERT INTO audit_log (actor, action, entity, entity_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(actor, action, entity, entityId, detail, now())
    .run();
}

export async function listAudit(db, limit = 60) {
  const { results } = await db
    .prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?')
    .bind(limit)
    .all();
  return results || [];
}

/**
 * Paginated audit log. `actor` optionally narrows to one admin (exact match),
 * driven by the search box on the /admin/audit page.
 */
export async function listAuditPage(db, { page = 1, perPage = 20, actor = '' } = {}) {
  const where = actor ? 'WHERE actor LIKE ?' : '';
  const binds = actor ? [`%${actor}%`] : [];
  const countRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM audit_log ${where}`)
    .bind(...binds)
    .first();
  const total = countRow?.n || 0;
  const offset = (Math.max(1, page) - 1) * perPage;
  const { results } = await db
    .prepare(`SELECT * FROM audit_log ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .bind(...binds, perPage, offset)
    .all();
  return { entries: results || [], total, page, perPage };
}

export async function deleteAuditLog(db) {
  await db.prepare('DELETE FROM audit_log').run();
}

// --- submissions ------------------------------------------------------------

export const SUBMISSION_STATUS = {
  pending: '待审核',
  approved: '已收录',
  rejected: '已拒绝',
};

/**
 * Record a public submission.
 * `ipHash` is a salted hash of the client IP — we never store the raw address.
 */
export async function createSubmission(db, data) {
  const { meta } = await db
    .prepare(
      `INSERT INTO submissions
        (name, url, description, category_id, tags, pricing,
         submitter_name, submitter_email, note, ip_hash, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      data.name,
      data.url,
      data.description || '',
      data.category_id || null,
      data.tags || '',
      data.pricing || 'free',
      data.submitter_name || '',
      data.submitter_email || '',
      data.note || '',
      data.ip_hash || '',
      (data.user_agent || '').slice(0, 300),
      now()
    )
    .run();
  return meta.last_row_id;
}

/** How many submissions this IP sent recently (simple rate limiting). */
export async function recentSubmissionCount(db, ipHash, minutes = 60) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM submissions
       WHERE ip_hash = ? AND created_at >= datetime('now', ?)`
    )
    .bind(ipHash, `-${Number(minutes)} minutes`)
    .first();
  return row?.n || 0;
}

export async function listSubmissionsAdmin(db, { status = '', page = 1, perPage = 20 } = {}) {
  const where = [];
  const binds = [];
  if (status) { where.push('s.status = ?'); binds.push(status); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM submissions s ${whereSql}`)
    .bind(...binds)
    .first();

  const offset = (Math.max(1, page) - 1) * perPage;
  const { results } = await db
    .prepare(
      `SELECT s.*, c.name AS category_name, t.slug AS tool_slug
       FROM submissions s
       LEFT JOIN categories c ON c.id = s.category_id
       LEFT JOIN tools t ON t.id = s.tool_id
       ${whereSql}
       ORDER BY
         CASE s.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
         s.created_at DESC, s.id DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...binds, perPage, offset)
    .all();

  return { submissions: results || [], total: countRow?.n || 0, page, perPage };
}

export async function countSubmissionsByStatus(db) {
  const { results } = await db
    .prepare('SELECT status, COUNT(*) AS n FROM submissions GROUP BY status')
    .all();
  const out = { pending: 0, approved: 0, rejected: 0 };
  for (const r of results || []) out[r.status] = r.n;
  return out;
}

export async function getSubmission(db, id) {
  return db.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first();
}

export async function rejectSubmission(db, id, reviewer, reason = '') {
  await db
    .prepare(
      `UPDATE submissions SET status = 'rejected', review_note = ?, reviewed_at = ?, reviewed_by = ?
       WHERE id = ?`
    )
    .bind(reason, now(), reviewer, id)
    .run();
}

/**
 * Mark a submission as handled and link it to the tool the admin created.
 *
 * Publishing is a deliberate, separate step: the admin opens the new-tool form
 * pre-filled from the submission, completes the missing fields (category, logo,
 * review…) and saves. This only records the outcome — it never creates or
 * publishes a tool itself.
 */
export async function linkSubmissionToTool(db, id, toolId, reviewer, note = '') {
  await db
    .prepare(
      `UPDATE submissions
         SET status = 'approved', tool_id = ?, reviewed_at = datetime('now'),
             reviewed_by = ?, review_note = ?
       WHERE id = ?`
    )
    .bind(toolId ?? null, reviewer || '', note || '', id)
    .run();
}

export async function deleteSubmission(db, id) {
  await db.prepare('DELETE FROM submissions WHERE id = ?').bind(id).run();
}

// --- stats ------------------------------------------------------------------

export async function dashboardStats(db) {
  const [tools, cats, drafts, visits, admins] = await db.batch([
    db.prepare('SELECT COUNT(*) AS n FROM tools'),
    db.prepare('SELECT COUNT(*) AS n FROM categories'),
    db.prepare("SELECT COUNT(*) AS n FROM tools WHERE status != 'published'"),
    db.prepare('SELECT COALESCE(SUM(visit_count), 0) AS n FROM tools'),
    db.prepare('SELECT COUNT(*) AS n FROM admins WHERE active = 1'),
  ]);
  return {
    tools: tools.results?.[0]?.n || 0,
    categories: cats.results?.[0]?.n || 0,
    drafts: drafts.results?.[0]?.n || 0,
    visits: visits.results?.[0]?.n || 0,
    admins: admins.results?.[0]?.n || 0,
  };
}

export async function topTools(db, limit = 8) {
  const { results } = await db
    .prepare(
      `SELECT t.*, c.name AS category_name FROM tools t
       LEFT JOIN categories c ON c.id = t.category_id
       ORDER BY t.visit_count DESC, t.id DESC LIMIT ?`
    )
    .bind(limit)
    .all();
  return (results || []).map(rowToTool);
}

