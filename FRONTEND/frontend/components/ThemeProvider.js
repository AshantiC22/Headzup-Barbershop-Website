"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Two lights for one painting:
//   Day      — Monet's harbor at sunrise: mist blue, lead white, a low orange sun.
//   Nocturne — Whistler's blue and gold: deep night water, gilt sparks.
//
// The colors themselves live in globals.css as CSS variables. This provider
// only decides which one is showing, remembers the choice, and tells the
// canvas painters which palette to use. The <html data-theme> attribute is
// set before first paint by a tiny script in layout.tsx, so there is no flash.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "headzup_theme"; // values: "light" | "dark" (kept from v1)

// Hex values for code that can't read CSS variables (canvas, meta theme-color).
export const TOKENS = {
  light: {
    name: "light", bg: "#E9EEF1", surface: "#F8FAFB", ink: "#18213A", ink2: "#4A5470",
    ink3: "#5B6582", accent: "#EE7434", onAccent: "#18213A", cobalt: "#2B4F8F",
    gilt: "#B8893A", ok: "#2F7A5F", bad: "#B4283A",
  },
  dark: {
    name: "dark", bg: "#0F1A2E", surface: "#16233D", ink: "#ECE7DA", ink2: "#A9B2C7",
    ink3: "#8C96AE", accent: "#E7B04B", onAccent: "#0F1A2E", cobalt: "#8FB0E8",
    gilt: "#D9A945", ok: "#5FC29B", bad: "#F07A84",
  },
};

const ThemeContext = createContext({
  mode: "light", isDark: false, theme: TOKENS.light, palette: "day",
  toggle: () => {}, setMode: () => {},
});

function readInitial() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState("light");

  const apply = useCallback((next, persist = true) => {
    setModeState(next);
    const root = document.documentElement;
    root.setAttribute("data-theme", next);
    root.style.colorScheme = next;
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    if (metas.length) metas.forEach((m) => m.setAttribute("content", TOKENS[next].bg));
    else {
      const m = document.createElement("meta");
      m.name = "theme-color"; m.content = TOKENS[next].bg;
      document.head.appendChild(m);
    }
    if (persist) { try { localStorage.setItem(STORAGE_KEY, next); } catch {} }
  }, []);

  // Sync with what the pre-paint script decided.
  useEffect(() => { apply(readInitial(), false); }, [apply]);

  // Follow the OS setting until the visitor picks one themselves.
  useEffect(() => {
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch {}
    if (saved) return;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = (e) => apply(e.matches ? "dark" : "light", false);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [apply]);

  const toggle = useCallback(() => apply(mode === "dark" ? "light" : "dark"), [mode, apply]);

  const value = {
    mode,
    isDark: mode === "dark",
    theme: TOKENS[mode],
    palette: mode === "dark" ? "night" : "day",
    toggle,
    setMode: apply,
  };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }

/** Day / Nocturne switch. A real two-option control, not a mystery toggle. */
export function ThemeToggle({ className = "" }) {
  const { mode, setMode } = useTheme();
  return (
    <div className={`hu-theme-switch ${className}`} role="radiogroup" aria-label="Color scheme">
      <button type="button" role="radio" aria-checked={mode === "light"}
        className={mode === "light" ? "is-on" : ""} onClick={() => setMode("light")}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="currentColor" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <rect key={a} x="11.2" y="1.8" width="1.6" height="3.6" rx=".8" fill="currentColor"
              transform={`rotate(${a} 12 12)`} />
          ))}
        </svg>
        Day
      </button>
      <button type="button" role="radio" aria-checked={mode === "dark"}
        className={mode === "dark" ? "is-on" : ""} onClick={() => setMode("dark")}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" />
        </svg>
        Nocturne
      </button>
    </div>
  );
}
