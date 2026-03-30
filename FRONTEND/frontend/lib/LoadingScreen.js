"use client";

import { useEffect, useState, useRef } from "react";

const CUTS = ["FADE", "TAPER", "LINEUP", "SHAPE UP", "CLEAN CUT"];
const WORDS = ["PRECISION.", "FRESH.", "SHARP.", "CLEAN.", "LEGENDARY."];

export default function LoadingScreen({ onComplete }) {
  const [progress,   setProgress]   = useState(0);
  const [phase,      setPhase]      = useState("in");
  const [visible,    setVisible]    = useState(true);
  const [wordIdx,    setWordIdx]    = useState(0);
  const [cutIdx,     setCutIdx]     = useState(0);
  const [scissors,   setScissors]   = useState(false);
  const canvasRef = useRef(null);

  // Rotating words
  useEffect(() => {
    const t = setInterval(() => {
      setWordIdx(i => (i + 1) % WORDS.length);
      setCutIdx(i  => (i + 1) % CUTS.length);
    }, 420);
    return () => clearInterval(t);
  }, []);

  // Scissors open/close animation
  useEffect(() => {
    const t = setInterval(() => setScissors(s => !s), 600);
    return () => clearInterval(t);
  }, []);

  // Canvas: animated barbershop pole stripes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = 3;
    canvas.height = 200;
    let offset = 0;
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, 3, 200);
      const stripeH = 20;
      for (let y = -stripeH + (offset % (stripeH * 3)); y < 220; y += stripeH * 3) {
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(0, y, 3, stripeH);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, y + stripeH, 3, stripeH);
        ctx.fillStyle = "#040404";
        ctx.fillRect(0, y + stripeH * 2, 3, stripeH);
      }
      offset += 0.6;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Progress bar
  useEffect(() => {
    let prog = 0;
    // Realistic loading — fast at start, slight pause at 70%, burst to 100
    const phases = [
      { speed: 15, target: 40 },
      { speed: 4,  target: 70 },
      { speed: 18, target: 100 },
    ];
    let phaseIdx = 0;
    const tick = setInterval(() => {
      const p = phases[phaseIdx];
      prog = Math.min(prog + Math.random() * p.speed + 2, p.target);
      setProgress(Math.round(prog));
      if (prog >= p.target && phaseIdx < phases.length - 1) phaseIdx++;
      if (prog >= 100) {
        clearInterval(tick);
        setTimeout(() => setPhase("out"), 400);
        setTimeout(() => { setVisible(false); onComplete?.(); }, 1100);
      }
    }, 60);
    return () => clearInterval(tick);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#040404",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      opacity: phase === "out" ? 0 : 1,
      transform: phase === "out" ? "scale(1.015)" : "scale(1)",
      transition: "opacity 0.7s cubic-bezier(0.4,0,0.2,1), transform 0.7s cubic-bezier(0.4,0,0.2,1)",
      pointerEvents: phase === "out" ? "none" : "all",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes ls-flicker { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.3} 94%{opacity:1} 97%{opacity:0.7} 98%{opacity:1} }
        @keyframes ls-scan { 0%{top:-2px} 100%{top:102%} }
        @keyframes ls-pop { from{opacity:0;transform:scale(0.85) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes ls-word { 0%{opacity:0;transform:translateY(-6px)} 15%{opacity:1;transform:translateY(0)} 85%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(6px)} }
        @keyframes ls-glitch {
          0%,100%{clip-path:inset(50% 0 30% 0);transform:translate(-3px,0)}
          10%{clip-path:inset(15% 0 60% 0);transform:translate(3px,0)}
          20%{clip-path:inset(80% 0 5% 0);transform:translate(-2px,0)}
          30%{clip-path:inset(0% 0 0% 0);transform:translate(0,0)}
        }
        @keyframes ls-bar { from{width:0} }
        @keyframes ls-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>

      {/* Grain overlay */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, pointerEvents: "none" }} />

      {/* Scanline */}
      <div style={{ position: "absolute", left: 0, right: 0, height: "2px", background: "linear-gradient(to right, transparent, rgba(245,158,11,0.4), transparent)", animation: "ls-scan 3s linear infinite", pointerEvents: "none", zIndex: 2 }} />

      {/* Ambient amber bleed — top right */}
      <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, background: "radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 60%)", pointerEvents: "none" }} />
      {/* Bottom left */}
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 300, height: 300, background: "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 60%)", pointerEvents: "none" }} />

      {/* Barber pole — left */}
      <div style={{ position: "absolute", left: 32, top: "50%", transform: "translateY(-50%)", width: 3, height: 200, overflow: "hidden", opacity: 0.6 }}>
        <canvas ref={canvasRef} style={{ width: 3, height: 200 }} />
      </div>
      {/* Barber pole — right (mirrored) */}
      <div style={{ position: "absolute", right: 32, top: "50%", transform: "translateY(-50%)", width: 3, height: 200, overflow: "hidden", opacity: 0.6, transform: "translateY(-50%) scaleY(-1)" }}>
        <canvas style={{ width: 3, height: 200, background: "linear-gradient(to bottom, #f59e0b 33%, white 33% 66%, #040404 66%)" }} />
      </div>

      {/* Corner brackets */}
      {[
        { top: 16, left: 16,     borderTop: "1px solid rgba(245,158,11,0.35)", borderLeft:  "1px solid rgba(245,158,11,0.35)" },
        { top: 16, right: 16,    borderTop: "1px solid rgba(245,158,11,0.35)", borderRight: "1px solid rgba(245,158,11,0.35)" },
        { bottom: 16, left: 16,  borderBottom: "1px solid rgba(245,158,11,0.35)", borderLeft: "1px solid rgba(245,158,11,0.35)" },
        { bottom: 16, right: 16, borderBottom: "1px solid rgba(245,158,11,0.35)", borderRight: "1px solid rgba(245,158,11,0.35)" },
      ].map((s, i) => (
        <div key={i} style={{ position: "absolute", width: 20, height: 20, ...s }} />
      ))}

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0, userSelect: "none" }}>

        {/* Scissors icon */}
        <div style={{ marginBottom: 28, animation: "ls-pop 0.5s ease both" }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            {/* Blade 1 */}
            <line x1={scissors ? 6 : 2}  y1={scissors ? 8 : 18}  x2="30" y2="30" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" style={{ transition: "all 0.25s" }} />
            {/* Blade 2 */}
            <line x1={scissors ? 6 : 2}  y1={scissors ? 28 : 18} x2="30" y2="6"  stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" style={{ transition: "all 0.25s" }} />
            {/* Handle circles */}
            <circle cx={scissors ? 4 : 2} cy={scissors ? 7 : 18}  r="3" stroke="#f59e0b" strokeWidth="1" fill="transparent" style={{ transition: "all 0.25s" }} />
            <circle cx={scissors ? 4 : 2} cy={scissors ? 29 : 18} r="3" stroke="#f59e0b" strokeWidth="1" fill="transparent" style={{ transition: "all 0.25s" }} />
          </svg>
        </div>

        {/* Wordmark with glitch effect */}
        <div style={{ position: "relative", marginBottom: 4, animation: "ls-flicker 8s ease infinite" }}>
          <h1 style={{ fontFamily: "'Syncopate', sans-serif", fontSize: "clamp(2.4rem, 8vw, 3.6rem)", fontWeight: 900, letterSpacing: "-0.06em", textTransform: "uppercase", color: "white", margin: 0, lineHeight: 1 }}>
            HEADZ<span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
          </h1>
          {/* Glitch copy — red */}
          <h1 aria-hidden style={{ position: "absolute", inset: 0, fontFamily: "'Syncopate', sans-serif", fontSize: "clamp(2.4rem, 8vw, 3.6rem)", fontWeight: 900, letterSpacing: "-0.06em", textTransform: "uppercase", color: "#f87171", margin: 0, lineHeight: 1, animation: "ls-glitch 6s steps(1) infinite", opacity: 0.6 }}>
            HEADZ<span style={{ color: "#fbbf24" }}>UP</span>
          </h1>
        </div>

        {/* Location */}
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#52525b", letterSpacing: "0.5em", textTransform: "uppercase", marginBottom: 40 }}>
          Hattiesburg, MS
        </p>

        {/* Rotating service type */}
        <div style={{ height: 20, marginBottom: 32, overflow: "hidden" }}>
          <p key={cutIdx} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "rgba(245,158,11,0.6)", letterSpacing: "0.6em", textTransform: "uppercase", margin: 0, animation: "ls-word 0.42s ease forwards" }}>
            {CUTS[cutIdx]}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ width: "min(280px, 72vw)", marginBottom: 14 }}>
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent, rgba(245,158,11,0.15), transparent)", animation: "ls-glitch 3s steps(1) infinite" }} />
            <div style={{ height: "100%", background: "#f59e0b", width: `${progress}%`, transition: "width 0.1s linear", position: "relative" }}>
              {/* Shimmer on fill */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent)", transform: "translateX(-100%)", animation: "ls-bar 0.8s ease infinite" }} />
            </div>
          </div>
        </div>

        {/* Percent + rotating word */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#f59e0b", fontWeight: 500, minWidth: 36, textAlign: "right" }}>
            {progress}%
          </span>
          <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.1)" }} />
          <div style={{ height: 14, overflow: "hidden" }}>
            <p key={wordIdx} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#3f3f46", letterSpacing: "0.4em", textTransform: "uppercase", margin: 0, animation: "ls-word 0.42s ease forwards" }}>
              {WORDS[wordIdx]}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom tagline */}
      <p style={{ position: "absolute", bottom: 24, fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#27272a", letterSpacing: "0.5em", textTransform: "uppercase", animation: "ls-pulse 3s ease infinite" }}>
        4 Hub Dr · Hattiesburg, MS 39402
      </p>
    </div>
  );
}