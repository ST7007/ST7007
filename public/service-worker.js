const CACHE_NAME = "luxride-cache-v1";
const urlsToCache = [
  "/",
  "/css/style.css",
  "/js/script.js"  // replace with your JS file if different
];

self.addEventListener('install', event => {
  console.log('Service Worker installing.');
});

self.addEventListener('activate', event => {
  console.log('Service Worker activated.');
});

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});