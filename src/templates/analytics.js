// -----------------------------------------------------------------------------
// Admin — 访问统计 (click analytics)
//
// Charts are rendered with ECharts (self-hosted under /assets/echarts.min.js so
// the page never depends on a third-party CDN). The server only emits the
// numbers and a small ECharts option object; all drawing happens client-side.
// -----------------------------------------------------------------------------

import { esc } from '../lib/crypto.js';
import { UI } from '../lib/icons.js';
import { adminLayout } from './admin.js';

const DAY_LABELS = { 7: '近 7 天', 30: '近 30 天', 90: '近 90 天' };

/** Build the shared day axis for D1 + GA so both series align. */
function buildAxis(d1Daily, ga, days) {
  const byDay = new Map((d1Daily || []).map((r) => [r.day, r]));
  const gaOk = !!(ga && ga.ok);

  // Start from the oldest of (D1 data, requested window) and run to today,
  // so an empty D1 still produces a full GA-only chart.
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  let start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  for (const day of byDay.keys()) {
    const d = new Date(day + 'T00:00:00Z');
    if (d < start) start = d;
  }

  const points = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    const row = byDay.get(day);
    points.push({
      day,
      d1Clicks: row ? row.clicks : 0,
      d1Visitors: row ? row.visitors : 0,
      gaClicks: gaOk ? (ga.clicks[day] || 0) : null,
      gaVisitors: gaOk ? (ga.visitors[day] || 0) : null,
    });
  }
  return { points, gaOk };
}

function gaHint(ga) {
  if (!ga) return '未获取到 GA 数据';
  if (ga.reason === 'not_configured') return '尚未配置 GA_PROPERTY_ID / 服务账号';
  if (ga.reason === 'error') return 'GA 接口返回错误（详见服务端日志）';
  return ga.reason || '未知原因';
}

/** ECharts option for the main daily trend chart. */
function trendOption({ points, gaOk }) {
  const days = points.map((p) => p.day);
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      // Show the real date in the header instead of the raw yyyy-mm-dd.
      formatter: undefined,
    },
    legend: {
      data: ['D1 点击', 'D1 访客', ...(gaOk ? ['GA 事件', 'GA 访客'] : [])],
      top: 0,
      itemGap: 18,
      itemWidth: 14,
      itemHeight: 8,
    },
    grid: { left: 44, right: 18, top: 44, bottom: 44 },
    xAxis: {
      type: 'category',
      data: days,
      boundaryGap: true,
      axisLabel: {
        // 11/6 style labels; ECharts drops the rest automatically when tight.
        formatter: (v) => {
          const [, m, d] = String(v).split('-');
          return `${Number(m)}/${Number(d)}`;
        },
      },
      axisTick: { alignWithLabel: true },
    },
    yAxis: [
      { type: 'value', name: '次数', splitLine: { lineStyle: { type: 'dashed' } } },
    ],
    dataZoom: days.length > 20
      ? [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 6 }]
      : [],
    series: [
      {
        name: 'D1 点击',
        type: 'bar',
        barMaxWidth: 18,
        itemStyle: { borderRadius: [3, 3, 0, 0] },
        data: points.map((p) => p.d1Clicks),
      },
      {
        name: 'D1 访客',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        data: points.map((p) => p.d1Visitors),
      },
      ...(gaOk ? [
        {
          name: 'GA 事件',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', width: 2 },
          data: points.map((p) => p.gaClicks),
        },
        {
          name: 'GA 访客',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { type: 'dotted', width: 1.6 },
          data: points.map((p) => p.gaVisitors),
        },
      ] : []),
    ],
  };
}

/** ECharts option for the country breakdown (horizontal bars). */
function countryOption(rows) {
  const data = [...rows].reverse(); // top item ends up at the top
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 44, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
    yAxis: { type: 'category', data: data.map((r) => r.country || '—') },
    series: [{
      type: 'bar',
      barMaxWidth: 16,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', fontSize: 11 },
      data: data.map((r) => r.clicks),
    }],
  };
}

/** ECharts option for the referrer breakdown (horizontal bars). */
function refererOption(rows) {
  const short = (s) => {
    if (!s) return '(未知)';
    try {
      const u = new URL(s);
      return u.hostname.replace(/^www\./, '');
    } catch { return s.length > 28 ? s.slice(0, 28) + '…' : s; }
  };
  const data = [...rows].reverse();
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const i = params[0].dataIndex;
        return `${esc(data[i].source || '—')}<br/>点击：<b>${data[i].clicks}</b>`;
      },
    },
    grid: { left: 8, right: 44, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
    yAxis: { type: 'category', data: data.map((r) => short(r.source)) },
    series: [{
      type: 'bar',
      barMaxWidth: 16,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', fontSize: 11 },
      data: data.map((r) => r.clicks),
    }],
  };
}

/** ECharts option for the top-tools ranking (vertical bars). */
function topToolsOption(rows) {
  const data = [...rows].slice(0, 12).reverse();
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const i = params[0].dataIndex;
        return `${esc(data[i].name)}<br/>点击：<b>${data[i].clicks}</b>　访客：${data[i].visitors}`;
      },
    },
    grid: { left: 8, right: 18, top: 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: data.map((r) => (r.name.length > 14 ? r.name.slice(0, 14) + '…' : r.name)),
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        name: '点击',
        type: 'bar',
        barMaxWidth: 14,
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', fontSize: 11 },
        data: data.map((r) => r.clicks),
      },
    ],
  };
}

export function analyticsPage({ user, env, data, days = 30, flash, ga = null, gaConfigured = false }) {
  const { totals, daily, topTools, byCountry, byReferer } = data;
  const axis = buildAxis(daily, ga, days);
  const peak = axis.points.reduce((m, p) => Math.max(m, p.d1Clicks), 0);
  const avg = axis.points.length ? (totals.clicks / axis.points.length) : 0;
  const ratio = totals.clicks && totals.visitors ? (totals.clicks / totals.visitors).toFixed(2) : '0.00';
  const gaOk = axis.gaOk;

  // GA totals over the same window, for the dual-write comparison.
  const gaClicks = gaOk ? Object.values(ga.clicks).reduce((a, b) => a + b, 0) : 0;
  const gaVisitors = gaOk ? Object.values(ga.visitors).reduce((a, b) => a + b, 0) : 0;
  const diffPct = gaOk && gaClicks > 0
    ? Math.round(((totals.clicks - gaClicks) / gaClicks) * 100)
    : null;

  const stats = [
    { label: '总点击', value: totals.clicks, sub: '「访问」按钮被点击的次数', icon: UI.flame },
    { label: '独立访客', value: totals.visitors, sub: '按浏览器标识去重', icon: UI.users },
    { label: '人均点击', value: ratio, sub: '总点击 ÷ 独立访客', icon: UI.trendUp },
    { label: '涉及工具', value: totals.tools, sub: '本期被访问过的工具数', icon: UI.sparkle },
  ].map((s) => `<div class="ad-stat">
      <div class="ad-stat-label">${s.icon}${esc(s.label)}</div>
      <div class="ad-stat-value">${s.value}</div>
      <div class="ad-stat-sub">${esc(s.sub)}</div>
    </div>`).join('');

  const dayTabs = [7, 30, 90].map((d) =>
    `<a class="ad-btn ad-btn-sm ${d === days ? 'ad-btn-primary' : ''}" href="/admin/analytics?days=${d}">${DAY_LABELS[d]}</a>`
  ).join('');

  const topRows = topTools.map((t, i) => `<tr>
    <td class="ad-cell-rank">${i + 1}</td>
    <td data-label="工具">
      <div class="ad-cell-main">${esc(t.name)}</div>
      <div class="ad-cell-sub">${esc(t.category_name || '未分类')}</div>
    </td>
    <td data-label="状态">${t.status === 'published'
      ? '<span class="ad-pill ad-pill-green">已发布</span>'
      : `<span class="ad-pill ad-pill-warn">${esc(t.status)}</span>`}</td>
    <td class="num" data-label="点击">${t.clicks}</td>
    <td class="num" data-label="访客">${t.visitors}</td>
    <td class="ad-cell-actions-cell">
      <a class="ad-btn ad-btn-sm ad-btn-ghost" href="/tools/${esc(t.slug)}" target="_blank" rel="noopener" title="预览">${UI.externalLink}</a>
    </td>
  </tr>`).join('');

  const chartData = {
    trend: trendOption(axis),
    country: byCountry.length ? countryOption(byCountry) : null,
    referer: byReferer.length ? refererOption(byReferer) : null,
    topTools: topTools.length ? topToolsOption(topTools) : null,
  };

  const children = `
    ${flash ? `<div class="ad-alert ad-alert-${esc(flash.type)}" id="adFlash" data-message="1">${esc(flash.message)}</div>` : ''}
    <div class="ad-toolbar" style="margin-bottom:16px">
      ${dayTabs}
      <span class="spacer" style="flex:1"></span>
      <span class="an-ga ${gaConfigured ? 'is-on' : ''}">
        ${gaConfigured ? '✓ GA4 已接入（数据双写）' : 'GA4 未配置：仅记录本地数据'}
      </span>
    </div>

    <div class="ad-stats">${stats}</div>

    <div class="ad-card" style="margin-bottom:16px">
      <div class="ad-card-head">
        <h2>每日趋势</h2><span class="spacer"></span>
        <span class="an-note">峰值 ${peak} 次 · 日均 ${avg.toFixed(1)} 次</span>
      </div>
      <div class="ad-card-body an-chart-body">
        <div class="an-chart" id="anTrend" data-chart="trend"></div>
        ${gaOk ? '' : `<div class="an-ga-hint">GA 曲线未显示：${esc(gaHint(ga))}</div>`}
      </div>
    </div>

    <div class="an-grid-3">
      <div class="ad-card">
        <div class="ad-card-head"><h2>D1 自有统计</h2></div>
        <div class="ad-card-body an-cmp">
          <div class="an-cmp-rows">
            <div class="an-cmp-row"><span>点击</span><strong>${totals.clicks}</strong></div>
            <div class="an-cmp-row"><span>独立访客</span><strong>${totals.visitors}</strong></div>
          </div>
          <div class="an-cmp-note">实时写入 SQLite，60 秒内同 IP 重复点击去重</div>
        </div>
      </div>
      <div class="ad-card">
        <div class="ad-card-head"><h2>GA4 同源数据</h2></div>
        <div class="ad-card-body an-cmp">
          ${gaOk ? `
          <div class="an-cmp-rows">
            <div class="an-cmp-row"><span>事件数</span><strong>${gaClicks}</strong></div>
            <div class="an-cmp-row"><span>活跃用户</span><strong>${gaVisitors}</strong></div>
          </div>
          <div class="an-cmp-note">来自 GA4 Data API，统计延迟约 1–2 天</div>` : `
          <div class="an-cmp-empty">${esc(gaHint(ga))}</div>`}
        </div>
      </div>
      <div class="ad-card">
        <div class="ad-card-head"><h2>双写一致性</h2></div>
        <div class="ad-card-body an-cmp">
          ${diffPct === null ? '<div class="an-cmp-empty">暂无可比数据</div>' : `
          <div class="an-cmp-rows">
            <div class="an-cmp-row"><span>D1 相对 GA</span>
              <strong class="${Math.abs(diffPct) <= 10 ? 'is-good' : 'is-warn'}">${diffPct > 0 ? '+' : ''}${diffPct}%</strong></div>
          </div>
          <div class="an-cmp-note">差异来自 GA 的延迟与去重算法不同，±10% 以内属正常</div>`}
        </div>
      </div>
    </div>

    <div class="an-grid-2">
      <div class="ad-card">
        <div class="ad-card-head"><h2>国家 / 地区</h2></div>
        <div class="ad-card-body">
          ${chartData.country
            ? '<div class="an-chart-sm" data-chart="country"></div>'
            : '<div class="an-empty-sub">暂无来源数据</div>'}
        </div>
      </div>
      <div class="ad-card">
        <div class="ad-card-head"><h2>来源页面</h2></div>
        <div class="ad-card-body">
          ${chartData.referer
            ? '<div class="an-chart-sm" data-chart="referer"></div>'
            : '<div class="an-empty-sub">暂无来源数据</div>'}
        </div>
      </div>
    </div>

    <div class="ad-card" style="margin-top:16px">
      <div class="ad-card-head">
        <h2>热门工具 Top 12</h2><span class="spacer"></span>
        <a class="ad-btn ad-btn-sm" href="/admin/tools?sort=visits">完整排行</a>
      </div>
      <div class="ad-card-body">
        ${chartData.topTools
          ? '<div class="an-chart-top" data-chart="topTools"></div>'
          : '<div class="an-empty-sub">还没有点击数据</div>'}
      </div>
    </div>

    <div class="ad-card" style="margin-top:16px">
      <div class="ad-card-head">
        <h2>点击明细排行</h2><span class="spacer"></span>
        <span class="an-note">按点击降序 · 最多 20 条</span>
      </div>
      <div class="ad-table-wrap" data-fixed-table>
        <table class="ad-table">
          <thead><tr>
            <th class="ad-cell-rank">#</th><th>工具</th><th>状态</th>
            <th class="num">点击</th><th class="num">访客</th><th></th>
          </tr></thead>
          <tbody>${topRows || `<tr><td colspan="6"><div class="ad-empty">
            ${UI.chart}<h3>还没有点击数据</h3>
            <p>数据来自前台的「访问」按钮，上线后会自动积累。</p></div></td></tr>`}</tbody>
        </table>
      </div>
    </div>

    <script src="/assets/echarts.min.js" defer></script>
    <script id="anChartData" type="application/json">${JSON.stringify(chartData).replace(/</g, '\\u003c')}</script>
    <script src="/assets/admin-analytics.js" defer></script>
  `;

  return adminLayout({
    title: '访问统计',
    breadcrumb: `${DAY_LABELS[days]} · 点击与访客分析`,
    user, env, children, activePath: '/admin/analytics',
  });
}
