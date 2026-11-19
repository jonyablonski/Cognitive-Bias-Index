/**
 * Cache
 */

const staticCacheName = 'pages-cache-v30';
// Only precache stable URLs. The CSS filename is fingerprinted per build,
// so listing it here makes cache.addAll() fail with a 404 and breaks install.
const filesToCache = [
  '/',
  '/info.html'
];


/**
 * On Install
 */

self.addEventListener('install', event => {

  // Activate right away
	self.skipWaiting();

  // Extend installation until promise is resolved
  event.waitUntil(
    caches.open(staticCacheName)
    .then(cache => {
      return cache.addAll(filesToCache);
    })
  );
});



/**
 * On Fetch
 */

self.addEventListener('fetch', event => {

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Network first so deploys (and analytics changes) reach returning visitors;
  // fall back to the cache when offline.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(staticCacheName).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});



/**
 * On Activate
 */

self.addEventListener('activate', event => {
  const cacheAllowlist = [staticCacheName];

  // Delete outdated caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
