"use client";
// Registers /sw.js and keeps it current.
//
// A new deploy ships a new worker. It takes over straight away (skipWaiting in
// sw.js), but the page someone is looking at was built against the old chunks,
// so it needs a reload. Doing that while they're mid-booking would throw away
// their form, so the reload waits until the tab is in the background.
import { useEffect } from "react";

const CHECK_EVERY_MS = 30 * 60 * 1000;

export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    let interval = 0;
    let stale = false;
    const hadController = !!navigator.serviceWorker.controller;

    const reloadWhenHidden = () => {
      if (stale && document.visibilityState === "hidden") window.location.reload();
    };
    const onControllerChange = () => {
      // First install on a fresh visit also fires this; nothing is stale then.
      if (!hadController) return;
      stale = true;
      reloadWhenHidden();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", reloadWhenHidden);

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      interval = window.setInterval(() => reg.update().catch(() => {}), CHECK_EVERY_MS);
    }).catch(() => {});

    return () => {
      window.clearInterval(interval);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", reloadWhenHidden);
    };
  }, []);

  return null;
}
