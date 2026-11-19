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
    var btns = document.querySelectorAll('[data-ad-collapse]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-expanded', v ? 'false' : 'true');
      btns[i].setAttribute('title', v ? '展开侧边栏 (Ctrl+B)' : '折叠侧边栏 (Ctrl+B)');
      btns[i].setAttribute('aria-label', v ? '展开侧边栏' : '折叠侧边栏');
    }
    // The logo becomes the expand control while the rail is collapsed.
    var brand = document.getElementById('adBrand');
    if (brand) brand.setAttribute('title', v ? '展开侧边栏' : 'SoMarkIt 管理后台');
  }
  function isCollapsed() { return shell && shell.classList.contains('collapsed'); }

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
    if (t.closest('#adBrand') && isCollapsed()) {
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
      e.preventDefault();
      setCollapsed(!isCollapsed());
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 900 && shell) shell.classList.remove('nav-open');
  });

  /* --------------------------------------------------------- confirmations */
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.dataset) return;
    var msg = form.getAttribute('data-confirm');
    if (msg && !window.confirm(msg)) {
      e.preventDefault();
      return;
    }
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
    if (a && !window.confirm(a.getAttribute('data-confirm'))) e.preventDefault();
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
  // Mark the current sidebar link active based on pathname
  var path = location.pathname;
  var links = document.querySelectorAll('.ad-nav-item[data-match]');
  var best = null, bestLen = -1;
  for (var i = 0; i < links.length; i++) {
    var m = links[i].getAttribute('data-match');
    if (path === m || (m !== '/admin' && path.indexOf(m) === 0)) {
      if (m.length > bestLen) { best = links[i]; bestLen = m.length; }
    }
  }
  for (var j = 0; j < links.length; j++) links[j].classList.remove('active');
  if (best) best.classList.add('active');
})();
