// Keeps Surplus working offline. The page itself is fetched fresh when there's a connection
// (so updates arrive), and falls back to the saved copy when there isn't.
const CACHE = "surplus-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const keep = res => {
    if (res.ok && (req.url.startsWith(self.location.origin) || /fonts\.(googleapis|gstatic)\.com/.test(req.url))) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  };
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(keep).catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(keep)));
});
