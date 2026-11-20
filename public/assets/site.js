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
  // Per-language strings for the shell controls. Keyed by the code in
  // <html data-lang>, which the server sets from LANGS in src/lib/i18n.js.
  var LANG_STRINGS = {
    zh: { expand: '展开侧边栏', collapse: '折叠侧边栏', home: 'SoMarkIt 首页' },
    en: { expand: 'Expand sidebar', collapse: 'Collapse sidebar', home: 'SoMarkIt home' },
    ja: { expand: 'サイドバーを開く', collapse: 'サイドバーを閉じる', home: 'SoMarkIt ホーム' },
    ko: { expand: '사이드바 펼치기', collapse: '사이드바 접기', home: 'SoMarkIt 홈' },
  };
  function currentLang() {
    try { return document.documentElement.getAttribute('data-lang') || 'zh'; } catch (e) { return 'zh'; }
  }
  var L = LANG_STRINGS[currentLang()] || LANG_STRINGS.zh;

  // Locale prefix used by every internal URL (/zh, /en, /ja, /ko — keep in
  // sync with LANGS in src/lib/i18n.js).
  var LOCALE_RE = /^\/(zh|en|ja|ko)(?=\/|$)/;

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
    // Language options are ordinary links to the same page in the other
    // locale (/zh/… ⇄ /en/…), so let the browser follow them.
    if (t.closest('.lang-option')) { closeLangMenus(); return; }
    if (!t.closest('.lang-switcher')) closeLangMenus();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLangMenus();
  });

  /* ------------------------------------------------------- sidebar collapse */
  // Count-label formatters for the page-level counter, kept in sync with
  // src/lib/i18n.js. Section headers no longer show a per-category count.
  var COUNT_STRINGS = {
    zh: {
      toolsCount: function (n) { return '共 ' + n + ' 个工具'; },
      filtered: function (n) { return '筛选出 ' + n + ' 个工具'; },
    },
    en: {
      toolsCount: function (n) { return n + ' tools'; },
      filtered: function (n) { return n + ' tools matched'; },
    },
    ja: {
      toolsCount: function (n) { return '全 ' + n + ' 件のツール'; },
      filtered: function (n) { return n + ' 件が一致'; },
    },
    ko: {
      toolsCount: function (n) { return '총 ' + n + '개 도구'; },
      filtered: function (n) { return n + '개 도구가 일치'; },
    },
  };
  var T = COUNT_STRINGS[currentLang()] || COUNT_STRINGS.zh;
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
    });

    if (emptyEl) emptyEl.style.display = shown === 0 ? '' : 'none';
    if (countEl) {
      countEl.textContent = (q || state.category !== 'all' || state.pricing !== 'all')
        ? T.filtered(shown)
        : T.toolsCount(shown);
    }
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
      // Keep the current locale prefix so the address bar stays in-language.
      var langPrefix = (location.pathname.match(LOCALE_RE) || [''])[0];
      var target = cat === 'all' ? (langPrefix || '/') : langPrefix + '/' + encodeURIComponent(cat);

      // A category switch is always a real navigation.
      //
      // Switching in place used to be a client-side view change, but the views
      // do not share content any more: the "all" view is a fixed preview of nine
      // cards per rail while an open category page streams the rest. Sharing one
      // DOM meant cards streamed into a category stayed behind when the reader
      // went back to "all", so rails ended up with different lengths. A fresh
      // document per view makes that impossible.
      //
      // The rail is highlighted and the loader faded in first, so the click
      // feels immediate even though a navigation is coming.
      e.preventDefault();
      markCategorySelected(cat);
      document.body.classList.remove('sidebar-open');
      syncTopbarToggle();
      setContentLoading(true);
      // Two frames so the rail selection and the loader paint first.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { window.location.href = target; });
      });
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
        // Clears search and price only. The category is a page, not a filter,
        // so it stays where the reader is.
        state.q = '';
        var inputs = document.querySelectorAll('.js-search');
        for (var i = 0; i < inputs.length; i++) inputs[i].value = '';
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
          // Searching must not widen the view: on a category page it filters
          // that category, it does not reveal every other one.
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
  // forward). Category links are real URLs now, so strip the locale prefix
  // before reading the slug.
  window.addEventListener('popstate', function () {
    if (!container) return;
    var slug = location.pathname
      .replace(LOCALE_RE, '')   // drop the locale prefix
      .replace(/^\/+|\/+$/g, '') || 'all';
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
  /*
   * Every click on a tool's "访问" button is sent to /api/track, which records
   * it in D1 and mirrors the same event to GA4. The visitor id is a random
   * value persisted in localStorage so the server can count distinct visitors
   * without storing the raw IP (it only ever sees a salted hash).
   */
  var VISITOR_KEY = 'somarkit-visitor';

  function getVisitorId() {
    try {
      var v = localStorage.getItem(VISITOR_KEY);
      if (v && /^[A-Za-z0-9_-]{8,64}$/.test(v)) return v;
      // crypto.randomUUID is available in every browser that supports
      // sendBeacon; fall back to a timestamp+random mix otherwise.
      var id;
      if (window.crypto && window.crypto.randomUUID) {
        id = window.crypto.randomUUID().replace(/-/g, '');
      } else {
        id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      }
      localStorage.setItem(VISITOR_KEY, id);
      return id;
    } catch (e) {
      return '';
    }
  }

  document.addEventListener('click', function (e) {
    // Any link carrying a tool id is a "visit this tool" action — the card's
    // button, the detail page's CTA and the hostname in the detail meta all
    // qualify. Selecting on the attribute (not a style class) keeps tracking
    // decoupled from how the link happens to look.
    var a = e.target.closest && e.target.closest('a[data-tool-id]');
    if (!a) return;
    var id = Number(a.getAttribute('data-tool-id'));
    if (!(id > 0)) return;

    var payload = JSON.stringify({
      id: id,
      visitor: getVisitorId(),
      path: location.pathname + location.search,
    });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: payload,
          keepalive: true,
        });
      }
    } catch (err) {}
  });

  /* ------------------------------------------- category page infinite scroll */
  /*
   * A category page can be browsed in full; the homepage cannot.
   *
   *   - The homepage renders every rail as a fixed preview and marks nothing,
   *     so nothing here ever runs.
   *   - A category page marks its own section with data-paginate and
   *     data-has-more; a sentinel under that grid pulls the remaining pages.
   *
   * Only ever one section qualifies, because switching category is a real
   * navigation. That is what keeps the two views from sharing state: the "all"
   * view can never inherit cards that a category streamed in.
   */
  (function initRail() {
    if (!('IntersectionObserver' in window)) return;

    /* A section paginates only when the server says so. */
    function paginable(sec) {
      return sec && sec.getAttribute('data-paginate') === '1';
    }

    var localeMatch = location.pathname.match(LOCALE_RE);
    var locale = localeMatch ? localeMatch[1] : 'zh';
    var RAIL_API = '/' + locale + '/api/rail';

    var observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          var sec = entries[i].target.closest('.category-section');
          if (sec) loadMore(sec);
          break;
        }
      }
    }, { rootMargin: '300px 0px' });

    function gridOf(sec) { return sec.querySelector('[data-rail-grid]'); }

    function remaining(sec) {
      var total = parseInt(sec.getAttribute('data-total'), 10);
      var rendered = gridOf(sec) ? gridOf(sec).querySelectorAll('.tool-card').length : 0;
      return Number.isFinite(total) ? total - rendered : 0;
    }

    /** Give a section a sentinel if it still has cards left and lacks one. */
    function arm(sec) {
      if (!paginable(sec) || sec.dataset.done === '1') return;
      if (!gridOf(sec) || remaining(sec) <= 0) return;

      // The server may have rendered the sentinel already; either way it has to
      // be registered with the observer, and a section must not be observed
      // twice.
      var sentinel = sec.querySelector('[data-rail-sentinel]');
      if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.className = 'rail-sentinel';
        sentinel.setAttribute('data-rail-sentinel', '');
        sentinel.setAttribute('aria-hidden', 'true');
        gridOf(sec).insertAdjacentElement('afterend', sentinel);
      }
      if (sentinel.dataset.observed === '1') return;
      sentinel.dataset.observed = '1';
      observer.observe(sentinel);
    }

    function loadMore(sec) {
      if (!paginable(sec)) return;
      if (sec.dataset.loading === '1' || sec.dataset.done === '1') return;
      if (remaining(sec) <= 0) { finish(sec); return; }
      sec.dataset.loading = '1';

      var params = new URLSearchParams({ category: sec.getAttribute('data-category') });
      // No cursor yet? Start after the last card the server rendered.
      if (!sec.dataset.cursor) {
        var cards = gridOf(sec).querySelectorAll('.tool-card');
        var last = cards[cards.length - 1];
        var c = last && last.getAttribute('data-cursor');
        if (c) sec.dataset.cursor = c;
      }
      if (sec.dataset.cursor) params.set('cursor', sec.dataset.cursor);

      fetch(RAIL_API + '?' + params.toString(), { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          sec.dataset.loading = '0';
          if (!data || !data.ok) { finish(sec); return; }

          if (data.html) gridOf(sec).insertAdjacentHTML('beforeend', data.html);

          // data-rendered drives the "are there cards left" check.
          sec.setAttribute('data-rendered', gridOf(sec).querySelectorAll('.tool-card').length);

          if (data.nextCursor) {
            sec.dataset.cursor = data.nextCursor;
            if (remaining(sec) <= 0) finish(sec);
          } else {
            finish(sec);
          }
        })
        .catch(function () { sec.dataset.loading = '0'; });
    }

    function finish(sec) {
      if (!sec) return;
      sec.dataset.done = '1';
      sec.removeAttribute('data-has-more');
      var s = sec.querySelector('[data-rail-sentinel]');
      if (s) { observer.unobserve(s); s.remove(); }
    }

    // Only the section the server marked can paginate, and switching category
    // is a full navigation now, so there is exactly one at load time.
    var initial = document.querySelector('.category-section[data-has-more="1"]');
    if (initial) arm(initial);
  })();
})();
