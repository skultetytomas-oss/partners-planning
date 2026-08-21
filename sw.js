// ══════════════════════════════════════════
//  PARTNERS — Service Worker (PWA)
//  Cache-first pre app shell, network-only
//  pre Firebase, Google Fonts a admin.html.
// ══════════════════════════════════════════

// FIX (2026-08-21): bump verzie cache je NUTNÝ pri každom nasadení
// opravy do index.html — appka je cache-first PWA, takže bez bumpu
// by spolupracovníci s nainštalovanou appkou naďalej dostávali starú
// (chybnú) verziu z cache a oprava straty dát by sa k nim nedostala.
const CACHE_NAME = 'partners-v4';

const CACHE_ASSETS = [
  '/partners-planning/',
  '/partners-planning/index.html',
  '/partners-planning/exercises.js',
  '/partners-planning/firebase-config.js',
  '/partners-planning/manifest.json',
  '/partners-planning/icons/icon-192.png',
  '/partners-planning/icons/icon-512.png',
];

// ── Install: cache app shell ───────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(CACHE_ASSETS).catch(err => {
        console.warn('[SW] Niektoré assets sa nedali cachovať:', err);
      })
    )
  );
  self.skipWaiting();
});

// ── Activate: clear old caches ─────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Mažem starý cache:', k);
          return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for app shell ──────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Network-only: Firebase / Google APIs / Fonts / admin panel
  // (admin.html sa nikdy nemá cachovať — musí byť vždy aktuálny)
  if (
    url.includes('/partners-planning/admin.html') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com') ||
    url.includes('gstatic.com/firebasejs') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com')
  ) return;

  // Cache-first pre všetko ostatné
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached || new Response('Offline – otvorte aplikáciu keď budete online.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }));
    })
  );
});
