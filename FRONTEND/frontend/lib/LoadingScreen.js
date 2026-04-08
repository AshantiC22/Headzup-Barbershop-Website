"use client";
import { useEffect, useState, useRef } from "react";

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("in");
  const [visible, setVisible] = useState(true);
  const [tick, setTick] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const particlesRef = useRef([]);

  // Progress engine — natural bursts + stalls
  useEffect(() => {
    let p = 0;
    const steps = [
      { speed: 18, max: 30 },
      { speed: 4, max: 52 },
      { speed: 20, max: 78 },
      { speed: 3, max: 91 },
      { speed: 28, max: 100 },
    ];
    let si = 0;
    const id = setInterval(() => {
      p = Math.min(p + Math.random() * steps[si].speed + 1.5, steps[si].max);
      setProgress(Math.round(p));
      if (p >= steps[si].max && si < steps.length - 1) si++;
      if (p >= 100) {
        clearInterval(id);
        setTimeout(() => setPhase("out"), 350);
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 1050);
      }
    }, 45);
    return () => clearInterval(id);
  }, [onComplete]);

  // Animation tick
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60);
    return () => clearInterval(id);
  }, []);

  // Glitch bursts
  useEffect(() => {
    const fire = () => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 80 + Math.random() * 60);
      setTimeout(fire, 2200 + Math.random() * 2000);
    };
    const t = setTimeout(fire, 1200);
    return () => clearTimeout(t);
  }, []);

  // Canvas: falling hair strands
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    particlesRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vy: Math.random() * 1.1 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      len: Math.random() * 18 + 4,
      curve: (Math.random() - 0.5) * 0.04,
      alpha: Math.random() * 0.3 + 0.04,
      color: Math.random() > 0.5 ? "#f59e0b" : "#a1a1aa",
      width: Math.random() * 0.7 + 0.2,
    }));

    const draw = () => {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx;
        p.vx += p.curve;
        if (p.y > canvas.height + 30) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.width;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.quadraticCurveTo(
          p.x + p.curve * p.len * 20,
          p.y + p.len * 0.5,
          p.x + p.curve * p.len * 30,
          p.y + p.len,
        );
        ctx.stroke();
        ctx.restore();
      });
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  if (!visible) return null;

  const pct = progress;
  const scissors = tick % 14 < 7;
  const TEETH = 24;
  const filled = Math.floor((pct / 100) * TEETH);
  const statusMsg =
    pct < 20
      ? "POWERING UP_"
      : pct < 40
        ? "LOADING BARBERS_"
        : pct < 60
          ? "SYNCING SCHEDULE_"
          : pct < 80
            ? "SHARPENING BLADES_"
            : pct < 96
              ? "ALMOST READY_"
              : "LET'S GO_";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#000",
        overflow: "hidden",
        fontFamily: "'Syncopate',sans-serif",
        opacity: phase === "out" ? 0 : 1,
        transform: phase === "out" ? "scale(1.05) skewX(-2deg)" : "scale(1)",
        transition:
          phase === "out"
            ? "opacity 0.7s cubic-bezier(0.4,0,1,1),transform 0.7s cubic-bezier(0.4,0,1,1)"
            : "none",
        pointerEvents: phase === "out" ? "none" : "all",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes ls-flicker{0%,88%,90%,92%,100%{opacity:1}89%,91%{opacity:0.05}}
        @keyframes ls-rgb{
          0%{text-shadow:4px 0 rgba(239,68,68,0.5),-4px 0 rgba(99,91,255,0.4)}
          33%{text-shadow:-4px 0 rgba(239,68,68,0.5),4px 0 rgba(99,91,255,0.4)}
          66%{text-shadow:0 3px rgba(239,68,68,0.5),0 -3px rgba(99,91,255,0.4)}
          100%{text-shadow:4px 0 rgba(239,68,68,0.5),-4px 0 rgba(99,91,255,0.4)}
        }
        @keyframes ls-ga{
          0%,100%{clip-path:inset(0 0 92% 0);transform:translate(-5px,0) skewX(-4deg)}
          25%{clip-path:inset(33% 0 45% 0);transform:translate(5px,0) skewX(3deg)}
          50%{clip-path:inset(62% 0 18% 0);transform:translate(-3px,0)}
          75%{clip-path:inset(12% 0 70% 0);transform:translate(4px,0) skewX(-3deg)}
        }
        @keyframes ls-gb{
          0%,100%{clip-path:inset(55% 0 22% 0);transform:translate(4px,0);color:#ef4444}
          33%{clip-path:inset(18% 0 58% 0);transform:translate(-4px,0);color:#f59e0b}
          66%{clip-path:inset(75% 0 8% 0);transform:translate(3px,0);color:#ef4444}
        }
        @keyframes ls-scan{
          0%{transform:translateY(-100%);opacity:0}5%{opacity:1}95%{opacity:1}100%{transform:translateY(100vh);opacity:0}
        }
        @keyframes ls-pulse{0%,100%{opacity:0.4}50%{opacity:1}}
        @keyframes ls-blink{0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes ls-slidein{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:none}}
        @keyframes ls-drift{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes ls-chairbuild{from{stroke-dashoffset:800;opacity:0.1}to{stroke-dashoffset:0;opacity:1}}
        @keyframes ls-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes ls-spinr{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
        .ls-title{animation:ls-flicker 5s ease infinite,ls-rgb 4s ease infinite}
        .ls-ga{animation:ls-ga 0.12s steps(1) infinite}
        .ls-gb{animation:ls-gb 0.16s steps(1) infinite}
        .ls-chair{stroke-dasharray:800;animation:ls-chairbuild 2s cubic-bezier(0.16,1,0.3,1) both}
      `}</style>

      {/* Falling hair canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* Scan line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 1,
          zIndex: 3,
          pointerEvents: "none",
          background:
            "linear-gradient(to right,transparent 0%,rgba(245,158,11,0.8) 30%,rgba(245,158,11,1) 50%,rgba(245,158,11,0.8) 70%,transparent 100%)",
          boxShadow: "0 0 16px 2px rgba(245,158,11,0.5)",
          animation: "ls-scan 3.2s cubic-bezier(0.4,0,0.6,1) infinite",
        }}
      />

      {/* Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(245,158,11,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.025) 1px,transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(245,158,11,0.07) 0%,rgba(239,68,68,0.03) 35%,transparent 68%)",
          pointerEvents: "none",
          zIndex: 0,
          animation: "ls-drift 4s ease infinite",
        }}
      />

      {/* ── RULER MARKS (replaces corner brackets) ── */}
      {/* Top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 56,
          right: 56,
          height: 16,
          zIndex: 10,
          pointerEvents: "none",
          display: "flex",
          alignItems: "flex-start",
        }}
      >
        {Array.from({ length: 44 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: i % 11 === 0 ? 14 : i % 5 === 0 ? 9 : 5,
              width: 1,
              background: `rgba(245,158,11,${i % 11 === 0 ? 0.65 : i % 5 === 0 ? 0.35 : 0.15})`,
            }}
          />
        ))}
      </div>
      {/* Bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 56,
          right: 56,
          height: 16,
          zIndex: 10,
          pointerEvents: "none",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        {Array.from({ length: 44 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: i % 11 === 0 ? 14 : i % 5 === 0 ? 9 : 5,
              width: 1,
              background: `rgba(245,158,11,${i % 11 === 0 ? 0.65 : i % 5 === 0 ? 0.35 : 0.15})`,
            }}
          />
        ))}
      </div>
      {/* Left */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 56,
          bottom: 56,
          width: 16,
          zIndex: 10,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              width: i % 10 === 0 ? 14 : i % 5 === 0 ? 9 : 5,
              height: 1,
              background: `rgba(245,158,11,${i % 10 === 0 ? 0.65 : i % 5 === 0 ? 0.35 : 0.15})`,
            }}
          />
        ))}
      </div>
      {/* Right */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 56,
          bottom: 56,
          width: 16,
          zIndex: 10,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
        }}
      >
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              width: i % 10 === 0 ? 14 : i % 5 === 0 ? 9 : 5,
              height: 1,
              background: `rgba(245,158,11,${i % 10 === 0 ? 0.65 : i % 5 === 0 ? 0.35 : 0.15})`,
            }}
          />
        ))}
      </div>

      {/* Top HUD */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 76,
          right: 76,
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 8,
            color: "rgba(245,158,11,0.35)",
            letterSpacing: "0.5em",
            textTransform: "uppercase",
          }}
        >
          SYS://HEADZUP v3.0
        </span>
        <span
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 8,
            color: "rgba(245,158,11,0.35)",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
          }}
        >
          31.3271°N · 89.2903°W
        </span>
      </div>

      {/* Bottom HUD */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 76,
          right: 76,
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 8,
            color: "rgba(245,158,11,0.3)",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
          }}
        >
          2509 W 4TH ST · HATTIESBURG MS
        </span>
        <span
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 8,
            color: "rgba(245,158,11,0.5)",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            animation: "ls-blink 1s step-end infinite",
          }}
        >
          ▮ {statusMsg}
        </span>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div
        style={{
          position: "relative",
          zIndex: 5,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          padding: "80px 20px",
        }}
      >
        {/* Barber chair SVG — blueprint build */}
        <div
          style={{
            position: "relative",
            width: 130,
            height: 96,
            marginBottom: 20,
            animation: "ls-drift 4s ease infinite",
          }}
        >
          <svg width="130" height="96" viewBox="0 0 130 96" fill="none">
            <path
              className="ls-chair"
              d="M28 58 Q65 64 102 58 L98 74 Q65 80 32 74 Z"
              stroke="#f59e0b"
              strokeWidth="1.5"
              fill="rgba(245,158,11,0.04)"
              style={{ animationDelay: "0s" }}
            />
            <path
              className="ls-chair"
              d="M33 58 L35 20 Q65 14 95 20 L97 58"
              stroke="#f59e0b"
              strokeWidth="1.5"
              fill="rgba(245,158,11,0.03)"
              style={{ animationDelay: "0.15s" }}
            />
            <path
              className="ls-chair"
              d="M45 20 Q65 12 85 20 L83 7 Q65 2 47 7 Z"
              stroke="#f59e0b"
              strokeWidth="1.5"
              fill="rgba(245,158,11,0.07)"
              style={{ animationDelay: "0.3s" }}
            />
            <path
              className="ls-chair"
              d="M30 48 L20 48 L18 58 L30 58"
              stroke="rgba(245,158,11,0.7)"
              strokeWidth="1.2"
              strokeDasharray="200"
              style={{ animationDelay: "0.42s" }}
            />
            <path
              className="ls-chair"
              d="M100 48 L110 48 L112 58 L100 58"
              stroke="rgba(245,158,11,0.7)"
              strokeWidth="1.2"
              strokeDasharray="200"
              style={{ animationDelay: "0.42s" }}
            />
            <line
              className="ls-chair"
              x1="65"
              y1="74"
              x2="65"
              y2="86"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="100"
              style={{ animationDelay: "0.55s" }}
            />
            <path
              className="ls-chair"
              d="M44 86 Q65 91 86 86"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="200"
              style={{ animationDelay: "0.65s" }}
            />
            <path
              className="ls-chair"
              d="M37 72 L22 78 M93 72 L108 78"
              stroke="rgba(245,158,11,0.5)"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeDasharray="150"
              style={{ animationDelay: "0.5s" }}
            />
            <circle cx="65" cy="7" r="2.5" fill="#f59e0b" opacity="0.8">
              <animate
                attributeName="opacity"
                values="0.3;1;0.3"
                dur="1.8s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
          {/* Orbit rings */}
          <div
            style={{
              position: "absolute",
              inset: -14,
              border: "1px solid rgba(245,158,11,0.1)",
              borderRadius: "50%",
              animation: "ls-spin 14s linear infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: -6,
              border: "1px dashed rgba(245,158,11,0.07)",
              borderRadius: "50%",
              animation: "ls-spinr 9s linear infinite",
            }}
          />
        </div>

        {/* Scissors flanking wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 4,
            position: "relative",
          }}
        >
          {/* Left scissors */}
          <svg
            width="26"
            height="34"
            viewBox="0 0 26 34"
            fill="none"
            style={{ flexShrink: 0, opacity: 0.75 }}
          >
            <line
              x1="4"
              y1={scissors ? 7 : 17}
              x2="22"
              y2={scissors ? 3 : 17}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)" }}
            />
            <circle
              cx="4"
              cy={scissors ? 7 : 17}
              r="3.5"
              stroke="#f59e0b"
              strokeWidth="1.5"
              fill="rgba(245,158,11,0.1)"
              style={{ transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)" }}
            />
            <line
              x1="4"
              y1={scissors ? 27 : 17}
              x2="22"
              y2={scissors ? 31 : 17}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)" }}
            />
            <circle
              cx="4"
              cy={scissors ? 27 : 17}
              r="3.5"
              stroke="#f59e0b"
              strokeWidth="1.5"
              fill="rgba(245,158,11,0.1)"
              style={{ transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)" }}
            />
          </svg>

          {/* Wordmark */}
          <div style={{ position: "relative" }}>
            <h1
              className="ls-title"
              style={{
                fontFamily: "'Syncopate',sans-serif",
                fontSize: "clamp(2.6rem,10vw,5.2rem)",
                fontWeight: 900,
                letterSpacing: "-0.06em",
                textTransform: "uppercase",
                color: "white",
                margin: 0,
                lineHeight: 1,
                userSelect: "none",
              }}
            >
              HEADZ
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </h1>
            {glitch && (
              <>
                <h1
                  className="ls-ga"
                  style={{
                    fontFamily: "'Syncopate',sans-serif",
                    fontSize: "clamp(2.6rem,10vw,5.2rem)",
                    fontWeight: 900,
                    letterSpacing: "-0.06em",
                    textTransform: "uppercase",
                    color: "#ef4444",
                    margin: 0,
                    lineHeight: 1,
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  HEADZ<span style={{ fontStyle: "italic" }}>UP</span>
                </h1>
                <h1
                  className="ls-gb"
                  style={{
                    fontFamily: "'Syncopate',sans-serif",
                    fontSize: "clamp(2.6rem,10vw,5.2rem)",
                    fontWeight: 900,
                    letterSpacing: "-0.06em",
                    textTransform: "uppercase",
                    color: "#635bff",
                    margin: 0,
                    lineHeight: 1,
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    userSelect: "none",
                    opacity: 0.45,
                  }}
                >
                  HEADZ<span style={{ fontStyle: "italic" }}>UP</span>
                </h1>
              </>
            )}
          </div>

          {/* Right scissors (mirrored) */}
          <svg
            width="26"
            height="34"
            viewBox="0 0 26 34"
            fill="none"
            style={{ flexShrink: 0, opacity: 0.75, transform: "scaleX(-1)" }}
          >
            <line
              x1="4"
              y1={scissors ? 7 : 17}
              x2="22"
              y2={scissors ? 3 : 17}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)" }}
            />
            <circle
              cx="4"
              cy={scissors ? 7 : 17}
              r="3.5"
              stroke="#f59e0b"
              strokeWidth="1.5"
              fill="rgba(245,158,11,0.1)"
              style={{ transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)" }}
            />
            <line
              x1="4"
              y1={scissors ? 27 : 17}
              x2="22"
              y2={scissors ? 31 : 17}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)" }}
            />
            <circle
              cx="4"
              cy={scissors ? 27 : 17}
              r="3.5"
              stroke="#f59e0b"
              strokeWidth="1.5"
              fill="rgba(245,158,11,0.1)"
              style={{ transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)" }}
            />
          </svg>
        </div>

        {/* Subtext */}
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: "clamp(7px,1.8vw,10px)",
            color: "rgba(245,158,11,0.45)",
            letterSpacing: "0.7em",
            textTransform: "uppercase",
            marginBottom: 32,
            animation: "ls-pulse 3s ease infinite",
          }}
        >
          ✦ PRECISION CUTS · HATTIESBURG MS ✦
        </p>

        {/* ── COMB PROGRESS ── */}
        <div style={{ width: "min(380px,82vw)", marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 8,
                color: "rgba(245,158,11,0.4)",
                letterSpacing: "0.4em",
                textTransform: "uppercase",
              }}
            >
              BOOT SEQUENCE
            </span>
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 14,
                color: "#f59e0b",
                fontWeight: 500,
                letterSpacing: "0.1em",
              }}
            >
              {pct}
              <span style={{ fontSize: 8, color: "rgba(245,158,11,0.5)" }}>
                %
              </span>
            </span>
          </div>
          {/* Comb teeth + spine */}
          <div
            style={{
              position: "relative",
              height: 36,
              display: "flex",
              alignItems: "flex-start",
              gap: 2,
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
                background: "rgba(245,158,11,0.12)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                height: 3,
                width: `${pct}%`,
                background: "linear-gradient(to right,#f59e0b,#fbbf24)",
                boxShadow:
                  "0 0 8px rgba(245,158,11,0.8),0 0 24px rgba(245,158,11,0.3)",
                transition: "width 0.15s ease",
              }}
            />
            {Array.from({ length: TEETH }).map((_, i) => {
              const f = i < filled;
              const ia = i === filled;
              const h = 8 + (i % 3) * 5;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: f ? h + 4 : h,
                    background: f
                      ? `rgba(245,158,11,${0.45 + (i / TEETH) * 0.55})`
                      : "rgba(255,255,255,0.06)",
                    borderRadius: "1px 1px 0 0",
                    alignSelf: "flex-start",
                    boxShadow: ia
                      ? "0 0 10px rgba(245,158,11,1),0 0 24px rgba(245,158,11,0.6)"
                      : "none",
                    transition: "height 0.1s ease,background 0.1s ease",
                    zIndex: 1,
                    position: "relative",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div style={{ height: 18, overflow: "hidden" }}>
          <p
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 9,
              color: "rgba(245,158,11,0.5)",
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              margin: 0,
              animation: "ls-slidein 0.25s ease both",
            }}
            key={statusMsg}
          >
            {statusMsg}
          </p>
        </div>

        {/* EQ bars */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 3,
            marginTop: 22,
            height: 20,
          }}
        >
          {Array.from({ length: 14 }).map((_, i) => {
            const h = 4 + Math.abs(Math.sin(tick * 0.22 + i * 0.7)) * 14;
            const f = i / 14 < pct / 100;
            return (
              <div
                key={i}
                style={{
                  width: 5,
                  height: h,
                  background: f
                    ? `rgba(245,158,11,${0.25 + Math.abs(Math.sin(tick * 0.22 + i * 0.7)) * 0.65})`
                    : "rgba(255,255,255,0.05)",
                  transition: "height 0.06s",
                  borderRadius: "1px 1px 0 0",
                  boxShadow: f ? "0 0 4px rgba(245,158,11,0.4)" : "none",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
