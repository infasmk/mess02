const CACHE_NAME = 'freshbites-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate SW
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Strategy
self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests
  if (event.request.method !== 'GET') return;

  // 1. Navigation Requests (HTML) -> Network First, Fallback to Cache
  // This ensures if the user is offline, they get the App Shell (index.html)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // 2. Asset Requests -> Stale-While-Revalidate (Performance)
  // Or stick to Network First for simplicity to ensure fresh data
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});