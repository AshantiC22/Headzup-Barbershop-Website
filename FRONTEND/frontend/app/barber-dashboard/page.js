"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import API from "@/lib/api";
import useBreakpoint from "@/lib/useBreakpoint";

// ── Helpers ───────────────────────────────────────────────────────────────────
const sf = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

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
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
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
    border: "rgba(74,222,128,0.25)",
  },
  completed: {
    label: "Completed",
    color: "#a1a1aa",
    bg: "rgba(161,161,170,0.08)",
    border: "rgba(161,161,170,0.2)",
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
    bg: "rgba(82,82,91,0.08)",
    border: "rgba(82,82,91,0.2)",
  },
};
const PAY_CFG = {
  online: {
    label: "Paid",
    color: "#fbbf24",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
  },
  shop: {
    label: "Pay In Shop",
    color: "#a1a1aa",
    bg: "rgba(161,161,170,0.06)",
    border: "rgba(161,161,170,0.15)",
  },
};

function Badge({ cfg }) {
  return (
    <span
      style={{
        ...sf,
        fontSize: 6,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "3px 8px",
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {cfg.label}
    </span>
  );
}

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
        padding: "12px 22px",
        background: isErr ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)",
        border: `1px solid ${isErr ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}`,
        backdropFilter: "blur(12px)",
        animation: "fadeUp 0.25s ease",
        whiteSpace: "nowrap",
      }}
    >
      <p
        style={{
          ...sf,
          fontSize: 8,
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
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <button
          onClick={onPrevMonth}
          style={{
            width: 28,
            height: 28,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#71717a",
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#f59e0b";
            e.currentTarget.style.color = "#f59e0b";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = "#71717a";
          }}
        >
          ‹
        </button>
        <h3
          style={{
            ...sf,
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
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
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#71717a",
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#f59e0b";
            e.currentTarget.style.color = "#f59e0b";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = "#71717a";
          }}
        >
          ›
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          marginBottom: 4,
        }}
      >
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            style={{
              ...sf,
              fontSize: 6,
              textAlign: "center",
              color: "#27272a",
              letterSpacing: "0.1em",
              padding: "2px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>
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
          const hasAppts = (appointmentDates[ds] || 0) > 0;
          const isSun = new Date(ds + "T00:00:00").getDay() === 0;
          return (
            <button
              key={ds}
              onClick={() => onSelectDate(ds)}
              style={{
                aspectRatio: "1",
                background: isSelected
                  ? "#f59e0b"
                  : isToday
                    ? "rgba(245,158,11,0.1)"
                    : "transparent",
                border: `1px solid ${isSelected ? "#f59e0b" : isToday ? "rgba(245,158,11,0.4)" : "transparent"}`,
                color: isSelected
                  ? "black"
                  : isSun
                    ? "#27272a"
                    : isToday
                      ? "#f59e0b"
                      : "white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                transition: "all 0.15s",
                padding: 1,
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = "rgba(245,158,11,0.08)";
                  e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = isToday
                    ? "rgba(245,158,11,0.1)"
                    : "transparent";
                  e.currentTarget.style.borderColor = isToday
                    ? "rgba(245,158,11,0.4)"
                    : "transparent";
                }
              }}
            >
              <span
                style={{
                  ...sf,
                  fontSize: 10,
                  fontWeight: isToday || isSelected ? 900 : 400,
                  lineHeight: 1,
                }}
              >
                {day}
              </span>
              {hasAppts && (
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: isSelected ? "rgba(0,0,0,0.4)" : "#f59e0b",
                    display: "block",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#f59e0b",
            }}
          />
          <span style={{ fontSize: 9, color: "#3f3f46", ...mono }}>
            Has bookings
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Appointment Card ──────────────────────────────────────────────────────────
function ApptCard({ appt, onStatusChange, onReschedule, onCancel, isMobile }) {
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
        gap: isMobile ? 8 : 12,
        padding: isMobile ? "12px 10px" : "14px 16px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        transition: "all 0.2s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(245,158,11,0.2)";
        e.currentTarget.style.background = "rgba(245,158,11,0.02)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
        e.currentTarget.style.background = "rgba(255,255,255,0.025)";
      }}
    >
      {/* Status bar */}
      <div
        style={{
          width: 3,
          background: sCfg.color,
          flexShrink: 0,
          borderRadius: 2,
          opacity: 0.8,
        }}
      />

      {/* Time */}
      <div
        style={{
          width: 52,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <p
          style={{
            ...mono,
            fontSize: 12,
            color: "#f59e0b",
            fontWeight: 500,
            margin: 0,
          }}
        >
          {fmtTime(appt.time)}
        </p>
        {appt.service_duration && (
          <p
            style={{
              ...mono,
              fontSize: 9,
              color: "#3f3f46",
              margin: "2px 0 0",
            }}
          >
            {appt.service_duration}m
          </p>
        )}
      </div>

      <div
        style={{
          width: 1,
          background: "rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 3,
            flexWrap: "wrap",
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
            {appt.client}
          </p>
          <Badge cfg={pCfg} />
        </div>
        <p style={{ fontSize: 11, color: "#a1a1aa", margin: 0 }}>
          {appt.service}
          {appt.service_price ? ` — $${appt.service_price}` : ""}
        </p>
        {!isMobile && appt.client_email && (
          <p style={{ fontSize: 10, color: "#27272a", marginTop: 2 }}>
            {appt.client_email}
          </p>
        )}
      </div>

      {/* Actions */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
      >
        {/* Status dropdown */}
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
            }}
          >
            {sCfg.label} <span style={{ fontSize: 7, opacity: 0.6 }}>▾</span>
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                zIndex: 200,
                background: "#0d0d0d",
                border: "1px solid rgba(255,255,255,0.1)",
                minWidth: 130,
                boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
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
                    gap: 8,
                    padding: "9px 12px",
                    background:
                      status === key ? "rgba(245,158,11,0.06)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (status !== key)
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.04)";
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
                      color: status === key ? "#f59e0b" : "#a1a1aa",
                    }}
                  >
                    {cfg.label}
                  </span>
                  {status === key && (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 9,
                        color: "#f59e0b",
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

        {/* Reschedule */}
        <button
          onClick={() => onReschedule(appt)}
          title="Reschedule"
          style={{
            width: 28,
            height: 28,
            background: "transparent",
            border: "1px solid rgba(245,158,11,0.25)",
            color: "#f59e0b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(245,158,11,0.1)")
          }
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
            width: 28,
            height: 28,
            background: "transparent",
            border: "1px solid rgba(248,113,113,0.2)",
            color: "#3f3f46",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#f87171";
            e.currentTarget.style.color = "#f87171";
            e.currentTarget.style.background = "rgba(248,113,113,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(248,113,113,0.2)";
            e.currentTarget.style.color = "#3f3f46";
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
      setErr("Pick both a date and time.");
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
      setErr(e.response?.data?.error || "That slot may already be booked.");
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
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(8px)",
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
          background: "#0a0a0a",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "28px 24px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {done ? (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#22c55e,#16a34a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <svg
                width="22"
                height="22"
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
                fontSize: 9,
                color: "#4ade80",
                textTransform: "uppercase",
                letterSpacing: "0.3em",
              }}
            >
              Rescheduled!
            </p>
          </div>
        ) : (
          <>
            <p
              style={{
                ...sf,
                fontSize: 7,
                letterSpacing: "0.4em",
                color: "#52525b",
                textTransform: "uppercase",
                marginBottom: 6,
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
                marginBottom: 20,
              }}
            >
              {appt.client}
              <span style={{ color: "#f59e0b" }}>_</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label
                  style={{
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.3em",
                    color: "#71717a",
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
                    border: "1px solid rgba(255,255,255,0.1)",
                    padding: "12px 14px",
                    color: "white",
                    fontSize: 14,
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                  }
                />
              </div>
              <div>
                <label
                  style={{
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.3em",
                    color: "#71717a",
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
                    gap: 6,
                  }}
                >
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => setNewTime(s)}
                      style={{
                        padding: "8px 2px",
                        ...sf,
                        fontSize: 7,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        border: `1px solid ${newTime === s ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                        background:
                          newTime === s
                            ? "rgba(245,158,11,0.1)"
                            : "transparent",
                        color: newTime === s ? "#f59e0b" : "#71717a",
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
                <p style={{ fontSize: 11, color: "#f87171", ...mono }}>
                  ⚠ {err}
                </p>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#71717a",
                    ...sf,
                    fontSize: 8,
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
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.color = "#71717a";
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
                      !newDate || !newTime || saving ? "#1c1c1e" : "#f59e0b",
                    color: !newDate || !newTime || saving ? "#3f3f46" : "black",
                    ...sf,
                    fontSize: 8,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
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

  // Calendar state
  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [apptDots, setApptDots] = useState({});

  // Schedule
  const [schedule, setSchedule] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    paid_online: 0,
    pay_in_shop: 0,
    online_revenue: "0.00",
  });
  const [loadingSched, setLoadingSched] = useState(false);

  // Modals
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Availability
  const [availability, setAvailability] = useState([]);
  const [editingDay, setEditingDay] = useState(null);
  const [editStart, setEditStart] = useState("09:00");
  const [editEnd, setEditEnd] = useState("18:00");
  const [editWorking, setEditWorking] = useState(true);
  const [savingAvail, setSavingAvail] = useState(false);

  // Time off
  const [timeOff, setTimeOff] = useState([]);
  const [newTimeOffDate, setNewTimeOffDate] = useState("");
  const [newTimeOffReason, setNewTimeOffReason] = useState("");
  const [addingTimeOff, setAddingTimeOff] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Auth ──
  useEffect(() => {
    const init = async () => {
      try {
        const res = await API.get("barber/me/");
        setBarber(res.data);
      } catch (e) {
        if (e.response?.status === 403 || e.response?.status === 401)
          router.push("/barber-login");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ── Load schedule for selected date ──
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

  // ── Load month dots ──
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

  // ── Load availability ──
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

  // ── Load time off ──
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

  // ── Entry animation ──
  useEffect(() => {
    if (!loading && barber)
      gsap.from(".bd-enter", {
        y: 24,
        opacity: 0,
        duration: 0.9,
        stagger: 0.07,
        ease: "expo.out",
      });
  }, [loading, barber]);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    router.push("/barber-login");
  };

  // ── Status change ──
  const handleStatusChange = async (apptId, newStatus) => {
    try {
      await API.patch(`barber/appointments/${apptId}/`, { status: newStatus });
      setSchedule((prev) =>
        prev.map((a) => (a.id === apptId ? { ...a, status: newStatus } : a)),
      );
      showToast(`Marked as ${STATUS_CFG[newStatus].label}`);
    } catch {
      showToast("Could not update status.", "error");
      throw new Error("failed");
    }
  };

  // ── Cancel ──
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

  // ── Reschedule done ──
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

  // ── Save availability ──
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

  // ── Add time off ──
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

  // ── Calendar nav ──
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
          background: "#050505",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <style jsx global>{`
          @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&display=swap");
          body {
            background: #050505;
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
        <div
          style={{
            width: 28,
            height: 28,
            border: "2px solid rgba(245,158,11,0.3)",
            borderTopColor: "#f59e0b",
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
        body {
          background: #050505;
          color: white;
          font-family: "DM Mono", monospace;
          overflow-y: auto !important;
        }
        ::-webkit-scrollbar {
          width: 0;
          height: 0;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pageIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .bd-page {
          opacity: 0;
          animation: pageIn 0.4s ease forwards;
        }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1) opacity(0.4);
          cursor: pointer;
        }
      `}</style>

      {/* Background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.025,
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.svg')",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "20%",
          left: "60%",
          transform: "translate(-50%,-50%)",
          width: 600,
          height: 600,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 65%)",
        }}
      />

      <Toast toast={toast} />

      {/* Nav */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: isMobile ? "13px 16px" : "15px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(5,5,5,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              ...sf,
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "-0.05em",
            }}
          >
            HEADZ
            <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
          </div>
          {!isMobile && (
            <>
              <div
                style={{
                  width: 1,
                  height: 14,
                  background: "rgba(255,255,255,0.08)",
                }}
              />
              <span
                style={{
                  ...sf,
                  fontSize: 7,
                  letterSpacing: "0.3em",
                  color: "#f59e0b",
                  textTransform: "uppercase",
                }}
              >
                {barber.name}
              </span>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setSelectedDate(today)}
            style={{
              ...sf,
              fontSize: 7,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#52525b",
              background: "none",
              border: "1px solid rgba(255,255,255,0.07)",
              padding: "6px 12px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)";
              e.currentTarget.style.color = "#f59e0b";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
              e.currentTarget.style.color = "#52525b";
            }}
          >
            Today
          </button>
          <button
            onClick={handleLogout}
            style={{
              ...sf,
              fontSize: 7,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#52525b",
              background: "none",
              border: "1px solid rgba(255,255,255,0.07)",
              padding: "6px 12px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#f87171";
              e.currentTarget.style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
              e.currentTarget.style.color = "#52525b";
            }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Page */}
      <div
        className="bd-page"
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          padding: isMobile ? "64px 12px 40px" : "68px 20px 48px",
          maxWidth: 1140,
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div className="bd-enter" style={{ marginBottom: 24 }}>
          <p
            style={{
              ...sf,
              fontSize: 7,
              letterSpacing: "0.5em",
              color: "#3f3f46",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Barber Portal
          </p>
          <h1
            style={{
              ...sf,
              fontSize: "clamp(1.5rem,3vw,2.2rem)",
              fontWeight: 900,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            Hey,{" "}
            <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
              {barber.name}_
            </span>
          </h1>
        </div>

        {/* Stats */}
        <div
          className="bd-enter"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Today", value: barber.today_count, accent: true },
            { label: "All Time", value: barber.total_count, accent: false },
            {
              label: "Online Rev",
              value: `$${summary.online_revenue}`,
              accent: false,
            },
            { label: "Pay In Shop", value: summary.pay_in_shop, accent: false },
          ].map(({ label, value, accent }) => (
            <div
              key={label}
              style={{
                padding: "14px 12px",
                background: accent
                  ? "rgba(245,158,11,0.07)"
                  : "rgba(255,255,255,0.025)",
                border: `1px solid ${accent ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.06)"}`,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#f59e0b";
                e.currentTarget.style.background = "rgba(245,158,11,0.07)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = accent
                  ? "rgba(245,158,11,0.25)"
                  : "rgba(255,255,255,0.06)";
                e.currentTarget.style.background = accent
                  ? "rgba(245,158,11,0.07)"
                  : "rgba(255,255,255,0.025)";
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 6,
                  letterSpacing: "0.25em",
                  color: "#3f3f46",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                {label}
              </p>
              <p
                style={{
                  ...sf,
                  fontSize: 22,
                  fontWeight: 900,
                  color: accent ? "#f59e0b" : "white",
                  lineHeight: 1,
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div
          className="bd-enter"
          style={{
            display: "flex",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            marginBottom: 20,
          }}
        >
          {[
            { key: "schedule", label: "Schedule" },
            { key: "availability", label: "My Hours" },
            { key: "timeoff", label: "Time Off" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: "11px 20px",
                ...sf,
                fontSize: 7,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${activeTab === key ? "#f59e0b" : "transparent"}`,
                color: activeTab === key ? "#f59e0b" : "#3f3f46",
                cursor: "pointer",
                marginBottom: -1,
                transition: "all 0.2s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── SCHEDULE TAB ── */}
        {activeTab === "schedule" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "280px 1fr",
              gap: isMobile ? 16 : 24,
              alignItems: "start",
            }}
          >
            {/* LEFT: Calendar */}
            <div
              className="bd-enter"
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
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
              {/* Quick jump — prev/next day */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => handleSelectDate(addDays(selectedDate, -1))}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#52525b",
                    cursor: "pointer",
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
                    e.currentTarget.style.color = "#f59e0b";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.07)";
                    e.currentTarget.style.color = "#52525b";
                  }}
                >
                  ← Prev Day
                </button>
                <button
                  onClick={() => handleSelectDate(addDays(selectedDate, 1))}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#52525b",
                    cursor: "pointer",
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
                    e.currentTarget.style.color = "#f59e0b";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.07)";
                    e.currentTarget.style.color = "#52525b";
                  }}
                >
                  Next Day →
                </button>
              </div>
            </div>

            {/* RIGHT: Day detail */}
            <div className="bd-enter">
              {/* Day header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div>
                  <h2
                    style={{
                      ...sf,
                      fontSize: "clamp(0.8rem,1.8vw,0.95rem)",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      color: selectedDate === today ? "#f59e0b" : "white",
                      margin: 0,
                    }}
                  >
                    {fmtDayFull(selectedDate)}
                    {selectedDate === today && (
                      <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                        {" "}
                        — Today
                      </span>
                    )}
                  </h2>
                  <p
                    style={{
                      ...mono,
                      fontSize: 10,
                      color: "#3f3f46",
                      marginTop: 3,
                    }}
                  >
                    {summary.total}{" "}
                    {summary.total === 1 ? "appointment" : "appointments"}
                  </p>
                </div>
                <button
                  onClick={loadSchedule}
                  style={{
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "#3f3f46",
                    background: "none",
                    border: "1px solid rgba(255,255,255,0.07)",
                    padding: "6px 12px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#f59e0b";
                    e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#3f3f46";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.07)";
                  }}
                >
                  ↻ Refresh
                </button>
              </div>

              {/* Appointments */}
              {loadingSched ? (
                <div
                  style={{
                    padding: "48px 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      border: "2px solid rgba(245,158,11,0.2)",
                      borderTopColor: "#f59e0b",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <p
                    style={{
                      ...sf,
                      fontSize: 7,
                      color: "#27272a",
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
                    padding: "48px 20px",
                    textAlign: "center",
                    border: "1px solid rgba(255,255,255,0.05)",
                    background: "rgba(255,255,255,0.015)",
                  }}
                >
                  <p
                    style={{
                      ...sf,
                      fontSize: "clamp(1.2rem,2.5vw,1.8rem)",
                      fontWeight: 900,
                      color: "rgba(255,255,255,0.04)",
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}
                  >
                    No Bookings
                  </p>
                  <p style={{ color: "#27272a", fontSize: 12 }}>
                    Nothing scheduled for this day.
                  </p>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {schedule
                    .slice()
                    .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
                    .map((appt) => (
                      <ApptCard
                        key={appt.id}
                        appt={appt}
                        onStatusChange={handleStatusChange}
                        onReschedule={setRescheduleAppt}
                        onCancel={setCancelTarget}
                        isMobile={isMobile}
                      />
                    ))}
                </div>
              )}

              {/* Timeline — desktop */}
              {!isMobile && schedule.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <p
                    style={{
                      ...sf,
                      fontSize: 7,
                      letterSpacing: "0.3em",
                      color: "#27272a",
                      textTransform: "uppercase",
                      marginBottom: 14,
                    }}
                  >
                    Timeline
                  </p>
                  <div style={{ position: "relative", paddingLeft: 56 }}>
                    {Array.from({ length: 10 }, (_, i) => {
                      const hour = 9 + i;
                      return (
                        <div
                          key={hour}
                          style={{
                            position: "absolute",
                            left: 0,
                            top: i * 50,
                            height: 50,
                            display: "flex",
                            alignItems: "flex-start",
                            paddingTop: 2,
                          }}
                        >
                          <span
                            style={{
                              ...mono,
                              fontSize: 8,
                              color: "#27272a",
                              whiteSpace: "nowrap",
                            }}
                          >{`${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`}</span>
                        </div>
                      );
                    })}
                    {Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          left: 48,
                          right: 0,
                          top: i * 50,
                          height: 1,
                          background: "rgba(255,255,255,0.04)",
                        }}
                      />
                    ))}
                    <div style={{ position: "relative", height: 9 * 50 + 24 }}>
                      {schedule.map((appt) => {
                        if (!appt.time) return null;
                        const [h, m] = appt.time.split(":");
                        const top =
                          (parseInt(h) - 9) * 50 + (parseInt(m) / 60) * 50;
                        const sCfg = STATUS_CFG[appt.status || "confirmed"];
                        const height = Math.max(
                          32,
                          ((appt.service_duration || 30) / 60) * 50 - 3,
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
                              border: `1px solid ${sCfg.border}`,
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
        )}

        {/* ── AVAILABILITY TAB ── */}
        {activeTab === "availability" && (
          <div className="bd-enter">
            <p
              style={{
                color: "#52525b",
                fontSize: 12,
                marginBottom: 24,
                lineHeight: 1.7,
              }}
            >
              Set which days you work and your hours. Clients can only book
              during these times.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DAYS.map((dayName, dayIdx) => {
                const saved = availability.find(
                  (a) => a.day_of_week === dayIdx,
                );
                const isEditing = editingDay === dayIdx;
                const isWorking = saved?.is_working ?? dayIdx < 6;
                const isSunday = dayIdx === 6;
                return (
                  <div
                    key={dayIdx}
                    style={{
                      padding: "16px 18px",
                      background: "rgba(255,255,255,0.025)",
                      border: `1px solid ${isEditing ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.07)"}`,
                      transition: "all 0.2s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <p
                          style={{
                            ...sf,
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            minWidth: 90,
                          }}
                        >
                          {dayName}
                        </p>
                        {isSunday ? (
                          <span
                            style={{
                              ...sf,
                              fontSize: 7,
                              letterSpacing: "0.15em",
                              textTransform: "uppercase",
                              color: "#3f3f46",
                            }}
                          >
                            Closed
                          </span>
                        ) : saved ? (
                          <span
                            style={{
                              fontSize: 11,
                              color: isWorking ? "#a1a1aa" : "#3f3f46",
                            }}
                          >
                            {isWorking
                              ? `${fmtTime(saved.start_time)} — ${fmtTime(saved.end_time)}`
                              : "Day Off"}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: "#3f3f46" }}>
                            Not set — defaults 9AM–6PM
                          </span>
                        )}
                      </div>
                      {!isSunday && (
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
                            fontSize: 7,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            padding: "6px 12px",
                            background: isEditing
                              ? "rgba(245,158,11,0.1)"
                              : "transparent",
                            border: `1px solid ${isEditing ? "#f59e0b" : "rgba(255,255,255,0.1)"}`,
                            color: isEditing ? "#f59e0b" : "#52525b",
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
                          marginTop: 16,
                          paddingTop: 16,
                          borderTop: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <div
                          style={{ display: "flex", gap: 8, marginBottom: 16 }}
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
                                  editWorking === val
                                    ? "#f59e0b"
                                    : "transparent",
                                color:
                                  editWorking === val ? "black" : "#52525b",
                                border: `1px solid ${editWorking === val ? "#f59e0b" : "rgba(255,255,255,0.1)"}`,
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
                              gap: 12,
                              marginBottom: 16,
                            }}
                          >
                            {[
                              {
                                label: "Start Time",
                                val: editStart,
                                set: setEditStart,
                              },
                              {
                                label: "End Time",
                                val: editEnd,
                                set: setEditEnd,
                              },
                            ].map(({ label, val, set }) => (
                              <div key={label}>
                                <label
                                  style={{
                                    ...sf,
                                    fontSize: 7,
                                    letterSpacing: "0.25em",
                                    color: "#52525b",
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
                                    background: "#050505",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    padding: "10px 12px",
                                    color: "white",
                                    fontSize: 14,
                                    outline: "none",
                                  }}
                                  onFocus={(e) =>
                                    (e.target.style.borderColor = "#f59e0b")
                                  }
                                  onBlur={(e) =>
                                    (e.target.style.borderColor =
                                      "rgba(255,255,255,0.1)")
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
                            padding: "12px 24px",
                            background: savingAvail ? "#1c1c1e" : "#f59e0b",
                            color: savingAvail ? "#3f3f46" : "black",
                            ...sf,
                            fontSize: 8,
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
                            "Save Hours →"
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
                color: "#52525b",
                fontSize: 12,
                marginBottom: 24,
                lineHeight: 1.7,
              }}
            >
              Block specific dates — vacation, sick days, personal time. Clients
              won't be able to book you on these days.
            </p>
            <div
              style={{
                padding: "20px",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                marginBottom: 28,
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 7,
                  letterSpacing: "0.3em",
                  color: "#71717a",
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
                      fontSize: 7,
                      letterSpacing: "0.25em",
                      color: "#52525b",
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
                      background: "#050505",
                      border: "1px solid rgba(255,255,255,0.1)",
                      padding: "11px 12px",
                      color: "white",
                      fontSize: 14,
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      ...sf,
                      fontSize: 7,
                      letterSpacing: "0.25em",
                      color: "#52525b",
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
                    placeholder="Vacation, sick day, etc."
                    style={{
                      width: "100%",
                      background: "#050505",
                      border: "1px solid rgba(255,255,255,0.1)",
                      padding: "11px 12px",
                      color: "white",
                      fontSize: 16,
                      outline: "none",
                      ...mono,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                  />
                </div>
              </div>
              <button
                onClick={addTimeOff}
                disabled={!newTimeOffDate || addingTimeOff}
                style={{
                  padding: "12px 24px",
                  background:
                    !newTimeOffDate || addingTimeOff ? "#1c1c1e" : "#f59e0b",
                  color: !newTimeOffDate || addingTimeOff ? "#3f3f46" : "black",
                  ...sf,
                  fontSize: 8,
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
                {addingTimeOff ? "Adding..." : "Block This Date →"}
              </button>
            </div>

            <p
              style={{
                ...sf,
                fontSize: 7,
                letterSpacing: "0.35em",
                color: "#3f3f46",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Upcoming Time Off
            </p>
            {timeOff.length === 0 ? (
              <div
                style={{
                  padding: "40px 0",
                  textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <p
                  style={{
                    ...sf,
                    fontSize: "1.4rem",
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
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          ...sf,
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          marginBottom: 3,
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
                        <p style={{ fontSize: 11, color: "#52525b" }}>
                          {off.reason}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeTimeOff(off.id)}
                      style={{
                        ...sf,
                        fontSize: 7,
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
      </div>

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
            background: "rgba(0,0,0,0.88)",
            backdropFilter: "blur(8px)",
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
              background: "#080808",
              border: "1px solid rgba(248,113,113,0.2)",
              padding: "26px 22px",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <svg
                width="18"
                height="18"
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
            <p
              style={{
                ...sf,
                fontSize: 7,
                color: "#52525b",
                letterSpacing: "0.4em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Cancel Appointment
            </p>
            <h2
              style={{
                ...sf,
                fontSize: 15,
                fontWeight: 900,
                textTransform: "uppercase",
                color: "white",
                marginBottom: 14,
              }}
            >
              Confirm<span style={{ color: "#f87171" }}>?</span>
            </h2>
            <div
              style={{
                padding: "11px 14px",
                background: "rgba(248,113,113,0.04)",
                border: "1px solid rgba(248,113,113,0.12)",
                marginBottom: 16,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: "#a1a1aa",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                <span style={{ color: "white", fontWeight: 700 }}>
                  {cancelTarget.client}
                </span>
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
                  padding: "12px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#71717a",
                  ...sf,
                  fontSize: 8,
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
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = "#71717a";
                }}
              >
                Keep It
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  flex: 2,
                  padding: "12px",
                  background: cancelling ? "#1c1c1e" : "#f87171",
                  color: cancelling ? "#3f3f46" : "black",
                  ...sf,
                  fontSize: 8,
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
                        width: 11,
                        height: 11,
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
