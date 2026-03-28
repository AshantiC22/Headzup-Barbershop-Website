"use client";

import MiniCalendar from "@/lib/MiniCalendar";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { gsap } from "gsap";
import API from "@/lib/api";
import useBreakpoint from "@/lib/useBreakpoint";

// ── Confetti — runs forever ───────────────────────────────────────────────────
function Confetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Green + white palette for in-shop
    const colors = [
      "#22c55e",
      "#4ade80",
      "#ffffff",
      "#86efac",
      "#bbf7d0",
      "#f0fdf4",
    ];
    const particles = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 300,
      w: 4 + Math.random() * 8,
      h: 8 + Math.random() * 14,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: 1.5 + Math.random() * 3.5,
      drift: (Math.random() - 0.5) * 1.8,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.12,
      opacity: 0.6 + Math.random() * 0.4,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y += p.speed;
        p.x += p.drift;
        p.rot += p.rotV;
        if (p.y > canvas.height + 20) {
          p.y = -20 - Math.random() * 40;
          p.x = Math.random() * canvas.width;
          p.speed = 1.5 + Math.random() * 3.5;
          p.drift = (Math.random() - 0.5) * 1.8;
        }
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 5, pointerEvents: "none" }}
    />
  );
}

// ── Scissor SVG ───────────────────────────────────────────────────────────────
function ScissorIcon({ size = 28, color = "#22c55e" }) {
  return (
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
}

export default function BookingConfirmedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState({
    username: "...",
    service: "Loading...",
    barber: "Loading...",
    date: "",
    time: "",
  });
  const [loading, setLoading] = useState(false);

  const sf = { fontFamily: "'Syncopate', sans-serif" };
  const { isMobile } = useBreakpoint();
  const [bookingRef, setBookingRef] = useState("--------");
  useEffect(() => {
    setBookingRef(Date.now().toString(36).toUpperCase().slice(-8));
  }, []);

  // ── Reschedule modal state ────────────────────────────────────────────────
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [rescheduleDone, setRescheduleDone] = useState(false);

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

  // ── Block browser back button ────────────────────────────────────────────
  useEffect(() => {
    // Push a dummy history entry so back goes nowhere useful
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // ── Load data — URL params first (instant), API enriches in background ────
  useEffect(() => {
    // Step 1: read URL params immediately — these were passed by book page
    const urlService = searchParams.get("service");
    const urlBarber = searchParams.get("barber");
    const urlDate = searchParams.get("date");
    const urlTime = searchParams.get("time");

    if (urlService && urlBarber) {
      setData((prev) => ({
        ...prev,
        service: urlService,
        barber: urlBarber,
        date: urlDate || "",
        time: urlTime || "",
      }));
    }

    // Step 2: fetch username from API in background (non-blocking)
    const loadUser = async () => {
      try {
        const userRes = await API.get("dashboard/");
        setData((prev) => ({ ...prev, username: userRes.data.user }));
      } catch {
        // username stays as "..." — not critical
      }
    };
    loadUser();
  }, []);

  // ── Entrance animations — fire on mount, data is already in state ────────
  useEffect(() => {
    // Small timeout lets the first paint complete before GSAP runs
    const id = setTimeout(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".conf-check", {
        scale: 0,
        opacity: 0,
        duration: 0.7,
        ease: "back.out(2.5)",
      })
        .from(".conf-title", { y: 40, opacity: 0, duration: 0.9 }, "-=0.3")
        .from(".conf-sub", { y: 20, opacity: 0, duration: 0.7 }, "-=0.6")
        .from(".conf-ticket", { y: 60, opacity: 0, duration: 1.0 }, "-=0.5")
        .from(
          ".conf-row",
          { x: -20, opacity: 0, duration: 0.5, stagger: 0.08 },
          "-=0.6",
        )
        .from(".conf-footer", { y: 20, opacity: 0, duration: 0.6 }, "-=0.3")
        .from(".conf-actions", { y: 20, opacity: 0, duration: 0.6 }, "-=0.4");
    }, 100);
    return () => clearTimeout(id);
  }, []);

  // ── Reschedule handler ───────────────────────────────────────────────────
  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      setRescheduleError("Please pick both a date and time.");
      return;
    }
    setRescheduling(true);
    setRescheduleError("");
    try {
      // Get the latest appointment id
      const apptRes = await API.get("appointments/");
      const appointments = apptRes.data;
      const latest = appointments[appointments.length - 1];
      if (!latest) throw new Error("No appointment found");

      // Update the appointment with new date/time
      await API.patch(`appointments/${latest.id}/`, {
        date: newDate,
        time: to24Hour(newTime),
      });

      // Update displayed data
      setData((prev) => ({ ...prev, date: newDate, time: newTime }));
      setRescheduleDone(true);
      setTimeout(() => {
        setShowReschedule(false);
        setRescheduleDone(false);
        setNewDate("");
        setNewTime("");
      }, 2000);
    } catch (e) {
      const msg =
        e.response?.data?.detail ||
        e.response?.data?.non_field_errors?.[0] ||
        "That slot may already be taken. Try another time.";
      setRescheduleError(msg);
    } finally {
      setRescheduling(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  const formatTime = (t) => {
    if (!t) return "—";
    try {
      const [h, m] = t.split(":");
      const hour = parseInt(h);
      return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
    } catch {
      return t;
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Serif+Display:ital,wght@0,400;1,400&family=DM+Mono:wght@400;500&display=swap");
        html,
        body {
          background: #040404 !important;
          margin: 0;
          padding: 0;
          color: white;
        }
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        .page-root {
          opacity: 0;
          animation: fadeIn 0.5s ease forwards;
        }
        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }

        .tear-line {
          border: none;
          border-top: 2px dashed rgba(255, 255, 255, 0.1);
          margin: 0;
          position: relative;
        }
        .tear-line::before,
        .tear-line::after {
          content: "";
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 24px;
          background: #050505;
          border-radius: 50%;
        }
        .tear-line::before {
          left: -12px;
        }
        .tear-line::after {
          right: -12px;
        }

        @keyframes scissor-spin {
          0% {
            transform: rotate(0deg) translateX(2px);
          }
          50% {
            transform: rotate(180deg) translateX(-2px);
          }
          100% {
            transform: rotate(360deg) translateX(2px);
          }
        }
        .scissor-spin {
          animation: scissor-spin 3s ease-in-out infinite;
        }

        @keyframes green-glow {
          0%,
          100% {
            box-shadow:
              0 0 24px rgba(34, 197, 94, 0.4),
              0 0 60px rgba(34, 197, 94, 0.15);
          }
          50% {
            box-shadow:
              0 0 48px rgba(34, 197, 94, 0.7),
              0 0 100px rgba(34, 197, 94, 0.25);
          }
        }
        .green-glow {
          animation: green-glow 2.5s ease-in-out infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes flicker {
          0%,
          100% {
            opacity: 0.5;
          }
          48% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.25;
          }
          52% {
            opacity: 0.5;
          }
        }
        .barcode {
          animation: flicker 4s ease-in-out infinite;
        }

        .noise {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          opacity: 0.04;
          background-image: url("https://grainy-gradients.vercel.app/noise.svg");
        }
      `}</style>

      <div
        className="page-root"
        style={{ position: "relative", minHeight: "100vh" }}
      >
        <div className="noise" />
        <Confetti />

        {/* Green ambient glow */}
        <div
          style={{
            position: "fixed",
            top: "30%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 600,
            height: 600,
            zIndex: 2,
            pointerEvents: "none",
            background:
              "radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)",
          }}
        />

        {/* Nav */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            padding: "20px 32px",
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
            HEADZ
            <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
          </div>
          <p
            style={{
              ...sf,
              fontSize: 8,
              color: "#52525b",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Slot Reserved
          </p>
        </nav>

        <div
          style={{
            position: "relative",
            zIndex: 10,
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "100px 24px 60px",
          }}
        >
          {data && (
            <div
              style={{
                width: "100%",
                maxWidth: 520,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 32,
              }}
            >
              {/* Green checkmark */}
              <div
                className="conf-check green-glow"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: -8,
                    borderRadius: "50%",
                    border: "1px solid rgba(34,197,94,0.4)",
                    animation: "spin 8s linear infinite",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: -16,
                    borderRadius: "50%",
                    border: "1px solid rgba(34,197,94,0.15)",
                    animation: "spin 14s linear infinite reverse",
                  }}
                />
                <svg
                  width="36"
                  height="36"
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

              {/* Title */}
              <div className="conf-title" style={{ textAlign: "center" }}>
                <p
                  style={{
                    ...sf,
                    fontSize: 9,
                    letterSpacing: "0.5em",
                    color: "#22c55e",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  Slot Reserved
                </p>
                <h1
                  style={{
                    ...sf,
                    fontSize: "clamp(1.8rem, 6vw, 3rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    lineHeight: 0.95,
                    margin: 0,
                    color: "white",
                  }}
                >
                  See You{" "}
                  <span style={{ color: "#22c55e", fontStyle: "italic" }}>
                    Soon_
                  </span>
                </h1>
              </div>

              {/* Sub */}
              <p
                className="conf-sub"
                style={{
                  textAlign: "center",
                  color: "#a1a1aa",
                  fontSize: 14,
                  lineHeight: 1.7,
                  margin: 0,
                  maxWidth: 380,
                }}
              >
                You&apos;re all set,{" "}
                <span style={{ color: "white", fontWeight: 700 }}>
                  {data.username}
                </span>
                . Your time slot is locked in.
              </p>

              {/* Email notice */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 20px",
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  maxWidth: 380,
                  width: "100%",
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>📧</span>
                <p
                  style={{
                    fontSize: 12,
                    color: "#a1a1aa",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  A confirmation has been sent to the email address on your
                  account.
                </p>
              </div>

              {/* Ticket */}
              <div className="conf-ticket" style={{ width: "100%" }}>
                {/* Top */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderBottom: "none",
                    padding: "28px 32px 24px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Green corner accent */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 60,
                      height: 60,
                      background:
                        "linear-gradient(225deg, rgba(34,197,94,0.12), transparent)",
                    }}
                  />

                  {/* Header */}
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
                          letterSpacing: "0.5em",
                          textTransform: "uppercase",
                          margin: "0 0 4px",
                        }}
                      >
                        Booking Confirmation
                      </p>
                      <div
                        style={{
                          ...sf,
                          fontWeight: 700,
                          fontSize: 20,
                          letterSpacing: "-0.04em",
                        }}
                      >
                        HEADZ
                        <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                          UP
                        </span>
                      </div>
                    </div>
                    <div className="scissor-spin">
                      <ScissorIcon size={28} color="#22c55e" />
                    </div>
                  </div>

                  {/* Rows */}
                  {[
                    { label: "Service", value: data.service, icon: "✂️" },
                    { label: "Barber", value: data.barber, icon: "👤" },
                    { label: "Date", value: formatDate(data.date), icon: "📅" },
                    { label: "Time", value: formatTime(data.time), icon: "🕐" },
                    { label: "Payment", value: "Pay In Shop", icon: "💵" },
                  ].map(({ label, value, icon }) => (
                    <div
                      key={label}
                      className="conf-row"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "13px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{icon}</span>
                        <span
                          style={{
                            ...sf,
                            fontSize: 8,
                            letterSpacing: "0.25em",
                            textTransform: "uppercase",
                            color: "#71717a",
                          }}
                        >
                          {label}
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 13,
                          color: label === "Payment" ? "#4ade80" : "white",
                          fontWeight: 500,
                          textAlign: "right",
                          maxWidth: 240,
                        }}
                      >
                        {value || "—"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Tear line */}
                <hr className="tear-line" />

                {/* Bottom — location */}
                <div
                  className="conf-footer"
                  style={{
                    background: "rgba(34,197,94,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderTop: "none",
                    padding: "20px 32px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
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
                          margin: "0 0 4px",
                        }}
                      >
                        Where To Go
                      </p>
                      <p
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 13,
                          color: "white",
                          margin: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        4 Hub Dr
                        <br />
                        Hattiesburg, MS 39402
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p
                        style={{
                          ...sf,
                          fontSize: 7,
                          color: "#52525b",
                          letterSpacing: "0.4em",
                          textTransform: "uppercase",
                          margin: "0 0 4px",
                        }}
                      >
                        Hours
                      </p>
                      <p
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 11,
                          color: "#a1a1aa",
                          margin: 0,
                          lineHeight: 1.7,
                        }}
                      >
                        Mon–Fri · 9AM–6PM
                        <br />
                        Sat · 9AM–4PM
                      </p>
                    </div>
                  </div>

                  {/* Barcode */}
                  <div
                    className="barcode"
                    style={{
                      marginTop: 20,
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 2,
                      height: 36,
                    }}
                  >
                    {Array.from({ length: 48 }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          width: i % 3 === 0 ? 3 : i % 5 === 0 ? 2 : 1,
                          height: `${40 + Math.sin(i * 0.7) * 30}%`,
                          background: "rgba(34,197,94,0.3)",
                          flexShrink: 0,
                        }}
                      />
                    ))}
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 9,
                        color: "#3f3f46",
                        marginLeft: 8,
                        letterSpacing: "0.1em",
                        flexShrink: 0,
                      }}
                    >
                      HU-{bookingRef}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reminder */}
              <div
                className="conf-actions"
                style={{
                  padding: "14px 20px",
                  background: "rgba(34,197,94,0.07)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    background: "#4ade80",
                    borderRadius: "50%",
                    flexShrink: 0,
                    boxShadow: "0 0 8px rgba(74,222,128,0.8)",
                  }}
                />
                <p
                  style={{
                    fontSize: 12,
                    color: "#a1a1aa",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: "white" }}>
                    Arrive 5 minutes early.
                  </span>{" "}
                  Slots held <span style={{ color: "white" }}>15 minutes</span>{" "}
                  past appointment time. Cash or card accepted.
                </p>
              </div>

              {/* Reschedule button */}
              <div className="conf-actions" style={{ width: "100%" }}>
                <button
                  onClick={() => {
                    setShowReschedule(true);
                    setRescheduleError("");
                  }}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "transparent",
                    border: "1px dashed rgba(255,255,255,0.15)",
                    color: "#71717a",
                    ...sf,
                    fontSize: 9,
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#f59e0b";
                    e.currentTarget.style.color = "#f59e0b";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.15)";
                    e.currentTarget.style.color = "#71717a";
                  }}
                >
                  Need to Reschedule? ↻
                </button>
              </div>

              {/* Buttons */}
              <div
                className="conf-actions"
                style={{ display: "flex", gap: 12, width: "100%" }}
              >
                <button
                  onClick={() => router.push("/dashboard")}
                  style={{
                    flex: 2,
                    padding: "18px",
                    background: "#22c55e",
                    color: "black",
                    ...sf,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.3s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#4ade80")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#22c55e")
                  }
                >
                  View My Dashboard →
                </button>
                <button
                  onClick={() => router.push("/")}
                  style={{
                    flex: 1,
                    padding: "18px",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#a1a1aa",
                    ...sf,
                    fontSize: 9,
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.15)";
                    e.currentTarget.style.color = "#a1a1aa";
                  }}
                >
                  Home
                </button>
              </div>

              {/* ── Reschedule Modal ── */}
              {showReschedule && (
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 200,
                    background: "rgba(0,0,0,0.85)",
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
                      maxWidth: 460,
                      background: "#0a0a0a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      padding: "36px 32px",
                    }}
                  >
                    {rescheduleDone ? (
                      <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg,#22c55e,#16a34a)",
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
                            fontSize: 10,
                            color: "#4ade80",
                            textTransform: "uppercase",
                            letterSpacing: "0.3em",
                            margin: "0 0 8px",
                          }}
                        >
                          Rescheduled!
                        </p>
                        <p
                          style={{ fontSize: 13, color: "#a1a1aa", margin: 0 }}
                        >
                          Your appointment has been updated.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Header */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 28,
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
                                margin: "0 0 6px",
                              }}
                            >
                              Change Your Appointment
                            </p>
                            <h2
                              style={{
                                ...sf,
                                fontSize: 20,
                                fontWeight: 900,
                                textTransform: "uppercase",
                                color: "white",
                                margin: 0,
                              }}
                            >
                              Reschedule
                              <span
                                style={{
                                  color: "#f59e0b",
                                  fontStyle: "italic",
                                }}
                              >
                                _
                              </span>
                            </h2>
                          </div>
                          <button
                            onClick={() => setShowReschedule(false)}
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
                            ✕ Cancel
                          </button>
                        </div>

                        {/* Current booking info */}
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
                              margin: "0 0 6px",
                            }}
                          >
                            Current Booking
                          </p>
                          <p
                            style={{
                              fontSize: 12,
                              color: "#a1a1aa",
                              margin: 0,
                            }}
                          >
                            {data.service} with{" "}
                            <span style={{ color: "white" }}>
                              {data.barber}
                            </span>
                            {data.date && (
                              <>
                                {" "}
                                ·{" "}
                                <span style={{ color: "#f59e0b" }}>
                                  {formatDate(data.date)}
                                </span>
                              </>
                            )}
                            {data.time && (
                              <>
                                {" "}
                                at{" "}
                                <span style={{ color: "#f59e0b" }}>
                                  {formatTime(data.time)}
                                </span>
                              </>
                            )}
                          </p>
                        </div>

                        {/* New date */}
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
                          <input
                            type="date"
                            value={newDate}
                            min={new Date().toISOString().split("T")[0]}
                            onChange={(e) => setNewDate(e.target.value)}
                            style={{
                              width: "100%",
                              background: "#040404",
                              border: "1px solid rgba(255,255,255,0.1)",
                              padding: "14px 16px",
                              color: "white",
                              fontSize: 14,
                              outline: "none",
                              transition: "border-color 0.2s",
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
                                  letterSpacing: "0.05em",
                                  textTransform: "uppercase",
                                  border: `1px solid ${newTime === slot ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                                  background:
                                    newTime === slot
                                      ? "rgba(245,158,11,0.12)"
                                      : "transparent",
                                  color:
                                    newTime === slot ? "#f59e0b" : "#a1a1aa",
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
                            onClick={() => setShowReschedule(false)}
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}
