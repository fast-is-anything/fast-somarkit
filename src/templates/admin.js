// -----------------------------------------------------------------------------
// Admin console templates
// -----------------------------------------------------------------------------

import { esc } from '../lib/crypto.js';
import { UI } from '../lib/icons.js';
import { logoGlyph } from '../lib/logo.js';
import { PRICING, TOOL_STATUS } from '../lib/db.js';

const NAV = [
  { group: '概览', items: [
    { href: '/admin', label: '仪表盘', icon: UI.dashboard, match: '/admin' },
    { href: '/admin/submissions', label: '工具提交', icon: UI.inbox, match: '/admin/submissions' },
    { href: '/admin/tools', label: '工具管理', icon: UI.sparkle, match: '/admin/tools' },
    { href: '/admin/categories', label: '分类管理', icon: UI.globe, match: '/admin/categories' },
  ] },
  { group: '收录运维', items: [
    { href: '/admin/import', label: '批量导入', icon: UI.upload, match: '/admin/import' },
    { href: '/admin/audit', label: '操作日志', icon: UI.book, match: '/admin/audit' },
    { href: '/admin/admins', label: '管理员', icon: UI.users, match: '/admin/admins' },
  ] },
];

function brandMark() {
  return `<span class="ad-brand-mark" aria-hidden="true">${logoGlyph(18)}</span>`;
}

export function avatar(user, cls = 'ad-avatar') {
  if (user?.picture) {
    return `<span class="${cls}"><img src="${esc(user.picture)}" alt="" referrerpolicy="no-referrer"></span>`;
  }
  const name = user?.name || user?.email || '?';
  return `<span class="${cls}" aria-hidden="true">${esc(initialsOf(name))}</span>`;
}

function initialsOf(name) {
  const s = String(name || '?').trim();
  if (/[\u4e00-\u9fa5]/.test(s)) return s.slice(0, 1);
  const p = s.split(/[\s@._-]+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export function adminLayout({ title, breadcrumb = '', user, env, children, activePath = '', stats = {} }) {
  const nav = NAV.map((group) => {
    const items = group.items.map((it) => {
      const active = it.match === activePath || (it.match !== '/admin' && activePath.startsWith(it.match));
      const badge = it.match === '/admin/tools' && stats.drafts ? `<span class="ad-nav-badge">${stats.drafts}</span>` : '';
      return `<a class="ad-nav-item ${active ? 'active' : ''}" href="${it.href}" data-match="${it.match}" title="${esc(it.label)}">
        <span class="ad-nav-icon">${it.icon}</span>
        <span class="ad-nav-text">${esc(it.label)}</span>
        ${badge}
      </a>`;
    }).join('');
    return `<div class="ad-nav-label">${esc(group.group)}</div>${items}`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN" data-ad-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} · ${esc(env.SITE_NAME || 'SoMarkIt')} 管理后台</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="color-scheme" content="light dark">
<link rel="stylesheet" href="/assets/admin.css">
<script>
(function(){try{var t=localStorage.getItem('somarkit-admin-theme');
if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
document.documentElement.setAttribute('data-ad-theme',t);}catch(e){}})();
</script>
</head>
<body>
<div class="ad-shell" id="adShell">
  <aside class="ad-sidebar" aria-label="管理后台导航">
    <div class="ad-sidebar-top">
      <a class="ad-brand" id="adBrand" href="/admin" title="SoMarkIt 管理后台">
        ${brandMark()}
        <span class="ad-brand-text">
          <div>SoMarkIt</div>
          <div class="ad-brand-sub">Admin Console</div>
        </span>
      </a>
      <button class="ad-collapse-btn" data-ad-collapse type="button" aria-label="折叠侧边栏" aria-expanded="true" title="折叠侧边栏 (Ctrl+B)">
        ${UI.panelLeft}
      </button>
    </div>
    <nav class="ad-nav">${nav}</nav>
    <div class="ad-sidebar-foot">
      <div class="ad-user-row">
        <a class="ad-user" href="/" target="_blank" rel="noopener" title="查看站点">
          ${avatar(user)}
          <span class="ad-user-meta">
            <div class="ad-user-name">${esc(user?.name || user?.email || '')}</div>
            <div class="ad-user-role">${user?.role === 'owner' ? '站点所有者' : '编辑'}</div>
          </span>
        </a>
        <a class="ad-logout" href="/admin/logout" title="退出登录" aria-label="退出登录">${UI.logout}</a>
      </div>
    </div>
  </aside>

  <div class="ad-overlay" data-ad-nav-close></div>

  <div class="ad-main">
    <header class="ad-topbar">
      <button class="ad-icon-btn ad-mobile-toggle" data-ad-nav-open type="button" aria-label="打开导航">${UI.menu}</button>
      <div style="min-width:0">
        <h1>${esc(title)}</h1>
        ${breadcrumb ? `<div class="ad-crumb">${breadcrumb}</div>` : ''}
      </div>
      <div class="ad-topbar-spacer"></div>
      <div class="ad-topbar-actions">
        <button class="ad-icon-btn" data-ad-theme-toggle type="button" aria-label="切换主题" title="切换主题">
          <span class="js-icon-moon">${UI.moon}</span><span class="js-icon-sun" style="display:none">${UI.sun}</span>
        </button>
        <a class="ad-icon-btn" href="/" target="_blank" rel="noopener" aria-label="访问前台" title="访问前台">${UI.externalLink}</a>
      </div>
    </header>
    <main class="ad-content" id="adContent">${children}</main>
  </div>
</div>
<div class="ad-loader" id="adLoader" aria-hidden="true">
  <div class="ad-loader-bar"><span></span></div>
  <div class="ad-loader-box">
    <span class="ad-loader-spin"></span>
    <span class="ad-loader-text">加载中…</span>
  </div>
</div>
<div class="ad-toast" id="adToast" role="status" aria-live="polite"></div>
<script src="/assets/admin.js" defer></script>
</body>
</html>`;
}

// --- login ------------------------------------------------------------------

export function loginPage({ env, error = '', next = '/admin' }) {
  // Local-only login shortcut. Rendered only when DEV_LOGIN_EMAIL is set, which
  // happens exclusively via the committed .dev.vars file used by `wrangler dev`.
  const devEmail = String(env.DEV_LOGIN_EMAIL || '').trim();
  const devButton = devEmail
    ? `<a class="ad-dev-btn" href="/admin/dev-login">
       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
         <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
       </svg>
       本地登录（开发）
       <span class="ad-dev-tag">LOCAL</span>
     </a>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN" data-ad-theme="light">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>登录 · ${esc(env.SITE_NAME || 'SoMarkIt')} 管理后台</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="color-scheme" content="light dark">
<link rel="stylesheet" href="/assets/admin.css">
<script>
(function(){try{var t=localStorage.getItem('somarkit-admin-theme');
if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
document.documentElement.setAttribute('data-ad-theme',t);}catch(e){}})();
</script>
</head>
<body>
<div class="ad-login-wrap">
  <div class="ad-login-card">
    <div class="ad-login-mark">${brandMark().replace('ad-brand-mark', '')}</div>
    <h1>SoMarkIt 管理后台</h1>
    <p>使用 Google 账号登录以继续</p>
    ${error ? `<div class="ad-alert ad-alert-error" style="text-align:left">${esc(error)}</div>` : ''}
    <a class="ad-google-btn" href="/admin/login/start">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
        <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
      </svg>
      使用 Google 账号登录
    </a>
    ${devButton}
    <div class="ad-login-foot">
      仅限已授权的管理员邮箱访问。<br>
      登录后可使用 Google 账号管理工具收录与分类。
    </div>
  </div>
</div>
</body>
</html>`;
}

// --- dashboard --------------------------------------------------------------

export function dashboardPage({ user, env, stats, top, recent, categories, audit }) {
  const catCounts = {};
  for (const t of top) catCounts[t.category_id] = (catCounts[t.category_id] || 0) + 1;

  const statCards = [
    { label: '收录工具', value: stats.tools, sub: `${stats.drafts} 条非发布状态`, icon: UI.sparkle },
    { label: '工具分类', value: stats.categories, sub: '按分类组织', icon: UI.globe },
    { label: '累计访问', value: stats.visits, sub: '来自「访问」按钮点击', icon: UI.flame },
    { label: '管理员', value: stats.admins, sub: '活跃账号', icon: UI.users },
  ].map((s) => `<div class="ad-stat">
      <div class="ad-stat-label">${s.icon}${esc(s.label)}</div>
      <div class="ad-stat-value">${s.value}</div>
      <div class="ad-stat-sub">${esc(s.sub)}</div>
    </div>`).join('');

  const topRows = top.slice(0, 8).map((t, i) => `<tr>
      <td style="width:36px;color:var(--ad-text-3);font-variant-numeric:tabular-nums">${i + 1}</td>
      <td>
        <div class="ad-cell-main">${esc(t.name)}</div>
        <div class="ad-cell-sub">${esc(t.category_name || '未分类')}</div>
      </td>
      <td>${pillTool(t.pricing)}</td>
      <td class="num">${t.visit_count}</td>
    </tr>`).join('');

  const recentRows = recent.slice(0, 6).map((t) => `<tr>
      <td data-label="工具">
        <div class="ad-cell-main">${esc(t.name)}</div>
        <div class="ad-cell-sub">${esc(t.slug)}</div>
      </td>
      <td data-label="状态">${statusPill(t.status)}</td>
      <td class="ad-cell-sub" data-label="更新时间">${esc(fmtDate(t.updated_at))}</td>
      <td class="ad-cell-actions-cell"><a class="ad-btn ad-btn-sm ad-btn-ghost" href="/admin/tools/${t.id}/edit">${UI.edit}编辑</a></td>
    </tr>`).join('');

  const auditRows = audit.slice(0, 8).map((a) => `<li style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--ad-border-soft);font-size:12.5px">
      <span style="color:var(--ad-text-3);white-space:nowrap;font-variant-numeric:tabular-nums">${esc(fmtTime(a.created_at))}</span>
      <span style="color:var(--ad-text-2);overflow:hidden;text-overflow:ellipsis">${esc(a.actor || '系统')} ${esc(actionLabel(a.action))}${a.detail ? ` · ${esc(a.detail)}` : ''}</span>
    </li>`).join('') || '<li style="padding:12px 0;color:var(--ad-text-3);font-size:13px">暂无操作记录</li>';

  const children = `
    <div class="ad-stats">${statCards}</div>

    <div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px;margin-bottom:20px" class="dash-grid">
      <div class="ad-card">
        <div class="ad-card-head">
          <h2>最近更新</h2><span class="spacer"></span>
          <a class="ad-btn ad-btn-sm" href="/admin/tools">全部工具</a>
        </div>
        <div class="ad-table-wrap">
          <table class="ad-table compact-cards">
            <thead><tr><th>工具</th><th>状态</th><th>更新时间</th><th></th></tr></thead>
            <tbody>${recentRows || '<tr><td colspan="4" style="text-align:center;color:var(--ad-text-3);padding:32px">还没有收录任何工具</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      <div class="ad-card">
        <div class="ad-card-head"><h2>访问排行</h2></div>
        <div class="ad-table-wrap">
          <table class="ad-table">
            <thead><tr><th>#</th><th>工具</th><th>定价</th><th class="num">访问</th></tr></thead>
            <tbody>${topRows || '<tr><td colspan="4" style="text-align:center;color:var(--ad-text-3);padding:32px">暂无数据</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="ad-card">
      <div class="ad-card-head"><h2>最近操作</h2><span class="spacer"></span>
        <a class="ad-btn ad-btn-sm" href="/admin/audit">查看全部</a></div>
      <div class="ad-card-body"><ul style="list-style:none;margin:0;padding:0">${auditRows}</ul></div>
    </div>

    <style>@media(max-width:1000px){.dash-grid{grid-template-columns:1fr!important}}</style>
  `;

  return adminLayout({
    title: '仪表盘',
    breadcrumb: `欢迎回来，${esc(user.name || user.email)}`,
    user, env, children, activePath: '/admin', stats,
  });
}

// --- tools list -------------------------------------------------------------

export function toolsPage({ user, env, tools, total, page, perPage, pages, q, category, status, categories, flash }) {
  const rows = tools.map((t) => `<tr>
    <td data-label="工具">
      <div class="ad-cell-main">${esc(t.name)}</div>
      <div class="ad-cell-sub">${esc(t.url)}</div>
    </td>
    <td data-label="分类">${esc(t.category_name || '未分类')}</td>
    <td data-label="定价">${pillTool(t.pricing)}</td>
    <td data-label="标记">
      ${t.is_hot ? '<span class="ad-pill ad-pill-red">热门</span> ' : ''}
      ${t.is_new ? '<span class="ad-pill ad-pill-blue">新品</span>' : ''}
    </td>
    <td data-label="状态">${statusPill(t.status)}</td>
    <td class="num" data-label="访问">${t.visit_count}</td>
    <td class="ad-cell-sub" data-label="更新">${esc(fmtDate(t.updated_at))}</td>
    <td class="ad-cell-actions-cell">
      <div class="ad-cell-actions">
        <a class="ad-btn ad-btn-sm ad-btn-ghost" href="/tools/${esc(t.slug)}" target="_blank" rel="noopener" title="预览">${UI.externalLink}</a>
        <a class="ad-btn ad-btn-sm" href="/admin/tools/${t.id}/edit">${UI.edit}编辑</a>
        <form method="post" action="/admin/tools/${t.id}/delete" data-confirm="确定要删除「${esc(t.name)}」吗？此操作不可恢复。">
          <button class="ad-btn ad-btn-sm ad-btn-danger" type="submit" title="删除">${UI.trash}</button>
        </form>
      </div>
    </td>
  </tr>`).join('');

  const opts = categories.map((c) => `<option value="${c.id}" ${String(c.id) === String(category) ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const statusOpts = Object.entries(TOOL_STATUS).map(([k, v]) =>
    `<option value="${k}" ${k === status ? 'selected' : ''}>${v}</option>`).join('');

  const children = `
    ${flash ? `<div class="ad-alert ad-alert-${esc(flash.type)}" id="adFlash" data-message="1">${esc(flash.message)}</div>` : ''}
    <div class="ad-card">
      <div class="ad-card-head">
        <form method="get" class="ad-toolbar" style="flex:1">
          <div class="ad-search">
            ${UI.search}
            <input class="ad-input" type="search" name="q" value="${esc(q)}" placeholder="搜索名称、URL、标签…">
          </div>
          <select class="ad-select" name="category">
            <option value="">全部分类</option>${opts}
          </select>
          <select class="ad-select" name="status">
            <option value="">全部状态</option>${statusOpts}
          </select>
          <button class="ad-btn" type="submit">筛选</button>
          ${(q || category || status) ? '<a class="ad-btn ad-btn-ghost" href="/admin/tools">重置</a>' : ''}
        </form>
        <a class="ad-btn ad-btn-primary" href="/admin/tools/new">${UI.plus}新增工具</a>
      </div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr>
            <th>工具</th><th>分类</th><th>定价</th><th>标记</th><th>状态</th>
            <th class="num">访问</th><th>更新</th><th></th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="8">
            <div class="ad-empty">${UI.sparkle}<h3>还没有工具</h3><p>点击右上角「新增工具」或使用批量导入。</p>
            <a class="ad-btn ad-btn-primary" href="/admin/tools/new">${UI.plus}新增工具</a></div>
          </td></tr>`}</tbody>
        </table>
      </div>
      ${pages > 1 ? pager({ page, pages, q, category, status }) : ''}
      <div class="ad-pager"><span style="border:none;padding:0;color:var(--ad-text-3)">共 ${total} 条</span></div>
    </div>
  `;

  return adminLayout({ title: '工具管理', breadcrumb: '收录、编辑与上下架', user, env, children, activePath: '/admin/tools' });
}

function pager({ page, pages, q, category, status }) {
  const qs = (p) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (category) sp.set('category', category);
    if (status) sp.set('status', status);
    sp.set('page', p);
    return `/admin/tools?${sp.toString()}`;
  };
  const nums = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, start + 4);
  for (let i = start; i <= end; i++) {
    nums.push(i === page ? `<span class="cur">${i}</span>` : `<a href="${qs(i)}">${i}</a>`);
  }
  return `<div class="ad-pager">
    ${page > 1 ? `<a href="${qs(page - 1)}">上一页</a>` : ''}
    ${nums.join('')}
    ${page < pages ? `<a href="${qs(page + 1)}">下一页</a>` : ''}
    <span class="spacer"></span>
  </div>`;
}

// --- tool form --------------------------------------------------------------

export function toolFormPage({ user, env, tool, categories, flash, isNew }) {
  const t = tool || {};
  const opts = categories.map((c) => `<option value="${c.id}" ${String(c.id) === String(t.category_id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const priceOpts = Object.entries(PRICING).map(([k, v]) =>
    `<option value="${k}" ${k === (t.pricing || 'free') ? 'selected' : ''}>${v}</option>`).join('');
  const statusOpts = Object.entries(TOOL_STATUS).map(([k, v]) =>
    `<option value="${k}" ${k === (t.status || 'published') ? 'selected' : ''}>${v}</option>`).join('');

  const children = `
    ${flash ? `<div class="ad-alert ad-alert-${esc(flash.type)}" id="adFlash" data-message="1">${esc(flash.message)}</div>` : ''}
    <form method="post" action="${isNew ? '/admin/tools' : `/admin/tools/${t.id}`}">
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px" class="form-grid">
        <div class="ad-card">
          <div class="ad-card-head"><h2>基础信息</h2></div>
          <div class="ad-card-body">
            <div class="ad-field">
              <label for="name">工具名称 *</label>
              <input class="ad-input" id="name" name="name" required maxlength="80" value="${esc(t.name || '')}" placeholder="例如：ChatGPT">
            </div>
            <div class="ad-field">
              <label for="url">官网链接 *</label>
              <input class="ad-input" id="url" name="url" type="url" required value="${esc(t.url || '')}" placeholder="https://example.com">
            </div>
            <div class="ad-field">
              <label for="slug">URL 路径</label>
              <input class="ad-input" id="slug" name="slug" value="${esc(t.slug || '')}" placeholder="留空自动生成">
              <div class="ad-hint">前台详情页地址：/tools/<span id="slugPreview">${esc(t.slug || 'auto')}</span></div>
            </div>
            <div class="ad-field">
              <label for="description">简介</label>
              <textarea class="ad-textarea" id="description" name="description" maxlength="600" placeholder="一句话说明这个工具做什么、适合谁用">${esc(t.description || '')}</textarea>
              <div class="ad-hint">建议 40–160 字，显示在卡片上（最多 3 行）。</div>
            </div>
            <div class="ad-field">
              <label for="tags">标签</label>
              <input class="ad-input" id="tags" name="tags" value="${esc((t.tags || []).join(', '))}" placeholder="对话, 写作, 多模态">
              <div class="ad-hint">用英文逗号分隔，最多显示 4 个。</div>
            </div>
          </div>
        </div>

        <div>
          <div class="ad-card" style="margin-bottom:16px">
            <div class="ad-card-head"><h2>归属与状态</h2></div>
            <div class="ad-card-body">
              <div class="ad-field">
                <label for="category">分类</label>
                <select class="ad-select" id="category" name="category_id">
                  <option value="">未分类</option>${opts}
                </select>
              </div>
              <div class="ad-field">
                <label for="pricing">定价模式</label>
                <select class="ad-select" id="pricing" name="pricing">${priceOpts}</select>
              </div>
              <div class="ad-field">
                <label for="status">发布状态</label>
                <select class="ad-select" id="status" name="status">${statusOpts}</select>
              </div>
              <div class="ad-field">
                <label for="sort_order">排序权重</label>
                <input class="ad-input" id="sort_order" name="sort_order" type="number" value="${esc(t.sort_order ?? 0)}">
                <div class="ad-hint">数值越小越靠前。</div>
              </div>
            </div>
          </div>

          <div class="ad-card">
            <div class="ad-card-head"><h2>展示标记</h2></div>
            <div class="ad-card-body">
              <label class="ad-check" style="margin-bottom:12px">
                <input type="checkbox" name="is_hot" value="1" ${t.is_hot ? 'checked' : ''}> 热门（红色角标）
              </label>
              <label class="ad-check" style="margin-bottom:12px">
                <input type="checkbox" name="is_new" value="1" ${t.is_new ? 'checked' : ''}> 新品（蓝色角标）
              </label>
              <label class="ad-check">
                <input type="checkbox" name="is_featured" value="1" ${t.is_featured ? 'checked' : ''}> 首页热门侧栏
              </label>
            </div>
          </div>

          <div class="ad-card" style="margin-top:16px">
            <div class="ad-card-body">
              <div class="ad-field">
                <label for="logo_url">Logo 图片地址</label>
                <input class="ad-input" id="logo_url" name="logo_url" value="${esc(t.logo_url || '')}" placeholder="https://...">
                <div class="ad-hint">留空则显示名称首字母。</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap">
        <button class="ad-btn ad-btn-primary" type="submit">${isNew ? '创建工具' : '保存修改'}</button>
        <a class="ad-btn" href="/admin/tools">取消</a>
        ${!isNew ? `<a class="ad-btn ad-btn-ghost" href="/tools/${esc(t.slug)}" target="_blank" rel="noopener">${UI.externalLink}预览页面</a>` : ''}
      </div>
      <style>@media(max-width:1000px){.form-grid{grid-template-columns:1fr!important}}</style>
    </form>
    <script>
      (function(){
        var name = document.getElementById('name'), slug = document.getElementById('slug');
        var prev = document.getElementById('slugPreview');
        if (!slug || slug.value) return;
        name.addEventListener('input', function(){
          if (slug.value) return;
          var s = name.value.trim().toLowerCase().replace(/['"]/g,'')
            .replace(/[^a-z0-9\\u4e00-\\u9fa5]+/g,'-').replace(/^-+|-+$/g,'');
          prev.textContent = s || 'auto';
        });
      })();
    </script>
  `;

  return adminLayout({
    title: isNew ? '新增工具' : '编辑工具',
    breadcrumb: isNew ? '添加一条新的收录' : esc(t.name || ''),
    user, env, children, activePath: '/admin/tools',
  });
}

// --- categories -------------------------------------------------------------

export function categoriesPage({ user, env, categories, counts, flash }) {
  const rows = categories.map((c) => `<tr>
    <td data-label="分类">
      <div class="ad-cell-main">${esc(c.name)}</div>
      <div class="ad-cell-sub">/${esc(c.slug)}</div>
    </td>
    <td data-label="图标"><code style="font-size:12px;color:var(--ad-text-2)">${esc(c.icon)}</code></td>
    <td class="num" data-label="工具数">${counts[c.id] || 0}</td>
    <td class="num" data-label="排序">${c.sort_order}</td>
    <td data-label="状态">${c.visible ? '<span class="ad-pill ad-pill-green">显示</span>' : '<span class="ad-pill ad-pill-gray">隐藏</span>'}</td>
    <td class="ad-cell-actions-cell">
      <div class="ad-cell-actions">
        <a class="ad-btn ad-btn-sm" href="/admin/categories/${c.id}/edit">${UI.edit}编辑</a>
        <form method="post" action="/admin/categories/${c.id}/delete" data-confirm="删除分类「${esc(c.name)}」？该分类下的工具会变为未分类。">
          <button class="ad-btn ad-btn-sm ad-btn-danger" type="submit" title="删除">${UI.trash}</button>
        </form>
      </div>
    </td>
  </tr>`).join('');

  const children = `
    ${flash ? `<div class="ad-alert ad-alert-${esc(flash.type)}" id="adFlash" data-message="1">${esc(flash.message)}</div>` : ''}
    <div class="ad-card">
      <div class="ad-card-head">
        <h2>全部分类</h2><span class="spacer"></span>
        <a class="ad-btn ad-btn-primary" href="/admin/categories/new">${UI.plus}新增分类</a>
      </div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>分类</th><th>图标</th><th class="num">工具数</th><th class="num">排序</th><th>状态</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6"><div class="ad-empty">还没有分类</div></td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;

  return adminLayout({ title: '分类管理', breadcrumb: '组织前台侧边导航', user, env, children, activePath: '/admin/categories' });
}

export function categoryFormPage({ user, env, category, icons, flash, isNew }) {
  const c = category || {};
  const iconOpts = icons.map((k) =>
    `<option value="${k}" ${k === (c.icon || 'grid') ? 'selected' : ''}>${k}</option>`).join('');

  const children = `
    ${flash ? `<div class="ad-alert ad-alert-${esc(flash.type)}" id="adFlash" data-message="1">${esc(flash.message)}</div>` : ''}
    <form method="post" action="${isNew ? '/admin/categories' : `/admin/categories/${c.id}`}">
      <div class="ad-card" style="max-width:640px">
        <div class="ad-card-head"><h2>${isNew ? '新增分类' : '编辑分类'}</h2></div>
        <div class="ad-card-body">
          <div class="ad-field">
            <label for="name">分类名称 *</label>
            <input class="ad-input" id="name" name="name" required maxlength="40" value="${esc(c.name || '')}" placeholder="例如：AI 对话助手">
          </div>
          <div class="ad-field">
            <label for="slug">路径标识</label>
            <input class="ad-input" id="slug" name="slug" value="${esc(c.slug || '')}" placeholder="留空自动生成，例如 ai-chat">
          </div>
          <div class="ad-row">
            <div class="ad-field">
              <label for="icon">图标</label>
              <select class="ad-select" id="icon" name="icon">${iconOpts}</select>
              <div class="ad-hint">图标库：${icons.join(' · ')}</div>
            </div>
            <div class="ad-field">
              <label for="sort_order">排序权重</label>
              <input class="ad-input" id="sort_order" name="sort_order" type="number" value="${esc(c.sort_order ?? 0)}">
            </div>
          </div>
          <div class="ad-field">
            <label for="description">描述</label>
            <textarea class="ad-textarea" id="description" name="description" maxlength="300" placeholder="用于分类页 SEO 描述">${esc(c.description || '')}</textarea>
          </div>
          <label class="ad-check" style="margin-bottom:18px">
            <input type="checkbox" name="visible" value="1" ${c.visible !== 0 ? 'checked' : ''}> 在前台侧边栏显示
          </label>
          <div style="display:flex;gap:8px">
            <button class="ad-btn ad-btn-primary" type="submit">${isNew ? '创建分类' : '保存修改'}</button>
            <a class="ad-btn" href="/admin/categories">取消</a>
          </div>
        </div>
      </div>
    </form>
  `;

  return adminLayout({
    title: isNew ? '新增分类' : '编辑分类',
    breadcrumb: esc(c.name || ''),
    user, env, children, activePath: '/admin/categories',
  });
}

// --- import -----------------------------------------------------------------

export function importPage({ user, env, flash, result, csvTemplate }) {
  const resultHtml = result
    ? `<div class="ad-alert ${result.skipped && !result.inserted && !result.updated ? 'ad-alert-warn' : 'ad-alert-success'}">
        <div>
          <strong>导入完成：</strong>新增 ${result.inserted} 条，更新 ${result.updated} 条，跳过 ${result.skipped} 条。
          ${result.errors?.length ? `<ul style="margin:8px 0 0;padding-left:18px;font-size:12.5px">${result.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
        </div>
      </div>`
    : '';

  const children = `
    ${flash ? `<div class="ad-alert ad-alert-${esc(flash.type)}" id="adFlash" data-message="1">${esc(flash.message)}</div>` : ''}
    ${resultHtml}
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px" class="imp-grid">
      <div class="ad-card">
        <div class="ad-card-head"><h2>CSV 批量导入</h2></div>
        <div class="ad-card-body">
          <form method="post" action="/admin/import" enctype="multipart/form-data">
            <div class="ad-field">
              <label for="file">选择 CSV 文件</label>
              <input class="ad-input" id="file" name="file" type="file" accept=".csv,text/csv" style="height:auto;padding:8px 11px">
            </div>
            <div class="ad-field">
              <label for="csv">…或直接粘贴 CSV 内容</label>
              <textarea class="ad-textarea" id="csv" name="csv" style="min-height:220px;font-family:ui-monospace,monospace;font-size:12.5px" placeholder="name,url,category,tags,description,pricing,hot,new,featured"></textarea>
            </div>
            <button class="ad-btn ad-btn-primary" type="submit">${UI.upload}开始导入</button>
          </form>
        </div>
      </div>
      <div class="ad-card">
        <div class="ad-card-head"><h2>字段说明</h2></div>
        <div class="ad-card-body" style="font-size:12.5px;color:var(--ad-text-2);line-height:1.75">
          <p style="margin:0 0 10px"><code>name</code> 工具名称（必填）<br>
          <code>url</code> 官网链接（必填，作为去重依据）<br>
          <code>category</code> 分类名称或 slug<br>
          <code>tags</code> 逗号分隔的标签（用引号包裹整个字段）<br>
          <code>description</code> 简介<br>
          <code>pricing</code> free / freemium / paid / opensource<br>
          <code>hot</code> <code>new</code> <code>featured</code> 填 1 或 0<br>
          <code>logo</code> <code>sort</code> 可选</p>
          <p style="margin:0 0 12px">同名工具或同 URL 会被更新，其余新增。缺失的分类会被留空。</p>
          <a class="ad-btn ad-btn-sm" href="#" data-copy="${esc(csvTemplate)}">${UI.download}复制模板头</a>
        </div>
      </div>
    </div>
    <style>@media(max-width:1000px){.imp-grid{grid-template-columns:1fr!important}}</style>
  `;

  return adminLayout({ title: '批量导入', breadcrumb: '用 CSV 批量维护收录', user, env, children, activePath: '/admin/import' });
}

// --- audit ------------------------------------------------------------------

export function auditPage({ user, env, entries, flash }) {
  const rows = entries.map((a) => `<tr>
    <td class="ad-cell-sub" style="white-space:nowrap">${esc(fmtTime(a.created_at))}</td>
    <td>${esc(a.actor || '系统')}</td>
    <td>${esc(actionLabel(a.action))}</td>
    <td class="ad-cell-sub">${esc(a.entity)}${a.entity_id ? ` #${a.entity_id}` : ''}</td>
    <td class="ad-cell-sub">${esc(a.detail || '—')}</td>
  </tr>`).join('');

  const children = `
    ${flash ? `<div class="ad-alert ad-alert-${esc(flash.type)}" id="adFlash" data-message="1">${esc(flash.message)}</div>` : ''}
    <div class="ad-card">
      <div class="ad-card-head">
        <h2>操作日志</h2><span class="spacer"></span>
        <form method="post" action="/admin/audit/clear" data-confirm="清空全部操作日志？">
          <button class="ad-btn ad-btn-sm ad-btn-danger" type="submit">${UI.trash}清空</button>
        </form>
      </div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>对象</th><th>详情</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5"><div class="ad-empty">暂无记录</div></td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;

  return adminLayout({ title: '操作日志', breadcrumb: '谁在什么时候改了什么', user, env, children, activePath: '/admin/audit' });
}

// --- admins -----------------------------------------------------------------

export function adminsPage({ user, env, admins, allowList, flash }) {
  const rows = admins.map((a) => `<tr>
    <td>
      <div style="display:flex;align-items:center;gap:10px">
        ${avatar(a)}
        <div>
          <div class="ad-cell-main">${esc(a.name || a.email)}</div>
          <div class="ad-cell-sub">${esc(a.email)}</div>
        </div>
      </div>
    </td>
    <td>${a.role === 'owner' ? '<span class="ad-pill ad-pill-blue">所有者</span>' : '<span class="ad-pill ad-pill-gray">编辑</span>'}</td>
    <td>${a.active ? '<span class="ad-pill ad-pill-green">启用</span>' : '<span class="ad-pill ad-pill-red">停用</span>'}</td>
    <td class="ad-cell-sub" style="white-space:nowrap">${esc(a.last_login ? fmtTime(a.last_login) : '从未登录')}</td>
    <td>
      <div class="ad-cell-actions">
        ${a.email === user.email ? '<span class="ad-cell-sub">当前账号</span>' : `
        <form method="post" action="/admin/admins/${a.id}/toggle">
          <button class="ad-btn ad-btn-sm" type="submit">${a.active ? '停用' : '启用'}</button>
        </form>
        <form method="post" action="/admin/admins/${a.id}/delete" data-confirm="删除管理员 ${esc(a.email)}？">
          <button class="ad-btn ad-btn-sm ad-btn-danger" type="submit">${UI.trash}</button>
        </form>`}
      </div>
    </td>
  </tr>`).join('');

  const children = `
    ${flash ? `<div class="ad-alert ad-alert-${esc(flash.type)}" id="adFlash" data-message="1">${esc(flash.message)}</div>` : ''}
    <div class="ad-alert ad-alert-info">
      首次登录的 Google 账号必须同时满足：① 邮箱在 Worker 环境变量 <code>ADMIN_EMAILS</code> 中；② 首次登录会自动写入管理员表。
      之后可以在这里停用或删除管理员。
    </div>
    <div class="ad-card">
      <div class="ad-card-head"><h2>管理员账号</h2></div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>账号</th><th>角色</th><th>状态</th><th>最近登录</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5"><div class="ad-empty">暂无管理员</div></td></tr>'}</tbody>
        </table>
      </div>
    </div>
    <div class="ad-card" style="margin-top:16px">
      <div class="ad-card-head"><h2>白名单（ADMIN_EMAILS）</h2></div>
      <div class="ad-card-body" style="font-size:13px;color:var(--ad-text-2)">
        ${allowList.length ? allowList.map((e) => `<span class="ad-pill ad-pill-gray" style="margin-right:6px">${esc(e)}</span>`).join('') : '<span style="color:var(--ad-text-3)">未配置</span>'}
        <p style="font-size:12px;color:var(--ad-text-3);margin:12px 0 0">
          修改后需重新部署：<code>wrangler secret put …</code> 或在 wrangler.toml 的 <code>[vars]</code> 中调整 <code>ADMIN_EMAILS</code>。
        </p>
      </div>
    </div>
  `;

  return adminLayout({ title: '管理员', breadcrumb: '控制谁可以进入后台', user, env, children, activePath: '/admin/admins' });
}

// --- helpers ----------------------------------------------------------------

function pillTool(pricing) {
  const map = {
    free: ['ad-pill-green', '免费'],
    freemium: ['ad-pill-blue', '免费增值'],
    paid: ['ad-pill-warn', '付费'],
    opensource: ['ad-pill-gray', '开源'],
  };
  const [cls, label] = map[pricing] || ['ad-pill-gray', pricing];
  return `<span class="ad-pill ${cls}">${label}</span>`;
}

function statusPill(s) {
  const map = {
    published: ['ad-pill-green', '已发布'],
    draft: ['ad-pill-warn', '草稿'],
    archived: ['ad-pill-gray', '已归档'],
  };
  const [cls, label] = map[s] || ['ad-pill-gray', s];
  return `<span class="ad-pill ${cls}">${label}</span>`;
}

function actionLabel(a) {
  const map = {
    'login.success': '登录成功',
    'login.denied': '登录被拒绝',
    'tool.create': '新增工具',
    'tool.update': '更新工具',
    'tool.delete': '删除工具',
    'category.create': '新增分类',
    'category.update': '更新分类',
    'category.delete': '删除分类',
    'tools.import': '批量导入',
    'admin.toggle': '切换管理员状态',
    'admin.delete': '删除管理员',
    'audit.clear': '清空日志',
  };
  return map[a] || a;
}

export function fmtDate(s) {
  if (!s) return '—';
  return String(s).slice(0, 10);
}

export function fmtTime(s) {
  if (!s) return '—';
  return String(s).slice(0, 16).replace('T', ' ');
}

// --- submissions (admin) ----------------------------------------------------

export function submissionsPage({ user, env, submissions, total, page, perPage, pages, status, counts, flash }) {
  const rows = submissions.map((s) => {
    const who = s.submitter_email || s.submitter_name || '匿名';
    const actions = s.status === 'pending'
      ? `<form method="post" action="/admin/submissions/${s.id}/approve" style="display:inline">
           <button class="ad-btn ad-btn-sm ad-btn-primary" type="submit" title="通过并收录">${UI.check}收录</button>
         </form>
         <form method="post" action="/admin/submissions/${s.id}/reject" style="display:inline"
           data-confirm="拒绝「${esc(s.name)}」的提交？">
           <button class="ad-btn ad-btn-sm ad-btn-danger" type="submit">拒绝</button>
         </form>`
      : s.status === 'approved'
        ? `${s.tool_slug ? `<a class="ad-btn ad-btn-sm" href="/tools/${esc(s.tool_slug)}" target="_blank" rel="noopener">${UI.externalLink}查看</a>` : ''}
           <form method="post" action="/admin/submissions/${s.id}/delete" style="display:inline"
             data-confirm="删除这条提交记录？（不会删除已收录的工具）">
             <button class="ad-btn ad-btn-sm ad-btn-danger" type="submit">${UI.trash}</button>
           </form>`
        : `<form method="post" action="/admin/submissions/${s.id}/approve" style="display:inline">
             <button class="ad-btn ad-btn-sm" type="submit">改为收录</button>
           </form>
           <form method="post" action="/admin/submissions/${s.id}/delete" style="display:inline"
             data-confirm="删除这条提交记录？">
             <button class="ad-btn ad-btn-sm ad-btn-danger" type="submit">${UI.trash}</button>
           </form>`;

    return `<tr>
      <td data-label="工具">
        <div class="ad-cell-main">${esc(s.name)}</div>
        <div class="ad-cell-sub">${esc(s.url)}</div>
      </td>
      <td data-label="分类">${esc(s.category_name || '—')}</td>
      <td data-label="定价">${pillTool(s.pricing)}</td>
      <td data-label="提交人">
        <div class="ad-cell-main" style="font-size:12.5px;font-weight:500">${esc(who)}</div>
        <div class="ad-cell-sub">${esc(fmtTime(s.created_at))}</div>
      </td>
      <td data-label="状态">${submissionPill(s.status)}</td>
      <td class="ad-cell-actions-cell"><div class="ad-cell-actions">${actions}</div></td>
    </tr>`;
  }).join('');

  const tabs = [
    ['', '全部', counts.pending + counts.approved + counts.rejected],
    ['pending', '待审核', counts.pending],
    ['approved', '已收录', counts.approved],
    ['rejected', '已拒绝', counts.rejected],
  ].map(([k, label, n]) =>
    `<a class="ad-btn ad-btn-sm ${k === status ? 'ad-btn-primary' : ''}" href="/admin/submissions${k ? '?status=' + k : ''}">${label}${n != null ? ` <span style="opacity:.65">${n}</span>` : ''}</a>`
  ).join('');

  const children = `
    ${flash ? `<div class="ad-alert ad-alert-${esc(flash.type)}" id="adFlash" data-message="1">${esc(flash.message)}</div>` : ''}
    <div class="ad-alert ad-alert-info">
      访客通过前台「提交工具」表单提交的内容会先进入这里。点「收录」会把该工具直接发布到站点
      （若同名或同链接已存在，则关联到已有工具）。
    </div>
    <div class="ad-card">
      <div class="ad-card-head">
        <div class="ad-toolbar">${tabs}</div>
      </div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr>
            <th>工具</th><th>分类</th><th>定价</th><th>提交人</th><th>状态</th><th></th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="6">
            <div class="ad-empty">${UI.sparkle}<h3>还没有收到提交</h3>
            <p>前台顶栏的「提交工具」按钮会收集访客推荐。</p></div>
          </td></tr>`}</tbody>
        </table>
      </div>
      ${pages > 1 ? pager({ page, pages, q: '', category: '', status }) : ''}
      <div class="ad-pager"><span style="border:none;padding:0;color:var(--ad-text-3)">共 ${total} 条</span></div>
    </div>
  `;

  return adminLayout({
    title: '工具提交',
    breadcrumb: `${counts.pending} 条待审核`,
    user, env, children, activePath: '/admin/submissions',
    stats: { drafts: counts.pending },
  });
}

export function submissionDetailPage({ user, env, s, flash }) {
  const contact = [s.submitter_name, s.submitter_email].filter(Boolean).join(' · ') || '匿名';
  const children = `
    ${flash ? `<div class="ad-alert ad-alert-${esc(flash.type)}" id="adFlash" data-message="1">${esc(flash.message)}</div>` : ''}
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px" class="sub-grid">
      <div class="ad-card">
        <div class="ad-card-head">
          <h2>${esc(s.name)}</h2>
          <span class="spacer"></span>
          ${submissionPill(s.status)}
        </div>
        <div class="ad-card-body">
          <div class="ad-field">
            <div class="ad-label">官网</div>
            <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer nofollow"
              style="font-size:13px;color:var(--ad-primary);word-break:break-all">${esc(s.url)}</a>
          </div>
          <div class="ad-field">
            <div class="ad-label">简介</div>
            <div style="font-size:13.5px;color:var(--ad-text-2);line-height:1.7">${esc(s.description || '—')}</div>
          </div>
          <div class="ad-row">
            <div class="ad-field">
              <div class="ad-label">分类</div>
              <div style="font-size:13.5px">${esc(s.category_name || '—')}</div>
            </div>
            <div class="ad-field">
              <div class="ad-label">定价</div>
              ${pillTool(s.pricing)}
            </div>
          </div>
          <div class="ad-field">
            <div class="ad-label">标签</div>
            <div style="font-size:13px;color:var(--ad-text-2)">${esc(s.tags || '—')}</div>
          </div>
          <div class="ad-field">
            <div class="ad-label">提交人补充</div>
            <div style="font-size:13.5px;color:var(--ad-text-2);line-height:1.7;white-space:pre-wrap">${esc(s.note || '—')}</div>
          </div>
          ${s.review_note ? `<div class="ad-field">
            <div class="ad-label">审核备注</div>
            <div style="font-size:13px;color:var(--ad-text-2)">${esc(s.review_note)}</div>
          </div>` : ''}
        </div>
      </div>

      <div>
        <div class="ad-card">
          <div class="ad-card-head"><h2>处理</h2></div>
          <div class="ad-card-body">
            ${s.status === 'pending' ? `
              <form method="post" action="/admin/submissions/${s.id}/approve" style="margin-bottom:10px">
                <button class="ad-btn ad-btn-primary" type="submit" style="width:100%">${UI.check}通过并收录</button>
              </form>
              <form method="post" action="/admin/submissions/${s.id}/reject">
                <div class="ad-field">
                  <label for="reason">拒绝理由（选填）</label>
                  <input class="ad-input" id="reason" name="reason" placeholder="例如：与已收录工具重复">
                </div>
                <button class="ad-btn ad-btn-danger" type="submit" style="width:100%">拒绝</button>
              </form>
            ` : s.status === 'approved' && s.tool_slug ? `
              <a class="ad-btn ad-btn-primary" href="/tools/${esc(s.tool_slug)}" target="_blank" rel="noopener"
                style="width:100%;margin-bottom:10px">${UI.externalLink}查看已收录页面</a>
              <a class="ad-btn" href="/admin/tools/${s.tool_id}/edit" style="width:100%">${UI.edit}编辑工具</a>
            ` : `<p style="font-size:13px;color:var(--ad-text-3);margin:0 0 12px">该提交已被拒绝。</p>
              <form method="post" action="/admin/submissions/${s.id}/approve">
                <button class="ad-btn" type="submit" style="width:100%">改为收录</button>
              </form>`}
            <form method="post" action="/admin/submissions/${s.id}/delete" style="margin-top:12px"
              data-confirm="删除这条提交记录？">
              <button class="ad-btn ad-btn-ghost ad-btn-sm" type="submit" style="width:100%">${UI.trash}删除记录</button>
            </form>
          </div>
        </div>

        <div class="ad-card" style="margin-top:16px">
          <div class="ad-card-head"><h2>元信息</h2></div>
          <div class="ad-card-body" style="font-size:12.5px;color:var(--ad-text-2);line-height:1.9">
            <div>提交人：${esc(contact)}</div>
            <div>提交时间：${esc(fmtTime(s.created_at))}</div>
            ${s.reviewed_at ? `<div>审核时间：${esc(fmtTime(s.reviewed_at))}</div>` : ''}
            ${s.reviewed_by ? `<div>审核人：${esc(s.reviewed_by)}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
    <div style="margin-top:16px"><a class="ad-btn" href="/admin/submissions">← 返回列表</a></div>
    <style>@media(max-width:1000px){.sub-grid{grid-template-columns:1fr!important}}</style>
  `;

  return adminLayout({
    title: '提交详情',
    breadcrumb: esc(s.name),
    user, env, children, activePath: '/admin/submissions',
  });
}

function submissionPill(status) {
  const map = {
    pending: ['ad-pill-warn', '待审核'],
    approved: ['ad-pill-green', '已收录'],
    rejected: ['ad-pill-gray', '已拒绝'],
  };
  const [cls, label] = map[status] || ['ad-pill-gray', status];
  return `<span class="ad-pill ${cls}">${label}</span>`;
}
