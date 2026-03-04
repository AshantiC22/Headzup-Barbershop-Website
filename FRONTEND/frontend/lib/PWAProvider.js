"use client";

import { useEffect } from "react";
import API from "@/lib/api";

// ── Converts a base64 VAPID public key to Uint8Array ─────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── Subscribe to push notifications ──────────────────────────────────────────
async function subscribeToPush() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await sendSubscriptionToServer(existing);
      return;
    }

    // Ask permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // Get VAPID public key from backend
    const keyRes = await API.get("push/vapid-key/");
    const vapidKey = keyRes.data.public_key;
    if (!vapidKey) return;

    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    await sendSubscriptionToServer(subscription);
  } catch (e) {
    // Silently fail — push is a nice-to-have
    console.log("Push subscription failed:", e.message);
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
  } catch {
    // ignore
  }
}

// ── Schedule a 30-minute review notification trigger ─────────────────────────
export function scheduleReviewTrigger(
  appointmentId,
  appointmentDate,
  appointmentTime,
) {
  try {
    // Parse appointment datetime
    const [year, month, day] = appointmentDate.split("-").map(Number);
    const [hour, minute] = appointmentTime.split(":").map(Number);
    const apptDateTime = new Date(year, month - 1, day, hour, minute, 0);
    const triggerAt = new Date(apptDateTime.getTime() + 30 * 60 * 1000); // +30 min
    const msUntilTrigger = triggerAt.getTime() - Date.now();

    if (msUntilTrigger <= 0) return; // already past

    console.log(
      `Review trigger scheduled in ${Math.round(msUntilTrigger / 60000)} minutes for appt ${appointmentId}`,
    );

    setTimeout(async () => {
      try {
        await API.post(`review/trigger/${appointmentId}/`);
      } catch {
        // ignore — notification is best-effort
      }
    }, msUntilTrigger);
  } catch {
    // ignore
  }
}

// ── Listen for service worker messages (token requests) ──────────────────────
function setupTokenListener() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "GET_TOKEN") {
      const token = localStorage.getItem("access");
      event.ports[0].postMessage({ token });
    }
  });
}

// ── Main PWA Provider component ───────────────────────────────────────────────
export default function PWAProvider({ children }) {
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service worker registered:", reg.scope);
        })
        .catch((err) => {
          console.log("[PWA] SW registration failed:", err);
        });
    }

    // Set up token listener for SW
    setupTokenListener();

    // Subscribe to push if user is logged in
    const token = localStorage.getItem("access");
    if (token) {
      subscribeToPush();
    }
  }, []);

  return children;
}
