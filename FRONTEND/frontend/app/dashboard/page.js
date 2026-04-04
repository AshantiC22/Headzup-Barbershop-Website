"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import API from "@/lib/api";
import AuthGuard from "@/lib/AuthGuard";
import useBreakpoint from "@/lib/useBreakpoint";

const sf = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

const STATUS = {
  confirmed: {
    label: "Confirmed",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.08)",
    border: "rgba(74,222,128,0.2)",
  },
  completed: {
    label: "Completed",
    color: "#a1a1aa",
    bg: "rgba(161,161,170,0.06)",
    border: "rgba(161,161,170,0.12)",
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
    border: "rgba(82,82,91,0.12)",
  },
};

function fmtDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

/* ── Reschedule Modal ── */
function RescheduleModal({ appt, onClose, onDone }) {
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const today = new Date().toISOString().split("T")[0];

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

  function to24(t) {
    const [time, mod] = t.split(" ");
    let [h, m] = time.split(":");
    if (h === "12") h = "00";
    if (mod === "PM") h = String(parseInt(h) + 12);
    return `${h.padStart(2, "0")}:${m}:00`;
  }

  const submit = async () => {
    if (!newDate || !newTime) {
      setErr("Please pick a date and time.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await API.post(`appointments/${appt.id}/reschedule/`, {
        new_date: newDate,
        new_time: to24(newTime),
      });
      onDone("Reschedule request sent to your barber!");
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error || "Could not send reschedule request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(4,4,4,0.96)",
        backdropFilter: "blur(16px)",
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
          background: "#0a0a0a",
          border: "1px solid rgba(245,158,11,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
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
                color: "#f59e0b",
                letterSpacing: "0.4em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Request Reschedule
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
              {appt.service_name || "Appointment"}
            </p>
            <p
              style={{ ...mono, fontSize: 10, color: "#52525b", marginTop: 2 }}
            >
              {fmtDate(appt.date)}
              {appt.time ? ` · ${fmtTime(appt.time)}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#52525b",
              cursor: "pointer",
              fontSize: 14,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#f87171";
              e.currentTarget.style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.color = "#52525b";
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {err && (
            <p
              style={{
                ...mono,
                fontSize: 11,
                color: "#f87171",
                marginBottom: 14,
              }}
            >
              ⚠ {err}
            </p>
          )}

          {/* Info note */}
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.2)",
              marginBottom: 20,
            }}
          >
            <p
              style={{
                ...mono,
                fontSize: 10,
                color: "#f59e0b",
                lineHeight: 1.6,
              }}
            >
              Your request will be sent to your barber for approval. You'll get
              an email when they respond.
            </p>
          </div>

          {/* Date */}
          <label
            style={{
              ...sf,
              fontSize: 6,
              letterSpacing: "0.4em",
              color: "#52525b",
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
              background: "#040404",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "12px 14px",
              color: "white",
              fontSize: 14,
              ...mono,
              outline: "none",
              marginBottom: 16,
              colorScheme: "dark",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
            onBlur={(e) =>
              (e.target.style.borderColor = "rgba(255,255,255,0.1)")
            }
          />

          {/* Time slots */}
          <label
            style={{
              ...sf,
              fontSize: 6,
              letterSpacing: "0.4em",
              color: "#52525b",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 8,
            }}
          >
            Preferred Time
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 5,
              marginBottom: 20,
            }}
          >
            {SLOTS.map((s) => (
              <button
                key={s}
                onClick={() => setNewTime(s)}
                style={{
                  padding: "8px 4px",
                  ...sf,
                  fontSize: 5,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  border: `1px solid ${newTime === s ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                  background:
                    newTime === s ? "rgba(245,158,11,0.1)" : "transparent",
                  color: newTime === s ? "#f59e0b" : "#52525b",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button
            onClick={submit}
            disabled={busy || !newDate || !newTime}
            style={{
              width: "100%",
              padding: "15px",
              ...sf,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              background: busy || !newDate || !newTime ? "#111" : "#f59e0b",
              color: busy || !newDate || !newTime ? "#52525b" : "black",
              border: "none",
              cursor: busy || !newDate || !newTime ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            {busy ? (
              <>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid #3f3f46",
                    borderTopColor: "#71717a",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                Sending...
              </>
            ) : (
              "Send Reschedule Request →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main dashboard ── */
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMobile } = useBreakpoint();

  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [toast, setToast] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [reschedAppt, setReschedAppt] = useState(null);
  const [time, setTime] = useState("");
  const [strikeInfo, setStrikeInfo] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Live clock
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Params
  useEffect(() => {
    if (searchParams.get("booked") === "true") {
      showToast("🎉 Booking confirmed! See you soon.");
      window.history.replaceState({}, "", "/dashboard");
    }
    if (searchParams.get("canceled") === "true") {
      showToast("Payment cancelled.", "error");
      window.history.replaceState({}, "", "/dashboard");
    }
    if (searchParams.get("reschedule") === "accepted") {
      showToast("✓ Reschedule accepted! Your appointment is updated.");
      window.history.replaceState({}, "", "/dashboard");
    }
    if (searchParams.get("reschedule") === "rejected") {
      showToast("Reschedule request declined. Original time stands.", "error");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

  // Load
  useEffect(() => {
    const load = async () => {
      try {
        const [d, a, s] = await Promise.all([
          API.get("dashboard/"),
          API.get("appointments/"),
          API.get("client/strike-status/").catch(() => ({ data: null })),
        ]);
        setUser(d.data);
        const appts = Array.isArray(a.data) ? a.data : a.data.results || [];
        setAppointments(
          appts.sort((x, y) => new Date(y.date) - new Date(x.date)),
        );
        if (s.data) setStrikeInfo(s.data);
      } catch {
        showToast("Could not load data.", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    router.push("/login");
  };

  const handleCancel = async (appt) => {
    // Check if within 2 hours — warn the client
    const apptDT = new Date(`${appt.date}T${appt.time}`);
    const now2 = new Date();
    const diffHrs = (apptDT - now2) / (1000 * 60 * 60);
    const isLate = diffHrs >= 0 && diffHrs < 2;

    const msg = isLate
      ? `⚠ You are cancelling within 2 hours of your appointment. This will result in a STRIKE on your account and your deposit fee will increase by $1.50 on your next booking.

Your deposit is non-refundable.

Cancel anyway?`
      : `Cancel ${appt.service_name || "appointment"} on ${fmtDate(appt.date)}? Your deposit is non-refundable.`;

    if (!confirm(msg)) return;
    setCancelling(appt.id);
    try {
      await API.patch(`appointments/${appt.id}/`, { status: "cancelled" });
      if (isLate) {
        // Backend issues strike automatically via the late_cancel endpoint
        try {
          await API.post(`barber/appointments/${appt.id}/strike/`, {
            reason: "late_cancel",
          });
        } catch {}
      }
      setAppointments((p) =>
        p.map((a) => (a.id === appt.id ? { ...a, status: "cancelled" } : a)),
      );
      if (isLate) {
        showToast(
          "Appointment cancelled. A strike has been added to your account.",
          "error",
        );
        // Refresh strike info
        API.get("client/strike-status/")
          .then((r) => setStrikeInfo(r.data))
          .catch(() => {});
      } else {
        showToast("Appointment cancelled.");
      }
    } catch {
      showToast("Could not cancel.", "error");
    } finally {
      setCancelling(null);
    }
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcoming = appointments.filter(
    (a) => new Date(a.date + "T00:00:00") >= now && a.status !== "cancelled",
  );
  const past = appointments.filter(
    (a) => new Date(a.date + "T00:00:00") < now || a.status === "cancelled",
  );
  const shown = activeTab === "upcoming" ? upcoming : past;
  const nextAppt = upcoming[0] || null;
  const completed = appointments.filter((a) => a.status === "completed").length;

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
          background: #040404;
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
            transform: translateY(20px);
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
        @keyframes glow {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
          }
        }
        .dc {
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .dc:nth-child(1) {
          animation-delay: 0.05s;
        }
        .dc:nth-child(2) {
          animation-delay: 0.1s;
        }
        .dc:nth-child(3) {
          animation-delay: 0.15s;
        }
        .dc:nth-child(4) {
          animation-delay: 0.2s;
        }
        .dc:nth-child(5) {
          animation-delay: 0.25s;
        }
        .dc:nth-child(6) {
          animation-delay: 0.3s;
        }
        .appt-row {
          transition:
            border-color 0.2s,
            background 0.2s;
        }
        .appt-row:hover {
          border-color: rgba(245, 158, 11, 0.3) !important;
          background: rgba(245, 158, 11, 0.03) !important;
        }
      `}</style>

      {/* Backgrounds */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "-10%",
          right: "-5%",
          width: 600,
          height: 600,
          background:
            "radial-gradient(circle,rgba(245,158,11,0.055) 0%,transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "10%",
          left: "-8%",
          width: 400,
          height: 400,
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
              "linear-gradient(to right,transparent,rgba(245,158,11,0.2),transparent)",
            animation: "scandown 10s linear infinite",
          }}
        />
      </div>

      {/* Reschedule modal */}
      {reschedAppt && (
        <RescheduleModal
          appt={reschedAppt}
          onClose={() => setReschedAppt(null)}
          onDone={(msg) => {
            showToast(msg);
            setReschedAppt(null);
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: isMobile ? 20 : 32,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            padding: "12px 20px",
            background:
              toast.type === "success"
                ? "rgba(74,222,128,0.1)"
                : "rgba(248,113,113,0.1)",
            border: `1px solid ${toast.type === "success" ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
            backdropFilter: "blur(20px)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            animation: "toastIn 0.3s ease",
            whiteSpace: "nowrap",
            zIndex: 8888,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: toast.type === "success" ? "#4ade80" : "#f87171",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              ...sf,
              fontSize: 7,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: toast.type === "success" ? "#4ade80" : "#f87171",
            }}
          >
            {toast.msg}
          </span>
        </div>
      )}

      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          minHeight: "100dvh",
        }}
      >
        {/* NAV */}
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "rgba(4,4,4,0.95)",
            backdropFilter: "blur(24px)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: isMobile ? "0 16px" : "0 40px",
              height: 60,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
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
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </a>
            {!isMobile && (
              <span
                style={{
                  ...mono,
                  fontSize: 11,
                  color: "#27272a",
                  letterSpacing: "0.3em",
                }}
              >
                {time}
              </span>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 8 : 12,
              }}
            >
              {user && !isMobile && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      background: "#f59e0b",
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
                        color: "black",
                      }}
                    >
                      {(user.user || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span style={{ ...mono, fontSize: 11, color: "#52525b" }}>
                    {user.user}
                  </span>
                </div>
              )}
              <button
                onClick={() => router.push("/book")}
                style={{
                  padding: isMobile ? "8px 14px" : "10px 20px",
                  background: "#f59e0b",
                  color: "black",
                  ...sf,
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "white")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#f59e0b")
                }
              >
                + Book
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: isMobile ? "8px 10px" : "10px 16px",
                  background: "transparent",
                  color: "#52525b",
                  ...sf,
                  fontSize: 7,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#52525b";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                {isMobile ? "Out" : "Sign Out"}
              </button>
            </div>
          </div>
        </nav>

        {/* CONTENT */}
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: isMobile
              ? "28px 16px max(48px,env(safe-area-inset-bottom))"
              : "52px 40px 80px",
          }}
        >
          {/* ── STRIKE BANNER ── */}
          {strikeInfo && strikeInfo.strike_count > 0 && (
            <div
              className="dc"
              style={{
                marginBottom: isMobile ? 20 : 28,
                padding: "14px 18px",
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
                display: "flex",
                alignItems: isMobile ? "flex-start" : "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                clipPath:
                  "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>⚡</span>
                <div>
                  <p
                    style={{
                      ...sf,
                      fontSize: 8,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "#f87171",
                      marginBottom: 4,
                    }}
                  >
                    {strikeInfo.strike_count} Strike
                    {strikeInfo.strike_count > 1 ? "s" : ""} on Your Account
                  </p>
                  <p
                    style={{
                      ...mono,
                      fontSize: 11,
                      color: "#a1a1aa",
                      lineHeight: 1.7,
                    }}
                  >
                    Your next booking deposit is{" "}
                    <strong style={{ color: "#f59e0b" }}>
                      ${strikeInfo.deposit_fee}
                    </strong>{" "}
                    due to previous no-shows or late cancellations.
                    {strikeInfo.strike_count === 1 &&
                      " Each additional strike adds $1.50 to your deposit."}
                  </p>
                </div>
              </div>
              <div
                style={{
                  padding: "6px 14px",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  flexShrink: 0,
                }}
              >
                <span style={{ ...mono, fontSize: 10, color: "#f87171" }}>
                  {strikeInfo.strike_count} / ∞ strikes
                </span>
              </div>
            </div>
          )}

          {/* ── DEPOSIT INFO banner (if no strikes, show standard) ── */}
          {strikeInfo && strikeInfo.strike_count === 0 && (
            <div
              className="dc"
              style={{
                marginBottom: isMobile ? 20 : 28,
                padding: "12px 16px",
                background: "rgba(245,158,11,0.04)",
                border: "1px solid rgba(245,158,11,0.12)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                clipPath:
                  "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
              }}
            >
              <span style={{ fontSize: 14 }}>💰</span>
              <p
                style={{
                  ...mono,
                  fontSize: 11,
                  color: "#71717a",
                  lineHeight: 1.6,
                }}
              >
                Your current booking deposit is{" "}
                <strong style={{ color: "#f59e0b" }}>
                  ${strikeInfo.deposit_fee}
                </strong>
                . No-shows and late cancellations increase your deposit by $1.50
                per strike.
              </p>
            </div>
          )}

          {loading ? (
            <div
              style={{
                paddingTop: 100,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 20,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "-0.06em",
                }}
              >
                HEADZ
                <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                  UP
                </span>
              </p>
              <div
                style={{
                  width: 1,
                  height: 32,
                  background: "linear-gradient(to bottom,#f59e0b,transparent)",
                }}
              />
              <div
                style={{
                  width: 18,
                  height: 18,
                  border: "1.5px solid rgba(245,158,11,0.2)",
                  borderTopColor: "#f59e0b",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            </div>
          ) : (
            <>
              {/* GREETING */}
              <div
                className="dc"
                style={{
                  marginBottom: isMobile ? 32 : 48,
                  paddingBottom: isMobile ? 32 : 48,
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p
                  style={{
                    ...mono,
                    fontSize: 9,
                    color: "#f59e0b",
                    letterSpacing: "0.5em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Client Dashboard
                </p>
                <h1
                  style={{
                    ...sf,
                    fontSize: "clamp(1.8rem,6vw,4rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    lineHeight: isMobile ? 1.1 : 0.88,
                    letterSpacing: "-0.03em",
                    marginBottom: 16,
                  }}
                >
                  Hey,
                  <br />
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    {user?.user || "Client"}_
                  </span>
                </h1>
                <p
                  style={{
                    ...mono,
                    fontSize: 13,
                    color: "#52525b",
                    maxWidth: 400,
                    lineHeight: 1.7,
                  }}
                >
                  {upcoming.length > 0
                    ? `You have ${upcoming.length} upcoming appointment${upcoming.length !== 1 ? "s" : ""}. We'll see you soon.`
                    : "No upcoming appointments. Ready to book your next cut?"}
                </p>
              </div>

              {/* STATS */}
              <div
                className="dc"
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "repeat(2,1fr)"
                    : "repeat(4,1fr)",
                  gap: 8,
                  marginBottom: isMobile ? 32 : 48,
                }}
              >
                {[
                  {
                    label: "Total Visits",
                    value: appointments.filter((a) => a.status !== "cancelled")
                      .length,
                    accent: false,
                  },
                  { label: "Upcoming", value: upcoming.length, accent: true },
                  { label: "Completed", value: completed, accent: false },
                  {
                    label: "Member Since",
                    value:
                      appointments.length > 0
                        ? new Date(
                            appointments[appointments.length - 1].date +
                              "T00:00:00",
                          ).getFullYear()
                        : new Date().getFullYear(),
                    accent: false,
                  },
                ].map(({ label, value, accent }) => (
                  <div
                    key={label}
                    style={{
                      padding: isMobile ? "16px 14px" : "22px 18px",
                      background: accent
                        ? "rgba(245,158,11,0.07)"
                        : "rgba(255,255,255,0.02)",
                      border: `1px solid ${accent ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"}`,
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
                        background: accent
                          ? "linear-gradient(225deg,rgba(245,158,11,0.2),transparent)"
                          : "linear-gradient(225deg,rgba(255,255,255,0.03),transparent)",
                      }}
                    />
                    <p
                      style={{
                        ...sf,
                        fontSize: 5,
                        letterSpacing: "0.3em",
                        color: accent ? "#f59e0b" : "#52525b",
                        textTransform: "uppercase",
                        marginBottom: 10,
                      }}
                    >
                      {label}
                    </p>
                    <p
                      style={{
                        ...sf,
                        fontSize: isMobile ? 22 : 30,
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

              {/* NEXT APPOINTMENT */}
              {nextAppt && (
                <div
                  className="dc"
                  style={{
                    marginBottom: isMobile ? 32 : 48,
                    padding: isMobile ? "18px 16px" : "24px 28px",
                    background:
                      "linear-gradient(135deg,rgba(245,158,11,0.07),rgba(245,158,11,0.02))",
                    border: "1px solid rgba(245,158,11,0.25)",
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div>
                    <p
                      style={{
                        ...mono,
                        fontSize: 8,
                        color: "#f59e0b",
                        letterSpacing: "0.5em",
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      Next Appointment
                    </p>
                    <h2
                      style={{
                        ...sf,
                        fontSize: "clamp(1rem,2.5vw,1.5rem)",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        marginBottom: 8,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {nextAppt.service_name || "Appointment"}
                    </h2>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ ...mono, fontSize: 12, color: "#a1a1aa" }}>
                        {fmtDate(nextAppt.date)}
                      </span>
                      {nextAppt.time && (
                        <span
                          style={{ ...mono, fontSize: 12, color: "#f59e0b" }}
                        >
                          {fmtTime(nextAppt.time)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          background: "#22c55e",
                          borderRadius: "50%",
                          animation: "glow 2s infinite",
                        }}
                      />
                      <span
                        style={{
                          ...sf,
                          fontSize: 7,
                          color: "#4ade80",
                          textTransform: "uppercase",
                          letterSpacing: "0.2em",
                        }}
                      >
                        Confirmed
                      </span>
                    </div>
                    <button
                      onClick={() => setReschedAppt(nextAppt)}
                      style={{
                        padding: "8px 16px",
                        ...sf,
                        fontSize: 7,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        background: "transparent",
                        border: "1px solid rgba(245,158,11,0.3)",
                        color: "#f59e0b",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(245,158,11,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      ↻ Reschedule
                    </button>
                  </div>
                </div>
              )}

              {/* APPOINTMENTS LIST */}
              <div className="dc">
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
                    style={{ display: "flex", alignItems: "center", gap: 14 }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 1,
                        background: "rgba(245,158,11,0.5)",
                      }}
                    />
                    <h2
                      style={{
                        ...sf,
                        fontSize: "clamp(0.8rem,2vw,1rem)",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      Your_
                      <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                        Appointments
                      </span>
                    </h2>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {["upcoming", "past"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                          padding: isMobile ? "8px 12px" : "9px 16px",
                          ...sf,
                          fontSize: 6,
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                          background:
                            activeTab === tab ? "#f59e0b" : "transparent",
                          color: activeTab === tab ? "black" : "#52525b",
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {tab} (
                        {tab === "upcoming" ? upcoming.length : past.length})
                      </button>
                    ))}
                  </div>
                </div>

                {shown.length === 0 ? (
                  <div
                    style={{
                      padding: isMobile ? "48px 16px" : "64px 24px",
                      textAlign: "center",
                      border: "1px solid rgba(255,255,255,0.06)",
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
                        fontSize: "clamp(4rem,12vw,8rem)",
                        fontWeight: 900,
                        color: "rgba(255,255,255,0.025)",
                        textTransform: "uppercase",
                        letterSpacing: "-0.06em",
                        userSelect: "none",
                      }}
                    >
                      {activeTab === "upcoming" ? "FRESH" : "DONE"}
                    </p>
                    <div style={{ position: "relative", zIndex: 1 }}>
                      <p
                        style={{
                          ...sf,
                          fontSize: 9,
                          color: "rgba(255,255,255,0.08)",
                          textTransform: "uppercase",
                          marginBottom: 12,
                        }}
                      >
                        {activeTab === "upcoming"
                          ? "No upcoming cuts"
                          : "No past appointments"}
                      </p>
                      {activeTab === "upcoming" && (
                        <button
                          onClick={() => router.push("/book")}
                          style={{
                            padding: "14px 28px",
                            background: "#f59e0b",
                            color: "black",
                            ...sf,
                            fontSize: 8,
                            fontWeight: 700,
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            border: "none",
                            cursor: "pointer",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "white")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "#f59e0b")
                          }
                        >
                          Book Now →
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {shown.map((appt) => {
                      const s = STATUS[appt.status] || STATUS.confirmed;
                      const canReschedule =
                        appt.status === "confirmed" && activeTab === "upcoming";
                      const canCancel =
                        appt.status === "confirmed" && activeTab === "upcoming";
                      return (
                        <div
                          key={appt.id}
                          className="appt-row"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: isMobile ? 10 : 16,
                            padding: isMobile ? "16px 12px" : "18px 20px",
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          {/* Left accent strip */}
                          <div
                            style={{
                              width: 2,
                              alignSelf: "stretch",
                              background: s.color,
                              flexShrink: 0,
                              opacity: 0.8,
                              minHeight: 40,
                            }}
                          />

                          {/* Date block */}
                          <div
                            style={{
                              width: isMobile ? 44 : 52,
                              flexShrink: 0,
                              textAlign: "center",
                            }}
                          >
                            <p
                              style={{
                                ...sf,
                                fontSize: isMobile ? 16 : 22,
                                fontWeight: 900,
                                color:
                                  appt.status === "confirmed"
                                    ? "#f59e0b"
                                    : "#52525b",
                                lineHeight: 1,
                              }}
                            >
                              {new Date(appt.date + "T00:00:00").getDate()}
                            </p>
                            <p
                              style={{
                                ...sf,
                                fontSize: 6,
                                color: "#3f3f46",
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                              }}
                            >
                              {new Date(
                                appt.date + "T00:00:00",
                              ).toLocaleDateString("en-US", { month: "short" })}
                            </p>
                          </div>

                          <div
                            style={{
                              width: 1,
                              height: 32,
                              background: "rgba(255,255,255,0.07)",
                              flexShrink: 0,
                            }}
                          />

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                ...sf,
                                fontSize: isMobile ? 11 : 12,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                marginBottom: 4,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {appt.service_name || "Appointment"}
                            </p>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  ...mono,
                                  fontSize: 10,
                                  color: "#52525b",
                                }}
                              >
                                {fmtDate(appt.date)}
                              </span>
                              {appt.time && (
                                <span
                                  style={{
                                    ...mono,
                                    fontSize: 10,
                                    color: "#f59e0b",
                                  }}
                                >
                                  {fmtTime(appt.time)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status badge */}
                          <span
                            style={{
                              ...sf,
                              fontSize: 5,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              padding: "4px 10px",
                              background: s.bg,
                              color: s.color,
                              border: `1px solid ${s.border}`,
                              flexShrink: 0,
                            }}
                          >
                            {s.label}
                          </span>

                          {/* Actions */}
                          {canReschedule && (
                            <button
                              onClick={() => setReschedAppt(appt)}
                              style={{
                                width: isMobile ? 34 : 28,
                                height: isMobile ? 34 : 28,
                                background: "transparent",
                                border: "1px solid rgba(245,158,11,0.25)",
                                color: "#52525b",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                transition: "all 0.2s",
                                flexShrink: 0,
                              }}
                              title="Request reschedule"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "#f59e0b";
                                e.currentTarget.style.color = "#f59e0b";
                                e.currentTarget.style.background =
                                  "rgba(245,158,11,0.08)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor =
                                  "rgba(245,158,11,0.25)";
                                e.currentTarget.style.color = "#52525b";
                                e.currentTarget.style.background =
                                  "transparent";
                              }}
                            >
                              ↻
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => handleCancel(appt)}
                              disabled={cancelling === appt.id}
                              style={{
                                width: isMobile ? 34 : 28,
                                height: isMobile ? 34 : 28,
                                background: "transparent",
                                border: "1px solid rgba(248,113,113,0.2)",
                                color: "#52525b",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                transition: "all 0.2s",
                                flexShrink: 0,
                              }}
                              title="Cancel appointment"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "#f87171";
                                e.currentTarget.style.color = "#f87171";
                                e.currentTarget.style.background =
                                  "rgba(248,113,113,0.08)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor =
                                  "rgba(248,113,113,0.2)";
                                e.currentTarget.style.color = "#52525b";
                                e.currentTarget.style.background =
                                  "transparent";
                              }}
                            >
                              {cancelling === appt.id ? "·" : "✕"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* QUICK ACTIONS */}
              <div
                className="dc"
                style={{
                  marginTop: isMobile ? 32 : 48,
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 10,
                }}
              >
                <button
                  onClick={() => router.push("/book")}
                  style={{
                    padding: "18px 24px",
                    background: "#f59e0b",
                    color: "black",
                    ...sf,
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "white")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#f59e0b")
                  }
                >
                  Book New Appointment →
                </button>
                <button
                  onClick={() => router.push("/")}
                  style={{
                    padding: "18px 24px",
                    background: "transparent",
                    color: "#52525b",
                    ...sf,
                    fontSize: 8,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    border: "1px solid rgba(255,255,255,0.08)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "white";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#52525b";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.08)";
                  }}
                >
                  Return to Home
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div
            style={{
              minHeight: "100vh",
              background: "#040404",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <p
              style={{
                fontFamily: "'Syncopate',sans-serif",
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: "-0.06em",
              }}
            >
              HEADZ
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </p>
            <div
              style={{
                width: 18,
                height: 18,
                border: "1.5px solid rgba(245,158,11,0.2)",
                borderTopColor: "#f59e0b",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}} body{background:#040404;margin:0}`}</style>
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </AuthGuard>
  );
}
