"use client";
import { createContext, useContext, useState, useEffect } from "react";

// ── Theme definitions ──────────────────────────────────────────────────────────
export const THEMES = {
  dark: {
    name: "dark",
    bg:           "#070709",
    bgDeep:       "#050507",
    surface:      "rgba(255,255,255,0.04)",
    surfaceB:     "rgba(255,255,255,0.07)",
    surfaceC:     "rgba(255,255,255,0.11)",
    border:       "rgba(255,255,255,0.08)",
    borderB:      "rgba(255,255,255,0.15)",
    text:         "#f1f0ee",
    sub:          "#9ca3af",
    muted:        "#4b5563",
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
    // Header
    headerBg:     "rgba(7,7,9,0.88)",
    // Card
    cardBg:       "rgba(255,255,255,0.04)",
    cardBorder:   "rgba(255,255,255,0.08)",
    cardShadow:   "0 4px 24px rgba(0,0,0,0.35)",
    // Input
    inputBg:      "rgba(255,255,255,0.04)",
    // Sidebar
    sidebarBg:    "rgba(7,7,9,0.95)",
  },
  light: {
    name: "light",
    bg:           "#f8f7f5",
    bgDeep:       "#f0efe9",
    surface:      "rgba(0,0,0,0.04)",
    surfaceB:     "rgba(0,0,0,0.07)",
    surfaceC:     "rgba(0,0,0,0.10)",
    border:       "rgba(0,0,0,0.09)",
    borderB:      "rgba(0,0,0,0.16)",
    text:         "#1a1a1a",
    sub:          "#52525b",
    muted:        "#a1a1aa",
    amber:        "#d97706",
    amberL:       "#f59e0b",
    amberD:       "#b45309",
    amberDim:     "rgba(217,119,6,0.10)",
    amberGlow:    "rgba(217,119,6,0.18)",
    amberBorder:  "rgba(217,119,6,0.35)",
    red:          "#dc2626",
    redDim:       "rgba(220,38,38,0.08)",
    green:        "#16a34a",
    greenDim:     "rgba(22,163,74,0.08)",
    blue:         "#2563eb",
    blueDim:      "rgba(37,99,235,0.08)",
    purple:       "#7c3aed",
    // Header
    headerBg:     "rgba(248,247,245,0.92)",
    // Card
    cardBg:       "rgba(255,255,255,0.85)",
    cardBorder:   "rgba(0,0,0,0.08)",
    cardShadow:   "0 2px 16px rgba(0,0,0,0.08)",
    // Input
    inputBg:      "rgba(255,255,255,0.9)",
    // Sidebar
    sidebarBg:    "rgba(248,247,245,0.98)",
  },
};

// ── Context ────────────────────────────────────────────────────────────────────
const ThemeContext = createContext({
  theme: THEMES.dark,
  isDark: true,
  toggle: () => {},
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  // Load from localStorage on mount
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

  const theme = isDark ? THEMES.dark : THEMES.light;

  // Apply to body
  useEffect(() => {
    document.body.style.background = theme.bg;
    document.body.style.color = theme.text;
    document.documentElement.setAttribute("data-theme", theme.name);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useTheme() {
  return useContext(ThemeContext);
}

// ── Toggle button component ────────────────────────────────────────────────────
export function ThemeToggle({ style = {} }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: isDark ? "rgba(245,158,11,0.2)" : "rgba(217,119,6,0.15)",
        border: `1px solid ${isDark ? "rgba(245,158,11,0.4)" : "rgba(217,119,6,0.4)"}`,
        cursor: "pointer",
        position: "relative",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        flexShrink: 0,
        padding: 0,
        ...style,
      }}
    >
      {/* Track icons */}
      <span style={{
        position: "absolute",
        left: 4,
        top: "50%",
        transform: "translateY(-50%)",
        fontSize: 10,
        opacity: isDark ? 0.8 : 0,
        transition: "opacity 0.2s",
      }}>🌙</span>
      <span style={{
        position: "absolute",
        right: 4,
        top: "50%",
        transform: "translateY(-50%)",
        fontSize: 10,
        opacity: isDark ? 0 : 0.8,
        transition: "opacity 0.2s",
      }}>☀️</span>
      {/* Thumb */}
      <div style={{
        position: "absolute",
        top: 2,
        left: isDark ? 2 : 20,
        width: 16,
        height: 16,
        borderRadius: "50%",
        background: isDark
          ? "linear-gradient(135deg,#f59e0b,#d97706)"
          : "linear-gradient(135deg,#f59e0b,#fbbf24)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}/>
    </button>
  );
}
