"use client";
import { createContext, useContext, useState, useEffect } from "react";

// ── DARK THEME — Deep black, amber fire, glass surfaces ────────────────────────
const DARK = {
  name:         "dark",
  bg:           "#070709",
  bgDeep:       "#050507",
  surface:      "rgba(255,255,255,0.04)",
  surfaceB:     "rgba(255,255,255,0.07)",
  surfaceC:     "rgba(255,255,255,0.11)",
  glass:        "rgba(255,255,255,0.04)",
  glassB:       "rgba(255,255,255,0.07)",
  border:       "rgba(255,255,255,0.08)",
  borderB:      "rgba(255,255,255,0.15)",
  amber:        "#f59e0b",
  amberL:       "#fbbf24",
  amberD:       "#d97706",
  amberDim:     "rgba(245,158,11,0.10)",
  amberGlow:    "rgba(245,158,11,0.18)",
  amberBorder:  "rgba(245,158,11,0.35)",
  red:          "#ef4444",
  redDim:       "rgba(239,68,68,0.10)",
  green:        "#22c55e",
  greenDim:     "rgba(34,197,94,0.10)",
  blue:         "#60a5fa",
  blueDim:      "rgba(96,165,250,0.10)",
  purple:       "#a78bfa",
  text:         "#f1f0ee",
  sub:          "#9ca3af",
  muted:        "#4b5563",
  inputBg:      "rgba(255,255,255,0.05)",
  inputText:    "#f1f0ee",
  placeholder:  "#6b7280",
  headerBg:     "rgba(7,7,9,0.88)",
  sidebarBg:    "rgba(7,7,9,0.97)",
};

// ── LIGHT THEME — True opposite: white/light bg, dark text, everything visible ─
// Philosophy: flip every dark token to its bright equivalent.
// Dark bg → white bg. Dark glass → crisp white card.
// Light text → dark text. Amber stays amber (deepened for contrast).
const LIGHT = {
  name:         "light",
  // Pure white page background
  bg:           "#ffffff",
  bgDeep:       "#f4f4f5",
  // Card surfaces — solid white with slight depth
  surface:      "rgba(0,0,0,0.03)",
  surfaceB:     "rgba(0,0,0,0.055)",
  surfaceC:     "rgba(0,0,0,0.08)",
  glass:        "rgba(0,0,0,0.03)",
  glassB:       "rgba(0,0,0,0.055)",
  // Visible dark borders
  border:       "rgba(0,0,0,0.11)",
  borderB:      "rgba(0,0,0,0.20)",
  // Amber — deeper for contrast on white
  amber:        "#b45309",
  amberL:       "#d97706",
  amberD:       "#92400e",
  amberDim:     "rgba(180,83,9,0.09)",
  amberGlow:    "rgba(180,83,9,0.16)",
  amberBorder:  "rgba(180,83,9,0.38)",
  // Status — deep saturated for white bg readability
  red:          "#dc2626",
  redDim:       "rgba(220,38,38,0.08)",
  green:        "#16a34a",
  greenDim:     "rgba(22,163,74,0.08)",
  blue:         "#2563eb",
  blueDim:      "rgba(37,99,235,0.08)",
  purple:       "#7c3aed",
  // TEXT — near-black, high contrast on white
  text:         "#111111",
  sub:          "#3f3f46",
  muted:        "#71717a",
  // INPUTS — solid white with dark text/placeholder
  inputBg:      "#ffffff",
  inputText:    "#111111",
  placeholder:  "#71717a",
  // Structural
  headerBg:     "rgba(255,255,255,0.92)",
  sidebarBg:    "rgba(244,244,245,0.99)",
};

export const THEMES = { dark: DARK, light: LIGHT };
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
    root.style.setProperty("--bg",           theme.bg);
    root.style.setProperty("--surface",      theme.surface);
    root.style.setProperty("--border",       theme.border);
    root.style.setProperty("--text",         theme.text);
    root.style.setProperty("--sub",          theme.sub);
    root.style.setProperty("--muted",        theme.muted);
    root.style.setProperty("--amber",        theme.amber);
    root.style.setProperty("--amber-dim",    theme.amberDim);
    root.style.setProperty("--amber-border", theme.amberBorder);
    root.style.setProperty("--input-bg",     theme.inputBg);
    root.style.setProperty("--input-text",   theme.inputText);
    root.style.setProperty("--placeholder",  theme.placeholder);
    root.style.setProperty("--header-bg",    theme.headerBg);
    root.style.setProperty("--sidebar-bg",   theme.sidebarBg);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }

export function ThemeToggle({ style = {} }) {
  const { isDark, toggle } = useTheme();
  return (
    <button onClick={toggle}
      title={isDark ? "Switch to light" : "Switch to dark"}
      style={{
        width: 46, height: 26, borderRadius: 13, padding: 0, cursor: "pointer",
        position: "relative", flexShrink: 0,
        background: isDark
          ? "rgba(245,158,11,0.15)"
          : "rgba(180,83,9,0.10)",
        border: `1px solid ${isDark ? "rgba(245,158,11,0.4)" : "rgba(180,83,9,0.4)"}`,
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        ...style,
      }}>
      <span style={{ position:"absolute", left:5, top:"50%",
        transform:"translateY(-50%)", fontSize:11,
        opacity: isDark ? 1 : 0, transition:"opacity 0.2s",
        pointerEvents:"none" }}>🌙</span>
      <span style={{ position:"absolute", right:5, top:"50%",
        transform:"translateY(-50%)", fontSize:11,
        opacity: isDark ? 0 : 1, transition:"opacity 0.2s",
        pointerEvents:"none" }}>☀️</span>
      <div style={{
        position:"absolute", top:3, width:18, height:18, borderRadius:"50%",
        left: isDark ? 3 : 23,
        background: isDark
          ? "linear-gradient(135deg,#f59e0b,#d97706)"
          : "linear-gradient(135deg,#d97706,#b45309)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
        transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}/>
    </button>
  );
}
