/**
 * HEADZ UP Design System
 * 
 * Single source of truth for all visual tokens.
 * Every page imports from here — no hardcoded colors, no magic numbers.
 * 
 * Philosophy: Premium barbershop · Dark luxury with amber fire · Glass surfaces
 * Type: Syncopate (display) + DM Mono (everything else)
 * Palette: Near-black bg, amber brand, red accent, glass surfaces
 */

// ── Color tokens ───────────────────────────────────────────────────────────────
export const DARK = {
  // Backgrounds
  bg:           "#070709",
  bgDeep:       "#050507",
  bgRaised:     "#0d0d10",
  // Surfaces (glass)
  surface:      "rgba(255,255,255,0.04)",
  surfaceHover: "rgba(255,255,255,0.07)",
  surfaceActive:"rgba(255,255,255,0.11)",
  // Borders
  border:       "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.15)",
  // Brand — Amber
  amber:        "#f59e0b",
  amberLight:   "#fbbf24",
  amberDark:    "#d97706",
  amberSubtle:  "rgba(245,158,11,0.08)",
  amberMuted:   "rgba(245,158,11,0.12)",
  amberGlow:    "rgba(245,158,11,0.20)",
  amberBorder:  "rgba(245,158,11,0.35)",
  // Brand — Red accent
  red:          "#ef4444",
  redSubtle:    "rgba(239,68,68,0.08)",
  redMuted:     "rgba(239,68,68,0.12)",
  // Status
  green:        "#22c55e",
  greenSubtle:  "rgba(34,197,94,0.08)",
  blue:         "#60a5fa",
  blueSubtle:   "rgba(96,165,250,0.08)",
  purple:       "#a78bfa",
  // Text
  textPrimary:  "#f1f0ee",
  textSecondary:"#9ca3af",
  textTertiary: "#4b5563",
  textDisabled: "#374151",
  // Structural
  headerBg:     "rgba(7,7,9,0.88)",
  sidebarBg:    "rgba(7,7,9,0.97)",
};

export const LIGHT = {
  bg:           "#ffffff",
  bgDeep:       "#f4f4f5",
  bgRaised:     "#fafafa",
  surface:      "rgba(0,0,0,0.03)",
  surfaceHover: "rgba(0,0,0,0.055)",
  surfaceActive:"rgba(0,0,0,0.08)",
  border:       "rgba(0,0,0,0.10)",
  borderStrong: "rgba(0,0,0,0.20)",
  amber:        "#b45309",
  amberLight:   "#d97706",
  amberDark:    "#92400e",
  amberSubtle:  "rgba(180,83,9,0.06)",
  amberMuted:   "rgba(180,83,9,0.10)",
  amberGlow:    "rgba(180,83,9,0.18)",
  amberBorder:  "rgba(180,83,9,0.38)",
  red:          "#dc2626",
  redSubtle:    "rgba(220,38,38,0.06)",
  redMuted:     "rgba(220,38,38,0.10)",
  green:        "#16a34a",
  greenSubtle:  "rgba(22,163,74,0.08)",
  blue:         "#2563eb",
  blueSubtle:   "rgba(37,99,235,0.08)",
  purple:       "#7c3aed",
  textPrimary:  "#111111",
  textSecondary:"#3f3f46",
  textTertiary: "#71717a",
  textDisabled: "#a1a1aa",
  headerBg:     "rgba(255,255,255,0.92)",
  sidebarBg:    "rgba(244,244,245,0.99)",
};

// ── Typography ─────────────────────────────────────────────────────────────────
export const FONT = {
  display: "'Syncopate', sans-serif",
  mono:    "'DM Mono', monospace",
};

// ── Spacing scale (8pt grid) ───────────────────────────────────────────────────
export const SPACE = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
  xxxl:64,
};

// ── Border radius ──────────────────────────────────────────────────────────────
export const RADIUS = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 9999,
};

// ── Type scale ─────────────────────────────────────────────────────────────────
export const TEXT = {
  // Display
  d1: { fontSize: "clamp(2rem,6vw,4rem)",  lineHeight: 0.95, letterSpacing: "-0.04em" },
  d2: { fontSize: "clamp(1.4rem,4vw,2.5rem)", lineHeight: 1, letterSpacing: "-0.03em" },
  // Heading
  h1: { fontSize: 20, lineHeight: 1.2, letterSpacing: "-0.02em" },
  h2: { fontSize: 16, lineHeight: 1.3, letterSpacing: "-0.01em" },
  h3: { fontSize: 14, lineHeight: 1.4 },
  // Body / mono
  body: { fontSize: 13, lineHeight: 1.7 },
  sm:   { fontSize: 11, lineHeight: 1.6 },
  xs:   { fontSize:  9, lineHeight: 1.5, letterSpacing: "0.05em" },
  // Labels / caps
  label:  { fontSize: 9,  letterSpacing: "0.25em", textTransform: "uppercase" },
  caption:{ fontSize: 10, letterSpacing: "0.1em"  },
};

// ── Shadows ────────────────────────────────────────────────────────────────────
export const SHADOW = {
  sm:    "0 1px 4px rgba(0,0,0,0.25)",
  md:    "0 4px 16px rgba(0,0,0,0.35)",
  lg:    "0 8px 32px rgba(0,0,0,0.45)",
  xl:    "0 16px 56px rgba(0,0,0,0.55)",
  amber: "0 4px 20px rgba(245,158,11,0.30)",
  amberLg:"0 8px 32px rgba(245,158,11,0.40)",
  glass: "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
};

// ── Transitions ────────────────────────────────────────────────────────────────
export const TRANS = {
  fast:   "all 0.15s cubic-bezier(0.4,0,0.2,1)",
  base:   "all 0.22s cubic-bezier(0.4,0,0.2,1)",
  slow:   "all 0.35s cubic-bezier(0.4,0,0.2,1)",
  spring: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
};

// ── Z-index scale ──────────────────────────────────────────────────────────────
export const Z = {
  base:    0,
  raised:  10,
  sticky:  100,
  overlay: 200,
  modal:   300,
  toast:   400,
  top:     500,
};

// ── Component style factories ─────────────────────────────────────────────────
// Call with a theme object (DARK or LIGHT) to get themed styles

/** Glass surface card */
export const card = (theme, overrides = {}) => ({
  background:           theme.surface,
  backdropFilter:       "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius:         RADIUS.lg,
  border:               `1px solid ${theme.border}`,
  boxShadow:            SHADOW.glass,
  ...overrides,
});

/** Amber gradient primary button */
export const btnPrimary = (overrides = {}) => ({
  background:    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  border:        "none",
  borderRadius:  RADIUS.md,
  color:         "#000000",
  fontFamily:    FONT.display,
  fontSize:      8,
  fontWeight:    700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  cursor:        "pointer",
  boxShadow:     SHADOW.amber,
  transition:    TRANS.base,
  ...overrides,
});

/** Ghost/secondary button */
export const btnGhost = (theme, overrides = {}) => ({
  background:           theme.surface,
  backdropFilter:       "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border:               `1px solid ${theme.border}`,
  borderRadius:         RADIUS.md,
  color:                theme.textSecondary,
  fontFamily:           FONT.mono,
  fontSize:             10,
  letterSpacing:        "0.08em",
  cursor:               "pointer",
  transition:           TRANS.base,
  ...overrides,
});

/** Danger button */
export const btnDanger = (theme, overrides = {}) => ({
  background:    theme.redSubtle,
  border:        `1px solid rgba(239,68,68,0.25)`,
  borderRadius:  RADIUS.md,
  color:         theme.red,
  fontFamily:    FONT.mono,
  fontSize:      10,
  letterSpacing: "0.08em",
  cursor:        "pointer",
  transition:    TRANS.base,
  ...overrides,
});

/** Success button */
export const btnSuccess = (theme, overrides = {}) => ({
  background:    theme.greenSubtle,
  border:        `1px solid rgba(34,197,94,0.25)`,
  borderRadius:  RADIUS.md,
  color:         theme.green,
  fontFamily:    FONT.mono,
  fontSize:      10,
  letterSpacing: "0.08em",
  cursor:        "pointer",
  transition:    TRANS.base,
  ...overrides,
});

/** Input field */
export const input = (theme, overrides = {}) => ({
  width:                "100%",
  padding:              "11px 14px",
  background:           theme === DARK ? "rgba(255,255,255,0.04)" : "#ffffff",
  backdropFilter:       "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border:               `1px solid ${theme.border}`,
  borderRadius:         RADIUS.md,
  color:                theme.textPrimary,
  fontFamily:           FONT.mono,
  fontSize:             13,
  outline:              "none",
  transition:           TRANS.fast,
  ...overrides,
});

/** Status badge pill */
export const badge = (color, bgColor, overrides = {}) => ({
  display:       "inline-flex",
  alignItems:    "center",
  gap:           5,
  padding:       "3px 10px",
  borderRadius:  RADIUS.full,
  background:    bgColor,
  border:        `1px solid ${color}30`,
  fontFamily:    FONT.mono,
  fontSize:      10,
  color:         color,
  letterSpacing: "0.04em",
  whiteSpace:    "nowrap",
  ...overrides,
});

// ── Status config ──────────────────────────────────────────────────────────────
export const STATUS = {
  confirmed:    { label: "Confirmed",  color: "#22c55e", bg: "rgba(34,197,94,0.08)"  },
  pending_shop: { label: "Pending",    color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  completed:    { label: "Completed",  color: "#60a5fa", bg: "rgba(96,165,250,0.08)" },
  cancelled:    { label: "Cancelled",  color: "#6b7280", bg: "rgba(107,114,128,0.12)"},
  no_show:      { label: "No Show",    color: "#ef4444", bg: "rgba(239,68,68,0.08)"  },
};

// ── Utility: format time ───────────────────────────────────────────────────────
export function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

// ── Utility: format date ───────────────────────────────────────────────────────
export function fmtDate(d, opts = {}) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", ...opts,
  });
}

export function fmtDateLong(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function daysUntil(dateStr, timeStr) {
  const appt = new Date(`${dateStr}T${timeStr}`);
  const diff = appt - new Date();
  if (diff < 0) return null;
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 1)  return "< 1 hour";
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

// ── Global CSS string (inject via <style jsx global>) ─────────────────────────
export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }

  ::selection { background: rgba(245,158,11,0.25); color: inherit; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.2); border-radius: 4px; }

  *, button, a { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }

  input, textarea, select, button { font-family: inherit; }
  input::placeholder, textarea::placeholder { color: inherit; opacity: 0.4; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }

  @keyframes fadeUp    { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
  @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
  @keyframes shimmer   { 0% { background-position:-200% center } 100% { background-position:200% center } }
  @keyframes spin      { to  { transform:rotate(360deg) } }
  @keyframes pulse     { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
  @keyframes slideUp   { from { opacity:0; transform:translateY(20px) scale(0.97) } to { opacity:1; transform:none } }

  .fade-up    { animation: fadeUp  0.28s cubic-bezier(0.4,0,0.2,1) both; }
  .fade-in    { animation: fadeIn  0.2s  ease both; }
  .slide-up   { animation: slideUp 0.32s cubic-bezier(0.4,0,0.2,1) both; }

  .card {
    background: rgba(255,255,255,0.04);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06);
    transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
  }
  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.13);
  }
  .card-flat { background: rgba(255,255,255,0.04); border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); }

  .btn-primary {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    border: none; border-radius: 10px; color: #000;
    font-family: 'Syncopate', sans-serif; font-size: 8px; font-weight: 700;
    letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer;
    box-shadow: 0 4px 20px rgba(245,158,11,0.30);
    transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
  }
  .btn-primary:hover  { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(245,158,11,0.45); }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

  [data-theme="light"] .card {
    background: rgba(255,255,255,0.82);
    border-color: rgba(0,0,0,0.09);
    box-shadow: 0 2px 16px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9);
  }
  [data-theme="light"] .card:hover {
    box-shadow: 0 6px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9);
  }
  [data-theme="light"] input, [data-theme="light"] textarea, [data-theme="light"] select {
    background: #ffffff !important; color: #111111 !important; border-color: rgba(0,0,0,0.14) !important;
  }
  [data-theme="light"] input::placeholder, [data-theme="light"] textarea::placeholder {
    color: #71717a !important; opacity: 1 !important;
  }
  [data-theme="light"] input:focus, [data-theme="light"] textarea:focus {
    border-color: rgba(180,83,9,0.5) !important;
    box-shadow: 0 0 0 3px rgba(180,83,9,0.08) !important;
  }
`;
