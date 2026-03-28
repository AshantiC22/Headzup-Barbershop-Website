"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import API from "@/lib/api";
import useBreakpoint from "@/lib/useBreakpoint";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: "#040404",
  surface: "rgba(255,255,255,0.025)",
  border: "rgba(255,255,255,0.07)",
  amber: "#F59E0B",
  amberDim: "rgba(245,158,11,0.12)",
  amberBorder: "rgba(245,158,11,0.3)",
  muted: "#52525b",
  dim: "#27272a",
  deepDim: "#1c1c1e",
};
const sf = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split("T")[0];
}
function addDays(d, n) {
  const dt = new Date(d + "T00:00:00");
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split("T")[0];
}
function fmtTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m}${hr >= 12 ? "pm" : "am"}`;
}
function fmtDayFull(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
function fmtMonthYear(y, m) {
  return new Date(y, m, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
function to24Hour(t) {
  const [time, mod] = t.split(" ");
  let [h, m] = time.split(":");
  if (h === "12") h = "00";
  if (mod === "PM") h = String(parseInt(h) + 12);
  return `${h.padStart(2, "0")}:${m}:00`;
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const HOURS = Array.from({ length: 19 }, (_, i) => {
  const h = Math.floor(i / 2) + 9;
  const m = i % 2 === 0 ? "00" : "30";
  return `${h.toString().padStart(2, "0")}:${m}`;
}).filter((t) => t <= "18:00");

const STATUS_CFG = {
  confirmed: {
    label: "Confirmed",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.1)",
    border: "rgba(74,222,128,0.2)",
  },
  completed: {
    label: "Completed",
    color: "#a1a1aa",
    bg: "rgba(161,161,170,0.08)",
    border: "rgba(161,161,170,0.15)",
  },
  no_show: {
    label: "No Show",
    color: "#f87171",
    bg: "rgba(248,113,113,0.08)",
    border: "rgba(248,113,113,0.2)",
  },
  cancelled: {
    label: "Cancelled",
    color: "#52525b",
    bg: "rgba(82,82,91,0.06)",
    border: "rgba(82,82,91,0.15)",
  },
};
const PAY_CFG = {
  online: {
    label: "Online",
    color: "#F59E0B",
    bg: T.amberDim,
    border: T.amberBorder,
  },
  shop: {
    label: "In Shop",
    color: "#71717a",
    bg: "rgba(113,113,122,0.06)",
    border: "rgba(113,113,122,0.15)",
  },
};

// ── Scissor SVG ───────────────────────────────────────────────────────────────
const Scissors = ({ size = 16, color = T.amber }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const isErr = toast.type === "error";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        padding: "12px 24px",
        background: isErr ? "rgba(248,113,113,0.08)" : "rgba(74,222,128,0.08)",
        border: `1px solid ${isErr ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}`,
        backdropFilter: "blur(20px)",
        animation: "toastIn 0.3s ease",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: isErr ? "#f87171" : "#4ade80",
          flexShrink: 0,
        }}
      />
      <p
        style={{
          ...sf,
          fontSize: 7,
          color: isErr ? "#f87171" : "#4ade80",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        {toast.msg}
      </p>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, icon }) {
  return (
    <div
      style={{
        padding: "18px 16px",
        background: accent ? T.amberDim : T.surface,
        border: `1px solid ${accent ? T.amberBorder : T.border}`,
        position: "relative",
        overflow: "hidden",
        transition: "all 0.25s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = T.amber;
        e.currentTarget.style.background = T.amberDim;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = accent ? T.amberBorder : T.border;
        e.currentTarget.style.background = accent ? T.amberDim : T.surface;
      }}
    >
      {/* Corner accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 40,
          height: 40,
          background: accent
            ? "linear-gradient(225deg, rgba(245,158,11,0.2), transparent)"
            : "linear-gradient(225deg, rgba(255,255,255,0.03), transparent)",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <p
          style={{
            ...sf,
            fontSize: 6,
            letterSpacing: "0.35em",
            color: accent ? T.amber : T.muted,
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          {label}
        </p>
        {icon && <span style={{ fontSize: 12, opacity: 0.5 }}>{icon}</span>}
      </div>
      <p
        style={{
          ...sf,
          fontSize: 26,
          fontWeight: 900,
          color: accent ? T.amber : "white",
          lineHeight: 1,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ── Monthly Calendar ──────────────────────────────────────────────────────────
function MonthCalendar({
  year,
  month,
  selectedDate,
  appointmentDates,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}) {
  const today = todayISO();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        padding: "18px 16px",
      }}
    >
      {/* Month header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <button
          onClick={onPrevMonth}
          style={{
            width: 28,
            height: 28,
            background: "transparent",
            border: `1px solid ${T.border}`,
            color: T.muted,
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = T.amber;
            e.currentTarget.style.color = T.amber;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.border;
            e.currentTarget.style.color = T.muted;
          }}
        >
          ‹
        </button>
        <h3
          style={{
            ...sf,
            fontSize: 8,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "white",
            margin: 0,
          }}
        >
          {fmtMonthYear(year, month)}
        </h3>
        <button
          onClick={onNextMonth}
          style={{
            width: 28,
            height: 28,
            background: "transparent",
            border: `1px solid ${T.border}`,
            color: T.muted,
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = T.amber;
            e.currentTarget.style.color = T.amber;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.border;
            e.currentTarget.style.color = T.muted;
          }}
        >
          ›
        </button>
      </div>

      {/* Day labels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          marginBottom: 6,
        }}
      >
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            style={{
              ...sf,
              fontSize: 6,
              textAlign: "center",
              color: T.dim,
              letterSpacing: "0.05em",
              padding: "2px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 2,
        }}
      >
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = ds === today;
          const isSelected = ds === selectedDate;
          const count = appointmentDates[ds] || 0;
          const isSun = new Date(ds + "T00:00:00").getDay() === 0;

          return (
            <button
              key={ds}
              onClick={() => onSelectDate(ds)}
              style={{
                aspectRatio: "1",
                background: isSelected
                  ? T.amber
                  : isToday
                    ? T.amberDim
                    : "transparent",
                border: `1px solid ${isSelected ? T.amber : isToday ? T.amberBorder : "transparent"}`,
                color: isSelected
                  ? "black"
                  : isSun
                    ? T.deepDim
                    : isToday
                      ? T.amber
                      : "white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                transition: "all 0.15s",
                padding: 1,
                borderRadius: 0,
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = T.amberDim;
                  e.currentTarget.style.borderColor = T.amberBorder;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = isToday
                    ? T.amberDim
                    : "transparent";
                  e.currentTarget.style.borderColor = isToday
                    ? T.amberBorder
                    : "transparent";
                }
              }}
            >
              <span
                style={{
                  ...sf,
                  fontSize: 9,
                  fontWeight: isToday || isSelected ? 900 : 400,
                  lineHeight: 1,
                }}
              >
                {day}
              </span>
              {count > 0 && (
                <span
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: isSelected ? "rgba(0,0,0,0.5)" : T.amber,
                    display: "block",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: `1px solid ${T.border}`,
          display: "flex",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: T.amber,
            }}
          />
          <span style={{ ...mono, fontSize: 8, color: T.muted }}>Booked</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 10,
              height: 10,
              border: `1px solid ${T.amberBorder}`,
              background: T.amberDim,
            }}
          />
          <span style={{ ...mono, fontSize: 8, color: T.muted }}>Today</span>
        </div>
      </div>
    </div>
  );
}

// ── Appointment ticket card ───────────────────────────────────────────────────
function ApptTicket({
  appt,
  onStatusChange,
  onReschedule,
  onCancel,
  onNotes,
  isMobile,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState(appt.status || "confirmed");
  const menuRef = useRef(null);
  const sCfg = STATUS_CFG[status] || STATUS_CFG.confirmed;
  const pCfg = PAY_CFG[appt.payment_method] || PAY_CFG.shop;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleStatus = async (newStatus) => {
    setMenuOpen(false);
    const prev = status;
    setStatus(newStatus);
    try {
      await onStatusChange(appt.id, newStatus);
    } catch {
      setStatus(prev);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        background: T.surface,
        border: `1px solid ${T.border}`,
        transition: "all 0.2s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(245,158,11,0.2)";
        e.currentTarget.style.background = "rgba(245,158,11,0.018)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = T.border;
        e.currentTarget.style.background = T.surface;
      }}
    >
      {/* Left accent strip */}
      <div
        style={{
          width: 3,
          background: sCfg.color,
          flexShrink: 0,
          opacity: 0.9,
        }}
      />

      {/* Time block */}
      <div
        style={{
          width: isMobile ? 58 : 64,
          flexShrink: 0,
          padding: isMobile ? "16px 8px" : "14px 10px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "rgba(255,255,255,0.015)",
          borderRight: `1px solid ${T.border}`,
        }}
      >
        <p
          style={{
            ...mono,
            fontSize: isMobile ? 12 : 13,
            color: T.amber,
            fontWeight: 500,
            margin: 0,
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          {fmtTime(appt.time)}
        </p>
        {appt.service_duration && (
          <p
            style={{
              ...mono,
              fontSize: 8,
              color: T.muted,
              margin: "4px 0 0",
              textAlign: "center",
            }}
          >
            {appt.service_duration}m
          </p>
        )}
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          padding: isMobile ? "14px 10px" : "12px 14px",
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: isMobile ? 6 : 5,
            flexWrap: "wrap",
          }}
        >
          <p
            style={{
              ...sf,
              fontSize: isMobile ? 9 : 9,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "white",
              margin: 0,
              letterSpacing: "0.05em",
            }}
          >
            {appt.client}
          </p>
          <span
            style={{
              ...sf,
              fontSize: 6,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "2px 7px",
              background: pCfg.bg,
              color: pCfg.color,
              border: `1px solid ${pCfg.border}`,
            }}
          >
            {pCfg.label}
          </span>
          {appt.is_walk_in && (
            <span
              style={{
                ...sf,
                fontSize: 6,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "2px 7px",
                background: "rgba(139,92,246,0.1)",
                color: "#a78bfa",
                border: "1px solid rgba(139,92,246,0.25)",
              }}
            >
              Walk-In
            </span>
          )}
          {appt.barber_notes && (
            <span style={{ fontSize: 9, color: T.amber }}>📝</span>
          )}
        </div>
        <p
          style={{
            ...mono,
            fontSize: isMobile ? 12 : 11,
            color: "#a1a1aa",
            margin: 0,
          }}
        >
          {appt.service}
          {appt.service_price ? (
            <span style={{ color: T.muted }}> · ${appt.service_price}</span>
          ) : (
            ""
          )}
        </p>
        {!isMobile && appt.client_email && (
          <p style={{ ...mono, fontSize: 9, color: T.dim, marginTop: 4 }}>
            {appt.client_email}
          </p>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 8 : 6,
          padding: isMobile ? "0 12px" : "0 10px",
          flexShrink: 0,
        }}
      >
        {/* Status pill */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              ...sf,
              fontSize: 6,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "4px 8px",
              background: sCfg.bg,
              color: sCfg.color,
              border: `1px solid ${sCfg.border}`,
              cursor: "pointer",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: sCfg.color,
                flexShrink: 0,
              }}
            />
            {!isMobile && sCfg.label}
            <span
              style={{
                fontSize: 7,
                opacity: 0.5,
                transform: menuOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
                display: "inline-block",
              }}
            >
              ▾
            </span>
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                zIndex: 200,
                background: "#0a0a0a",
                border: `1px solid ${T.border}`,
                minWidth: 140,
                boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
              }}
            >
              {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleStatus(key)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: status === key ? T.amberDim : "transparent",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (status !== key)
                      e.currentTarget.style.background = T.surface;
                  }}
                  onMouseLeave={(e) => {
                    if (status !== key)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: cfg.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      ...sf,
                      fontSize: 7,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: status === key ? T.amber : "#a1a1aa",
                    }}
                  >
                    {cfg.label}
                  </span>
                  {status === key && (
                    <span
                      style={{
                        marginLeft: "auto",
                        color: T.amber,
                        fontSize: 9,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <button
          onClick={() => onNotes(appt)}
          title="Add notes"
          style={{
            width: isMobile ? 36 : 28,
            height: isMobile ? 36 : 28,
            background: appt.barber_notes ? T.amberDim : "transparent",
            border: `1px solid ${appt.barber_notes ? T.amberBorder : T.border}`,
            color: appt.barber_notes ? T.amber : T.muted,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isMobile ? 13 : 10,
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = T.amberBorder;
            e.currentTarget.style.color = T.amber;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = appt.barber_notes
              ? T.amberBorder
              : T.border;
            e.currentTarget.style.color = appt.barber_notes ? T.amber : T.muted;
          }}
        >
          📝
        </button>

        {/* Reschedule */}
        <button
          onClick={() => onReschedule(appt)}
          title="Reschedule"
          style={{
            width: isMobile ? 36 : 28,
            height: isMobile ? 36 : 28,
            background: "transparent",
            border: `1px solid ${T.amberBorder}`,
            color: T.amber,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isMobile ? 14 : 11,
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = T.amberDim)}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          ↻
        </button>

        {/* Cancel */}
        <button
          onClick={() => onCancel(appt)}
          title="Cancel"
          style={{
            width: isMobile ? 36 : 28,
            height: isMobile ? 36 : 28,
            background: "transparent",
            border: "1px solid rgba(248,113,113,0.2)",
            color: T.dim,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isMobile ? 14 : 11,
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#f87171";
            e.currentTarget.style.color = "#f87171";
            e.currentTarget.style.background = "rgba(248,113,113,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(248,113,113,0.2)";
            e.currentTarget.style.color = T.dim;
            e.currentTarget.style.background = "transparent";
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Reschedule Modal ──────────────────────────────────────────────────────────
function RescheduleModal({ appt, onClose, onDone }) {
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const slots = HOURS.map((h) => {
    const [hr, mn] = h.split(":");
    const hour = parseInt(hr);
    return `${hour % 12 || 12}:${mn} ${hour >= 12 ? "PM" : "AM"}`;
  });

  const handle = async () => {
    if (!newDate || !newTime) {
      setErr("Pick a date and time.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await API.patch(`barber/appointments/${appt.id}/`, {
        date: newDate,
        time: to24Hour(newTime),
      });
      setDone(true);
      setTimeout(() => {
        onDone(appt.id, newDate, to24Hour(newTime));
        onClose();
      }, 1400);
    } catch (e) {
      setErr(e.response?.data?.error || "Slot may already be booked.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(4,4,4,0.95)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#060606",
          border: `1px solid ${T.border}`,
          padding: "28px 24px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {done ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#22c55e,#16a34a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="black"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p
              style={{
                ...sf,
                fontSize: 8,
                color: "#4ade80",
                textTransform: "uppercase",
                letterSpacing: "0.3em",
              }}
            >
              Rescheduled
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <Scissors size={18} />
              <div>
                <p
                  style={{
                    ...sf,
                    fontSize: 6,
                    letterSpacing: "0.4em",
                    color: T.muted,
                    textTransform: "uppercase",
                    margin: 0,
                  }}
                >
                  Reschedule
                </p>
                <h2
                  style={{
                    ...sf,
                    fontSize: 16,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    color: "white",
                    margin: 0,
                  }}
                >
                  {appt.client}
                  <span style={{ color: T.amber }}>_</span>
                </h2>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label
                  style={{
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.3em",
                    color: T.muted,
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  New Date
                </label>
                <input
                  type="date"
                  value={newDate}
                  min={todayISO()}
                  onChange={(e) => setNewDate(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#050505",
                    border: `1px solid ${T.border}`,
                    padding: "12px 14px",
                    color: "white",
                    fontSize: 14,
                    outline: "none",
                    fontFamily: "'DM Mono', monospace",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = T.amber)}
                  onBlur={(e) => (e.target.style.borderColor = T.border)}
                />
              </div>
              <div>
                <label
                  style={{
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.3em",
                    color: T.muted,
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  New Time
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: 5,
                  }}
                >
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => setNewTime(s)}
                      style={{
                        padding: "7px 2px",
                        ...sf,
                        fontSize: 6,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        border: `1px solid ${newTime === s ? T.amber : T.border}`,
                        background: newTime === s ? T.amberDim : "transparent",
                        color: newTime === s ? T.amber : T.muted,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {err && (
                <p
                  style={{ ...mono, fontSize: 11, color: "#f87171", margin: 0 }}
                >
                  ⚠ {err}
                </p>
              )}
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "transparent",
                    border: `1px solid ${T.border}`,
                    color: T.muted,
                    ...sf,
                    fontSize: 7,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = T.border;
                    e.currentTarget.style.color = T.muted;
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handle}
                  disabled={!newDate || !newTime || saving}
                  style={{
                    flex: 2,
                    padding: "12px",
                    background:
                      !newDate || !newTime || saving ? T.deepDim : T.amber,
                    color: !newDate || !newTime || saving ? T.dim : "black",
                    ...sf,
                    fontSize: 7,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    border: "none",
                    cursor:
                      !newDate || !newTime || saving
                        ? "not-allowed"
                        : "pointer",
                    transition: "all 0.25s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {saving ? (
                    <>
                      <span
                        style={{
                          width: 11,
                          height: 11,
                          border: "2px solid #3f3f46",
                          borderTopColor: "#71717a",
                          borderRadius: "50%",
                          display: "inline-block",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                      Saving...
                    </>
                  ) : (
                    "Confirm →"
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BarberDashboard() {
  const router = useRouter();
  const { isMobile } = useBreakpoint();

  const [barber, setBarber] = useState(null);
  const [activeTab, setActiveTab] = useState("schedule");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [apptDots, setApptDots] = useState({});

  const [schedule, setSchedule] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    paid_online: 0,
    pay_in_shop: 0,
    online_revenue: "0.00",
  });
  const [loadingSched, setLoadingSched] = useState(false);

  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const [availability, setAvailability] = useState([]);
  const [editingDay, setEditingDay] = useState(null);
  const [editStart, setEditStart] = useState("09:00");
  const [editEnd, setEditEnd] = useState("18:00");
  const [editWorking, setEditWorking] = useState(true);
  const [savingAvail, setSavingAvail] = useState(false);

  const [timeOff, setTimeOff] = useState([]);
  const [newTimeOffDate, setNewTimeOffDate] = useState("");
  const [newTimeOffReason, setNewTimeOffReason] = useState("");
  const [addingTimeOff, setAddingTimeOff] = useState(false);

  // Walk-in state
  const [wiClientName, setWiClientName] = useState("");
  const [wiService, setWiService] = useState("");
  const [wiDate, setWiDate] = useState(today);
  const [wiTime, setWiTime] = useState("");
  const [wiPayment, setWiPayment] = useState("shop");
  const [wiNotes, setWiNotes] = useState("");
  const [wiSubmitting, setWiSubmitting] = useState(false);
  const [services, setServices] = useState([]);

  // Waitlist state
  const [waitlist, setWaitlist] = useState([]);
  const [wlName, setWlName] = useState("");
  const [wlPhone, setWlPhone] = useState("");
  const [wlEmail, setWlEmail] = useState("");
  const [wlService, setWlService] = useState("");
  const [wlDate, setWlDate] = useState(today);
  const [wlNotes, setWlNotes] = useState("");
  const [wlSubmitting, setWlSubmitting] = useState(false);

  // Notes modal state
  const [notesAppt, setNotesAppt] = useState(null);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Reminders
  const [sendingReminders, setSendingReminders] = useState(false);

  // Auth
  useEffect(() => {
    API.get("barber/me/")
      .then((res) => setBarber(res.data))
      .catch((e) => {
        if (e.response?.status === 403 || e.response?.status === 401)
          router.push("/barber-login");
      })
      .finally(() => setLoading(false));
  }, []);

  // Schedule
  const loadSchedule = useCallback(async () => {
    if (!barber) return;
    setLoadingSched(true);
    try {
      const res = await API.get(`barber/schedule/?date=${selectedDate}`);
      setSchedule(res.data.appointments || []);
      setSummary(
        res.data.summary || {
          total: 0,
          paid_online: 0,
          pay_in_shop: 0,
          online_revenue: "0.00",
        },
      );
    } catch {
      showToast("Could not load schedule.", "error");
    } finally {
      setLoadingSched(false);
    }
  }, [barber, selectedDate]);
  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // Month dots
  const loadMonthDots = useCallback(async () => {
    if (!barber) return;
    try {
      const firstDay = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
      const res = await API.get(`barber/schedule/?date=${firstDay}&month=true`);
      const counts = {};
      (res.data.appointments || []).forEach((a) => {
        counts[a.date] = (counts[a.date] || 0) + 1;
      });
      setApptDots(counts);
    } catch {}
  }, [barber, calYear, calMonth]);
  useEffect(() => {
    loadMonthDots();
  }, [loadMonthDots]);

  // Availability
  const loadAvailability = useCallback(async () => {
    if (!barber) return;
    try {
      const res = await API.get("barber/availability/");
      setAvailability(res.data);
    } catch {}
  }, [barber]);
  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  // Time off
  const loadTimeOff = useCallback(async () => {
    if (!barber) return;
    try {
      const res = await API.get("barber/time-off/");
      setTimeOff(res.data);
    } catch {}
  }, [barber]);
  useEffect(() => {
    if (activeTab === "timeoff") loadTimeOff();
  }, [activeTab, loadTimeOff]);

  // Services (for walk-in and waitlist)
  useEffect(() => {
    API.get("services/")
      .then((res) =>
        setServices(
          Array.isArray(res.data) ? res.data : res.data.results || [],
        ),
      )
      .catch(() => {});
  }, []);

  // Waitlist
  const loadWaitlist = useCallback(async () => {
    if (!barber) return;
    try {
      const res = await API.get("barber/waitlist/");
      setWaitlist(res.data);
    } catch {}
  }, [barber]);
  useEffect(() => {
    if (activeTab === "waitlist") loadWaitlist();
  }, [activeTab, loadWaitlist]);

  // Entry animation
  useEffect(() => {
    if (!loading && barber)
      gsap.from(".bd-enter", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        stagger: 0.06,
        ease: "expo.out",
      });
  }, [loading, barber]);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    router.push("/barber-login");
  };

  const handleStatusChange = async (apptId, newStatus) => {
    try {
      await API.patch(`barber/appointments/${apptId}/`, { status: newStatus });
      setSchedule((prev) =>
        prev.map((a) => (a.id === apptId ? { ...a, status: newStatus } : a)),
      );
      showToast(`Marked ${STATUS_CFG[newStatus].label}`);
    } catch {
      showToast("Could not update.", "error");
      throw new Error("failed");
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await API.delete(`barber/appointments/${cancelTarget.id}/`);
      setSchedule((prev) => prev.filter((a) => a.id !== cancelTarget.id));
      setSummary((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      setApptDots((prev) => ({
        ...prev,
        [cancelTarget.date]: Math.max(0, (prev[cancelTarget.date] || 1) - 1),
      }));
      setCancelTarget(null);
      showToast("Appointment cancelled.");
    } catch {
      showToast("Could not cancel.", "error");
    } finally {
      setCancelling(false);
    }
  };

  const handleRescheduleDone = (apptId, newDate, newTime) => {
    if (newDate === selectedDate)
      setSchedule((prev) =>
        prev.map((a) =>
          a.id === apptId ? { ...a, date: newDate, time: newTime } : a,
        ),
      );
    else setSchedule((prev) => prev.filter((a) => a.id !== apptId));
    showToast("Rescheduled.");
  };

  const saveAvailability = async () => {
    if (editingDay === null) return;
    setSavingAvail(true);
    try {
      await API.post("barber/availability/", {
        day_of_week: editingDay,
        start_time: editWorking ? editStart : "09:00",
        end_time: editWorking ? editEnd : "18:00",
        is_working: editWorking,
      });
      await loadAvailability();
      setEditingDay(null);
      showToast("Hours saved.");
    } catch {
      showToast("Could not save.", "error");
    } finally {
      setSavingAvail(false);
    }
  };

  const addTimeOff = async () => {
    if (!newTimeOffDate) return;
    setAddingTimeOff(true);
    try {
      await API.post("barber/time-off/", {
        date: newTimeOffDate,
        reason: newTimeOffReason,
      });
      setNewTimeOffDate("");
      setNewTimeOffReason("");
      await loadTimeOff();
      showToast("Date blocked.");
    } catch {
      showToast("Could not add.", "error");
    } finally {
      setAddingTimeOff(false);
    }
  };

  const removeTimeOff = async (id) => {
    try {
      await API.delete(`barber/time-off/${id}/`);
      setTimeOff((prev) => prev.filter((t) => t.id !== id));
      showToast("Removed.");
    } catch {
      showToast("Could not remove.", "error");
    }
  };

  // Walk-in booking
  const handleWalkIn = async () => {
    if (!wiClientName.trim() || !wiService || !wiDate || !wiTime) {
      showToast("Fill in all required fields.", "error");
      return;
    }
    setWiSubmitting(true);
    try {
      await API.post("barber/walk-in/", {
        client_name: wiClientName.trim(),
        service: wiService,
        date: wiDate,
        time: to24Hour(wiTime),
        payment_method: wiPayment,
        notes: wiNotes,
      });
      setWiClientName("");
      setWiService("");
      setWiTime("");
      setWiNotes("");
      setWiPayment("shop");
      showToast("Walk-in booked!");
      // Refresh schedule if date matches
      if (wiDate === selectedDate) loadSchedule();
      loadMonthDots();
    } catch (e) {
      showToast(e.response?.data?.error || "Could not book walk-in.", "error");
    } finally {
      setWiSubmitting(false);
    }
  };

  // Waitlist
  const handleAddWaitlist = async () => {
    if (!wlName.trim() || !wlDate) {
      showToast("Name and date are required.", "error");
      return;
    }
    setWlSubmitting(true);
    try {
      await API.post("barber/waitlist/", {
        client_name: wlName.trim(),
        client_phone: wlPhone.trim(),
        client_email: wlEmail.trim(),
        service: wlService || undefined,
        date: wlDate,
        notes: wlNotes,
      });
      setWlName("");
      setWlPhone("");
      setWlEmail("");
      setWlService("");
      setWlNotes("");
      await loadWaitlist();
      showToast("Added to waitlist.");
    } catch {
      showToast("Could not add to waitlist.", "error");
    } finally {
      setWlSubmitting(false);
    }
  };

  const removeWaitlist = async (id) => {
    try {
      await API.delete(`barber/waitlist/${id}/`);
      setWaitlist((prev) => prev.filter((w) => w.id !== id));
      showToast("Removed from waitlist.");
    } catch {
      showToast("Could not remove.", "error");
    }
  };

  const markWaitlistNotified = async (id) => {
    try {
      await API.patch(`barber/waitlist/${id}/`, {});
      setWaitlist((prev) =>
        prev.map((w) => (w.id === id ? { ...w, notified: true } : w)),
      );
      showToast("Marked as notified.");
    } catch {
      showToast("Could not update.", "error");
    }
  };

  // Notes
  const openNotes = (appt) => {
    setNotesAppt(appt);
    setNotesText(appt.barber_notes || "");
  };
  const saveNotes = async () => {
    if (!notesAppt) return;
    setSavingNotes(true);
    try {
      await API.patch(`barber/appointments/${notesAppt.id}/`, {
        barber_notes: notesText,
      });
      setSchedule((prev) =>
        prev.map((a) =>
          a.id === notesAppt.id ? { ...a, barber_notes: notesText } : a,
        ),
      );
      setNotesAppt(null);
      showToast("Notes saved.");
    } catch {
      showToast("Could not save notes.", "error");
    } finally {
      setSavingNotes(false);
    }
  };

  // Send reminders
  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await API.post("barber/send-reminders/");
      showToast(res.data.message || "Reminders sent.");
    } catch {
      showToast("Could not send reminders.", "error");
    } finally {
      setSendingReminders(false);
    }
  };

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };
  const handleSelectDate = (ds) => {
    setSelectedDate(ds);
    const d = new Date(ds + "T00:00:00");
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
    if (activeTab !== "schedule") setActiveTab("schedule");
  };

  if (loading)
    return (
      <div
        style={{
          background: T.bg,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <style jsx global>{`
          body {
            background: ${T.bg};
            margin: 0;
          }
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
        <Scissors size={28} />
        <div
          style={{
            width: 1,
            height: 40,
            background: `linear-gradient(to bottom, ${T.amber}, transparent)`,
          }}
        />
        <div
          style={{
            width: 20,
            height: 20,
            border: `1.5px solid rgba(245,158,11,0.3)`,
            borderTopColor: T.amber,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );

  if (!barber) return null;

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@400;500&display=swap");
        *,
        *::before,
        *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html,
        body {
          background: ${T.bg};
          color: white;
          overflow-y: auto !important;
          overflow-x: hidden;
        }
        ::-webkit-scrollbar {
          width: 0;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes pageIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .bd-page {
          animation: pageIn 0.5s ease forwards;
        }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1) opacity(0.35);
          cursor: pointer;
        }
        .tab-pill {
          transition: all 0.2s;
        }
        .tab-pill:hover {
          color: white !important;
        }
        @keyframes scanline {
          0% {
            top: -10%;
          }
          100% {
            top: 110%;
          }
        }
        @keyframes drift {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(2deg);
          }
        }
      `}</style>

      {/* Scanline sweep */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 2,
            background:
              "linear-gradient(to bottom, transparent, rgba(245,158,11,0.03), transparent)",
            animation: "scanline 12s linear infinite",
          }}
        />
      </div>

      {/* Grid lines */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Amber glow top-right */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 500,
          height: 500,
          background:
            "radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Amber glow bottom-left */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: 400,
          height: 400,
          background:
            "radial-gradient(circle, rgba(245,158,11,0.025) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Grain */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          opacity: 0.028,
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.svg')",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Corner marks */}
      {[
        { top: 68, left: 16 },
        { top: 68, right: 16 },
        { bottom: 16, left: 16 },
        { bottom: 16, right: 16 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "fixed",
            ...pos,
            zIndex: 1,
            pointerEvents: "none",
            width: 16,
            height: 16,
            opacity: 0.12,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 7,
              height: 1,
              background: T.amber,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1,
              height: 7,
              background: T.amber,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 7,
              height: 1,
              background: T.amber,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 1,
              height: 7,
              background: T.amber,
            }}
          />
        </div>
      ))}

      <Toast toast={toast} />

      {/* ── NAV ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "rgba(4,4,4,0.94)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: isMobile ? "0 14px" : "0 24px",
            height: 56,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Left */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Scissors size={14} />
              <span
                style={{
                  ...sf,
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "-0.05em",
                }}
              >
                HEADZ
                <span style={{ color: T.amber, fontStyle: "italic" }}>UP</span>
              </span>
            </div>
            {!isMobile && (
              <>
                <div style={{ width: 1, height: 14, background: T.border }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#22c55e",
                      boxShadow: "0 0 8px rgba(34,197,94,0.6)",
                    }}
                  />
                  <span
                    style={{
                      ...sf,
                      fontSize: 6,
                      letterSpacing: "0.3em",
                      color: T.amber,
                      textTransform: "uppercase",
                    }}
                  >
                    {barber.name}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Right */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              onClick={() => handleSelectDate(today)}
              style={{
                ...sf,
                fontSize: 6,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: T.muted,
                background: "none",
                border: `1px solid ${T.border}`,
                padding: "6px 12px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = T.amberBorder;
                e.currentTarget.style.color = T.amber;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = T.border;
                e.currentTarget.style.color = T.muted;
              }}
            >
              Today
            </button>
            <button
              onClick={handleLogout}
              style={{
                ...sf,
                fontSize: 6,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: T.muted,
                background: "none",
                border: `1px solid ${T.border}`,
                padding: "6px 12px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#f87171";
                e.currentTarget.style.color = "#f87171";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = T.border;
                e.currentTarget.style.color = T.muted;
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tabs in nav */}
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: isMobile ? "0 14px" : "0 24px",
            display: "flex",
            borderTop: `1px solid ${T.border}`,
          }}
        >
          {[
            { key: "schedule", label: "Schedule", icon: "📅" },
            { key: "walkin", label: "Walk-In", icon: "✂️" },
            { key: "waitlist", label: "Waitlist", icon: "⏳" },
            { key: "availability", label: "My Hours", icon: "⏰" },
            { key: "timeoff", label: "Time Off", icon: "🏖" },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="tab-pill"
              style={{
                padding: isMobile ? "10px 14px" : "10px 20px",
                ...sf,
                fontSize: isMobile ? 6 : 7,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${activeTab === key ? T.amber : "transparent"}`,
                color: activeTab === key ? T.amber : T.muted,
                cursor: "pointer",
                marginBottom: -1,
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {!isMobile && <span style={{ fontSize: 10 }}>{icon}</span>}
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── MAIN ── */}
      <div
        className="bd-page"
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          padding: isMobile ? "104px 12px 40px" : "108px 24px 48px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {/* ── HEADER ── */}
        <div
          className="bd-enter"
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <p
              style={{
                ...sf,
                fontSize: 6,
                letterSpacing: "0.6em",
                color: T.muted,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Barber Portal
            </p>
            <h1
              style={{
                ...sf,
                fontSize: "clamp(1.4rem, 2.5vw, 2rem)",
                fontWeight: 900,
                textTransform: "uppercase",
                lineHeight: 1,
                margin: 0,
              }}
            >
              {isMobile ? barber.name : `Hey, `}
              <span style={{ color: T.amber, fontStyle: "italic" }}>
                {isMobile ? "_" : `${barber.name}_`}
              </span>
            </h1>
          </div>
          {/* Animated scissors divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              opacity: 0.25,
            }}
          >
            <div
              style={{
                width: isMobile ? 36 : 96,
                height: 1,
                background: `linear-gradient(to right, transparent, ${T.amber})`,
              }}
            />
            <div style={{ animation: "drift 5s ease-in-out infinite" }}>
              <Scissors size={16} />
            </div>
            <div
              style={{
                width: isMobile ? 36 : 96,
                height: 1,
                background: `linear-gradient(to left, transparent, ${T.amber})`,
              }}
            />
          </div>
        </div>

        {/* ── STATS ── */}
        <div
          className="bd-enter"
          style={{
            marginBottom: 24,
            overflowX: isMobile ? "auto" : "visible",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "repeat(4, minmax(100px, 1fr))"
                : "repeat(4,1fr)",
              gap: 8,
              minWidth: isMobile ? 420 : "auto",
            }}
          >
            <StatCard
              label="Today"
              value={barber.today_count}
              accent
              icon="✂️"
            />
            <StatCard label="All Time" value={barber.total_count} />
            <StatCard label="Online Rev" value={`$${summary.online_revenue}`} />
            <StatCard label="Pay In Shop" value={summary.pay_in_shop} />
          </div>
        </div>

        {/* ── SCHEDULE TAB ── */}
        {activeTab === "schedule" && (
          <>
            {/* ── MOBILE: Week strip ── */}
            {isMobile && (
              <div className="bd-enter" style={{ marginBottom: 16 }}>
                {/* Month label + calendar toggle */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <button
                      onClick={prevMonth}
                      style={{
                        width: 26,
                        height: 26,
                        background: "transparent",
                        border: `1px solid ${T.border}`,
                        color: T.muted,
                        cursor: "pointer",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = T.amberBorder;
                        e.currentTarget.style.color = T.amber;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = T.border;
                        e.currentTarget.style.color = T.muted;
                      }}
                    >
                      ‹
                    </button>
                    <p
                      style={{
                        ...sf,
                        fontSize: 7,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "white",
                        margin: 0,
                      }}
                    >
                      {fmtMonthYear(calYear, calMonth)}
                    </p>
                    <button
                      onClick={nextMonth}
                      style={{
                        width: 26,
                        height: 26,
                        background: "transparent",
                        border: `1px solid ${T.border}`,
                        color: T.muted,
                        cursor: "pointer",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = T.amberBorder;
                        e.currentTarget.style.color = T.amber;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = T.border;
                        e.currentTarget.style.color = T.muted;
                      }}
                    >
                      ›
                    </button>
                  </div>
                  <button
                    onClick={() => handleSelectDate(today)}
                    style={{
                      ...sf,
                      fontSize: 6,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: selectedDate === today ? T.amber : T.muted,
                      background:
                        selectedDate === today ? T.amberDim : "transparent",
                      border: `1px solid ${selectedDate === today ? T.amberBorder : T.border}`,
                      padding: "5px 10px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    Today
                  </button>
                </div>

                {/* 7-day scrollable strip */}
                <div
                  style={{
                    display: "flex",
                    gap: 5,
                    overflowX: "auto",
                    paddingBottom: 4,
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  {Array.from({ length: 14 }, (_, i) => {
                    const ds = addDays(today, i - 3);
                    const d = new Date(ds + "T00:00:00");
                    const isToday = ds === today;
                    const isSelected = ds === selectedDate;
                    const hasAppts = (apptDots[ds] || 0) > 0;
                    const dayNames = [
                      "Sun",
                      "Mon",
                      "Tue",
                      "Wed",
                      "Thu",
                      "Fri",
                      "Sat",
                    ];
                    return (
                      <button
                        key={ds}
                        onClick={() => handleSelectDate(ds)}
                        style={{
                          flexShrink: 0,
                          width: 52,
                          padding: "10px 4px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                          background: isSelected
                            ? T.amber
                            : isToday
                              ? T.amberDim
                              : T.surface,
                          border: `1px solid ${isSelected ? T.amber : isToday ? T.amberBorder : T.border}`,
                          color: isSelected
                            ? "black"
                            : isToday
                              ? T.amber
                              : "white",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <span
                          style={{
                            ...sf,
                            fontSize: 6,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            opacity: 0.7,
                          }}
                        >
                          {dayNames[d.getDay()]}
                        </span>
                        <span
                          style={{
                            ...sf,
                            fontSize: 18,
                            fontWeight: 900,
                            lineHeight: 1,
                          }}
                        >
                          {d.getDate()}
                        </span>
                        {hasAppts && (
                          <span
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: "50%",
                              background: isSelected
                                ? "rgba(0,0,0,0.4)"
                                : T.amber,
                              display: "block",
                            }}
                          />
                        )}
                        {!hasAppts && (
                          <span
                            style={{ width: 4, height: 4, display: "block" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Layout: calendar left + day right (desktop) / stacked (mobile) ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "260px 1fr",
                gap: isMobile ? 0 : 20,
                alignItems: "start",
              }}
            >
              {/* LEFT: Full calendar — desktop only */}
              {!isMobile && (
                <div
                  className="bd-enter"
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <MonthCalendar
                    year={calYear}
                    month={calMonth}
                    selectedDate={selectedDate}
                    appointmentDates={apptDots}
                    onSelectDate={handleSelectDate}
                    onPrevMonth={prevMonth}
                    onNextMonth={nextMonth}
                  />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 6,
                    }}
                  >
                    {[
                      {
                        label: "← Prev",
                        fn: () => handleSelectDate(addDays(selectedDate, -1)),
                      },
                      {
                        label: "Next →",
                        fn: () => handleSelectDate(addDays(selectedDate, 1)),
                      },
                    ].map(({ label, fn }) => (
                      <button
                        key={label}
                        onClick={fn}
                        style={{
                          padding: "8px",
                          background: T.surface,
                          border: `1px solid ${T.border}`,
                          color: T.muted,
                          cursor: "pointer",
                          ...sf,
                          fontSize: 6,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = T.amberBorder;
                          e.currentTarget.style.color = T.amber;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = T.border;
                          e.currentTarget.style.color = T.muted;
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* RIGHT / MAIN: Day panel */}
              <div className="bd-enter">
                {/* Day header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: isMobile ? 12 : 14,
                    flexWrap: "wrap",
                    gap: 8,
                    paddingBottom: isMobile ? 12 : 14,
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        ...sf,
                        fontSize: isMobile
                          ? "0.85rem"
                          : "clamp(0.75rem,1.5vw,0.9rem)",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        color: selectedDate === today ? T.amber : "white",
                        margin: 0,
                      }}
                    >
                      {fmtDayFull(selectedDate)}
                      {selectedDate === today && (
                        <span style={{ color: T.amber, fontStyle: "italic" }}>
                          {" "}
                          — Today
                        </span>
                      )}
                    </h2>
                    <p
                      style={{
                        ...mono,
                        fontSize: 10,
                        color: T.muted,
                        marginTop: 3,
                      }}
                    >
                      {summary.total} {summary.total === 1 ? "appt" : "appts"}
                      {summary.total > 0 && (
                        <span style={{ color: T.amber }}>
                          {" "}
                          · ${summary.online_revenue} online
                        </span>
                      )}
                    </p>
                  </div>
                  <div
                    style={{ display: "flex", gap: 6, alignItems: "center" }}
                  >
                    {isMobile && (
                      <>
                        <button
                          onClick={() =>
                            handleSelectDate(addDays(selectedDate, -1))
                          }
                          style={{
                            width: 32,
                            height: 32,
                            background: T.surface,
                            border: `1px solid ${T.border}`,
                            color: T.muted,
                            cursor: "pointer",
                            fontSize: 14,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = T.amberBorder;
                            e.currentTarget.style.color = T.amber;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = T.border;
                            e.currentTarget.style.color = T.muted;
                          }}
                        >
                          ←
                        </button>
                        <button
                          onClick={() =>
                            handleSelectDate(addDays(selectedDate, 1))
                          }
                          style={{
                            width: 32,
                            height: 32,
                            background: T.surface,
                            border: `1px solid ${T.border}`,
                            color: T.muted,
                            cursor: "pointer",
                            fontSize: 14,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = T.amberBorder;
                            e.currentTarget.style.color = T.amber;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = T.border;
                            e.currentTarget.style.color = T.muted;
                          }}
                        >
                          →
                        </button>
                      </>
                    )}
                    <button
                      onClick={loadSchedule}
                      style={{
                        ...sf,
                        fontSize: 6,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: T.muted,
                        background: "none",
                        border: `1px solid ${T.border}`,
                        padding: "6px 10px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = T.amber;
                        e.currentTarget.style.borderColor = T.amberBorder;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = T.muted;
                        e.currentTarget.style.borderColor = T.border;
                      }}
                    >
                      ↻
                    </button>
                  </div>
                </div>

                {/* Appointments */}
                {loadingSched ? (
                  <div
                    style={{
                      padding: "40px 0",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        border: `1.5px solid rgba(245,158,11,0.2)`,
                        borderTopColor: T.amber,
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    <p
                      style={{
                        ...sf,
                        fontSize: 6,
                        color: T.dim,
                        letterSpacing: "0.3em",
                        textTransform: "uppercase",
                      }}
                    >
                      Loading...
                    </p>
                  </div>
                ) : schedule.length === 0 ? (
                  <div
                    style={{
                      padding: isMobile ? "40px 16px" : "56px 20px",
                      textAlign: "center",
                      border: `1px solid ${T.border}`,
                      background: "rgba(255,255,255,0.01)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <p
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        ...sf,
                        fontSize: "clamp(3rem,8vw,6rem)",
                        fontWeight: 900,
                        color: "rgba(255,255,255,0.02)",
                        textTransform: "uppercase",
                        letterSpacing: "-0.05em",
                        userSelect: "none",
                        pointerEvents: "none",
                      }}
                    >
                      FREE
                    </p>
                    <div style={{ position: "relative", zIndex: 1 }}>
                      <div
                        style={{
                          marginBottom: 12,
                          display: "flex",
                          justifyContent: "center",
                        }}
                      >
                        <Scissors size={24} color="rgba(255,255,255,0.07)" />
                      </div>
                      <p
                        style={{
                          ...sf,
                          fontSize: "0.85rem",
                          fontWeight: 900,
                          color: "rgba(255,255,255,0.05)",
                          textTransform: "uppercase",
                          marginBottom: 6,
                        }}
                      >
                        No Bookings
                      </p>
                      <p style={{ ...mono, color: T.dim, fontSize: 11 }}>
                        Nothing scheduled — enjoy the day off.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: isMobile ? 6 : 5,
                    }}
                  >
                    {schedule
                      .slice()
                      .sort((a, b) =>
                        (a.time || "").localeCompare(b.time || ""),
                      )
                      .map((appt) => (
                        <ApptTicket
                          key={appt.id}
                          appt={appt}
                          onStatusChange={handleStatusChange}
                          onReschedule={setRescheduleAppt}
                          onCancel={setCancelTarget}
                          onNotes={openNotes}
                          isMobile={isMobile}
                        />
                      ))}
                  </div>
                )}

                {/* Timeline — desktop only */}
                {!isMobile && schedule.length > 0 && (
                  <div style={{ marginTop: 28 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <p
                        style={{
                          ...sf,
                          fontSize: 6,
                          letterSpacing: "0.4em",
                          color: T.dim,
                          textTransform: "uppercase",
                          margin: 0,
                        }}
                      >
                        Timeline
                      </p>
                      <div
                        style={{ flex: 1, height: 1, background: T.border }}
                      />
                    </div>
                    <div style={{ position: "relative", paddingLeft: 52 }}>
                      {Array.from({ length: 10 }, (_, i) => {
                        const hour = 9 + i;
                        return (
                          <div
                            key={hour}
                            style={{
                              position: "absolute",
                              left: 0,
                              top: i * 48,
                              height: 48,
                              display: "flex",
                              alignItems: "flex-start",
                              paddingTop: 2,
                            }}
                          >
                            <span
                              style={{
                                ...mono,
                                fontSize: 8,
                                color: T.dim,
                                whiteSpace: "nowrap",
                              }}
                            >{`${hour % 12 || 12}${hour < 12 ? "a" : "p"}`}</span>
                          </div>
                        );
                      })}
                      {Array.from({ length: 10 }, (_, i) => (
                        <div
                          key={i}
                          style={{
                            position: "absolute",
                            left: 44,
                            right: 0,
                            top: i * 48,
                            height: 1,
                            background: T.border,
                          }}
                        />
                      ))}
                      <div
                        style={{ position: "relative", height: 9 * 48 + 24 }}
                      >
                        {schedule.map((appt) => {
                          if (!appt.time) return null;
                          const [h, m] = appt.time.split(":");
                          const top =
                            (parseInt(h) - 9) * 48 + (parseInt(m) / 60) * 48;
                          const sCfg = STATUS_CFG[appt.status || "confirmed"];
                          const height = Math.max(
                            30,
                            ((appt.service_duration || 30) / 60) * 48 - 3,
                          );
                          return (
                            <div
                              key={appt.id}
                              style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                top,
                                height,
                                background: sCfg.bg,
                                borderLeft: `2px solid ${sCfg.color}`,
                                padding: "4px 10px",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                overflow: "hidden",
                              }}
                            >
                              <span
                                style={{
                                  ...mono,
                                  fontSize: 8,
                                  color: sCfg.color,
                                  flexShrink: 0,
                                }}
                              >
                                {fmtTime(appt.time)}
                              </span>
                              <span
                                style={{
                                  ...sf,
                                  fontSize: 7,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                  color: "white",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {appt.client} — {appt.service}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── MY HOURS TAB ── */}
        {activeTab === "availability" && (
          <div className="bd-enter">
            <p
              style={{
                ...mono,
                color: T.muted,
                fontSize: 12,
                marginBottom: 24,
                lineHeight: 1.7,
              }}
            >
              Set your working hours per day. Clients can only book during these
              windows.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {DAYS.map((dayName, dayIdx) => {
                const saved = availability.find(
                  (a) => a.day_of_week === dayIdx,
                );
                const isEditing = editingDay === dayIdx;
                const isWorking = saved?.is_working ?? dayIdx < 6;
                const isSun = dayIdx === 6;
                return (
                  <div
                    key={dayIdx}
                    style={{
                      background: T.surface,
                      border: `1px solid ${isEditing ? T.amberBorder : T.border}`,
                      transition: "all 0.2s",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 16px",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                        }}
                      >
                        <p
                          style={{
                            ...sf,
                            fontSize: 8,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            minWidth: 96,
                            margin: 0,
                          }}
                        >
                          {dayName}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: isSun
                                ? T.dim
                                : isWorking && saved
                                  ? "#4ade80"
                                  : T.dim,
                            }}
                          />
                          <span
                            style={{
                              ...mono,
                              fontSize: 11,
                              color: isSun
                                ? T.dim
                                : saved
                                  ? isWorking
                                    ? "#a1a1aa"
                                    : T.muted
                                  : T.dim,
                            }}
                          >
                            {isSun
                              ? "Closed"
                              : saved
                                ? isWorking
                                  ? `${fmtTime(saved.start_time)} — ${fmtTime(saved.end_time)}`
                                  : "Day Off"
                                : "Not set"}
                          </span>
                        </div>
                      </div>
                      {!isSun && (
                        <button
                          onClick={() => {
                            if (isEditing) {
                              setEditingDay(null);
                              return;
                            }
                            setEditingDay(dayIdx);
                            setEditWorking(
                              saved ? saved.is_working : dayIdx < 6,
                            );
                            setEditStart(
                              saved?.start_time?.slice(0, 5) || "09:00",
                            );
                            setEditEnd(saved?.end_time?.slice(0, 5) || "18:00");
                          }}
                          style={{
                            ...sf,
                            fontSize: 6,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            padding: "6px 12px",
                            background: isEditing ? T.amberDim : "transparent",
                            border: `1px solid ${isEditing ? T.amber : T.border}`,
                            color: isEditing ? T.amber : T.muted,
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          {isEditing ? "✕ Cancel" : "Edit"}
                        </button>
                      )}
                    </div>

                    {isEditing && (
                      <div
                        style={{
                          padding: "16px",
                          borderTop: `1px solid ${T.border}`,
                          background: "rgba(245,158,11,0.02)",
                        }}
                      >
                        <div
                          style={{ display: "flex", gap: 6, marginBottom: 14 }}
                        >
                          {[
                            { val: true, label: "Working" },
                            { val: false, label: "Day Off" },
                          ].map(({ val, label }) => (
                            <button
                              key={label}
                              onClick={() => setEditWorking(val)}
                              style={{
                                flex: 1,
                                padding: "9px",
                                ...sf,
                                fontSize: 7,
                                textTransform: "uppercase",
                                letterSpacing: "0.15em",
                                background:
                                  editWorking === val ? T.amber : "transparent",
                                color: editWorking === val ? "black" : T.muted,
                                border: `1px solid ${editWorking === val ? T.amber : T.border}`,
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        {editWorking && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 10,
                              marginBottom: 14,
                            }}
                          >
                            {[
                              {
                                label: "Start",
                                val: editStart,
                                set: setEditStart,
                              },
                              { label: "End", val: editEnd, set: setEditEnd },
                            ].map(({ label, val, set }) => (
                              <div key={label}>
                                <label
                                  style={{
                                    ...sf,
                                    fontSize: 6,
                                    letterSpacing: "0.3em",
                                    color: T.muted,
                                    textTransform: "uppercase",
                                    display: "block",
                                    marginBottom: 6,
                                  }}
                                >
                                  {label}
                                </label>
                                <input
                                  type="time"
                                  value={val}
                                  onChange={(e) => set(e.target.value)}
                                  style={{
                                    width: "100%",
                                    background: T.bg,
                                    border: `1px solid ${T.border}`,
                                    padding: "10px 12px",
                                    color: "white",
                                    fontSize: 14,
                                    outline: "none",
                                    ...mono,
                                  }}
                                  onFocus={(e) =>
                                    (e.target.style.borderColor = T.amber)
                                  }
                                  onBlur={(e) =>
                                    (e.target.style.borderColor = T.border)
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={saveAvailability}
                          disabled={savingAvail}
                          style={{
                            padding: "11px 24px",
                            background: savingAvail ? T.deepDim : T.amber,
                            color: savingAvail ? T.dim : "black",
                            ...sf,
                            fontSize: 7,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            border: "none",
                            cursor: savingAvail ? "not-allowed" : "pointer",
                            transition: "all 0.25s",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {savingAvail ? (
                            <>
                              <span
                                style={{
                                  width: 10,
                                  height: 10,
                                  border: "2px solid #3f3f46",
                                  borderTopColor: "#71717a",
                                  borderRadius: "50%",
                                  display: "inline-block",
                                  animation: "spin 0.7s linear infinite",
                                }}
                              />
                              Saving...
                            </>
                          ) : (
                            "Save →"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TIME OFF TAB ── */}
        {activeTab === "timeoff" && (
          <div className="bd-enter">
            <p
              style={{
                ...mono,
                color: T.muted,
                fontSize: 12,
                marginBottom: 24,
                lineHeight: 1.7,
              }}
            >
              Block specific dates. Clients won't be able to book you on these
              days.
            </p>

            <div
              style={{
                padding: "20px",
                background: T.surface,
                border: `1px solid ${T.border}`,
                marginBottom: 24,
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 7,
                  letterSpacing: "0.3em",
                  color: T.muted,
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                Block a Date
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label
                    style={{
                      ...sf,
                      fontSize: 6,
                      letterSpacing: "0.3em",
                      color: T.muted,
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    value={newTimeOffDate}
                    min={today}
                    onChange={(e) => setNewTimeOffDate(e.target.value)}
                    style={{
                      width: "100%",
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      padding: "11px 12px",
                      color: "white",
                      fontSize: 14,
                      outline: "none",
                      ...mono,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = T.amber)}
                    onBlur={(e) => (e.target.style.borderColor = T.border)}
                  />
                </div>
                <div>
                  <label
                    style={{
                      ...sf,
                      fontSize: 6,
                      letterSpacing: "0.3em",
                      color: T.muted,
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Reason (optional)
                  </label>
                  <input
                    type="text"
                    value={newTimeOffReason}
                    onChange={(e) => setNewTimeOffReason(e.target.value)}
                    placeholder="Vacation, personal, etc."
                    style={{
                      width: "100%",
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      padding: "11px 12px",
                      color: "white",
                      fontSize: 16,
                      outline: "none",
                      ...mono,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = T.amber)}
                    onBlur={(e) => (e.target.style.borderColor = T.border)}
                  />
                </div>
              </div>
              <button
                onClick={addTimeOff}
                disabled={!newTimeOffDate || addingTimeOff}
                style={{
                  padding: "11px 24px",
                  background:
                    !newTimeOffDate || addingTimeOff ? T.deepDim : T.amber,
                  color: !newTimeOffDate || addingTimeOff ? T.dim : "black",
                  ...sf,
                  fontSize: 7,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  border: "none",
                  cursor:
                    !newTimeOffDate || addingTimeOff
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.25s",
                }}
              >
                {addingTimeOff ? "Adding..." : "Block Date →"}
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 6,
                  letterSpacing: "0.4em",
                  color: T.dim,
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                Upcoming
              </p>
              <div style={{ flex: 1, height: 1, background: T.border }} />
            </div>

            {timeOff.length === 0 ? (
              <div
                style={{
                  padding: "40px 0",
                  textAlign: "center",
                  border: `1px solid ${T.border}`,
                }}
              >
                <p
                  style={{
                    ...sf,
                    fontSize: "1.2rem",
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.04)",
                    textTransform: "uppercase",
                  }}
                >
                  None Scheduled
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {timeOff.map((off) => (
                  <div
                    key={off.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 16px",
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          ...sf,
                          fontSize: 8,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          marginBottom: 2,
                        }}
                      >
                        {new Date(off.date + "T00:00:00").toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                      {off.reason && (
                        <p style={{ ...mono, fontSize: 11, color: T.muted }}>
                          {off.reason}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeTimeOff(off.id)}
                      style={{
                        ...sf,
                        fontSize: 6,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        padding: "6px 12px",
                        background: "transparent",
                        border: "1px solid rgba(248,113,113,0.25)",
                        color: "#f87171",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(248,113,113,0.08)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── WALK-IN TAB ── */}
        {activeTab === "walkin" && (
          <div className="bd-enter">
            <p
              style={{
                ...mono,
                color: T.muted,
                fontSize: 12,
                marginBottom: 24,
                lineHeight: 1.7,
              }}
            >
              Book a client on the spot — no account needed. Walk-ins appear on
              your schedule instantly.
            </p>

            {/* Reminder button */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 20,
              }}
            >
              <button
                onClick={handleSendReminders}
                disabled={sendingReminders}
                style={{
                  ...sf,
                  fontSize: 7,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  padding: "9px 18px",
                  background: sendingReminders ? T.deepDim : T.amberDim,
                  color: sendingReminders ? T.dim : T.amber,
                  border: `1px solid ${T.amberBorder}`,
                  cursor: sendingReminders ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  if (!sendingReminders) {
                    e.currentTarget.style.background = T.amber;
                    e.currentTarget.style.color = "black";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!sendingReminders) {
                    e.currentTarget.style.background = T.amberDim;
                    e.currentTarget.style.color = T.amber;
                  }
                }}
              >
                {sendingReminders
                  ? "Sending..."
                  : "📧 Send Tomorrow's Reminders"}
              </button>
            </div>

            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                padding: "22px 20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <Scissors size={14} />
                <p
                  style={{
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.3em",
                    color: T.muted,
                    textTransform: "uppercase",
                    margin: 0,
                  }}
                >
                  New Walk-In
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                {/* Client name */}
                <div>
                  <label
                    style={{
                      ...sf,
                      fontSize: 6,
                      letterSpacing: "0.3em",
                      color: T.muted,
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Client Name *
                  </label>
                  <input
                    value={wiClientName}
                    onChange={(e) => setWiClientName(e.target.value)}
                    placeholder="First Last"
                    style={{
                      width: "100%",
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      padding: "11px 12px",
                      color: "white",
                      fontSize: 15,
                      outline: "none",
                      ...mono,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = T.amber)}
                    onBlur={(e) => (e.target.style.borderColor = T.border)}
                  />
                </div>

                {/* Service */}
                <div>
                  <label
                    style={{
                      ...sf,
                      fontSize: 6,
                      letterSpacing: "0.3em",
                      color: T.muted,
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Service *
                  </label>
                  <select
                    value={wiService}
                    onChange={(e) => setWiService(e.target.value)}
                    style={{
                      width: "100%",
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      padding: "11px 12px",
                      color: wiService ? "white" : T.muted,
                      fontSize: 15,
                      outline: "none",
                      ...mono,
                      cursor: "pointer",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = T.amber)}
                    onBlur={(e) => (e.target.style.borderColor = T.border)}
                  >
                    <option value="">Select service...</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — ${s.price}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label
                    style={{
                      ...sf,
                      fontSize: 6,
                      letterSpacing: "0.3em",
                      color: T.muted,
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Date *
                  </label>
                  <input
                    type="date"
                    value={wiDate}
                    onChange={(e) => setWiDate(e.target.value)}
                    style={{
                      width: "100%",
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      padding: "11px 12px",
                      color: "white",
                      fontSize: 14,
                      outline: "none",
                      ...mono,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = T.amber)}
                    onBlur={(e) => (e.target.style.borderColor = T.border)}
                  />
                </div>

                {/* Time */}
                <div>
                  <label
                    style={{
                      ...sf,
                      fontSize: 6,
                      letterSpacing: "0.3em",
                      color: T.muted,
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Time *
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4,1fr)",
                      gap: 4,
                    }}
                  >
                    {HOURS.map((h) => {
                      const [hr, mn] = h.split(":");
                      const hour = parseInt(hr);
                      const label = `${hour % 12 || 12}:${mn}${hour >= 12 ? "p" : "a"}`;
                      const full = `${hour % 12 || 12}:${mn} ${hour >= 12 ? "PM" : "AM"}`;
                      return (
                        <button
                          key={h}
                          onClick={() => setWiTime(full)}
                          style={{
                            padding: "6px 2px",
                            ...sf,
                            fontSize: 6,
                            letterSpacing: "0.03em",
                            textTransform: "uppercase",
                            border: `1px solid ${wiTime === full ? T.amber : T.border}`,
                            background:
                              wiTime === full ? T.amberDim : "transparent",
                            color: wiTime === full ? T.amber : T.muted,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Payment + Notes */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr",
                  gap: 14,
                  marginBottom: 18,
                }}
              >
                <div>
                  <label
                    style={{
                      ...sf,
                      fontSize: 6,
                      letterSpacing: "0.3em",
                      color: T.muted,
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Payment
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { val: "shop", label: "In Shop" },
                      { val: "online", label: "Online" },
                    ].map(({ val, label }) => (
                      <button
                        key={val}
                        onClick={() => setWiPayment(val)}
                        style={{
                          flex: 1,
                          padding: "9px",
                          ...sf,
                          fontSize: 6,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          background:
                            wiPayment === val ? T.amber : "transparent",
                          color: wiPayment === val ? "black" : T.muted,
                          border: `1px solid ${wiPayment === val ? T.amber : T.border}`,
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      ...sf,
                      fontSize: 6,
                      letterSpacing: "0.3em",
                      color: T.muted,
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Notes (optional)
                  </label>
                  <input
                    value={wiNotes}
                    onChange={(e) => setWiNotes(e.target.value)}
                    placeholder="Any notes..."
                    style={{
                      width: "100%",
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      padding: "11px 12px",
                      color: "white",
                      fontSize: 15,
                      outline: "none",
                      ...mono,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = T.amber)}
                    onBlur={(e) => (e.target.style.borderColor = T.border)}
                  />
                </div>
              </div>

              <button
                onClick={handleWalkIn}
                disabled={wiSubmitting}
                style={{
                  padding: "13px 28px",
                  background: wiSubmitting ? T.deepDim : T.amber,
                  color: wiSubmitting ? T.dim : "black",
                  ...sf,
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  border: "none",
                  cursor: wiSubmitting ? "not-allowed" : "pointer",
                  transition: "all 0.25s",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  if (!wiSubmitting) e.currentTarget.style.background = "white";
                }}
                onMouseLeave={(e) => {
                  if (!wiSubmitting) e.currentTarget.style.background = T.amber;
                }}
              >
                {wiSubmitting ? "Booking..." : "Book Walk-In →"}
              </button>
            </div>
          </div>
        )}

        {/* ── WAITLIST TAB ── */}
        {activeTab === "waitlist" && (
          <div className="bd-enter">
            <p
              style={{
                ...mono,
                color: T.muted,
                fontSize: 12,
                marginBottom: 24,
                lineHeight: 1.7,
              }}
            >
              Track clients who want a slot that's fully booked. Notify them
              when something opens up.
            </p>

            {/* Add to waitlist */}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                padding: "22px 20px",
                marginBottom: 28,
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 7,
                  letterSpacing: "0.3em",
                  color: T.muted,
                  textTransform: "uppercase",
                  marginBottom: 18,
                }}
              >
                Add to Waitlist
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                {[
                  {
                    label: "Client Name *",
                    val: wlName,
                    set: setWlName,
                    ph: "First Last",
                  },
                  {
                    label: "Phone",
                    val: wlPhone,
                    set: setWlPhone,
                    ph: "601-555-0100",
                  },
                  {
                    label: "Email",
                    val: wlEmail,
                    set: setWlEmail,
                    ph: "client@email.com",
                  },
                ].map(({ label, val, set, ph }) => (
                  <div key={label}>
                    <label
                      style={{
                        ...sf,
                        fontSize: 6,
                        letterSpacing: "0.3em",
                        color: T.muted,
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      {label}
                    </label>
                    <input
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder={ph}
                      style={{
                        width: "100%",
                        background: T.bg,
                        border: `1px solid ${T.border}`,
                        padding: "11px 12px",
                        color: "white",
                        fontSize: 15,
                        outline: "none",
                        ...mono,
                      }}
                      onFocus={(e) => (e.target.style.borderColor = T.amber)}
                      onBlur={(e) => (e.target.style.borderColor = T.border)}
                    />
                  </div>
                ))}

                <div>
                  <label
                    style={{
                      ...sf,
                      fontSize: 6,
                      letterSpacing: "0.3em",
                      color: T.muted,
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    value={wlDate}
                    onChange={(e) => setWlDate(e.target.value)}
                    style={{
                      width: "100%",
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      padding: "11px 12px",
                      color: "white",
                      fontSize: 14,
                      outline: "none",
                      ...mono,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = T.amber)}
                    onBlur={(e) => (e.target.style.borderColor = T.border)}
                  />
                </div>

                <div>
                  <label
                    style={{
                      ...sf,
                      fontSize: 6,
                      letterSpacing: "0.3em",
                      color: T.muted,
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Service
                  </label>
                  <select
                    value={wlService}
                    onChange={(e) => setWlService(e.target.value)}
                    style={{
                      width: "100%",
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      padding: "11px 12px",
                      color: wlService ? "white" : T.muted,
                      fontSize: 15,
                      outline: "none",
                      ...mono,
                      cursor: "pointer",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = T.amber)}
                    onBlur={(e) => (e.target.style.borderColor = T.border)}
                  >
                    <option value="">Any service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    ...sf,
                    fontSize: 6,
                    letterSpacing: "0.3em",
                    color: T.muted,
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Notes
                </label>
                <input
                  value={wlNotes}
                  onChange={(e) => setWlNotes(e.target.value)}
                  placeholder="Any preferences or notes..."
                  style={{
                    width: "100%",
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    padding: "11px 12px",
                    color: "white",
                    fontSize: 15,
                    outline: "none",
                    ...mono,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = T.amber)}
                  onBlur={(e) => (e.target.style.borderColor = T.border)}
                />
              </div>

              <button
                onClick={handleAddWaitlist}
                disabled={wlSubmitting}
                style={{
                  padding: "13px 28px",
                  background: wlSubmitting ? T.deepDim : T.amber,
                  color: wlSubmitting ? T.dim : "black",
                  ...sf,
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  border: "none",
                  cursor: wlSubmitting ? "not-allowed" : "pointer",
                  transition: "all 0.25s",
                }}
                onMouseEnter={(e) => {
                  if (!wlSubmitting) e.currentTarget.style.background = "white";
                }}
                onMouseLeave={(e) => {
                  if (!wlSubmitting) e.currentTarget.style.background = T.amber;
                }}
              >
                {wlSubmitting ? "Adding..." : "Add to Waitlist →"}
              </button>
            </div>

            {/* Waitlist entries */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 6,
                  letterSpacing: "0.4em",
                  color: T.dim,
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                Waitlist ({waitlist.length})
              </p>
              <div style={{ flex: 1, height: 1, background: T.border }} />
            </div>

            {waitlist.length === 0 ? (
              <div
                style={{
                  padding: "40px 0",
                  textAlign: "center",
                  border: `1px solid ${T.border}`,
                }}
              >
                <p
                  style={{
                    ...sf,
                    fontSize: "1.2rem",
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.04)",
                    textTransform: "uppercase",
                  }}
                >
                  Empty
                </p>
                <p
                  style={{ ...mono, color: T.dim, fontSize: 11, marginTop: 8 }}
                >
                  No one on the waitlist.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {waitlist.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      background: T.surface,
                      border: `1px solid ${w.notified ? T.dim : T.border}`,
                      padding: "14px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                      flexWrap: "wrap",
                      opacity: w.notified ? 0.5 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <p
                          style={{
                            ...sf,
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            color: "white",
                            margin: 0,
                          }}
                        >
                          {w.client_name}
                        </p>
                        {w.notified && (
                          <span
                            style={{
                              ...sf,
                              fontSize: 6,
                              color: "#4ade80",
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              padding: "2px 6px",
                              background: "rgba(74,222,128,0.08)",
                              border: "1px solid rgba(74,222,128,0.2)",
                            }}
                          >
                            Notified
                          </span>
                        )}
                      </div>
                      <div
                        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                      >
                        {w.service && (
                          <span
                            style={{ ...mono, fontSize: 10, color: "#a1a1aa" }}
                          >
                            {w.service}
                          </span>
                        )}
                        <span style={{ ...mono, fontSize: 10, color: T.amber }}>
                          {new Date(w.date + "T00:00:00").toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </span>
                        {w.client_phone && (
                          <span
                            style={{ ...mono, fontSize: 10, color: T.muted }}
                          >
                            {w.client_phone}
                          </span>
                        )}
                        {w.client_email && (
                          <span
                            style={{ ...mono, fontSize: 10, color: T.muted }}
                          >
                            {w.client_email}
                          </span>
                        )}
                      </div>
                      {w.notes && (
                        <p
                          style={{
                            ...mono,
                            fontSize: 10,
                            color: T.dim,
                            marginTop: 4,
                          }}
                        >
                          {w.notes}
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {!w.notified && (
                        <button
                          onClick={() => markWaitlistNotified(w.id)}
                          style={{
                            ...sf,
                            fontSize: 6,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            padding: "6px 10px",
                            background: "rgba(74,222,128,0.08)",
                            border: "1px solid rgba(74,222,128,0.25)",
                            color: "#4ade80",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(74,222,128,0.15)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(74,222,128,0.08)")
                          }
                        >
                          ✓ Notified
                        </button>
                      )}
                      <button
                        onClick={() => removeWaitlist(w.id)}
                        style={{
                          ...sf,
                          fontSize: 6,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          padding: "6px 10px",
                          background: "transparent",
                          border: "1px solid rgba(248,113,113,0.2)",
                          color: "#f87171",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(248,113,113,0.08)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── NOTES MODAL ── */}
      {notesAppt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(4,4,4,0.95)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              background: "#060606",
              border: `1px solid ${T.border}`,
              padding: "24px 22px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <Scissors size={16} />
              <div>
                <p
                  style={{
                    ...sf,
                    fontSize: 6,
                    letterSpacing: "0.4em",
                    color: T.muted,
                    textTransform: "uppercase",
                    margin: 0,
                  }}
                >
                  Barber Notes
                </p>
                <h2
                  style={{
                    ...sf,
                    fontSize: 14,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    color: "white",
                    margin: 0,
                  }}
                >
                  {notesAppt.client}
                  <span style={{ color: T.amber }}>_</span>
                </h2>
              </div>
            </div>
            <p
              style={{
                ...mono,
                fontSize: 11,
                color: T.muted,
                marginBottom: 12,
              }}
            >
              {notesAppt.service} · {fmtTime(notesAppt.time)} — private notes,
              not visible to the client
            </p>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Hair texture, preferred length, color notes, allergies..."
              rows={5}
              style={{
                width: "100%",
                background: T.bg,
                border: `1px solid ${T.border}`,
                padding: "12px 14px",
                color: "white",
                fontSize: 14,
                outline: "none",
                ...mono,
                resize: "vertical",
                lineHeight: 1.6,
              }}
              onFocus={(e) => (e.target.style.borderColor = T.amber)}
              onBlur={(e) => (e.target.style.borderColor = T.border)}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                onClick={() => setNotesAppt(null)}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "transparent",
                  border: `1px solid ${T.border}`,
                  color: T.muted,
                  ...sf,
                  fontSize: 7,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = T.border;
                  e.currentTarget.style.color = T.muted;
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                style={{
                  flex: 2,
                  padding: "12px",
                  background: savingNotes ? T.deepDim : T.amber,
                  color: savingNotes ? T.dim : "black",
                  ...sf,
                  fontSize: 7,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  border: "none",
                  cursor: savingNotes ? "not-allowed" : "pointer",
                  transition: "all 0.25s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {savingNotes ? (
                  <>
                    <span
                      style={{
                        width: 11,
                        height: 11,
                        border: "2px solid #3f3f46",
                        borderTopColor: "#71717a",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Saving...
                  </>
                ) : (
                  "Save Notes →"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule modal */}
      {rescheduleAppt && (
        <RescheduleModal
          appt={rescheduleAppt}
          onClose={() => setRescheduleAppt(null)}
          onDone={handleRescheduleDone}
        />
      )}

      {/* Cancel modal */}
      {cancelTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(4,4,4,0.95)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              background: "#060606",
              border: "1px solid rgba(248,113,113,0.2)",
              padding: "24px 22px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f87171"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <p
                  style={{
                    ...sf,
                    fontSize: 6,
                    color: T.muted,
                    letterSpacing: "0.4em",
                    textTransform: "uppercase",
                    margin: 0,
                  }}
                >
                  Cancel Appointment
                </p>
                <h2
                  style={{
                    ...sf,
                    fontSize: 14,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    color: "white",
                    margin: 0,
                  }}
                >
                  Confirm<span style={{ color: "#f87171" }}>?</span>
                </h2>
              </div>
            </div>
            <div
              style={{
                padding: "11px 14px",
                background: "rgba(248,113,113,0.04)",
                border: "1px solid rgba(248,113,113,0.1)",
                marginBottom: 16,
              }}
            >
              <p
                style={{
                  ...mono,
                  fontSize: 12,
                  color: "#a1a1aa",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                <span style={{ color: "white" }}>{cancelTarget.client}</span>
                <br />
                {cancelTarget.service} ·{" "}
                <span style={{ color: "#f87171" }}>
                  {fmtTime(cancelTarget.time)}
                </span>
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setCancelTarget(null)}
                style={{
                  flex: 1,
                  padding: "11px",
                  background: "transparent",
                  border: `1px solid ${T.border}`,
                  color: T.muted,
                  ...sf,
                  fontSize: 7,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = T.border;
                  e.currentTarget.style.color = T.muted;
                }}
              >
                Keep It
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  flex: 2,
                  padding: "11px",
                  background: cancelling ? T.deepDim : "#f87171",
                  color: cancelling ? T.dim : "black",
                  ...sf,
                  fontSize: 7,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  border: "none",
                  cursor: cancelling ? "not-allowed" : "pointer",
                  transition: "all 0.25s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {cancelling ? (
                  <>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        border: "2px solid #3f3f46",
                        borderTopColor: "#71717a",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Cancelling...
                  </>
                ) : (
                  "Yes, Cancel It"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
