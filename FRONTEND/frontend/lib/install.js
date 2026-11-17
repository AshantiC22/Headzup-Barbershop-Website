// Putting the site on the home screen. Chrome and Edge (Android, desktop)
// offer a real install prompt, but only once, early, before any button
// exists, so it's caught at startup and kept here. iPhones never offer one:
// Safari's Share menu is the only way, so we explain that instead.

let deferred = null;
let installed = false;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS says it's a Mac
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

/** Call once, as early as possible in the browser. */
export function catchInstallPrompt() {
  if (typeof window === "undefined" || window.__huInstall) return;
  window.__huInstall = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // keep it for our own button
    deferred = e;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
}

/**
 * "installed"  already running from the home screen
 * "prompt"     the browser will install it from our button
 * "ios"        iPhone or iPad Safari: Share → Add to Home Screen
 * "none"       this browser can't (Firefox desktop, in-app browsers)
 */
export function installState() {
  if (typeof window === "undefined") return "none";
  if (installed || isStandalone()) return "installed";
  if (deferred) return "prompt";
  if (isIOS()) return "ios";
  return "none";
}

export function subscribeInstall(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Shows the browser's install dialog. Resolves true if they said yes. */
export async function promptInstall() {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  emit();
  try {
    await e.prompt();
    const { outcome } = await e.userChoice;
    return outcome === "accepted";
  } catch {
    return false;
  }
}
