// HEADZ UP — Service Worker
// Strategy:
//   - App shell (pages, fonts, images) → Cache First
//   - API calls (/api/) → Network First with offline fallback
//   - Everything else → Network with cache fallback

const CACHE_VERSION = "headz-up-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

// App shell — these get cached on install
const PRECACHE_URLS = [
  "/home",
  "/login",
  "/book",
  "/dashboard",
  "/terms",
  "/offline",
  "/favicon.svg",
  "/favicon.ico",
  "/site.webmanifest",
];

// ── Install — precache app shell ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch((err) => {
          // Don't fail install if a page isn't reachable yet
          console.warn("[SW] Precache partial failure:", err);
        });
      })
      .then(() => self.skipWaiting()),
  );
});

// ── Activate — clean up old caches ───────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                k.startsWith("headz-up-") &&
                k !== STATIC_CACHE &&
                k !== API_CACHE,
            )
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests (Stripe, fonts CDN handled separately)
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin && !url.hostname.includes("fonts.g"))
    return;

  // API — Network First
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Static assets + pages — Cache First
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

// ── Strategies ────────────────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback
    const fallback = await caches.match("/offline");
    return fallback || new Response("You are offline.", { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "You are offline." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ── Push notifications (future-ready) ────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "HEADZ UP", {
      body: data.body || "You have an update.",
      icon: "/icon-192.png",
      badge: "/favicon.svg",
      data: { url: data.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || "/dashboard"),
  );
});
