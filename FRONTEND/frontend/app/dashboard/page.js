"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import API from "@/lib/api";
import AuthGuard from "@/lib/AuthGuard";
import useBreakpoint from "@/lib/useBreakpoint";

const sf = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };
const T = {
  bg: "#040404",
  surface: "#0a0a0a",
  border: "rgba(255,255,255,0.08)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.1)",
  amberBorder: "rgba(245,158,11,0.3)",
  muted: "#71717a",
  dim: "#3f3f46",
  green: "#4ade80",
  red: "#f87171",
};

const STATUS_CFG = {
  confirmed: {
    label: "Confirmed",
    color: T.green,
    bg: "rgba(74,222,128,0.1)",
    border: "rgba(74,222,128,0.25)",
  },
  completed: {
    label: "Completed",
    color: "#a1a1aa",
    bg: "rgba(161,161,170,0.08)",
    border: "rgba(161,161,170,0.15)",
  },
  no_show: {
    label: "No Show",
    color: T.red,
    bg: "rgba(248,113,113,0.08)",
    border: "rgba(248,113,113,0.2)",
  },
  cancelled: {
    label: "Cancelled",
    color: T.dim,
    bg: "rgba(82,82,91,0.06)",
    border: "rgba(82,82,91,0.15)",
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
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

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

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Handle post-payment params
  useEffect(() => {
    if (searchParams.get("booked") === "true") {
      showToast("🎉 Booking confirmed! See you soon.");
      window.history.replaceState({}, "", "/dashboard");
    }
    if (searchParams.get("canceled") === "true") {
      showToast("Payment cancelled — your slot was not booked.", "error");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

  // Load data
  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, apptsRes] = await Promise.all([
          API.get("dashboard/"),
          API.get("appointments/"),
        ]);
        setUser(dashRes.data);
        const appts = Array.isArray(apptsRes.data)
          ? apptsRes.data
          : apptsRes.data.results || [];
        setAppointments(
          appts.sort((a, b) => new Date(b.date) - new Date(a.date)),
        );
      } catch {
        showToast("Could not load data. Please refresh.", "error");
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
    if (
      !confirm(
        `Cancel your ${appt.service_name || "appointment"} on ${fmtDate(appt.date)}?`,
      )
    )
      return;
    setCancelling(appt.id);
    try {
      await API.delete(`appointments/${appt.id}/`);
      setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
      showToast("Appointment cancelled.");
    } catch {
      showToast("Could not cancel. Please try again.", "error");
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

  const memberSince =
    appointments.length > 0
      ? new Date(
          appointments[appointments.length - 1].date + "T00:00:00",
        ).getFullYear()
      : new Date().getFullYear();

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
          font-family: "DM Mono", monospace;
          overflow-x: hidden;
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
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dash-card {
          animation: fadeUp 0.5s ease forwards;
          opacity: 0;
        }
        .dash-card:nth-child(1) {
          animation-delay: 0.05s;
        }
        .dash-card:nth-child(2) {
          animation-delay: 0.1s;
        }
        .dash-card:nth-child(3) {
          animation-delay: 0.15s;
        }
        .dash-card:nth-child(4) {
          animation-delay: 0.2s;
        }
        .dash-card:nth-child(5) {
          animation-delay: 0.25s;
        }
      `}</style>

      {/* Grid background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: `linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
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
          top: 0,
          right: 0,
          width: 400,
          height: 400,
          background: `radial-gradient(circle, ${T.amberDim} 0%, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: isMobile ? 24 : 32,
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
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: toast.type === "success" ? T.green : T.red,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              ...sf,
              fontSize: 7,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: toast.type === "success" ? T.green : T.red,
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
        {/* ── NAV ── */}
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "rgba(4,4,4,0.92)",
            backdropFilter: "blur(20px)",
            borderBottom: `1px solid ${T.border}`,
            padding: isMobile ? "0 16px" : "0 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: 60,
          }}
        >
          <a
            href="/"
            style={{
              ...sf,
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: "-0.05em",
              textDecoration: "none",
            }}
          >
            HEADZ<span style={{ color: T.amber, fontStyle: "italic" }}>UP</span>
          </a>
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
                    width: 30,
                    height: 30,
                    background: T.amber,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
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
                    {(user.user || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <span style={{ ...mono, fontSize: 11, color: T.muted }}>
                  {user.user}
                </span>
              </div>
            )}
            <button
              onClick={() => router.push("/book")}
              style={{
                padding: isMobile ? "8px 14px" : "10px 20px",
                background: T.amber,
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
              onMouseEnter={(e) => (e.currentTarget.style.background = "white")}
              onMouseLeave={(e) => (e.currentTarget.style.background = T.amber)}
            >
              + Book
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: isMobile ? "8px 10px" : "10px 16px",
                background: "transparent",
                color: T.muted,
                ...sf,
                fontSize: 7,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                border: `1px solid ${T.border}`,
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
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
        </nav>

        {/* ── MAIN ── */}
        <div
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            padding: isMobile
              ? "28px 16px max(48px,env(safe-area-inset-bottom))"
              : "48px 32px 64px",
          }}
        >
          {loading ? (
            <div
              style={{
                paddingTop: 80,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
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
              <p
                style={{
                  ...sf,
                  fontSize: 6,
                  letterSpacing: "0.4em",
                  color: T.dim,
                  textTransform: "uppercase",
                }}
              >
                Loading...
              </p>
            </div>
          ) : (
            <>
              {/* ── GREETING ── */}
              <div
                className="dash-card"
                style={{ marginBottom: isMobile ? 24 : 36 }}
              >
                <p
                  style={{
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.4em",
                    color: T.amber,
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Welcome Back
                </p>
                <h1
                  style={{
                    ...sf,
                    fontSize: "clamp(1.6rem,5vw,2.8rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {user?.user || "Client"}
                  <span style={{ color: T.amber, fontStyle: "italic" }}>_</span>
                </h1>
              </div>

              {/* ── STATS ── */}
              <div
                className="dash-card"
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "repeat(2,1fr)"
                    : "repeat(4,1fr)",
                  gap: 8,
                  marginBottom: isMobile ? 24 : 36,
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
                  {
                    label: "Completed",
                    value: appointments.filter((a) => a.status === "completed")
                      .length,
                    accent: false,
                  },
                  { label: "Member Since", value: memberSince, accent: false },
                ].map(({ label, value, accent }) => (
                  <div
                    key={label}
                    style={{
                      padding: isMobile ? "16px 14px" : "22px 18px",
                      background: accent ? T.amberDim : T.surface,
                      border: `1px solid ${accent ? T.amberBorder : T.border}`,
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
                        color: accent ? T.amber : T.muted,
                        textTransform: "uppercase",
                        marginBottom: 10,
                      }}
                    >
                      {label}
                    </p>
                    <p
                      style={{
                        ...sf,
                        fontSize: isMobile ? 24 : 32,
                        fontWeight: 900,
                        color: accent ? T.amber : "white",
                        lineHeight: 1,
                      }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* ── NEXT APPOINTMENT ── */}
              {nextAppt && (
                <div
                  className="dash-card"
                  style={{
                    marginBottom: isMobile ? 24 : 36,
                    padding: isMobile ? "20px 16px" : "24px 28px",
                    background: `linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))`,
                    border: `1px solid ${T.amberBorder}`,
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
                        ...sf,
                        fontSize: 6,
                        letterSpacing: "0.4em",
                        color: T.amber,
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      Next Appointment
                    </p>
                    <h2
                      style={{
                        ...sf,
                        fontSize: "clamp(1rem,2.5vw,1.4rem)",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      {nextAppt.service_name || "Appointment"}
                    </h2>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ ...mono, fontSize: 12, color: T.muted }}>
                        {fmtDate(nextAppt.date)}
                      </span>
                      {nextAppt.time && (
                        <span style={{ ...mono, fontSize: 12, color: T.amber }}>
                          {fmtTime(nextAppt.time)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        background: T.green,
                        borderRadius: "50%",
                        boxShadow: `0 0 8px ${T.green}`,
                      }}
                    />
                    <span
                      style={{
                        ...sf,
                        fontSize: 7,
                        color: T.green,
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                      }}
                    >
                      Confirmed
                    </span>
                  </div>
                </div>
              )}

              {/* ── APPOINTMENTS LIST ── */}
              <div className="dash-card">
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
                  <h2
                    style={{
                      ...sf,
                      fontSize: "clamp(0.8rem,2vw,1rem)",
                      fontWeight: 900,
                      textTransform: "uppercase",
                    }}
                  >
                    Your_
                    <span style={{ color: T.amber, fontStyle: "italic" }}>
                      Appointments
                    </span>
                  </h2>
                  <div
                    style={{ display: "flex", border: `1px solid ${T.border}` }}
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
                            activeTab === tab ? T.amber : "transparent",
                          color: activeTab === tab ? "black" : T.muted,
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
                      border: `1px solid ${T.border}`,
                      background: "rgba(255,255,255,0.01)",
                    }}
                  >
                    <p
                      style={{
                        ...sf,
                        fontSize: "clamp(1.5rem,5vw,3rem)",
                        fontWeight: 900,
                        color: "rgba(255,255,255,0.04)",
                        textTransform: "uppercase",
                        marginBottom: 16,
                      }}
                    >
                      No {activeTab} cuts
                    </p>
                    {activeTab === "upcoming" && (
                      <button
                        onClick={() => router.push("/book")}
                        style={{
                          padding: "14px 32px",
                          background: T.amber,
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
                          (e.currentTarget.style.background = T.amber)
                        }
                      >
                        Book Now →
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {shown.map((appt) => {
                      const sCfg =
                        STATUS_CFG[appt.status] || STATUS_CFG.confirmed;
                      return (
                        <div
                          key={appt.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: isMobile ? 10 : 16,
                            padding: isMobile ? "14px 12px" : "16px 20px",
                            background: T.surface,
                            border: `1px solid ${T.border}`,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = T.amberBorder;
                            e.currentTarget.style.background = T.amberDim;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = T.border;
                            e.currentTarget.style.background = T.surface;
                          }}
                        >
                          {/* Date block */}
                          <div
                            style={{
                              width: isMobile ? 40 : 50,
                              flexShrink: 0,
                              textAlign: "center",
                            }}
                          >
                            <p
                              style={{
                                ...sf,
                                fontSize: isMobile ? 18 : 24,
                                fontWeight: 900,
                                color:
                                  appt.status === "confirmed"
                                    ? T.amber
                                    : T.muted,
                                lineHeight: 1,
                              }}
                            >
                              {new Date(appt.date + "T00:00:00").getDate()}
                            </p>
                            <p
                              style={{
                                ...sf,
                                fontSize: 6,
                                color: T.dim,
                                textTransform: "uppercase",
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
                              background: T.border,
                              flexShrink: 0,
                            }}
                          />

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                ...sf,
                                fontSize: isMobile ? 8 : 10,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                marginBottom: 3,
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
                                  color: T.muted,
                                }}
                              >
                                {fmtDate(appt.date)}
                              </span>
                              {appt.time && (
                                <span
                                  style={{
                                    ...mono,
                                    fontSize: 10,
                                    color: T.amber,
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
                              background: sCfg.bg,
                              color: sCfg.color,
                              border: `1px solid ${sCfg.border}`,
                              flexShrink: 0,
                            }}
                          >
                            {sCfg.label}
                          </span>

                          {/* Cancel button — upcoming only */}
                          {appt.status === "confirmed" &&
                            activeTab === "upcoming" && (
                              <button
                                onClick={() => handleCancel(appt)}
                                disabled={cancelling === appt.id}
                                style={{
                                  width: isMobile ? 32 : 28,
                                  height: isMobile ? 32 : 28,
                                  background: "transparent",
                                  border: "1px solid rgba(248,113,113,0.2)",
                                  color: T.dim,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 10,
                                  transition: "all 0.2s",
                                  flexShrink: 0,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = T.red;
                                  e.currentTarget.style.color = T.red;
                                  e.currentTarget.style.background =
                                    "rgba(248,113,113,0.08)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor =
                                    "rgba(248,113,113,0.2)";
                                  e.currentTarget.style.color = T.dim;
                                  e.currentTarget.style.background =
                                    "transparent";
                                }}
                              >
                                {cancelling === appt.id ? "..." : "✕"}
                              </button>
                            )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── QUICK ACTIONS ── */}
              <div
                className="dash-card"
                style={{
                  marginTop: isMobile ? 24 : 36,
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 10,
                }}
              >
                <button
                  onClick={() => router.push("/book")}
                  style={{
                    padding: "16px 24px",
                    background: T.amber,
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
                    (e.currentTarget.style.background = T.amber)
                  }
                >
                  Book New Appointment →
                </button>
                <button
                  onClick={() => router.push("/")}
                  style={{
                    padding: "16px 24px",
                    background: "transparent",
                    color: T.muted,
                    ...sf,
                    fontSize: 8,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    border: `1px solid ${T.border}`,
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
                  Return to Site
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
            }}
          >
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
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} body{background:#040404;margin:0}`}</style>
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </AuthGuard>
  );
}
