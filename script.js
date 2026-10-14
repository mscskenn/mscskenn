/**
 * John Kenneth Moscosa — Portfolio (editor theme)
 * 1. Scroll spy: highlights the current "file" in the explorer and updates the breadcrumb.
 * 2. Keeps the footer year current.
 * The page works fully without JavaScript; this only adds the live highlights.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    initScrollSpy();
    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  });

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
