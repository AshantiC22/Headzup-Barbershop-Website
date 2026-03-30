"use client";

import { useEffect } from "react";
import API from "@/lib/api";

// ── Converts base64 VAPID key to Uint8Array ───────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

// ── Push subscription ─────────────────────────────────────────────────────────
async function subscribeToPush() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await sendSubscriptionToServer(existing);
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    const keyRes = await API.get("push/vapid-key/");
    const vapidKey = keyRes.data.public_key;
    if (!vapidKey) return;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    await sendSubscriptionToServer(subscription);
  } catch (e) {
    console.log("[PWA] Push subscription failed:", e.message);
  }
}

async function sendSubscriptionToServer(subscription) {
  try {
    const json = subscription.toJSON();
    await API.post("push/subscribe/", {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    });
  } catch {}
}

// ── Review trigger ────────────────────────────────────────────────────────────
export function scheduleReviewTrigger(
  appointmentId,
  appointmentDate,
  appointmentTime,
) {
  try {
    const [year, month, day] = appointmentDate.split("-").map(Number);
    const [hour, minute] = appointmentTime.split(":").map(Number);
    const apptDateTime = new Date(year, month - 1, day, hour, minute, 0);
    const triggerAt = new Date(apptDateTime.getTime() + 30 * 60 * 1000);
    const msUntilTrigger = triggerAt.getTime() - Date.now();
    if (msUntilTrigger <= 0) return;
    setTimeout(async () => {
      try {
        await API.post(`review/trigger/${appointmentId}/`);
      } catch {}
    }, msUntilTrigger);
  } catch {}
}

// ── Token listener for SW ─────────────────────────────────────────────────────
function setupTokenListener() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "GET_TOKEN") {
      const token = localStorage.getItem("access");
      event.ports[0]?.postMessage({ token });
    }
  });
}

// ── Auto-update: detect new SW and reload all tabs ───────────────────────────
function setupAutoUpdate(registration) {
  // When a new SW is waiting, reload all open tabs so users get latest version
  const onStateChange = () => {
    if (registration.waiting) {
      // Tell the waiting SW to skip waiting and activate
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  };

  // New SW found during this session
  registration.addEventListener("updatefound", () => {
    const newWorker = registration.installing;
    if (!newWorker) return;
    newWorker.addEventListener("statechange", () => {
      if (
        newWorker.state === "installed" &&
        navigator.serviceWorker.controller
      ) {
        // New version installed — reload to get fresh content
        newWorker.postMessage({ type: "SKIP_WAITING" });
      }
    });
  });

  // SW controller changed (new SW took over) → reload page
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

// ── Main PWAProvider ──────────────────────────────────────────────────────────
export default function PWAProvider({ children }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Register SW
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[PWA] SW registered:", registration.scope);
        setupAutoUpdate(registration);
        const updateInterval = setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 1000);
        return () => clearInterval(updateInterval);
      })
      .catch((err) => {
        console.log("[PWA] SW registration failed:", err);
      });

    // Token listener for push notification actions
    setupTokenListener();

    // Subscribe to push if logged in
    const token = localStorage.getItem("access");
    if (token) subscribeToPush();

    // ── Keep Railway awake — ping every 4 minutes to prevent cold starts ──
    // Railway free tier sleeps after ~5 min of inactivity
    const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const ping = () =>
      fetch(`${BASE}/api/token/`, { method: "OPTIONS" }).catch(() => {});
    ping(); // immediate ping on load
    const keepAlive = setInterval(ping, 4 * 60 * 1000); // every 4 minutes
    return () => clearInterval(keepAlive);
  }, []);

  return children;
}
