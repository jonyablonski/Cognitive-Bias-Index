# Tracking Plan — Cognitive Bias Index

Status: **IMPLEMENTED and verified locally** (production build, headless Chrome). Not yet deployed.

This plan **replaces** the existing 10-event scheme in `assets/js/mixpanel.js` (session_started, landing_page_viewed, bias_page_viewed, category_page_viewed, bias_from_category_clicked, related_content_clicked, how_to_avoid_section_viewed, how_to_avoid_tip_clicked, category_navigation_clicked, session_conversion_activity). Those assume a funnel the site doesn't have.

## Site model (what is actually trackable)

| Section | URL | List UI |
|---|---|---|
| `biases` | `/` | list.js cards; search + category/tag filters; 50 per page |
| `tools` | `/tools/` | same UI, same JS |
| `info` | `/info.html` | static page |

Items are in-page expandable cards (no per-item pages). Item IDs are the urlized title (e.g. `confirmation-bias`), which is also the `#hash` used by copy-link.

## Conventions

- Event names: `snake_case`, past tense. Property names: `snake_case`.
- All events go through `track(event, props)` in `assets/js/analytics.js`. No direct `mixpanel.track` elsewhere.
- Super properties (registered once, attached to every event): `section` (`biases | tools | info`), `site_env` (`production`).
- Anonymous only: no `identify`, no PII, no names/emails. Mixpanel default geolocation (country/city from IP) stays on; say if you want `ip: false` instead. Do-Not-Track is respected (SDK default).
- Loaded only when `HUGO_ENV=production` **and** `MIXPANEL_TOKEN` is set. Token comes from the build environment (Netlify env var); it is never in source.

## Events

### 1. `page_viewed`
Fires once per page load (replaces SDK auto-pageview so we control properties).

| Property | Type | Notes |
|---|---|---|
| `section` | enum | biases / tools / info |
| `path` | string | normalized, no query/hash |
| `acquisition_source` | enum | direct / organic_search / social / referral / email / paid / other (reuses existing classifier) |
| `referrer_domain` | string \| null | external referrers only |
| `utm_source`, `utm_medium`, `utm_campaign` | string \| null | if present |
| `is_deep_link` | bool | URL has a `#item` hash that matches a card |

### 2. `search_performed`
Fires after typing pauses (800 ms debounce) with a non-empty query, and on Enter. Not fired on clear.

| Property | Type | Notes |
|---|---|---|
| `section` | enum | biases / tools |
| `query_length_bucket` | enum | `1-3`, `4-10`, `11+` |
| `result_count` | int | after search and any active filters |
| `zero_results` | bool | |
| `query_text` | string | **only when `zero_results` is true**, lowercased, trimmed, truncated to 40 chars; omitted if it contains `@` or 6+ digits |
| `active_filter_count` | int | |

### 3. `filter_applied`
Fires on each filter toggle, and on "Clear Filters".

| Property | Type | Notes |
|---|---|---|
| `section` | enum | biases / tools |
| `filter_type` | enum | category / tag / all |
| `filter_value` | string | e.g. `Too Much Information` (button label); `null` for clear |
| `action` | enum | added / removed / cleared |
| `active_filter_count` | int | after the change |
| `active_filters` | string[] | all currently selected values |
| `result_count` | int | |

### 4. `item_opened`
Fires when "More Info" is expanded (not on collapse) and when a deep link lands on an item.

| Property | Type | Notes |
|---|---|---|
| `section` | enum | biases / tools |
| `item_id` | string | urlized title |
| `item_name` | string | e.g. "Confirmation Bias", "Pre-Mortem Analysis" |
| `item_category` | string | |
| `trigger` | enum | toggle / deep_link |
| `position_in_list` | int | 1-based position in the currently visible list |
| `was_filtered` | bool | any search or filter active |

### 5. `link_copied`
Fires after the clipboard write succeeds.

| Property | Type | Notes |
|---|---|---|
| `section` | enum | biases / tools |
| `item_id` | string | |
| `item_name` | string | |

### 6. `list_page_changed`
Fires on pagination clicks (the lists paginate at 50 items).

| Property | Type | Notes |
|---|---|---|
| `section` | enum | biases / tools |
| `page_number` | int | 1-based, read from list.js after the click |
| `total_pages` | int | |

### 7. `nav_clicked`
Fires on header nav links (`[data-nav-item]`) between Biases / Tools / Info.

| Property | Type | Notes |
|---|---|---|
| `from_section` | enum | |
| `to_section` | enum | |

### 8. `further_reading_clicked`
Further Reading link clicked inside a Biases card. Properties: `item_id`, `item_name`, `item_category`, `link_domain`. Sent via `sendBeacon`.

### 9. `related_tool_clicked`
Recommended Tool link clicked inside a Biases card. Properties: `from_item_id`, `to_tool_id`, `to_tool_name`. Sent via `sendBeacon`.

## Deliberately not tracked (ask if you want any added)
- "How to Avoid" dwell/tip clicks (dropped with the old scheme; Biases-only).
- Theme toggle, filter panel open/close.
- Raw text of searches that returned results.

## Implementation notes
- `scripts.html` emits `<meta name="mixpanel-token">` only in production when `MIXPANEL_TOKEN` is set; `analytics.js` reads it and no-ops if absent. A client-side token is visible in the page by design, but stays out of git.
- Item events use the existing `.list__item` markup (`id` = item id, `.list__item-title-text` = name), so no template changes were needed for Tools.
- Batching is off (`batch_requests: false`): with batching, events queued just before navigation were lost (verified). Everything is sent immediately.
- `hostname` is registered on every event so localhost/preview test traffic can be filtered out in Mixpanel.
- Event hooks are added as small calls inside `app.js` handlers (search, filter, copy, pagination) so counts reflect real list.js state; `item_opened` and `nav_clicked` use delegated listeners in `analytics.js`.
- `mixpanel.js` was deleted; `app.js` imports `analytics.js` instead. The service-worker cache version gets bumped.

## Verification checklist (Phase 5)
Search with hits, search with zero hits, add/remove category and tag filters, clear filters, open items on both sections, deep link, copy link, change page, nav between all three sections, each checked in the browser Network tab and Mixpanel Live View.
