const CACHE_NAME = "luxride-cache-v1";
const urlsToCache = [
  "/",
  "/css/style.css",
  "/js/script.js"  // replace with your JS file if different
];
const CACHE_NAME = 'luxride-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/customer-enquiry.html',
  '/css/style.css',
  '/icons/icon-192.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

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