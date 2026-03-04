// ── HEADZ UP Service Worker ───────────────────────────────────────────────────
const CACHE_NAME = "headzup-v2";
const STATIC_ASSETS = ["/", "/offline", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached || fetch(event.request).catch(() => caches.match("/offline"))
      );
    }),
  );
});

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
            if (response && response.token) {
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

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "GET_TOKEN") {
    event.ports[0].postMessage({ token: null });
  }
});
