/**
 * John Kenneth Moscosa — Portfolio (editor theme)
 * 1. Theme toggle: light/dark, remembered in localStorage when available.
 * 2. Mobile menu: the explorer becomes a dropdown under 640px.
 * 3. Scroll spy: highlights the current "file" in the explorer and updates the breadcrumb.
 * 4. Lightbox: enlarges certificate images on the credentials page.
 * 5. Keeps the footer year current.
 * The pages work fully without JavaScript; this only adds the extras.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileNav();
    initScrollSpy();
    initLightbox();
    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  });

  function initTheme() {
    const root = document.documentElement;
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    const colors = { dark: '#0B0E13', light: '#F6F7F9' };

    function apply(theme) {
      root.setAttribute('data-theme', theme);
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
      if (meta) meta.setAttribute('content', colors[theme]);
    }

    apply(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      apply(next);
      try {
        localStorage.setItem('theme', next);
      } catch (e) {
        // Storage blocked: the choice still holds for this visit.
      }
    });
  }

  function initMobileNav() {
    const btn = document.getElementById('menu-toggle');
    const panel = document.getElementById('explorer');
    if (!btn || !panel) return;
    const phone = window.matchMedia('(max-width: 639px)');

    function setOpen(open, returnFocus) {
      panel.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (open) {
        const first = panel.querySelector('.explorer-link');
        if (first) first.focus();
      } else if (returnFocus) {
        btn.focus();
      }
    }

    btn.addEventListener('click', () => setOpen(!panel.classList.contains('is-open')));

    panel.addEventListener('click', (event) => {
      if (phone.matches && event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && panel.classList.contains('is-open')) setOpen(false, true);
    });

    document.addEventListener('click', (event) => {
      if (!panel.classList.contains('is-open')) return;
      if (panel.contains(event.target) || btn.contains(event.target)) return;
      setOpen(false);
    });

    phone.addEventListener('change', () => setOpen(false));
  }

  function initLightbox() {
    const dialog = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    if (!dialog || !img || typeof dialog.showModal !== 'function') return;
    let opener = null;

    document.querySelectorAll('[data-lightbox]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const thumb = btn.querySelector('img');
        img.src = btn.dataset.full;
        img.alt = thumb ? thumb.alt : '';
        opener = btn;
        dialog.showModal();
      });
    });

    // Clicks on the backdrop land on the dialog element itself (it has no padding).
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener('close', () => {
      img.removeAttribute('src');
      if (opener) opener.focus();
      opener = null;
    });
  }

  function initScrollSpy() {
    const links = Array.from(document.querySelectorAll('.explorer-link[href^="#"]'));
    const crumb = document.getElementById('breadcrumb-current');
    if (!links.length) return;

    // Each link points at a section or article; keep only targets that exist.
    const targets = links
      .map((link) => ({ link, el: document.querySelector(link.getAttribute('href')) }))
      .filter((t) => t.el);

    function setActive(active) {
      targets.forEach(({ link }) => {
        const on = link === active;
        link.classList.toggle('is-active', on);
        if (on) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
      if (crumb && active) crumb.textContent = active.dataset.file || active.textContent.trim();
    }

    function update() {
      const probe = window.scrollY + 140;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = targets[0];

      if (atBottom) {
        current = targets[targets.length - 1];
      } else {
        // The last target whose top is above the probe line wins, so nested
        // articles (thready) take over from their parent section.
        targets.forEach((t) => {
          const top = t.el.getBoundingClientRect().top + window.scrollY;
          if (top <= probe) current = t;
        });
      }
      setActive(current.link);
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
})();
