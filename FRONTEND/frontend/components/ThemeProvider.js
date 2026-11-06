"use client";
// Two lights for one painting: Day (Monet's harbor at sunrise) and Nocturne
// (Whistler's blue and gold). The colors live in globals.css; this file only
// decides which one is on.
//
// <html data-theme> is the source of truth. The inline script in layout.tsx
// sets it before first paint, and everything here reads it back through
// useSyncExternalStore, so React never disagrees with what's on screen.
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { arrowSelect, rovingIndex } from "@/components/ui/roving";

const STORAGE_KEY = "headzup_theme";
const MODES = ["light", "dark"];

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

function subscribe(onChange) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const readMode = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function applyMode(mode, { remember }) {
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
  // Browser chrome follows the page, not the OS, once a theme is on.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", TOKENS[mode].bg));
  if (remember) { try { localStorage.setItem(STORAGE_KEY, mode); } catch {} }
}

const ThemeContext = createContext({
  mode: "light", isDark: false, theme: TOKENS.light, palette: "day", setMode: () => {},
});

export function ThemeProvider({ children }) {
  const mode = useSyncExternalStore(subscribe, readMode, () => "light");

  // Follow the OS until the visitor picks a theme themselves.
  useEffect(() => {
    let chosen = null;
    try { chosen = localStorage.getItem(STORAGE_KEY); } catch {}
    if (chosen) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => applyMode(e.matches ? "dark" : "light", { remember: false });
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setMode = useCallback((next) => applyMode(next, { remember: true }), []);

  const value = useMemo(() => ({
    mode,
    isDark: mode === "dark",
    theme: TOKENS[mode],
    palette: mode === "dark" ? "night" : "day",
    setMode,
  }), [mode, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/** Day / Nocturne switch: two labelled options rather than a mystery toggle. */
export function ThemeToggle({ className = "" }) {
  const { mode, setMode } = useTheme();
  return (
    <div className={`hu-theme-switch ${className}`} role="radiogroup" aria-label="Color scheme"
      onKeyDown={(e) => arrowSelect(e, MODES, mode, setMode)}>
      <button type="button" role="radio" aria-checked={mode === "light"} tabIndex={rovingIndex("light", mode, MODES)}
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
      <button type="button" role="radio" aria-checked={mode === "dark"} tabIndex={rovingIndex("dark", mode, MODES)}
        className={mode === "dark" ? "is-on" : ""} onClick={() => setMode("dark")}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" />
        </svg>
        Nocturne
      </button>
    </div>
  );
}
