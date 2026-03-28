// ── HEADZ UP Service Worker ───────────────────────────────────────────────────
// Strategy:
//   • HTML + Next.js pages  → Network first, cache fallback (always fresh)
//   • Static assets (_next) → Cache first, network fallback (fast loads)
//   • API calls             → Network only (never cache)
//   • Push notifications    → unchanged

const CACHE_VERSION = "headzup-v4";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

// ── Install: cache only the bare minimum ──────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.addAll(["/offline"]).catch(() => {})),
  );
  // Take over immediately — don't wait for old SW to die
  self.skipWaiting();
});

// ── Activate: wipe ALL old caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== PAGE_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch: smart routing ──────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 1. API calls → always network, never cache
  if (url.pathname.startsWith("/api/")) return;

  // 2. Next.js static chunks (_next/static) → cache first, good for perf
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return new Response("Offline", { status: 503 });
        }
      }),
    );
    return;
  }

  // 3. Everything else (HTML pages) → network first, cache fallback
  //    This means PWA users always get the latest version when online
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful page responses
        if (response.ok && response.status === 200) {
          const responseClone = response.clone();
          caches.open(PAGE_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed → try cache
        return caches
          .match(request)
          .then((cached) => cached || caches.match("/offline"));
      }),
  );
});

// ── Background sync: tell all open tabs to refresh when SW updates ────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "GET_TOKEN") {
    event.ports[0]?.postMessage({ token: null });
  }
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "HEADZ UP",
      body: event.data ? event.data.text() : "New notification",
    };
  }

  const title = payload.title || "HEADZ UP";
  const body = payload.body || "You have a new notification";
  const data = payload.data || {};
  const isReview = data.type === "haircut_review";

  const options = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data,
    vibrate: [200, 100, 200],
    requireInteraction: isReview,
    actions: isReview
      ? [
          { action: "yes", title: "Yes, it was great!" },
          { action: "no", title: "No, not yet" },
        ]
      : [],
    tag: isReview ? `review-${data.appointment_id}` : "headzup-notification",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action;
  const apptId = data.appointment_id;
  const isReview = data.type === "haircut_review";

  if (isReview && apptId && (action === "yes" || action === "no")) {
    const completed = action === "yes";
    const apiBase =
      "https://headzup-barbershop-website-production.up.railway.app/api";

    event.waitUntil(
      (async () => {
        try {
          const allClients = await self.clients.matchAll({ type: "window" });
          let token = null;
          for (const client of allClients) {
            const response = await new Promise((resolve) => {
              const channel = new MessageChannel();
              channel.port1.onmessage = (e) => resolve(e.data);
              client.postMessage({ type: "GET_TOKEN" }, [channel.port2]);
              setTimeout(() => resolve(null), 1000);
            });
            if (response?.token) {
              token = response.token;
              break;
            }
          }
          if (token) {
            await fetch(`${apiBase}/review/submit/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ appointment_id: apptId, completed }),
            });
          }
          const url = completed ? "/dashboard?review=thanks" : "/dashboard";
          if (allClients.length > 0) {
            allClients[0].focus();
            allClients[0].navigate(url);
          } else self.clients.openWindow(url);
        } catch {
          self.clients.openWindow("/dashboard");
        }
      })(),
    );
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const url = data.url || "/";
      if (clients.length > 0) {
        clients[0].focus();
        return;
      }
      return self.clients.openWindow(url);
    }),
  );
});
