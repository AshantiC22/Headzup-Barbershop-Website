"use client";
import { useEffect, useState, useRef } from "react";

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("in");
  const [visible, setVisible] = useState(true);
  const [tick, setTick] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const [scanLine, setScanLine] = useState(0);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const fireRef = useRef([]);

  // ── Progress ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let p = 0;
    const steps = [
      { sp: 22, max: 35 },
      { sp: 6, max: 68 },
      { sp: 25, max: 100 },
    ];
    let si = 0;
    const id = setInterval(() => {
      p = Math.min(p + Math.random() * steps[si].sp + 2, steps[si].max);
      setProgress(Math.round(p));
      if (p >= steps[si].max && si < steps.length - 1) si++;
      if (p >= 100) {
        clearInterval(id);
        setTimeout(() => setPhase("out"), 300);
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 950);
      }
    }, 50);
    return () => clearInterval(id);
  }, [onComplete]);

  // ── Tick ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  // ── Glitch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fire = () => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 120);
      setTimeout(fire, 2800 + Math.random() * 1400);
    };
    const t = setTimeout(fire, 900);
    return () => clearTimeout(t);
  }, []);

  // ── Scanline ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setScanLine((s) => (s + 2) % 100), 16);
    return () => clearInterval(id);
  }, []);

  // ── Canvas: FIRE SYSTEM ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Respawn fire particles anchored to bottom
      const W = canvas.width;
      const H = canvas.height;

      fireRef.current = Array.from({ length: 160 }, (_, i) => {
        const x = Math.random() * W;
        return makeParticle(x, H, W, i);
      });
    };

    function makeParticle(x, H, W, seed = 0) {
      const isSpark = Math.random() > 0.72;
      const isEmber = !isSpark && Math.random() > 0.6;
      const baseSize = isSpark
        ? Math.random() * 1.5 + 0.5
        : isEmber
          ? Math.random() * 2.5 + 1.0
          : Math.random() * 18 + 6;
      const speed = isSpark
        ? Math.random() * 3.5 + 2.5
        : isEmber
          ? Math.random() * 2.2 + 1.2
          : Math.random() * 1.8 + 0.6;
      return {
        x,
        y: H + Math.random() * 40,
        baseX: x,
        vy: -speed,
        vx: (Math.random() - 0.5) * (isSpark ? 2.5 : isEmber ? 1.0 : 0.4),
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.04 + Math.random() * 0.05,
        wobbleAmp: isSpark ? 0.8 : isEmber ? 1.5 : 3.5,
        size: baseSize,
        life: 1.0,
        decay: isSpark
          ? 0.025 + Math.random() * 0.02
          : isEmber
            ? 0.01 + Math.random() * 0.012
            : 0.007 + Math.random() * 0.009,
        isSpark,
        isEmber,
        // Colour tier: deep orange → bright amber → yellow-white tip
        colorSeed: Math.random(),
      };
    }

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // ── Bottom heat glow ──
      const heatGrad = ctx.createLinearGradient(0, H, 0, H - 220);
      heatGrad.addColorStop(0, "rgba(239,68,68,0.18)");
      heatGrad.addColorStop(0.3, "rgba(245,158,11,0.10)");
      heatGrad.addColorStop(0.7, "rgba(245,158,11,0.04)");
      heatGrad.addColorStop(1, "transparent");
      ctx.fillStyle = heatGrad;
      ctx.fillRect(0, H - 220, W, 220);

      fireRef.current.forEach((p, idx) => {
        // Physics
        p.wobble += p.wobbleSpeed;
        p.x = p.baseX + Math.sin(p.wobble) * p.wobbleAmp;
        p.baseX += p.vx;
        p.y += p.vy;
        p.life -= p.decay;

        // Respawn at bottom
        if (p.life <= 0 || p.y < -20) {
          const np = makeParticle(Math.random() * W, H, W);
          fireRef.current[idx] = np;
          return;
        }

        const a = Math.max(0, p.life);

        if (p.isSpark) {
          // Bright white-gold sparks
          ctx.save();
          ctx.globalAlpha = a * 0.9;
          ctx.fillStyle = p.colorSeed > 0.5 ? "#fff8e1" : "#fbbf24";
          ctx.shadowColor = "#fbbf24";
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return;
        }

        if (p.isEmber) {
          // Small glowing embers — amber with red core
          ctx.save();
          ctx.globalAlpha = a * 0.75;
          const eg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          eg.addColorStop(0, "rgba(255,255,220,0.95)");
          eg.addColorStop(0.3, "rgba(251,191,36,0.9)");
          eg.addColorStop(0.7, "rgba(245,158,11,0.7)");
          eg.addColorStop(1, "rgba(239,68,68,0)");
          ctx.fillStyle = eg;
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return;
        }

        // ── MAIN FLAME TONGUE ──
        // Height shrinks as life decays
        const flameH = p.size * (1 + p.life * 2.5);
        const flameW = p.size * 0.8;

        ctx.save();
        ctx.globalAlpha = a * 0.55;

        // Outer flame: deep red → orange
        const fg1 = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y + flameH * 0.3,
          flameH,
        );
        fg1.addColorStop(0, `rgba(255,240,180,${a * 0.9})`);
        fg1.addColorStop(0.2, `rgba(251,191,36,${a * 0.85})`);
        fg1.addColorStop(0.5, `rgba(245,158,11,${a * 0.7})`);
        fg1.addColorStop(0.75, `rgba(239,68,68,${a * 0.5})`);
        fg1.addColorStop(1, "transparent");

        ctx.fillStyle = fg1;
        ctx.shadowColor = "#f59e0b";
        ctx.shadowBlur = 20;

        // Draw teardrop flame shape
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + flameH * 0.2);
        ctx.bezierCurveTo(
          p.x - flameW,
          p.y,
          p.x - flameW * 0.4,
          p.y - flameH * 0.6,
          p.x,
          p.y - flameH,
        );
        ctx.bezierCurveTo(
          p.x + flameW * 0.4,
          p.y - flameH * 0.6,
          p.x + flameW,
          p.y,
          p.x,
          p.y + flameH * 0.2,
        );
        ctx.fill();

        // Inner bright core
        ctx.globalAlpha = a * 0.4;
        const fg2 = ctx.createRadialGradient(
          p.x,
          p.y - flameH * 0.2,
          0,
          p.x,
          p.y,
          flameH * 0.5,
        );
        fg2.addColorStop(0, "rgba(255,255,255,0.8)");
        fg2.addColorStop(0.3, "rgba(255,248,180,0.7)");
        fg2.addColorStop(1, "transparent");
        ctx.fillStyle = fg2;
        ctx.beginPath();
        ctx.arc(p.x, p.y - flameH * 0.15, flameW * 0.5, 0, Math.PI * 2);
        ctx.fill();

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
  const segments = 20;
  const filled = Math.floor((pct / 100) * segments);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#000",
        opacity: phase === "out" ? 0 : 1,
        transform: phase === "out" ? "scale(1.04)" : "scale(1)",
        transition: "opacity 0.65s ease, transform 0.65s ease",
        pointerEvents: phase === "out" ? "none" : "all",
        overflow: "hidden",
        fontFamily: "'Syncopate',sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@400;500&display=swap');

        @keyframes ls-flicker {
          0%,89%,91%,93%,100%{opacity:1} 90%,92%{opacity:0.05}
        }
        @keyframes ls-rgb {
          0%  {text-shadow:3px 0 #f59e0b,-3px 0 rgba(239,68,68,0.6),0 0 20px rgba(245,158,11,0.4)}
          33% {text-shadow:-3px 0 #f59e0b,3px 0 rgba(239,68,68,0.6),0 0 20px rgba(245,158,11,0.4)}
          66% {text-shadow:0 3px #f59e0b,0 -3px rgba(239,68,68,0.6),0 0 20px rgba(245,158,11,0.4)}
          100%{text-shadow:3px 0 #f59e0b,-3px 0 rgba(239,68,68,0.6),0 0 20px rgba(245,158,11,0.4)}
        }
        @keyframes ls-glitch-1 {
          0%,100%{clip-path:inset(0 0 95% 0);transform:translate(-4px,0)}
          20%    {clip-path:inset(30% 0 50% 0);transform:translate(4px,0)}
          40%    {clip-path:inset(60% 0 20% 0);transform:translate(-3px,0)}
          60%    {clip-path:inset(10% 0 75% 0);transform:translate(3px,0)}
          80%    {clip-path:inset(80% 0 5% 0);transform:translate(-2px,0)}
        }
        @keyframes ls-glitch-2 {
          0%,100%{clip-path:inset(50% 0 30% 0);transform:translate(3px,0);color:#ef4444}
          25%    {clip-path:inset(20% 0 60% 0);transform:translate(-3px,0);color:#f59e0b}
          50%    {clip-path:inset(70% 0 10% 0);transform:translate(2px,0);color:#ef4444}
          75%    {clip-path:inset(5% 0 80% 0);transform:translate(-2px,0);color:#f59e0b}
        }
        @keyframes ls-pulse  {0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.02)}}
        @keyframes ls-blink  {0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes ls-slidein{from{opacity:0;transform:translateX(-40px) skewX(-6deg)}to{opacity:1;transform:none}}
        @keyframes ls-bar-flash{0%,100%{box-shadow:0 0 8px rgba(245,158,11,0.6)}50%{box-shadow:0 0 24px rgba(245,158,11,1),0 0 48px rgba(245,158,11,0.4)}}
        @keyframes ls-rotate {from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes ls-heat   {0%,100%{opacity:0.6;transform:scaleY(1)}50%{opacity:1;transform:scaleY(1.05)}}
        @keyframes ls-ember-drift {
          0%  {transform:translate(0,0) scale(1);opacity:0.9}
          50% {transform:translate(6px,-30px) scale(0.6);opacity:0.6}
          100%{transform:translate(-4px,-60px) scale(0.2);opacity:0}
        }

        .ls-main-title {animation:ls-flicker 6s ease infinite,ls-rgb 3s ease infinite}
        .ls-glitch-1   {animation:ls-glitch-1 0.15s steps(1) infinite}
        .ls-glitch-2   {animation:ls-glitch-2 0.18s steps(1) infinite}
        .ls-bar-seg    {animation:ls-bar-flash 1.2s ease infinite}
        .ls-heat-shimmer{animation:ls-heat 2.4s ease infinite}
      `}</style>

      {/* ── FIRE CANVAS (main effect) ── */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* ── CRT SCANLINES ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.14) 2px,rgba(0,0,0,0.14) 3px)",
        }}
      />

      {/* ── MOVING SCAN LINE ── */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 2,
          zIndex: 4,
          pointerEvents: "none",
          background:
            "linear-gradient(to right,transparent,rgba(245,158,11,0.6),rgba(245,158,11,0.9),rgba(245,158,11,0.6),transparent)",
          animation: "none",
          top: `${scanLine}%`,
          boxShadow: "0 0 12px rgba(245,158,11,0.8)",
          opacity: 0.7,
        }}
      />

      {/* ── GRID ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(245,158,11,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.025) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── RADIAL CENTER GLOW ── */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 500,
          height: 500,
          background:
            "radial-gradient(circle,rgba(245,158,11,0.06) 0%,rgba(239,68,68,0.03) 35%,transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── HUD CORNER BRACKETS ── */}
      {[
        {
          top: 12,
          left: 12,
          borderTop: "2px solid rgba(245,158,11,0.8)",
          borderLeft: "2px solid rgba(245,158,11,0.8)",
        },
        {
          top: 12,
          right: 12,
          borderTop: "2px solid rgba(245,158,11,0.8)",
          borderRight: "2px solid rgba(245,158,11,0.8)",
        },
        {
          bottom: 12,
          left: 12,
          borderBottom: "2px solid rgba(245,158,11,0.8)",
          borderLeft: "2px solid rgba(245,158,11,0.8)",
        },
        {
          bottom: 12,
          right: 12,
          borderBottom: "2px solid rgba(245,158,11,0.8)",
          borderRight: "2px solid rgba(245,158,11,0.8)",
        },
      ].map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 24,
            height: 24,
            zIndex: 10,
            ...s,
          }}
        />
      ))}

      {/* ── TOP HUD ── */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 48,
          right: 48,
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 8,
            color: "rgba(245,158,11,0.4)",
            letterSpacing: "0.5em",
            textTransform: "uppercase",
          }}
        >
          SYS://HEADZUP_OS v2.6
        </span>
        <span
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 8,
            color: "rgba(245,158,11,0.4)",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
          }}
        >
          HAT.MS · 31.3271°N
        </span>
      </div>

      {/* ── BOTTOM HUD ── */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 48,
          right: 48,
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
            color: "rgba(245,158,11,0.3)",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            animation: "ls-blink 1s step-end infinite",
          }}
        >
          ▮ INITIALIZING
        </span>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div
        style={{
          position: "relative",
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 0,
          padding: "60px 20px",
        }}
      >
        {/* Scissors icon */}
        <div style={{ marginBottom: 20, position: "relative" }}>
          <div
            style={{
              width: 56,
              height: 56,
              border: "1px solid rgba(245,158,11,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              clipPath:
                "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
              background: "rgba(245,158,11,0.06)",
              boxShadow:
                "0 0 20px rgba(245,158,11,0.15), inset 0 0 20px rgba(245,158,11,0.04)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <line
                x1={tick % 20 < 10 ? 8 : 3}
                y1={tick % 20 < 10 ? 10 : 18}
                x2="32"
                y2="32"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)" }}
              />
              <line
                x1={tick % 20 < 10 ? 8 : 3}
                y1={tick % 20 < 10 ? 26 : 18}
                x2="32"
                y2="4"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)" }}
              />
              <circle
                cx={tick % 20 < 10 ? 6 : 3}
                cy={tick % 20 < 10 ? 9 : 18}
                r="3.5"
                stroke="#f59e0b"
                strokeWidth="1.5"
                fill="rgba(245,158,11,0.15)"
                style={{ transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)" }}
              />
              <circle
                cx={tick % 20 < 10 ? 6 : 3}
                cy={tick % 20 < 10 ? 27 : 18}
                r="3.5"
                stroke="#f59e0b"
                strokeWidth="1.5"
                fill="rgba(245,158,11,0.15)"
                style={{ transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)" }}
              />
            </svg>
          </div>
          {/* Fire glow under scissors icon */}
          <div
            style={{
              position: "absolute",
              bottom: -8,
              left: "50%",
              transform: "translateX(-50%)",
              width: 80,
              height: 20,
              background:
                "radial-gradient(ellipse,rgba(245,158,11,0.35) 0%,rgba(239,68,68,0.15) 40%,transparent 70%)",
              filter: "blur(4px)",
              animation: "ls-heat 2.4s ease infinite",
            }}
          />
        </div>

        {/* WORDMARK with glitch */}
        <div style={{ position: "relative", marginBottom: 6 }}>
          <h1
            className="ls-main-title"
            style={{
              fontFamily: "'Syncopate',sans-serif",
              fontSize: "clamp(3.2rem,12vw,6rem)",
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
            <h1
              className="ls-glitch-1"
              style={{
                fontFamily: "'Syncopate',sans-serif",
                fontSize: "clamp(3.2rem,12vw,6rem)",
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
          )}
          {glitch && (
            <h1
              className="ls-glitch-2"
              style={{
                fontFamily: "'Syncopate',sans-serif",
                fontSize: "clamp(3.2rem,12vw,6rem)",
                fontWeight: 900,
                letterSpacing: "-0.06em",
                textTransform: "uppercase",
                color: "#f59e0b",
                margin: 0,
                lineHeight: 1,
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                userSelect: "none",
                opacity: 0.5,
              }}
            >
              HEADZ<span style={{ fontStyle: "italic" }}>UP</span>
            </h1>
          )}
          {/* Fire glow rising from under wordmark */}
          <div
            style={{
              position: "absolute",
              bottom: -12,
              left: "50%",
              transform: "translateX(-50%)",
              width: "110%",
              height: 32,
              background:
                "radial-gradient(ellipse,rgba(245,158,11,0.25) 0%,rgba(239,68,68,0.12) 40%,transparent 70%)",
              filter: "blur(6px)",
              animation: "ls-heat 1.8s ease infinite",
              zIndex: -1,
            }}
          />
        </div>

        {/* Tagline */}
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: "clamp(8px,2vw,11px)",
            color: "rgba(245,158,11,0.55)",
            letterSpacing: "0.65em",
            textTransform: "uppercase",
            marginBottom: 40,
            animation: "ls-pulse 3s ease infinite",
          }}
        >
          ✦ BARBERSHOP · HATTIESBURG MS ✦
        </p>

        {/* SEGMENTED PROGRESS BAR */}
        <div style={{ width: "min(420px,85vw)", marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 8,
                color: "rgba(245,158,11,0.5)",
                letterSpacing: "0.4em",
                textTransform: "uppercase",
              }}
            >
              LOADING
            </span>
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 8,
                color: "#f59e0b",
                letterSpacing: "0.3em",
                fontWeight: 500,
              }}
            >
              {pct}%
            </span>
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: segments }).map((_, i) => {
              const isFilled = i < filled;
              const isActive = i === filled;
              return (
                <div
                  key={i}
                  className={isActive ? "ls-bar-seg" : ""}
                  style={{
                    flex: 1,
                    height: 10,
                    background: isFilled
                      ? i < segments * 0.5
                        ? "#f59e0b"
                        : i < segments * 0.8
                          ? "#fbbf24"
                          : "#ef4444"
                      : "rgba(255,255,255,0.05)",
                    clipPath:
                      "polygon(0 0,calc(100% - 2px) 0,100% 2px,100% 100%,2px 100%,0 calc(100% - 2px))",
                    transition: "background 0.15s",
                    boxShadow: isFilled
                      ? "0 0 6px rgba(245,158,11,0.5)"
                      : "none",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* STATUS TEXT */}
        <div style={{ height: 16, overflow: "hidden", marginBottom: 32 }}>
          <p
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 9,
              color: "rgba(245,158,11,0.4)",
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              margin: 0,
              animation: "ls-slidein 0.3s ease both",
            }}
            key={Math.floor(pct / 10)}
          >
            {pct < 25
              ? "CONNECTING TO SERVER..."
              : pct < 45
                ? "LOADING BARBER PROFILES..."
                : pct < 65
                  ? "SYNCING APPOINTMENTS..."
                  : pct < 82
                    ? "CALIBRATING PRECISION..."
                    : pct < 95
                      ? "ALMOST READY..."
                      : "HEADZ UP — LET'S GO"}
          </p>
        </div>

        {/* BOTTOM DECORATIVE + EQ */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Spinning hex */}
          <div
            style={{
              width: 20,
              height: 20,
              border: "1px solid rgba(245,158,11,0.4)",
              transform: `rotate(${tick * 4}deg)`,
              transition: "none",
              clipPath:
                "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
              background: "rgba(245,158,11,0.06)",
            }}
          />
          {/* EQ bars */}
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: 4,
                  height: 8 + Math.sin(tick * 0.3 + i * 0.8) * 6,
                  background: `rgba(245,158,11,${0.2 + Math.abs(Math.sin(tick * 0.3 + i * 0.8)) * 0.7})`,
                  transition: "height 0.08s",
                  boxShadow: `0 0 4px rgba(245,158,11,${Math.abs(Math.sin(tick * 0.3 + i * 0.8)) * 0.6})`,
                }}
              />
            ))}
          </div>
          {/* Second spinning hex (red) */}
          <div
            style={{
              width: 20,
              height: 20,
              border: "1px solid rgba(239,68,68,0.4)",
              transform: `rotate(${-tick * 3}deg)`,
              transition: "none",
              clipPath:
                "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
              background: "rgba(239,68,68,0.06)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
