// Wealthwise — Service Worker
//
// Minimal PWA service worker. Two responsibilities:
//   1. Be present so the browser shows the "install" prompt
//   2. Cache the app shell so cold reloads on flaky networks render
//      the static parts instantly
//
// We deliberately do NOT cache:
//   - /api/* — every API response is per-user, sometimes streaming, often
//     mutates state. Caching would leak data and serve stale plans
//   - HTML documents — Next.js handles caching with proper invalidation;
//     intercepting it here breaks revalidation and login redirects
//
// Bump CACHE_VERSION any time the static asset shape changes; old caches
// are removed on activate.

const CACHE_VERSION = "wealthwise-v1";
const PRECACHE = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET; never touch POST/auth/api flows.
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Skip cross-origin and our own API routes.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/data/")) return;

  // For static asset paths, try cache first then network.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(js|css|svg|png|jpg|jpeg|webp|woff2?)$/i.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ??
          fetch(req).then((res) => {
            // Cache only successful, fully-formed responses.
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
            }
            return res;
          }),
      ),
    );
  }
  // Else: let the browser fetch normally. Pages stay fresh, auth redirects
  // work, and Next's RSC / streaming behaviour isn't intercepted.
});
