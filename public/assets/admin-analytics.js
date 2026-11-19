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
      wireTrendInteractions(trendEl, instances.trend);
    }

    ['country', 'referer', 'topTools'].forEach(function (key) {
      var el = document.querySelector('[data-chart="' + key + '"]');
      if (!el || !data[key]) return;
      if (instances[key]) instances[key].dispose();
      instances[key] = echarts.init(el, null, { renderer: 'canvas' });
      instances[key].setOption(themed(data[key], key));
    });
  }

  /* ---------------------------------------------------- trend interactions --
   * Zoom and pan are implemented here rather than with ECharts' `inside`
   * dataZoom. `inside` attaches its own wheel handler that calls
   * preventDefault() on every wheel event, so the page stopped scrolling
   * whenever the pointer happened to be over the chart. Here:
   *   • plain wheel  -> do nothing, the page scrolls normally
   *   • Ctrl + wheel -> zoom the time axis around the cursor
   *   • drag         -> pan
   */
  function wireTrendInteractions(el, chart) {
    var current = { start: 0, end: 100 };
    var MIN_SPAN = 5; // never zoom past ~5% of the range

    function apply(start, end) {
      var span = end - start;
      if (span < MIN_SPAN) { span = MIN_SPAN; }
      if (span > 100) { span = 100; }
      // Keep the window inside 0..100.
      var s = Math.min(Math.max(0, start), 100 - span);
      current = { start: s, end: s + span };
      chart.dispatchAction({ type: 'dataZoom', start: current.start, end: current.end });
    }

    function onWheel(e) {
      // Only intercept Ctrl/Option + wheel; let everything else bubble so the
      // page keeps its normal scroll behaviour.
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();

      var opt = chart.getOption();
      var dz = opt.dataZoom && opt.dataZoom[0];
      var start = dz && dz.start != null ? dz.start : current.start;
      var end = dz && dz.end != null ? dz.end : current.end;
      var span = end - start;

      // Zoom around the cursor position so the point under the pointer stays.
      var rect = el.getBoundingClientRect();
      var ratio = rect.width ? (e.clientX - rect.left) / rect.width : 0.5;
      ratio = Math.min(1, Math.max(0, ratio));

      var factor = e.deltaY > 0 ? 1.2 : 1 / 1.2; // wheel down = zoom out
      var newSpan = Math.min(100, Math.max(MIN_SPAN, span * factor));
      var anchor = start + span * ratio;
      apply(anchor - newSpan * ratio, anchor - newSpan * ratio + newSpan);
    }

    // Drag to pan (only when zoomed in enough that panning means something).
    var dragging = false;
    var dragX = 0;
    var dragStart = 0;
    var dragEnd = 100;

    function onDown(e) {
      if (e.button !== 0) return;
      var opt = chart.getOption();
      var dz = opt.dataZoom && opt.dataZoom[0];
      var span = (dz && dz.end != null ? dz.end : 100) - (dz && dz.start != null ? dz.start : 0);
      if (span >= 99.5) return; // fully zoomed out: nothing to pan
      dragging = true;
      dragX = e.clientX;
      dragStart = dz.start;
      dragEnd = dz.end;
      el.style.cursor = 'grabbing';
    }
    function onMove(e) {
      if (!dragging) return;
      var rect = el.getBoundingClientRect();
      if (!rect.width) return;
      var span = dragEnd - dragStart;
      var delta = ((dragX - e.clientX) / rect.width) * span;
      apply(dragStart + delta, dragEnd + delta);
      e.preventDefault();
    }
    function onUp() {
      dragging = false;
      el.style.cursor = '';
    }

    // Listen on the chart element: `wheel` is passive-by-default in Chrome, so
    // preventDefault only works with an explicit non-passive registration.
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    // Keep our state in sync when the slider is used instead.
    chart.on('datazoom', function () {
      if (dragging) return;
      var opt = chart.getOption();
      var dz = opt.dataZoom && opt.dataZoom[0];
      if (dz) current = { start: dz.start, end: dz.end };
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
