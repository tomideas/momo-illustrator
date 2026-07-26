/* Momo Tools Docs — sidebar nav, search, scroll spy, collapsible groups */
try {
(function () {
  var sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  setupMenuToggle();
  setupSearch();
  setupScrollSpy();
  setupNavToggles();
  restoreCollapseState();
  setupParentButtons();

  function setupMenuToggle() {
    var toggle = document.querySelector('.menu-toggle');
    var backdrop = document.querySelector('.backdrop');
    if (!toggle || !sidebar) return;
    function close() { sidebar.classList.remove('open'); if (backdrop) backdrop.classList.remove('show'); }
    toggle.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      if (backdrop) backdrop.classList.toggle('show');
    });
    if (backdrop) backdrop.addEventListener('click', close);
    sidebar.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
  }

  function setupSearch() {
    var input = document.querySelector('.sidebar-search input');
    if (!input) return;
    var links = document.querySelectorAll('.sidebar a[href^="#"]');
    var groups = document.querySelectorAll('.sidebar .group-title');
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      links.forEach(function (a) {
        a.classList.toggle('hidden', q !== '' && a.textContent.toLowerCase().indexOf(q) === -1);
      });
      groups.forEach(function (g) {
        var next = g.nextElementSibling;
        var found = false;
        while (next && next.classList && !next.classList.contains('group-title')) {
          if (next.tagName === 'A' && !next.classList.contains('hidden')) { found = true; break; }
          next = next.nextElementSibling;
        }
        g.style.display = found ? '' : 'none';
      });
    });
  }

  function setupScrollSpy() {
    var navLinks = document.querySelectorAll('.sidebar a[href^="#"]');
    var navToggles = document.querySelectorAll('.sidebar button.nav-toggle[data-target]');
    var sections = [];
    navLinks.forEach(function (a) {
      var el = document.querySelector(a.getAttribute('href'));
      if (el) sections.push(el);
    });

    function setActive(id) {
      navLinks.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href') === '#' + id);
      });
      navToggles.forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-target') === id);
      });
    }

    setActive(location.hash.replace('#', ''));

    if (sections.length && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
            expandParentForHash(entry.target.id);
          }
        });
      }, { rootMargin: '-20% 0px -60% 0px' });
      sections.forEach(function (s) { observer.observe(s); });
    }

    navLinks.forEach(function (a) {
      a.addEventListener('click', function () {
        expandParentForHash(a.getAttribute('href').slice(1));
      });
    });
  }

  /* Click on parent toggle (label) -> jump to target + ensure expanded */
  function setupParentButtons() {
    document.querySelectorAll('.sidebar button.nav-toggle[data-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-toggle');
        var target = btn.getAttribute('data-target');
        var isOpen = btn.getAttribute('aria-expanded') === 'true';

        if (target) {
          var el = document.getElementById(target);
          if (el) {
            history.pushState(null, '', '#' + target);
            el.scrollIntoView();
          }
        }

        if (!isOpen) {
          applyCollapse(key, true);
          openSet[key] = true;
          saveState();
        }
      });
    });
  }

  var storageKey = 'momo-docs-sidebar';
  var openSet = {};

  function loadState() {
    try { openSet = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (e) { openSet = {}; }
  }
  function saveState() {
    try { localStorage.setItem(storageKey, JSON.stringify(openSet)); } catch (e) {}
  }

  function applyCollapse(key, expanded) {
    var panel = document.querySelector('[data-children="' + key + '"]');
    var btn = document.querySelector('[data-toggle="' + key + '"]');
    if (!panel || !btn) return;
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    panel.classList.toggle('open', expanded);
  }

  function setupNavToggles() {
    /* no-op: chevron interaction handled inside setupParentButtons via the same button;
       if a toggle has no data-target, fall back to pure toggle */
    document.querySelectorAll('.sidebar button.nav-toggle:not([data-target])').forEach(function (btn) {
      var key = btn.getAttribute('data-toggle');
      btn.addEventListener('click', function () {
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        var next = !isOpen;
        applyCollapse(key, next);
        openSet[key] = next;
        saveState();
      });
    });
  }

  function restoreCollapseState() {
    loadState();
    document.querySelectorAll('.sidebar button.nav-toggle').forEach(function (btn) {
      var key = btn.getAttribute('data-toggle');
      applyCollapse(key, !!openSet[key]);
    });
    expandParentForHash(location.hash.replace('#', ''));
  }

  /* Expand a sidebar group whose children link to the given hash */
  function expandParentForHash(id) {
    if (!id) return;
    document.querySelectorAll('.sidebar .nav-children').forEach(function (panel) {
      var key = panel.getAttribute('data-children');
      var hasMatch = panel.querySelector('a[href="#' + id + '"]');
      if (hasMatch && !panel.classList.contains('open')) {
        applyCollapse(key, true);
        openSet[key] = true;
        saveState();
      }
    });
  }
})();
} catch (e) { console.error('[momo-docs]', e.message, e.stack); }
