/* ==========================================================================
   SoMarkIt — public site behaviour
   Progressive enhancement: everything renders server-side, this only adds
   search / filtering / sidebar / theme interactions.
   ========================================================================== */
(function () {
  'use strict';

  var THEME_KEY = 'somarkit-theme';
  var COLLAPSE_KEY = 'somarkit-sidebar-collapsed';

  /* ---------------------------------------------------------------- theme */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-label', t === 'dark' ? '切换到浅色模式' : '切换到深色模式');
      btns[i].setAttribute('title', t === 'dark' ? '切换到浅色模式' : '切换到深色模式');
      var moon = btns[i].querySelector('.icon-moon');
      var sun = btns[i].querySelector('.icon-sun');
      if (moon) moon.style.display = t === 'dark' ? 'none' : '';
      if (sun) sun.style.display = t === 'dark' ? '' : 'none';
    }
  }
  function toggleTheme() {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(next);
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (el) { e.preventDefault(); toggleTheme(); }
  });
  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');

  /* ----------------------------------------------------- language switcher */
  var L = { expand: '展开侧边栏', collapse: '折叠侧边栏', home: 'SoMarkIt 首页' };
  try {
    if (document.documentElement.getAttribute('data-lang') === 'en') {
      L = { expand: 'Expand sidebar', collapse: 'Collapse sidebar', home: 'SoMarkIt home' };
    }
  } catch (e) {}

  function closeLangMenus() {
    var open = document.querySelectorAll('.lang-switcher.open');
    for (var i = 0; i < open.length; i++) {
      open[i].classList.remove('open');
      var b = open[i].querySelector('.lang-toggle');
      if (b) b.setAttribute('aria-expanded', 'false');
    }
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;
    var toggle = t.closest('.lang-toggle');
    if (toggle) {
      e.preventDefault();
      var sw = toggle.closest('.lang-switcher');
      var wasOpen = sw.classList.contains('open');
      closeLangMenus();
      if (!wasOpen) {
        sw.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      }
      return;
    }
    // Choosing an option navigates to ?lang=<code>; the server persists it.
    if (t.closest('.lang-option')) { closeLangMenus(); return; }
    if (!t.closest('.lang-switcher')) closeLangMenus();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLangMenus();
  });

  /* ------------------------------------------------------- sidebar collapse */
  // Count-label formatters, kept in sync with src/lib/i18n.js.
  var T = {
    toolsCount: function (n) { return '共 ' + n + ' 个工具'; },
    filtered: function (n) { return '筛选出 ' + n + ' 个工具'; },
    total: function (n) { return '共 ' + n + ' 个'; },
    matched: function (n, all) { return '匹配 ' + n + ' / ' + all + ' 个'; },
  };
  try {
    if (document.documentElement.getAttribute('data-lang') === 'en') {
      T = {
        toolsCount: function (n) { return n + ' tools'; },
        filtered: function (n) { return n + ' tools matched'; },
        total: function (n) { return n + ' total'; },
        matched: function (n, all) { return n + ' of ' + all; },
      };
    }
  } catch (e) {}
  function setCollapsed(v) {
    document.body.classList.toggle('sidebar-collapsed', v);
    try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0'); } catch (e) {}
    var btn = document.getElementById('sidebarCollapse');
    if (btn) {
      btn.setAttribute('aria-expanded', v ? 'false' : 'true');
      btn.setAttribute('title', v ? L.expand : L.collapse);
      btn.setAttribute('aria-label', v ? L.expand : L.collapse);
    }
    // When collapsed the logo doubles as the expand control, so reflect that
    // in its hint text for both mouse and screen-reader users.
    var brand = document.getElementById('sidebarBrand');
    if (brand) {
      brand.setAttribute('title', v ? L.expand : 'SoMarkIt');
      brand.setAttribute('aria-label', v ? L.expand : L.home);
    }
    syncTopbarToggle();
  }
  function isCollapsed() { return document.body.classList.contains('sidebar-collapsed'); }

  // On small screens the same button opens/closes the drawer.
  function syncTopbarToggle() {
    var b = document.getElementById('sidebarToggle');
    if (!b) return;
    var open = document.body.classList.contains('sidebar-open');
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  try {
    if (localStorage.getItem(COLLAPSE_KEY) === '1' && window.innerWidth > 900) {
      document.body.classList.add('sidebar-collapsed');
    }
  } catch (e) {}

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;

    if (t.closest('#sidebarCollapse')) {
      e.preventDefault();
      setCollapsed(!isCollapsed());
      return;
    }
    // Collapsed rail: the logo becomes the expand affordance instead of a
    // home link (clicking a "home" icon that looks disabled is confusing).
    if (t.closest('#sidebarBrand') && isCollapsed()) {
      e.preventDefault();
      setCollapsed(false);
      return;
    }
    if (t.closest('#sidebarToggle')) {
      e.preventDefault();
      document.body.classList.toggle('sidebar-open');
      syncTopbarToggle();
      return;
    }
    if (t.closest('#sidebarOverlay') || t.closest('#sidebarClose')) {
      document.body.classList.remove('sidebar-open');
      syncTopbarToggle();
      return;
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) {
      document.body.classList.remove('sidebar-open');
      syncTopbarToggle();
    }
  });

  /* ------------------------------------------------------- filter + search */
  var state = { q: '', category: 'all', pricing: 'all' };
  var BASE_TITLE = document.title;

  var container = document.getElementById('toolsContainer');
  var cards = container ? Array.prototype.slice.call(container.querySelectorAll('.tool-card')) : [];
  var sections = container ? Array.prototype.slice.call(container.querySelectorAll('.category-section')) : [];
  var emptyEl = document.getElementById('emptyState');
  var countEl = document.getElementById('toolsCount');

  // Build a search haystack once, up-front.
  cards.forEach(function (c) {
    c._hay = (c.getAttribute('data-search') || '').toLowerCase();
  });

  function applyFilters() {
    if (!container) return;
    var q = state.q.trim().toLowerCase();
    var shown = 0;

    cards.forEach(function (c) {
      var okQ = !q || c._hay.indexOf(q) !== -1;
      var okCat = state.category === 'all' || c.getAttribute('data-category') === state.category;
      var okPrice = state.pricing === 'all' || c.getAttribute('data-pricing') === state.pricing;
      var show = okQ && okCat && okPrice;
      c.style.display = show ? '' : 'none';
      if (show) shown++;
    });

    sections.forEach(function (s) {
      var any = s.querySelectorAll('.tool-card:not([style*="display: none"])').length > 0;
      var okCat = state.category === 'all' || s.getAttribute('data-category') === state.category;
      s.style.display = okCat && any ? '' : 'none';
      var cnt = s.querySelector('.cat-count');
      if (cnt) {
        var total = s.getAttribute('data-total');
        var n = s.querySelectorAll('.tool-card:not([style*="display: none"])').length;
        cnt.textContent = (n === +(total || 0)) ? T.total(n) : T.matched(n, total);
      }
    });

    if (emptyEl) emptyEl.style.display = shown === 0 ? '' : 'none';
    if (countEl) {
      countEl.textContent = (q || state.category !== 'all' || state.pricing !== 'all')
        ? T.filtered(shown)
        : T.toolsCount(shown);
    }
  }

  function setCategory(cat) {
    state.category = cat;
    var items = document.querySelectorAll('.category-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('active', items[i].getAttribute('data-category') === cat);
    }
    applyFilters();
  }

  function setPricing(p) {
    state.pricing = p;
    var chips = document.querySelectorAll('[data-pricing-filter]');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('active', chips[i].getAttribute('data-pricing-filter') === p);
    }
    applyFilters();
  }

  /**
   * Apply a filter change without scrolling the page.
   *
   * Category switching must never scroll. The browser only moves the viewport
   * on its own when the filtered document becomes shorter than the current
   * scroll offset — it clamps to the new maximum, which can leave the user
   * looking at an arbitrary spot near the bottom of the shortened page.
   *
   * We cannot prevent that clamp, but we can make the result sane: when a
   * clamp happens, we position the *filtered list* so its first section starts
   * right below the sticky topbar. The user then lands on the top of the
   * results they just asked for instead of a random offset.
   *
   * If no clamp occurs, we do nothing at all — the viewport stays put.
   */
  function withScrollAnchor(mutate) {
    var prevY = window.scrollY;
    mutate();

    var maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    // The user's offset survived: do not touch anything.
    if (prevY <= maxScroll) return;
    // Already at (or above) the new top area: nothing to fix.
    if (window.scrollY < maxScroll - 1) return;

    // Clamped. Anchor the first visible section header under the sticky bar.
    var firstSection = container && container.querySelector('.category-section');
    if (!firstSection || firstSection.style.display === 'none') return;
    var sticky = window.innerWidth > 900 ? 64 : 56;
    var target = firstSection.getBoundingClientRect().top + window.scrollY - sticky - 10;
    target = Math.max(0, Math.min(target, maxScroll));
    if (Math.abs(target - window.scrollY) > 1) window.scrollTo(0, target);
  }

  /**
   * Paint the category rail selection immediately, before any navigation.
   * Full-page navigation normally leaves the old selection visible until the
   * new document loads, which feels unresponsive on a slow connection.
   */
  function markCategorySelected(cat) {
    var items = document.querySelectorAll('.category-item');
    for (var i = 0; i < items.length; i++) {
      var on = items[i].getAttribute('data-category') === cat;
      items[i].classList.toggle('active', on);
      if (on) items[i].setAttribute('aria-current', 'page');
      else items[i].removeAttribute('aria-current');
    }
  }

  /**
   * Toggle the full-screen loader while a document navigation is in flight.
   * The markup ships in the HTML, so this only flips a class.
   */
  function setContentLoading(on) {
    document.body.classList.toggle('is-loading', on);
    var main = document.getElementById('main-content');
    if (main) main.setAttribute('aria-busy', on ? 'true' : 'false');
    var loader = document.getElementById('pageLoader');
    if (loader) loader.setAttribute('aria-hidden', on ? 'false' : 'true');
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;

    var catEl = t.closest('[data-category]:not(.tool-card):not(.category-section)');
    if (catEl && catEl.classList.contains('category-item')) {
      var cat = catEl.getAttribute('data-category');
      var target = cat === 'all' ? '/' : '/' + encodeURIComponent(cat);

      // Every listing page ships the full catalogue, so switching category is
      // always a client-side view change: no navigation, no loader, no wait.
      // Pages without a listing (tool detail, about, 404) still navigate.
      if (container) {
        e.preventDefault();
        withScrollAnchor(function () { setCategory(cat); });
        document.body.classList.remove('sidebar-open');
        syncTopbarToggle();
        // Keep the address bar shareable without reloading the document.
        if (window.history && window.history.pushState) {
          try { window.history.pushState({ cat: cat }, '', target); } catch (err) { /* ignore */ }
        }
        document.title = cat === 'all'
          ? BASE_TITLE
          : (catEl.querySelector('.cat-name') || {}).textContent + ' — SoMarkIt';
      } else {
        e.preventDefault();
        markCategorySelected(cat);
        document.body.classList.remove('sidebar-open');
        syncTopbarToggle();
        setContentLoading(true);
        // Two frames so the rail selection and the loader paint first.
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { window.location.href = target; });
        });
      }
      return;
    }

    var pChip = t.closest('[data-pricing-filter]');
    if (pChip) {
      e.preventDefault();
      withScrollAnchor(function () { setPricing(pChip.getAttribute('data-pricing-filter')); });
      return;
    }

    var clearBtn = t.closest('[data-clear-filters]');
    if (clearBtn) {
      e.preventDefault();
      withScrollAnchor(function () {
        state.q = '';
        var inputs = document.querySelectorAll('.js-search');
        for (var i = 0; i < inputs.length; i++) inputs[i].value = '';
        setCategory('all');
        setPricing('all');
      });
      return;
    }
  });

  // Search inputs (hero + topbar stay in sync)
  var searchInputs = Array.prototype.slice.call(document.querySelectorAll('.js-search'));

  /**
   * Swap the hero placeholder for a shorter variant when the field is too
   * narrow for the full hint, so it is never clipped mid-word.
   */
  function syncPlaceholder() {
    for (var i = 0; i < searchInputs.length; i++) {
      var input = searchInputs[i];
      var short = input.getAttribute('data-ph-short');
      if (!short) continue;
      if (!input._phFull) input._phFull = input.getAttribute('placeholder');
      // Usable text width ≈ rendered width minus left/right padding.
      var cs = getComputedStyle(input);
      var usable = input.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
      // ~14px per CJK glyph + a safety margin.
      var needFull = input._phFull.length * 15 + 8;
      input.setAttribute('placeholder', usable >= needFull ? input._phFull : short);
    }
  }
  if (searchInputs.length) {
    syncPlaceholder();
    window.addEventListener('resize', syncPlaceholder);
  }

  var debounce;
  searchInputs.forEach(function (input) {
    input.addEventListener('input', function () {
      var v = input.value;
      searchInputs.forEach(function (o) { if (o !== input) o.value = v; });
      clearTimeout(debounce);
      debounce = setTimeout(function () {
        if (container) {
          state.q = v;
          if (v) setCategory('all');
          applyFilters();
        }
      }, 110);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') {
        input.value = '';
        searchInputs.forEach(function (o) { o.value = ''; });
        if (container) { state.q = ''; applyFilters(); }
      }
    });
  });

  // Prefill from ?q=
  try {
    var params = new URLSearchParams(location.search);
    var q0 = params.get('q');
    if (q0) {
      searchInputs.forEach(function (o) { o.value = q0; });
      state.q = q0;
      if (container) applyFilters();
    }
  } catch (e) {}

  // Server-rendered initial category (when landing on /<slug>)
  if (container) {
    var active = document.querySelector('.category-item.active');
    // Prefer the server-provided active slug: on category pages the rail has
    // more entries than the initially visible section.
    var serverActive = container.getAttribute('data-active');
    state.category = serverActive || (active ? active.getAttribute('data-category') : 'all') || 'all';
    applyFilters();
  }

  // Keep the listing in sync when the user moves through history (back /
  // forward after a client-side category switch).
  window.addEventListener('popstate', function () {
    if (!container) return;
    var slug = location.pathname.replace(/^\/+|\/+$/g, '') || 'all';
    if (slug === 'all') state.category = 'all';
    else if (document.getElementById('cat-' + slug)) state.category = slug;
    else return; // not a listing route; let the browser handle it
    var items = document.querySelectorAll('.category-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('active', items[i].getAttribute('data-category') === state.category);
    }
    applyFilters();
  });

  /* ------------------------------------------------------------ topbar cue */
  var topbar = document.getElementById('navbar');
  if (topbar) {
    var onScroll = function () {
      topbar.classList.toggle('scrolled', window.scrollY > 4);
      var btt = document.getElementById('backToTop');
      if (btt) btt.classList.toggle('show', window.scrollY > 640);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#backToTop')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  /* -------------------------------------------------------- visit tracking */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.tool-visit-btn[data-tool-id]');
    if (!a) return;
    var id = a.getAttribute('data-tool-id');
    try {
      var body = JSON.stringify({ id: Number(id) });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      }
    } catch (err) {}
  });
})();
