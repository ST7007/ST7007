const CACHE_NAME = "luxride-cache-v1";
const urlsToCache = [
  "/",
  "/css/style.css",
  "/js/script.js"  // replace with your JS file if different
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});