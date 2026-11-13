"use client";
// Session helpers. The API issues JWTs and the access token's payload carries
// is_staff, which is all the nav needs to know.
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { API_ROOT } from "./config";

const SESSION_EVENT = "headzup:session";

function decodeToken(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part));
  } catch {
    return null;
  }
}

const announce = () => window.dispatchEvent(new Event(SESSION_EVENT));

export function saveSession({ access, refresh }) {
  try {
    if (access) localStorage.setItem("access", access);
    if (refresh) localStorage.setItem("refresh", refresh);
  } catch {}
  announce();
}

export function clearSession() {
  try {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  } catch {}
  announce();
}

/** Only follow ?next= links that stay on this site. */
export function safeNext(next, fallback = "/dashboard") {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) return next;
  return fallback;
}

// The access token is the store. Other tabs signing in or out arrive through
// "storage"; this tab's own changes through SESSION_EVENT.
function subscribe(onChange) {
  window.addEventListener("storage", onChange);
  window.addEventListener("focus", onChange);
  window.addEventListener(SESSION_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("focus", onChange);
    window.removeEventListener(SESSION_EVENT, onChange);
  };
}
const readAccess = () => { try { return localStorage.getItem("access"); } catch { return null; } };
const NOT_YET = undefined; // server render and hydration: we don't know yet

/** Who is looking at the page? { ready, loggedIn, isStaff } */
export function useSession() {
  const access = useSyncExternalStore(subscribe, readAccess, () => NOT_YET);
  const claims = useMemo(() => (access ? decodeToken(access) : null), [access]);

  // An expired access token gets one quiet refresh; if that fails, sign out.
  useEffect(() => {
    if (!claims?.exp || claims.exp * 1000 > Date.now()) return;
    let refresh = null;
    try { refresh = localStorage.getItem("refresh"); } catch {}
    if (!refresh) { clearSession(); return; }
    const ctrl = new AbortController();
    fetch(`${API_ROOT}/api/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d?.access ? saveSession(d) : clearSession()))
      .catch(() => {}); // offline: keep the tokens; the API client refreshes on its next 401
    return () => ctrl.abort();
  }, [claims]);

  return {
    ready: access !== NOT_YET,
    loggedIn: !!claims,
    isStaff: !!claims?.is_staff,
  };
}
