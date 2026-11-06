// HEADZ UP service worker.
//
//   pages            network first, cached copy if offline, then /offline
//   /_next/static/   cache first (file names are content hashes)
//   everything else  not touched: API calls, maps, other origins
//
// Bump CACHE_VERSION when the offline page or caching rules change.

const CACHE_VERSION = "headzup-v6";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGE_CACHE).then((cache) => cache.add(OFFLINE_URL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const copy = response.clone();
      caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) event.respondWith(cacheFirst(request));
  else if (request.mode === "navigate") event.respondWith(networkFirst(request));
});

// Push ----------------------------------------------------------------------

const OPEN_URL = {
  booking_confirmed: "/dashboard",
  booking_cancelled: "/dashboard",
  booking_reminder: "/dashboard",
  reschedule_request: "/barber-dashboard?tab=reschedules",
  reschedule_response: "/dashboard",
  walk_in: "/dashboard",
  strike: "/dashboard",
  haircut_review: "/dashboard",
  new_booking: "/barber-dashboard",
  signup_client: "/book",
  signup_barber: "/barber-dashboard",
  blast: "/",
};

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const data = payload.data || {};
  const type = data.type || "general";
  const url = data.url || OPEN_URL[type] || "/";
  const needsAnswer = type === "haircut_review" || type === "reschedule_request";

  event.waitUntil(Promise.all([
    self.registration.showNotification(payload.title || "Headz Up", {
      body: payload.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { ...data, url },
      tag: `headzup-${type}-${data.appointment_id || Date.now()}`,
      requireInteraction: needsAnswer,
      actions: type === "haircut_review" ? [{ action: "open", title: "Leave a review" }, { action: "later", title: "Later" }]
        : type === "reschedule_request" ? [{ action: "open", title: "See request" }]
        : [],
    }),
    // Open tabs update their badges without waiting for a refresh.
    self.clients.matchAll({ type: "window" })
      .then((tabs) => tabs.forEach((tab) => tab.postMessage({ type: "PUSH_RECEIVED", data: { ...data, type } }))),
  ]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "later") return;
  const url = event.notification.data?.url || "/";

  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const tab = tabs.find((t) => new URL(t.url).origin === self.location.origin);
    if (tab) {
      await tab.focus();
      tab.postMessage({ type: "PUSH_NOTIFICATION_CLICK", url });
      return;
    }
    await self.clients.openWindow(url);
  })());
});
