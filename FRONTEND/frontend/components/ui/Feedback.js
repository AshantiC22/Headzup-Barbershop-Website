"use client";
// Small shared pieces of feedback UI: toasts, modals, notices, skeletons.
import { useCallback, useEffect, useRef, useState } from "react";

// ── Toasts ──────────────────────────────────────────────────────────────────
/** const [toasts, toast] = useToasts();  toast("Saved");  toast("Failed", "bad") */
export function useToasts() {
  const [items, setItems] = useState([]);
  const show = useCallback((msg, tone = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setItems((p) => [...p.slice(-2), { id, msg, tone }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), tone === "bad" ? 5200 : 3600);
  }, []);
  const host = (
    <div className="toast-host" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.tone === "bad" ? "toast-bad" : ""}`}>
          {t.tone === "bad" ? <IconAlert /> : <IconCheck />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
  return [host, show];
}

// ── Modal ───────────────────────────────────────────────────────────────────
/** Accessible dialog: Esc closes, focus moves in and returns, backdrop click closes. */
export function Modal({ open, onClose, title, children, wide = false, labelledBy }) {
  const ref = useRef(null);
  const lastFocus = useRef(null);
  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement;
    const el = ref.current;
    const first = el?.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    (first || el)?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Tab" && el) {
        const f = [...el.querySelectorAll("button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")];
        if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      lastFocus.current?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  const titleId = labelledBy || "modal-title";
  return (
    <div className="modal-root" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div ref={ref} className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true"
        aria-labelledby={title ? titleId : undefined} tabIndex={-1}>
        {title && (
          <div className="spread" style={{ marginBottom: 16, alignItems: "flex-start" }}>
            <h2 id={titleId} className="h3">{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close" style={{ marginTop: -8, marginRight: -8 }}>
              <IconClose />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ── Notice ──────────────────────────────────────────────────────────────────
export function Notice({ tone = "info", children, style }) {
  const Icon = tone === "ok" ? IconCheck : tone === "bad" || tone === "warn" ? IconAlert : IconInfo;
  return (
    <div className={`notice notice-${tone}`} role={tone === "bad" ? "alert" : undefined} style={style}>
      <span className="notice-icon" aria-hidden="true"><Icon /></span>
      <div>{children}</div>
    </div>
  );
}

export function Skeleton({ h = 18, w = "100%", style }) {
  return <div className="wet" style={{ height: h, width: w, ...style }} aria-hidden="true" />;
}

export function Spinner({ label }) {
  return (
    <span className="row" style={{ gap: 10 }} role="status">
      <span className="spinner" aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  );
}

// ── Icons (hand-drawn, stroke-based) ────────────────────────────────────────
const I = ({ children, size = 18, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{children}</svg>
);
export const IconCheck = (p) => <I {...p}><path d="M4.5 12.5l4.8 4.8L19.5 7" /></I>;
export const IconClose = (p) => <I {...p}><path d="M6 6l12 12M18 6L6 18" /></I>;
export const IconAlert = (p) => <I {...p}><path d="M12 8v5M12 16.5v.5" /><path d="M10.3 3.9L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></I>;
export const IconInfo = (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></I>;
export const IconArrowLeft = (p) => <I {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></I>;
export const IconArrowRight = (p) => <I {...p}><path d="M5 12h14M13 6l6 6-6 6" /></I>;
export const IconChevronLeft = (p) => <I {...p}><path d="M15 6l-6 6 6 6" /></I>;
export const IconChevronRight = (p) => <I {...p}><path d="M9 6l6 6-6 6" /></I>;
export const IconChevronDown = (p) => <I {...p}><path d="M6 9l6 6 6-6" /></I>;
export const IconMenu = (p) => <I {...p}><path d="M4 7h16M4 12h16M4 17h10" /></I>;
export const IconPin = (p) => <I {...p}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></I>;
export const IconPhone = (p) => <I {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></I>;
export const IconClock = (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></I>;
export const IconCalendar = (p) => <I {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></I>;
export const IconScissors = (p) => <I {...p}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" /></I>;
export const IconUser = (p) => <I {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></I>;
export const IconUsers = (p) => <I {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></I>;
export const IconStar = ({ filled, ...p }) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"
      fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
export const IconBell = (p) => <I {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></I>;
export const IconRefresh = (p) => <I {...p}><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" /></I>;
export const IconLogout = (p) => <I {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" /></I>;
export const IconHome = (p) => <I {...p}><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" /></I>;
export const IconEye = ({ off, ...p }) => (
  <I {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </I>
);
export const IconMegaphone = (p) => <I {...p}><path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1zM17 8.5a5 5 0 0 1 0 7" /></I>;
export const IconChart = (p) => <I {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></I>;
export const IconCard = (p) => <I {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6.5 15h4" /></I>;
export const IconWallet = (p) => <I {...p}><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18v4" /><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M16 13.5h2" /></I>;
export const IconWalk = (p) => <I {...p}><circle cx="13" cy="4.5" r="2" /><path d="M10 21l2-6 3 3v3M8 12l2.5-4.5 4 1.5 2 3M12 15l-1-3" /></I>;
export const IconSwap = (p) => <I {...p}><path d="M7 4L3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8" /></I>;
export const IconPlus = (p) => <I {...p}><path d="M12 5v14M5 12h14" /></I>;
export const IconTrash = (p) => <I {...p}><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" /></I>;
export const IconCamera = (p) => <I {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></I>;
export const IconExternal = (p) => <I {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></I>;
export const IconSettings = (p) => <I {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4L5.3 5.3" /></I>;
