"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import API from "@/lib/api";
import useBreakpoint from "@/lib/useBreakpoint";

const sf = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

// ── Confetti ──────────────────────────────────────────────────────────────────
function Confetti({ colors }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 200,
      w: 3 + Math.random() * 7,
      h: 6 + Math.random() * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: 1.2 + Math.random() * 3,
      drift: (Math.random() - 0.5) * 1.5,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.1,
      alpha: 0.5 + Math.random() * 0.5,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y += p.speed;
        p.x += p.drift;
        p.rot += p.rotV;
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      style={{ position: "fixed", inset: 0, zIndex: 5, pointerEvents: "none" }}
    />
  );
}

// ── Check SVG ─────────────────────────────────────────────────────────────────
const CheckCircle = ({ color, size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <circle
      cx="28"
      cy="28"
      r="27"
      stroke={color}
      strokeWidth="1.5"
      opacity="0.3"
    />
    <circle cx="28" cy="28" r="20" fill={color} opacity="0.15" />
    <circle cx="28" cy="28" r="20" stroke={color} strokeWidth="1" />
    <polyline
      points="18,28 25,35 38,21"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// ── Main inner ────────────────────────────────────────────────────────────────
function BookingConfirmedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMobile } = useBreakpoint();

  const [data, setData] = useState({
    username: "",
    service: "",
    barber: "",
    date: "",
    time: "",
    payment: "shop",
  });
  const [bookingRef, setBookingRef] = useState("");
  const [entered, setEntered] = useState(false);

  // URL params + API fallback
  useEffect(() => {
    setBookingRef(Date.now().toString(36).toUpperCase().slice(-8));
    const svc = searchParams.get("service");
    const brb = searchParams.get("barber");
    const dt = searchParams.get("date");
    const tm = searchParams.get("time");
    const pay = searchParams.get("payment") || "shop";

    if (svc)
      setData((p) => ({
        ...p,
        service: svc,
        barber: brb || "",
        date: dt || "",
        time: tm || "",
        payment: pay,
      }));

    const load = async () => {
      try {
        const [u, a] = await Promise.all([
          API.get("dashboard/"),
          API.get("appointments/"),
        ]);
        const appts = Array.isArray(a.data) ? a.data : a.data.results || [];
        const latest = appts[appts.length - 1];
        setData((p) => ({
          username: u.data.user || p.username,
          service: svc || latest?.service_name || p.service,
          barber: brb || latest?.barber_name || p.barber,
          date: dt || latest?.date || p.date,
          time: tm || latest?.time || p.time,
          payment: latest?.payment_method === "online" ? "online" : pay,
        }));
      } catch {}
    };
    load();
    setTimeout(() => setEntered(true), 80);

    // Block back
    window.history.pushState(null, "", window.location.href);
    const onPop = () =>
      window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const isPaid = data.payment === "online";
  const accent = isPaid ? "#f59e0b" : "#22c55e";
  const accentDim = isPaid ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.1)";
  const accentBdr = isPaid ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.25)";
  const confettiColors = isPaid
    ? ["#f59e0b", "#fbbf24", "#ffffff", "#d97706", "#fef3c7"]
    : ["#22c55e", "#4ade80", "#ffffff", "#86efac", "#dcfce7"];

  const fmtDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };
  const fmtTime = (t) => {
    if (!t) return "—";
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  };

  const rows = [
    { label: "Service", value: data.service || "—" },
    { label: "Barber", value: data.barber || "—" },
    { label: "Date", value: fmtDate(data.date) },
    { label: "Time", value: fmtTime(data.time) },
    {
      label: "Payment",
      value: isPaid ? "Paid Online · Stripe" : "Pay In Shop · Cash or Card",
    },
    { label: "Location", value: "4 Hub Dr, Hattiesburg, MS 39402" },
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
          background: #040404;
          color: white;
          font-family: "DM Mono", monospace;
          overflow-x: hidden;
          min-height: 100vh;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.7);
          }
          to {
            opacity: 1;
            transform: scale(1);
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
        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
        .row-enter {
          animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .row-enter:nth-child(1) {
          animation-delay: 0.05s;
        }
        .row-enter:nth-child(2) {
          animation-delay: 0.1s;
        }
        .row-enter:nth-child(3) {
          animation-delay: 0.15s;
        }
        .row-enter:nth-child(4) {
          animation-delay: 0.2s;
        }
        .row-enter:nth-child(5) {
          animation-delay: 0.25s;
        }
        .row-enter:nth-child(6) {
          animation-delay: 0.3s;
        }
        .tear {
          border: none;
          border-top: 2px dashed rgba(255, 255, 255, 0.08);
          position: relative;
        }
        .tear::before,
        .tear::after {
          content: "";
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          background: #040404;
          border-radius: 50%;
        }
        .tear::before {
          left: -10px;
        }
        .tear::after {
          right: -10px;
        }
      `}</style>

      {/* Confetti */}
      <Confetti colors={confettiColors} />

      {/* Grid */}
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
      {/* Grain */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.035,
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.svg')",
        }}
      />
      {/* Glow */}
      <div
        style={{
          position: "fixed",
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 400,
          background: `radial-gradient(ellipse,${accentDim} 0%,transparent 65%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Scanline */}
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
            background: `linear-gradient(to right,transparent,${accentBdr},transparent)`,
            animation: "scandown 8s linear infinite",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "24px 16px 48px" : "40px 24px 60px",
        }}
      >
        {/* ── TOP LOGO ── */}
        <div
          style={{
            marginBottom: 40,
            opacity: entered ? 1 : 0,
            transform: entered ? "none" : "translateY(-12px)",
            transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <a
            href="/"
            style={{
              ...sf,
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: "-0.06em",
              textDecoration: "none",
              color: "white",
            }}
          >
            HEADZ
            <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
          </a>
        </div>

        {/* ── CHECK ICON ── */}
        <div
          style={{
            marginBottom: 28,
            opacity: entered ? 1 : 0,
            transform: entered ? "scale(1)" : "scale(0.6)",
            transition: "all 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s",
          }}
        >
          <CheckCircle color={accent} size={isMobile ? 52 : 64} />
        </div>

        {/* ── HEADLINE ── */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 12,
            opacity: entered ? 1 : 0,
            transform: entered ? "none" : "translateY(20px)",
            transition: "all 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s",
          }}
        >
          <p
            style={{
              ...mono,
              fontSize: 9,
              color: accent,
              letterSpacing: "0.6em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            {isPaid ? "Payment Received" : "Booking Confirmed"}
          </p>
          <h1
            style={{
              ...sf,
              fontSize: "clamp(1.8rem,6vw,3.2rem)",
              fontWeight: 900,
              textTransform: "uppercase",
              lineHeight: 0.88,
              letterSpacing: "-0.04em",
            }}
          >
            {isPaid ? "You're" : "Slot"}
            <br />
            <span style={{ color: accent, fontStyle: "italic" }}>
              {isPaid ? "All Set_" : "Reserved_"}
            </span>
          </h1>
        </div>

        {/* ── SUB ── */}
        <p
          style={{
            ...mono,
            fontSize: 13,
            color: "#71717a",
            textAlign: "center",
            lineHeight: 1.8,
            maxWidth: 360,
            marginBottom: 40,
            opacity: entered ? 1 : 0,
            transition: "all 0.6s cubic-bezier(0.16,1,0.3,1) 0.3s",
          }}
        >
          {data.username ? `Hey ${data.username}, ` : ""}
          {isPaid
            ? "Your payment went through and your seat is confirmed. We'll see you soon."
            : "Your seat is locked in. Show up fresh, we'll handle the rest."}
        </p>

        {/* ── TICKET ── */}
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            opacity: entered ? 1 : 0,
            transform: entered ? "none" : "translateY(32px)",
            transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.35s",
          }}
        >
          {/* Ticket top */}
          <div
            style={{
              background: "#0a0a0a",
              border: `1px solid ${accentBdr}`,
              borderBottom: "none",
              padding: isMobile ? "24px 20px" : "28px 28px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top amber shimmer bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(to right,transparent,${accent},transparent)`,
                opacity: 0.6,
              }}
            />

            {/* Corner triangle */}
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 0,
                height: 0,
                borderStyle: "solid",
                borderWidth: `0 ${isMobile ? 56 : 72}px ${isMobile ? 56 : 72}px 0`,
                borderColor: `transparent ${isPaid ? "rgba(245,158,11,0.18)" : "rgba(34,197,94,0.15)"} transparent transparent`,
              }}
            />

            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 20,
              }}
            >
              <div>
                <p
                  style={{
                    ...mono,
                    fontSize: 8,
                    color: "#3f3f46",
                    letterSpacing: "0.4em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Booking Ticket
                </p>
                <p
                  style={{
                    ...sf,
                    fontWeight: 700,
                    fontSize: 18,
                    letterSpacing: "-0.06em",
                  }}
                >
                  HEADZ
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    UP
                  </span>
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    ...mono,
                    fontSize: 8,
                    color: "#3f3f46",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Ref No.
                </p>
                <p
                  style={{
                    ...mono,
                    fontSize: 13,
                    color: accent,
                    letterSpacing: "0.15em",
                    fontWeight: 500,
                  }}
                >
                  #{bookingRef}
                </p>
              </div>
            </div>

            {/* Status badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                background: accentDim,
                border: `1px solid ${accentBdr}`,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: accent,
                }}
              />
              <span
                style={{
                  ...sf,
                  fontSize: 6,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: accent,
                }}
              >
                {isPaid ? "Paid & Confirmed" : "Confirmed · Pay On Arrival"}
              </span>
            </div>

            {/* Rows */}
            <div>
              {rows.map(({ label, value }, i) => (
                <div
                  key={label}
                  className="row-enter"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    padding: "13px 0",
                    borderBottom:
                      i < rows.length - 1
                        ? "1px solid rgba(255,255,255,0.05)"
                        : "none",
                    gap: 12,
                  }}
                >
                  <p
                    style={{
                      ...mono,
                      fontSize: 9,
                      color: "#52525b",
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      flexShrink: 0,
                    }}
                  >
                    {label}
                  </p>
                  <p
                    style={{
                      ...mono,
                      fontSize: isMobile ? 12 : 13,
                      color:
                        label === "Payment"
                          ? accent
                          : label === "Location"
                            ? "#71717a"
                            : "white",
                      fontWeight: 500,
                      textAlign: "right",
                      lineHeight: 1.4,
                    }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tear line */}
          <hr className="tear" />

          {/* Ticket bottom */}
          <div
            style={{
              background: "rgba(255,255,255,0.015)",
              border: `1px solid ${accentBdr}`,
              borderTop: "none",
              padding: isMobile ? "18px 20px" : "20px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Email notice */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>📧</span>
              <p
                style={{
                  ...mono,
                  fontSize: 11,
                  color: "#71717a",
                  lineHeight: 1.6,
                }}
              >
                A confirmation has been sent to the email on your account.
              </p>
            </div>

            {/* Arrive early */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⏰</span>
              <p
                style={{
                  ...mono,
                  fontSize: 11,
                  color: "#71717a",
                  lineHeight: 1.6,
                }}
              >
                Please arrive{" "}
                <span style={{ color: "white" }}>5 minutes early.</span> Slots
                held for <span style={{ color: "white" }}>15 minutes.</span>
              </p>
            </div>

            {/* Location */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
              <p style={{ ...mono, fontSize: 11, color: "#71717a" }}>
                4 Hub Dr, Hattiesburg, MS 39402
              </p>
            </div>

            {/* Pay in shop reminder */}
            {!isPaid && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(245,158,11,0.06)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  marginTop: 4,
                }}
              >
                <p
                  style={{
                    ...sf,
                    fontSize: 6,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: "#f59e0b",
                    marginBottom: 6,
                  }}
                >
                  Payment Due At Shop
                </p>
                <p
                  style={{
                    ...mono,
                    fontSize: 11,
                    color: "#71717a",
                    lineHeight: 1.6,
                  }}
                >
                  We accept{" "}
                  <span style={{ color: "white" }}>cash or card.</span> Payment
                  is collected when you arrive for your appointment.
                </p>
              </div>
            )}

            {/* Paid confirmation */}
            {isPaid && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  marginTop: 4,
                }}
              >
                <p
                  style={{
                    ...sf,
                    fontSize: 6,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: "#4ade80",
                    marginBottom: 6,
                  }}
                >
                  Payment Complete
                </p>
                <p
                  style={{
                    ...mono,
                    fontSize: 11,
                    color: "#71717a",
                    lineHeight: 1.6,
                  }}
                >
                  Your payment was processed securely via{" "}
                  <span style={{ color: "white" }}>Stripe.</span> No further
                  payment required.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── ACTIONS ── */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 28,
            flexWrap: "wrap",
            justifyContent: "center",
            opacity: entered ? 1 : 0,
            transition: "all 0.6s cubic-bezier(0.16,1,0.3,1) 0.6s",
          }}
        >
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "15px 28px",
              background: accent,
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
            onMouseEnter={(e) => (e.currentTarget.style.background = "white")}
            onMouseLeave={(e) => (e.currentTarget.style.background = accent)}
          >
            View Dashboard →
          </button>
          <button
            onClick={() => router.push("/book")}
            style={{
              padding: "15px 24px",
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
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          >
            Book Again
          </button>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "15px 24px",
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
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          >
            Home
          </button>
        </div>

        {/* Footer */}
        <p
          style={{
            ...mono,
            fontSize: 9,
            color: "#1a1a1a",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            marginTop: 40,
            animation: "pulse 3s ease infinite",
          }}
        >
          HEADZ UP · Hattiesburg, MS · {new Date().getFullYear()}
        </p>
      </div>
    </>
  );
}

export default function BookingConfirmedPage() {
  return (
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
      <BookingConfirmedInner />
    </Suspense>
  );
}
