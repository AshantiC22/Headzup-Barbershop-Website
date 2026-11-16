// Web push, browser side. Everything here touches window, so call it from
// effects and event handlers only.
import API from "@/lib/api";

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

/**
 * "ready"        push works here
 * "ios-install"  iPhone Safari: push only works once added to the home screen
 * "unsupported"  no service worker or PushManager
 */
export function pushSupport() {
  if (isIOS() && !isStandalone()) return "ios-install";
  if ("serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined") return "ready";
  return "unsupported";
}

export function permission() {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

export async function currentSubscription() {
  if (pushSupport() !== "ready") return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

function keyBytes(base64url) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function vapidKey() {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const { data } = await API.get("push/vapid-key/");
  return data?.public_key || null;
}

/** Tell the API about this device. Safe to repeat; the server keys on endpoint. */
export function saveSubscription(sub) {
  const { endpoint, keys } = sub.toJSON();
  return API.post("push/subscribe/", { endpoint, p256dh: keys.p256dh, auth: keys.auth });
}

/**
 * Ask for permission and subscribe. Must run inside a click handler.
 * Resolves to "on", "blocked", "unavailable" or "not-configured".
 */
export async function turnOnPush() {
  if (pushSupport() !== "ready") return "unavailable";
  const result = await Notification.requestPermission();
  if (result !== "granted") return "blocked";
  const key = await vapidKey();
  if (!key) return "not-configured";
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
  await saveSubscription(sub);
  return "on";
}
