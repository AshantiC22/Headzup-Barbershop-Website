"use client";
// Session helpers. The API issues JWTs; the payload carries is_staff.
import { useCallback, useEffect, useState } from "react";

const API_ROOT = process.env.NEXT_PUBLIC_API_URL || "https://api.headzupp.com";

export function decodeToken(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part));
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  } catch {}
}

export function saveSession({ access, refresh }) {
  try {
    if (access) localStorage.setItem("access", access);
    if (refresh) localStorage.setItem("refresh", refresh);
  } catch {}
}

/** Only follow ?next= links that stay on this site. */
export function safeNext(next, fallback = "/dashboard") {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) return next;
  return fallback;
}

/**
 * Who is looking at the page? Returns { ready, loggedIn, isStaff }.
 * Refreshes an expired access token quietly when a refresh token exists.
 */
export function useSession() {
  const [state, setState] = useState({ ready: false, loggedIn: false, isStaff: false });

  const check = useCallback(() => {
    let access = null;
    try { access = localStorage.getItem("access"); } catch {}
    if (!access) { setState({ ready: true, loggedIn: false, isStaff: false }); return; }
    const p = decodeToken(access);
    if (p && p.exp && p.exp * 1000 > Date.now()) {
      setState({ ready: true, loggedIn: true, isStaff: !!p.is_staff });
      return;
    }
    let refresh = null;
    try { refresh = localStorage.getItem("refresh"); } catch {}
    if (!refresh) { clearSession(); setState({ ready: true, loggedIn: false, isStaff: false }); return; }
    fetch(`${API_ROOT}/api/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.access) {
          saveSession(d);
          const np = decodeToken(d.access);
          setState({ ready: true, loggedIn: true, isStaff: !!np?.is_staff });
        } else {
          clearSession();
          setState({ ready: true, loggedIn: false, isStaff: false });
        }
      })
      .catch(() => setState({ ready: true, loggedIn: false, isStaff: false }));
  }, []);

  useEffect(() => {
    check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [check]);

  return state;
}

export { API_ROOT };
