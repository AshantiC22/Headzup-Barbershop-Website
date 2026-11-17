"use client";
// Day (the default: paper, ink, one yellow) and Night (the same shop after
// close). The colors live in globals.css; this file only decides which is on.
//
// <html data-theme> is the source of truth. The inline script in layout.tsx
// sets it before first paint, and everything here reads it back through
// useSyncExternalStore, so React never disagrees with what's on screen.
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { arrowSelect, rovingIndex } from "@/components/ui/roving";

const STORAGE_KEY = "headzup_theme";
const MODES = ["light", "dark"];
// Matches --bg in globals.css, for the browser's toolbar color.
const BAR_COLOR = { light: "#F1F2EE", dark: "#121518" };

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
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", BAR_COLOR[mode]));
  if (remember) {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  }
}

const ThemeContext = createContext({ mode: "light", isDark: false, setMode: () => {} });

export function ThemeProvider({ children }) {
  const mode = useSyncExternalStore(subscribe, readMode, () => "light");
  const setMode = useCallback((next) => applyMode(next, { remember: true }), []);
  const value = useMemo(() => ({ mode, isDark: mode === "dark", setMode }), [mode, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/** Day / Night switch: two labelled options rather than a mystery toggle. */
export function ThemeToggle({ className = "" }) {
  const { mode, setMode } = useTheme();
  return (
    <div
      className={`hu-theme-switch ${className}`}
      role="radiogroup"
      aria-label="Colors"
      onKeyDown={(e) => arrowSelect(e, MODES, mode, setMode)}
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === "light"}
        tabIndex={rovingIndex("light", mode, MODES)}
        className={mode === "light" ? "is-on" : ""}
        onClick={() => setMode("light")}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <path
            d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="square"
          />
        </svg>
        Day
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === "dark"}
        tabIndex={rovingIndex("dark", mode, MODES)}
        className={mode === "dark" ? "is-on" : ""}
        onClick={() => setMode("dark")}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M15.5 3.2A8.8 8.8 0 1 0 20.8 15 7 7 0 0 1 15.5 3.2Z" fill="currentColor" />
        </svg>
        Night
      </button>
    </div>
  );
}
