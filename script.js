/**
 * John Kenneth Moscosa - Personal Portfolio
 * Vanilla ES6+ Modular Script
 * 
 * Features:
 * 1. Dark / Light Mode Toggle with system preference detection and localStorage persistence.
 * 2. Accessible Mobile Navigation Toggle with keyboard controls (Escape) and click-outside dismissal.
 * 3. Filterable Projects Gallery (Finished & In-Progress) with ARIA tabs state management.
 * 4. GitHub Contribution Heatmap mock generator with interactive tooltips.
 * 5. Contact Form UI Validation with accessible feedback messages.
 * 6. Active Navigation Link Scroll Spy & smooth scroll handling.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileNav();
  initProjectFilters();
  initGitHubContributions();
  initContactForm();
  initScrollSpy();
});

/* ==========================================================================
   1. Theme Toggle (Dark / Light Mode)
   ========================================================================== */
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (!themeToggleBtn) return;

  const storageKey = 'jkm_portfolio_theme';
  const root = document.documentElement;

  // Determine initial theme: saved preference -> system preference -> default light
  const savedTheme = localStorage.getItem(storageKey);
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

  applyTheme(initialTheme);

  // Toggle button event listener
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = root.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
  });

  // Listen for operating system theme changes if user hasn't set an explicit preference
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(storageKey)) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(storageKey, theme);

    const isDark = theme === 'dark';
    themeToggleBtn.setAttribute('aria-pressed', String(isDark));
    themeToggleBtn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
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

  // Hamburger button click
  menuToggleBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleMenu();
  });

  // Close menu when clicking any nav link
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      toggleMenu(false);
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (event) => {
    if (
      siteNav.classList.contains('is-open') &&
      !siteNav.contains(event.target) &&
      !menuToggleBtn.contains(event.target)
    ) {
      toggleMenu(false);
    }
  });

  // Close on Escape key press for accessibility
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && siteNav.classList.contains('is-open')) {
      toggleMenu(false);
      menuToggleBtn.focus();
    }
  });
}

/* ==========================================================================
   3. Filterable Projects Gallery (Finished & In-Progress)
   ========================================================================== */
function initProjectFilters() {
  const filterButtons = document.querySelectorAll('.project-filters .filter-btn');
  const projectCards = document.querySelectorAll('.projects-grid .project-card');

  if (!filterButtons.length || !projectCards.length) return;

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const selectedFilter = button.getAttribute('data-filter') || 'all';

      // Update ARIA state and active class on filter buttons
      filterButtons.forEach((btn) => {
        const isActive = btn === button;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });

      // Show/Hide project cards
      projectCards.forEach((card) => {
        const cardStatus = card.getAttribute('data-status');
        const shouldShow = selectedFilter === 'all' || cardStatus === selectedFilter;

        if (shouldShow) {
          card.classList.remove('is-hidden');
        } else {
          card.classList.add('is-hidden');
        }
      });
    });
  });
}

/* ==========================================================================
   4. GitHub Contribution Heatmap Mock Generator
   ========================================================================== */
function initGitHubContributions() {
  const gridContainer = document.getElementById('heatmap-grid');
  const tooltip = document.getElementById('heatmap-tooltip');
  if (!gridContainer || !tooltip) return;

  const totalWeeks = 24;
  const daysPerWeek = 7;
  const totalDays = totalWeeks * daysPerWeek;

  const defaultTooltipText = 'Hover over a tile to view commits';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Deterministic mock seed so contribution graph looks consistent and realistic
  const baseDate = new Date(2026, 8, 30); // Sep 30, 2026
  const fragment = document.createDocumentFragment();

  // Pattern multipliers to create natural activity clusters & streaks
  const activityPattern = [
    0, 2, 4, 3, 5, 1, 0,
    1, 4, 6, 2, 4, 0, 0,
    3, 5, 7, 4, 6, 2, 0,
    0, 1, 3, 2, 4, 1, 0,
    2, 6, 8, 5, 7, 3, 1,
    0, 3, 5, 4, 2, 0, 0
  ];

  for (let i = totalDays - 1; i >= 0; i--) {
    const dayDate = new Date(baseDate);
    dayDate.setDate(baseDate.getDate() - i);

    const patternIndex = (totalDays - i) % activityPattern.length;
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
    let count = activityPattern[patternIndex];
    
    if (isWeekend && count > 2) {
      count = Math.floor(count / 2);
    }

    // Determine contribution level (0 to 4)
    let level = 0;
    if (count >= 7) level = 4;
    else if (count >= 5) level = 3;
    else if (count >= 3) level = 2;
    else if (count >= 1) level = 1;

    const cell = document.createElement('div');
    cell.className = `heatmap-cell level-${level}`;
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('role', 'gridcell');

    const formattedDate = `${monthNames[dayDate.getMonth()]} ${dayDate.getDate()}, ${dayDate.getFullYear()}`;
    const label = count === 0 ? `No contributions on ${formattedDate}` : `${count} contribution${count > 1 ? 's' : ''} on ${formattedDate}`;

    cell.setAttribute('aria-label', label);

    cell.addEventListener('mouseenter', () => {
      tooltip.textContent = label;
    });

    cell.addEventListener('focus', () => {
      tooltip.textContent = label;
    });

    fragment.appendChild(cell);
  }

  gridContainer.appendChild(fragment);

  gridContainer.addEventListener('mouseleave', () => {
    tooltip.textContent = defaultTooltipText;
  });
}

/* ==========================================================================
   5. Contact Form Validation & Feedback UI
   ========================================================================== */
function initContactForm() {
  const contactForm = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');
  if (!contactForm || !formStatus) return;

  const fields = {
    name: {
      input: document.getElementById('name'),
      error: document.getElementById('name-error'),
      validate: (val) => val.trim().length >= 2 || 'Please enter at least 2 characters.',
    },
    email: {
      input: document.getElementById('email'),
      error: document.getElementById('email-error'),
      validate: (val) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(val.trim()) || 'Please enter a valid email address.';
      },
    },
    subject: {
      input: document.getElementById('subject'),
      error: document.getElementById('subject-error'),
      validate: (val) => val.trim().length >= 3 || 'Subject must be at least 3 characters long.',
    },
    message: {
      input: document.getElementById('message'),
      error: document.getElementById('message-error'),
      validate: (val) => val.trim().length >= 10 || 'Please provide at least 10 characters in your message.',
    },
  };

  // Real-time error clearing when user edits an invalid field
  Object.values(fields).forEach(({ input, error }) => {
    if (!input || !error) return;

    input.addEventListener('input', () => {
      if (input.classList.contains('is-invalid')) {
        input.classList.remove('is-invalid');
        error.textContent = '';
      }
    });

    input.addEventListener('blur', () => {
      validateSingleField(input, error);
    });
  });

  function validateSingleField(input, error) {
    const key = input.id;
    const fieldConfig = fields[key];
    if (!fieldConfig) return true;

    const result = fieldConfig.validate(input.value);
    if (result !== true) {
      input.classList.add('is-invalid');
      error.textContent = result;
      return false;
    } else {
      input.classList.remove('is-invalid');
      error.textContent = '';
      return true;
    }
  }

  // Handle Form Submission
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    formStatus.className = 'form-status';
    formStatus.textContent = '';

    let isFormValid = true;
    let firstInvalidInput = null;

    // Validate all fields
    Object.keys(fields).forEach((key) => {
      const { input, error } = fields[key];
      const valid = validateSingleField(input, error);
      if (!valid) {
        isFormValid = false;
        if (!firstInvalidInput) {
          firstInvalidInput = input;
        }
      }
    });

    if (!isFormValid) {
      if (firstInvalidInput) {
        firstInvalidInput.focus();
      }
      return;
    }

    // Simulate sending with accessible visual confirmation
    const submitBtn = contactForm.querySelector('.btn-submit');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Sending...</span>`;
    }

    setTimeout(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }

      formStatus.className = 'form-status success';
      formStatus.textContent = 'Thank you! Your message has been sent successfully.';
      contactForm.reset();

      // Clear success notification after 6 seconds
      setTimeout(() => {
        formStatus.className = 'form-status';
        formStatus.textContent = '';
      }, 6000);
    }, 700);
  });
}

/* ==========================================================================
   6. Active Navigation Link Scroll Spy
   ========================================================================== */
function initScrollSpy() {
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.site-nav .nav-link');

  if (!sections.length || !navLinks.length) return;

  function updateActiveLink() {
    const scrollPos = window.scrollY + 120;

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        navLinks.forEach((link) => {
          const isCurrent = link.getAttribute('href') === `#${sectionId}`;
          link.classList.toggle('active', isCurrent);
        });
      }
    });
  }

  window.addEventListener('scroll', updateActiveLink, { passive: true });
  updateActiveLink();
}
