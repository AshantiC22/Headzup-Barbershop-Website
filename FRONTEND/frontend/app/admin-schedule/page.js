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
function fmtMonthYear(year, month) {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
function fmtDayFull(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const STATUS_CFG = {
  confirmed: {
    label: "Confirmed",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.12)",
    border: "rgba(74,222,128,0.3)",
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
    bg: "rgba(248,113,113,0.1)",
    border: "rgba(248,113,113,0.25)",
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
    label: "Paid Online",
    color: "#fbbf24",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.3)",
  },
  shop: {
    label: "Pay In Shop",
    color: "#71717a",
    bg: "rgba(113,113,122,0.08)",
    border: "rgba(113,113,122,0.2)",
  },
};

function Badge({ cfg, small }) {
  return (
    <span
      style={{
        ...sf,
        fontSize: small ? 6 : 7,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: small ? "3px 7px" : "4px 10px",
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

function Spinner() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        border: "2px solid rgba(245,158,11,0.2)",
        borderTopColor: "#f59e0b",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
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
        maxWidth: "calc(100vw - 32px)",
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
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  // empty cells before first day
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        padding: "20px",
      }}
    >
      {/* Month nav */}
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
            width: 32,
            height: 32,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#71717a",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            fontSize: 14,
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
        <h2
          style={{
            ...sf,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "white",
            margin: 0,
          }}
        >
          {fmtMonthYear(year, month)}
        </h2>
        <button
          onClick={onNextMonth}
          style={{
            width: 32,
            height: 32,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#71717a",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            fontSize: 14,
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
              fontSize: 7,
              textAlign: "center",
              color: "#3f3f46",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "4px 0",
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
          if (!day) return <div key={`empty-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasAppts = appointmentDates[dateStr] > 0;
          const count = appointmentDates[dateStr] || 0;
          const isSunday = new Date(dateStr + "T00:00:00").getDay() === 0;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              style={{
                position: "relative",
                aspectRatio: "1",
                background: isSelected
                  ? "#f59e0b"
                  : isToday
                    ? "rgba(245,158,11,0.1)"
                    : "transparent",
                border: `1px solid ${isSelected ? "#f59e0b" : isToday ? "rgba(245,158,11,0.4)" : hasAppts ? "rgba(255,255,255,0.08)" : "transparent"}`,
                color: isSelected
                  ? "black"
                  : isSunday
                    ? "#3f3f46"
                    : isToday
                      ? "#f59e0b"
                      : "white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                transition: "all 0.15s",
                padding: 2,
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
                    : hasAppts
                      ? "rgba(255,255,255,0.08)"
                      : "transparent";
                }
              }}
            >
              <span
                style={{
                  ...sf,
                  fontSize: 11,
                  fontWeight: isToday || isSelected ? 900 : 400,
                  lineHeight: 1,
                }}
              >
                {day}
              </span>
              {hasAppts && (
                <span
                  style={{
                    width: 6,
                    height: 6,
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

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#f59e0b",
            }}
          />
          <span style={{ fontSize: 10, color: "#52525b", ...mono }}>
            Has bookings
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 12,
              height: 12,
              border: "1px solid rgba(245,158,11,0.4)",
              background: "rgba(245,158,11,0.1)",
            }}
          />
          <span style={{ fontSize: 10, color: "#52525b", ...mono }}>Today</span>
        </div>
      </div>
    </div>
  );
}

// ── Appointment Card ──────────────────────────────────────────────────────────
function ApptCard({ appt, onStatusChange, onDelete, isMobile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState(appt.status || "confirmed");
  const sCfg = STATUS_CFG[status] || STATUS_CFG.confirmed;
  const pCfg = PAY_CFG[appt.payment_method] || PAY_CFG.shop;
  const menuRef = useRef(null);

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
        gap: isMobile ? 10 : 14,
        padding: isMobile ? "14px 12px" : "16px 18px",
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
      {/* Status color bar */}
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
          width: 54,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <p
          style={{
            ...mono,
            fontSize: 13,
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
              margin: "3px 0 0",
            }}
          >
            {appt.service_duration}min
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

      {/* Client + service info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
            flexWrap: "wrap",
          }}
        >
          <p
            style={{
              ...sf,
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "white",
              margin: 0,
            }}
          >
            {appt.client}
          </p>
          <Badge cfg={pCfg} small />
        </div>
        <p style={{ fontSize: 12, color: "#a1a1aa", margin: "0 0 2px" }}>
          {appt.service}
          {appt.service_price ? ` — $${appt.service_price}` : ""}
        </p>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {appt.barber && (
            <span style={{ fontSize: 10, color: "#52525b" }}>
              ✂ {appt.barber}
            </span>
          )}
          {appt.client_email && !isMobile && (
            <span style={{ fontSize: 10, color: "#27272a" }}>
              {appt.client_email}
            </span>
          )}
        </div>
      </div>

      {/* Status + delete */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}
      >
        {/* Status dropdown */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              ...sf,
              fontSize: 7,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "5px 10px",
              background: sCfg.bg,
              color: sCfg.color,
              border: `1px solid ${sCfg.border}`,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {sCfg.label}
            <span
              style={{
                fontSize: 8,
                opacity: 0.6,
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
                background: "#0d0d0d",
                border: "1px solid rgba(255,255,255,0.1)",
                minWidth: 140,
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
                    gap: 10,
                    padding: "10px 14px",
                    background:
                      status === key ? "rgba(245,158,11,0.06)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
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
                      width: 7,
                      height: 7,
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

        {/* Delete */}
        <button
          onClick={() => onDelete(appt)}
          title="Remove"
          style={{
            width: 30,
            height: 30,
            background: "transparent",
            border: "1px solid rgba(248,113,113,0.15)",
            color: "#3f3f46",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#f87171";
            e.currentTarget.style.color = "#f87171";
            e.currentTarget.style.background = "rgba(248,113,113,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(248,113,113,0.15)";
            e.currentTarget.style.color = "#3f3f46";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({ target, onConfirm, onCancel, deleting }) {
  if (!target) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.9)",
        backdropFilter: "blur(10px)",
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
          padding: "28px 24px",
          animation: "fadeUp 0.2s ease",
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
            marginBottom: 16,
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
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
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
          Remove Appointment
        </p>
        <h2
          style={{
            ...sf,
            fontSize: 16,
            fontWeight: 900,
            textTransform: "uppercase",
            color: "white",
            marginBottom: 14,
          }}
        >
          Confirm Delete<span style={{ color: "#f87171" }}>?</span>
        </h2>
        <div
          style={{
            padding: "12px 14px",
            background: "rgba(248,113,113,0.04)",
            border: "1px solid rgba(248,113,113,0.12)",
            marginBottom: 18,
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
              {target.client}
            </span>
            <br />
            {target.service} · {fmtTime(target.time)}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "13px",
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
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex: 2,
              padding: "13px",
              background: deleting ? "#1c1c1e" : "#f87171",
              color: deleting ? "#3f3f46" : "black",
              ...sf,
              fontSize: 8,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              border: "none",
              cursor: deleting ? "not-allowed" : "pointer",
              transition: "all 0.25s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {deleting ? (
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
                Removing...
              </>
            ) : (
              "Yes, Remove It"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminSchedulePage() {
  const router = useRouter();
  const { isMobile } = useBreakpoint();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  const [barbers, setBarbers] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState("all");
  const [schedule, setSchedule] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    paid_online: 0,
    pay_in_shop: 0,
    online_revenue: "0.00",
  });
  const [monthAppointments, setMonthAppointments] = useState({}); // { "2025-12-03": 2, ... }
  const [loading, setLoading] = useState(true);
  const [loadingMonth, setLoadingMonth] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Auth check ──
  useEffect(() => {
    const check = async () => {
      try {
        const res = await API.get("dashboard/");
        if (!res.data.is_staff) {
          router.replace("/book");
          return;
        }
        setIsAdmin(true);
        const barberRes = await API.get("barbers/");
        setBarbers(
          Array.isArray(barberRes.data)
            ? barberRes.data
            : barberRes.data.results || [],
        );
      } catch {
        router.replace("/login");
      } finally {
        setAuthChecked(true);
      }
    };
    check();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load appointments for selected date ──
  const loadDay = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      let url = `admin/schedule/?date=${selectedDate}`;
      if (selectedBarber !== "all") url += `&barber=${selectedBarber}`;
      const res = await API.get(url);
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
      showToast("Could not load appointments.", "error");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedDate, selectedBarber]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  // ── Load month overview (dot indicators on calendar) ──
  const loadMonth = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingMonth(true);
    try {
      // Fetch first and last day of month
      const firstDay = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(calYear, calMonth + 1, 0);
      const lastISO = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
      // Use existing endpoint — fetch all appointments and build date map
      const res = await API.get(`admin/schedule/?date=${firstDay}`);
      // Also fetch whole month using a broader query if supported, else build from appointments list
      // We'll loop through the month 7 days at a time to minimize calls
      const counts = {};
      for (let d = 1; d <= lastDay.getDate(); d++) {
        const ds = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        counts[ds] = 0;
      }
      // Single broad fetch
      const monthRes = await API.get(
        `admin/schedule/?date=${firstDay}&month=true`,
      );
      const appts = monthRes.data.appointments || [];
      appts.forEach((a) => {
        if (counts[a.date] !== undefined)
          counts[a.date] = (counts[a.date] || 0) + 1;
      });
      setMonthAppointments(counts);
    } catch {
      // Silently fail — dots just won't show
    } finally {
      setLoadingMonth(false);
    }
  }, [isAdmin, calYear, calMonth]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  // ── Entrance animation ──
  useEffect(() => {
    if (!loading && authChecked && isAdmin) {
      gsap.from(".admin-enter", {
        y: 24,
        opacity: 0,
        duration: 0.9,
        stagger: 0.07,
        ease: "expo.out",
      });
    }
  }, [loading, authChecked]);

  // ── Status change ──
  const handleStatusChange = async (apptId, newStatus) => {
    try {
      await API.patch(`admin/appointments/${apptId}/`, { status: newStatus });
      setSchedule((prev) =>
        prev.map((a) => (a.id === apptId ? { ...a, status: newStatus } : a)),
      );
      showToast(`Marked as ${STATUS_CFG[newStatus].label}`);
    } catch {
      showToast("Could not update status.", "error");
      throw new Error("failed"); // let card revert
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await API.delete(`admin/appointments/${deleteTarget.id}/`);
      setSchedule((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setSummary((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      // Update month dot
      setMonthAppointments((prev) => ({
        ...prev,
        [deleteTarget.date]: Math.max(0, (prev[deleteTarget.date] || 1) - 1),
      }));
      setDeleteTarget(null);
      showToast("Appointment removed.");
    } catch {
      showToast("Could not remove appointment.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    router.push("/login");
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

  // When selecting a date, sync calendar month
  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr);
    const d = new Date(dateStr + "T00:00:00");
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  };

  if (!authChecked) return null;

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
        .page-root {
          opacity: 0;
          animation: pageIn 0.4s ease forwards;
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
          width: 700,
          height: 700,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 65%)",
        }}
      />

      <Toast toast={toast} />
      <DeleteModal
        target={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        deleting={deleting}
      />

      {/* Nav */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: isMobile ? "14px 16px" : "16px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(5,5,5,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              ...sf,
              fontWeight: 700,
              fontSize: 16,
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
                  height: 16,
                  background: "rgba(255,255,255,0.08)",
                }}
              />
              <span
                style={{
                  ...sf,
                  fontSize: 7,
                  letterSpacing: "0.3em",
                  color: "#3f3f46",
                  textTransform: "uppercase",
                }}
              >
                Owner View
              </span>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
              padding: "7px 14px",
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
              padding: "7px 14px",
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
        className="page-root"
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          padding: isMobile ? "68px 14px 40px" : "72px 24px 52px",
          maxWidth: 1160,
          margin: "0 auto",
        }}
      >
        {!isAdmin ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "70vh",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <p
              style={{
                ...sf,
                fontSize: 10,
                color: "#f87171",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              Access Denied
            </p>
            <p style={{ color: "#52525b", fontSize: 13 }}>
              Owner account required.
            </p>
            <button
              onClick={() => router.push("/login")}
              style={{
                marginTop: 16,
                padding: "12px 28px",
                background: "#f59e0b",
                color: "black",
                ...sf,
                fontSize: 9,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Sign In
            </button>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="admin-enter" style={{ marginBottom: 28 }}>
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
                Owner Dashboard
              </p>
              <h1
                style={{
                  ...sf,
                  fontSize: "clamp(1.6rem,3.5vw,2.4rem)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                Shop
                <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                  _Schedule
                </span>
              </h1>
            </div>

            {/* ── Two-column layout ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "320px 1fr",
                gap: isMobile ? 20 : 28,
                alignItems: "start",
              }}
            >
              {/* LEFT: Calendar + Barber filter */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div className="admin-enter">
                  <MonthCalendar
                    year={calYear}
                    month={calMonth}
                    selectedDate={selectedDate}
                    appointmentDates={monthAppointments}
                    onSelectDate={handleSelectDate}
                    onPrevMonth={prevMonth}
                    onNextMonth={nextMonth}
                  />
                </div>

                {/* Barber filter */}
                <div
                  className="admin-enter"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    padding: "16px",
                  }}
                >
                  <p
                    style={{
                      ...sf,
                      fontSize: 7,
                      letterSpacing: "0.3em",
                      color: "#3f3f46",
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}
                  >
                    Filter by Barber
                  </p>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {[{ id: "all", name: "All Barbers" }, ...barbers].map(
                      (b) => {
                        const isActive = selectedBarber === String(b.id);
                        return (
                          <button
                            key={b.id}
                            onClick={() => setSelectedBarber(String(b.id))}
                            style={{
                              width: "100%",
                              padding: "9px 12px",
                              ...sf,
                              fontSize: 8,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              textAlign: "left",
                              background: isActive
                                ? "rgba(245,158,11,0.1)"
                                : "transparent",
                              color: isActive ? "#f59e0b" : "#52525b",
                              border: `1px solid ${isActive ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.06)"}`,
                              cursor: "pointer",
                              transition: "all 0.2s",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.borderColor =
                                  "rgba(245,158,11,0.2)";
                                e.currentTarget.style.color = "#71717a";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.borderColor =
                                  "rgba(255,255,255,0.06)";
                                e.currentTarget.style.color = "#52525b";
                              }
                            }}
                          >
                            {b.name}
                            {isActive && (
                              <span style={{ fontSize: 10, color: "#f59e0b" }}>
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* Mini stats for selected date */}
                <div
                  className="admin-enter"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {[
                    { label: "Bookings", value: summary.total, accent: true },
                    {
                      label: "Online Rev",
                      value: `$${summary.online_revenue}`,
                    },
                    { label: "Paid Online", value: summary.paid_online },
                    { label: "Pay In Shop", value: summary.pay_in_shop },
                  ].map(({ label, value, accent }) => (
                    <div
                      key={label}
                      style={{
                        padding: "14px 12px",
                        background: accent
                          ? "rgba(245,158,11,0.07)"
                          : "rgba(255,255,255,0.025)",
                        border: `1px solid ${accent ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.06)"}`,
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
                          fontSize: 20,
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
              </div>

              {/* RIGHT: Day detail */}
              <div>
                {/* Day header */}
                <div
                  className="admin-enter"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        ...sf,
                        fontSize: "clamp(0.85rem,2vw,1rem)",
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
                        fontSize: 11,
                        color: "#3f3f46",
                        marginTop: 3,
                      }}
                    >
                      {summary.total}{" "}
                      {summary.total === 1 ? "appointment" : "appointments"}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {/* Prev / Next day */}
                    <button
                      onClick={() =>
                        handleSelectDate(addDays(selectedDate, -1))
                      }
                      style={{
                        width: 32,
                        height: 32,
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#52525b",
                        cursor: "pointer",
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
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.08)";
                        e.currentTarget.style.color = "#52525b";
                      }}
                    >
                      ←
                    </button>
                    <button
                      onClick={() => handleSelectDate(addDays(selectedDate, 1))}
                      style={{
                        width: 32,
                        height: 32,
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#52525b",
                        cursor: "pointer",
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
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.08)";
                        e.currentTarget.style.color = "#52525b";
                      }}
                    >
                      →
                    </button>
                    <button
                      onClick={loadDay}
                      style={{
                        padding: "0 14px",
                        height: 32,
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#52525b",
                        ...sf,
                        fontSize: 7,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(245,158,11,0.3)";
                        e.currentTarget.style.color = "#f59e0b";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.08)";
                        e.currentTarget.style.color = "#52525b";
                      }}
                    >
                      ↻ Refresh
                    </button>
                  </div>
                </div>

                {/* Appointment list */}
                <div className="admin-enter">
                  {loading ? (
                    <div
                      style={{
                        padding: "60px 0",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <Spinner />
                      <p
                        style={{
                          ...sf,
                          fontSize: 7,
                          color: "#3f3f46",
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
                        padding: "56px 24px",
                        textAlign: "center",
                        border: "1px solid rgba(255,255,255,0.05)",
                        background: "rgba(255,255,255,0.015)",
                      }}
                    >
                      <p
                        style={{
                          ...sf,
                          fontSize: "clamp(1.4rem,3vw,2rem)",
                          fontWeight: 900,
                          color: "rgba(255,255,255,0.04)",
                          textTransform: "uppercase",
                          marginBottom: 12,
                        }}
                      >
                        No Bookings
                      </p>
                      <p style={{ color: "#27272a", fontSize: 12 }}>
                        No appointments scheduled for this day.
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {schedule
                        .slice()
                        .sort((a, b) =>
                          (a.time || "").localeCompare(b.time || ""),
                        )
                        .map((appt) => (
                          <ApptCard
                            key={appt.id}
                            appt={appt}
                            onStatusChange={handleStatusChange}
                            onDelete={setDeleteTarget}
                            isMobile={isMobile}
                          />
                        ))}
                    </div>
                  )}
                </div>

                {/* Visual timeline — desktop only */}
                {!isMobile && schedule.length > 0 && (
                  <div style={{ marginTop: 40 }}>
                    <p
                      style={{
                        ...sf,
                        fontSize: 7,
                        letterSpacing: "0.3em",
                        color: "#27272a",
                        textTransform: "uppercase",
                        marginBottom: 16,
                      }}
                    >
                      Visual Timeline
                    </p>
                    <div style={{ position: "relative", paddingLeft: 68 }}>
                      {Array.from({ length: 10 }, (_, i) => {
                        const hour = 9 + i;
                        return (
                          <div
                            key={hour}
                            style={{
                              position: "absolute",
                              left: 0,
                              top: i * 52,
                              height: 52,
                              display: "flex",
                              alignItems: "flex-start",
                              paddingTop: 2,
                            }}
                          >
                            <span
                              style={{
                                ...mono,
                                fontSize: 9,
                                color: "#27272a",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {`${hour % 12 || 12}${hour < 12 ? "AM" : "PM"}`}
                            </span>
                          </div>
                        );
                      })}
                      {Array.from({ length: 10 }, (_, i) => (
                        <div
                          key={i}
                          style={{
                            position: "absolute",
                            left: 60,
                            right: 0,
                            top: i * 52,
                            height: 1,
                            background: "rgba(255,255,255,0.04)",
                          }}
                        />
                      ))}
                      <div
                        style={{ position: "relative", height: 9 * 52 + 28 }}
                      >
                        {schedule.map((appt) => {
                          if (!appt.time) return null;
                          const [h, m] = appt.time.split(":");
                          const topOffset =
                            (parseInt(h) - 9) * 52 + (parseInt(m) / 60) * 52;
                          const sCfg = STATUS_CFG[appt.status || "confirmed"];
                          const duration = appt.service_duration || 30;
                          const height = Math.max(36, (duration / 60) * 52 - 4);
                          return (
                            <div
                              key={appt.id}
                              style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                top: topOffset,
                                height,
                                background: sCfg.bg,
                                border: `1px solid ${sCfg.border}`,
                                padding: "5px 12px",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                overflow: "hidden",
                              }}
                            >
                              <span
                                style={{
                                  ...mono,
                                  fontSize: 9,
                                  color: sCfg.color,
                                  flexShrink: 0,
                                }}
                              >
                                {fmtTime(appt.time)}
                              </span>
                              <span
                                style={{
                                  ...sf,
                                  fontSize: 8,
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
                              {appt.barber && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "#52525b",
                                    flexShrink: 0,
                                    marginLeft: "auto",
                                  }}
                                >
                                  {appt.barber}
                                </span>
                              )}
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
      </div>
    </>
  );
}
