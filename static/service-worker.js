/**
 * Cache
 */

const staticCacheName = 'pages-cache-v3';
const filesToCache = [
  '/',
  'css/app.min.css',
  'js/app.min.js',
  'index.html',
  'info.html'
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
  event.respondWith(caches.match(event.request)
    .then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
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
