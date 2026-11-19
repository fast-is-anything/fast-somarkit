// -----------------------------------------------------------------------------
// Data access layer (D1)
// -----------------------------------------------------------------------------

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
  const { meta } = await db
    .prepare(
      `INSERT INTO categories (slug, name, name_en, icon, description, sort_order, visible, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      data.slug,
      data.name,
      data.name_en || '',
      data.icon || 'grid',
      data.description || '',
      Number(data.sort_order) || 0,
      data.visible ? 1 : 0,
      now()
    )
    .run();
  return meta.last_row_id;
}

export async function updateCategory(db, id, data) {
  await db
    .prepare(
      `UPDATE categories SET slug=?, name=?, name_en=?, icon=?, description=?,
        sort_order=?, visible=?, updated_at=? WHERE id=?`
    )
    .bind(
      data.slug,
      data.name,
      data.name_en || '',
      data.icon || 'grid',
      data.description || '',
      Number(data.sort_order) || 0,
      data.visible ? 1 : 0,
      now(),
      id
    )
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
  const { meta } = await db
    .prepare(
      `INSERT INTO tools
        (slug, name, url, description, category_id, tags, pricing, logo_url,
         is_hot, is_new, is_featured, status, sort_order, source, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
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
      data.status || 'published',
      Number(data.sort_order) || 0,
      data.source || '',
      now()
    )
    .run();
  return meta.last_row_id;
}

export async function updateTool(db, id, data) {
  await db
    .prepare(
      `UPDATE tools SET slug=?, name=?, url=?, description=?, category_id=?, tags=?,
        pricing=?, logo_url=?, is_hot=?, is_new=?, is_featured=?, status=?,
        sort_order=?, updated_at=? WHERE id=?`
    )
    .bind(
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
      data.status || 'published',
      Number(data.sort_order) || 0,
      now(),
      id
    )
    .run();
}

export async function deleteTool(db, id) {
  await db.prepare('DELETE FROM tools WHERE id = ?').bind(id).run();
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
 * Approve a submission: create the tool, then link the submission to it.
 * Returns the new tool id (or an existing one if the URL was already listed).
 */
export async function approveSubmission(db, submission, reviewer, overrides = {}) {
  const existing = await db
    .prepare('SELECT id FROM tools WHERE url = ? OR name = ? LIMIT 1')
    .bind(submission.url, submission.name)
    .first();

  let toolId;
  if (existing) {
    toolId = existing.id;
  } else {
    let slug = slugify(overrides.slug || submission.name);
    const clash = await db.prepare('SELECT id FROM tools WHERE slug = ?').bind(slug).first();
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    toolId = await createTool(db, {
      slug,
      name: submission.name,
      url: submission.url,
      description: submission.description || '',
      category_id: submission.category_id || null,
      tags: submission.tags || '',
      pricing: submission.pricing || 'free',
      logo_url: '',
      is_hot: false,
      is_new: true,     // newly accepted submissions are flagged as new
      is_featured: false,
      status: 'published',
      sort_order: 0,
      source: `submission#${submission.id}`,
    });
  }

  await db
    .prepare(
      `UPDATE submissions SET status = 'approved', tool_id = ?, review_note = ?,
        reviewed_at = ?, reviewed_by = ? WHERE id = ?`
    )
    .bind(toolId, overrides.review_note || '', now(), reviewer, submission.id)
    .run();

  return { toolId, existed: Boolean(existing) };
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

// --- bulk import ------------------------------------------------------------

/**
 * Parse CSV in a forgiving way: supports quoted fields with embedded commas
 * and newlines.
 */
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

/**
 * Bulk upsert tools from CSV rows.
 * Expected headers: name,url,category,tags,description,pricing,hot,new,featured
 */
export async function importToolsCSV(db, csvText) {
  const rows = parseCSV(csvText);
  if (!rows.length) return { inserted: 0, updated: 0, skipped: 0, errors: ['CSV 为空'] };

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (k) => headers.indexOf(k);

  const cats = await listCategories(db, { includeHidden: true });
  const catByName = {};
  const catBySlug = {};
  for (const c of cats) {
    catByName[c.name] = c.id;
    catBySlug[c.slug] = c.id;
  }

  let inserted = 0, updated = 0, skipped = 0;
  const errors = [];

  for (let r = 1; r < rows.length; r++) {
    const line = rows[r];
    const get = (k) => (idx(k) >= 0 ? String(line[idx(k)] ?? '').trim() : '');
    const name = get('name');
    const url = get('url');
    if (!name || !url) { skipped++; if (errors.length < 6) errors.push(`第 ${r + 1} 行缺少 name 或 url`); continue; }

    const catRaw = get('category');
    const category_id = catByName[catRaw] || catBySlug[catRaw] || null;
    const tags = get('tags');
    const pricingRaw = (get('pricing') || 'free').toLowerCase();
    const pricing = ['free', 'freemium', 'paid', 'opensource'].includes(pricingRaw) ? pricingRaw : 'free';
    const bool = (v) => ['1', 'true', 'yes', 'y', '是', '热门', '新品'].includes(String(v).toLowerCase());

    const payload = {
      name,
      url,
      description: get('description'),
      category_id,
      tags,
      pricing,
      logo_url: get('logo') || get('logo_url'),
      is_hot: bool(get('hot')),
      is_new: bool(get('new')),
      is_featured: bool(get('featured')),
      status: 'published',
      sort_order: Number(get('sort')) || 0,
      source: 'csv-import',
    };

    const existing = await db
      .prepare('SELECT id FROM tools WHERE url = ? OR name = ? LIMIT 1')
      .bind(url, name)
      .first();

    try {
      if (existing) {
        // keep the original slug so URLs stay stable
        const cur = await db.prepare('SELECT slug FROM tools WHERE id = ?').bind(existing.id).first();
        await updateTool(db, existing.id, { ...payload, slug: cur.slug });
        updated++;
      } else {
        let slug = slugify(name);
        const clash = await db.prepare('SELECT id FROM tools WHERE slug = ?').bind(slug).first();
        if (clash) slug = `${slug}-${r}`;
        await createTool(db, { ...payload, slug });
        inserted++;
      }
    } catch (e) {
      skipped++;
      if (errors.length < 6) errors.push(`第 ${r + 1} 行：${e.message}`);
    }
  }

  return { inserted, updated, skipped, errors };
}
