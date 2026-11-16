/* Sousous : service worker FACULTATIF.
   À déposer dans le même dossier que sousous.html pour que l'appli s'ouvre sans réseau.
   Stratégie : réseau d'abord (toujours la dernière version), copie en cache,
   et repli sur le cache si le réseau échoue ou traîne plus de 2,5 s (utile en caisse). */
const CACHE = 'sousous-v1';
const TIMEOUT = 2500;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  const url = new URL(req.url);
  const key = url.origin + url.pathname; // même entrée quelle que soit la query (?amount=...)

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = fetch(req).then(res => {
      if (res && res.ok) cache.put(key, res.clone());
      return res;
    });
    const cached = await cache.match(key);
    if (!cached) return network;
    const timer = new Promise(resolve => setTimeout(() => resolve(cached), TIMEOUT));
    event.waitUntil(network.catch(() => {}));
    try {
      return await Promise.race([network.catch(() => cached), timer]);
    } catch (e) {
      return cached;
    }
  })());
});
