/* MSR service worker: network-first so the site always shows the latest version; cache is only an offline fallback. */
const CACHE = 'msr-v3';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  // Content-hashed images never change: serve from cache first, fetch once.
  if (u.pathname.indexOf('/assets/img/') !== -1) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })));
    return;
  }
  // Other static images/fonts (logos, stickers, frames): show the cached copy instantly and refresh it in the background.
  if (u.pathname.indexOf('/assets/') !== -1 && /\.(png|jpe?g|webp|gif|svg|avif|woff2?|ttf)$/i.test(u.pathname) && r.mode !== 'navigate') {
    e.respondWith(caches.open(CACHE).then(c => c.match(r).then(m => {
      const net = fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => m);
      if (m) { e.waitUntil(net); return m; }
      return net;
    })));
    return;
  }
  e.respondWith(
    fetch(r, { cache: 'no-cache' }).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('./') : undefined)))
  );
});

/* Push notifications (sent by the msr-push edge function). */
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || 'MSR', {
    body: d.body || '', icon: 'assets/pwa/icon-192-v2.png', badge: 'assets/pwa/icon-192-v2.png', data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.navigate(target).catch(() => {}); return c.focus(); } }
    return clients.openWindow(target);
  }));
});
