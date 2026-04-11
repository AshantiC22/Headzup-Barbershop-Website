"use client";

// Disable static prerendering — dashboard requires auth + live data
export const dynamic = "force-dynamic";

const validPhoto = (url) => {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  if (url.startsWith("https://")) return url;
  return null;
};
// HEADZ UP — Barber Dashboard v4
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";
import useBreakpoint from "@/lib/useBreakpoint";

// Pre-warm Railway container — fires immediately on page load, no await
// This reduces perceived latency by waking the backend before the user needs it
if (typeof window !== "undefined") {
  fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/barbers/`,
    {
      method: "HEAD",
      signal: AbortSignal.timeout?.(8000),
    },
  ).catch(() => {});
}

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
  muted: "#a1a1aa",
  dim: "#71717a",
  deep: "#52525b",
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
  pending_shop: {
    label: "Awaiting Arrival",
    color: "#fb923c",
    bg: "rgba(251,146,60,0.08)",
    border: "rgba(251,146,60,0.2)",
  },
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
  onStrike,
  isMobile,
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(appt.barber_notes || "");
  const [saving, setSaving] = useState(false);
  const status = appt.status || "confirmed";
  const sCfg = STATUS_CFG[status] || STATUS_CFG.confirmed;
  const isOnline = appt.payment_method === "online";
  const hasDeposit = appt.deposit_paid;

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
      <div
        style={{
          height: 2,
          background: `linear-gradient(to right,${sCfg.color},transparent)`,
          opacity: 0.7,
        }}
      />
      <div
        style={{
          padding: isMobile ? "14px 12px" : "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 8 : 16,
          flexWrap: "wrap",
        }}
      >
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              ...sf,
              fontSize: isMobile ? 10 : 12,
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 5,
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
            <span style={{ ...mono, fontSize: 10, color: "#d4d4d4" }}>
              {appt.client_name || appt.client || appt.username || "Client"}
            </span>
            {appt.barber_name && (
              <span style={{ ...mono, fontSize: 9, color: T.amber }}>
                ✂️ {appt.barber_name}
              </span>
            )}
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
          <div
            style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}
          >
            {appt.barber_name && (
              <span style={{ ...mono, fontSize: 9, color: T.amber }}>
                ✂ {appt.barber_name}
              </span>
            )}
            <span style={{ ...mono, fontSize: 9, color: "#71717a" }}>
              📍 2509 W 4th St, Hattiesburg, MS
            </span>
          </div>
        </div>
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
          {hasDeposit && (
            <span
              style={{
                ...sf,
                fontSize: 5,
                letterSpacing: "0.15em",
                padding: "3px 8px",
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.25)",
                color: "#4ade80",
              }}
            >
              💰 DEPOSIT
            </span>
          )}
          {isOnline && !hasDeposit && (
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

      {open && (
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            padding: "16px 20px",
            background: T.amberDim,
          }}
        >
          {/* Confirm Arrival — shown prominently for pending_shop */}
          {status === "pending_shop" && (
            <div
              style={{
                marginBottom: 16,
                padding: "14px 16px",
                background: "rgba(251,146,60,0.08)",
                border: "1px solid rgba(251,146,60,0.3)",
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 6,
                  letterSpacing: "0.35em",
                  color: "#fb923c",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                📍 Client Arrival
              </p>
              <p
                style={{
                  ...mono,
                  fontSize: 11,
                  color: "#a1a1aa",
                  marginBottom: 12,
                  lineHeight: 1.6,
                }}
              >
                Tap when the client arrives and pays. This confirms their spot
                and releases reminders. Slots not confirmed within 1 hour of
                appointment time are auto-released.
              </p>
              <button
                onClick={() =>
                  onStatusChange && onStatusChange(appt.id, "confirmed")
                }
                style={{
                  padding: "11px 24px",
                  background: "#fb923c",
                  color: "black",
                  ...sf,
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  clipPath:
                    "polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "white")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#fb923c")
                }
              >
                ✓ Confirm Arrival — Client Paid
              </button>
            </div>
          )}

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

          {(status === "confirmed" || status === "no_show") && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                background: "rgba(239,68,68,0.04)",
                border: "1px solid rgba(239,68,68,0.12)",
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 6,
                  letterSpacing: "0.4em",
                  color: "#ef4444",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                ⚡ Issue Strike
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => onStrike && onStrike(appt.id, "no_show")}
                  style={{
                    padding: "7px 14px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#f87171",
                    ...sf,
                    fontSize: 6,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(239,68,68,0.15)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(239,68,68,0.08)")
                  }
                >
                  No Show +1 Strike
                </button>
                <button
                  onClick={() => onStrike && onStrike(appt.id, "late_cancel")}
                  style={{
                    padding: "7px 14px",
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    color: "#f59e0b",
                    ...sf,
                    fontSize: 6,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(245,158,11,0.12)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(245,158,11,0.06)")
                  }
                >
                  Late Cancel +1 Strike
                </button>
              </div>
              <p
                style={{
                  ...mono,
                  fontSize: 9,
                  color: "#52525b",
                  marginTop: 8,
                  lineHeight: 1.6,
                }}
              >
                Strike 1 = warning, deposit stays $10. Strike 2+ = deposit
                increases $1.50 each time.
              </p>
            </div>
          )}

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

/* ── Stripe Connect Panel ─────────────────────────────────────────────────── */
function StripeConnectPanel({ barber, isMobile }) {
  const sf = { fontFamily: "'Syncopate',sans-serif" };
  const mono = { fontFamily: "'DM Mono',monospace" };
  const [status, setStatus] = useState(null); // null=loading, obj=loaded
  const [connecting, setConnecting] = useState(false);
  const [opening, setOpening] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    API.get("barber/stripe/status/")
      .then((r) => setStatus(r.data))
      .catch(() => setStatus({ connected: false, charges_enabled: false }));
  }, []);

  // Handle return from Stripe onboarding
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("stripe") === "connected") {
      API.get("barber/stripe/status/")
        .then((r) => setStatus(r.data))
        .catch(() => {});
      window.history.replaceState({}, "", "/barber-dashboard");
    }
    if (p.get("stripe") === "refresh") {
      window.history.replaceState({}, "", "/barber-dashboard");
    }
  }, []);

  const connectStripe = async () => {
    setConnecting(true);
    setErr("");
    try {
      const r = await API.post("barber/stripe/connect/");
      window.location.href = r.data.url;
    } catch (e) {
      setErr(e.response?.data?.error || "Could not connect. Try again.");
      setConnecting(false);
    }
  };

  const openDashboard = async () => {
    setOpening(true);
    setErr("");
    try {
      const r = await API.get("barber/stripe/dashboard/");
      window.open(r.data.url, "_blank");
    } catch (e) {
      setErr(e.response?.data?.error || "Could not open dashboard.");
    } finally {
      setOpening(false);
    }
  };

  if (!status)
    return (
      <div
        style={{
          padding: "20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            border: "2px solid rgba(245,158,11,0.2)",
            borderTopColor: "#f59e0b",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span style={{ ...mono, fontSize: 11, color: "#52525b" }}>
          Checking Stripe status...
        </span>
      </div>
    );

  const connected = status.connected && status.details_submitted;
  const chargesEnabled = status.charges_enabled;
  const fullySetUp = connected && chargesEnabled;

  return (
    <div style={{ marginBottom: 32 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Status banner */}
      <div
        style={{
          padding: "20px 22px",
          background: fullySetUp
            ? "rgba(34,197,94,0.06)"
            : "rgba(245,158,11,0.06)",
          border: `1px solid ${fullySetUp ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.25)"}`,
          clipPath:
            "polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Stripe logo block */}
            <div
              style={{
                width: 48,
                height: 48,
                background: "#635bff",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: fullySetUp ? "0 0 20px rgba(99,91,255,0.4)" : "none",
              }}
            >
              <span
                style={{
                  ...sf,
                  fontSize: 18,
                  fontWeight: 900,
                  color: "white",
                  letterSpacing: "-0.05em",
                }}
              >
                S
              </span>
            </div>
            <div>
              <p
                style={{
                  ...sf,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "white",
                  margin: "0 0 4px",
                  letterSpacing: "0.04em",
                }}
              >
                Stripe Payments
              </p>
              {fullySetUp ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      background: "#22c55e",
                      borderRadius: "50%",
                    }}
                  />
                  <p
                    style={{
                      ...mono,
                      fontSize: 11,
                      color: "#4ade80",
                      margin: 0,
                    }}
                  >
                    Connected · Accepting payments
                  </p>
                </div>
              ) : connected && !chargesEnabled ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      background: "#f59e0b",
                      borderRadius: "50%",
                    }}
                  />
                  <p
                    style={{
                      ...mono,
                      fontSize: 11,
                      color: "#f59e0b",
                      margin: 0,
                    }}
                  >
                    Setup incomplete — finish onboarding
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      background: "#52525b",
                      borderRadius: "50%",
                    }}
                  />
                  <p
                    style={{
                      ...mono,
                      fontSize: 11,
                      color: "#71717a",
                      margin: 0,
                    }}
                  >
                    Not connected — clients can't pay online yet
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {fullySetUp ? (
              <>
                <button
                  onClick={openDashboard}
                  disabled={opening}
                  style={{
                    padding: "10px 18px",
                    background: "#635bff",
                    color: "white",
                    ...sf,
                    fontSize: 7.5,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: opening ? "wait" : "pointer",
                    clipPath:
                      "polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px))",
                    boxShadow: "0 0 20px rgba(99,91,255,0.3)",
                    transition: "opacity 0.2s",
                    minHeight: "auto",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  {opening ? "Opening..." : "$ View Earnings →"}
                </button>
                <button
                  onClick={connectStripe}
                  disabled={connecting}
                  style={{
                    padding: "10px 16px",
                    background: "transparent",
                    color: "#52525b",
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    minHeight: "auto",
                    clipPath:
                      "polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "white";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#52525b";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                >
                  Manage
                </button>
              </>
            ) : (
              <button
                onClick={connectStripe}
                disabled={connecting}
                style={{
                  padding: "12px 22px",
                  background: "#635bff",
                  color: "white",
                  ...sf,
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  border: "none",
                  cursor: connecting ? "wait" : "pointer",
                  clipPath:
                    "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                  boxShadow: "0 0 24px rgba(99,91,255,0.35)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: "auto",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {connecting ? (
                  <>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "white",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Connecting...
                  </>
                ) : connected ? (
                  "Finish Setup →"
                ) : (
                  "Connect Stripe →"
                )}
              </button>
            )}
          </div>
        </div>

        {err && (
          <p style={{ ...mono, fontSize: 11, color: "#f87171", marginTop: 12 }}>
            ⚠ {err}
          </p>
        )}
      </div>

      {/* How it works */}
      {!fullySetUp && (
        <div
          style={{
            padding: "16px 18px",
            background: "rgba(99,91,255,0.04)",
            border: "1px solid rgba(99,91,255,0.12)",
          }}
        >
          <p
            style={{
              ...mono,
              fontSize: 8,
              color: "#635bff",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            How It Works
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              ["01", "Client books & pays online with their card"],
              ["02", "Stripe processes the payment securely"],
              ["03", "Money goes directly into your Stripe balance"],
              ["04", "Withdraw anytime to your bank → then to Cash App"],
            ].map(([n, t]) => (
              <div
                key={n}
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <span
                  style={{
                    ...mono,
                    fontSize: 8,
                    color: "#635bff",
                    minWidth: 20,
                    flexShrink: 0,
                  }}
                >
                  {n}
                </span>
                <span
                  style={{
                    ...mono,
                    fontSize: 11,
                    color: "#71717a",
                    lineHeight: 1.6,
                  }}
                >
                  {t}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earnings summary if connected */}
      {fullySetUp && (
        <div
          style={{
            padding: "14px 16px",
            background: "rgba(99,91,255,0.04)",
            border: "1px solid rgba(99,91,255,0.1)",
          }}
        >
          <p
            style={{
              ...mono,
              fontSize: 10,
              color: "rgba(99,91,255,0.7)",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            ✓ When clients pay online, money goes straight to your Stripe
            balance.
            <br />
            Click <strong>"View Earnings"</strong> to see your balance and
            withdraw to your bank account.
            <br />
            From your bank you can instantly move it to Cash App.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Cash App Tag Field (kept as backup) ─────────────────────────────────── */
function CashAppTagField({ barber, onUpdate }) {
  const sf = { fontFamily: "'Syncopate',sans-serif" };
  const mono = { fontFamily: "'DM Mono',monospace" };
  const [tag, setTag] = useState(barber?.cashapp_tag || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!tag.trim()) {
      setErr("Enter your $cashtag");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const cleanTag = tag.trim().startsWith("$")
        ? tag.trim()
        : `$${tag.trim()}`;
      await API.patch("barber/me/update/", { cashapp_tag: cleanTag });
      setTag(cleanTag);
      onUpdate && onUpdate(cleanTag);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e.response?.data?.error || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {err && (
        <p style={{ ...mono, fontSize: 11, color: "#f87171", marginBottom: 8 }}>
          ⚠ {err}
        </p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              ...mono,
              fontSize: 16,
              color: "#00d45f",
              pointerEvents: "none",
            }}
          >
            $
          </span>
          <input
            type="text"
            value={tag.startsWith("$") ? tag.slice(1) : tag}
            onChange={(e) => {
              setTag(e.target.value);
              setSaved(false);
            }}
            placeholder="YourCashTag"
            style={{
              width: "100%",
              background: "#0a0a0a",
              border: "1px solid rgba(0,212,95,0.3)",
              padding: "12px 12px 12px 28px",
              color: "white",
              fontSize: 15,
              outline: "none",
              ...mono,
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#00d45f")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(0,212,95,0.3)")}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: "12px 20px",
            background: saved ? "#22c55e" : "#00d45f",
            color: "black",
            ...sf,
            fontSize: 7.5,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
            minHeight: "auto",
            clipPath:
              "polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",
            transition: "background 0.2s",
          }}
        >
          {saving ? "..." : saved ? "✓ Saved" : "Save"}
        </button>
      </div>
      {barber?.cashapp_tag && (
        <p
          style={{
            ...mono,
            fontSize: 11,
            color: "rgba(0,212,95,0.6)",
            marginTop: 8,
          }}
        >
          Current: {barber.cashapp_tag}
        </p>
      )}
    </div>
  );
}

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
  const sf = { fontFamily: "'Syncopate',sans-serif" };
  const mono = { fontFamily: "'DM Mono',monospace" };

  // First day of month (0=Sun) and total days
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Build cells array — nulls for leading blanks
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Count appointments per date for the badge
  const apptCount = {};
  (apptDates || []).forEach((d) => {
    apptCount[d] = (apptCount[d] || 0) + 1;
  });

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        clipPath:
          "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#000",
          padding: "14px 16px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={onPrev}
          style={{
            width: 32,
            height: 32,
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
            e.currentTarget.style.background = T.amberDim;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.border;
            e.currentTarget.style.color = T.muted;
            e.currentTarget.style.background = "transparent";
          }}
        >
          ‹
        </button>
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              ...sf,
              fontSize: 8,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "white",
              margin: 0,
            }}
          >
            {monthLabel}
          </p>
        </div>
        <button
          onClick={onNext}
          style={{
            width: 32,
            height: 32,
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
            e.currentTarget.style.background = T.amberDim;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.border;
            e.currentTarget.style.color = T.muted;
            e.currentTarget.style.background = "transparent";
          }}
        >
          ›
        </button>
      </div>

      <div style={{ padding: "12px 12px 14px" }}>
        {/* Day labels */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            marginBottom: 6,
          }}
        >
          {DAY_LABELS.map((d) => (
            <p
              key={d}
              style={{
                ...sf,
                fontSize: 5.5,
                textAlign: "center",
                color: d === "Sun" || d === "Sat" ? "#52525b" : T.dim,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                margin: 0,
                padding: "4px 0",
              }}
            >
              {d}
            </p>
          ))}
        </div>

        {/* Calendar grid */}
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
            const count = apptCount[iso] || 0;
            const hasAppt = count > 0;
            const isPast = iso < today;
            const isSun = new Date(year, month, d).getDay() === 0;
            const isSat = new Date(year, month, d).getDay() === 6;
            const isWeekend = isSun || isSat;

            return (
              <button
                key={i}
                onClick={() => onSelect(iso)}
                style={{
                  padding: "5px 2px 6px",
                  background: isSel
                    ? T.amber
                    : isToday
                      ? T.amberDim
                      : "transparent",
                  border: `1px solid ${isSel ? T.amber : isToday ? T.amberBorder : "transparent"}`,
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.15s",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  borderRadius: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isSel) {
                    e.currentTarget.style.background = T.amberDim;
                    e.currentTarget.style.borderColor = T.amberBorder;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSel) {
                    e.currentTarget.style.background = isToday
                      ? T.amberDim
                      : "transparent";
                    e.currentTarget.style.borderColor = isToday
                      ? T.amberBorder
                      : "transparent";
                  }
                }}
              >
                {/* Day number */}
                <span
                  style={{
                    ...sf,
                    fontSize: 10,
                    fontWeight: isSel || isToday ? 900 : 400,
                    color: isSel
                      ? "black"
                      : isToday
                        ? T.amber
                        : isPast
                          ? "#3f3f46"
                          : isWeekend
                            ? "#71717a"
                            : "#d4d4d4",
                    lineHeight: 1,
                  }}
                >
                  {d}
                </span>

                {/* Appointment dot(s) */}
                {hasAppt && (
                  <div
                    style={{
                      display: "flex",
                      gap: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {count >= 1 && (
                      <div
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: isSel ? "rgba(0,0,0,0.5)" : T.amber,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    {count >= 3 && (
                      <div
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: isSel ? "rgba(0,0,0,0.4)" : "#f59e0b",
                          flexShrink: 0,
                          opacity: 0.7,
                        }}
                      />
                    )}
                    {count >= 5 && (
                      <div
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: isSel ? "rgba(0,0,0,0.3)" : "#ef4444",
                          flexShrink: 0,
                          opacity: 0.7,
                        }}
                      />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 12,
            paddingTop: 10,
            borderTop: `1px solid ${T.border}`,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div
              style={{
                width: 8,
                height: 8,
                background: T.amber,
                borderRadius: "50%",
              }}
            />
            <span style={{ ...mono, fontSize: 8, color: "#52525b" }}>
              Appointments
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div
              style={{
                width: 12,
                height: 12,
                background: T.amberDim,
                border: `1px solid ${T.amberBorder}`,
              }}
            />
            <span style={{ ...mono, fontSize: 8, color: "#52525b" }}>
              Today
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 12, height: 12, background: T.amber }} />
            <span style={{ ...mono, fontSize: 8, color: "#52525b" }}>
              Selected
            </span>
          </div>
        </div>
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
  const [allBarbers, setAllBarbers] = useState([]);
  const [pricingList, setPricingList] = useState([]); // [{id,name,default_price,custom_price,effective_price,is_custom}]
  const [pricingEdits, setPricingEdits] = useState({}); // {serviceId: "newValue"} editing state
  const [pricingSaving, setPricingSaving] = useState({}); // {serviceId: true/false}
  const [wiSvc, setWiSvc] = useState("");
  const [wiName, setWiName] = useState("");
  const [wiPhone, setWiPhone] = useState("");
  const [wiNotes, setWiNotes] = useState("");
  const [wiLoading, setWiLoading] = useState(false);
  const [wiEmail, setWiEmail] = useState("");
  const [wiBarber, setWiBarber] = useState(""); // barber id for walk-in
  const [wiDate, setWiDate] = useState(todayISO());
  const [wiTime, setWiTime] = useState("");
  const [wiSlots, setWiSlots] = useState([]);
  const [wiBooked, setWiBooked] = useState([]);
  const [wiSlotsLoad, setWiSlotsLoad] = useState(false);
  const [wiSuccess, setWiSuccess] = useState(null); // {name, service, time}

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

  /* pay-in-shop payment tracker */
  const [shopPayments, setShopPayments] = useState({}); // appt.id -> "pending"|"received"
  const [blockList, setBlockList] = useState([]); // blocked client usernames
  // Newsletter
  const [nlPosts, setNlPosts] = useState([]);
  const [nlLoading, setNlLoading] = useState(false);
  const [nlForm, setNlForm] = useState({
    title: "",
    body: "",
    category: "general",
    emoji: "✂️",
    pinned: false,
  });
  const [nlEditing, setNlEditing] = useState(null);
  const [nlError, setNlError] = useState("");
  const [nlSuccess, setNlSuccess] = useState("");
  // Photo upload
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Reschedules
  const [reschedules, setReschedules] = useState([]);
  const [reschedLoading, setReschedLoading] = useState(false);

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
        const [barberRes, schedRes, svcRes, barbersRes] = await Promise.all([
          API.get("barber/me/"),
          API.get(`barber/schedule/?date=${todayISO()}`),
          API.get("services/"),
          API.get("barbers/"),
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
        setAllBarbers(
          Array.isArray(barbersRes.data)
            ? barbersRes.data
            : barbersRes.data.results || [],
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

  /* load all appt dates for calendar dots — load 180 days ahead */
  useEffect(() => {
    API.get("barber/schedule/?days=180")
      .then((r) => {
        const arr = Array.isArray(r.data)
          ? r.data
          : r.data.appointments || r.data.results || [];
        // Store as array of {date, count} objects for the badge
        const dateArr = arr.map((a) => a.date);
        setAllApptDates(dateArr);
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
  useEffect(() => {
    if (activeTab !== "pricing") return;
    API.get("barber/service-prices/")
      .then((r) => {
        setPricingList(r.data);
        setPricingEdits({});
      })
      .catch(() => {});
  }, [activeTab]);

  const loadNewsletter = useCallback(async () => {
    setNlLoading(true);
    try {
      const r = await API.get("newsletter/manage/");
      setNlPosts(r.data);
    } catch {
    } finally {
      setNlLoading(false);
    }
  }, []);
  useEffect(() => {
    if (activeTab === "newsletter") loadNewsletter();
  }, [activeTab, loadNewsletter]);

  const loadReschedules = useCallback(async () => {
    setReschedLoading(true);
    try {
      const r = await API.get("barber/reschedules/");
      setReschedules(r.data);
    } catch {
    } finally {
      setReschedLoading(false);
    }
  }, []);
  useEffect(() => {
    if (activeTab === "reschedules") loadReschedules();
  }, [activeTab, loadReschedules]);

  // Load pending reschedule count on mount so notification badge shows immediately
  useEffect(() => {
    API.get("barber/reschedules/")
      .then((r) => {
        if (Array.isArray(r.data)) setReschedules(r.data);
      })
      .catch(() => {});
  }, []);

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

  const issueStrike = async (id, reason) => {
    const label = reason === "no_show" ? "no-show" : "late cancellation";
    if (
      !confirm(
        `Issue a strike to this client for ${label}? Their deposit fee will increase by $1.50 on their next booking.`,
      )
    )
      return;
    try {
      const r = await API.post(`barber/appointments/${id}/strike/`, { reason });
      setSchedule((p) =>
        p.map((a) =>
          a.id === id
            ? { ...a, status: reason === "no_show" ? "no_show" : "cancelled" }
            : a,
        ),
      );
      const strikes = r.data.strike_count;
      const deposit = r.data.next_deposit;
      const msg =
        strikes === 1
          ? `⚡ Strike 1 issued — this is a warning. Deposit stays $${deposit} but will increase if they strike again.`
          : `⚡ Strike ${strikes} issued — next deposit is now $${deposit} (+$${(parseFloat(deposit) - 10).toFixed(2)} increase)`;
      showToast(msg);
    } catch (e) {
      showToast(e.response?.data?.error || "Could not issue strike.", "error");
    }
  };

  const handleCancel = async (id) => {
    const appt = schedule.find((a) => a.id === id);
    const clientName = appt?.client_name || appt?.user_name || "this client";
    if (
      !confirm(
        `Cancel appointment for ${clientName}?\n\nThey will receive a cancellation email immediately.`,
      )
    )
      return;
    try {
      // Use DELETE endpoint — fires send_cancellation_email(cancelled_by="barber") to client
      await API.delete(`barber/appointments/${id}/`);
      setSchedule((p) => p.filter((a) => a.id !== id));
      showToast(`✓ Cancelled — ${clientName} has been notified by email.`);
    } catch (e) {
      // Fallback: if delete fails try patch
      try {
        await API.patch(`barber/appointments/${id}/`, { status: "cancelled" });
        setSchedule((p) =>
          p.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)),
        );
        showToast("Appointment cancelled.");
      } catch {
        showToast("Could not cancel.", "error");
      }
    }
  };

  // Fetch available slots for walk-in when barber+date changes
  useEffect(() => {
    if (!wiBarber || !wiDate) return;
    setWiSlotsLoad(true);
    setWiSlots([]);
    setWiBooked([]);
    setWiTime("");
    API.get(`available-slots/?barber=${wiBarber}&date=${wiDate}`)
      .then((r) => {
        setWiSlots(r.data.available_slots || []);
        setWiBooked(r.data.booked_slots || []);
      })
      .catch(() => {})
      .finally(() => setWiSlotsLoad(false));
  }, [wiBarber, wiDate]);

  const handleWalkIn = async () => {
    if (!wiName.trim() || !wiSvc || !wiTime) {
      showToast("Name, service and time required.", "error");
      return;
    }
    const targetBarber = wiBarber || barber?.id;
    if (!targetBarber) {
      showToast("Select a barber.", "error");
      return;
    }
    setWiLoading(true);
    try {
      let time24 = wiTime;
      if (wiTime.includes("AM") || wiTime.includes("PM")) {
        const [t, mod] = wiTime.split(" ");
        let [h, m] = t.split(":");
        if (h === "12") h = "00";
        if (mod === "PM") h = String(parseInt(h) + 12);
        time24 = `${h.padStart(2, "0")}:${m}:00`;
      }
      const payload = {
        client_name: wiName.trim(),
        service_id: wiSvc,
        barber_id: targetBarber,
        date: wiDate,
        time: time24,
        notes: wiNotes,
        phone: wiPhone,
        email: wiEmail,
        is_walk_in: true,
      };
      await API.post("barber/walk-in/", payload);
      const svcName =
        services.find((s) => String(s.id) === String(wiSvc))?.name || "service";
      setWiSuccess({
        name: wiName.trim(),
        service: svcName,
        time: wiTime,
        date: wiDate,
      });
      setWiName("");
      setWiPhone("");
      setWiNotes("");
      setWiSvc("");
      setWiEmail("");
      setWiTime("");
      setWiSlots([]);
      setWiBooked([]);
      loadSchedule(selectedDate);
      showToast(
        `✓ ${wiName} added${wiPhone || wiEmail ? " — welcome message sent!" : ""}`,
      );
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
    { key: "reschedules", label: "Reschedules", icon: "↻" },
    { key: "walkin", label: "Walk-In", icon: "✂️" },
    { key: "waitlist", label: "Waitlist", icon: "⏳" },
    { key: "clients", label: "Clients", icon: "👤" },
    { key: "reports", label: "Reports", icon: "📊" },
    { key: "newsletter", label: "Newsletter", icon: "📣" },
    { key: "pricing", label: "Pricing", icon: "💲" },
    { key: "availability", label: "My Hours", icon: "⏰" },
    { key: "timeoff", label: "Time Off", icon: "🏖" },
  ];

  return (
    <>
      <style jsx global>{`
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
            height: isMobile ? 56 : 60,
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
                <span style={{ ...mono, fontSize: 11, color: "#a1a1aa" }}>
                  {barber.name}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: isMobile ? "10px 14px" : "9px 16px",
                ...sf,
                fontSize: isMobile ? 7 : 7,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                background: "rgba(248,113,113,0.12)",
                border: "1px solid rgba(248,113,113,0.5)",
                color: "#f87171",
                cursor: "pointer",
                transition: "all 0.2s",
                fontWeight: 700,
                clipPath:
                  "polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px))",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(248,113,113,0.22)";
                e.currentTarget.style.borderColor = "rgba(248,113,113,0.8)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(248,113,113,0.12)";
                e.currentTarget.style.borderColor = "rgba(248,113,113,0.5)";
              }}
            >
              {isMobile ? "⏻ Sign Out" : "⏻ Sign Out"}
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
          {TABS.map(({ key, label, icon }) => {
            const pendingCount =
              key === "reschedules"
                ? reschedules.filter((r) => r.status === "pending").length
                : 0;
            return (
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
                  position: "relative",
                }}
              >
                <span
                  style={{ fontSize: isMobile ? 18 : 12, position: "relative" }}
                >
                  {icon}
                  {pendingCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -6,
                        width: 14,
                        height: 14,
                        background: "#ef4444",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          ...mono,
                          fontSize: 7,
                          color: "white",
                          fontWeight: 900,
                          lineHeight: 1,
                        }}
                      >
                        {pendingCount}
                      </span>
                    </span>
                  )}
                </span>
                <span
                  style={{ fontSize: isMobile ? "clamp(7px,2vw,9px)" : "7px" }}
                >
                  {label}
                </span>
              </button>
            );
          })}
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
                  fontSize: "clamp(1.4rem,3.5vw,2.8rem)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  lineHeight: isMobile ? 1.1 : 0.88,
                  letterSpacing: "-0.03em",
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
                    fontSize: isMobile ? 22 : 28,
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
        {/* ══ RESCHEDULES TAB ══ */}
        {activeTab === "reschedules" && (
          <div className="bd-enter">
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 4,
                    height: 28,
                    background: "linear-gradient(to bottom,#a78bfa,#f59e0b)",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <p
                    style={{
                      ...mono,
                      fontSize: 7,
                      color: "rgba(167,139,250,0.5)",
                      letterSpacing: "0.5em",
                      textTransform: "uppercase",
                      marginBottom: 2,
                    }}
                  >
                    HEADZ UP · REQUESTS
                  </p>
                  <p
                    style={{
                      ...sf,
                      fontSize: 13,
                      fontWeight: 900,
                      textTransform: "uppercase",
                    }}
                  >
                    Reschedule Requests
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {reschedules.filter((r) => r.status === "pending").length >
                  0 && (
                  <div
                    style={{
                      padding: "6px 14px",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#ef4444",
                        animation: "pulse 1.5s ease infinite",
                      }}
                    />
                    <span style={{ ...mono, fontSize: 10, color: "#f87171" }}>
                      {reschedules.filter((r) => r.status === "pending").length}{" "}
                      pending
                    </span>
                  </div>
                )}
                <button
                  onClick={loadReschedules}
                  style={{
                    padding: "8px 14px",
                    ...sf,
                    fontSize: 6,
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
                  ↺ Refresh
                </button>
              </div>
            </div>

            {reschedLoading ? (
              <div style={{ padding: "64px", textAlign: "center" }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    border: `2px solid rgba(245,158,11,0.2)`,
                    borderTopColor: T.amber,
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto 12px",
                  }}
                />
                <p style={{ ...mono, fontSize: 11, color: T.muted }}>
                  Loading requests...
                </p>
              </div>
            ) : reschedules.length === 0 ? (
              <div
                style={{
                  padding: "64px 20px",
                  textAlign: "center",
                  border: `1px solid ${T.border}`,
                  background: T.surface,
                  clipPath:
                    "polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))",
                }}
              >
                <p style={{ fontSize: 36, marginBottom: 12 }}>↻</p>
                <p
                  style={{
                    ...sf,
                    fontSize: 9,
                    color: "rgba(255,255,255,0.06)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 8,
                  }}
                >
                  No Reschedule Requests
                </p>
                <p style={{ ...mono, fontSize: 11, color: "#52525b" }}>
                  When clients request a reschedule it will appear here
                </p>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {/* Pending first, then handled */}
                {[
                  ...reschedules.filter((r) => r.status === "pending"),
                  ...reschedules.filter((r) => r.status !== "pending"),
                ].map((rr) => {
                  const isPending = rr.status === "pending";
                  const isAccepted = rr.status === "accepted";
                  const isRejected = rr.status === "rejected";
                  const statusColor = isPending
                    ? "#f59e0b"
                    : isAccepted
                      ? "#22c55e"
                      : "#f87171";
                  const statusBg = isPending
                    ? "rgba(245,158,11,0.08)"
                    : isAccepted
                      ? "rgba(34,197,94,0.06)"
                      : "rgba(248,113,113,0.06)";

                  return (
                    <div
                      key={rr.id}
                      style={{
                        background: T.surface,
                        border: `1px solid ${isPending ? "rgba(245,158,11,0.25)" : T.border}`,
                        overflow: "hidden",
                        clipPath:
                          "polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))",
                      }}
                    >
                      {/* Top color bar */}
                      <div
                        style={{
                          height: 2,
                          background: isPending
                            ? "linear-gradient(to right,#f59e0b,#ef4444)"
                            : isAccepted
                              ? "#22c55e"
                              : "#f87171",
                          opacity: 0.7,
                        }}
                      />

                      <div style={{ padding: "18px 20px" }}>
                        {/* Client + status row */}
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
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                background: isPending
                                  ? "rgba(245,158,11,0.12)"
                                  : "rgba(255,255,255,0.04)",
                                border: `1px solid ${isPending ? T.amberBorder : T.border}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <span
                                style={{
                                  ...sf,
                                  fontSize: 14,
                                  fontWeight: 900,
                                  color: isPending ? T.amber : "#52525b",
                                }}
                              >
                                {rr.client_name?.charAt(0)?.toUpperCase() ||
                                  "?"}
                              </span>
                            </div>
                            <div>
                              <p
                                style={{
                                  ...sf,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  marginBottom: 2,
                                }}
                              >
                                {rr.client_name}
                              </p>
                              <p
                                style={{
                                  ...mono,
                                  fontSize: 9,
                                  color: "#71717a",
                                }}
                              >
                                {rr.service_name} · {rr.created_at}
                              </p>
                            </div>
                          </div>
                          <div
                            style={{
                              padding: "5px 14px",
                              background: statusBg,
                              border: `1px solid ${statusColor}33`,
                            }}
                          >
                            <span
                              style={{
                                ...sf,
                                fontSize: 6,
                                letterSpacing: "0.25em",
                                textTransform: "uppercase",
                                color: statusColor,
                              }}
                            >
                              {isPending
                                ? "⏳ Pending"
                                : isAccepted
                                  ? "✓ Approved"
                                  : "✕ Declined"}
                            </span>
                          </div>
                        </div>

                        {/* Time comparison card */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile
                              ? "1fr"
                              : "1fr auto 1fr",
                            gap: 8,
                            marginBottom: isPending ? 20 : 0,
                            alignItems: "stretch",
                          }}
                        >
                          {/* Original time */}
                          <div
                            style={{
                              padding: "14px 16px",
                              background: "rgba(255,255,255,0.02)",
                              border: `1px solid ${T.border}`,
                            }}
                          >
                            <p
                              style={{
                                ...mono,
                                fontSize: 8,
                                color: "#52525b",
                                letterSpacing: "0.3em",
                                textTransform: "uppercase",
                                marginBottom: 8,
                              }}
                            >
                              Original
                            </p>
                            <p
                              style={{
                                ...sf,
                                fontSize: isMobile ? 10 : 11,
                                fontWeight: 700,
                                color: isRejected ? "#f59e0b" : "#a1a1aa",
                                marginBottom: 4,
                              }}
                            >
                              {rr.original_date}
                            </p>
                            <p
                              style={{
                                ...sf,
                                fontSize: isMobile ? 14 : 18,
                                fontWeight: 900,
                                color: isRejected ? "#f59e0b" : "#71717a",
                              }}
                            >
                              {rr.original_time}
                            </p>
                          </div>

                          {/* Arrow */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: isMobile ? "4px 0" : "0 8px",
                            }}
                          >
                            <span
                              style={{
                                ...mono,
                                fontSize: isMobile ? 16 : 20,
                                color: isPending ? "#f59e0b" : "#3f3f46",
                              }}
                            >
                              →
                            </span>
                          </div>

                          {/* Requested time */}
                          <div
                            style={{
                              padding: "14px 16px",
                              background: isPending
                                ? "rgba(245,158,11,0.04)"
                                : isAccepted
                                  ? "rgba(34,197,94,0.04)"
                                  : "rgba(255,255,255,0.02)",
                              border: `1px solid ${isPending ? T.amberBorder : isAccepted ? "rgba(34,197,94,0.2)" : T.border}`,
                            }}
                          >
                            <p
                              style={{
                                ...mono,
                                fontSize: 8,
                                color: isPending
                                  ? "rgba(245,158,11,0.5)"
                                  : isAccepted
                                    ? "rgba(34,197,94,0.5)"
                                    : "#52525b",
                                letterSpacing: "0.3em",
                                textTransform: "uppercase",
                                marginBottom: 8,
                              }}
                            >
                              {isAccepted ? "✓ Confirmed" : "Requested"}
                            </p>
                            <p
                              style={{
                                ...sf,
                                fontSize: isMobile ? 10 : 11,
                                fontWeight: 700,
                                color: isPending
                                  ? T.amber
                                  : isAccepted
                                    ? "#22c55e"
                                    : "#71717a",
                                marginBottom: 4,
                              }}
                            >
                              {rr.requested_date}
                            </p>
                            <p
                              style={{
                                ...sf,
                                fontSize: isMobile ? 14 : 18,
                                fontWeight: 900,
                                color: isPending
                                  ? T.amber
                                  : isAccepted
                                    ? "#22c55e"
                                    : "#71717a",
                              }}
                            >
                              {rr.requested_time}
                            </p>
                          </div>
                        </div>

                        {/* Approve / Decline buttons — only for pending */}
                        {isPending && (
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              onClick={async () => {
                                if (
                                  !confirm(
                                    `Approve reschedule for ${rr.client_name}?\n\nNew time: ${rr.requested_date} at ${rr.requested_time}\n\nThe client will receive a confirmation email.`,
                                  )
                                )
                                  return;
                                try {
                                  await API.post(
                                    `barber/reschedules/${rr.id}/`,
                                    { action: "accept" },
                                  );
                                  setReschedules((p) =>
                                    p.map((r) =>
                                      r.id === rr.id
                                        ? { ...r, status: "accepted" }
                                        : r,
                                    ),
                                  );
                                  showToast(
                                    `✓ Reschedule approved — ${rr.client_name} has been notified.`,
                                  );
                                } catch (e) {
                                  showToast(
                                    e.response?.data?.error ||
                                      "Could not approve.",
                                    "error",
                                  );
                                }
                              }}
                              style={{
                                flex: isMobile ? 1 : "auto",
                                padding: "12px 24px",
                                background: "rgba(34,197,94,0.1)",
                                border: "1px solid rgba(34,197,94,0.35)",
                                color: "#4ade80",
                                ...sf,
                                fontSize: 7,
                                fontWeight: 700,
                                letterSpacing: "0.2em",
                                textTransform: "uppercase",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                clipPath:
                                  "polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px))",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background =
                                  "rgba(34,197,94,0.18)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "rgba(34,197,94,0.1)")
                              }
                            >
                              ✓ Approve Reschedule
                            </button>
                            <button
                              onClick={async () => {
                                if (
                                  !confirm(
                                    `Decline ${rr.client_name}'s reschedule request?\n\nTheir original appointment on ${rr.original_date} at ${rr.original_time} will remain active.\n\nThe client will be notified.`,
                                  )
                                )
                                  return;
                                try {
                                  await API.post(
                                    `barber/reschedules/${rr.id}/`,
                                    { action: "reject" },
                                  );
                                  setReschedules((p) =>
                                    p.map((r) =>
                                      r.id === rr.id
                                        ? { ...r, status: "rejected" }
                                        : r,
                                    ),
                                  );
                                  showToast(
                                    `Reschedule declined — ${rr.client_name} has been notified.`,
                                    "error",
                                  );
                                } catch (e) {
                                  showToast(
                                    e.response?.data?.error ||
                                      "Could not decline.",
                                    "error",
                                  );
                                }
                              }}
                              style={{
                                flex: isMobile ? 1 : "auto",
                                padding: "12px 24px",
                                background: "transparent",
                                border: `1px solid ${T.redBorder}`,
                                color: T.red,
                                ...sf,
                                fontSize: 7,
                                fontWeight: 700,
                                letterSpacing: "0.2em",
                                textTransform: "uppercase",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                clipPath:
                                  "polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px))",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = T.redDim)
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              ✕ Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ SCHEDULE TAB ══ */}
        {activeTab === "schedule" && (
          <div className="bd-enter">
            {/* ── TODAY'S QUICK STATS ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${isMobile ? 2 : 4},1fr)`,
                gap: 8,
                marginBottom: 20,
              }}
            >
              {[
                { label: "Today", value: schedule.length, color: T.amber },
                {
                  label: "Confirmed",
                  value: schedule.filter((a) => a.status === "confirmed")
                    .length,
                  color: "#4ade80",
                },
                {
                  label: "Completed",
                  value: schedule.filter((a) => a.status === "completed")
                    .length,
                  color: "#a78bfa",
                },
                {
                  label: "No Shows",
                  value: schedule.filter((a) => a.status === "no_show").length,
                  color: "#f87171",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    padding: "12px 14px",
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: color,
                      opacity: 0.6,
                    }}
                  />
                  <p
                    style={{
                      ...sf,
                      fontSize: 5,
                      letterSpacing: "0.35em",
                      color,
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    {label}
                  </p>
                  <p
                    style={{
                      ...sf,
                      fontSize: 24,
                      fontWeight: 900,
                      color,
                      lineHeight: 1,
                    }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* ── PAY IN SHOP TRACKER ── */}
            {schedule.filter(
              (a) => a.payment_method === "shop" && a.status === "confirmed",
            ).length > 0 && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 16px",
                  background: "rgba(245,158,11,0.04)",
                  border: "1px solid rgba(245,158,11,0.15)",
                }}
              >
                <p
                  style={{
                    ...sf,
                    fontSize: 6,
                    letterSpacing: "0.4em",
                    color: T.amber,
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  💵 Pay In Shop —{" "}
                  {
                    schedule.filter(
                      (a) =>
                        a.payment_method === "shop" && a.status === "confirmed",
                    ).length
                  }{" "}
                  pending
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {schedule
                    .filter(
                      (a) =>
                        a.payment_method === "shop" && a.status === "confirmed",
                    )
                    .map((a) => (
                      <div
                        key={a.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px",
                          background: T.surface,
                          border: `1px solid ${T.border}`,
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <div>
                          <span
                            style={{
                              ...sf,
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              color: "white",
                            }}
                          >
                            {a.client_name || a.username || "Client"}
                          </span>
                          <span
                            style={{
                              ...mono,
                              fontSize: 9,
                              color: T.muted,
                              marginLeft: 10,
                            }}
                          >
                            {a.service_name}
                          </span>
                          <span
                            style={{
                              ...mono,
                              fontSize: 9,
                              color: T.amber,
                              marginLeft: 10,
                            }}
                          >
                            {fmtTime(a.time)}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              ...sf,
                              fontSize: 12,
                              fontWeight: 900,
                              color: T.amber,
                            }}
                          >
                            ${a.service_price || "—"}
                          </span>
                          <button
                            onClick={async () => {
                              if (
                                !confirm(
                                  `Did you receive payment from ${a.client_name || "client"} for $${a.service_price || ""}?`,
                                )
                              )
                                return;
                              try {
                                await API.patch(
                                  `barber/appointments/${a.id}/`,
                                  { status: "completed" },
                                );
                                setSchedule((p) =>
                                  p.map((x) =>
                                    x.id === a.id
                                      ? { ...x, status: "completed" }
                                      : x,
                                  ),
                                );
                                showToast(
                                  `✓ Payment confirmed — ${a.client_name || "client"} marked complete`,
                                );
                              } catch {
                                showToast("Error.", "error");
                              }
                            }}
                            style={{
                              padding: "6px 12px",
                              ...sf,
                              fontSize: 6,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              background: "rgba(34,197,94,0.1)",
                              border: "1px solid rgba(34,197,94,0.3)",
                              color: "#4ade80",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "rgba(34,197,94,0.2)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                "rgba(34,197,94,0.1)")
                            }
                          >
                            ✓ Got Paid
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

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
                    {schedule.map((appt) => {
                      const isShop = appt.payment_method === "shop";
                      const apptPast =
                        new Date(`${appt.date}T${appt.time}`) < new Date();
                      const shopStatus = shopPayments[appt.id];
                      return (
                        <div key={appt.id}>
                          <ApptTicket
                            appt={appt}
                            isMobile={isMobile}
                            onStatusChange={handleStatusChange}
                            onStrike={issueStrike}
                            onReschedule={(a) => setReschedModal(a)}
                            onCancel={handleCancel}
                            onNotes={(id, note) =>
                              setSchedule((p) =>
                                p.map((a) =>
                                  a.id === id
                                    ? { ...a, barber_notes: note }
                                    : a,
                                ),
                              )
                            }
                          />
                          {/* Pay-in-shop tracker — show after appointment time passes */}
                          {isShop &&
                            apptPast &&
                            appt.status !== "cancelled" &&
                            appt.status !== "no_show" && (
                              <div
                                style={{
                                  marginTop: -1,
                                  padding: "10px 18px",
                                  background:
                                    shopStatus === "received"
                                      ? "rgba(34,197,94,0.06)"
                                      : "rgba(245,158,11,0.04)",
                                  border: `1px solid ${shopStatus === "received" ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.15)"}`,
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
                                    gap: 10,
                                  }}
                                >
                                  <span style={{ fontSize: 14 }}>💵</span>
                                  <div>
                                    <p
                                      style={{
                                        ...sf,
                                        fontSize: 7,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.15em",
                                        color:
                                          shopStatus === "received"
                                            ? "#4ade80"
                                            : T.amber,
                                        marginBottom: 2,
                                      }}
                                    >
                                      {shopStatus === "received"
                                        ? "Payment Received ✓"
                                        : "Did you get paid?"}
                                    </p>
                                    <p
                                      style={{
                                        ...mono,
                                        fontSize: 10,
                                        color: "#71717a",
                                      }}
                                    >
                                      {appt.service_name} · Pay in shop
                                    </p>
                                  </div>
                                </div>
                                {shopStatus !== "received" && (
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                      onClick={() =>
                                        setShopPayments((p) => ({
                                          ...p,
                                          [appt.id]: "received",
                                        }))
                                      }
                                      style={{
                                        padding: "7px 14px",
                                        background: "rgba(34,197,94,0.1)",
                                        border: "1px solid rgba(34,197,94,0.3)",
                                        color: "#4ade80",
                                        ...sf,
                                        fontSize: 6.5,
                                        letterSpacing: "0.15em",
                                        textTransform: "uppercase",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                      }}
                                      onMouseEnter={(e) =>
                                        (e.currentTarget.style.background =
                                          "rgba(34,197,94,0.2)")
                                      }
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.background =
                                          "rgba(34,197,94,0.1)")
                                      }
                                    >
                                      ✓ Got Paid
                                    </button>
                                    <button
                                      onClick={() =>
                                        setShopPayments((p) => ({
                                          ...p,
                                          [appt.id]: "pending",
                                        }))
                                      }
                                      style={{
                                        padding: "7px 14px",
                                        background: "transparent",
                                        border: `1px solid ${T.border}`,
                                        color: T.muted,
                                        ...sf,
                                        fontSize: 6.5,
                                        letterSpacing: "0.15em",
                                        textTransform: "uppercase",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Not Yet
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ WALK-IN TAB ══ */}
        {/* ══ RESCHEDULES TAB ══ */}
        {activeTab === "reschedules" && (
          <div className="bd-enter">
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 4,
                    height: 28,
                    background: "linear-gradient(to bottom,#a78bfa,#f59e0b)",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <p
                    style={{
                      ...mono,
                      fontSize: 7,
                      color: "rgba(167,139,250,0.6)",
                      letterSpacing: "0.5em",
                      textTransform: "uppercase",
                      marginBottom: 2,
                    }}
                  >
                    HEADZ UP · REQUESTS
                  </p>
                  <p
                    style={{
                      ...sf,
                      fontSize: 13,
                      fontWeight: 900,
                      textTransform: "uppercase",
                    }}
                  >
                    Reschedule Requests
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {reschedules.filter((r) => r.status === "pending").length >
                  0 && (
                  <div
                    style={{
                      padding: "6px 14px",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#ef4444",
                        animation: "pulse 1.5s ease infinite",
                      }}
                    />
                    <span style={{ ...mono, fontSize: 10, color: "#f87171" }}>
                      {reschedules.filter((r) => r.status === "pending").length}{" "}
                      pending
                    </span>
                  </div>
                )}
                <button
                  onClick={loadReschedules}
                  style={{
                    padding: "8px 14px",
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
                  Refresh
                </button>
              </div>
            </div>

            {reschedLoading ? (
              <div style={{ padding: "48px", textAlign: "center" }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: `2px solid rgba(245,158,11,0.2)`,
                    borderTopColor: T.amber,
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto",
                  }}
                />
              </div>
            ) : reschedules.length === 0 ? (
              <div
                style={{
                  padding: "64px 20px",
                  textAlign: "center",
                  border: `1px solid ${T.border}`,
                  background: T.surface,
                  clipPath:
                    "polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))",
                }}
              >
                <p style={{ fontSize: 32, marginBottom: 10 }}>↻</p>
                <p
                  style={{
                    ...sf,
                    fontSize: 9,
                    color: "rgba(255,255,255,0.07)",
                    textTransform: "uppercase",
                  }}
                >
                  No Reschedule Requests
                </p>
                <p
                  style={{
                    ...mono,
                    fontSize: 11,
                    color: T.muted,
                    marginTop: 8,
                  }}
                >
                  Requests from clients will appear here
                </p>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {/* Pending first, then handled */}
                {[
                  ...reschedules.filter((r) => r.status === "pending"),
                  ...reschedules.filter((r) => r.status !== "pending"),
                ].map((rr) => {
                  const isPending = rr.status === "pending";
                  const isAccepted = rr.status === "accepted";
                  const isRejected = rr.status === "rejected";
                  const statusColor = isPending
                    ? "#f59e0b"
                    : isAccepted
                      ? "#22c55e"
                      : "#f87171";
                  const statusBg = isPending
                    ? "rgba(245,158,11,0.08)"
                    : isAccepted
                      ? "rgba(34,197,94,0.08)"
                      : "rgba(248,113,113,0.06)";
                  const statusBdr = isPending
                    ? "rgba(245,158,11,0.25)"
                    : isAccepted
                      ? "rgba(34,197,94,0.2)"
                      : "rgba(248,113,113,0.15)";

                  return (
                    <div
                      key={rr.id}
                      style={{
                        background: T.surface,
                        border: `1px solid ${isPending ? T.amberBorder : T.border}`,
                        overflow: "hidden",
                        clipPath:
                          "polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))",
                        transition: "border-color 0.2s",
                      }}
                    >
                      {/* Color bar */}
                      <div
                        style={{
                          height: 2,
                          background: `linear-gradient(to right,${statusColor},transparent)`,
                          opacity: 0.8,
                        }}
                      />

                      <div style={{ padding: "18px 20px" }}>
                        {/* Top row — client + status */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 16,
                            flexWrap: "wrap",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                background: T.amberDim,
                                border: `1px solid ${T.amberBorder}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <span
                                style={{
                                  ...sf,
                                  fontSize: 14,
                                  fontWeight: 900,
                                  color: T.amber,
                                }}
                              >
                                {rr.client_name?.charAt(0)?.toUpperCase() ||
                                  "?"}
                              </span>
                            </div>
                            <div>
                              <p
                                style={{
                                  ...sf,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  marginBottom: 2,
                                }}
                              >
                                {rr.client_name}
                              </p>
                              <p
                                style={{
                                  ...mono,
                                  fontSize: 9,
                                  color: "#71717a",
                                }}
                              >
                                {rr.client_email}
                              </p>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{ ...mono, fontSize: 9, color: "#52525b" }}
                            >
                              {rr.created_at}
                            </span>
                            <span
                              style={{
                                ...sf,
                                fontSize: 6,
                                letterSpacing: "0.2em",
                                textTransform: "uppercase",
                                padding: "4px 10px",
                                background: statusBg,
                                border: `1px solid ${statusBdr}`,
                                color: statusColor,
                              }}
                            >
                              {rr.status === "pending"
                                ? "⏳ Pending"
                                : rr.status === "accepted"
                                  ? "✓ Approved"
                                  : "✕ Declined"}
                            </span>
                          </div>
                        </div>

                        {/* Appointment comparison */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile
                              ? "1fr"
                              : "1fr auto 1fr",
                            gap: 12,
                            alignItems: "center",
                            marginBottom: isPending ? 16 : 0,
                          }}
                        >
                          {/* Original */}
                          <div
                            style={{
                              padding: "14px 16px",
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.07)",
                            }}
                          >
                            <p
                              style={{
                                ...mono,
                                fontSize: 8,
                                color: "#52525b",
                                letterSpacing: "0.35em",
                                textTransform: "uppercase",
                                marginBottom: 8,
                              }}
                            >
                              Original Appointment
                            </p>
                            <p
                              style={{
                                ...sf,
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#a1a1aa",
                                marginBottom: 4,
                              }}
                            >
                              {rr.original_date}
                            </p>
                            <p
                              style={{
                                ...sf,
                                fontSize: 16,
                                fontWeight: 900,
                                color: "#71717a",
                              }}
                            >
                              {rr.original_time}
                            </p>
                            <p
                              style={{
                                ...mono,
                                fontSize: 10,
                                color: "#52525b",
                                marginTop: 4,
                              }}
                            >
                              {rr.service_name}
                            </p>
                          </div>

                          {/* Arrow */}
                          <div
                            style={{
                              textAlign: "center",
                              padding: isMobile ? "8px 0" : "0",
                            }}
                          >
                            <span
                              style={{
                                ...sf,
                                fontSize: 18,
                                color: T.amber,
                                display: "block",
                              }}
                            >
                              →
                            </span>
                            {isMobile && (
                              <p
                                style={{
                                  ...mono,
                                  fontSize: 8,
                                  color: "#52525b",
                                  marginTop: 4,
                                }}
                              >
                                Requested change
                              </p>
                            )}
                          </div>

                          {/* Requested */}
                          <div
                            style={{
                              padding: "14px 16px",
                              background: isPending
                                ? "rgba(245,158,11,0.05)"
                                : isAccepted
                                  ? "rgba(34,197,94,0.06)"
                                  : "rgba(248,113,113,0.04)",
                              border: `1px solid ${isPending ? T.amberBorder : isAccepted ? "rgba(34,197,94,0.2)" : "rgba(248,113,113,0.12)"}`,
                            }}
                          >
                            <p
                              style={{
                                ...mono,
                                fontSize: 8,
                                color: isPending
                                  ? "rgba(245,158,11,0.5)"
                                  : isAccepted
                                    ? "rgba(34,197,94,0.5)"
                                    : "rgba(248,113,113,0.4)",
                                letterSpacing: "0.35em",
                                textTransform: "uppercase",
                                marginBottom: 8,
                              }}
                            >
                              {isPending
                                ? "Requested Time"
                                : isAccepted
                                  ? "✓ Approved Time"
                                  : "✕ Declined Request"}
                            </p>
                            <p
                              style={{
                                ...sf,
                                fontSize: 10,
                                fontWeight: 700,
                                color: isPending
                                  ? "#a1a1aa"
                                  : isAccepted
                                    ? "#4ade80"
                                    : "#f87171",
                                marginBottom: 4,
                              }}
                            >
                              {rr.requested_date}
                            </p>
                            <p
                              style={{
                                ...sf,
                                fontSize: 16,
                                fontWeight: 900,
                                color: isPending
                                  ? T.amber
                                  : isAccepted
                                    ? "#22c55e"
                                    : "#f87171",
                              }}
                            >
                              {rr.requested_time}
                            </p>
                            <p
                              style={{
                                ...mono,
                                fontSize: 10,
                                color: isPending
                                  ? "#71717a"
                                  : isAccepted
                                    ? "rgba(34,197,94,0.5)"
                                    : "rgba(248,113,113,0.4)",
                                marginTop: 4,
                              }}
                            >
                              {rr.service_name}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons — only for pending */}
                        {isPending && (
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              flexWrap: "wrap",
                              paddingTop: 16,
                              borderTop: `1px solid rgba(255,255,255,0.06)`,
                            }}
                          >
                            <button
                              onClick={async () => {
                                if (
                                  !confirm(
                                    `Approve reschedule for ${rr.client_name}?\n\nNew time: ${rr.requested_date} at ${rr.requested_time}\n\nTheir appointment will be updated and they'll get a confirmation email.`,
                                  )
                                )
                                  return;
                                try {
                                  await API.post(
                                    `barber/reschedules/${rr.id}/`,
                                    { action: "accept" },
                                  );
                                  setReschedules((p) =>
                                    p.map((x) =>
                                      x.id === rr.id
                                        ? { ...x, status: "accepted" }
                                        : x,
                                    ),
                                  );
                                  showToast(
                                    `✓ Reschedule approved — ${rr.client_name} has been notified.`,
                                  );
                                } catch (e) {
                                  showToast(
                                    e.response?.data?.error ||
                                      "Could not approve.",
                                    "error",
                                  );
                                }
                              }}
                              style={{
                                padding: "12px 24px",
                                background: "rgba(34,197,94,0.1)",
                                border: "1px solid rgba(34,197,94,0.35)",
                                color: "#4ade80",
                                ...sf,
                                fontSize: 7,
                                fontWeight: 700,
                                letterSpacing: "0.2em",
                                textTransform: "uppercase",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                flex: 1,
                                clipPath:
                                  "polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px))",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background =
                                  "rgba(34,197,94,0.2)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "rgba(34,197,94,0.1)")
                              }
                            >
                              ✓ Approve Reschedule
                            </button>
                            <button
                              onClick={async () => {
                                if (
                                  !confirm(
                                    `Decline reschedule request from ${rr.client_name}?\n\nTheir original appointment (${rr.original_date} at ${rr.original_time}) will remain.\nThey'll get an email letting them know.`,
                                  )
                                )
                                  return;
                                try {
                                  await API.post(
                                    `barber/reschedules/${rr.id}/`,
                                    { action: "reject" },
                                  );
                                  setReschedules((p) =>
                                    p.map((x) =>
                                      x.id === rr.id
                                        ? { ...x, status: "rejected" }
                                        : x,
                                    ),
                                  );
                                  showToast(
                                    `Reschedule declined — ${rr.client_name} has been notified.`,
                                    "error",
                                  );
                                } catch (e) {
                                  showToast(
                                    e.response?.data?.error ||
                                      "Could not decline.",
                                    "error",
                                  );
                                }
                              }}
                              style={{
                                padding: "12px 24px",
                                background: "rgba(248,113,113,0.06)",
                                border: "1px solid rgba(248,113,113,0.25)",
                                color: "#f87171",
                                ...sf,
                                fontSize: 7,
                                fontWeight: 700,
                                letterSpacing: "0.2em",
                                textTransform: "uppercase",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                flex: 1,
                                clipPath:
                                  "polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px))",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background =
                                  "rgba(248,113,113,0.14)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "rgba(248,113,113,0.06)")
                              }
                            >
                              ✕ Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ WALK-IN TAB ══ */}
        {activeTab === "walkin" && (
          <div className="bd-enter" style={{ maxWidth: 600 }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <p
                style={{
                  ...mono,
                  fontSize: 8,
                  color: "rgba(245,158,11,0.5)",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                HEADZ UP · FRONT DESK
              </p>
              <h2
                style={{
                  ...sf,
                  fontSize: 22,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "-0.03em",
                  margin: 0,
                }}
              >
                Walk-In
                <br />
                <span style={{ color: T.amber, fontStyle: "italic" }}>
                  Check-In_
                </span>
              </h2>
              <p
                style={{
                  ...mono,
                  fontSize: 12,
                  color: T.muted,
                  marginTop: 10,
                  lineHeight: 1.7,
                }}
              >
                Someone just walked in? Fill this out and they're in the system
                instantly. If they give a phone or email, they'll get a welcome
                text or email automatically.
              </p>
            </div>

            {/* Success card */}
            {wiSuccess && (
              <div
                style={{
                  marginBottom: 24,
                  padding: "20px",
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  clipPath:
                    "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      background: "rgba(34,197,94,0.15)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>✓</span>
                  </div>
                  <p
                    style={{
                      ...sf,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#4ade80",
                    }}
                  >
                    Walk-In Added!
                  </p>
                </div>
                <p
                  style={{
                    ...mono,
                    fontSize: 12,
                    color: "#a1a1aa",
                    lineHeight: 1.7,
                  }}
                >
                  <strong style={{ color: "white" }}>{wiSuccess.name}</strong>{" "}
                  is booked for{" "}
                  <strong style={{ color: T.amber }}>
                    {wiSuccess.service}
                  </strong>{" "}
                  at{" "}
                  <strong style={{ color: T.amber }}>{wiSuccess.time}</strong>
                </p>
                <button
                  onClick={() => setWiSuccess(null)}
                  style={{
                    marginTop: 12,
                    ...mono,
                    fontSize: 10,
                    color: T.muted,
                    background: "transparent",
                    border: `1px solid ${T.border}`,
                    padding: "6px 14px",
                    cursor: "pointer",
                  }}
                >
                  + Add Another
                </button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Row 1: Barber selector (all barbers, not just logged-in one) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
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
                    Barber *
                  </label>
                  <select
                    value={wiBarber}
                    onChange={(e) => {
                      setWiBarber(e.target.value);
                      setWiTime("");
                    }}
                    style={{
                      width: "100%",
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      padding: "13px 14px",
                      color: wiBarber ? "white" : T.muted,
                      ...mono,
                      fontSize: 13,
                      outline: "none",
                      cursor: "pointer",
                      colorScheme: "dark",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = T.amber)}
                    onBlur={(e) => (e.target.style.borderColor = T.border)}
                  >
                    <option value="">Select barber...</option>
                    {allBarbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                      ...mono,
                      fontSize: 13,
                      outline: "none",
                      cursor: "pointer",
                      colorScheme: "dark",
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
              </div>

              {/* Date */}
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
                  Date *
                </label>
                <input
                  type="date"
                  value={wiDate}
                  min={today}
                  onChange={(e) => {
                    setWiDate(e.target.value);
                    setWiTime("");
                  }}
                  style={{
                    width: "100%",
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    padding: "13px 14px",
                    color: "white",
                    ...mono,
                    fontSize: 13,
                    outline: "none",
                    colorScheme: "dark",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = T.amber)}
                  onBlur={(e) => (e.target.style.borderColor = T.border)}
                />
              </div>

              {/* Time slots — live from barber calendar */}
              {wiBarber && wiDate && (
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
                    Time Slot *{" "}
                    {wiSlotsLoad && (
                      <span
                        style={{
                          ...mono,
                          fontSize: 8,
                          color: "#52525b",
                          letterSpacing: "0.2em",
                        }}
                      >
                        — checking...
                      </span>
                    )}
                  </label>
                  {wiSlotsLoad ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "14px",
                        background: T.surface,
                        border: `1px solid ${T.border}`,
                      }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          border: "2px solid rgba(245,158,11,0.2)",
                          borderTopColor: T.amber,
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      <span style={{ ...mono, fontSize: 11, color: T.muted }}>
                        Loading availability...
                      </span>
                    </div>
                  ) : wiSlots.length === 0 ? (
                    <div
                      style={{
                        padding: "14px",
                        background: T.surface,
                        border: `1px solid ${T.border}`,
                        textAlign: "center",
                      }}
                    >
                      <p style={{ ...mono, fontSize: 11, color: T.dim }}>
                        No available slots for this day.
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(5,1fr)",
                        gap: 5,
                      }}
                    >
                      {wiSlots.map((s) => {
                        const hr = parseInt(s.split(":")[0]);
                        const min = s.split(":")[1];
                        const ampm = hr >= 12 ? "PM" : "AM";
                        const display = `${hr % 12 || 12}:${min} ${ampm}`;
                        const isBooked = wiBooked.includes(s);
                        const isSel = wiTime === display;
                        return (
                          <button
                            key={s}
                            onClick={() => !isBooked && setWiTime(display)}
                            disabled={isBooked}
                            style={{
                              padding: "9px 4px",
                              position: "relative",
                              overflow: "hidden",
                              ...sf,
                              fontSize: 5,
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                              border: `1px solid ${isSel ? "#f59e0b" : isBooked ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.2)"}`,
                              background: isSel
                                ? "rgba(245,158,11,0.15)"
                                : isBooked
                                  ? "rgba(239,68,68,0.03)"
                                  : "rgba(245,158,11,0.04)",
                              color: isSel
                                ? T.amber
                                : isBooked
                                  ? "#2a2a2a"
                                  : "#a1a1aa",
                              cursor: isBooked ? "not-allowed" : "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            {isBooked && (
                              <svg
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  width: "100%",
                                  height: "100%",
                                  pointerEvents: "none",
                                }}
                                viewBox="0 0 80 32"
                                preserveAspectRatio="none"
                              >
                                <line
                                  x1="4"
                                  y1="28"
                                  x2="76"
                                  y2="4"
                                  stroke="rgba(239,68,68,0.6)"
                                  strokeWidth="1.5"
                                  style={{
                                    filter:
                                      "drop-shadow(0 0 3px rgba(239,68,68,0.8))",
                                  }}
                                />
                              </svg>
                            )}
                            <span style={{ position: "relative", zIndex: 1 }}>
                              {display}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Client info */}
              <div
                style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}
              >
                <p
                  style={{
                    ...sf,
                    fontSize: 6,
                    letterSpacing: "0.4em",
                    color: T.muted,
                    textTransform: "uppercase",
                    marginBottom: 14,
                  }}
                >
                  Client Info
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
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
                      Name *
                    </label>
                    <input
                      value={wiName}
                      onChange={(e) => setWiName(e.target.value)}
                      placeholder="John Smith"
                      style={{
                        width: "100%",
                        background: T.bg,
                        border: `1px solid ${T.border}`,
                        padding: "13px 14px",
                        color: "white",
                        ...mono,
                        fontSize: 13,
                        outline: "none",
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
                        letterSpacing: "0.4em",
                        color: T.muted,
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Phone{" "}
                      <span style={{ color: T.dim }}>(for welcome text)</span>
                    </label>
                    <input
                      type="tel"
                      value={wiPhone}
                      onChange={(e) => setWiPhone(e.target.value)}
                      placeholder="601-555-0100"
                      style={{
                        width: "100%",
                        background: T.bg,
                        border: `1px solid ${T.border}`,
                        padding: "13px 14px",
                        color: "white",
                        ...mono,
                        fontSize: 13,
                        outline: "none",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = T.amber)}
                      onBlur={(e) => (e.target.style.borderColor = T.border)}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
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
                    Email{" "}
                    <span style={{ color: T.dim }}>(for welcome email)</span>
                  </label>
                  <input
                    type="email"
                    value={wiEmail}
                    onChange={(e) => setWiEmail(e.target.value)}
                    placeholder="client@email.com"
                    style={{
                      width: "100%",
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      padding: "13px 14px",
                      color: "white",
                      ...mono,
                      fontSize: 13,
                      outline: "none",
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
                      letterSpacing: "0.4em",
                      color: T.muted,
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Notes
                  </label>
                  <input
                    value={wiNotes}
                    onChange={(e) => setWiNotes(e.target.value)}
                    placeholder="Style request, preferences..."
                    style={{
                      width: "100%",
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      padding: "13px 14px",
                      color: "white",
                      ...mono,
                      fontSize: 13,
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = T.amber)}
                    onBlur={(e) => (e.target.style.borderColor = T.border)}
                  />
                </div>
              </div>

              {/* Welcome message preview */}
              {(wiPhone || wiEmail) && wiName && (
                <div
                  style={{
                    padding: "12px 14px",
                    background: "rgba(245,158,11,0.04)",
                    border: "1px solid rgba(245,158,11,0.15)",
                  }}
                >
                  <p
                    style={{
                      ...mono,
                      fontSize: 8,
                      color: "rgba(245,158,11,0.5)",
                      letterSpacing: "0.4em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Preview — Welcome Message
                  </p>
                  <p
                    style={{
                      ...mono,
                      fontSize: 11,
                      color: "#a1a1aa",
                      lineHeight: 1.7,
                      fontStyle: "italic",
                    }}
                  >
                    "Hey {wiName}! Welcome to HEADZ UP Barbershop 🔥 You're
                    officially part of the family. We'll take care of you today
                    — see you in the chair!"
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleWalkIn}
                disabled={wiLoading || !wiName.trim() || !wiSvc || !wiTime}
                style={{
                  padding: "16px",
                  ...sf,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  background:
                    wiLoading || !wiName.trim() || !wiSvc || !wiTime
                      ? T.deep
                      : T.amber,
                  color:
                    wiLoading || !wiName.trim() || !wiSvc || !wiTime
                      ? T.dim
                      : "black",
                  border: "none",
                  cursor:
                    wiLoading || !wiName.trim() || !wiSvc || !wiTime
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.2s",
                  marginTop: 4,
                  clipPath:
                    "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                }}
              >
                {wiLoading ? (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        border: "2px solid #3f3f46",
                        borderTopColor: "#a1a1aa",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Adding Walk-In...
                  </span>
                ) : (
                  `Check In ${wiName || "Client"} →`
                )}
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
                justifyContent: "space-between",
                marginBottom: 24,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 4,
                    height: 28,
                    background: "linear-gradient(to bottom,#ef4444,#f59e0b)",
                  }}
                />
                <div>
                  <p
                    style={{
                      ...mono,
                      fontSize: 7,
                      color: "rgba(245,158,11,0.5)",
                      letterSpacing: "0.5em",
                      textTransform: "uppercase",
                      marginBottom: 2,
                    }}
                  >
                    HEADZ UP · QUEUE
                  </p>
                  <p
                    style={{
                      ...sf,
                      fontSize: 13,
                      fontWeight: 900,
                      textTransform: "uppercase",
                    }}
                  >
                    Waitlist
                  </p>
                </div>
              </div>
              <div
                style={{
                  padding: "8px 14px",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                <span style={{ ...mono, fontSize: 11, color: T.amber }}>
                  {waitlist.length} waiting
                </span>
              </div>
            </div>

            {waitlist.length === 0 ? (
              <div
                style={{
                  padding: "64px 20px",
                  textAlign: "center",
                  border: `1px solid ${T.border}`,
                  background: T.surface,
                  clipPath:
                    "polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))",
                }}
              >
                <p style={{ fontSize: 32, marginBottom: 12 }}>🎉</p>
                <p
                  style={{
                    ...sf,
                    fontSize: 9,
                    color: "rgba(255,255,255,0.15)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Waitlist is empty
                </p>
                <p
                  style={{
                    ...mono,
                    fontSize: 11,
                    color: T.muted,
                    marginTop: 8,
                  }}
                >
                  All clients have been served
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {waitlist.map((w, i) => (
                  <div
                    key={w.id}
                    style={{
                      background: T.surface,
                      border: `1px solid ${w.notified ? T.border : T.amberBorder}`,
                      overflow: "hidden",
                      clipPath:
                        "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                    }}
                  >
                    <div
                      style={{
                        height: 2,
                        background: w.notified
                          ? "rgba(255,255,255,0.05)"
                          : `linear-gradient(to right,#ef4444,#f59e0b)`,
                      }}
                    />
                    <div
                      style={{
                        padding: "16px 18px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        {/* Queue number */}
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            background: w.notified ? T.surface2 : T.amberDim,
                            border: `1px solid ${w.notified ? T.border : T.amberBorder}`,
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
                              color: w.notified ? T.muted : T.amber,
                            }}
                          >
                            {i + 1}
                          </span>
                        </div>
                        <div>
                          <p
                            style={{
                              ...sf,
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              marginBottom: 4,
                              color: w.notified ? "#71717a" : "white",
                            }}
                          >
                            {w.client_name}
                          </p>
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            {(w.service_name || w.service) && (
                              <span
                                style={{
                                  ...mono,
                                  fontSize: 10,
                                  color: T.amber,
                                }}
                              >
                                ✂️ {w.service_name || w.service}
                              </span>
                            )}
                            {(w.phone || w.client_phone) && (
                              <span
                                style={{
                                  ...mono,
                                  fontSize: 10,
                                  color: "#a1a1aa",
                                }}
                              >
                                📱 {w.phone || w.client_phone}
                              </span>
                            )}
                            {w.date && (
                              <span
                                style={{
                                  ...mono,
                                  fontSize: 10,
                                  color: "#a1a1aa",
                                }}
                              >
                                📅 {fmtShort(w.date)}
                              </span>
                            )}
                          </div>
                          {w.notes && (
                            <p
                              style={{
                                ...mono,
                                fontSize: 10,
                                color: "#71717a",
                                marginTop: 4,
                                fontStyle: "italic",
                              }}
                            >
                              "{w.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => !w.notified && notifyWaitlist(w.id)}
                          disabled={w.notified}
                          style={{
                            padding: "9px 18px",
                            ...sf,
                            fontSize: 7,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            background: w.notified ? T.surface2 : T.amber,
                            border: `1px solid ${w.notified ? T.border : T.amber}`,
                            color: w.notified ? T.muted : "black",
                            cursor: w.notified ? "default" : "pointer",
                            transition: "all 0.2s",
                            clipPath:
                              "polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px))",
                          }}
                        >
                          {w.notified ? "✓ Notified" : "Notify →"}
                        </button>
                        <button
                          onClick={async () => {
                            if (
                              !confirm(`Remove ${w.client_name} from waitlist?`)
                            )
                              return;
                            try {
                              await API.delete(`barber/waitlist/${w.id}/`);
                              setWaitlist((p) =>
                                p.filter((x) => x.id !== w.id),
                              );
                              showToast("Removed from waitlist.");
                            } catch {
                              showToast("Error removing.", "error");
                            }
                          }}
                          style={{
                            padding: "9px 14px",
                            background: "transparent",
                            border: `1px solid ${T.redBorder}`,
                            color: T.red,
                            ...sf,
                            fontSize: 7,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
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
                    </div>
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
                justifyContent: "space-between",
                marginBottom: 24,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 4,
                    height: 28,
                    background: "linear-gradient(to bottom,#ef4444,#f59e0b)",
                  }}
                />
                <div>
                  <p
                    style={{
                      ...mono,
                      fontSize: 7,
                      color: "rgba(245,158,11,0.5)",
                      letterSpacing: "0.5em",
                      textTransform: "uppercase",
                      marginBottom: 2,
                    }}
                  >
                    HEADZ UP · ROSTER
                  </p>
                  <p
                    style={{
                      ...sf,
                      fontSize: 13,
                      fontWeight: 900,
                      textTransform: "uppercase",
                    }}
                  >
                    Client Book
                  </p>
                </div>
              </div>
              {/* Stats pills */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "Total", val: clients.length, color: T.amber },
                  {
                    label: "VIP",
                    val: clients.filter((c) => c.is_vip).length,
                    color: "#a78bfa",
                  },
                  {
                    label: "Strikes",
                    val: clients.filter((c) => (c.strike_count || 0) > 0)
                      .length,
                    color: "#f87171",
                  },
                  { label: "Blocked", val: blockList.length, color: "#52525b" },
                ].map(({ label, val, color }) => (
                  <div
                    key={label}
                    style={{
                      padding: "6px 12px",
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid rgba(255,255,255,0.08)`,
                    }}
                  >
                    <span style={{ ...mono, fontSize: 9, color: "#71717a" }}>
                      {label}{" "}
                    </span>
                    <span
                      style={{ ...sf, fontSize: 10, fontWeight: 900, color }}
                    >
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Search */}
            <input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search by name or email..."
              style={{
                width: "100%",
                background: T.surface,
                border: `1px solid ${T.border}`,
                padding: "13px 16px",
                color: "white",
                fontSize: 15,
                ...mono,
                outline: "none",
                marginBottom: 16,
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = T.amber)}
              onBlur={(e) => (e.target.style.borderColor = T.border)}
            />

            {clientDetail ? (
              /* ── CLIENT DETAIL VIEW ── */
              <div>
                <button
                  onClick={() => setClientDetail(null)}
                  style={{
                    ...mono,
                    fontSize: 10,
                    color: T.muted,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 0,
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = T.amber)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}
                >
                  ← Back to all clients
                </button>

                <div
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.amberBorder}`,
                    clipPath:
                      "polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,14px 100%,0 calc(100% - 14px))",
                  }}
                >
                  {/* Client header */}
                  <div
                    style={{
                      padding: "24px 22px",
                      borderBottom: `1px solid ${T.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 16,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 16 }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          background: clientDetail.is_vip
                            ? T.amber
                            : T.amberDim,
                          border: `2px solid ${clientDetail.is_vip ? T.amber : T.amberBorder}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          clipPath:
                            "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                        }}
                      >
                        <span
                          style={{
                            ...sf,
                            fontSize: 22,
                            fontWeight: 900,
                            color: clientDetail.is_vip ? "black" : T.amber,
                          }}
                        >
                          {clientDetail.name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 4,
                          }}
                        >
                          <p
                            style={{
                              ...sf,
                              fontSize: 14,
                              fontWeight: 900,
                              textTransform: "uppercase",
                            }}
                          >
                            {clientDetail.name}
                          </p>
                          {clientDetail.is_vip && (
                            <span
                              style={{
                                ...mono,
                                fontSize: 7,
                                color: "black",
                                background: T.amber,
                                padding: "2px 8px",
                                letterSpacing: "0.2em",
                              }}
                            >
                              VIP
                            </span>
                          )}
                          {(clientDetail.strike_count || 0) > 0 && (
                            <span
                              style={{
                                ...mono,
                                fontSize: 7,
                                color: "black",
                                background: "#ef4444",
                                padding: "2px 8px",
                                letterSpacing: "0.2em",
                              }}
                            >
                              ⚡ {clientDetail.strike_count} STRIKE
                              {clientDetail.strike_count > 1 ? "S" : ""}
                            </span>
                          )}
                        </div>
                        <p style={{ ...mono, fontSize: 11, color: "#a1a1aa" }}>
                          {clientDetail.email || "No email"}
                        </p>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={async () => {
                          try {
                            await API.patch(
                              `barber/clients/${clientDetail.id}/`,
                              { is_vip: !clientDetail.is_vip },
                            );
                            setClientDetail((p) => ({
                              ...p,
                              is_vip: !p.is_vip,
                            }));
                            setClients((p) =>
                              p.map((c) =>
                                c.id === clientDetail.id
                                  ? { ...c, is_vip: !c.is_vip }
                                  : c,
                              ),
                            );
                            showToast(
                              clientDetail.is_vip
                                ? "Removed VIP status"
                                : "⭐ Marked as VIP!",
                            );
                          } catch {
                            showToast("Error.", "error");
                          }
                        }}
                        style={{
                          padding: "9px 16px",
                          ...sf,
                          fontSize: 7,
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                          background: clientDetail.is_vip
                            ? T.amberDim
                            : "transparent",
                          border: `1px solid ${clientDetail.is_vip ? T.amber : T.border}`,
                          color: clientDetail.is_vip ? T.amber : T.muted,
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {clientDetail.is_vip ? "★ VIP" : "☆ VIP"}
                      </button>
                      <button
                        onClick={() => {
                          const username =
                            clientDetail.username || clientDetail.name;
                          const isBlocked = blockList.includes(username);
                          if (isBlocked) {
                            setBlockList((p) =>
                              p.filter((x) => x !== username),
                            );
                            showToast("Client unblocked.");
                          } else {
                            if (
                              !confirm(
                                `Block ${clientDetail.name}? They won't be able to book with you.`,
                              )
                            )
                              return;
                            setBlockList((p) => [...p, username]);
                            showToast(
                              `🚫 ${clientDetail.name} blocked.`,
                              "error",
                            );
                          }
                        }}
                        style={{
                          padding: "9px 16px",
                          ...sf,
                          fontSize: 7,
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                          background: blockList.includes(
                            clientDetail.username || clientDetail.name,
                          )
                            ? T.redDim
                            : "transparent",
                          border: `1px solid ${blockList.includes(clientDetail.username || clientDetail.name) ? T.redBorder : T.border}`,
                          color: blockList.includes(
                            clientDetail.username || clientDetail.name,
                          )
                            ? T.red
                            : T.muted,
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        🚫{" "}
                        {blockList.includes(
                          clientDetail.username || clientDetail.name,
                        )
                          ? "Unblock"
                          : "Block"}
                      </button>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4,1fr)",
                      borderBottom: `1px solid ${T.border}`,
                    }}
                  >
                    {[
                      {
                        label: "Visits",
                        val: clientDetail.total_visits || 0,
                        color: T.amber,
                      },
                      {
                        label: "Completed",
                        val: clientDetail.completed || 0,
                        color: T.green,
                      },
                      {
                        label: "No Shows",
                        val: clientDetail.no_shows || 0,
                        color: T.red,
                      },
                      {
                        label: "Deposit",
                        val: `$${clientDetail.deposit_fee || "10.00"}`,
                        color: "#a78bfa",
                      },
                    ].map(({ label, val, color }) => (
                      <div
                        key={label}
                        style={{
                          padding: "16px 12px",
                          borderRight: `1px solid ${T.border}`,
                          textAlign: "center",
                        }}
                      >
                        <p
                          style={{
                            ...sf,
                            fontSize: 18,
                            fontWeight: 900,
                            color,
                            lineHeight: 1,
                            marginBottom: 4,
                          }}
                        >
                          {val}
                        </p>
                        <p
                          style={{
                            ...mono,
                            fontSize: 8,
                            color: "#71717a",
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                          }}
                        >
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  <div style={{ padding: "20px 22px" }}>
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
                      Barber Notes
                    </p>
                    <textarea
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      rows={3}
                      placeholder="Preferred style, allergies, notes..."
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
                        lineHeight: 1.6,
                      }}
                      onFocus={(e) => (e.target.style.borderColor = T.amber)}
                      onBlur={(e) => (e.target.style.borderColor = T.border)}
                    />
                    <button
                      onClick={async () => {
                        setSavingCN(true);
                        try {
                          await API.patch(
                            `barber/clients/${clientDetail.id}/`,
                            { notes: clientNotes },
                          );
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
                        color: savingCN ? T.muted : "black",
                        ...sf,
                        fontSize: 8,
                        fontWeight: 700,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        border: "none",
                        cursor: savingCN ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        clipPath:
                          "polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px))",
                      }}
                    >
                      {savingCN ? "Saving..." : "Save Notes →"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── CLIENT LIST ── */
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {clients
                  .filter(
                    (c) =>
                      !clientSearch ||
                      c.name
                        ?.toLowerCase()
                        .includes(clientSearch.toLowerCase()) ||
                      c.email
                        ?.toLowerCase()
                        .includes(clientSearch.toLowerCase()),
                  )
                  .map((c) => {
                    const isBlocked = blockList.includes(c.username || c.name);
                    const strikes = c.strike_count || 0;
                    return (
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
                          background: isBlocked
                            ? "rgba(248,113,113,0.03)"
                            : T.surface,
                          border: `1px solid ${c.is_vip ? T.amberBorder : isBlocked ? T.redBorder : T.border}`,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          clipPath:
                            "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = T.amber;
                          e.currentTarget.style.background = T.amberDim;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = c.is_vip
                            ? T.amberBorder
                            : isBlocked
                              ? T.redBorder
                              : T.border;
                          e.currentTarget.style.background = isBlocked
                            ? "rgba(248,113,113,0.03)"
                            : T.surface;
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
                              width: 40,
                              height: 40,
                              background: c.is_vip
                                ? T.amber
                                : isBlocked
                                  ? T.redDim
                                  : T.surface2,
                              border: `1px solid ${c.is_vip ? T.amber : isBlocked ? T.redBorder : T.border}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              clipPath:
                                "polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px))",
                            }}
                          >
                            <span
                              style={{
                                ...sf,
                                fontSize: 15,
                                fontWeight: 900,
                                color: c.is_vip
                                  ? "black"
                                  : isBlocked
                                    ? T.red
                                    : T.muted,
                              }}
                            >
                              {c.name?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 2,
                              }}
                            >
                              <p
                                style={{
                                  ...sf,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  color: isBlocked ? "#71717a" : "white",
                                }}
                              >
                                {c.name}
                              </p>
                              {c.is_vip && (
                                <span
                                  style={{
                                    ...mono,
                                    fontSize: 7,
                                    color: T.amber,
                                  }}
                                >
                                  ★ VIP
                                </span>
                              )}
                              {strikes > 0 && (
                                <span
                                  style={{
                                    ...mono,
                                    fontSize: 7,
                                    color: "#f87171",
                                  }}
                                >
                                  ⚡ {strikes}
                                </span>
                              )}
                              {isBlocked && (
                                <span
                                  style={{ ...mono, fontSize: 7, color: T.red }}
                                >
                                  🚫 BLOCKED
                                </span>
                              )}
                            </div>
                            <p
                              style={{ ...mono, fontSize: 9, color: "#71717a" }}
                            >
                              {c.total_visits || 0} visits{" "}
                              {c.last_visit
                                ? `· Last: ${fmtShort(c.last_visit)}`
                                : ""}{" "}
                            </p>
                          </div>
                        </div>
                        <span style={{ ...mono, fontSize: 10, color: T.muted }}>
                          →
                        </span>
                      </div>
                    );
                  })}
                {clients.filter(
                  (c) =>
                    !clientSearch ||
                    c.name?.toLowerCase().includes(clientSearch.toLowerCase()),
                ).length === 0 && (
                  <div
                    style={{
                      padding: "48px 20px",
                      textAlign: "center",
                      border: `1px solid ${T.border}`,
                      background: T.surface,
                    }}
                  >
                    <p
                      style={{
                        ...sf,
                        fontSize: 9,
                        color: "rgba(255,255,255,0.08)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
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
                    width: 4,
                    height: 28,
                    background: "linear-gradient(to bottom,#ef4444,#f59e0b)",
                  }}
                />
                <div>
                  <p
                    style={{
                      ...mono,
                      fontSize: 7,
                      color: "rgba(245,158,11,0.5)",
                      letterSpacing: "0.5em",
                      textTransform: "uppercase",
                      marginBottom: 2,
                    }}
                  >
                    HEADZ UP · ANALYTICS
                  </p>
                  <p
                    style={{
                      ...sf,
                      fontSize: 13,
                      fontWeight: 900,
                      textTransform: "uppercase",
                    }}
                  >
                    Reports
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["week", "month", "year", "all"].map((k) => (
                  <button
                    key={k}
                    onClick={() => setReportPeriod(k)}
                    style={{
                      padding: "8px 14px",
                      ...sf,
                      fontSize: 6.5,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      background: reportPeriod === k ? T.amber : T.surface,
                      color: reportPeriod === k ? "black" : T.muted,
                      border: `1px solid ${reportPeriod === k ? T.amber : T.border}`,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      clipPath:
                        "polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px))",
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {!reports ? (
              <div style={{ padding: "64px 0", textAlign: "center" }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    border: `2px solid rgba(245,158,11,0.2)`,
                    borderTopColor: T.amber,
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto 12px",
                  }}
                />
                <p style={{ ...mono, fontSize: 11, color: T.muted }}>
                  Loading analytics...
                </p>
              </div>
            ) : (
              <>
                {/* ── BIG SUMMARY CARDS ── */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "repeat(2,1fr)"
                      : "repeat(4,1fr)",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  {[
                    {
                      label: "Total Bookings",
                      value: reports.summary?.total || 0,
                      icon: "📅",
                      color: T.amber,
                      bg: T.amberDim,
                      border: T.amberBorder,
                    },
                    {
                      label: "Completed",
                      value: reports.summary?.completed || 0,
                      icon: "✓",
                      color: T.green,
                      bg: T.greenDim,
                      border: T.greenBorder,
                    },
                    {
                      label: "Cancelled",
                      value: reports.summary?.cancelled || 0,
                      icon: "✕",
                      color: "#f87171",
                      bg: "rgba(248,113,113,0.06)",
                      border: "rgba(248,113,113,0.2)",
                    },
                    {
                      label: "No Shows",
                      value: reports.summary?.no_shows || 0,
                      icon: "⚡",
                      color: "#f59e0b",
                      bg: "rgba(245,158,11,0.06)",
                      border: "rgba(245,158,11,0.2)",
                    },
                  ].map(({ label, value, icon, color, bg, border }) => (
                    <div
                      key={label}
                      style={{
                        padding: isMobile ? "16px 12px" : "20px 16px",
                        background: bg,
                        border: `1px solid ${border}`,
                        position: "relative",
                        overflow: "hidden",
                        clipPath:
                          "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 12,
                          fontSize: 20,
                          opacity: 0.3,
                        }}
                      >
                        {icon}
                      </div>
                      <p
                        style={{
                          ...mono,
                          fontSize: 8,
                          color: color,
                          textTransform: "uppercase",
                          letterSpacing: "0.3em",
                          marginBottom: 8,
                          opacity: 0.8,
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          ...sf,
                          fontSize: isMobile ? 28 : 34,
                          fontWeight: 900,
                          color,
                          lineHeight: 1,
                          margin: 0,
                        }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Second row — reschedules + strikes + walk-ins */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "repeat(2,1fr)"
                      : "repeat(4,1fr)",
                    gap: 8,
                    marginBottom: 20,
                  }}
                >
                  {[
                    {
                      label: "Rescheduled",
                      value: reports.summary?.reschedules || 0,
                      icon: "↻",
                      color: "#a78bfa",
                    },
                    {
                      label: "On Strike",
                      value: reports.summary?.clients_on_strike || 0,
                      icon: "⚡",
                      color: "#f87171",
                    },
                    {
                      label: "Walk-ins",
                      value: reports.summary?.walk_ins || 0,
                      icon: "🚶",
                      color: T.amber,
                    },
                    {
                      label: "No-show Rate",
                      value: `${reports.summary?.no_show_rate || 0}%`,
                      icon: "📊",
                      color: "#f59e0b",
                    },
                  ].map(({ label, value, icon, color }) => (
                    <div
                      key={label}
                      style={{
                        padding: isMobile ? "14px 12px" : "16px 16px",
                        background: T.surface,
                        border: `1px solid ${T.border}`,
                        position: "relative",
                        overflow: "hidden",
                        clipPath:
                          "polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 10,
                          fontSize: 16,
                          opacity: 0.2,
                        }}
                      >
                        {icon}
                      </div>
                      <p
                        style={{
                          ...mono,
                          fontSize: 7,
                          color: "#71717a",
                          textTransform: "uppercase",
                          letterSpacing: "0.25em",
                          marginBottom: 6,
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          ...sf,
                          fontSize: isMobile ? 22 : 26,
                          fontWeight: 900,
                          color,
                          lineHeight: 1,
                          margin: 0,
                        }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* ── REVENUE CARDS ── */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)",
                    gap: 8,
                    marginBottom: 24,
                  }}
                >
                  {[
                    {
                      label: "Total Revenue",
                      value: `$${reports.summary?.total_revenue || "0.00"}`,
                      color: T.amber,
                    },
                    {
                      label: "Online Revenue",
                      value: `$${reports.summary?.online_revenue || "0.00"}`,
                      color: "#a78bfa",
                    },
                    {
                      label: "Shop Revenue",
                      value: `$${reports.summary?.shop_revenue || "0.00"}`,
                      color: T.green,
                    },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      style={{
                        padding: "18px 20px",
                        background: T.surface,
                        border: `1px solid ${T.border}`,
                        clipPath:
                          "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                      }}
                    >
                      <p
                        style={{
                          ...mono,
                          fontSize: 8,
                          color: "#71717a",
                          textTransform: "uppercase",
                          letterSpacing: "0.3em",
                          marginBottom: 6,
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          ...sf,
                          fontSize: 26,
                          fontWeight: 900,
                          color,
                          lineHeight: 1,
                        }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* ── COMPLETION RATE VISUAL ── */}
                <div
                  style={{
                    marginBottom: 20,
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    padding: "20px",
                    clipPath:
                      "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <p
                      style={{
                        ...sf,
                        fontSize: 7,
                        letterSpacing: "0.3em",
                        color: T.muted,
                        textTransform: "uppercase",
                      }}
                    >
                      Completion Rate
                    </p>
                    <p
                      style={{
                        ...sf,
                        fontSize: 16,
                        fontWeight: 900,
                        color: T.green,
                      }}
                    >
                      {reports.summary?.completion_rate || 0}%
                    </p>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: T.border,
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${reports.summary?.completion_rate || 0}%`,
                        background: `linear-gradient(to right,#22c55e,#4ade80)`,
                        transition: "width 1s ease",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 8,
                    }}
                  >
                    <span style={{ ...mono, fontSize: 9, color: "#71717a" }}>
                      No-show rate: {reports.summary?.no_show_rate || 0}%
                    </span>
                    <span style={{ ...mono, fontSize: 9, color: "#71717a" }}>
                      Walk-ins: {reports.summary?.walk_ins || 0}
                    </span>
                  </div>
                </div>

                {/* ── BAR CHART — Daily Revenue (last 14 days) ── */}
                {reports.daily?.length > 0 && (
                  <div
                    style={{
                      marginBottom: 20,
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      padding: "20px",
                      clipPath:
                        "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
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
                      Revenue — Last 14 Days
                    </p>
                    {(() => {
                      const last14 = reports.daily.slice(-14);
                      const maxRev = Math.max(
                        ...last14.map((d) => d.revenue || 0),
                        1,
                      );
                      return (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-end",
                            gap: isMobile ? 3 : 5,
                            height: 100,
                          }}
                        >
                          {last14.map((d, i) => {
                            const pct = ((d.revenue || 0) / maxRev) * 100;
                            const isToday = d.date === todayISO();
                            return (
                              <div
                                key={i}
                                style={{
                                  flex: 1,
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <span
                                  style={{
                                    ...mono,
                                    fontSize: 7,
                                    color: T.amber,
                                    opacity: d.revenue > 0 ? 1 : 0,
                                  }}
                                >
                                  ${d.revenue || 0}
                                </span>
                                <div
                                  style={{
                                    width: "100%",
                                    background: isToday
                                      ? T.amber
                                      : `linear-gradient(to top,rgba(245,158,11,0.6),rgba(245,158,11,0.3))`,
                                    height: `${Math.max(pct, 3)}%`,
                                    transition: "height 0.5s ease",
                                    border: isToday
                                      ? `1px solid ${T.amber}`
                                      : "none",
                                  }}
                                />
                                <span
                                  style={{
                                    ...mono,
                                    fontSize: isMobile ? 6 : 7,
                                    color: isToday ? T.amber : T.muted,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {d.label?.split(" ")[1] || d.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── PIE CHART — Booking Status ── (CSS-based) */}
                {(() => {
                  const s = reports.summary || {};
                  const total = s.total || 1;
                  const completed = Math.round(
                    ((s.completed || 0) / total) * 100,
                  );
                  const cancelled = Math.round(
                    ((s.cancelled || 0) / total) * 100,
                  );
                  const no_shows = Math.round(
                    ((s.no_shows || 0) / total) * 100,
                  );
                  const confirmed = 100 - completed - cancelled - no_shows;
                  return (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        gap: 12,
                        marginBottom: 20,
                      }}
                    >
                      {/* Donut chart */}
                      <div
                        style={{
                          background: T.surface,
                          border: `1px solid ${T.border}`,
                          padding: "20px",
                          clipPath:
                            "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
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
                          Booking Breakdown
                        </p>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 20,
                          }}
                        >
                          {/* SVG donut */}
                          <svg
                            width="100"
                            height="100"
                            viewBox="0 0 100 100"
                            style={{ flexShrink: 0 }}
                          >
                            {(() => {
                              const data = [
                                { pct: completed, color: "#22c55e" },
                                { pct: confirmed, color: "#f59e0b" },
                                { pct: cancelled, color: "#f87171" },
                                { pct: no_shows, color: "#ef4444" },
                              ];
                              let offset = 0;
                              const r = 35;
                              const cx = 50;
                              const cy = 50;
                              const circ = 2 * Math.PI * r;
                              return data.map((d, i) => {
                                if (!d.pct) return null;
                                const dash = (d.pct / 100) * circ;
                                const el = (
                                  <circle
                                    key={i}
                                    cx={cx}
                                    cy={cy}
                                    r={r}
                                    fill="none"
                                    stroke={d.color}
                                    strokeWidth="14"
                                    strokeDasharray={`${dash} ${circ - dash}`}
                                    strokeDashoffset={(-offset * circ) / 100}
                                    transform="rotate(-90 50 50)"
                                    opacity="0.9"
                                  />
                                );
                                offset += d.pct;
                                return el;
                              });
                            })()}
                            <circle cx="50" cy="50" r="21" fill={T.bg} />
                            <text
                              x="50"
                              y="47"
                              textAnchor="middle"
                              style={{
                                fill: "white",
                                fontSize: "11px",
                                fontWeight: 900,
                              }}
                            >
                              {s.total || 0}
                            </text>
                            <text
                              x="50"
                              y="57"
                              textAnchor="middle"
                              style={{ fill: "#71717a", fontSize: "7px" }}
                            >
                              total
                            </text>
                          </svg>
                          {/* Legend */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                            }}
                          >
                            {[
                              {
                                label: "Completed",
                                pct: completed,
                                color: "#22c55e",
                              },
                              {
                                label: "Confirmed",
                                pct: confirmed,
                                color: T.amber,
                              },
                              {
                                label: "Cancelled",
                                pct: cancelled,
                                color: "#f87171",
                              },
                              {
                                label: "No Show",
                                pct: no_shows,
                                color: "#ef4444",
                              },
                            ].map(({ label, pct, color }) => (
                              <div
                                key={label}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <div
                                  style={{
                                    width: 10,
                                    height: 10,
                                    background: color,
                                    flexShrink: 0,
                                  }}
                                />
                                <span
                                  style={{
                                    ...mono,
                                    fontSize: 9,
                                    color: "#a1a1aa",
                                  }}
                                >
                                  {label}
                                </span>
                                <span
                                  style={{
                                    ...sf,
                                    fontSize: 9,
                                    fontWeight: 900,
                                    color,
                                    marginLeft: "auto",
                                  }}
                                >
                                  {pct}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Busiest hours bar */}
                      <div
                        style={{
                          background: T.surface,
                          border: `1px solid ${T.border}`,
                          padding: "20px",
                          clipPath:
                            "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
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
                          Busiest Hours
                        </p>
                        {reports.busiest_hours?.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-end",
                              gap: 3,
                              height: 80,
                            }}
                          >
                            {reports.busiest_hours.map((h, i) => {
                              const maxC = Math.max(
                                ...reports.busiest_hours.map(
                                  (x) => x.bookings || 0,
                                ),
                                1,
                              );
                              const cnt = h.bookings || 0;
                              const pct = (cnt / maxC) * 100;
                              return (
                                <div
                                  key={i}
                                  style={{
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: "100%",
                                      background:
                                        pct > 60
                                          ? T.amber
                                          : "rgba(245,158,11,0.35)",
                                      height: `${Math.max(pct, 4)}%`,
                                      transition: "height 0.5s ease",
                                    }}
                                  />
                                  <span
                                    style={{
                                      ...mono,
                                      fontSize: 6,
                                      color: T.muted,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {h.label || h.hour}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p style={{ ...mono, fontSize: 11, color: T.muted }}>
                            No data yet
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* ── TOP SERVICES ── */}
                {reports.services?.length > 0 && (
                  <div
                    style={{
                      marginBottom: 20,
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      padding: "20px",
                      clipPath:
                        "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
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
                      Top Services
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {reports.services.map((s, i) => {
                        const maxB = reports.services[0]?.bookings || 1;
                        const pct = Math.round(
                          ((s.bookings || 0) / maxB) * 100,
                        );
                        return (
                          <div key={i}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 6,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <span
                                  style={{
                                    ...mono,
                                    fontSize: 9,
                                    color: "#52525b",
                                    minWidth: 20,
                                  }}
                                >
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                                <span
                                  style={{
                                    ...mono,
                                    fontSize: 12,
                                    color: "#d4d4d4",
                                  }}
                                >
                                  {s.name}
                                </span>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 16,
                                  alignItems: "center",
                                }}
                              >
                                <span
                                  style={{
                                    ...sf,
                                    fontSize: 10,
                                    color: T.amber,
                                    fontWeight: 900,
                                  }}
                                >
                                  {s.bookings} cuts
                                </span>
                                <span
                                  style={{
                                    ...mono,
                                    fontSize: 10,
                                    color: T.green,
                                  }}
                                >
                                  ${s.revenue}
                                </span>
                              </div>
                            </div>
                            <div
                              style={{
                                height: 3,
                                background: T.border,
                                borderRadius: 2,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${pct}%`,
                                  background: `linear-gradient(to right,#f59e0b,#fbbf24)`,
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

                {/* ── TOP CLIENTS ── */}
                {reports.top_clients?.length > 0 && (
                  <div
                    style={{
                      marginBottom: 20,
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      padding: "20px",
                      clipPath:
                        "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
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
                      Top Clients
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {reports.top_clients.map((c, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 14px",
                            background: T.surface2,
                            border: `1px solid ${T.border}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                background: i === 0 ? T.amber : T.amberDim,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <span
                                style={{
                                  ...sf,
                                  fontSize: 10,
                                  fontWeight: 900,
                                  color: i === 0 ? "black" : T.amber,
                                }}
                              >
                                {i + 1}
                              </span>
                            </div>
                            <p
                              style={{
                                ...mono,
                                fontSize: 12,
                                color: "#d4d4d4",
                              }}
                            >
                              {c.name}
                            </p>
                          </div>
                          <span
                            style={{
                              ...sf,
                              fontSize: 11,
                              fontWeight: 900,
                              color: T.amber,
                            }}
                          >
                            {c.visits} visits
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ NEWSLETTER TAB ══ */}
        {activeTab === "newsletter" && (
          <div className="bd-enter">
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 4,
                    height: 28,
                    background: "linear-gradient(to bottom,#ef4444,#f59e0b)",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <p
                    style={{
                      ...mono,
                      fontSize: 7,
                      color: "rgba(245,158,11,0.5)",
                      letterSpacing: "0.5em",
                      textTransform: "uppercase",
                      marginBottom: 2,
                    }}
                  >
                    HEADZ UP · UPDATES
                  </p>
                  <p
                    style={{
                      ...sf,
                      fontSize: 13,
                      fontWeight: 900,
                      textTransform: "uppercase",
                    }}
                  >
                    Newsletter Posts
                  </p>
                </div>
              </div>
              <a
                href="/newsletter"
                target="_blank"
                style={{
                  ...mono,
                  fontSize: 10,
                  color: T.amber,
                  border: `1px solid ${T.amberBorder}`,
                  padding: "8px 14px",
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = T.amberDim)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                View Public Page →
              </a>
            </div>

            {/* Create / Edit form */}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${nlEditing ? "#635bff" : "rgba(245,158,11,0.2)"}`,
                padding: "22px",
                marginBottom: 24,
                clipPath:
                  "polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))",
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 7,
                  letterSpacing: "0.4em",
                  color: nlEditing ? "#a78bfa" : T.amber,
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                {nlEditing ? "✏️ Editing Post" : "📣 Create New Post"}
              </p>

              {nlError && (
                <p
                  style={{
                    ...mono,
                    fontSize: 11,
                    color: "#f87171",
                    marginBottom: 10,
                  }}
                >
                  ⚠ {nlError}
                </p>
              )}
              {nlSuccess && (
                <p
                  style={{
                    ...mono,
                    fontSize: 11,
                    color: "#4ade80",
                    marginBottom: 10,
                  }}
                >
                  ✓ {nlSuccess}
                </p>
              )}

              {/* Title */}
              <input
                value={nlForm.title}
                onChange={(e) =>
                  setNlForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Post title..."
                style={{
                  width: "100%",
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  padding: "13px 16px",
                  color: "white",
                  fontSize: 15,
                  ...mono,
                  outline: "none",
                  marginBottom: 10,
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = T.amber)}
                onBlur={(e) => (e.target.style.borderColor = T.border)}
              />

              {/* Category + emoji row */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <select
                  value={nlForm.category}
                  onChange={(e) =>
                    setNlForm((p) => ({ ...p, category: e.target.value }))
                  }
                  style={{
                    flex: 2,
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    padding: "12px 14px",
                    color: "white",
                    fontSize: 14,
                    ...mono,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {[
                    ["deal", "💸 Deal / Discount"],
                    ["promo", "🎯 Promotion"],
                    ["update", "📢 Shop Update"],
                    ["event", "🎉 Event"],
                    ["general", "✂️ General"],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <input
                  value={nlForm.emoji}
                  onChange={(e) =>
                    setNlForm((p) => ({ ...p, emoji: e.target.value }))
                  }
                  placeholder="Emoji"
                  style={{
                    width: 60,
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    padding: "12px",
                    color: "white",
                    fontSize: 20,
                    outline: "none",
                    textAlign: "center",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 14px",
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    setNlForm((p) => ({ ...p, pinned: !p.pinned }))
                  }
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: `2px solid ${nlForm.pinned ? T.amber : "rgba(255,255,255,0.2)"}`,
                      background: nlForm.pinned
                        ? "rgba(245,158,11,0.15)"
                        : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {nlForm.pinned && (
                      <span style={{ color: T.amber, fontSize: 10 }}>✓</span>
                    )}
                  </div>
                  <span
                    style={{
                      ...mono,
                      fontSize: 10,
                      color: nlForm.pinned ? T.amber : "#71717a",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Pin
                  </span>
                </div>
              </div>

              {/* Body */}
              <textarea
                value={nlForm.body}
                onChange={(e) =>
                  setNlForm((p) => ({ ...p, body: e.target.value }))
                }
                placeholder="Write your post — deals, promos, shop news, hours changes..."
                rows={5}
                style={{
                  width: "100%",
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  padding: "13px 16px",
                  color: "white",
                  fontSize: 14,
                  ...mono,
                  outline: "none",
                  resize: "vertical",
                  marginBottom: 14,
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = T.amber)}
                onBlur={(e) => (e.target.style.borderColor = T.border)}
              />

              {/* Buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={async () => {
                    setNlError("");
                    setNlSuccess("");
                    if (!nlForm.title.trim() || !nlForm.body.trim()) {
                      setNlError("Title and body required");
                      return;
                    }
                    try {
                      if (nlEditing) {
                        await API.patch(
                          `newsletter/manage/${nlEditing}/`,
                          nlForm,
                        );
                        setNlSuccess("Post updated!");
                      } else {
                        await API.post("newsletter/manage/", nlForm);
                        setNlSuccess("Post published!");
                      }
                      setNlForm({
                        title: "",
                        body: "",
                        category: "general",
                        emoji: "✂️",
                        pinned: false,
                      });
                      setNlEditing(null);
                      loadNewsletter();
                    } catch (e) {
                      setNlError(e.response?.data?.error || "Could not save.");
                    }
                  }}
                  style={{
                    padding: "12px 24px",
                    background: nlEditing ? "#635bff" : T.amber,
                    color: "black",
                    ...sf,
                    fontSize: 7.5,
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: "pointer",
                    transition: "opacity 0.2s",
                    clipPath:
                      "polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px))",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  {nlEditing ? "Update Post →" : "Publish Post →"}
                </button>
                {nlEditing && (
                  <button
                    onClick={() => {
                      setNlEditing(null);
                      setNlForm({
                        title: "",
                        body: "",
                        category: "general",
                        emoji: "✂️",
                        pinned: false,
                      });
                      setNlError("");
                      setNlSuccess("");
                    }}
                    style={{
                      padding: "12px 18px",
                      background: "transparent",
                      color: "#71717a",
                      ...sf,
                      fontSize: 7,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      border: `1px solid ${T.border}`,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Posts list */}
            {nlLoading ? (
              <div style={{ padding: "40px", textAlign: "center" }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: `2px solid rgba(245,158,11,0.2)`,
                    borderTopColor: T.amber,
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto",
                  }}
                />
              </div>
            ) : nlPosts.length === 0 ? (
              <div
                style={{
                  padding: "48px 20px",
                  textAlign: "center",
                  border: `1px solid ${T.border}`,
                  background: T.surface,
                }}
              >
                <p style={{ fontSize: 32, marginBottom: 10 }}>📣</p>
                <p
                  style={{
                    ...sf,
                    fontSize: 9,
                    color: "rgba(255,255,255,0.08)",
                    textTransform: "uppercase",
                  }}
                >
                  No posts yet
                </p>
                <p
                  style={{
                    ...mono,
                    fontSize: 11,
                    color: "#71717a",
                    marginTop: 8,
                  }}
                >
                  Create your first post above
                </p>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {nlPosts.map((post) => (
                  <div
                    key={post.id}
                    style={{
                      background: T.surface,
                      border: `1px solid ${post.pinned ? T.amberBorder : T.border}`,
                      overflow: "hidden",
                      clipPath:
                        "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                    }}
                  >
                    <div
                      style={{
                        height: 2,
                        background: post.pinned
                          ? "linear-gradient(to right,#ef4444,#f59e0b)"
                          : "rgba(255,255,255,0.05)",
                      }}
                    />
                    <div style={{ padding: "16px 20px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 10,
                          marginBottom: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <span style={{ fontSize: 20 }}>{post.emoji}</span>
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 2,
                              }}
                            >
                              <p
                                style={{
                                  ...sf,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                }}
                              >
                                {post.title}
                              </p>
                              {post.pinned && (
                                <span
                                  style={{
                                    ...mono,
                                    fontSize: 7,
                                    color: T.amber,
                                    background: T.amberDim,
                                    padding: "1px 6px",
                                    border: `1px solid ${T.amberBorder}`,
                                  }}
                                >
                                  📌 Pinned
                                </span>
                              )}
                              <span
                                style={{
                                  ...mono,
                                  fontSize: 7,
                                  color: "#71717a",
                                  background: "rgba(255,255,255,0.04)",
                                  padding: "1px 8px",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                }}
                              >
                                {post.category}
                              </span>
                            </div>
                            <p
                              style={{ ...mono, fontSize: 9, color: "#71717a" }}
                            >
                              {post.created_at}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => {
                              setNlEditing(post.id);
                              setNlForm({
                                title: post.title,
                                body: post.body,
                                category: post.category,
                                emoji: post.emoji,
                                pinned: post.pinned,
                              });
                              setNlError("");
                              setNlSuccess("");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            style={{
                              padding: "6px 14px",
                              ...sf,
                              fontSize: 6,
                              letterSpacing: "0.15em",
                              textTransform: "uppercase",
                              background: "transparent",
                              border: `1px solid ${T.border}`,
                              color: "#a1a1aa",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = T.amber;
                              e.currentTarget.style.color = T.amber;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = T.border;
                              e.currentTarget.style.color = "#a1a1aa";
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm("Delete this post?")) return;
                              try {
                                await API.delete(
                                  `newsletter/manage/${post.id}/`,
                                );
                                setNlPosts((p) =>
                                  p.filter((x) => x.id !== post.id),
                                );
                                showToast("Post deleted.");
                              } catch {
                                showToast("Error.", "error");
                              }
                            }}
                            style={{
                              padding: "6px 14px",
                              ...sf,
                              fontSize: 6,
                              letterSpacing: "0.1em",
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
                            Delete
                          </button>
                        </div>
                      </div>
                      <p
                        style={{
                          ...mono,
                          fontSize: 12,
                          color: "#a1a1aa",
                          lineHeight: 1.75,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {post.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ PRICING TAB ══ */}
        {activeTab === "pricing" && (
          <div className="bd-enter" style={{ maxWidth: 580 }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <p
                style={{
                  ...mono,
                  fontSize: 8,
                  color: "rgba(245,158,11,0.5)",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                HEADZ UP · YOUR RATES
              </p>
              <h2
                style={{
                  ...sf,
                  fontSize: 22,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "-0.03em",
                  margin: 0,
                }}
              >
                Service
                <br />
                <span style={{ color: T.amber, fontStyle: "italic" }}>
                  Pricing_
                </span>
              </h2>
              <p
                style={{
                  ...mono,
                  fontSize: 12,
                  color: T.muted,
                  marginTop: 10,
                  lineHeight: 1.7,
                }}
              >
                Set your own prices for each service. Your custom price
                overrides the shop default. Clients will see your rate when
                booking with you.
              </p>
            </div>

            {pricingList.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center" }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: "2px solid rgba(245,158,11,0.2)",
                    borderTopColor: T.amber,
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto 12px",
                  }}
                />
                <p style={{ ...mono, fontSize: 11, color: T.dim }}>
                  Loading services...
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pricingList.map((svc) => {
                  const editing = pricingEdits[svc.id] !== undefined;
                  const editVal = editing ? pricingEdits[svc.id] : "";
                  const saving = pricingSaving[svc.id];
                  const hasCustom = svc.is_custom;

                  const savePrice = async () => {
                    const val = parseFloat(editVal);
                    if (isNaN(val) || val < 0) {
                      showToast("Enter a valid price.", "error");
                      return;
                    }
                    setPricingSaving((p) => ({ ...p, [svc.id]: true }));
                    try {
                      await API.post("barber/service-prices/", {
                        service_id: svc.id,
                        price: val,
                      });
                      setPricingList((p) =>
                        p.map((s) =>
                          s.id === svc.id
                            ? {
                                ...s,
                                custom_price: val,
                                effective_price: val,
                                is_custom: true,
                              }
                            : s,
                        ),
                      );
                      setPricingEdits((p) => {
                        const n = { ...p };
                        delete n[svc.id];
                        return n;
                      });
                      showToast(`✓ ${svc.name} updated to $${val.toFixed(2)}`);
                    } catch (e) {
                      showToast(
                        e.response?.data?.error || "Could not update price.",
                        "error",
                      );
                    } finally {
                      setPricingSaving((p) => ({ ...p, [svc.id]: false }));
                    }
                  };

                  const resetPrice = async () => {
                    setPricingSaving((p) => ({ ...p, [svc.id]: true }));
                    try {
                      await API.delete(`barber/service-prices/${svc.id}/`);
                      setPricingList((p) =>
                        p.map((s) =>
                          s.id === svc.id
                            ? {
                                ...s,
                                custom_price: null,
                                effective_price: s.default_price,
                                is_custom: false,
                              }
                            : s,
                        ),
                      );
                      setPricingEdits((p) => {
                        const n = { ...p };
                        delete n[svc.id];
                        return n;
                      });
                      showToast(
                        `${svc.name} reset to shop default ($${svc.default_price.toFixed(2)})`,
                      );
                    } catch (e) {
                      showToast("Could not reset.", "error");
                    } finally {
                      setPricingSaving((p) => ({ ...p, [svc.id]: false }));
                    }
                  };

                  return (
                    <div
                      key={svc.id}
                      style={{
                        background: T.surface,
                        border: `1px solid ${hasCustom ? "rgba(245,158,11,0.2)" : T.border}`,
                        clipPath:
                          "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                        padding: "16px 18px",
                        transition: "border-color 0.2s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        {/* Left: service info */}
                        <div style={{ flex: 1, minWidth: 160 }}>
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
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                margin: 0,
                              }}
                            >
                              {svc.name}
                            </p>
                            {hasCustom && (
                              <span
                                style={{
                                  ...mono,
                                  fontSize: 7,
                                  color: T.amber,
                                  padding: "2px 7px",
                                  background: "rgba(245,158,11,0.08)",
                                  border: "1px solid rgba(245,158,11,0.2)",
                                }}
                              >
                                CUSTOM
                              </span>
                            )}
                          </div>
                          <p
                            style={{
                              ...mono,
                              fontSize: 10,
                              color: T.dim,
                              margin: 0,
                            }}
                          >
                            {svc.duration_minutes} min
                          </p>
                          {hasCustom && (
                            <p
                              style={{
                                ...mono,
                                fontSize: 9,
                                color: "#52525b",
                                margin: "4px 0 0",
                              }}
                            >
                              Shop default:{" "}
                              <span style={{ color: T.muted }}>
                                ${svc.default_price.toFixed(2)}
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Right: price display + edit */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexShrink: 0,
                          }}
                        >
                          {editing ? (
                            <>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  background: "#050505",
                                  border: `1px solid ${T.amber}`,
                                  overflow: "hidden",
                                }}
                              >
                                <span
                                  style={{
                                    ...mono,
                                    fontSize: 14,
                                    color: T.amber,
                                    padding: "0 8px 0 12px",
                                    lineHeight: 1,
                                  }}
                                >
                                  $
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.50"
                                  value={editVal}
                                  onChange={(e) =>
                                    setPricingEdits((p) => ({
                                      ...p,
                                      [svc.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") savePrice();
                                    if (e.key === "Escape")
                                      setPricingEdits((p) => {
                                        const n = { ...p };
                                        delete n[svc.id];
                                        return n;
                                      });
                                  }}
                                  autoFocus
                                  style={{
                                    width: 80,
                                    padding: "10px 10px 10px 0",
                                    background: "transparent",
                                    border: "none",
                                    color: "white",
                                    ...mono,
                                    fontSize: 14,
                                    outline: "none",
                                  }}
                                />
                              </div>
                              <button
                                onClick={savePrice}
                                disabled={saving}
                                style={{
                                  padding: "10px 14px",
                                  background: saving ? "#111" : T.amber,
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
                                {saving ? "..." : "Save"}
                              </button>
                              <button
                                onClick={() =>
                                  setPricingEdits((p) => {
                                    const n = { ...p };
                                    delete n[svc.id];
                                    return n;
                                  })
                                }
                                style={{
                                  padding: "10px 12px",
                                  background: "transparent",
                                  border: `1px solid ${T.border}`,
                                  color: T.muted,
                                  ...mono,
                                  fontSize: 11,
                                  cursor: "pointer",
                                }}
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <p
                                style={{
                                  ...sf,
                                  fontSize: 18,
                                  fontWeight: 900,
                                  color: hasCustom ? T.amber : "white",
                                  margin: 0,
                                  letterSpacing: "-0.02em",
                                }}
                              >
                                ${svc.effective_price.toFixed(2)}
                              </p>
                              <button
                                onClick={() =>
                                  setPricingEdits((p) => ({
                                    ...p,
                                    [svc.id]: String(svc.effective_price),
                                  }))
                                }
                                style={{
                                  padding: "8px 14px",
                                  background: "transparent",
                                  border: `1px solid ${T.border}`,
                                  color: T.muted,
                                  ...mono,
                                  fontSize: 10,
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
                                Edit
                              </button>
                              {hasCustom && (
                                <button
                                  onClick={resetPrice}
                                  disabled={saving}
                                  style={{
                                    padding: "8px 10px",
                                    background: "transparent",
                                    border: "1px solid rgba(248,113,113,0.2)",
                                    color: "#f87171",
                                    ...mono,
                                    fontSize: 10,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background =
                                      "rgba(248,113,113,0.06)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background =
                                      "transparent";
                                  }}
                                >
                                  Reset
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Footer note */}
                <div
                  style={{
                    marginTop: 8,
                    padding: "12px 14px",
                    background: "rgba(245,158,11,0.04)",
                    border: "1px solid rgba(245,158,11,0.1)",
                  }}
                >
                  <p
                    style={{
                      ...mono,
                      fontSize: 10,
                      color: "rgba(245,158,11,0.5)",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    💲 Custom prices only apply to bookings with you. Other
                    barbers keep their own rates. Press{" "}
                    <strong style={{ color: T.amber }}>Edit</strong> to change a
                    price, <strong style={{ color: "#f87171" }}>Reset</strong>{" "}
                    to go back to the shop default.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ AVAILABILITY TAB ══ */}
        {activeTab === "availability" && (
          <div className="bd-enter" style={{ maxWidth: 640 }}>
            {/* ── PROFILE PHOTO ── */}
            <div
              style={{
                marginBottom: 28,
                background: T.surface,
                border: `1px solid rgba(245,158,11,0.25)`,
                clipPath:
                  "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
              }}
            >
              {/* Header */}
              <div
                style={{
                  background: "#000",
                  padding: "14px 20px",
                  borderBottom: `1px solid ${T.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 3,
                    height: 22,
                    background: T.amber,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <p
                    style={{
                      ...mono,
                      fontSize: 7,
                      color: "rgba(245,158,11,0.5)",
                      letterSpacing: "0.5em",
                      textTransform: "uppercase",
                      marginBottom: 1,
                    }}
                  >
                    Profile
                  </p>
                  <p
                    style={{
                      ...sf,
                      fontSize: 11,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      margin: 0,
                    }}
                  >
                    Your Photo
                  </p>
                </div>
              </div>

              <div
                style={{
                  padding: "24px 20px",
                  display: "flex",
                  gap: 24,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                {/* Photo display — big and prominent */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div
                    style={{
                      width: 110,
                      height: 110,
                      overflow: "hidden",
                      background: "#0d0d0d",
                      border: `2px solid ${uploadingPhoto ? "rgba(245,158,11,0.8)" : photoPreview || barber?.photo_url ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.1)"}`,
                      clipPath:
                        "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                      transition: "border-color 0.3s",
                      boxShadow:
                        photoPreview || barber?.photo_url
                          ? "0 0 24px rgba(245,158,11,0.2)"
                          : "none",
                    }}
                  >
                    {uploadingPhoto ? (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            border: "2px solid rgba(245,158,11,0.2)",
                            borderTopColor: "#f59e0b",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                          }}
                        />
                        <p
                          style={{
                            ...mono,
                            fontSize: 8,
                            color: "rgba(245,158,11,0.6)",
                            letterSpacing: "0.3em",
                          }}
                        >
                          SAVING
                        </p>
                      </div>
                    ) : photoPreview || barber?.photo_url ? (
                      <img
                        src={photoPreview || barber.photo_url}
                        alt={barber?.name || "photo"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center top",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                      >
                        <span style={{ fontSize: 32 }}>📷</span>
                        <p
                          style={{
                            ...mono,
                            fontSize: 7,
                            color: "#3f3f46",
                            letterSpacing: "0.2em",
                            textAlign: "center",
                          }}
                        >
                          NO PHOTO
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Live indicator dot when photo exists */}
                  {(photoPreview || barber?.photo_url) && !uploadingPhoto && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 4,
                        right: 4,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "#4ade80",
                        border: "2px solid #000",
                        boxShadow: "0 0 6px rgba(74,222,128,0.8)",
                      }}
                    />
                  )}
                </div>

                {/* Right side — description + BIG upload button */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p
                    style={{
                      ...mono,
                      fontSize: 11,
                      color: "#a1a1aa",
                      lineHeight: 1.7,
                      marginBottom: 16,
                    }}
                  >
                    Clients see this photo when choosing who cuts their hair.
                    Upload a clear face shot — it shows up instantly.
                  </p>

                  {/* THE BUTTON — clicking it opens file picker, auto-saves on select */}
                  <label
                    style={{
                      display: "block",
                      cursor: uploadingPhoto ? "not-allowed" : "pointer",
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      disabled={uploadingPhoto}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          showToast(
                            "Image must be under 5MB — try a smaller photo.",
                            "error",
                          );
                          return;
                        }
                        // Step 1: show preview immediately
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                          const b64 = ev.target.result;
                          setPhotoPreview(b64); // instant preview
                          setUploadingPhoto(true); // show spinner in photo box

                          // Step 2: auto-save to server — no second button needed
                          try {
                            await API.patch("barber/me/update/", {
                              photo: b64,
                            });
                            setBarber((prev) => ({ ...prev, photo_url: b64 }));
                            setPhotoPreview(null); // clear preview — barber.photo_url takes over
                            showToast("✓ Photo live! Clients can now see you.");
                          } catch (err) {
                            setPhotoPreview(null);
                            showToast(
                              err.response?.data?.error ||
                                "Upload failed — try a smaller image.",
                              "error",
                            );
                          } finally {
                            setUploadingPhoto(false);
                            // Reset input so same file can be re-selected
                            e.target.value = "";
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    {/* Visual button */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        padding: "16px 20px",
                        background: uploadingPhoto
                          ? "#0a0a0a"
                          : "rgba(245,158,11,0.1)",
                        border: `2px solid ${uploadingPhoto ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.6)"}`,
                        cursor: uploadingPhoto ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        clipPath:
                          "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                      }}
                      onMouseEnter={(e) => {
                        if (!uploadingPhoto) {
                          e.currentTarget.style.background =
                            "rgba(245,158,11,0.18)";
                          e.currentTarget.style.borderColor = "#f59e0b";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!uploadingPhoto) {
                          e.currentTarget.style.background =
                            "rgba(245,158,11,0.1)";
                          e.currentTarget.style.borderColor =
                            "rgba(245,158,11,0.6)";
                        }
                      }}
                    >
                      <span style={{ fontSize: 20 }}>
                        {uploadingPhoto ? "⏳" : "📸"}
                      </span>
                      <div>
                        <p
                          style={{
                            ...sf,
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: uploadingPhoto ? "#52525b" : "#f59e0b",
                            margin: 0,
                          }}
                        >
                          {uploadingPhoto
                            ? "Uploading..."
                            : "Upload a Photo of Yourself"}
                        </p>
                        <p
                          style={{
                            ...mono,
                            fontSize: 9,
                            color: "#52525b",
                            margin: "3px 0 0",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {uploadingPhoto
                            ? "Saving to your profile..."
                            : "Tap to choose from your camera roll"}
                        </p>
                      </div>
                    </div>
                  </label>

                  {/* Show "change photo" hint if one already exists */}
                  {barber?.photo_url && !uploadingPhoto && (
                    <p
                      style={{
                        ...mono,
                        fontSize: 9,
                        color: "#3f3f46",
                        marginTop: 8,
                      }}
                    >
                      ✓ Photo active · tap above to change it
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 28,
                  background: "#635bff",
                  flexShrink: 0,
                }}
              />
              <div>
                <p
                  style={{
                    ...mono,
                    fontSize: 7,
                    color: "rgba(99,91,255,0.6)",
                    letterSpacing: "0.5em",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  Online Payments
                </p>
                <p
                  style={{
                    ...sf,
                    fontSize: 13,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                  }}
                >
                  Stripe Connect
                </p>
              </div>
            </div>
            <StripeConnectPanel barber={barber} isMobile={isMobile} />

            {/* ── Cash App fallback ── */}
            <div
              style={{
                marginBottom: 28,
                padding: "16px 18px",
                background: "rgba(0,212,95,0.04)",
                border: "1px solid rgba(0,212,95,0.12)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    background: "#00d45f",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      ...sf,
                      fontSize: 12,
                      fontWeight: 900,
                      color: "black",
                    }}
                  >
                    $
                  </span>
                </div>
                <div>
                  <p
                    style={{
                      ...sf,
                      fontSize: 8,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      margin: 0,
                    }}
                  >
                    Cash App Tag (Backup)
                  </p>
                  <p
                    style={{
                      ...mono,
                      fontSize: 10,
                      color: T.muted,
                      marginTop: 2,
                    }}
                  >
                    Used if Stripe isn't connected
                  </p>
                </div>
              </div>
              <CashAppTagField
                barber={barber}
                onUpdate={(tag) =>
                  setBarber((b) => ({ ...b, cashapp_tag: tag }))
                }
              />
            </div>

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
