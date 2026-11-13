"use client";
// Two lights on one street: Lamplight (the default, night) and Daylight (the
// same street under an overcast morning). The colors live in globals.css;
// this file only decides which one is on.
//
// <html data-theme> is the source of truth. The inline script in layout.tsx
// sets it before first paint, and everything here reads it back through
// useSyncExternalStore, so React never disagrees with what's on screen.
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { arrowSelect, rovingIndex } from "@/components/ui/roving";

const STORAGE_KEY = "headzup_theme";
const MODES = ["dark", "light"];

// Hex values for code that can't read CSS variables (canvas, meta theme-color).
export const TOKENS = {
  dark: {
    name: "dark",
    bg: "#1A1D1C",
    surface: "#242826",
    ink: "#E6DFCF",
    ink2: "#B4AD9D",
    ink3: "#9C9689",
    accent: "#8E1B1B",
    onAccent: "#F3ECDD",
    steel: "#9DB4C0",
    brass: "#C9A25A",
    ok: "#8DBF97",
    bad: "#E4806E",
  },
  light: {
    name: "light",
    bg: "#D9D6CE",
    surface: "#E9E6DF",
    ink: "#1D201F",
    ink2: "#45463F",
    ink3: "#4F4E47",
    accent: "#8E1B1B",
    onAccent: "#F6F1E6",
    steel: "#2F4B5A",
    brass: "#8A6A2E",
    ok: "#2E6B44",
    bad: "#9E2620",
  },
};

function subscribe(onChange) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const readMode = () => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

function applyMode(mode, { remember }) {
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", TOKENS[mode].bg));
  if (remember) {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  }
}

const ThemeContext = createContext({
  mode: "dark",
  isDark: true,
  theme: TOKENS.dark,
  palette: "night",
  setMode: () => {},
});

export function ThemeProvider({ children }) {
  const mode = useSyncExternalStore(subscribe, readMode, () => "dark");

  const setMode = useCallback((next) => applyMode(next, { remember: true }), []);

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === "dark",
      theme: TOKENS[mode],
      palette: mode === "dark" ? "night" : "day",
      setMode,
    }),
    [mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/** Lamplight / Daylight switch: two labelled options rather than a mystery toggle. */
export function ThemeToggle({ className = "" }) {
  const { mode, setMode } = useTheme();
  return (
    <div
      className={`hu-theme-switch ${className}`}
      role="radiogroup"
      aria-label="Lighting"
      onKeyDown={(e) => arrowSelect(e, MODES, mode, setMode)}
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === "dark"}
        tabIndex={rovingIndex("dark", mode, MODES)}
        className={mode === "dark" ? "is-on" : ""}
        onClick={() => setMode("dark")}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M12 2.5c2.6 3.1 4.8 5.6 4.8 9.1A4.8 4.8 0 0 1 12 16.4a4.8 4.8 0 0 1-4.8-4.8c0-2 .9-3.6 2.2-5.1.2 1.6 1 2.7 2.1 3.2C11 7.6 11.2 5 12 2.5Z"
            fill="currentColor"
          />
          <path d="M8 19h8M9.5 21.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        Lamplight
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === "light"}
        tabIndex={rovingIndex("light", mode, MODES)}
        className={mode === "light" ? "is-on" : ""}
        onClick={() => setMode("light")}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="10" cy="9" r="4" fill="currentColor" />
          <path
            d="M6.5 19.5h11a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6.9A3.1 3.1 0 0 0 6.5 19.5Z"
            fill="currentColor"
            opacity=".55"
          />
        </svg>
        Daylight
      </button>
    </div>
  );
}
