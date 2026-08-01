const CACHE = "thalifit-v5.3.2-wordmark-repair";
const ASSETS = ["./","./index.html","./manifest.json","./privacy.html","./icon-192.png","./icon-512.png","./logo-wordmark-dark.png","./logo-wordmark-light.png","./brand-mark.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const req = e.request;

  // Only ever handle same-origin GET requests. Everything else — POSTs to the AI
  // worker, cross-origin font/CDN requests, etc. — passes straight to the network,
  // untouched. The Cache API cannot store non-GET requests, so touching them here
  // is what broke API calls with "Failed to convert value to 'Response'".
  if (req.method !== "GET") return;                       // let the browser handle it
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // don't intercept cross-origin

  e.respondWith(
    fetch(req)
      .then(r => {
        // only cache valid, basic (same-origin) responses
        if (r && r.status === 200 && r.type === "basic") {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return r;
      })
      .catch(() => caches.match(req).then(hit => hit || Response.error()))
  );
});
