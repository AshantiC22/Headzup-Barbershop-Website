"use client";
import { createContext, useContext, useState, useEffect } from "react";

// ── Token builder ──────────────────────────────────────────────────────────────
const alpha = (hex, a) => {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const bl= parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${bl},${a})`;
};

// ── DARK THEME ─────────────────────────────────────────────────────────────────
const DARK = {
  name:"dark",
  // Backgrounds
  bg:           "#070709",
  bgDeep:       "#050507",
  // Glass surfaces
  surface:      "rgba(255,255,255,0.04)",
  surfaceB:     "rgba(255,255,255,0.07)",
  surfaceC:     "rgba(255,255,255,0.11)",
  glass:        "rgba(255,255,255,0.04)",
  glassB:       "rgba(255,255,255,0.07)",
  // Borders
  border:       "rgba(255,255,255,0.08)",
  borderB:      "rgba(255,255,255,0.15)",
  // Brand amber
  amber:        "#f59e0b",
  amberL:       "#fbbf24",
  amberD:       "#d97706",
  amberDim:     "rgba(245,158,11,0.10)",
  amberGlow:    "rgba(245,158,11,0.18)",
  amberBorder:  "rgba(245,158,11,0.35)",
  // Status colors
  red:          "#ef4444",
  redDim:       "rgba(239,68,68,0.10)",
  green:        "#22c55e",
  greenDim:     "rgba(34,197,94,0.10)",
  blue:         "#60a5fa",
  blueDim:      "rgba(96,165,250,0.10)",
  purple:       "#a78bfa",
  // Text
  text:         "#f1f0ee",
  sub:          "#9ca3af",
  muted:        "#4b5563",
  // Structural
  headerBg:     "rgba(7,7,9,0.88)",
  sidebarBg:    "rgba(7,7,9,0.97)",
};

// ── LIGHT THEME ────────────────────────────────────────────────────────────────
// Vibe: Premium barbershop receipt — warm cream paper, ink dark text,
//       amber stays fire, glass surfaces are frosted white
const LIGHT = {
  name:"light",
  // Warm cream backgrounds — like a high-end magazine
  bg:           "#f5f3ee",
  bgDeep:       "#ede9e1",
  // Frosted white glass surfaces
  surface:      "rgba(255,255,255,0.72)",
  surfaceB:     "rgba(255,255,255,0.85)",
  surfaceC:     "rgba(255,255,255,0.95)",
  glass:        "rgba(255,255,255,0.72)",
  glassB:       "rgba(255,255,255,0.85)",
  // Ink borders — subtle but visible
  border:       "rgba(0,0,0,0.10)",
  borderB:      "rgba(0,0,0,0.18)",
  // Brand amber — slightly deeper for contrast on light
  amber:        "#c2710c",
  amberL:       "#d97706",
  amberD:       "#92500a",
  amberDim:     "rgba(194,113,12,0.10)",
  amberGlow:    "rgba(194,113,12,0.18)",
  amberBorder:  "rgba(194,113,12,0.40)",
  // Status — keep vivid but deeper
  red:          "#c4202a",
  redDim:       "rgba(196,32,42,0.10)",
  green:        "#1a7a3c",
  greenDim:     "rgba(26,122,60,0.10)",
  blue:         "#1d4ed8",
  blueDim:      "rgba(29,78,216,0.10)",
  purple:       "#6d28d9",
  // Text — near-black ink on cream
  text:         "#1c1917",
  sub:          "#44403c",
  muted:        "#a8a29e",
  // Structural
  headerBg:     "rgba(245,243,238,0.92)",
  sidebarBg:    "rgba(237,233,225,0.98)",
};

export const THEMES = { dark: DARK, light: LIGHT };

// ── Context ────────────────────────────────────────────────────────────────────
const ThemeContext = createContext({ theme: DARK, isDark: true, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("headzup_theme");
      if (saved === "light") setIsDark(false);
    } catch(e) {}
  }, []);

  const toggle = () => {
    setIsDark(prev => {
      const next = !prev;
      try { localStorage.setItem("headzup_theme", next ? "dark" : "light"); } catch(e) {}
      return next;
    });
  };

  const theme = isDark ? DARK : LIGHT;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme.name);
    document.body.style.background = theme.bg;
    document.body.style.color      = theme.text;
    // CSS custom properties for anything using var()
    root.style.setProperty("--bg",       theme.bg);
    root.style.setProperty("--surface",  theme.surface);
    root.style.setProperty("--border",   theme.border);
    root.style.setProperty("--text",     theme.text);
    root.style.setProperty("--sub",      theme.sub);
    root.style.setProperty("--amber",    theme.amber);
    root.style.setProperty("--amber-dim",theme.amberDim);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }

// ── Toggle button ──────────────────────────────────────────────────────────────
export function ThemeToggle({ style = {} }) {
  const { isDark, toggle, theme } = useTheme();

  return (
    <button onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: 44, height: 24, borderRadius: 12, padding: 0,
        background: isDark
          ? "linear-gradient(135deg,rgba(245,158,11,0.25),rgba(245,158,11,0.15))"
          : "linear-gradient(135deg,rgba(194,113,12,0.15),rgba(194,113,12,0.08))",
        border: `1px solid ${isDark ? "rgba(245,158,11,0.4)" : "rgba(194,113,12,0.35)"}`,
        cursor: "pointer", position: "relative", flexShrink: 0,
        boxShadow: isDark ? "0 0 12px rgba(245,158,11,0.15)" : "0 1px 4px rgba(0,0,0,0.12)",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        ...style,
      }}>
      {/* Moon icon */}
      <span style={{
        position:"absolute", left:5, top:"50%", transform:"translateY(-50%)",
        fontSize:11, opacity:isDark?1:0, transition:"opacity 0.25s", pointerEvents:"none",
      }}>🌙</span>
      {/* Sun icon */}
      <span style={{
        position:"absolute", right:5, top:"50%", transform:"translateY(-50%)",
        fontSize:11, opacity:isDark?0:1, transition:"opacity 0.25s", pointerEvents:"none",
      }}>☀️</span>
      {/* Sliding thumb */}
      <div style={{
        position:"absolute", top:3, width:16, height:16, borderRadius:"50%",
        left: isDark ? 3 : 23,
        background: isDark
          ? "linear-gradient(135deg,#f59e0b,#d97706)"
          : "linear-gradient(135deg,#f59e0b,#fbbf24)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
        transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}/>
    </button>
  );
}
