const CACHE = 'bodybuilder-v1.08';

// Install: just take over immediately — no pre-caching (avoids serving stale CDN content)
self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

// Activate: delete old caches, claim clients, force reload
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({type:'window', includeUncontrolled:true}))
      .then(clients => clients.forEach(c => c.navigate ? c.navigate(c.url) : c.postMessage('RELOAD')))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('sw.js')) return;

  // Navigation (HTML page): network first — always gets latest from GitHub
  // Falls back to cache only when offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(new Request(e.request.url, {cache: 'no-cache'}))
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else: cache first
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (res && res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      });
    })
  );
});
