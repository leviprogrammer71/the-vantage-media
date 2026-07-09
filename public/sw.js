// The Vantage — service worker
//
// History note: an older version (v1) cached every static asset including
// /vantage/*.mp4 and /music/*.mp3. After signing in, the cached entries got
// returned for media requests but with a stale or zero-byte body, which
// caused images and videos to disappear post-auth. This rewrite bumps the
// cache name so old caches are evicted on first activate, and explicitly
// skips media files — let the browser handle them with its own HTTP cache.
//
// Cached: HTML shell + manifest + icons. Everything else is network-only.

// Bump this on every deploy that must invalidate the app shell. Changing the
// bytes of this file makes the browser re-install the SW, and the activate
// handler below evicts every cache that isn't the current name.
const CACHE = "vantage-v4";

// Only the app shell — never media or third-party.
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Anything matching these patterns is NEVER cached by the SW. The browser's
// own HTTP cache + Vercel's edge CDN handle these correctly.
const SKIP_CACHE_PATTERNS = [
  /\.mp4($|\?)/i,
  /\.webm($|\?)/i,
  /\.mov($|\?)/i,
  /\.mp3($|\?)/i,
  /\.wav($|\?)/i,
  /\.jpg($|\?)/i,
  /\.jpeg($|\?)/i,
  /\.png($|\?)/i,
  /\.webp($|\?)/i,
  /\.svg($|\?)/i,
  /\.gif($|\?)/i,
  /\/vantage\//i,
  /\/music\//i,
  /supabase\.co/i,
  /\/functions\/v1\//i,
  /\/auth\/v1\//i,
  /accounts\.google\.com/i,
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = e.request.url;

  // Never touch media, auth, or any cross-origin asset — let the browser
  // handle them fully. This is the single most important rule: caching
  // /vantage/result.mp4 in a service worker once and serving it forever
  // breaks signed-URL refreshes and post-auth re-renders.
  if (SKIP_CACHE_PATTERNS.some((re) => re.test(url))) {
    return;
  }

  // Navigation requests: network-first with HTML-shell fallback so the SPA
  // routes load fresh after deploys, even when offline.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/"))
    );
    return;
  }

  // Same-origin static assets (JS bundle, CSS, manifest, icons): network-
  // first with cache fallback. Stale-while-revalidate gives us a fast
  // first paint after deploy without serving stale forever.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || Response.error()))
  );
});
