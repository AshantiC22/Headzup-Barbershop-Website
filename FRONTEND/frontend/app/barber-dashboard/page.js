"use client";
// HEADZ UP — Barber Dashboard v4

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";
import useBreakpoint from "@/lib/useBreakpoint";

/* ─────────────────────────────── tokens ─────────────────────────── */
const T = {
  bg: "#040404",
  surface: "#0a0a0a",
  surface2: "#0f0f0f",
  border: "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.14)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.1)",
  amberBorder: "rgba(245,158,11,0.3)",
  green: "#4ade80",
  greenDim: "rgba(74,222,128,0.1)",
  greenBorder: "rgba(74,222,128,0.2)",
  red: "#f87171",
  redDim: "rgba(248,113,113,0.08)",
  redBorder: "rgba(248,113,113,0.2)",
  purple: "#a78bfa",
  muted: "#71717a",
  dim: "#3f3f46",
  deep: "#27272a",
};
const sf = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

/* ─────────────────────────────── helpers ────────────────────────── */
const todayISO = () => new Date().toISOString().split("T")[0];
const addDays = (d, n) => {
  const dt = new Date(d + "T00:00:00");
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split("T")[0];
};
const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m}${hr >= 12 ? "pm" : "am"}`;
};
const fmtFull = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
const fmtShort = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
const fmtMY = (y, m) =>
  new Date(y, m, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
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
    color: T.green,
    bg: T.greenDim,
    border: T.greenBorder,
  },
  completed: {
    label: "Completed",
    color: "#a1a1aa",
    bg: "rgba(161,161,170,0.06)",
    border: "rgba(161,161,170,0.12)",
  },
  no_show: {
    label: "No Show",
    color: T.red,
    bg: T.redDim,
    border: T.redBorder,
  },
  cancelled: {
    label: "Cancelled",
    color: T.dim,
    bg: "rgba(82,82,91,0.05)",
    border: "rgba(82,82,91,0.1)",
  },
};

/* ─────────────────────────────── icons ──────────────────────────── */
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

/* ─────────────────────────────── toast ──────────────────────────── */
function Toast({ toast }) {
  if (!toast) return null;
  const ok = toast.type !== "error";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        padding: "11px 22px",
        background: ok ? T.greenDim : T.redDim,
        border: `1px solid ${ok ? T.greenBorder : T.redBorder}`,
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        animation: "toastIn 0.3s ease",
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: ok ? T.green : T.red,
          flexShrink: 0,
        }}
      />
      <p
        style={{
          ...sf,
          fontSize: 7,
          color: ok ? T.green : T.red,
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

/* ─────────────────────────── appointment ticket ─────────────────── */
function ApptTicket({
  appt,
  onStatusChange,
  onReschedule,
  onCancel,
  onNotes,
  isMobile,
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(appt.barber_notes || "");
  const [saving, setSaving] = useState(false);
  const status = appt.status || "confirmed";
  const sCfg = STATUS_CFG[status] || STATUS_CFG.confirmed;
  const isOnline = appt.payment_method === "online";

  const saveNote = async () => {
    setSaving(true);
    try {
      await API.patch(`barber/appointments/${appt.id}/`, {
        barber_notes: note,
      });
      onNotes && onNotes(appt.id, note);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.amberBorder)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.border)}
    >
      {/* Top color strip */}
      <div
        style={{
          height: 2,
          background: `linear-gradient(to right,${sCfg.color},transparent)`,
          opacity: 0.7,
        }}
      />

      {/* Main row */}
      <div
        style={{
          padding: isMobile ? "12px 14px" : "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 10 : 16,
          flexWrap: "wrap",
        }}
      >
        {/* Time block */}
        <div
          style={{
            width: isMobile ? 52 : 64,
            flexShrink: 0,
            textAlign: "center",
            padding: "8px 0",
            background: T.surface2,
            border: `1px solid ${T.border}`,
          }}
        >
          <p
            style={{
              ...sf,
              fontSize: isMobile ? 13 : 16,
              fontWeight: 900,
              color: T.amber,
              lineHeight: 1,
              margin: 0,
            }}
          >
            {fmtTime(appt.time) || "—"}
          </p>
          <p style={{ ...mono, fontSize: 8, color: T.dim, marginTop: 3 }}>
            {fmtShort(appt.date)}
          </p>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              ...sf,
              fontSize: isMobile ? 9 : 11,
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {appt.service_name || appt.service || "Appointment"}
          </p>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={{ ...mono, fontSize: 10, color: "#a1a1aa" }}>
              {appt.client_name || appt.client || appt.username || "Client"}
            </span>
            {appt.client_notes && (
              <span
                style={{
                  ...mono,
                  fontSize: 9,
                  color: T.amber,
                  fontStyle: "italic",
                }}
              >
                "{appt.client_notes}"
              </span>
            )}
          </div>
        </div>

        {/* Badges */}
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          {appt.is_walk_in && (
            <span
              style={{
                ...sf,
                fontSize: 5,
                letterSpacing: "0.15em",
                padding: "3px 8px",
                background: T.amberDim,
                border: `1px solid ${T.amberBorder}`,
                color: T.amber,
              }}
            >
              WALK-IN
            </span>
          )}
          {isOnline && (
            <span
              style={{
                ...sf,
                fontSize: 5,
                letterSpacing: "0.15em",
                padding: "3px 8px",
                background: T.amberDim,
                border: `1px solid ${T.amberBorder}`,
                color: T.amber,
              }}
            >
              PAID
            </span>
          )}
          <span
            style={{
              ...sf,
              fontSize: 5,
              letterSpacing: "0.1em",
              padding: "3px 8px",
              background: sCfg.bg,
              border: `1px solid ${sCfg.border}`,
              color: sCfg.color,
            }}
          >
            {sCfg.label}
          </span>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: 28,
            height: 28,
            background: "transparent",
            border: `1px solid ${T.border}`,
            color: T.muted,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
            flexShrink: 0,
            fontSize: 10,
            transform: open ? "rotate(180deg)" : "none",
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
          ▾
        </button>
      </div>

      {/* Expanded panel */}
      {open && (
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            padding: "16px 20px",
            background: T.amberDim,
          }}
        >
          {/* Status selector */}
          <p
            style={{
              ...sf,
              fontSize: 6,
              letterSpacing: "0.4em",
              color: T.muted,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Update Status
          </p>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => onStatusChange && onStatusChange(appt.id, key)}
                style={{
                  padding: "7px 12px",
                  ...sf,
                  fontSize: 6,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: status === key ? cfg.bg : "transparent",
                  border: `1px solid ${status === key ? cfg.color : T.border}`,
                  color: status === key ? cfg.color : T.muted,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Notes */}
          <p
            style={{
              ...sf,
              fontSize: 6,
              letterSpacing: "0.4em",
              color: T.muted,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Barber Notes
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Add notes about this appointment..."
            style={{
              width: "100%",
              background: T.bg,
              border: `1px solid ${T.border}`,
              padding: "10px 12px",
              color: "white",
              fontSize: 13,
              ...mono,
              outline: "none",
              resize: "vertical",
              marginBottom: 10,
              borderRadius: 0,
            }}
            onFocus={(e) => (e.target.style.borderColor = T.amber)}
            onBlur={(e) => (e.target.style.borderColor = T.border)}
          />

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={saveNote}
              disabled={saving}
              style={{
                padding: "8px 16px",
                background: saving ? T.deep : T.amber,
                color: saving ? T.dim : "black",
                ...sf,
                fontSize: 7,
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {saving ? "Saving..." : "Save Notes →"}
            </button>
            <button
              onClick={() => onReschedule && onReschedule(appt)}
              style={{
                padding: "8px 14px",
                ...sf,
                fontSize: 7,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                background: "transparent",
                border: `1px solid ${T.border}`,
                color: T.muted,
                cursor: "pointer",
                transition: "all 0.2s",
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
              Reschedule
            </button>
            <button
              onClick={() => onCancel && onCancel(appt.id)}
              style={{
                padding: "8px 14px",
                ...sf,
                fontSize: 7,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                background: "transparent",
                border: `1px solid ${T.redBorder}`,
                color: T.red,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = T.redDim)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── reschedule modal ────────────────────── */
function RescheduleModal({ appt, onClose, onDone }) {
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const today = todayISO();
  const SLOTS = [
    "9:00 AM",
    "9:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "12:00 PM",
    "12:30 PM",
    "1:00 PM",
    "1:30 PM",
    "2:00 PM",
    "2:30 PM",
    "3:00 PM",
    "3:30 PM",
    "4:00 PM",
    "4:30 PM",
  ];

  const submit = async () => {
    if (!newDate || !newTime) {
      setErr("Pick a date and time.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await API.post(`barber/appointments/${appt.id}/reschedule/`, {
        new_date: newDate,
        new_time: to24Hour(newTime),
      });
      onDone && onDone();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error || "Could not reschedule.");
    } finally {
      setBusy(false);
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
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: T.surface,
          border: `1px solid ${T.amberBorder}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                ...mono,
                fontSize: 8,
                color: T.amber,
                letterSpacing: "0.4em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Reschedule
            </p>
            <p
              style={{
                ...sf,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              {appt.service_name || appt.service || "Appointment"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              background: "transparent",
              border: `1px solid ${T.border}`,
              color: T.muted,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {err && (
            <p
              style={{ ...mono, fontSize: 11, color: T.red, marginBottom: 12 }}
            >
              ⚠ {err}
            </p>
          )}
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
            New Date
          </label>
          <input
            type="date"
            value={newDate}
            min={today}
            onChange={(e) => setNewDate(e.target.value)}
            style={{
              width: "100%",
              background: T.bg,
              border: `1px solid ${T.border}`,
              padding: "11px 12px",
              color: "white",
              fontSize: 14,
              outline: "none",
              ...mono,
              marginBottom: 16,
              colorScheme: "dark",
            }}
            onFocus={(e) => (e.target.style.borderColor = T.amber)}
            onBlur={(e) => (e.target.style.borderColor = T.border)}
          />
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
            New Time
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))",
              gap: 5,
              marginBottom: 20,
            }}
          >
            {SLOTS.map((s) => (
              <button
                key={s}
                onClick={() => setNewTime(s)}
                style={{
                  padding: "7px 4px",
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
          <button
            onClick={submit}
            disabled={busy || !newDate || !newTime}
            style={{
              width: "100%",
              padding: "14px",
              ...sf,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              background: busy || !newDate || !newTime ? T.deep : T.amber,
              color: busy || !newDate || !newTime ? T.dim : "black",
              border: "none",
              cursor: busy || !newDate || !newTime ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {busy ? "Sending Request..." : "Propose New Time →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── month calendar ─────────────────────── */
function MonthCal({
  year,
  month,
  selectedDate,
  apptDates,
  onSelect,
  onPrev,
  onNext,
}) {
  const today = todayISO();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const DAY_L = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        padding: "16px",
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
          onClick={onPrev}
          style={{
            width: 28,
            height: 28,
            background: "transparent",
            border: `1px solid ${T.border}`,
            color: T.muted,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          ‹
        </button>
        <p
          style={{
            ...sf,
            fontSize: 8,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          {fmtMY(year, month)}
        </p>
        <button
          onClick={onNext}
          style={{
            width: 28,
            height: 28,
            background: "transparent",
            border: `1px solid ${T.border}`,
            color: T.muted,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          ›
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 2,
          marginBottom: 4,
        }}
      >
        {DAY_L.map((d) => (
          <p
            key={d}
            style={{
              ...sf,
              fontSize: 5,
              textAlign: "center",
              color: T.dim,
              letterSpacing: "0.1em",
              padding: "4px 0",
            }}
          >
            {d}
          </p>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 2,
        }}
      >
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const isToday = iso === today;
          const isSel = iso === selectedDate;
          const hasAppt = (apptDates || []).includes(iso);
          return (
            <button
              key={i}
              onClick={() => onSelect(iso)}
              style={{
                padding: "6px 2px",
                background: isSel
                  ? T.amber
                  : isToday
                    ? T.amberDim
                    : "transparent",
                border: `1px solid ${isSel ? T.amber : isToday ? T.amberBorder : "transparent"}`,
                cursor: "pointer",
                position: "relative",
                transition: "all 0.15s",
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 10,
                  fontWeight: isSel || isToday ? 900 : 400,
                  color: isSel ? "black" : isToday ? T.amber : "#a1a1aa",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                {d}
              </p>
              {hasAppt && !isSel && (
                <div
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: T.amber,
                    margin: "2px auto 0",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════ MAIN ══════════════════════════════ */
export default function BarberDashboard() {
  const router = useRouter();
  const { isMobile } = useBreakpoint();

  /* state */
  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("schedule");
  const [toast, setToast] = useState(null);
  const [reschedModal, setReschedModal] = useState(null);
  const [time, setTime] = useState("");

  /* schedule */
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [schedule, setSchedule] = useState([]);
  const [schedLoading, setSchedLoading] = useState(false);
  const [allApptDates, setAllApptDates] = useState([]);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  /* walk-in */
  const [services, setServices] = useState([]);
  const [wiSvc, setWiSvc] = useState("");
  const [wiName, setWiName] = useState("");
  const [wiPhone, setWiPhone] = useState("");
  const [wiNotes, setWiNotes] = useState("");
  const [wiLoading, setWiLoading] = useState(false);

  /* waitlist */
  const [waitlist, setWaitlist] = useState([]);

  /* clients */
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDetail, setClientDetail] = useState(null);
  const [clientNotes, setClientNotes] = useState("");
  const [savingCN, setSavingCN] = useState(false);

  /* reports */
  const [reports, setReports] = useState(null);
  const [reportPeriod, setReportPeriod] = useState("month");

  /* availability */
  const [availability, setAvailability] = useState([]);
  const [editingDay, setEditingDay] = useState(null);
  const [editWorking, setEditWorking] = useState(true);
  const [editStart, setEditStart] = useState("09:00");
  const [editEnd, setEditEnd] = useState("18:00");
  const [savingAvail, setSavingAvail] = useState(false);

  /* time off */
  const [timeOff, setTimeOff] = useState([]);
  const [newTimeOffDate, setNewTimeOffDate] = useState("");
  const [newTimeOffReason, setNewTimeOffReason] = useState("");
  const [addingTimeOff, setAddingTimeOff] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };
  const today = todayISO();

  /* Live clock */
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  /* load barber + today's schedule + services in parallel */
  useEffect(() => {
    const load = async () => {
      try {
        const [barberRes, schedRes, svcRes] = await Promise.all([
          API.get("barber/me/"),
          API.get(`barber/schedule/?date=${todayISO()}`),
          API.get("services/"),
        ]);
        setBarber(barberRes.data);
        setSchedule(
          Array.isArray(schedRes.data)
            ? schedRes.data
            : schedRes.data.appointments || schedRes.data.results || [],
        );
        setServices(
          Array.isArray(svcRes.data) ? svcRes.data : svcRes.data.results || [],
        );
      } catch {
        router.replace("/barber-login");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* load schedule */
  const loadSchedule = useCallback(async (date) => {
    setSchedLoading(true);
    try {
      const res = await API.get(`barber/schedule/?date=${date}`);
      setSchedule(
        Array.isArray(res.data)
          ? res.data
          : res.data.appointments || res.data.results || [],
      );
    } catch {
    } finally {
      setSchedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "schedule") loadSchedule(selectedDate);
  }, [selectedDate, activeTab, loadSchedule]);

  /* load all appt dates for calendar dots */
  useEffect(() => {
    API.get("barber/schedule/?days=60")
      .then((r) => {
        const arr = Array.isArray(r.data)
          ? r.data
          : r.data.appointments || r.data.results || [];
        setAllApptDates([...new Set(arr.map((a) => a.date))]);
      })
      .catch(() => {});
  }, []);

  /* services loaded on mount above */

  /* load availability */
  const loadAvailability = useCallback(async () => {
    try {
      const r = await API.get("barber/availability/");
      setAvailability(r.data);
    } catch {}
  }, []);
  useEffect(() => {
    if (activeTab === "availability") loadAvailability();
  }, [activeTab, loadAvailability]);

  /* load time off */
  const loadTimeOff = useCallback(async () => {
    try {
      const r = await API.get("barber/time-off/");
      setTimeOff(r.data);
    } catch {}
  }, []);
  useEffect(() => {
    if (activeTab === "timeoff") loadTimeOff();
  }, [activeTab, loadTimeOff]);

  /* load waitlist */
  const loadWaitlist = useCallback(async () => {
    try {
      const r = await API.get("barber/waitlist/");
      setWaitlist(r.data);
    } catch {}
  }, []);
  useEffect(() => {
    if (activeTab === "waitlist") loadWaitlist();
  }, [activeTab, loadWaitlist]);

  /* load clients */
  const loadClients = useCallback(async () => {
    try {
      const r = await API.get("barber/clients/");
      setClients(r.data);
    } catch {}
  }, []);
  useEffect(() => {
    if (activeTab === "clients") loadClients();
  }, [activeTab, loadClients]);

  /* load reports */
  const loadReports = useCallback(async (period) => {
    try {
      const r = await API.get(`barber/reports/?period=${period}`);
      setReports(r.data);
    } catch {}
  }, []);
  useEffect(() => {
    if (activeTab === "reports") loadReports(reportPeriod);
  }, [activeTab, reportPeriod, loadReports]);

  /* handlers */
  const handleStatusChange = async (id, status) => {
    try {
      await API.patch(`barber/appointments/${id}/`, { status });
      setSchedule((p) => p.map((a) => (a.id === id ? { ...a, status } : a)));
      showToast("Status updated.");
    } catch {
      showToast("Could not update.", "error");
    }
  };

  const handleCancel = async (id) => {
    if (!confirm("Cancel this appointment?")) return;
    try {
      await API.patch(`barber/appointments/${id}/`, { status: "cancelled" });
      setSchedule((p) =>
        p.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)),
      );
      showToast("Appointment cancelled.");
    } catch {
      showToast("Could not cancel.", "error");
    }
  };

  const handleWalkIn = async () => {
    if (!wiName.trim() || !wiSvc) {
      showToast("Name and service required.", "error");
      return;
    }
    setWiLoading(true);
    try {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;
      const payload = {
        client_name: wiName.trim(),
        service_id: wiSvc,
        date: today,
        time: currentTime,
        notes: wiNotes,
        phone: wiPhone,
        is_walk_in: true,
      };
      await API.post("barber/walk-in/", payload);
      showToast("Walk-in added!");
      setWiName("");
      setWiPhone("");
      setWiNotes("");
      setWiSvc("");
      loadSchedule(selectedDate);
    } catch (e) {
      showToast(e.response?.data?.error || "Could not add walk-in.", "error");
    } finally {
      setWiLoading(false);
    }
  };

  const notifyWaitlist = async (id) => {
    try {
      await API.patch(`barber/waitlist/${id}/`, {});
      setWaitlist((p) =>
        p.map((w) => (w.id === id ? { ...w, notified: true } : w)),
      );
      showToast("Notified!");
    } catch {
      showToast("Error.", "error");
    }
  };

  const removeTimeOff = async (id) => {
    try {
      await API.delete(`barber/time-off/${id}/`);
      setTimeOff((p) => p.filter((t) => t.id !== id));
      showToast("Removed.");
    } catch {
      showToast("Error.", "error");
    }
  };

  const addTimeOff = async () => {
    if (!newTimeOffDate) return;
    setAddingTimeOff(true);
    try {
      const r = await API.post("barber/time-off/", {
        date: newTimeOffDate,
        reason: newTimeOffReason,
      });
      setTimeOff((p) => [...p, r.data]);
      setNewTimeOffDate("");
      setNewTimeOffReason("");
      showToast("Date blocked.");
    } catch {
      showToast("Error.", "error");
    } finally {
      setAddingTimeOff(false);
    }
  };

  const saveAvailability = async () => {
    setSavingAvail(true);
    try {
      await API.post("barber/availability/", {
        day_of_week: editingDay,
        is_working: editWorking,
        start_time: editWorking ? editStart + ":00" : "09:00:00",
        end_time: editWorking ? editEnd + ":00" : "18:00:00",
      });
      await loadAvailability();
      setEditingDay(null);
      showToast("Hours saved.");
    } catch {
      showToast("Error saving.", "error");
    } finally {
      setSavingAvail(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    router.replace("/barber-login");
  };

  const summary = {
    today_online: schedule.filter(
      (a) => a.payment_method === "online" && a.status !== "cancelled",
    ).length,
    today_total: schedule.filter((a) => a.status !== "cancelled").length,
    confirmed: schedule.filter((a) => a.status === "confirmed").length,
    revenue: schedule
      .filter((a) => a.payment_method === "online" && a.status !== "cancelled")
      .reduce((s, a) => s + parseFloat(a.service_price || 0), 0)
      .toFixed(2),
  };

  /* ── LOADING ── */
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
          gap: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <style>{`body{background:${T.bg};margin:0;font-family:'DM Mono',monospace;} @keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{to{opacity:1}} @keyframes scandown{from{top:-1px}to{top:100%}}`}</style>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.014) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.014) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 400,
            background:
              "radial-gradient(ellipse,rgba(245,158,11,0.08) 0%,transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 1,
            background:
              "linear-gradient(to right,transparent,rgba(245,158,11,0.3),transparent)",
            animation: "scandown 6s linear infinite",
          }}
        />
        <div
          style={{
            textAlign: "center",
            opacity: 0,
            animation: "fadeIn 0.5s ease 0.1s forwards",
            position: "relative",
          }}
        >
          <p
            style={{
              fontFamily: "'Syncopate',sans-serif",
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "-0.06em",
              margin: 0,
            }}
          >
            HEADZ<span style={{ color: T.amber, fontStyle: "italic" }}>UP</span>
          </p>
          <p
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 9,
              color: T.dim,
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              marginTop: 8,
            }}
          >
            Barber Portal
          </p>
        </div>
        <div
          style={{
            width: 1,
            height: 40,
            background: `linear-gradient(to bottom,${T.amber},transparent)`,
            position: "relative",
          }}
        />
        <div
          style={{
            width: 16,
            height: 16,
            border: `1.5px solid ${T.amberBorder}`,
            borderTopColor: T.amber,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            position: "relative",
          }}
        />
      </div>
    );

  if (!barber) return null;

  const TABS = [
    { key: "schedule", label: "Schedule", icon: "📅" },
    { key: "walkin", label: "Walk-In", icon: "✂️" },
    { key: "waitlist", label: "Waitlist", icon: "⏳" },
    { key: "clients", label: "Clients", icon: "👤" },
    { key: "reports", label: "Reports", icon: "📊" },
    { key: "availability", label: "My Hours", icon: "⏰" },
    { key: "timeoff", label: "Time Off", icon: "🏖" },
  ];

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap");
        *,
        *::before,
        *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }
        html,
        body {
          background: ${T.bg};
          color: white;
          font-family: "DM Mono", monospace;
          overflow-x: hidden;
          -webkit-text-size-adjust: 100%;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes scandown {
          from {
            top: -1px;
          }
          to {
            top: 100%;
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes glow {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
          }
        }
        .bd-enter {
          animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        input[type="date"] {
          color-scheme: dark;
        }
        input[type="time"] {
          color-scheme: dark;
        }
        ::-webkit-scrollbar {
          width: 0;
          height: 0;
        }
        * {
          scrollbar-width: none;
        }
      `}</style>

      {/* ── BACKGROUNDS ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.014) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.014) 1px,transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "-10%",
          right: "-5%",
          width: 700,
          height: 700,
          background:
            "radial-gradient(circle,rgba(245,158,11,0.05) 0%,transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "10%",
          left: "-5%",
          width: 500,
          height: 500,
          background:
            "radial-gradient(circle,rgba(245,158,11,0.03) 0%,transparent 60%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 1,
            background:
              "linear-gradient(to right,transparent,rgba(245,158,11,0.18),transparent)",
            animation: "scandown 12s linear infinite",
          }}
        />
      </div>

      <Toast toast={toast} />
      {reschedModal && (
        <RescheduleModal
          appt={reschedModal}
          onClose={() => setReschedModal(null)}
          onDone={() => loadSchedule(selectedDate)}
        />
      )}

      {/* ══════════════════════════ NAV ══════════════════════════ */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "rgba(4,4,4,0.96)",
          backdropFilter: "blur(24px)",
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {/* Top bar */}
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: isMobile ? "0 14px" : "0 32px",
            height: 60,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Left — logo + name */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 12 : 20,
            }}
          >
            <a
              href="/"
              style={{
                ...sf,
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: "-0.06em",
                textDecoration: "none",
                color: "white",
              }}
            >
              HEADZ
              <span style={{ color: T.amber, fontStyle: "italic" }}>UP</span>
            </a>
            {!isMobile && (
              <>
                <div style={{ width: 1, height: 20, background: T.border }} />
                <div>
                  <p
                    style={{
                      ...mono,
                      fontSize: 9,
                      color: T.muted,
                      letterSpacing: "0.2em",
                    }}
                  >
                    Barber Portal
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Center — live time (desktop) */}
          {!isMobile && (
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  ...mono,
                  fontSize: 13,
                  color: "white",
                  letterSpacing: "0.15em",
                }}
              >
                {time}
              </p>
              <p
                style={{
                  ...mono,
                  fontSize: 8,
                  color: T.dim,
                  letterSpacing: "0.3em",
                  marginTop: 2,
                }}
              >
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          )}

          {/* Right — barber + signout */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 8 : 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  background: T.amber,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    ...sf,
                    fontSize: 11,
                    fontWeight: 900,
                    color: "black",
                  }}
                >
                  {barber.name?.charAt(0)?.toUpperCase() || "B"}
                </span>
              </div>
              {!isMobile && (
                <span style={{ ...mono, fontSize: 11, color: T.muted }}>
                  {barber.name}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: isMobile ? "7px 10px" : "9px 16px",
                ...sf,
                fontSize: 7,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                background: "transparent",
                border: `1px solid ${T.border}`,
                color: T.muted,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "white";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = T.muted;
                e.currentTarget.style.borderColor = T.border;
              }}
            >
              {isMobile ? "Out" : "Sign Out"}
            </button>
          </div>
        </div>

        {/* Tab strip */}
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            borderTop: `1px solid ${T.border}`,
            display: "flex",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: isMobile ? "8px 10px" : "11px 22px",
                ...sf,
                fontSize: isMobile ? 4.5 : 7,
                letterSpacing: isMobile ? "0.02em" : "0.15em",
                textTransform: "uppercase",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${activeTab === key ? T.amber : "transparent"}`,
                color: activeTab === key ? T.amber : T.muted,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: isMobile ? 2 : 4,
                whiteSpace: "nowrap",
                flexShrink: 0,
                flex: isMobile ? "1 0 auto" : "none",
                minWidth: isMobile ? 48 : "auto",
              }}
            >
              <span style={{ fontSize: isMobile ? 18 : 12 }}>{icon}</span>
              <span
                style={{ fontSize: isMobile ? "clamp(7px,2vw,9px)" : "7px" }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* ══════════════════════════ MAIN ══════════════════════════ */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 1280,
          margin: "0 auto",
          padding: isMobile
            ? "116px 14px max(40px,env(safe-area-inset-bottom))"
            : "120px 32px 64px",
        }}
      >
        {/* ── GREETING + STATS ── */}
        <div
          className="bd-enter"
          style={{
            marginBottom: 28,
            paddingBottom: 28,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div>
              <p
                style={{
                  ...mono,
                  fontSize: 9,
                  color: T.amber,
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Barber Dashboard
              </p>
              <h1
                style={{
                  ...sf,
                  fontSize: "clamp(1.6rem,3.5vw,2.8rem)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  lineHeight: 0.88,
                  letterSpacing: "-0.04em",
                  margin: 0,
                }}
              >
                Hey,
                <br />
                <span style={{ color: T.amber, fontStyle: "italic" }}>
                  {barber.name}_
                </span>
              </h1>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                opacity: 0.3,
              }}
            >
              <div
                style={{
                  width: isMobile ? 20 : 60,
                  height: 1,
                  background: `linear-gradient(to right,transparent,${T.amber})`,
                }}
              />
              <Scissors size={14} />
              <div
                style={{
                  width: isMobile ? 20 : 60,
                  height: 1,
                  background: `linear-gradient(to left,transparent,${T.amber})`,
                }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",
              gap: 8,
            }}
          >
            {[
              {
                label: "Today's Clients",
                value: barber.today_count ?? 0,
                accent: true,
                icon: "✂️",
              },
              {
                label: "All Time",
                value: barber.total_count ?? 0,
                accent: false,
                icon: "🏆",
              },
              {
                label: "Online Paid",
                value: `$${barber.online_revenue || "0.00"}`,
                accent: false,
                icon: "💳",
              },
              {
                label: "Pay In Shop",
                value: barber.pay_in_shop ?? 0,
                accent: false,
                icon: "💵",
              },
            ].map(({ label, value, accent, icon }) => (
              <div
                key={label}
                style={{
                  padding: isMobile ? "16px 14px" : "22px 18px",
                  background: accent ? T.amberDim : T.surface,
                  border: `1px solid ${accent ? T.amberBorder : T.border}`,
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.25s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = T.amber;
                  e.currentTarget.style.background = T.amberDim;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = accent
                    ? T.amberBorder
                    : T.border;
                  e.currentTarget.style.background = accent
                    ? T.amberDim
                    : T.surface;
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 50,
                    height: 50,
                    background: accent
                      ? "linear-gradient(225deg,rgba(245,158,11,0.25),transparent)"
                      : "linear-gradient(225deg,rgba(255,255,255,0.04),transparent)",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <p
                    style={{
                      ...sf,
                      fontSize: 5,
                      letterSpacing: "0.35em",
                      color: accent ? T.amber : T.muted,
                      textTransform: "uppercase",
                      margin: 0,
                    }}
                  >
                    {label}
                  </p>
                  <span style={{ fontSize: 14, opacity: 0.4 }}>{icon}</span>
                </div>
                <p
                  style={{
                    ...sf,
                    fontSize: 28,
                    fontWeight: 900,
                    color: accent ? T.amber : "white",
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ SCHEDULE TAB ══ */}
        {activeTab === "schedule" && (
          <div className="bd-enter">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "280px 1fr",
                gap: 20,
                alignItems: "start",
              }}
            >
              {/* Calendar */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <MonthCal
                  year={calYear}
                  month={calMonth}
                  selectedDate={selectedDate}
                  apptDates={allApptDates}
                  onSelect={(d) => setSelectedDate(d)}
                  onPrev={() => {
                    if (calMonth === 0) {
                      setCalMonth(11);
                      setCalYear((y) => y - 1);
                    } else setCalMonth((m) => m - 1);
                  }}
                  onNext={() => {
                    if (calMonth === 11) {
                      setCalMonth(0);
                      setCalYear((y) => y + 1);
                    } else setCalMonth((m) => m + 1);
                  }}
                />
                {/* Today button */}
                {selectedDate !== today && (
                  <button
                    onClick={() => {
                      setSelectedDate(today);
                      setCalYear(new Date().getFullYear());
                      setCalMonth(new Date().getMonth());
                    }}
                    style={{
                      padding: "10px",
                      ...sf,
                      fontSize: 7,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      background: T.amberDim,
                      border: `1px solid ${T.amberBorder}`,
                      color: T.amber,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    ← Back to Today
                  </button>
                )}
                {/* Send reminders */}
                <button
                  onClick={async () => {
                    try {
                      await API.post("barber/send-reminders/");
                      showToast("Reminders sent!");
                    } catch {
                      showToast("Error.", "error");
                    }
                  }}
                  style={{
                    padding: "10px",
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    background: "transparent",
                    border: `1px solid ${T.border}`,
                    color: T.muted,
                    cursor: "pointer",
                    transition: "all 0.2s",
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
                  📧 Send Reminders
                </button>
              </div>

              {/* Appointments */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div>
                    <p
                      style={{
                        ...mono,
                        fontSize: 8,
                        color: T.amber,
                        letterSpacing: "0.4em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      {selectedDate === today ? "Today" : "Selected Day"}
                    </p>
                    <h2
                      style={{
                        ...sf,
                        fontSize: "clamp(0.9rem,2vw,1.2rem)",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "-0.03em",
                        color: selectedDate === today ? T.amber : "white",
                      }}
                    >
                      {fmtFull(selectedDate)}
                    </h2>
                  </div>
                  <div
                    style={{ display: "flex", gap: 10, alignItems: "center" }}
                  >
                    <span style={{ ...mono, fontSize: 11, color: T.muted }}>
                      {summary.confirmed} confirmed
                    </span>
                    <button
                      onClick={() => loadSchedule(selectedDate)}
                      style={{
                        padding: "7px 14px",
                        ...sf,
                        fontSize: 6,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        background: "transparent",
                        border: `1px solid ${T.border}`,
                        color: T.muted,
                        cursor: "pointer",
                        transition: "all 0.2s",
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
                      ↻ Refresh
                    </button>
                  </div>
                </div>

                {schedLoading ? (
                  <div
                    style={{
                      padding: "40px 0",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        border: `1.5px solid ${T.amberBorder}`,
                        borderTopColor: T.amber,
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                  </div>
                ) : schedule.length === 0 ? (
                  <div
                    style={{
                      padding: "60px 20px",
                      textAlign: "center",
                      border: `1px solid ${T.border}`,
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
                        color: "rgba(255,255,255,0.025)",
                        textTransform: "uppercase",
                        letterSpacing: "-0.06em",
                        userSelect: "none",
                      }}
                    >
                      FREE
                    </p>
                    <p
                      style={{
                        ...sf,
                        fontSize: 9,
                        color: "rgba(255,255,255,0.08)",
                        textTransform: "uppercase",
                        position: "relative",
                      }}
                    >
                      No appointments this day
                    </p>
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {schedule.map((appt) => (
                      <ApptTicket
                        key={appt.id}
                        appt={appt}
                        isMobile={isMobile}
                        onStatusChange={handleStatusChange}
                        onReschedule={(a) => setReschedModal(a)}
                        onCancel={handleCancel}
                        onNotes={(id, note) =>
                          setSchedule((p) =>
                            p.map((a) =>
                              a.id === id ? { ...a, barber_notes: note } : a,
                            ),
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ WALK-IN TAB ══ */}
        {activeTab === "walkin" && (
          <div className="bd-enter" style={{ maxWidth: 560 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 1,
                  background: `rgba(245,158,11,0.5)`,
                }}
              />
              <p
                style={{
                  ...mono,
                  fontSize: 8,
                  color: T.amber,
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                }}
              >
                Walk-In Booking
              </p>
            </div>
            <p
              style={{
                ...mono,
                fontSize: 13,
                color: T.muted,
                lineHeight: 1.7,
                marginBottom: 28,
              }}
            >
              Add a walk-in client instantly. They'll be added to today's
              schedule.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                {
                  label: "Client Name *",
                  type: "text",
                  val: wiName,
                  set: setWiName,
                  placeholder: "John Smith",
                },
                {
                  label: "Phone",
                  type: "tel",
                  val: wiPhone,
                  set: setWiPhone,
                  placeholder: "601-555-0100",
                },
                {
                  label: "Notes",
                  type: "text",
                  val: wiNotes,
                  set: setWiNotes,
                  placeholder: "Style request, preferences...",
                },
              ].map(({ label, type, val, set, placeholder }) => (
                <div key={label}>
                  <label
                    style={{
                      ...sf,
                      fontSize: 6,
                      letterSpacing: "0.4em",
                      color: T.muted,
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    {label}
                  </label>
                  <input
                    type={type}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    style={{
                      width: "100%",
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      padding: "13px 14px",
                      color: "white",
                      fontSize: 16,
                      ...mono,
                      outline: "none",
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
                    letterSpacing: "0.4em",
                    color: T.muted,
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Service *
                </label>
                <select
                  value={wiSvc}
                  onChange={(e) => setWiSvc(e.target.value)}
                  style={{
                    width: "100%",
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    padding: "13px 14px",
                    color: wiSvc ? "white" : T.muted,
                    fontSize: 16,
                    ...mono,
                    outline: "none",
                    cursor: "pointer",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = T.amber)}
                  onBlur={(e) => (e.target.style.borderColor = T.border)}
                >
                  <option value="">Select a service...</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — ${s.price}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleWalkIn}
                disabled={wiLoading || !wiName.trim() || !wiSvc}
                style={{
                  padding: "16px",
                  ...sf,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  background:
                    wiLoading || !wiName.trim() || !wiSvc ? T.deep : T.amber,
                  color:
                    wiLoading || !wiName.trim() || !wiSvc ? T.dim : "black",
                  border: "none",
                  cursor:
                    wiLoading || !wiName.trim() || !wiSvc
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.2s",
                  marginTop: 4,
                }}
              >
                {wiLoading ? "Adding Walk-In..." : "Add Walk-In →"}
              </button>
            </div>
          </div>
        )}

        {/* ══ WAITLIST TAB ══ */}
        {activeTab === "waitlist" && (
          <div className="bd-enter">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 1,
                  background: `rgba(245,158,11,0.5)`,
                }}
              />
              <p
                style={{
                  ...mono,
                  fontSize: 8,
                  color: T.amber,
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                }}
              >
                Waitlist
              </p>
            </div>
            {waitlist.length === 0 ? (
              <div
                style={{
                  padding: "60px 20px",
                  textAlign: "center",
                  border: `1px solid ${T.border}`,
                }}
              >
                <p
                  style={{
                    ...sf,
                    fontSize: 9,
                    color: "rgba(255,255,255,0.08)",
                    textTransform: "uppercase",
                  }}
                >
                  Waitlist is empty
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {waitlist.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 18px",
                      background: T.surface,
                      border: `1px solid ${w.notified ? T.border : T.amberBorder}`,
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          ...sf,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          marginBottom: 4,
                        }}
                      >
                        {w.client_name}
                      </p>
                      <div
                        style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
                      >
                        <span style={{ ...mono, fontSize: 10, color: T.muted }}>
                          {w.service_name || w.service}
                        </span>
                        {(w.phone || w.client_phone) && (
                          <span
                            style={{ ...mono, fontSize: 10, color: T.muted }}
                          >
                            {w.phone || w.client_phone}
                          </span>
                        )}
                        {w.date && (
                          <span
                            style={{ ...mono, fontSize: 10, color: T.amber }}
                          >
                            {fmtShort(w.date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => !w.notified && notifyWaitlist(w.id)}
                      disabled={w.notified}
                      style={{
                        padding: "8px 16px",
                        ...sf,
                        fontSize: 7,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        background: w.notified ? T.deep : T.amberDim,
                        border: `1px solid ${w.notified ? T.border : T.amberBorder}`,
                        color: w.notified ? T.dim : T.amber,
                        cursor: w.notified ? "default" : "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {w.notified ? "✓ Notified" : "Notify →"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ CLIENTS TAB ══ */}
        {activeTab === "clients" && (
          <div className="bd-enter">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 1,
                  background: `rgba(245,158,11,0.5)`,
                }}
              />
              <p
                style={{
                  ...mono,
                  fontSize: 8,
                  color: T.amber,
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                }}
              >
                Client Book
              </p>
            </div>

            {/* Search */}
            <input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search clients..."
              style={{
                width: "100%",
                background: T.surface,
                border: `1px solid ${T.border}`,
                padding: "13px 16px",
                color: "white",
                fontSize: 16,
                ...mono,
                outline: "none",
                marginBottom: 16,
              }}
              onFocus={(e) => (e.target.style.borderColor = T.amber)}
              onBlur={(e) => (e.target.style.borderColor = T.border)}
            />

            {clientDetail ? (
              /* Client detail */
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.amberBorder}`,
                  padding: "24px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 14 }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        background: T.amber,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          ...sf,
                          fontSize: 18,
                          fontWeight: 900,
                          color: "black",
                        }}
                      >
                        {clientDetail.name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div>
                      <p
                        style={{
                          ...sf,
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        {clientDetail.name}
                      </p>
                      <p style={{ ...mono, fontSize: 10, color: T.muted }}>
                        {clientDetail.total_visits || 0} visits
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setClientDetail(null)}
                    style={{
                      ...sf,
                      fontSize: 7,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      padding: "7px 14px",
                      background: "transparent",
                      border: `1px solid ${T.border}`,
                      color: T.muted,
                      cursor: "pointer",
                    }}
                  >
                    ← Back
                  </button>
                </div>
                <label
                  style={{
                    ...sf,
                    fontSize: 6,
                    letterSpacing: "0.4em",
                    color: T.muted,
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Notes
                </label>
                <textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  rows={4}
                  placeholder="VIP client, preferred style, allergies..."
                  style={{
                    width: "100%",
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    padding: "12px 14px",
                    color: "white",
                    fontSize: 14,
                    ...mono,
                    outline: "none",
                    resize: "vertical",
                    marginBottom: 12,
                    borderRadius: 0,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = T.amber)}
                  onBlur={(e) => (e.target.style.borderColor = T.border)}
                />
                <button
                  onClick={async () => {
                    setSavingCN(true);
                    try {
                      await API.patch(`barber/clients/${clientDetail.id}/`, {
                        notes: clientNotes,
                      });
                      showToast("Notes saved.");
                    } catch {
                      showToast("Error.", "error");
                    } finally {
                      setSavingCN(false);
                    }
                  }}
                  disabled={savingCN}
                  style={{
                    padding: "12px 24px",
                    background: savingCN ? T.deep : T.amber,
                    color: savingCN ? T.dim : "black",
                    ...sf,
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: savingCN ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {savingCN ? "Saving..." : "Save Notes →"}
                </button>
              </div>
            ) : (
              /* Client list */
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {clients
                  .filter(
                    (c) =>
                      !clientSearch ||
                      c.name
                        ?.toLowerCase()
                        .includes(clientSearch.toLowerCase()),
                  )
                  .map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setClientDetail(c);
                        setClientNotes(c.notes || "");
                      }}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 18px",
                        background: T.surface,
                        border: `1px solid ${c.is_vip ? T.amberBorder : T.border}`,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = T.amber;
                        e.currentTarget.style.background = T.amberDim;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = c.is_vip
                          ? T.amberBorder
                          : T.border;
                        e.currentTarget.style.background = T.surface;
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            background: c.is_vip ? T.amber : T.surface2,
                            border: `1px solid ${c.is_vip ? T.amber : T.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              ...sf,
                              fontSize: 13,
                              fontWeight: 900,
                              color: c.is_vip ? "black" : T.muted,
                            }}
                          >
                            {c.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <p
                            style={{
                              ...sf,
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              marginBottom: 2,
                            }}
                          >
                            {c.name}
                            {c.is_vip && (
                              <span
                                style={{
                                  ...mono,
                                  fontSize: 7,
                                  color: T.amber,
                                  marginLeft: 8,
                                }}
                              >
                                VIP
                              </span>
                            )}
                          </p>
                          <p style={{ ...mono, fontSize: 9, color: T.muted }}>
                            {c.total_visits || 0} visits
                          </p>
                        </div>
                      </div>
                      <span style={{ ...mono, fontSize: 10, color: T.dim }}>
                        →
                      </span>
                    </div>
                  ))}
                {clients.filter(
                  (c) =>
                    !clientSearch ||
                    c.name?.toLowerCase().includes(clientSearch.toLowerCase()),
                ).length === 0 && (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <p
                      style={{
                        ...sf,
                        fontSize: 9,
                        color: "rgba(255,255,255,0.08)",
                        textTransform: "uppercase",
                      }}
                    >
                      No clients found
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ REPORTS TAB ══ */}
        {activeTab === "reports" && (
          <div className="bd-enter">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 32,
                    height: 1,
                    background: `rgba(245,158,11,0.5)`,
                  }}
                />
                <p
                  style={{
                    ...mono,
                    fontSize: 8,
                    color: T.amber,
                    letterSpacing: "0.5em",
                    textTransform: "uppercase",
                  }}
                >
                  Reports
                </p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["week", "month", "year"].map((k) => (
                  <button
                    key={k}
                    onClick={() => setReportPeriod(k)}
                    style={{
                      padding: "8px 16px",
                      ...sf,
                      fontSize: 7,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      background: reportPeriod === k ? T.amber : T.surface,
                      color: reportPeriod === k ? "black" : T.muted,
                      border: `1px solid ${reportPeriod === k ? T.amber : T.border}`,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {!reports ? (
              <div style={{ padding: "40px 0", textAlign: "center" }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: `1.5px solid ${T.amberBorder}`,
                    borderTopColor: T.amber,
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto",
                  }}
                />
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "repeat(2,1fr)"
                      : "repeat(4,1fr)",
                    gap: 8,
                    marginBottom: 24,
                  }}
                >
                  {[
                    {
                      label: "Total Cuts",
                      value:
                        reports.summary?.total ||
                        reports.total_appointments ||
                        0,
                      amber: true,
                    },
                    {
                      label: "Completed",
                      value:
                        reports.summary?.completed || reports.completed || 0,
                      amber: false,
                    },
                    {
                      label: "Online Rev",
                      value: `$${reports.summary?.online_revenue || reports.online_revenue || "0.00"}`,
                      amber: false,
                    },
                    {
                      label: "No Shows",
                      value: reports.summary?.no_shows || reports.no_shows || 0,
                      amber: false,
                    },
                  ].map(({ label, value, amber }) => (
                    <div
                      key={label}
                      style={{
                        padding: "18px 16px",
                        background: amber ? T.amberDim : T.surface,
                        border: `1px solid ${amber ? T.amberBorder : T.border}`,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          width: 40,
                          height: 40,
                          background: amber
                            ? "linear-gradient(225deg,rgba(245,158,11,0.2),transparent)"
                            : "linear-gradient(225deg,rgba(255,255,255,0.03),transparent)",
                        }}
                      />
                      <p
                        style={{
                          ...sf,
                          fontSize: 5,
                          letterSpacing: "0.35em",
                          color: amber ? T.amber : T.muted,
                          textTransform: "uppercase",
                          marginBottom: 10,
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          ...sf,
                          fontSize: 26,
                          fontWeight: 900,
                          color: amber ? T.amber : "white",
                          lineHeight: 1,
                          margin: 0,
                        }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Services breakdown */}
                {reports.services?.length > 0 && (
                  <div
                    style={{
                      marginBottom: 20,
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      padding: "20px",
                    }}
                  >
                    <p
                      style={{
                        ...sf,
                        fontSize: 6,
                        letterSpacing: "0.4em",
                        color: T.muted,
                        textTransform: "uppercase",
                        marginBottom: 16,
                      }}
                    >
                      Top Services
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {reports.services.map((s, i) => {
                        const total =
                          reports.services[0]?.bookings ||
                          reports.services[0]?.count ||
                          1;
                        const cnt = s.bookings || s.count || 0;
                        const pct = Math.round((cnt / total) * 100);
                        return (
                          <div key={i}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 5,
                              }}
                            >
                              <span
                                style={{
                                  ...mono,
                                  fontSize: 11,
                                  color: "#a1a1aa",
                                }}
                              >
                                {s.name || s.service_name}
                              </span>
                              <span
                                style={{
                                  ...sf,
                                  fontSize: 10,
                                  color: T.amber,
                                  fontWeight: 900,
                                }}
                              >
                                {cnt}
                              </span>
                            </div>
                            <div
                              style={{
                                height: 2,
                                background: T.border,
                                borderRadius: 1,
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${pct}%`,
                                  background: T.amber,
                                  transition: "width 1s ease",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Busiest hours */}
                {reports.busiest_hours?.length > 0 && (
                  <div
                    style={{
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      padding: "20px",
                    }}
                  >
                    <p
                      style={{
                        ...sf,
                        fontSize: 6,
                        letterSpacing: "0.4em",
                        color: T.muted,
                        textTransform: "uppercase",
                        marginBottom: 16,
                      }}
                    >
                      Busiest Hours
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 4,
                        height: 80,
                        overflowX: "auto",
                      }}
                    >
                      {reports.busiest_hours.map((h, i) => {
                        const maxC = Math.max(
                          ...reports.busiest_hours.map(
                            (x) => x.bookings || x.count || 0,
                          ),
                        );
                        const cnt = h.bookings || h.count || 0;
                        const pct = maxC > 0 ? (cnt / maxC) * 100 : 0;
                        return (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 4,
                              flex: 1,
                              minWidth: 36,
                            }}
                          >
                            <div
                              style={{
                                width: "100%",
                                background: T.amber,
                                opacity: 0.4 + pct / 150,
                                height: `${Math.max(pct, 4)}%`,
                                transition: "height 0.5s ease",
                              }}
                            />
                            <span
                              style={{
                                ...mono,
                                fontSize: 8,
                                color: T.dim,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {h.label ||
                                fmtTime(
                                  String(h.hour || 0).padStart(2, "0") + ":00",
                                )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ AVAILABILITY TAB ══ */}
        {activeTab === "availability" && (
          <div className="bd-enter" style={{ maxWidth: 640 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 1,
                  background: `rgba(245,158,11,0.5)`,
                }}
              />
              <p
                style={{
                  ...mono,
                  fontSize: 8,
                  color: T.amber,
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                }}
              >
                My Hours
              </p>
            </div>
            <p
              style={{
                ...mono,
                fontSize: 12,
                color: T.muted,
                lineHeight: 1.7,
                marginBottom: 24,
              }}
            >
              Set your working hours for each day. Clients can only book during
              these times.
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
                      overflow: "hidden",
                      transition: "all 0.2s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 18px",
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
                                : saved && isWorking
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
                            padding: "6px 14px",
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
                          padding: "16px 18px",
                          borderTop: `1px solid ${T.border}`,
                          background: T.amberDim,
                        }}
                      >
                        <div
                          style={{ display: "flex", gap: 6, marginBottom: 14 }}
                        >
                          {[
                            { v: true, l: "Working" },
                            { v: false, l: "Day Off" },
                          ].map(({ v, l }) => (
                            <button
                              key={l}
                              onClick={() => setEditWorking(v)}
                              style={{
                                flex: 1,
                                padding: "9px",
                                ...sf,
                                fontSize: 7,
                                textTransform: "uppercase",
                                letterSpacing: "0.15em",
                                background:
                                  editWorking === v ? T.amber : "transparent",
                                color: editWorking === v ? "black" : T.muted,
                                border: `1px solid ${editWorking === v ? T.amber : T.border}`,
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                            >
                              {l}
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
                              { l: "Start", v: editStart, s: setEditStart },
                              { l: "End", v: editEnd, s: setEditEnd },
                            ].map(({ l, v, s }) => (
                              <div key={l}>
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
                                  {l}
                                </label>
                                <input
                                  type="time"
                                  value={v}
                                  onChange={(e) => s(e.target.value)}
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
                            background: savingAvail ? T.deep : T.amber,
                            color: savingAvail ? T.dim : "black",
                            ...sf,
                            fontSize: 7,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            border: "none",
                            cursor: savingAvail ? "not-allowed" : "pointer",
                            transition: "all 0.2s",
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

        {/* ══ TIME OFF TAB ══ */}
        {activeTab === "timeoff" && (
          <div className="bd-enter" style={{ maxWidth: 600 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 1,
                  background: `rgba(245,158,11,0.5)`,
                }}
              />
              <p
                style={{
                  ...mono,
                  fontSize: 8,
                  color: T.amber,
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                }}
              >
                Time Off
              </p>
            </div>
            <p
              style={{
                ...mono,
                fontSize: 12,
                color: T.muted,
                lineHeight: 1.7,
                marginBottom: 24,
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
                marginBottom: 20,
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
                {[
                  {
                    label: "Date",
                    type: "date",
                    val: newTimeOffDate,
                    set: setNewTimeOffDate,
                    min: today,
                  },
                  {
                    label: "Reason (optional)",
                    type: "text",
                    val: newTimeOffReason,
                    set: setNewTimeOffReason,
                    placeholder: "Vacation, personal, etc.",
                  },
                ].map(({ label, type, val, set, min, placeholder }) => (
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
                      type={type}
                      value={val}
                      min={min}
                      onChange={(e) => set(e.target.value)}
                      placeholder={placeholder}
                      style={{
                        width: "100%",
                        background: T.bg,
                        border: `1px solid ${T.border}`,
                        padding: "11px 12px",
                        color: "white",
                        fontSize: type === "date" ? 14 : 16,
                        outline: "none",
                        ...mono,
                      }}
                      onFocus={(e) => (e.target.style.borderColor = T.amber)}
                      onBlur={(e) => (e.target.style.borderColor = T.border)}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={addTimeOff}
                disabled={!newTimeOffDate || addingTimeOff}
                style={{
                  padding: "11px 24px",
                  background:
                    !newTimeOffDate || addingTimeOff ? T.deep : T.amber,
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
                    fontSize: 9,
                    color: "rgba(255,255,255,0.08)",
                    textTransform: "uppercase",
                  }}
                >
                  No dates blocked
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
                      padding: "14px 18px",
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
                          fontSize: 9,
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
                        padding: "7px 14px",
                        background: "transparent",
                        border: `1px solid ${T.redBorder}`,
                        color: T.red,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = T.redDim)
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
    </>
  );
}
