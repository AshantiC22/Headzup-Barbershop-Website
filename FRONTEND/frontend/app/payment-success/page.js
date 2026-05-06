"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { gsap } from "gsap";
import API from "@/lib/api";
import useBreakpoint from "@/lib/useBreakpoint";

// ── Confetti particle ────────────────────────────────────────────────────────
function Confetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#f59e0b", "#ffffff", "#fbbf24", "#d97706", "#fef3c7"];
    const particles = Array.from({ length: 120 }, () => ({
      x:    Math.random() * canvas.width,
      y:    -20 - Math.random() * 200,
      w:    4 + Math.random() * 8,
      h:    8 + Math.random() * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: 2 + Math.random() * 4,
      drift: (Math.random() - 0.5) * 2,
      rot:   Math.random() * Math.PI * 2,
      rotV:  (Math.random() - 0.5) * 0.15,
      opacity: 0.7 + Math.random() * 0.3,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.y   += p.speed;
        p.x   += p.drift;
        p.rot += p.rotV;
        // When a piece falls off the bottom, recycle it from the top
        if (p.y > canvas.height + 20) {
          p.y     = -20 - Math.random() * 40;
          p.x     = Math.random() * canvas.width;
          p.speed = 2 + Math.random() * 4;
          p.drift = (Math.random() - 0.5) * 2;
        }
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      raf = requestAnimationFrame(draw);
    };
    // Run forever — no timeout
    draw();
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", inset: 0, zIndex: 5,
      pointerEvents: "none",
    }} />
  );
}

// ── Scissor SVG ──────────────────────────────────────────────────────────────
function ScissorIcon({ size = 32, color = "#f59e0b" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3"/>
      <circle cx="6" cy="18" r="3"/>
      <line x1="20" y1="4" x2="8.12" y2="15.88"/>
      <line x1="14.47" y1="14.48" x2="20" y2="20"/>
      <line x1="8.12" y1="8.12" x2="12" y2="12"/>
    </svg>
  );
}

export default function PaymentSuccessPage() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const sessionId     = searchParams.get("session_id");

  const [data, setData] = useState({
    username: "...",
    service:  "Loading...",
    barber:   "Loading...",
    date:     "",
    time:     "",
    price:    null,
  });
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [showConfetti, setShowConfetti] = useState(true);

  const sf = { fontFamily: "'Syncopate', sans-serif" };
  const { isMobile } = useBreakpoint();
  const [bookingRef, setBookingRef] = useState("--------");
  useEffect(() => {
    setBookingRef(Date.now().toString(36).toUpperCase().slice(-8));
  }, []);

  const [showReschedule,  setShowReschedule]  = useState(false);
  const [newDate,         setNewDate]         = useState("");
  const [newTime,         setNewTime]         = useState("");
  const [rescheduling,    setRescheduling]    = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [rescheduleDone,  setRescheduleDone]  = useState(false);

  const TIME_SLOTS = [
    "9:00 AM","9:30 AM","10:00 AM","10:30 AM",
    "11:00 AM","11:30 AM","12:00 PM","12:30 PM",
    "1:00 PM","1:30 PM","2:00 PM","2:30 PM",
    "3:00 PM","3:30 PM","4:00 PM","4:30 PM",
  ];

  function to24Hour(t) {
    const [time, mod] = t.split(" ");
    let [h, m] = time.split(":");
    if (h === "12") h = "00";
    if (mod === "PM") h = String(parseInt(h) + 12);
    return `${h.padStart(2,"0")}:${m}:00`;
  }

  // ── Block browser back navigation ────────────────────────────────────────
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // ── Fetch session details from backend ────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        // Get logged-in user info
        const userRes = await API.get("dashboard/");
        const username = userRes.data.user;
        const email    = userRes.data.email;

        // Get the appointment that was just created (most recent)
        const apptRes = await API.get("appointments/");
        const appointments = apptRes.data;
        const latest = appointments[appointments.length - 1];

        if (!latest) throw new Error("No appointment found");

        setData({
          username,
          email,
          service:  latest.service_name  || "Service",
          barber:   latest.barber_name   || "Your Barber",
          date:     latest.date,
          time:     latest.time,
          price:    latest.service_price || null,
        });
      } catch (e) {
        // Fallback — parse what we can from URL params
        const params = Object.fromEntries(searchParams.entries());
        if (params.service) {
          setData({
            username: "Client",
            service:  decodeURIComponent(params.service || "Your Service"),
            barber:   decodeURIComponent(params.barber  || "Your Barber"),
            date:     params.date  || "",
            time:     params.time  || "",
            price:    null,
          });
          } else {
          setError("Could not load appointment details.");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Entrance animations — fire immediately on mount ─────────────────────
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".success-check",  { scale: 0, opacity: 0, duration: 0.7, ease: "back.out(2)" })
        .from(".success-title",  { y: 40, opacity: 0, duration: 0.9 }, "-=0.3")
        .from(".success-sub",    { y: 20, opacity: 0, duration: 0.7 }, "-=0.6")
        .from(".ticket-body",    { y: 60, opacity: 0, duration: 1.0 }, "-=0.5")
        .from(".ticket-row",     { x: -20, opacity: 0, duration: 0.5, stagger: 0.08 }, "-=0.6")
        .from(".ticket-footer",  { y: 20, opacity: 0, duration: 0.6 }, "-=0.3")
        .from(".success-actions",{ y: 20, opacity: 0, duration: 0.6 }, "-=0.4");
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // ── Reschedule handler ───────────────────────────────────────────────────
  const handleReschedule = async () => {
    if (!newDate || !newTime) { setRescheduleError("Please pick both a date and time."); return; }
    setRescheduling(true); setRescheduleError("");
    try {
      const apptRes = await API.get("appointments/");
      const latest = apptRes.data[apptRes.data.length - 1];
      if (!latest) throw new Error("No appointment found");
      await API.patch(`appointments/${latest.id}/`, {
        date: newDate,
        time: to24Hour(newTime),
      });
      setData(prev => ({ ...prev, date: newDate, time: newTime }));
      setRescheduleDone(true);
      setTimeout(() => { setShowReschedule(false); setRescheduleDone(false); setNewDate(""); setNewTime(""); }, 2000);
    } catch (e) {
      setRescheduleError(e.response?.data?.detail || e.response?.data?.non_field_errors?.[0] || "That slot may already be taken. Try another time.");
    } finally { setRescheduling(false); }
  };

  // ── Format date nicely ────────────────────────────────────────────────────
  const formatDate = (d) => {
    if (!d) return "";
    try {
      const date = new Date(d + "T00:00:00");
      return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } catch { return d; }
  };

  // ── Format time nicely ────────────────────────────────────────────────────
  const formatTime = (t) => {
    if (!t) return "";
    try {
      const [h, m] = t.split(":");
      const hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12  = hour % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    } catch { return t; }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Serif+Display:ital,wght@0,400;1,400&family=DM+Mono:wght@400;500&display=swap');
        html, body { background: #040404 !important; margin: 0; padding: 0; color: white; }
        *, *::before, *::after { box-sizing: border-box; }

        .page-root {
          opacity: 0;
          animation: fadeIn 0.5s ease forwards;
        }
        @keyframes fadeIn { to { opacity: 1; } }

        /* Dashed ticket tear line */
        .tear-line {
          border: none;
          border-top: 2px dashed rgba(255,255,255,0.1);
          margin: 0;
          position: relative;
        }
        .tear-line::before,
        .tear-line::after {
          content: '';
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 24px; height: 24px;
          background: #040404;
          border-radius: 50%;
        }
        .tear-line::before { left: -12px; }
        .tear-line::after  { right: -12px; }

        /* Spinning scissor decoration */
        @keyframes scissor-spin {
          0%   { transform: rotate(0deg) translateX(2px); }
          50%  { transform: rotate(180deg) translateX(-2px); }
          100% { transform: rotate(360deg) translateX(2px); }
        }
        .scissor-spin { animation: scissor-spin 3s ease-in-out infinite; }

        /* Glow pulse on checkmark */
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(245,158,11,0.3), 0 0 60px rgba(245,158,11,0.1); }
          50%       { box-shadow: 0 0 40px rgba(245,158,11,0.6), 0 0 100px rgba(245,158,11,0.2); }
        }
        .glow-pulse { animation: glow-pulse 2.5s ease-in-out infinite; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Barcode flicker */
        @keyframes flicker {
          0%, 100% { opacity: 0.6; } 48% { opacity: 0.6; } 50% { opacity: 0.3; } 52% { opacity: 0.6; }
        }
        .barcode { animation: flicker 4s ease-in-out infinite; }

        /* Noise overlay */
        .noise { position: fixed; inset: 0; pointer-events: none; z-index: 1; opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E"); }
      `}</style>

      <div className="page-root noise-bg" style={{ position: "relative", minHeight: "100vh" }}>

        {/* Noise grain */}
        <div className="noise" />

        {/* Confetti burst */}
        {showConfetti && <Confetti />}

        {/* Ambient glow */}
        <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
          width: 600, height: 600, zIndex: 2, pointerEvents: "none",
          background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)" }} />

        {/* ── Nav ── */}
        <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "rgba(5,5,5,0.8)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ ...sf, fontWeight: 700, fontSize: 18, letterSpacing: "-0.05em" }}>
            HEADZ<span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
          </div>
          <p style={{ ...sf, fontSize: 8, color: "#52525b", letterSpacing: "0.3em", textTransform: "uppercase", margin: 0 }}>
            Booking Confirmed
          </p>
        </nav>

        {/* ── Main content ── */}
        <div style={{ position: "relative", zIndex: 10, minHeight: "100vh",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "100px 24px 60px" }}>

          {/* ── Success content ── */}
          {data && (
            <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>

              {/* Checkmark */}
              <div className="success-check glow-pulse" style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}>
                {/* Orbit ring */}
                <div style={{ position: "absolute", inset: -8, borderRadius: "50%",
                  border: "1px solid rgba(245,158,11,0.3)",
                  animation: "spin 8s linear infinite" }} />
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>

              {/* Title */}
              <div className="success-title" style={{ textAlign: "center" }}>
                <p style={{ ...sf, fontSize: 9, letterSpacing: "0.5em", color: "#f59e0b",
                  textTransform: "uppercase", marginBottom: 10 }}>
                  Payment Successful
                </p>
                <h1 style={{ ...sf, fontSize: "clamp(1.8rem, 6vw, 3rem)", fontWeight: 900,
                  textTransform: "uppercase", lineHeight: 0.95, margin: 0, color: "white" }}>
                  You&apos;re All{" "}
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>Locked In_</span>
                </h1>
              </div>

              {/* Sub */}
              <p className="success-sub" style={{ textAlign: "center", color: "#a1a1aa",
                fontSize: 14, lineHeight: 1.7, margin: 0, maxWidth: 380 }}>
                See you soon,{" "}
                <span style={{ color: "white", fontWeight: 700 }}>{data.username}</span>.
                {" "}Your seat is reserved — we&apos;ll have you looking fresh.
              </p>

              {/* ── Ticket ── */}
              <div className="ticket-body" style={{ width: "100%", position: "relative" }}>

                {/* Ticket top */}
                <div style={{ background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderBottom: "none",
                  padding: "28px 32px 24px",
                  position: "relative", overflow: "hidden" }}>

                  {/* Corner accent */}
                  <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60,
                    background: "linear-gradient(225deg, rgba(245,158,11,0.15), transparent)" }} />

                  {/* Shop header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                    <div>
                      <p style={{ ...sf, fontSize: 7, color: "#52525b", letterSpacing: "0.5em",
                        textTransform: "uppercase", margin: "0 0 4px" }}>Appointment Receipt</p>
                      <div style={{ ...sf, fontWeight: 700, fontSize: 20, letterSpacing: "-0.04em" }}>
                        HEADZ<span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
                      </div>
                    </div>
                    <div className="scissor-spin">
                      <ScissorIcon size={28} color="#f59e0b" />
                    </div>
                  </div>

                  {/* Ticket rows */}
                  {[
                    { label: "Service",  value: data.service,          icon: "✂️" },
                    { label: "Barber",   value: data.barber,            icon: "👤" },
                    { label: "Date",     value: formatDate(data.date),  icon: "📅" },
                    { label: "Time",     value: formatTime(data.time),  icon: "🕐" },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="ticket-row" style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "13px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14 }}>{icon}</span>
                        <span style={{ ...sf, fontSize: 8, letterSpacing: "0.25em",
                          textTransform: "uppercase", color: "#71717a" }}>{label}</span>
                      </div>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13,
                        color: "white", fontWeight: 500, textAlign: "right", maxWidth: 240 }}>
                        {value || "—"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Tear line */}
                <hr className="tear-line" style={{ borderColor: "rgba(255,255,255,0.1)" }} />

                {/* Ticket bottom — location */}
                <div className="ticket-footer" style={{
                  background: "rgba(245,158,11,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderTop: "none",
                  padding: "20px 32px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <p style={{ ...sf, fontSize: 7, color: "#52525b", letterSpacing: "0.4em",
                        textTransform: "uppercase", margin: "0 0 4px" }}>Where To Go</p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "white",
                        margin: 0, lineHeight: 1.5 }}>
                        4 Hub Dr<br />
                        Hattiesburg, MS 39402
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ ...sf, fontSize: 7, color: "#52525b", letterSpacing: "0.4em",
                        textTransform: "uppercase", margin: "0 0 4px" }}>Hours</p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#a1a1aa",
                        margin: 0, lineHeight: 1.7 }}>
                        Mon–Fri · 9AM–6PM<br />
                        Sat · 9AM–4PM
                      </p>
                    </div>
                  </div>

                  {/* Fake barcode */}
                  <div className="barcode" style={{ marginTop: 20, display: "flex", alignItems: "flex-end", gap: 2, height: 36 }}>
                    {Array.from({ length: 48 }, (_, i) => (
                      <div key={i} style={{
                        width: i % 3 === 0 ? 3 : i % 5 === 0 ? 2 : 1,
                        height: `${40 + Math.sin(i * 0.7) * 30}%`,
                        background: "rgba(255,255,255,0.25)",
                        flexShrink: 0,
                      }} />
                    ))}
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#3f3f46",
                      marginLeft: 8, letterSpacing: "0.1em", flexShrink: 0 }}>
                      HU-{bookingRef}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reminder pill */}
              <div className="success-actions" style={{
                padding: "14px 20px",
                background: "rgba(34,197,94,0.07)",
                border: "1px solid rgba(34,197,94,0.2)",
                display: "flex", alignItems: "center", gap: 12, width: "100%",
              }}>
                <div style={{ width: 8, height: 8, background: "#4ade80", borderRadius: "50%", flexShrink: 0,
                  boxShadow: "0 0 8px rgba(74,222,128,0.7)", animation: "glow-pulse 2s infinite" }} />
                <p style={{ fontSize: 12, color: "#a1a1aa", margin: 0, lineHeight: 1.5 }}>
                  <span style={{ color: "white" }}>Arrive 5 minutes early.</span>{" "}
                  Your slot is held for 15 minutes past your appointment time.
                </p>
              </div>

              {/* Action buttons */}
              <div className="success-actions" style={{ display: "flex", gap: 12, width: "100%" }}>
                <button
                  onClick={() => router.push("/dashboard")}
                  style={{ flex: 2, padding: "18px", background: "#f59e0b", color: "black",
                    ...sf, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
                    textTransform: "uppercase", border: "none", cursor: "pointer", transition: "background 0.3s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "white"}
                  onMouseLeave={e => e.currentTarget.style.background = "#f59e0b"}
                >
                  View My Dashboard →
                </button>
                <button
                  onClick={() => router.push("/")}
                  style={{ flex: 1, padding: "18px", background: "transparent",
                    border: "1px solid rgba(255,255,255,0.15)", color: "#a1a1aa",
                    ...sf, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em",
                    cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"; e.currentTarget.style.color = "white"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#a1a1aa"; }}
                >
                  Home
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
