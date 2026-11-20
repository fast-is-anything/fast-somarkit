/* ==========================================================================
   SoMarkIt — admin console behaviour
   ========================================================================== */
(function () {
  'use strict';

  var COLLAPSE_KEY = 'somarkit-admin-collapsed';
  var THEME_KEY = 'somarkit-admin-theme';
  var shell = document.getElementById('adShell');

  /* ------------------------------------------------------------ theme --- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-ad-theme', t);
    var moon = document.querySelectorAll('.js-icon-moon');
    var sun = document.querySelectorAll('.js-icon-sun');
    for (var i = 0; i < moon.length; i++) moon[i].style.display = t === 'dark' ? 'none' : '';
    for (var j = 0; j < sun.length; j++) sun[j].style.display = t === 'dark' ? '' : 'none';
  }
  try {
    var t0 = localStorage.getItem(THEME_KEY);
    if (t0 === 'dark' || t0 === 'light') applyTheme(t0);
  } catch (e) {}

  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-ad-theme-toggle]')) {
      e.preventDefault();
      var next = document.documentElement.getAttribute('data-ad-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch (err) {}
      applyTheme(next);
    }
  });

  /* ---------------------------------------------------- sidebar collapse -- */
  function setCollapsed(v) {
    if (!shell) return;
    shell.classList.toggle('collapsed', v);
    try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0'); } catch (e) {}
    // The sidebar collapse button is hidden once collapsed; the logo then
    // takes over as the expand control (see the click handler below).
    var btn = document.querySelector('[data-ad-collapse]');
    if (btn) {
      btn.setAttribute('aria-expanded', v ? 'false' : 'true');
      btn.setAttribute('title', v ? '展开侧边栏 (Ctrl+B)' : '折叠侧边栏 (Ctrl+B)');
      btn.setAttribute('aria-label', v ? '展开侧边栏' : '折叠侧边栏');
    }
    var brand = document.getElementById('adBrand');
    if (brand && v) {
      brand.setAttribute('title', '展开侧边栏 (Ctrl+B)');
      brand.setAttribute('aria-label', '展开侧边栏');
    } else if (brand) {
      brand.setAttribute('title', 'SoMarkIt 管理后台');
      brand.removeAttribute('aria-label');
    }
  }
  function isCollapsed() { return shell && shell.classList.contains('collapsed'); }
  // The off-canvas drawer (<=900px) reuses .collapsed for its animation, but
  // there the collapse controls stay hidden and the logo is a plain link home.
  function isDrawer() { return window.innerWidth <= 900; }

  try {
    if (localStorage.getItem(COLLAPSE_KEY) === '1' && window.innerWidth > 900) {
      setCollapsed(true);
    }
  } catch (e) {}

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;
    if (t.closest('[data-ad-collapse]')) {
      e.preventDefault();
      setCollapsed(!isCollapsed());
      return;
    }
    // Collapsed rail: clicking the logo expands instead of navigating.
    if (t.closest('#adBrand') && isCollapsed() && !isDrawer()) {
      e.preventDefault();
      setCollapsed(false);
      return;
    }
    if (t.closest('[data-ad-nav-open]')) {
      e.preventDefault();
      shell.classList.add('nav-open');
      return;
    }
    if (t.closest('[data-ad-nav-close]') || t.closest('.ad-overlay')) {
      shell.classList.remove('nav-open');
      return;
    }
  });

  document.addEventListener('keydown', function (e) {
    // Ctrl/Cmd + B toggles the sidebar, like an editor
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      if (!shell || isDrawer()) return;
      e.preventDefault();
      setCollapsed(!isCollapsed());
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 900 && shell) shell.classList.remove('nav-open');
  });

  /* ------------------------------------------------------ page transition --
   * Same pattern as the public site: as soon as a sidebar link is clicked the
   * new item becomes active instantly, then the loading overlay fades in while
   * the next document is fetched. Without this the old selection and the old
   * page stay on screen until the network round-trip finishes.
   */
  var navLinks = document.querySelectorAll('.ad-nav-item[data-match]');

  // Longest data-match prefix wins (needed once /admin/tools and /admin/admins
  // both extend /admin).
  function matchNavFor(pathname) {
    var best = null, bestLen = -1;
    for (var i = 0; i < navLinks.length; i++) {
      var m = navLinks[i].getAttribute('data-match');
      if (pathname === m || (m !== '/admin' && pathname.indexOf(m) === 0)) {
        if (m.length > bestLen) { best = navLinks[i]; bestLen = m.length; }
      }
    }
    return best;
  }

  function markNavSelected(link) {
    for (var i = 0; i < navLinks.length; i++) {
      var on = navLinks[i] === link;
      navLinks[i].classList.toggle('active', on);
      if (on) navLinks[i].setAttribute('aria-current', 'page');
      else navLinks[i].removeAttribute('aria-current');
    }
  }

  function setContentLoading(on) {
    if (!document.body) return;
    document.body.classList.toggle('is-loading', on);
    var main = document.getElementById('adContent');
    if (main) main.setAttribute('aria-busy', on ? 'true' : 'false');
    var loader = document.getElementById('adLoader');
    if (loader) loader.setAttribute('aria-hidden', on ? 'false' : 'true');
  }

  function beginNavigation() {
    setContentLoading(true);
    // Let the overlay prove the click landed; if the next document takes
    // longer than this the loader stays up anyway.
    setTimeout(function () {
      var txt = document.querySelector('.ad-loader-text');
      if (txt) txt.textContent = '正在加载…';
    }, 4000);
  }

  function isPlainNavigation(e) {
    return !(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey ||
             e.shiftKey || e.altKey || (e.target && e.target.closest &&
             e.target.closest('[target="_blank"], [data-no-loader]')));
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest || !isPlainNavigation(e)) return;
    var link = t.closest('.ad-nav-item[data-match]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.charAt(0) !== '/') return;

    var here = location.pathname + location.search;
    if (href === here || href === location.pathname) {
      e.preventDefault();
      return;
    }
    // 1) paint the selection, 2) show the loader, 3) navigate after two frames
    //    so both are on screen before the old document is torn down.
    e.preventDefault();
    markNavSelected(link);
    if (shell) shell.classList.remove('nav-open');
    beginNavigation();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { window.location.href = href; });
    });
  });

  // Back/forward restores a cached page; make sure no stale overlay lingers.
  window.addEventListener('pageshow', function () { setContentLoading(false); });
  window.addEventListener('pagehide', function () { setContentLoading(false); });

  /* ------------------------------------------------------------ pager --- */
  // The rows-per-page picker carries the destination URL as its option value.
  document.addEventListener('change', function (e) {
    var sel = e.target;
    if (!sel || !sel.matches || !sel.matches('[data-pager-size]')) return;
    if (sel.value) window.location.href = sel.value;
  });

  /* ------------------------------------------------- fixed table height --- */
  // Every list table gets the same height so the layout doesn't jump between
  // pages with 0 rows and 120 rows. The table takes whatever vertical space is
  // left in the viewport after the chrome above it (topbar, banner, card
  // head, pager, extra cards), which keeps every page scrolling-free.
  //
  // The main column is NOT locked to 100vh any more (that broke long pages on
  // mobile), so available height is derived from the viewport and the elements
  // that sit above the table.
  function fitTable() {
    var wrap = document.querySelector('.ad-table-wrap[data-fixed-table]');
    if (!wrap) return;
    var content = document.querySelector('.ad-content');
    if (!content) return;
    // Below the drawer breakpoint rows become cards and the page scrolls
    // naturally — a fixed height would just waste space.
    if (window.innerWidth <= 900) {
      wrap.style.removeProperty('--ad-table-h');
      return;
    }

    var cs = getComputedStyle(content);
    var padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    var contentBox = content.getBoundingClientRect();

    // Everything in the content column above the list card (banners, stats,
    // toolbars) plus the content's own top padding.
    var aboveCard = 0;
    var card = wrap.parentElement;
    for (var i = 0; i < content.children.length; i++) {
      var el = content.children[i];
      if (el === card) break;
      var ecs = getComputedStyle(el);
      aboveCard += el.getBoundingClientRect().height +
        parseFloat(ecs.marginTop) + parseFloat(ecs.marginBottom);
    }

    // Card chrome: header + pager + borders.
    var chrome = 0;
    for (var j = 0; j < card.children.length; j++) {
      var child = card.children[j];
      if (child === wrap) continue;
      var ccs = getComputedStyle(child);
      chrome += child.getBoundingClientRect().height +
        parseFloat(ccs.marginTop) + parseFloat(ccs.marginBottom);
    }

    // Space between the card top and the bottom of the window.
    var viewportBudget = window.innerHeight - contentBox.top - padY - aboveCard;
    var h = Math.floor(viewportBudget - chrome);

    // Never let the table push the page taller than the viewport; if the
    // window is very short, fall back to a still-scrollable minimum.
    if (h > 120) wrap.style.setProperty('--ad-table-h', h + 'px');
  }
  fitTable();
  window.addEventListener('resize', fitTable);
  // Re-fit once the webfonts/layout settle (heights can shift a few px).
  window.addEventListener('load', fitTable);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTable);

  /* --------------------------------------------------------- confirmations */
  /*
   * `data-confirm="…"` on a form or a link asks before doing something
   * destructive. This used to call window.confirm(), which paints a browser
   * dialog in the OS style and blocks the page. It now opens the same styled
   * <dialog> the rest of the admin uses.
   *
   * Because the custom dialog is asynchronous, the original action is replayed
   * once the user agrees: a hidden `confirmed` flag makes the second pass fall
   * through to the normal behaviour.
   */
  var confirmEl = null;
  var confirmResolve = null;

  function buildConfirmDialog() {
    if (confirmEl) return confirmEl;
    confirmEl = document.createElement('dialog');
    confirmEl.className = 'ad-dialog ad-dialog-confirm';
    confirmEl.innerHTML =
      '<div class="ad-dialog-head"><h2>请确认</h2></div>' +
      '<div class="ad-dialog-body"><p class="ad-confirm-text"></p></div>' +
      '<div class="ad-dialog-foot">' +
        '<button type="button" class="ad-btn" data-confirm-cancel>取消</button>' +
        '<button type="button" class="ad-btn ad-btn-danger" data-confirm-ok>确定</button>' +
      '</div>';
    document.body.appendChild(confirmEl);

    confirmEl.addEventListener('click', function (e) {
      var t = e.target;
      // Answer first, then close: closing fires the `close` handler below,
      // which would otherwise settle the promise as a cancel.
      if (t.closest('[data-confirm-ok]')) { settle(true); closeConfirm(); }
      else if (t.closest('[data-confirm-cancel]')) { settle(false); closeConfirm(); }
      else if (t === confirmEl) { settle(false); closeConfirm(); }   // backdrop
    });
    // ESC closes the dialog natively; treat that as a cancel.
    confirmEl.addEventListener('close', function () { settle(false); });
    return confirmEl;
  }

  function closeConfirm() {
    if (confirmEl && confirmEl.open) confirmEl.close();
  }

  function settle(ok) {
    if (!confirmResolve) return;
    var done = confirmResolve;
    confirmResolve = null;
    done(ok);
  }

  /** Show the dialog; resolves true when the user confirms. */
  function askConfirm(message) {
    var dlg = buildConfirmDialog();
    // The dialog may already be open if a replayed action ran twice.
    if (dlg.open) settle(false);

    dlg.querySelector('.ad-confirm-text').textContent = message || '确定继续吗？';
    // A destructive action gets a red button; everything else stays neutral.
    var ok = dlg.querySelector('[data-confirm-ok]');

    return new Promise(function (resolve) {
      confirmResolve = resolve;
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else resolve(window.confirm(message));   // very old browser fallback
      if (ok) ok.focus();
    });
  }

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.dataset) return;

    var msg = form.getAttribute('data-confirm');
    if (msg && form.dataset.confirmed !== '1') {
      e.preventDefault();
      var pendingForm = form;
      askConfirm(msg).then(function (ok) {
        if (!ok) return;
        pendingForm.dataset.confirmed = '1';
        // requestSubmit() re-runs this handler (which now passes through) and
        // keeps the browser's own validation and submit semantics.
        if (typeof pendingForm.requestSubmit === 'function') pendingForm.requestSubmit();
        else pendingForm.submit();
      });
      return;
    }
    delete form.dataset.confirmed;

    // Guard against double submits
    var submit = form.querySelector('[type="submit"]');
    if (submit) {
      setTimeout(function () {
        submit.disabled = true;
        var original = submit.textContent;
        submit.textContent = '处理中…';
        setTimeout(function () { submit.disabled = false; submit.textContent = original; }, 12000);
      }, 0);
    }
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-confirm]');
    if (!a) return;

    if (a.dataset.confirmed === '1') {
      delete a.dataset.confirmed;
      return;   // second pass: let the navigation happen
    }

    e.preventDefault();
    var pendingLink = a;
    askConfirm(a.getAttribute('data-confirm')).then(function (ok) {
      if (!ok) return;
      pendingLink.dataset.confirmed = '1';
      pendingLink.click();
    });
  });

  /* ---------------------------------------------------------------- toast */
  var toast = document.getElementById('adToast');
  var toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }
  window.__adToast = showToast;

  // Flash messages rendered by the server
  var flash = document.getElementById('adFlash');
  if (flash && flash.dataset.message) {
    setTimeout(function () {
      flash.style.transition = 'opacity .3s ease';
      flash.style.opacity = '0';
      setTimeout(function () { flash.remove(); }, 320);
    }, 3200);
  }

  /* ------------------------------------------------------- copy buttons */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copy]');
    if (!b) return;
    e.preventDefault();
    var text = b.getAttribute('data-copy');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () { showToast('已复制'); });
    }
  });

  /* ---------------------------------------------- nav item active state */
  // Mark the current sidebar link active based on pathname (on first paint the
  // server usually got this right, but a direct hit on a deep link may not).
  var path = location.pathname;
  var best = matchNavFor(path);
  if (best) markNavSelected(best);
})();
