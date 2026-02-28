"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as THREE from "three";
import { gsap } from "gsap";
import API from "@/lib/api";
import useBreakpoint from "@/lib/useBreakpoint";
import AuthGuard from "@/lib/AuthGuard";
import MiniCalendar from "@/lib/MiniCalendar";

const TIME_SLOTS = [
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

function to24Hour(t) {
  const [time, mod] = t.split(" ");
  let [h, m] = time.split(":");
  if (h === "12") h = "00";
  if (mod === "PM") h = String(parseInt(h) + 12);
  return `${h.padStart(2, "0")}:${m}:00`;
}

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
  try {
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
  } catch {
    return t;
  }
}

// Can cancel if appointment is more than 2 hours away
function canCancel(date, time) {
  if (!date || !time) return true;
  const apptDate = new Date(`${date}T${time}`);
  const now = new Date();
  const diffHours = (apptDate - now) / (1000 * 60 * 60);
  return diffHours > 2;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canvasRef = useRef(null);

  const [user, setUser] = useState("");
  const [isStaff, setIsStaff] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  // Change password
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [toast, setToast] = useState(null);

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState(null); // appointment obj
  const [cancelling, setCancelling] = useState(false);

  // Reschedule modal
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [rescheduleDone, setRescheduleDone] = useState(false);

  const sf = { fontFamily: "'Syncopate', sans-serif" };
  const { isMobile, isTablet } = useBreakpoint();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── URL param toasts ────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchParams.get("booked") === "true") {
      showToast("🎉 Booking confirmed! See you soon.", "success");
      window.history.replaceState({}, "", "/dashboard");
    }
    if (searchParams.get("canceled") === "true") {
      showToast("Payment canceled. Your slot was not booked.", "error");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

  // ── Particles ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    const verts = [];
    for (let i = 0; i < 1200; i++) {
      verts.push(THREE.MathUtils.randFloatSpread(10));
      verts.push(THREE.MathUtils.randFloatSpread(10));
      verts.push(THREE.MathUtils.randFloatSpread(10));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.006,
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.15,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    camera.position.z = 3;
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      points.rotation.y += 0.0004;
      renderer.render(scene, camera);
    };
    animate();
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, []);

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [dash, appts] = await Promise.all([
          API.get("dashboard/"),
          API.get("appointments/"),
        ]);
        setUser(dash.data.user);
        setIsStaff(dash.data.is_staff || false);
        setAppointments(appts.data);
      } catch {
        showToast("Could not load your data. Please refresh.", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Entrance animation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading) {
      gsap.from(".dash-enter", {
        y: 40,
        opacity: 0,
        duration: 1.2,
        stagger: 0.1,
        ease: "expo.out",
      });
    }
  }, [loading]);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    router.push("/login");
  };

  // ── Change password ─────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwError("");
    setPwSuccess(false);
    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwError("All fields are required.");
      return;
    }
    if (pwNew.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError("Passwords don't match.");
      return;
    }
    setPwLoading(true);
    try {
      await API.post("change-password/", {
        current_password: pwCurrent,
        new_password: pwNew,
        confirm_password: pwConfirm,
      });
      setPwSuccess(true);
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      setTimeout(() => {
        setShowPwModal(false);
        setPwSuccess(false);
      }, 2200);
    } catch (e) {
      setPwError(
        e.response?.data?.error || "Could not update password. Try again.",
      );
    } finally {
      setPwLoading(false);
    }
  };

  // ── Cancel appointment ──────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await API.delete(`appointments/${cancelTarget.id}/`);
      setAppointments((prev) => prev.filter((a) => a.id !== cancelTarget.id));
      setCancelTarget(null);
      showToast("Appointment cancelled successfully.", "success");
    } catch {
      showToast("Could not cancel. Please try again.", "error");
    } finally {
      setCancelling(false);
    }
  };

  // ── Reschedule appointment ──────────────────────────────────────────────────
  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      setRescheduleError("Please pick both a date and time.");
      return;
    }
    setRescheduling(true);
    setRescheduleError("");
    try {
      const res = await API.patch(`appointments/${rescheduleTarget.id}/`, {
        date: newDate,
        time: to24Hour(newTime),
      });
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === rescheduleTarget.id
            ? { ...a, date: newDate, time: to24Hour(newTime) }
            : a,
        ),
      );
      setRescheduleDone(true);
      setTimeout(() => {
        setRescheduleTarget(null);
        setRescheduleDone(false);
        setNewDate("");
        setNewTime("");
      }, 1800);
    } catch (e) {
      setRescheduleError(
        e.response?.data?.detail ||
          e.response?.data?.non_field_errors?.[0] ||
          "That slot may already be taken. Try another time.",
      );
    } finally {
      setRescheduling(false);
    }
  };

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => new Date(a.date + "T23:59:59") >= now,
  );
  const past = appointments.filter((a) => new Date(a.date + "T23:59:59") < now);
  const shown = activeTab === "upcoming" ? upcoming : past;

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
        @keyframes fadeSlide {
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
        .appt-row {
          transition:
            border-color 0.2s,
            background 0.2s;
        }
        .appt-row:hover {
          border-color: rgba(245, 158, 11, 0.25) !important;
          background: rgba(245, 158, 11, 0.03) !important;
        }
      `}</style>

      <div
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          opacity: 0.03,
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.svg')",
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            padding: "14px 28px",
            background:
              toast.type === "success"
                ? "rgba(34,197,94,0.12)"
                : "rgba(248,113,113,0.12)",
            border: `1px solid ${toast.type === "success" ? "rgba(34,197,94,0.4)" : "rgba(248,113,113,0.4)"}`,
            backdropFilter: "blur(12px)",
            animation: "fadeSlide 0.3s ease",
            whiteSpace: "nowrap",
          }}
        >
          <p
            style={{
              ...sf,
              fontSize: 9,
              color: toast.type === "success" ? "#4ade80" : "#f87171",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {toast.message}
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
          padding: isMobile ? "16px 16px" : "20px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(5,5,5,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            ...sf,
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: "-0.05em",
          }}
        >
          HEADZ<span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {isStaff && (
            <button
              onClick={() => router.push("/barber-dashboard")}
              style={{
                ...sf,
                fontSize: 8,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#f59e0b",
                background: "none",
                border: "1px solid rgba(245,158,11,0.3)",
                padding: "7px 14px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(245,158,11,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
            >
              Admin ↗
            </button>
          )}
          <button
            onClick={() => router.push("/book")}
            style={{
              ...sf,
              fontSize: 8,
              letterSpacing: "0.2em",
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
            Book →
          </button>
          <button
            onClick={() => setShowPwModal(true)}
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#a1a1aa",
              ...sf,
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#f59e0b";
              e.currentTarget.style.color = "#f59e0b";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
              e.currentTarget.style.color = "#a1a1aa";
            }}
          >
            Change Password
          </button>
          <button
            onClick={handleLogout}
            style={{
              ...sf,
              fontSize: 8,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#52525b",
              background: "none",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "8px 16px",
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

      {/* Main */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          padding: isMobile ? "80px 16px 48px" : "100px 28px 60px",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "60vh",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
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
              Loading your data...
            </p>
          </div>
        ) : (
          <>
            {/* Welcome */}
            <div className="dash-enter" style={{ marginBottom: 48 }}>
              <p
                style={{
                  ...sf,
                  fontSize: 9,
                  letterSpacing: "0.4em",
                  color: "#71717a",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Your Dashboard
              </p>
              <h1
                style={{
                  ...sf,
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                What&apos;s Good,{" "}
                <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                  {user}_
                </span>
              </h1>
            </div>

            {/* Stats */}
            <div
              className="dash-enter"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                marginBottom: 40,
              }}
            >
              {[
                {
                  label: "Total Visits",
                  value: appointments.length,
                  accent: false,
                },
                { label: "Upcoming", value: upcoming.length, accent: true },
                { label: "Past Cuts", value: past.length, accent: false },
                { label: "Member Since", value: "2026", accent: false },
              ].map(({ label, value, accent }) => (
                <div
                  key={label}
                  style={{
                    padding: "24px 20px",
                    background: accent
                      ? "rgba(245,158,11,0.08)"
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${accent ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.06)"}`,
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#f59e0b";
                    e.currentTarget.style.background = "rgba(245,158,11,0.07)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = accent
                      ? "rgba(245,158,11,0.3)"
                      : "rgba(255,255,255,0.06)";
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
                      marginBottom: 12,
                    }}
                  >
                    {label}
                  </p>
                  <p
                    style={{
                      ...sf,
                      fontSize: 34,
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

            {/* Next appointment banner */}
            {upcoming[0] && (
              <div
                className="dash-enter"
                style={{
                  marginBottom: 40,
                  padding: "24px 28px",
                  background:
                    "linear-gradient(135deg, rgba(245,158,11,0.09), rgba(245,158,11,0.03))",
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
                      ...sf,
                      fontSize: 7,
                      letterSpacing: "0.4em",
                      color: "#f59e0b",
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
                      marginBottom: 4,
                    }}
                  >
                    {upcoming[0].service_name || "Appointment"}
                  </h2>
                  <p style={{ color: "#a1a1aa", fontSize: 13 }}>
                    {fmtDate(upcoming[0].date)}
                    {upcoming[0].time && <> · {fmtTime(upcoming[0].time)}</>}
                    {upcoming[0].barber_name && (
                      <>
                        {" "}
                        · with{" "}
                        <span style={{ color: "white" }}>
                          {upcoming[0].barber_name}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {/* Reschedule from banner */}
                  <button
                    onClick={() => {
                      setRescheduleTarget(upcoming[0]);
                      setRescheduleError("");
                      setNewDate("");
                      setNewTime("");
                    }}
                    style={{
                      ...sf,
                      fontSize: 8,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      padding: "10px 16px",
                      background: "transparent",
                      border: "1px solid rgba(245,158,11,0.4)",
                      color: "#f59e0b",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(245,158,11,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    Reschedule ↻
                  </button>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        background: "#22c55e",
                        borderRadius: "50%",
                        boxShadow: "0 0 8px rgba(34,197,94,0.8)",
                      }}
                    />
                    <span
                      style={{
                        ...sf,
                        fontSize: 8,
                        color: "#4ade80",
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                      }}
                    >
                      Confirmed
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Appointments list */}
            <div className="dash-enter">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <h2
                  style={{
                    ...sf,
                    fontSize: "clamp(1rem,2.5vw,1.3rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                  }}
                >
                  Your_
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    Appointments
                  </span>
                </h2>
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
                        padding: "10px 18px",
                        ...sf,
                        fontSize: 8,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        background:
                          activeTab === tab ? "#f59e0b" : "transparent",
                        color: activeTab === tab ? "black" : "#71717a",
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
                    padding: "64px 0",
                    textAlign: "center",
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <p
                    style={{
                      ...sf,
                      fontSize: 24,
                      fontWeight: 900,
                      color: "rgba(255,255,255,0.05)",
                      textTransform: "uppercase",
                      marginBottom: 20,
                    }}
                  >
                    No {activeTab} cuts
                  </p>
                  {activeTab === "upcoming" && (
                    <button
                      onClick={() => router.push("/book")}
                      style={{
                        padding: "14px 32px",
                        background: "#f59e0b",
                        color: "black",
                        ...sf,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        border: "none",
                        cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background = "white")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.background = "#f59e0b")
                      }
                    >
                      Book Now →
                    </button>
                  )}
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {shown.map((appt, i) => {
                    const canCancelThis = canCancel(appt.date, appt.time);
                    const isUpcoming = activeTab === "upcoming";
                    return (
                      <div
                        key={appt.id}
                        className="appt-row"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: isMobile ? 10 : 16,
                          padding: isMobile ? "14px 14px" : "18px 24px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          animation: "fadeSlide 0.4s ease forwards",
                          animationDelay: `${i * 0.06}s`,
                          opacity: 0,
                          flexWrap: "wrap",
                        }}
                      >
                        {/* Date block */}
                        <div
                          style={{
                            width: 44,
                            flexShrink: 0,
                            textAlign: "center",
                          }}
                        >
                          <p
                            style={{
                              ...sf,
                              fontSize: 22,
                              fontWeight: 900,
                              color: isUpcoming ? "#f59e0b" : "#52525b",
                              lineHeight: 1,
                            }}
                          >
                            {new Date(appt.date + "T00:00:00").getDate()}
                          </p>
                          <p
                            style={{
                              ...sf,
                              fontSize: 7,
                              color: "#71717a",
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
                            height: 36,
                            background: "rgba(255,255,255,0.07)",
                            flexShrink: 0,
                          }}
                        />

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <p
                            style={{
                              ...sf,
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              marginBottom: 5,
                            }}
                          >
                            {appt.service_name || "Appointment"}
                          </p>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "2px 14px",
                            }}
                          >
                            {appt.barber_name && (
                              <span style={{ fontSize: 11, color: "#a1a1aa" }}>
                                with {appt.barber_name}
                              </span>
                            )}
                            {appt.time && (
                              <span style={{ fontSize: 11, color: "#71717a" }}>
                                {fmtTime(appt.time)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Payment badge */}
                        {appt.payment_method && (
                          <span
                            style={{
                              ...sf,
                              fontSize: 7,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              padding: "4px 10px",
                              background:
                                appt.payment_method === "online"
                                  ? "rgba(245,158,11,0.1)"
                                  : "rgba(255,255,255,0.05)",
                              color:
                                appt.payment_method === "online"
                                  ? "#fbbf24"
                                  : "#71717a",
                              border: `1px solid ${appt.payment_method === "online" ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.08)"}`,
                              flexShrink: 0,
                            }}
                          >
                            {appt.payment_method === "online"
                              ? "💳 Paid"
                              : "💵 Pay In Shop"}
                          </span>
                        )}

                        {/* Status badge */}
                        <span
                          style={{
                            ...sf,
                            fontSize: 7,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            padding: "5px 12px",
                            background: isUpcoming
                              ? "rgba(34,197,94,0.1)"
                              : "rgba(255,255,255,0.04)",
                            color: isUpcoming ? "#4ade80" : "#52525b",
                            border: `1px solid ${isUpcoming ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)"}`,
                            flexShrink: 0,
                          }}
                        >
                          {isUpcoming ? "✓ Confirmed" : "Done"}
                        </span>

                        {/* Action buttons — upcoming only */}
                        {isUpcoming && (
                          <div
                            style={{ display: "flex", gap: 8, flexShrink: 0 }}
                          >
                            <button
                              onClick={() => {
                                setRescheduleTarget(appt);
                                setRescheduleError("");
                                setNewDate("");
                                setNewTime("");
                              }}
                              style={{
                                ...sf,
                                fontSize: 7,
                                letterSpacing: "0.15em",
                                textTransform: "uppercase",
                                padding: "7px 12px",
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
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              ↻
                            </button>
                            <button
                              onClick={() =>
                                canCancelThis
                                  ? setCancelTarget(appt)
                                  : showToast(
                                      "Cannot cancel within 2 hours of appointment.",
                                      "error",
                                    )
                              }
                              style={{
                                ...sf,
                                fontSize: 7,
                                letterSpacing: "0.15em",
                                textTransform: "uppercase",
                                padding: "7px 12px",
                                background: "transparent",
                                border: `1px solid ${canCancelThis ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.08)"}`,
                                color: canCancelThis ? "#f87171" : "#3f3f46",
                                cursor: canCancelThis
                                  ? "pointer"
                                  : "not-allowed",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                if (canCancelThis)
                                  e.currentTarget.style.background =
                                    "rgba(248,113,113,0.1)";
                              }}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                              title={
                                !canCancelThis
                                  ? "Cannot cancel within 2 hours of appointment"
                                  : "Cancel appointment"
                              }
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div
              className="dash-enter"
              style={{
                marginTop: isMobile ? 28 : 40,
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              <button
                onClick={() => router.push("/book")}
                style={{
                  padding: "18px 24px",
                  background: "#f59e0b",
                  color: "black",
                  border: "none",
                  ...sf,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "white")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#f59e0b")
                }
              >
                Book New Appointment
              </button>
              {isStaff && (
                <button
                  onClick={() => router.push("/barber-dashboard")}
                  style={{
                    padding: "18px 24px",
                    background: "transparent",
                    color: "#f59e0b",
                    border: "1px solid rgba(245,158,11,0.35)",
                    ...sf,
                    fontSize: 9,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(245,158,11,0.08)";
                    e.currentTarget.style.borderColor = "#f59e0b";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "rgba(245,158,11,0.35)";
                  }}
                >
                  ↗ View Schedule
                </button>
              )}
              <button
                onClick={() => router.push("/")}
                style={{
                  padding: "18px 24px",
                  background: "transparent",
                  color: "#71717a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  ...sf,
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#71717a";
                }}
              >
                Return to Site
              </button>
            </div>
          </>
        )}
      </div>

      {/* ══ CANCEL MODAL ══ */}
      {cancelTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.87)",
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
              maxWidth: 420,
              background: "#0a0a0a",
              border: "1px solid rgba(248,113,113,0.2)",
              padding: "36px 32px",
            }}
          >
            {/* Warning icon */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <svg
                width="24"
                height="24"
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
                fontSize: 20,
                fontWeight: 900,
                textTransform: "uppercase",
                color: "white",
                marginBottom: 16,
              }}
            >
              Are You Sure<span style={{ color: "#f87171" }}>?</span>
            </h2>

            {/* Appointment summary */}
            <div
              style={{
                padding: "14px 18px",
                background: "rgba(248,113,113,0.05)",
                border: "1px solid rgba(248,113,113,0.15)",
                marginBottom: 24,
              }}
            >
              <p style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.7 }}>
                <span style={{ color: "white", fontWeight: 700 }}>
                  {cancelTarget.service_name}
                </span>
                {cancelTarget.barber_name && (
                  <>
                    {" "}
                    with{" "}
                    <span style={{ color: "white" }}>
                      {cancelTarget.barber_name}
                    </span>
                  </>
                )}
                <br />
                <span style={{ color: "#f87171" }}>
                  {fmtDate(cancelTarget.date)}
                </span>
                {cancelTarget.time && <> at {fmtTime(cancelTarget.time)}</>}
              </p>
            </div>

            <p
              style={{
                fontSize: 11,
                color: "#71717a",
                marginBottom: 28,
                lineHeight: 1.6,
              }}
            >
              This will permanently free up your slot. This action cannot be
              undone.
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setCancelTarget(null)}
                style={{
                  flex: 1,
                  padding: "16px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#a1a1aa",
                  ...sf,
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.color = "#a1a1aa";
                }}
              >
                Keep It
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  flex: 2,
                  padding: "16px",
                  background: cancelling ? "#3f3f46" : "#f87171",
                  color: cancelling ? "#71717a" : "black",
                  ...sf,
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  border: "none",
                  cursor: cancelling ? "not-allowed" : "pointer",
                  transition: "all 0.3s",
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
                        width: 12,
                        height: 12,
                        border: "2px solid #71717a",
                        borderTopColor: "transparent",
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

      {/* ══ RESCHEDULE MODAL ══ */}
      {rescheduleTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.87)",
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
              maxWidth: 480,
              background: "#0a0a0a",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "36px 32px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {rescheduleDone ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#22c55e,#16a34a)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                  }}
                >
                  <svg
                    width="28"
                    height="28"
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
                    fontSize: 11,
                    color: "#4ade80",
                    textTransform: "uppercase",
                    letterSpacing: "0.3em",
                    marginBottom: 8,
                  }}
                >
                  Rescheduled!
                </p>
                <p style={{ fontSize: 13, color: "#a1a1aa" }}>
                  Your appointment has been updated.
                </p>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 24,
                  }}
                >
                  <div>
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
                      Change Your Appointment
                    </p>
                    <h2
                      style={{
                        ...sf,
                        fontSize: 22,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        color: "white",
                      }}
                    >
                      Reschedule
                      <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                        _
                      </span>
                    </h2>
                  </div>
                  <button
                    onClick={() => setRescheduleTarget(null)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#52525b",
                      ...sf,
                      fontSize: 8,
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      transition: "color 0.2s",
                      padding: 0,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#f87171")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#52525b")
                    }
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Current booking */}
                <div
                  style={{
                    padding: "12px 16px",
                    background: "rgba(245,158,11,0.05)",
                    border: "1px solid rgba(245,158,11,0.15)",
                    marginBottom: 24,
                  }}
                >
                  <p
                    style={{
                      ...sf,
                      fontSize: 7,
                      color: "#52525b",
                      textTransform: "uppercase",
                      letterSpacing: "0.3em",
                      marginBottom: 6,
                    }}
                  >
                    Current Booking
                  </p>
                  <p style={{ fontSize: 12, color: "#a1a1aa" }}>
                    {rescheduleTarget.service_name}
                    {rescheduleTarget.barber_name && (
                      <>
                        {" "}
                        with{" "}
                        <span style={{ color: "white" }}>
                          {rescheduleTarget.barber_name}
                        </span>
                      </>
                    )}
                    {" · "}
                    <span style={{ color: "#f59e0b" }}>
                      {fmtDate(rescheduleTarget.date)}
                    </span>
                    {rescheduleTarget.time && (
                      <>
                        {" "}
                        at{" "}
                        <span style={{ color: "#f59e0b" }}>
                          {fmtTime(rescheduleTarget.time)}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {/* New date — calendar */}
                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      ...sf,
                      fontSize: 8,
                      letterSpacing: "0.3em",
                      color: "#a1a1aa",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 10,
                    }}
                  >
                    New Date
                  </label>
                  <MiniCalendar
                    selected={newDate}
                    onSelect={setNewDate}
                    sf={sf}
                  />
                </div>

                {/* New time */}
                <div style={{ marginBottom: 24 }}>
                  <label
                    style={{
                      ...sf,
                      fontSize: 8,
                      letterSpacing: "0.3em",
                      color: "#a1a1aa",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 10,
                    }}
                  >
                    New Time
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "repeat(3,1fr)"
                        : "repeat(4,1fr)",
                      gap: 6,
                    }}
                  >
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setNewTime(slot)}
                        style={{
                          padding: "10px 4px",
                          ...sf,
                          fontSize: 8,
                          textTransform: "uppercase",
                          border: `1px solid ${newTime === slot ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                          background:
                            newTime === slot
                              ? "rgba(245,158,11,0.12)"
                              : "transparent",
                          color: newTime === slot ? "#f59e0b" : "#a1a1aa",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {rescheduleError && (
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "rgba(248,113,113,0.08)",
                      border: "1px solid rgba(248,113,113,0.25)",
                      marginBottom: 16,
                    }}
                  >
                    <p
                      style={{
                        ...sf,
                        fontSize: 8,
                        color: "#f87171",
                        textTransform: "uppercase",
                        letterSpacing: "0.15em",
                        margin: 0,
                      }}
                    >
                      {rescheduleError}
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setRescheduleTarget(null)}
                    style={{
                      flex: 1,
                      padding: "16px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#71717a",
                      ...sf,
                      fontSize: 9,
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.4)";
                      e.currentTarget.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.12)";
                      e.currentTarget.style.color = "#71717a";
                    }}
                  >
                    Keep Current
                  </button>
                  <button
                    onClick={handleReschedule}
                    disabled={!newDate || !newTime || rescheduling}
                    style={{
                      flex: 2,
                      padding: "16px",
                      background:
                        !newDate || !newTime || rescheduling
                          ? "#27272a"
                          : "#f59e0b",
                      color:
                        !newDate || !newTime || rescheduling
                          ? "#52525b"
                          : "black",
                      ...sf,
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      border: "none",
                      cursor:
                        !newDate || !newTime || rescheduling
                          ? "not-allowed"
                          : "pointer",
                      transition: "all 0.3s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {rescheduling ? (
                      <>
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            border: "2px solid #52525b",
                            borderTopColor: "transparent",
                            borderRadius: "50%",
                            display: "inline-block",
                            animation: "spin 0.7s linear infinite",
                          }}
                        />
                        Updating...
                      </>
                    ) : (
                      "Confirm New Time →"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
