const CACHE='thalify-qc-old-installed-pwa';

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.put('/qc-old-version-marker',new Response('old-installed-pwa',{headers:{'content-type':'text/plain'}}));
  })());
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(self.clients.claim());
});

// Intentionally pass through network requests. This worker represents an older
// installed shell whose registration and cache should be replaced by sw.js.
