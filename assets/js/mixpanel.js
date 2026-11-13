/**
 * analytics.js — Mixpanel tracking for Cognitive Bias Index
 * Bundled into the main JS bundle via app.js (Hugo js.Build resolves the imports).
 */

import mixpanel from "mixpanel-browser";

(function () {
  'use strict';

  const MIXPANEL_TOKEN = '18ef3db7955980206e57f76459662422';
  const IS_PROD = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

  if (!IS_PROD) {
    console.log('[analytics] Mixpanel disabled on localhost');
    return;
  }

  mixpanel.init(MIXPANEL_TOKEN, {
    track_pageview: true,
    persistence: 'localStorage',
  });

  mixpanel.register({ app_version: '1.0' });

  // ---------------------------------------------------------------------
  // Search
  // Assumes: <input id="bias-search" /> and a results container whose
  // children you can count. Adjust SEARCH_INPUT_SELECTOR / RESULTS_SELECTOR
  // to match the real markup.
  // ---------------------------------------------------------------------
  const SEARCH_INPUT_SELECTOR = '#bias-search';
  const RESULTS_SELECTOR = '[data-bias-results] [data-bias-card]';

  function initSearchTracking() {
    const input = document.querySelector(SEARCH_INPUT_SELECTOR);
    if (!input) return;

    let debounceTimer;
    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = e.target.value.trim();
        if (!query) return;

        const resultsCount = document.querySelectorAll(RESULTS_SELECTOR).length;

        if (resultsCount === 0) {
          mixpanel.track('Bias Search Empty', { query });
        } else {
          mixpanel.track('Bias Searched', { query, results_count: resultsCount });
        }
      }, 400); // wait for results to re-render before counting
    });
  }

  // ---------------------------------------------------------------------
  // Filters
  // Assumes filter chips/buttons carry data-filter-type and data-filter-value,
  // and a "Clear Filters" control carries data-clear-filters.
  // ---------------------------------------------------------------------
  function initFilterTracking() {
    document.addEventListener('click', (e) => {
      const filterEl = e.target.closest('[data-filter-value]');
      if (filterEl) {
        // Wait a tick for the filtered list to re-render before counting.
        setTimeout(() => {
          const resultsCount = document.querySelectorAll(RESULTS_SELECTOR).length;
          mixpanel.track('Filter Applied', {
            filter_type: filterEl.dataset.filterType || 'tag',
            filter_value: filterEl.dataset.filterValue,
            results_count: resultsCount,
          });
        }, 0);
        return;
      }

      const clearEl = e.target.closest('[data-clear-filters]');
      if (clearEl) {
        const activeCount = document.querySelectorAll('[data-filter-value][aria-pressed="true"]').length;
        mixpanel.track('Filters Cleared', { active_filters_count: activeCount });
      }
    });
  }

  // ---------------------------------------------------------------------
  // Bias detail view + read-duration timing
  // Assumes each bias card is a toggle/accordion:
  //   <div data-bias-card data-bias-name="Confirmation Bias" data-bias-tags="..."> 
  //     <button data-bias-toggle>...</button>
  //     <div data-bias-more-info>...</div>
  //   </div>
  // ---------------------------------------------------------------------
  const openBiases = new Map(); // bias_name -> true while expanded

  function initBiasTracking() {
    document.addEventListener('click', (e) => {
      const toggleEl = e.target.closest('[data-bias-toggle]');
      if (!toggleEl) return;

      const card = toggleEl.closest('[data-bias-card]');
      if (!card) return;

      const biasName = card.dataset.biasName;
      const tags = (card.dataset.biasTags || '').split(',').filter(Boolean);
      const isOpening = !openBiases.has(biasName);

      if (isOpening) {
        openBiases.set(biasName, true);
        mixpanel.time_event('Bias Read');
        mixpanel.track('Bias Viewed', {
          bias_name: biasName,
          tags,
          source: document.querySelector(SEARCH_INPUT_SELECTOR)?.value ? 'search' : 'browse',
        });

        // "More Info" is a sub-section inside the same card — fire separately
        // if your markup expands it independently of the main toggle.
        const moreInfo = card.querySelector('[data-bias-more-info]');
        if (moreInfo) {
          mixpanel.track('Bias Info Expanded', { bias_name: biasName });
        }
      } else {
        openBiases.delete(biasName);
        mixpanel.track('Bias Read', { bias_name: biasName }); // Duration auto-added by time_event
      }
    });
  }

  // ---------------------------------------------------------------------
  // Recommended tool click-through
  // Assumes: <a data-tool-link data-tool-name="Decision Matrix" href="/tools#decision-matrix">
  // ---------------------------------------------------------------------
  function initToolClickTracking() {
    document.addEventListener('click', (e) => {
      const toolLink = e.target.closest('[data-tool-link]');
      if (!toolLink) return;

      const card = toolLink.closest('[data-bias-card]');
      mixpanel.track('Recommended Tool Clicked', {
        bias_name: card ? card.dataset.biasName : undefined,
        tool_name: toolLink.dataset.toolName,
      });
    });
  }

  // ---------------------------------------------------------------------
  // Tool page views (if /tools is a separate page/route)
  // Fire this on tools-page load with the anchor/section in view, or on
  // route change if it's an SPA.
  // ---------------------------------------------------------------------
  function trackToolViewed(toolName, referrerBias) {
    mixpanel.track('Tool Viewed', {
      tool_name: toolName,
      referrer_bias: referrerBias || null,
    });
  }
  window.trackToolViewed = trackToolViewed; // expose for the tools-page script to call

  // ---------------------------------------------------------------------
  // Further Reading outbound links
  // Must run after the links exist in the DOM — re-run if bias cards are
  // rendered dynamically (e.g. after a search/filter re-render).
  // ---------------------------------------------------------------------
  function initFurtherReadingTracking() {
    mixpanel.track_links('a[data-further-reading]', 'Further Reading Clicked', function (el) {
      const card = el.closest('[data-bias-card]');
      let domain = '';
      try {
        domain = new URL(el.href).hostname;
      } catch (_) {
        /* ignore malformed href */
      }
      return {
        bias_name: card ? card.dataset.biasName : undefined,
        link_domain: domain,
        link_url: el.href,
      };
    });
  }

  // ---------------------------------------------------------------------
  // Theme toggle
  // Assumes: <button data-theme-toggle>
  // ---------------------------------------------------------------------
  function initThemeTracking() {
    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-theme-toggle]');
      if (!toggle) return;

      // Read the theme AFTER the toggle's own click handler has run.
      setTimeout(() => {
        const newTheme = document.documentElement.dataset.theme || document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        mixpanel.track('Theme Toggled', { new_theme: newTheme });
      }, 0);
    });
  }

  // ---------------------------------------------------------------------
  // Top nav
  // Assumes: <nav> ... <a data-nav-item="Tools"> ... <a data-nav-item="Info">
  // ---------------------------------------------------------------------
  function initNavTracking() {
    document.addEventListener('click', (e) => {
      const navEl = e.target.closest('[data-nav-item]');
      if (!navEl) return;
      mixpanel.track('Nav Section Clicked', { nav_item: navEl.dataset.navItem });
    });
  }

  // ---------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------
  function init() {
    initSearchTracking();
    initFilterTracking();
    initBiasTracking();
    initToolClickTracking();
    initFurtherReadingTracking();
    initThemeTracking();
    initNavTracking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();