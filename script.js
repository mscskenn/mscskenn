/**
 * John Kenneth Moscosa - Personal Portfolio
 * Vanilla ES6+ Modular Script
 *
 * Features:
 * 1. Dark / Light theme toggle with system preference detection and localStorage persistence.
 * 2. Accessible mobile navigation toggle (Escape and click-outside close).
 * 3. Active navigation link scroll spy.
 * 4. "Path to 2027" timeline chart rendered as inline SVG from the #path-list data.
 */

(function () {
  'use strict';

  const THEME_STORAGE_KEY = 'jkm_portfolio_theme';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const PATH_START = new Date(2023, 0, 1);
  const PATH_END = new Date(2027, 8, 1);
  const CHART_MIN_WIDTH = 232;

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileNav();
    initScrollSpy();
    initPathChart();
  });

  /* ==========================================================================
     1. Theme Toggle (Dark / Light Mode)
     ========================================================================== */
  function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;

    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    let userChose = false;

    function readSavedTheme() {
      try {
        return localStorage.getItem(THEME_STORAGE_KEY);
      } catch (error) {
        return null;
      }
    }

    function saveTheme(theme) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch (error) {
        /* Storage is blocked; the theme still applies for this visit. */
      }
    }

    function applyTheme(theme) {
      root.setAttribute('data-theme', theme);
      const isDark = theme === 'dark';
      themeToggleBtn.setAttribute('aria-pressed', String(isDark));
    }

    applyTheme(readSavedTheme() || (mediaQuery.matches ? 'dark' : 'light'));

    themeToggleBtn.addEventListener('click', () => {
      const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      userChose = true;
      applyTheme(nextTheme);
      saveTheme(nextTheme);
    });

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', (event) => {
        if (!userChose && !readSavedTheme()) {
          applyTheme(event.matches ? 'dark' : 'light');
        }
      });
    }
  }

  /* ==========================================================================
     2. Mobile Navigation Toggle
     ========================================================================== */
  function initMobileNav() {
    const menuToggleBtn = document.getElementById('menu-toggle');
    const siteNav = document.getElementById('site-nav');
    const navLinks = document.querySelectorAll('.site-nav .nav-link');

    if (!menuToggleBtn || !siteNav) return;

    function toggleMenu(isOpen) {
      const nextState = typeof isOpen === 'boolean' ? isOpen : menuToggleBtn.getAttribute('aria-expanded') !== 'true';
      menuToggleBtn.setAttribute('aria-expanded', String(nextState));
      siteNav.classList.toggle('is-open', nextState);
    }

    menuToggleBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleMenu();
      if (siteNav.classList.contains('is-open') && navLinks.length) {
        navLinks[0].focus();
      }
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => toggleMenu(false));
    });

    document.addEventListener('click', (event) => {
      if (
        siteNav.classList.contains('is-open') &&
        !siteNav.contains(event.target) &&
        !menuToggleBtn.contains(event.target)
      ) {
        toggleMenu(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && siteNav.classList.contains('is-open')) {
        toggleMenu(false);
        menuToggleBtn.focus();
      }
    });
  }

  /* ==========================================================================
     3. Active Navigation Link Scroll Spy
     ========================================================================== */
  /** Picks the section to highlight: the last one at the bottom of the page, otherwise the one under a probe line. */
  function pickActiveSection(sections, scrollY, viewportHeight, documentHeight) {
    if (!sections.length) return null;
    if (viewportHeight + scrollY >= documentHeight - 2) return sections[sections.length - 1].id;

    const probe = scrollY + 120;
    const match = sections.find((section) => probe >= section.top && probe < section.top + section.height);
    return match ? match.id : null;
  }

  function initScrollSpy() {
    const sections = document.querySelectorAll('main section[id]');
    const navLinks = document.querySelectorAll('.site-nav .nav-link');

    if (!sections.length || !navLinks.length) return;

    function updateActiveLink() {
      const measured = Array.from(sections).map((section) => ({
        id: section.getAttribute('id'),
        top: section.offsetTop,
        height: section.offsetHeight,
      }));
      const activeId = pickActiveSection(measured, window.scrollY, window.innerHeight, document.documentElement.scrollHeight);
      if (!activeId) return;

      navLinks.forEach((link) => {
        const isCurrent = link.getAttribute('href') === `#${activeId}`;
        link.classList.toggle('active', isCurrent);
        if (isCurrent) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    window.addEventListener('scroll', updateActiveLink, { passive: true });
    updateActiveLink();
  }

  /* ==========================================================================
     4. Path to 2027 Timeline Chart (inline SVG)
     ========================================================================== */

  /** Turns "YYYY-MM" into the first day of that month, "present" into now, anything else into null. */
  function parseMonth(value, now) {
    if (value === 'present') return new Date(now);
    const match = /^(\d{4})-(\d{2})$/.exec(value || '');
    if (!match) return null;
    const month = Number(match[2]);
    if (month < 1 || month > 12) return null;
    return new Date(Number(match[1]), month - 1, 1);
  }

  /** Position of a date between start (0) and end (1), clamped to that range. */
  function chartRatio(date, start, end) {
    const ratio = (date - start) / (end - start);
    return Math.min(1, Math.max(0, ratio));
  }

  /** Reads timeline rows from the #path-list items; malformed rows are skipped. */
  function readPathEvents(listEl, now) {
    const events = [];

    Array.from(listEl.querySelectorAll('li')).forEach((item) => {
      const kind = item.dataset.kind === 'range' ? 'range' : 'point';
      const start = parseMonth(item.dataset.start, now);
      const end = kind === 'range' ? parseMonth(item.dataset.end, now) : null;
      const title = item.querySelector('strong');
      const when = item.querySelector('span');

      if (!start || (kind === 'range' && !end) || !title || !when) return;

      events.push({
        kind,
        start,
        end,
        label: `${title.textContent.trim()}, ${when.textContent.trim()}`,
      });
    });

    return events;
  }

  function svgEl(name, attributes) {
    const element = document.createElementNS(SVG_NS, name);
    Object.keys(attributes).forEach((key) => element.setAttribute(key, attributes[key]));
    return element;
  }

  function renderPathChart(width, events, now, animate) {
    const pad = 16;
    const top = 24;
    const rowHeight = 46;
    const axisHeight = 28;
    const plotWidth = width - pad * 2;
    const gridBottom = top + events.length * rowHeight;
    const height = gridBottom + axisHeight;
    const xOf = (date) => pad + chartRatio(date, PATH_START, PATH_END) * plotWidth;

    const classes = ['chart-svg'];
    if (!animate) classes.push('is-static');
    if (width < 280) classes.push('is-narrow');

    const svg = svgEl('svg', {
      class: classes.join(' '),
      viewBox: `0 0 ${width} ${height}`,
      width: String(width),
      height: String(height),
      'aria-hidden': 'true',
      focusable: 'false',
    });

    for (let year = PATH_START.getFullYear(); year <= PATH_END.getFullYear(); year += 1) {
      const x = xOf(new Date(year, 0, 1));
      svg.appendChild(svgEl('line', { class: 'chart-grid', x1: x, x2: x, y1: top - 6, y2: gridBottom }));
      const yearLabel = svgEl('text', { class: 'chart-axis', x: x + 4, y: height - 8 });
      yearLabel.textContent = String(year);
      svg.appendChild(yearLabel);
    }

    events.forEach((event, index) => {
      const rowTop = top + index * rowHeight;
      const barY = rowTop + 20;
      const marker = event.kind === 'range'
        ? event.start
        : new Date(event.start.getFullYear(), event.start.getMonth(), 15);
      const state = marker > now ? 'is-future' : 'is-past';
      const delay = `${index * 90}ms`;

      const label = svgEl('text', { class: 'chart-label', x: pad, y: rowTop + 12 });
      label.textContent = event.label;
      svg.appendChild(label);

      if (event.kind === 'range') {
        const x1 = xOf(event.start);
        const x2 = Math.max(xOf(event.end), x1 + 4);
        svg.appendChild(svgEl('rect', {
          class: `chart-bar ${state}`,
          x: x1,
          y: barY,
          width: x2 - x1,
          height: 10,
          rx: 3,
          style: `animation-delay: ${delay}`,
        }));
      } else {
        svg.appendChild(svgEl('circle', {
          class: `chart-dot ${state}`,
          cx: xOf(marker),
          cy: barY + 5,
          r: 6,
          style: `animation-delay: ${delay}`,
        }));
      }
    });

    const todayX = xOf(now);
    svg.appendChild(svgEl('line', { class: 'chart-today', x1: todayX, x2: todayX, y1: top - 6, y2: gridBottom }));
    const todayLabel = svgEl('text', { class: 'chart-today-label', x: todayX - 4, y: 12, 'text-anchor': 'end' });
    todayLabel.textContent = 'Today';
    svg.appendChild(todayLabel);

    return svg;
  }

  function initPathChart() {
    const container = document.getElementById('path-chart');
    const list = document.getElementById('path-list');
    if (!container || !list) return;

    const panel = container.closest('.chart-panel');
    let drawnWidth = 0;
    let hasAnimated = false;

    function draw() {
      const width = Math.floor(container.clientWidth);
      if (width <= 0 || width === drawnWidth) return;

      const now = new Date();
      const events = readPathEvents(list, now);
      if (!events.length) return;

      container.replaceChildren(renderPathChart(Math.max(CHART_MIN_WIDTH, width), events, now, !hasAnimated));
      drawnWidth = width;
      hasAnimated = true;
      if (panel) panel.classList.add('has-chart');
    }

    draw();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(draw, 120);
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PATH_START, PATH_END, initTheme, parseMonth, chartRatio, readPathEvents, renderPathChart, pickActiveSection };
  }
})();
