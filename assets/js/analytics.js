/**
 * analytics.js — the single entry point for Mixpanel tracking.
 * See TRACKING_PLAN.md for the event catalog. Nothing else in the codebase
 * should import mixpanel-browser or call mixpanel.track directly.
 *
 * Loads only when the build injected <meta name="mixpanel-token"> (production
 * builds with MIXPANEL_TOKEN set; see layouts/partials/site/scripts.html).
 * Otherwise every export is a harmless no-op.
 */

import mixpanel from "mixpanel-browser";

const tokenMeta = document.querySelector('meta[name="mixpanel-token"]');
const TOKEN = tokenMeta ? tokenMeta.content : '';
const ENABLED = Boolean(TOKEN);

const HOST = window.location.hostname;
const SEARCH_DEBOUNCE_MS = 800;

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const normalizePath = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p) || '/';

const sectionFromPath = (path) => {
  const p = normalizePath(path);
  if (p === '/tools') return 'tools';
  if (p === '/info.html' || p === '/info') return 'info';
  return 'biases';
};

export const getSection = () => sectionFromPath(window.location.pathname);

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

const classifyAcquisition = (params, host) => {
  const medium = (params.get('utm_medium') || '').toLowerCase();
  if (/^(email|e-mail|newsletter)$/.test(medium)) return 'email';
  if (/^(cpc|ppc|paid|paidsearch)$/.test(medium)) return 'paid';
  if (host && SEARCH_ENGINES.test(host)) return 'organic_search';
  if (host && SOCIAL.test(host)) return 'social';
  if (/^(social|social-media)$/.test(medium)) return 'social';
  if (host) return 'referral';
  if (params.get('utm_source') || params.get('utm_campaign')) return 'other';
  return 'direct';
};

const lengthBucket = (n) => (n <= 3 ? '1-3' : n <= 10 ? '4-10' : '11+');

// Literal query text is only ever sent for zero-result searches, and only
// when it doesn't look like PII (email address, long digit run).
const safeQueryText = (q) => {
  const text = q.trim().toLowerCase();
  if (text.includes('@') || (text.match(/\d/g) || []).length >= 6) return null;
  return text.slice(0, 40);
};

const itemInfo = (card) => {
  const titleEl = card.querySelector('.list__item-title-text');
  return {
    item_id: card.id || '',
    item_name: titleEl ? titleEl.textContent.trim() : '',
    item_category: card.dataset.context || '',
  };
};

/* ------------------------------------------------------------------ *
 * Core
 * ------------------------------------------------------------------ */

if (ENABLED) {
  mixpanel.init(TOKEN, {
    track_pageview: false, // page_viewed is sent explicitly below
    persistence: 'localStorage',
    // Batching queues events in localStorage and loses them when the user
    // navigates away quickly (verified). Volume is low, so send immediately.
    batch_requests: false,
  });
  mixpanel.register({
    section: getSection(),
    site_env: 'production',
    hostname: HOST, // lets you filter out test traffic from non-production hosts
  });
}

/**
 * track(event, props) — the only function that talks to Mixpanel.
 * Pass { beacon: true } as the third argument when the page is about to unload.
 */
export const track = (event, props = {}, { beacon = false } = {}) => {
  if (!ENABLED) return;
  mixpanel.track(event, props, beacon ? { transport: 'sendBeacon' } : undefined);
};

/* ------------------------------------------------------------------ *
 * List context (set by app.js once list.js is initialised)
 * ------------------------------------------------------------------ */

let list = null;
export const registerList = (l) => { list = l; };

const resultCount = () => (list ? list.matchingItems.length : null);

/* ------------------------------------------------------------------ *
 * Events called from app.js
 * ------------------------------------------------------------------ */

let searchTimer;
let lastSearchSent = '';

const sendSearch = (query, activeFilterCount) => {
  const q = query.trim();
  if (!q || q === lastSearchSent) return;
  lastSearchSent = q;

  const count = resultCount();
  const props = {
    query_length_bucket: lengthBucket(q.length),
    result_count: count,
    zero_results: count === 0,
    active_filter_count: activeFilterCount,
  };
  if (count === 0) {
    const text = safeQueryText(q);
    if (text) props.query_text = text;
  }
  track('search_performed', props);
};

/** Call on every search input; debounced, or immediate with { immediate: true } (Enter). */
export const trackSearch = (query, activeFilterCount, { immediate = false } = {}) => {
  if (!ENABLED) return;
  clearTimeout(searchTimer);
  if (!query.trim()) { lastSearchSent = ''; return; }
  if (immediate) return sendSearch(query, activeFilterCount);
  searchTimer = setTimeout(() => sendSearch(query, activeFilterCount), SEARCH_DEBOUNCE_MS);
};

export const trackFilter = ({ filterType, filterValue, action, activeFilters }) => {
  track('filter_applied', {
    filter_type: filterType,
    filter_value: filterValue,
    action,
    active_filter_count: activeFilters.length,
    active_filters: activeFilters,
    result_count: resultCount(),
  });
};

export const trackLinkCopied = (btn) => {
  const card = btn.closest('.list__item');
  if (card) track('link_copied', itemInfo(card));
};

export const trackPageChange = (pageNumber, totalPages) => {
  track('list_page_changed', { page_number: pageNumber, total_pages: totalPages });
};

/* ------------------------------------------------------------------ *
 * Events owned here (page view, item open, nav, outbound links)
 * ------------------------------------------------------------------ */

const filtersActive = () =>
  Boolean(document.querySelector('[data-filter][aria-pressed="true"]')) ||
  Boolean(list && list.searched);

const trackItemOpened = (card, trigger) => {
  const position = list ? list.matchingItems.findIndex((i) => i.elm === card) + 1 : 0;
  track('item_opened', Object.assign(itemInfo(card), {
    trigger,
    position_in_list: position || null,
    was_filtered: filtersActive(),
  }));
};

const sectionFromHref = (href) => {
  try {
    return sectionFromPath(new URL(href, window.location.origin).pathname);
  } catch (_) {
    return null;
  }
};

const trackPageView = () => {
  const params = new URLSearchParams(window.location.search);
  const host = referrerHost();
  const hash = window.location.hash.slice(1);
  track('page_viewed', {
    path: normalizePath(window.location.pathname),
    acquisition_source: classifyAcquisition(params, host),
    referrer_domain: host || null,
    utm_source: params.get('utm_source') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null,
    is_deep_link: Boolean(hash && document.querySelector('.list__item[id="' + CSS.escape(hash) + '"]')),
  });
};

const initDelegatedTracking = () => {
  document.addEventListener('click', (e) => {

    // Item opened (More Info expanded). app.js flips aria-expanded in its own
    // handler, so read the state afterwards.
    const toggle = e.target.closest('.list__item [data-toggle]');
    if (toggle) {
      const card = toggle.closest('.list__item');
      setTimeout(() => {
        if (toggle.getAttribute('aria-expanded') === 'true') trackItemOpened(card, 'toggle');
      }, 0);
    }

    // Nav between sections (header nav links and the site title/logo)
    const navLink = e.target.closest('[data-nav-item], .header__title');
    if (navLink) {
      const to = sectionFromHref(navLink.getAttribute('href'));
      if (to) track('nav_clicked', { from_section: getSection(), to_section: to }, { beacon: true });
    }

    // Outbound: Further Reading
    const reading = e.target.closest('[data-further-reading]');
    if (reading) {
      const card = reading.closest('.list__item');
      track('further_reading_clicked', Object.assign(card ? itemInfo(card) : {}, {
        link_domain: reading.hostname || null,
      }), { beacon: true });
    }

    // Recommended tool link (Biases -> Tools)
    const toolLink = e.target.closest('[data-tool-link]');
    if (toolLink) {
      const card = toolLink.closest('.list__item');
      track('related_tool_clicked', {
        from_item_id: card ? card.id : '',
        to_tool_id: toolLink.dataset.toolId || '',
        to_tool_name: toolLink.dataset.toolName || '',
      }, { beacon: true });
    }
  });

  // Deep link (e.g. /#anchoring-effect) counts as an open
  const hash = window.location.hash.slice(1);
  const target = hash && document.querySelector('.list__item[id="' + CSS.escape(hash) + '"]');
  if (target) trackItemOpened(target, 'deep_link');
};

if (ENABLED) {
  const start = () => { trackPageView(); initDelegatedTracking(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
