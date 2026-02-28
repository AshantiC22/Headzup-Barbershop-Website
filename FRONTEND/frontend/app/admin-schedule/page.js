"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import API from "@/lib/api";
import useBreakpoint from "@/lib/useBreakpoint";

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(t) {
  if (!t) return "—";
  try {
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
  } catch {
    return t;
  }
}

function fmtDateShort(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtDateFull(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

const STATUS_CONFIG = {
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

const PAYMENT_CONFIG = {
  online: {
    label: "Paid Online",
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

// ── Small badge component ─────────────────────────────────────────────────────
function Badge({ cfg }) {
  return (
    <span
      style={{
        fontFamily: "'Syncopate',sans-serif",
        fontSize: 7,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding: "4px 10px",
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, sub }) {
  const sf = { fontFamily: "'Syncopate',sans-serif" };
  return (
    <div
      style={{
        padding: "22px 20px",
        background: accent ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${accent ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"}`,
        transition: "all 0.25s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#f59e0b";
        e.currentTarget.style.background = "rgba(245,158,11,0.07)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = accent
          ? "rgba(245,158,11,0.3)"
          : "rgba(255,255,255,0.07)";
        e.currentTarget.style.background = accent
          ? "rgba(245,158,11,0.08)"
          : "rgba(255,255,255,0.03)";
      }}
    >
      <p
        style={{
          ...sf,
          fontSize: 7,
          letterSpacing: "0.3em",
          color: "#71717a",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {label}
      </p>
      <p
        style={{
          ...sf,
          fontSize: 30,
          fontWeight: 900,
          color: accent ? "#f59e0b" : "white",
          lineHeight: 1,
          marginBottom: sub ? 4 : 0,
        }}
      >
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: "#52525b" }}>{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminSchedulePage() {
  const router = useRouter();
  const sf = { fontFamily: "'Syncopate',sans-serif" };

  const { isMobile, isTablet } = useBreakpoint();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedBarber, setSelectedBarber] = useState("all");
  const [barbers, setBarbers] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    paid_online: 0,
    pay_in_shop: 0,
    online_revenue: "0.00",
  });
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [statusMenuId, setStatusMenuId] = useState(null); // which appt has status dropdown open
  // Local status overrides (so UI updates instantly)
  const [statusOverrides, setStatusOverrides] = useState({});

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Auth guard — must be staff ──────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res = await API.get("dashboard/");
        // Check if user is staff by trying the schedule endpoint
        const test = await API.get(`admin/schedule/?date=${todayISO()}`);
        setIsAdmin(true);
      } catch (e) {
        if (e.response?.status === 403 || e.response?.status === 401) {
          router.push("/login");
        }
        setIsAdmin(false);
      } finally {
        setAuthChecked(true);
      }
    };
    check();
  }, []);

  // ── Load barbers once ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    API.get("barbers/")
      .then((res) => setBarbers(res.data))
      .catch(() => {});
  }, [isAdmin]);

  // ── Load schedule when date or barber filter changes ───────────────────────
  const loadSchedule = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      let url = `admin/schedule/?date=${selectedDate}`;
      if (selectedBarber !== "all") url += `&barber=${selectedBarber}`;
      const res = await API.get(url);
      setSchedule(res.data.appointments);
      setSummary(res.data.summary);
      setStatusOverrides({});
    } catch {
      showToast("Could not load schedule.", "error");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedDate, selectedBarber]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // ── Entrance animation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && authChecked && isAdmin) {
      gsap.from(".admin-enter", {
        y: 30,
        opacity: 0,
        duration: 1,
        stagger: 0.08,
        ease: "expo.out",
      });
    }
  }, [loading]);

  // ── Update appointment status ───────────────────────────────────────────────
  const handleStatusChange = async (apptId, newStatus) => {
    setStatusMenuId(null);
    setStatusOverrides((prev) => ({ ...prev, [apptId]: newStatus }));
    try {
      await API.patch(`admin/appointments/${apptId}/`, { status: newStatus });
      showToast(`Marked as ${STATUS_CONFIG[newStatus].label}`);
    } catch {
      // Revert
      setStatusOverrides((prev) => {
        const n = { ...prev };
        delete n[apptId];
        return n;
      });
      showToast("Could not update status.", "error");
    }
  };

  // ── Delete appointment ──────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await API.delete(`admin/appointments/${deleteTarget.id}/`);
      setSchedule((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setSummary((prev) => ({ ...prev, total: prev.total - 1 }));
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

  // ── Week strip — 7 days centered on today ──────────────────────────────────
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(todayISO(), i - 1),
  );

  if (!authChecked) return null;

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@400;500&family=Inter:wght@300;400;700;900&display=swap");
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
          font-family: "Inter", sans-serif;
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .appt-card {
          transition:
            border-color 0.2s,
            background 0.2s;
        }
        .appt-card:hover {
          border-color: rgba(245, 158, 11, 0.2) !important;
          background: rgba(245, 158, 11, 0.025) !important;
        }
        .day-btn {
          transition: all 0.2s;
        }
        .day-btn:hover {
          border-color: rgba(245, 158, 11, 0.5) !important;
          background: rgba(245, 158, 11, 0.06) !important;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1) opacity(0.5);
          cursor: pointer;
        }
      `}</style>

      {/* Noise overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.03,
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.svg')",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "30%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 800,
          height: 800,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 65%)",
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            padding: "13px 24px",
            background:
              toast.type === "success"
                ? "rgba(34,197,94,0.1)"
                : "rgba(248,113,113,0.1)",
            border: `1px solid ${toast.type === "success" ? "rgba(34,197,94,0.35)" : "rgba(248,113,113,0.35)"}`,
            backdropFilter: "blur(10px)",
            animation: "fadeUp 0.3s ease",
            whiteSpace: "nowrap",
          }}
        >
          <p
            style={{
              ...sf,
              fontSize: 8,
              color: toast.type === "success" ? "#4ade80" : "#f87171",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {toast.msg}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: isMobile ? "14px 16px" : "18px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(5,5,5,0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
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
          <div
            style={{
              width: 1,
              height: 18,
              background: "rgba(255,255,255,0.1)",
            }}
          />
          <span
            style={{
              ...sf,
              fontSize: 7,
              letterSpacing: "0.3em",
              color: "#52525b",
              textTransform: "uppercase",
            }}
          >
            Admin Schedule
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              ...sf,
              fontSize: 8,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#71717a",
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#71717a")}
          >
            Dashboard
          </button>
          <button
            onClick={handleLogout}
            style={{
              ...sf,
              fontSize: 8,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#52525b",
              background: "none",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "7px 14px",
              cursor: "pointer",
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
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          padding: isMobile ? "72px 14px 48px" : "88px 28px 60px",
          maxWidth: 1100,
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
              Staff account required to view this page.
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
            {/* Header */}
            <div className="admin-enter" style={{ marginBottom: 36 }}>
              <p
                style={{
                  ...sf,
                  fontSize: 8,
                  letterSpacing: "0.5em",
                  color: "#71717a",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Barber Admin
              </p>
              <h1
                style={{
                  ...sf,
                  fontSize: "clamp(1.8rem,4vw,2.8rem)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                Today&apos;s
                <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                  _Schedule
                </span>
              </h1>
            </div>

            {/* ── Week navigator ── */}
            <div className="admin-enter" style={{ marginBottom: 28 }}>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {/* Prev arrow */}
                <button
                  onClick={() => setSelectedDate((d) => addDays(d, -7))}
                  style={{
                    width: 36,
                    height: 36,
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#71717a",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                    flexShrink: 0,
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
                  ←
                </button>

                {(isMobile ? weekDays.slice(0, 5) : weekDays).map((day) => {
                  const isToday = day === todayISO();
                  const isSelected = day === selectedDate;
                  const d = new Date(day + "T00:00:00");
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(day)}
                      className="day-btn"
                      style={{
                        flex: 1,
                        minWidth: 56,
                        padding: "10px 6px",
                        background: isSelected
                          ? "#f59e0b"
                          : isToday
                            ? "rgba(245,158,11,0.08)"
                            : "transparent",
                        border: `1px solid ${isSelected ? "#f59e0b" : isToday ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)"}`,
                        color: isSelected
                          ? "black"
                          : isToday
                            ? "#f59e0b"
                            : "#71717a",
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          ...sf,
                          fontSize: 7,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          marginBottom: 4,
                        }}
                      >
                        {d.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                      <div style={{ ...sf, fontSize: 16, fontWeight: 900 }}>
                        {d.getDate()}
                      </div>
                    </button>
                  );
                })}

                {/* Next arrow */}
                <button
                  onClick={() => setSelectedDate((d) => addDays(d, 7))}
                  style={{
                    width: 36,
                    height: 36,
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#71717a",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                    flexShrink: 0,
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
                  →
                </button>

                {/* Jump to date */}
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    marginLeft: 8,
                    background: "#0a0a0a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    padding: "9px 12px",
                    color: "white",
                    fontSize: 12,
                    outline: "none",
                    cursor: "pointer",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                  }
                />

                {/* Today button */}
                {selectedDate !== todayISO() && (
                  <button
                    onClick={() => setSelectedDate(todayISO())}
                    style={{
                      padding: "9px 16px",
                      ...sf,
                      fontSize: 8,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      background: "transparent",
                      border: "1px solid rgba(245,158,11,0.3)",
                      color: "#f59e0b",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(245,158,11,0.1)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    Today
                  </button>
                )}
              </div>
            </div>

            {/* ── Barber filter ── */}
            <div
              className="admin-enter"
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 32,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  ...sf,
                  fontSize: 7,
                  color: "#52525b",
                  textTransform: "uppercase",
                  letterSpacing: "0.3em",
                  marginRight: 4,
                }}
              >
                Barber:
              </span>
              {[{ id: "all", name: "All Barbers" }, ...barbers].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBarber(String(b.id))}
                  style={{
                    padding: "8px 16px",
                    ...sf,
                    fontSize: 8,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    background:
                      selectedBarber === String(b.id)
                        ? "#f59e0b"
                        : "transparent",
                    color:
                      selectedBarber === String(b.id) ? "black" : "#71717a",
                    border: `1px solid ${selectedBarber === String(b.id) ? "#f59e0b" : "rgba(255,255,255,0.1)"}`,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedBarber !== String(b.id)) {
                      e.currentTarget.style.borderColor =
                        "rgba(245,158,11,0.5)";
                      e.currentTarget.style.color = "#f59e0b";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedBarber !== String(b.id)) {
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.1)";
                      e.currentTarget.style.color = "#71717a";
                    }
                  }}
                >
                  {b.name}
                </button>
              ))}
            </div>

            {/* ── Stats ── */}
            <div
              className="admin-enter"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))",
                gap: 12,
                marginBottom: 36,
              }}
            >
              <StatCard label="Total Bookings" value={summary.total} accent />
              <StatCard label="Paid Online" value={summary.paid_online} />
              <StatCard label="Pay In Shop" value={summary.pay_in_shop} />
              <StatCard
                label="Online Revenue"
                value={`$${summary.online_revenue}`}
                sub="Stripe payments"
              />
            </div>

            {/* ── Date heading ── */}
            <div
              className="admin-enter"
              style={{
                marginBottom: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <h2
                style={{
                  ...sf,
                  fontSize: "clamp(0.9rem,2vw,1.2rem)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                {fmtDateFull(selectedDate)}
                <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                  {" "}
                  — {summary.total}{" "}
                  {summary.total === 1 ? "booking" : "bookings"}
                </span>
              </h2>
              <button
                onClick={loadSchedule}
                style={{
                  ...sf,
                  fontSize: 7,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#52525b",
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.07)",
                  padding: "8px 14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#f59e0b";
                  e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#52525b";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                }}
              >
                ↻ Refresh
              </button>
            </div>

            {/* ── Schedule list ── */}
            {loading ? (
              <div
                style={{
                  padding: "60px 0",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    border: "2px solid rgba(245,158,11,0.3)",
                    borderTopColor: "#f59e0b",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <p
                  style={{
                    ...sf,
                    fontSize: 8,
                    color: "#52525b",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                  }}
                >
                  Loading schedule...
                </p>
              </div>
            ) : schedule.length === 0 ? (
              <div
                style={{
                  padding: "72px 0",
                  textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <p
                  style={{
                    ...sf,
                    fontSize: 28,
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.04)",
                    textTransform: "uppercase",
                    marginBottom: 16,
                  }}
                >
                  No Bookings
                </p>
                <p style={{ color: "#3f3f46", fontSize: 13 }}>
                  No appointments scheduled for this day.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {schedule.map((appt, i) => {
                  const currentStatus =
                    statusOverrides[appt.id] || appt.status || "confirmed";
                  const sCfg =
                    STATUS_CONFIG[currentStatus] || STATUS_CONFIG.confirmed;
                  const pCfg =
                    PAYMENT_CONFIG[appt.payment_method] || PAYMENT_CONFIG.shop;

                  return (
                    <div
                      key={appt.id}
                      className="appt-card"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: isMobile ? 10 : 16,
                        padding: isMobile ? "13px 14px" : "18px 22px",
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        animation: "fadeUp 0.35s ease forwards",
                        animationDelay: `${i * 0.05}s`,
                        opacity: 0,
                        flexWrap: "wrap",
                        position: "relative",
                      }}
                    >
                      {/* Time */}
                      <div
                        style={{
                          width: 60,
                          flexShrink: 0,
                          textAlign: "center",
                        }}
                      >
                        <p
                          style={{
                            fontFamily: "'DM Mono',monospace",
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#f59e0b",
                            letterSpacing: "0.03em",
                          }}
                        >
                          {fmtTime(appt.time)}
                        </p>
                      </div>

                      <div
                        style={{
                          width: 1,
                          height: 40,
                          background: "rgba(255,255,255,0.07)",
                          flexShrink: 0,
                        }}
                      />

                      {/* Client info */}
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <p
                          style={{
                            ...sf,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            marginBottom: 4,
                            color: "white",
                          }}
                        >
                          {appt.client}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "2px 12px",
                          }}
                        >
                          <span style={{ fontSize: 11, color: "#a1a1aa" }}>
                            {appt.service}
                          </span>
                          {appt.barber && (
                            <span style={{ fontSize: 11, color: "#71717a" }}>
                              with {appt.barber}
                            </span>
                          )}
                          {appt.service_price && (
                            <span
                              style={{
                                fontFamily: "'DM Mono',monospace",
                                fontSize: 11,
                                color: "#52525b",
                              }}
                            >
                              ${appt.service_price}
                            </span>
                          )}
                        </div>
                        {appt.client_email && !isMobile && (
                          <p
                            style={{
                              fontSize: 10,
                              color: "#3f3f46",
                              marginTop: 3,
                            }}
                          >
                            {appt.client_email}
                          </p>
                        )}
                      </div>

                      {/* Payment badge */}
                      <Badge cfg={pCfg} />

                      {/* Status badge — clickable dropdown */}
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={() =>
                            setStatusMenuId(
                              statusMenuId === appt.id ? null : appt.id,
                            )
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontFamily: "'Syncopate',sans-serif",
                            fontSize: 7,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            padding: "5px 10px",
                            background: sCfg.bg,
                            color: sCfg.color,
                            border: `1px solid ${sCfg.border}`,
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          {sCfg.label}
                          <span style={{ fontSize: 8, opacity: 0.7 }}>▾</span>
                        </button>

                        {/* Status dropdown */}
                        {statusMenuId === appt.id && (
                          <div
                            style={{
                              position: "absolute",
                              top: "calc(100% + 4px)",
                              right: 0,
                              zIndex: 100,
                              background: "#0f0f0f",
                              border: "1px solid rgba(255,255,255,0.12)",
                              minWidth: 140,
                              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                            }}
                          >
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                              <button
                                key={key}
                                onClick={() => handleStatusChange(appt.id, key)}
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: "11px 14px",
                                  background:
                                    currentStatus === key
                                      ? "rgba(245,158,11,0.06)"
                                      : "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  transition: "background 0.15s",
                                  textAlign: "left",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background =
                                    "rgba(255,255,255,0.04)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background =
                                    currentStatus === key
                                      ? "rgba(245,158,11,0.06)"
                                      : "transparent")
                                }
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
                                    fontFamily: "'Syncopate',sans-serif",
                                    fontSize: 7,
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    color:
                                      currentStatus === key
                                        ? "#f59e0b"
                                        : "#a1a1aa",
                                  }}
                                >
                                  {cfg.label}
                                </span>
                                {currentStatus === key && (
                                  <span
                                    style={{
                                      marginLeft: "auto",
                                      fontSize: 10,
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
                        onClick={() => setDeleteTarget(appt)}
                        style={{
                          width: 32,
                          height: 32,
                          background: "transparent",
                          border: "1px solid rgba(248,113,113,0.2)",
                          color: "#52525b",
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
                          e.currentTarget.style.background =
                            "rgba(248,113,113,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor =
                            "rgba(248,113,113,0.2)";
                          e.currentTarget.style.color = "#52525b";
                          e.currentTarget.style.background = "transparent";
                        }}
                        title="Remove appointment"
                      >
                        <svg
                          width="12"
                          height="12"
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
                  );
                })}
              </div>
            )}

            {/* ── Timeline view (visual) ── */}
            {schedule.length > 0 && !isMobile && (
              <div className="admin-enter" style={{ marginTop: 48 }}>
                <h3
                  style={{
                    ...sf,
                    fontSize: 10,
                    letterSpacing: "0.3em",
                    color: "#52525b",
                    textTransform: "uppercase",
                    marginBottom: 20,
                  }}
                >
                  Visual Timeline
                </h3>
                <div style={{ position: "relative", paddingLeft: 80 }}>
                  {/* Hour marks */}
                  {Array.from({ length: 10 }, (_, i) => {
                    const hour = 9 + i;
                    const label = `${hour % 12 || 12}:00 ${hour >= 12 ? "PM" : "AM"}`;
                    return (
                      <div
                        key={hour}
                        style={{
                          position: "absolute",
                          left: 0,
                          top: i * 48,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'DM Mono',monospace",
                            fontSize: 9,
                            color: "#3f3f46",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {label}
                        </span>
                      </div>
                    );
                  })}
                  {/* Hour lines */}
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: 72,
                        right: 0,
                        top: i * 48,
                        height: 1,
                        background: "rgba(255,255,255,0.04)",
                      }}
                    />
                  ))}
                  {/* Appointment blocks */}
                  <div style={{ position: "relative", height: 9 * 48 + 24 }}>
                    {schedule.map((appt) => {
                      if (!appt.time) return null;
                      const [h, m] = appt.time.split(":");
                      const topOffset =
                        (parseInt(h) - 9) * 48 + (parseInt(m) / 60) * 48;
                      const cfg =
                        STATUS_CONFIG[
                          statusOverrides[appt.id] || appt.status || "confirmed"
                        ];
                      return (
                        <div
                          key={appt.id}
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: topOffset,
                            height: 40,
                            background: `${cfg.bg}`,
                            border: `1px solid ${cfg.border}`,
                            padding: "4px 12px",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            overflow: "hidden",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'DM Mono',monospace",
                              fontSize: 9,
                              color: cfg.color,
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
                              letterSpacing: "0.1em",
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
                                color: "#71717a",
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
          </>
        )}
      </div>

      {/* ══ DELETE CONFIRM MODAL ══ */}
      {deleteTarget && (
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
              maxWidth: 400,
              background: "#0a0a0a",
              border: "1px solid rgba(248,113,113,0.2)",
              padding: "32px 28px",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <svg
                width="20"
                height="20"
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
                fontSize: 18,
                fontWeight: 900,
                textTransform: "uppercase",
                color: "white",
                marginBottom: 16,
              }}
            >
              Confirm Delete<span style={{ color: "#f87171" }}>?</span>
            </h2>
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(248,113,113,0.05)",
                border: "1px solid rgba(248,113,113,0.15)",
                marginBottom: 20,
              }}
            >
              <p style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.7 }}>
                <span style={{ color: "white", fontWeight: 700 }}>
                  {deleteTarget.client}
                </span>
                <br />
                {deleteTarget.service} · {fmtTime(deleteTarget.time)}
                <br />
                <span style={{ color: "#f87171" }}>
                  {fmtDateShort(deleteTarget.date)}
                </span>
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#a1a1aa",
                  ...sf,
                  fontSize: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = "#a1a1aa";
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 2,
                  padding: "14px",
                  background: deleting ? "#27272a" : "#f87171",
                  color: deleting ? "#52525b" : "black",
                  ...sf,
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  border: "none",
                  cursor: deleting ? "not-allowed" : "pointer",
                  transition: "all 0.3s",
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
                        border: "2px solid #52525b",
                        borderTopColor: "transparent",
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
      )}

      {/* Click outside status menu to close */}
      {statusMenuId && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={() => setStatusMenuId(null)}
        />
      )}
    </>
  );
}
