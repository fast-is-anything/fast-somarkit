/* ==========================================================================
   SoMarkIt — admin analytics charts (ECharts)

   The server renders the chart options into a JSON <script> tag; this file
   mounts them. Keeping the option objects server-side means the numbers the
   chart draws are exactly the numbers the page shows, with no extra fetch.
   ========================================================================== */
(function () {
  'use strict';

  if (typeof echarts === 'undefined') return;

  var dataEl = document.getElementById('anChartData');
  if (!dataEl) return;

  var data;
  try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }

  var isDark = function () {
    return document.documentElement.getAttribute('data-ad-theme') === 'dark';
  };

  /* Read the admin theme tokens so the charts follow light/dark exactly. */
  function palette() {
    var cs = getComputedStyle(document.documentElement);
    var v = function (name, fallback) {
      var x = cs.getPropertyValue(name).trim();
      return x || fallback;
    };
    return {
      primary: v('--ad-primary', '#6366F1'),
      text: v('--ad-text', '#0F172A'),
      text2: v('--ad-text-2', '#44403C'),
      text3: v('--ad-text-3', '#78716C'),
      border: v('--ad-border', '#E7E5E4'),
      surface: v('--ad-surface', '#FFFFFF'),
      success: '#10B981',
      danger: '#EF4444',
      warn: '#F59E0B',
    };
  }

  var instances = {};

  function mount(el, option) {
    if (!el) return;
    var chart = echarts.init(el, null, { renderer: 'canvas' });
    chart.setOption(option);
    instances[el.id || Math.random()] = chart;
    return chart;
  }

  /* Apply the theme to every option: axis/label colours, series colours. */
  function themed(option, type) {
    var c = palette();
    var base = {
      backgroundColor: 'transparent',
      textStyle: { color: c.text2, fontFamily: 'inherit' },
      color: [c.primary, c.warn, c.success, c.danger],
    };
    var merged = Object.assign({}, base, option);

    merged.tooltip = Object.assign({
      backgroundColor: c.surface,
      borderColor: c.border,
      textStyle: { color: c.text, fontSize: 12 },
    }, option.tooltip || {});

    var axisStyle = {
      axisLine: { lineStyle: { color: c.border } },
      axisLabel: { color: c.text3, fontSize: 11 },
      splitLine: { lineStyle: { color: c.border, type: 'dashed' } },
    };
    var xa = merged.xAxis, ya = merged.yAxis;
    if (xa) merged.xAxis = Object.assign({}, axisStyle, xa);
    if (ya) merged.yAxis = Object.assign({}, axisStyle, ya);

    if (merged.legend) {
      merged.legend = Object.assign({ textStyle: { color: c.text2, fontSize: 12 } }, merged.legend);
    }
    return merged;
  }

  function renderAll() {
    var trendEl = document.querySelector('[data-chart="trend"]');
    if (trendEl && data.trend) {
      if (instances.trend) instances.trend.dispose();
      instances.trend = echarts.init(trendEl, null, { renderer: 'canvas' });
      instances.trend.setOption(themed(data.trend, 'trend'));
    }

    ['country', 'referer', 'topTools'].forEach(function (key) {
      var el = document.querySelector('[data-chart="' + key + '"]');
      if (!el || !data[key]) return;
      if (instances[key]) instances[key].dispose();
      instances[key] = echarts.init(el, null, { renderer: 'canvas' });
      instances[key].setOption(themed(data[key], key));
    });
  }

  function resizeAll() {
    Object.keys(instances).forEach(function (k) {
      if (instances[k]) instances[k].resize();
    });
  }

  renderAll();
  window.addEventListener('resize', resizeAll);

  /* Re-themed when the admin toggles dark mode. */
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-ad-theme-toggle]')) {
      setTimeout(renderAll, 50);
    }
  });
})();
