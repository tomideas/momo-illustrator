/* Momo Tools Docs — sidebar nav, search, scroll spy */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.querySelector('.backdrop');
  if (toggle && sidebar) {
    const close = () => {
      sidebar.classList.remove('open');
      backdrop?.classList.remove('show');
    };
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      backdrop?.classList.toggle('show');
    });
    backdrop?.addEventListener('click', close);
    sidebar.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  }

  const input = document.querySelector('.sidebar-search input');
  if (input) {
    const links = [...document.querySelectorAll('.sidebar a[href^="#"]')];
    const groups = [...document.querySelectorAll('.sidebar .group-title')];
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      links.forEach((a) => {
        const match = !q || a.textContent.toLowerCase().includes(q);
        a.classList.toggle('hidden', !match);
      });
      groups.forEach((g) => {
        let next = g.nextElementSibling;
        let hasVisible = false;
        while (next && !next.classList.contains('group-title')) {
          if (next.tagName === 'A' && !next.classList.contains('hidden')) hasVisible = true;
          next = next.nextElementSibling;
        }
        g.style.display = hasVisible ? '' : 'none';
      });
    });
  }

  const navLinks = [...document.querySelectorAll('.sidebar a[href^="#"]')];
  const sections = navLinks
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  const setActive = (id) => {
    navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  };

  if (sections.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
  }

  const hash = location.hash.replace('#', '');
  if (hash) setActive(hash);

  const openToggleForHash = (id) => {
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    const details = target.tagName === 'DETAILS' ? target : target.closest('details.doc-toggle');
    if (details) details.open = true;
  };

  openToggleForHash(hash);
  window.addEventListener('hashchange', () => openToggleForHash(location.hash.replace('#', '')));
  document.querySelectorAll('.sidebar a[href^="#"]').forEach((a) => {
    a.addEventListener('click', () => {
      const id = a.getAttribute('href').slice(1);
      requestAnimationFrame(() => openToggleForHash(id));
    });
  });
});
