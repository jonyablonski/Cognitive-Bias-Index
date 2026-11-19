/**
 * mixpanel.js — Mixpanel tracking for Cognitive Bias Index
 * Bundled into the main JS bundle via app.js (Hugo js.Build resolves the imports).
 *
 * The site has no per-bias or per-category pages: biases are expandable cards
 * on "/" and categories are filter buttons. Events map onto that UI:
 *   bias_page_viewed            -> a bias card is expanded (or deep-linked via #hash)
 *   category_page_viewed        -> a category filter is switched on
 *   bias_from_category_clicked  -> a bias card is expanded while exactly one category filter is active
 *
 * Markup hooks (see layouts/partials/components/list-item.html, filter.html):
 *   [data-bias-card] [data-bias-id] [data-bias-name] [data-bias-category]
 *   [data-bias-toggle], [data-how-to-avoid] [data-how-to-avoid-id] li[data-tip-id]
 *   [data-tool-link] [data-tool-id], [data-filter="context"][data-category-id]
 */

import mixpanel from "mixpanel-browser";

(function () {
  'use strict';

  const MIXPANEL_TOKEN = '8fc7b677621b05e130b880041e639266';
  const HOST = window.location.hostname;
  const IS_LOCAL = HOST === 'localhost' || HOST === '127.0.0.1';
  const DEBUG = /[?&]mixpanel_debug=1/.test(window.location.search);

  if (IS_LOCAL && !DEBUG) {
    console.log('[analytics] Mixpanel disabled on localhost (add ?mixpanel_debug=1 to enable)');
    return;
  }

  mixpanel.init(MIXPANEL_TOKEN, {
    track_pageview: false, // landing_page_viewed / session_started cover this
    persistence: 'localStorage',
    debug: DEBUG,
  });

  /* ------------------------------------------------------------------ *
   * Session state (sessionStorage, so it survives page navigations)
   * ------------------------------------------------------------------ */
  const SESSION_KEY = 'cbi_session';

  const blankSession = () => ({
    started: false,
    landing_page_url: null,
    bias_views: 0,
    category_views: 0,
    did_view_how_to_avoid: false,
    did_click_related_content: false,
    last_conversion_sig: '',
  });

  const loadSession = () => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? Object.assign(blankSession(), JSON.parse(raw)) : blankSession();
    } catch (_) {
      return blankSession();
    }
  };

  const session = loadSession();
  const saveSession = () => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (_) { /* storage blocked */ }
  };

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */
  const toSnake = (s) => (s || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const textOf = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const normalizePath = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p) || '/';

  const referrerHost = () => {
    try {
      const h = new URL(document.referrer).hostname.replace(/^www\./, '');
      return h && h !== HOST.replace(/^www\./, '') ? h : '';
    } catch (_) {
      return '';
    }
  };

  const SEARCH_ENGINES = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave|baidu|yandex|startpage|kagi)\./i;
  const SOCIAL = /(^|\.)(twitter\.com|x\.com|t\.co|facebook\.com|fb\.com|instagram\.com|linkedin\.com|lnkd\.in|reddit\.com|news\.ycombinator\.com|pinterest\.com|tiktok\.com|youtube\.com|threads\.net|bsky\.app|mastodon\.[a-z]+)$/i;

  function classifyAcquisition() {
    const params = new URLSearchParams(window.location.search);
    const medium = (params.get('utm_medium') || '').toLowerCase();
    const host = referrerHost();

    if (/^(email|e-mail|newsletter)$/.test(medium)) return 'email';
    if (/^(cpc|ppc|paid|paidsearch)$/.test(medium)) return 'paid';
    if (host && SEARCH_ENGINES.test(host)) return 'organic_search';
    if (host && SOCIAL.test(host)) return 'social';
    if (/^(social|social-media)$/.test(medium)) return 'social';
    if (host) return 'referral';
    if (params.get('utm_source') || params.get('utm_campaign')) return 'other';
    return 'direct';
  }

  const ENTRY_METHOD = {
    organic_search: 'organic_result',
    social: 'social_share',
    referral: 'referral_link',
    email: 'email_link',
    paid: 'paid_link',
    other: 'campaign_link',
    direct: 'direct_url',
  };

  // Organic search keywords are rarely exposed by engines; read ?q= if present.
  function referrerSearchQuery() {
    try {
      const u = new URL(document.referrer);
      if (!SEARCH_ENGINES.test(u.hostname)) return null;
      return u.searchParams.get('q') || u.searchParams.get('query') || null;
    } catch (_) {
      return null;
    }
  }

  const cardInfo = (card) => ({
    bias_id: card.dataset.biasId || '',
    bias_name: card.dataset.biasName || '',
    bias_category: toSnake(card.dataset.biasCategory),
  });

  /* ------------------------------------------------------------------ *
   * 1 + 2. session_started, landing_page_viewed
   * ------------------------------------------------------------------ */
  function trackSessionStart() {
    if (session.started) return;

    const params = new URLSearchParams(window.location.search);
    const acquisition = classifyAcquisition();

    session.started = true;
    session.landing_page_url = window.location.href;
    saveSession();

    mixpanel.track('session_started', {
      acquisition_source: acquisition,
      referrer_domain: referrerHost() || null,
      landing_page_url: session.landing_page_url,
      utm_campaign: params.get('utm_campaign') || null,
    });

    mixpanel.track('landing_page_viewed', {
      landing_page_url: session.landing_page_url,
      page_path: normalizePath(window.location.pathname),
      search_query: referrerSearchQuery(),
      entry_method: ENTRY_METHOD[acquisition],
    });
  }

  /* ------------------------------------------------------------------ *
   * 3. bias_page_viewed (+ 9. bias_from_category_clicked)
   * ------------------------------------------------------------------ */
  const activeCategoryIds = () =>
    Array.from(document.querySelectorAll('[data-filter="context"][aria-pressed="true"]'))
      .map((el) => el.dataset.categoryId)
      .filter(Boolean);

  function trackBiasViewed(card) {
    session.bias_views += 1;
    saveSession();
    mixpanel.track('bias_page_viewed', Object.assign(cardInfo(card), {
      view_position: session.bias_views,
    }));
  }

  function trackBiasFromCategory(card) {
    const categories = [...new Set(activeCategoryIds())];
    if (categories.length !== 1) return; // ambiguous or no category context

    const visible = Array.from(document.querySelectorAll('[data-bias-results] [data-bias-card]'));
    mixpanel.track('bias_from_category_clicked', {
      category_id: categories[0],
      bias_id: card.dataset.biasId || '',
      bias_rank_in_list: visible.indexOf(card) + 1,
      link_text: card.dataset.biasName || '',
    });
  }

  function initBiasTracking() {
    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-bias-toggle]');
      if (!toggle) return;
      const card = toggle.closest('[data-bias-card]');
      if (!card) return;

      // app.js flips aria-expanded in its own click handler; read it afterwards.
      setTimeout(() => {
        if (toggle.getAttribute('aria-expanded') !== 'true') return; // collapsing
        trackBiasViewed(card);
        trackBiasFromCategory(card);
      }, 0);
    });

    // Deep link (e.g. /#anchoring-effect) opens straight to a bias.
    const hash = window.location.hash.slice(1);
    const target = hash && document.getElementById(hash);
    if (target && target.matches('[data-bias-card]')) {
      trackBiasViewed(target);
    }
  }

  /* ------------------------------------------------------------------ *
   * 4. related_content_clicked (recommended tool link)
   * ------------------------------------------------------------------ */
  function initRelatedContentTracking() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-tool-link]');
      if (!link) return;
      const card = link.closest('[data-bias-card]');

      session.did_click_related_content = true;
      saveSession();

      mixpanel.track('related_content_clicked', {
        from_bias_id: card ? card.dataset.biasId : '',
        to_content_type: 'methodology',
        to_content_id: link.dataset.toolId || toSnake(link.dataset.toolName),
        link_text: textOf(link),
      });
      flushConversion(); // outbound navigation may unload the page
    });
  }

  /* ------------------------------------------------------------------ *
   * 5. how_to_avoid_section_viewed (visible ≥1s; fires when it leaves view)
   * ------------------------------------------------------------------ */
  const MIN_DWELL_MS = 1000;
  const visibleSince = new Map(); // element -> timestamp

  function emitHowToAvoid(el, now) {
    const since = visibleSince.get(el);
    if (since == null) return;
    visibleSince.delete(el);

    const dwell = Math.round(now - since);
    if (dwell < MIN_DWELL_MS) return;

    const card = el.closest('[data-bias-card]');
    const deepLinked = card && card.id === window.location.hash.slice(1);

    session.did_view_how_to_avoid = true;
    saveSession();

    mixpanel.track('how_to_avoid_section_viewed', {
      bias_id: card ? card.dataset.biasId : '',
      how_to_avoid_section_id: el.dataset.howToAvoidId || '',
      dwell_time_ms: dwell,
      trigger_method: deepLinked ? 'anchor_click' : 'scroll_threshold',
    });
  }

  function initHowToAvoidViewTracking() {
    const sections = document.querySelectorAll('[data-how-to-avoid]');
    if (!sections.length) return;

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!visibleSince.has(entry.target)) visibleSince.set(entry.target, performance.now());
          } else {
            emitHowToAvoid(entry.target, performance.now());
          }
        });
      }, { threshold: 0.6 }); // collapsed cards are hidden, so they never intersect
      sections.forEach((el) => io.observe(el));
    }

    // Flush sections still in view when the user leaves.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'hidden') return;
      const now = performance.now();
      Array.from(visibleSince.keys()).forEach((el) => emitHowToAvoid(el, now));
    });
  }

  /* ------------------------------------------------------------------ *
   * 6. how_to_avoid_tip_clicked
   * Tips are plain list items today; a click on a tip (or a link inside it).
   * ------------------------------------------------------------------ */
  function initHowToAvoidClickTracking() {
    document.addEventListener('click', (e) => {
      const section = e.target.closest('[data-how-to-avoid]');
      if (!section) return;
      const tip = e.target.closest('li');
      if (!tip || !section.contains(tip)) return;

      const card = section.closest('[data-bias-card]');
      const link = e.target.closest('a[href]');
      let interaction = 'internal_reference';
      if (link) {
        interaction = link.getAttribute('href').charAt(0) === '#'
          ? 'anchor_link'
          : (link.hostname && link.hostname !== HOST ? 'external_link' : 'internal_reference');
      }

      mixpanel.track('how_to_avoid_tip_clicked', {
        bias_id: card ? card.dataset.biasId : '',
        tip_id: tip.dataset.tipId || '',
        tip_label: textOf(tip),
        interaction_type: interaction,
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * 7. category_navigation_clicked, 8. category_page_viewed
   * ------------------------------------------------------------------ */
  function initCategoryTracking() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter="context"]');
      if (!btn) return;

      const categoryId = btn.dataset.categoryId || toSnake(textOf(btn));

      mixpanel.track('category_navigation_clicked', {
        from_bias_id: null, // filters live in the sidebar, not on a bias card
        to_category_id: categoryId,
        to_category_name: textOf(btn),
        link_text: textOf(btn),
      });

      // app.js toggles aria-pressed and re-filters the list in its own handler.
      setTimeout(() => {
        if (btn.getAttribute('aria-pressed') !== 'true') return; // filter switched off
        session.category_views += 1;
        saveSession();
        mixpanel.track('category_page_viewed', {
          category_id: categoryId,
          category_name: textOf(btn),
          bias_count_on_page: document.querySelectorAll('[data-bias-results] [data-bias-card]').length,
          view_position_in_session: session.category_views,
        });
      }, 0);
    });
  }

  /* ------------------------------------------------------------------ *
   * 10. session_conversion_activity (sent when the page is hidden/unloaded,
   * only if the cumulative session state changed since the last send)
   * ------------------------------------------------------------------ */
  function flushConversion() {
    const payload = {
      did_view_how_to_avoid: session.did_view_how_to_avoid,
      did_click_related_content: session.did_click_related_content,
      bias_pages_viewed_count: session.bias_views,
      category_pages_viewed_count: session.category_views,
    };
    const sig = JSON.stringify(payload);
    if (sig === session.last_conversion_sig) return;
    if (!session.bias_views && !session.category_views && !session.did_click_related_content) return;

    session.last_conversion_sig = sig;
    saveSession();
    mixpanel.track('session_conversion_activity', payload, { transport: 'sendBeacon' });
  }

  function initConversionTracking() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushConversion();
    });
    window.addEventListener('pagehide', flushConversion);
  }

  /* ------------------------------------------------------------------ *
   * Bootstrap
   * ------------------------------------------------------------------ */
  function init() {
    trackSessionStart();
    initBiasTracking();
    initRelatedContentTracking();
    initHowToAvoidViewTracking();
    initHowToAvoidClickTracking();
    initCategoryTracking();
    initConversionTracking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
