"use client";
import { useEffect, useState, useRef } from "react";

const LINES = ["FADE", "TAPER", "LINEUP", "SHAPE UP", "CLEAN CUT", "FRESH CUT"];
const WORDS = [
  "PRECISION.",
  "FRESH.",
  "SHARP.",
  "CLEAN.",
  "LEGENDARY.",
  "ELITE.",
];

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("in");
  const [visible, setVisible] = useState(true);
  const [wIdx, setWIdx] = useState(0);
  const [lIdx, setLIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [tick2, setTick2] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setWIdx((i) => (i + 1) % WORDS.length);
      setLIdx((i) => (i + 1) % LINES.length);
    }, 400);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setOpen((s) => !s), 580);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setTick2((s) => !s), 900);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let prog = 0;
    const phases = [
      { sp: 18, target: 42 },
      { sp: 5, target: 72 },
      { sp: 20, target: 100 },
    ];
    let pi = 0;
    const id = setInterval(() => {
      prog = Math.min(
        prog + Math.random() * phases[pi].sp + 1.5,
        phases[pi].target,
      );
      setProgress(Math.round(prog));
      if (prog >= phases[pi].target && pi < phases.length - 1) pi++;
      if (prog >= 100) {
        clearInterval(id);
        setTimeout(() => setPhase("out"), 380);
        setTimeout(() => {
          setVisible(false);
          onComplete && onComplete();
        }, 1050);
      }
    }, 55);
    return () => clearInterval(id);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#030303",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: phase === "out" ? 0 : 1,
        transform: phase === "out" ? "scale(1.012)" : "scale(1)",
        transition: "opacity 0.65s ease,transform 0.65s ease",
        pointerEvents: phase === "out" ? "none" : "all",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes ls-scan  { 0%{top:-1px} 100%{top:100%} }
        @keyframes ls-word  { 0%{opacity:0;transform:translateY(-5px)} 15%{opacity:1;transform:none} 85%{opacity:1;transform:none} 100%{opacity:0;transform:translateY(5px)} }
        @keyframes ls-flick { 0%,100%{opacity:1} 93%{opacity:1} 94%{opacity:0.3} 95%{opacity:1} }
        @keyframes ls-pulse { 0%,100%{opacity:0.35} 50%{opacity:1} }
        @keyframes ls-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes ls-glow  { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.4)} 50%{box-shadow:0 0 0 12px rgba(245,158,11,0)} }
      `}</style>

      {/* Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.013) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.013) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
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
          background:
            "linear-gradient(to right,transparent,rgba(245,158,11,0.45),transparent)",
          animation: "ls-scan 3.2s linear infinite",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      {/* Ambient */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          right: "-8%",
          width: 500,
          height: 500,
          background:
            "radial-gradient(circle,rgba(245,158,11,0.065) 0%,transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-6%",
          width: 380,
          height: 380,
          background:
            "radial-gradient(circle,rgba(245,158,11,0.04) 0%,transparent 60%)",
          pointerEvents: "none",
        }}
      />

      {/* HUD corners */}
      {[
        { top: 12, left: 12, bt: "1px", bl: "1px" },
        { top: 12, right: 12, bt: "1px", br: "1px" },
        { bottom: 12, left: 12, bb: "1px", bl: "1px" },
        { bottom: 12, right: 12, bb: "1px", br: "1px" },
      ].map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 18,
            height: 18,
            ...Object.fromEntries(
              Object.entries(s).filter(([k]) =>
                ["top", "right", "bottom", "left"].includes(k),
              ),
            ),
            borderTop: s.bt && "1px solid rgba(245,158,11,0.4)",
            borderBottom: s.bb && "1px solid rgba(245,158,11,0.4)",
            borderLeft: s.bl && "1px solid rgba(245,158,11,0.4)",
            borderRight: s.br && "1px solid rgba(245,158,11,0.4)",
          }}
        />
      ))}

      {/* Side labels */}
      <p
        style={{
          position: "absolute",
          left: 20,
          top: "50%",
          transform: "translateY(-50%) rotate(-90deg)",
          transformOrigin: "center",
          fontFamily: "'DM Mono',monospace",
          fontSize: 8,
          color: "rgba(245,158,11,0.25)",
          letterSpacing: "0.5em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        SYSTEM LOADING
      </p>
      <p
        style={{
          position: "absolute",
          right: 20,
          top: "50%",
          transform: "translateY(-50%) rotate(90deg)",
          transformOrigin: "center",
          fontFamily: "'DM Mono',monospace",
          fontSize: 8,
          color: "rgba(245,158,11,0.25)",
          letterSpacing: "0.5em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {new Date().getFullYear()} · HEADZ UP
      </p>

      {/* Main content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}
      >
        {/* Animated scissors */}
        <div style={{ marginBottom: 24 }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <line
              x1={open ? 8 : 3}
              y1={open ? 10 : 20}
              x2="34"
              y2="34"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{ transition: "all 0.28s cubic-bezier(0.4,0,0.2,1)" }}
            />
            <line
              x1={open ? 8 : 3}
              y1={open ? 30 : 20}
              x2="34"
              y2="6"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{ transition: "all 0.28s cubic-bezier(0.4,0,0.2,1)" }}
            />
            <circle
              cx={open ? 6 : 3}
              cy={open ? 9 : 20}
              r="3.5"
              stroke="#f59e0b"
              strokeWidth="1"
              fill="none"
              style={{ transition: "all 0.28s cubic-bezier(0.4,0,0.2,1)" }}
            />
            <circle
              cx={open ? 6 : 3}
              cy={open ? 31 : 20}
              r="3.5"
              stroke="#f59e0b"
              strokeWidth="1"
              fill="none"
              style={{ transition: "all 0.28s cubic-bezier(0.4,0,0.2,1)" }}
            />
          </svg>
        </div>

        {/* Wordmark */}
        <div
          style={{
            position: "relative",
            marginBottom: 4,
            animation: "ls-flick 10s ease infinite",
          }}
        >
          <h1
            style={{
              fontFamily: "'Syncopate',sans-serif",
              fontSize: "clamp(2.6rem,9vw,4rem)",
              fontWeight: 900,
              letterSpacing: "-0.06em",
              textTransform: "uppercase",
              color: "white",
              margin: 0,
              lineHeight: 1,
            }}
          >
            HEADZ
            <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
          </h1>
          {/* Glitch layer */}
          <h1
            aria-hidden
            style={{
              fontFamily: "'Syncopate',sans-serif",
              fontSize: "clamp(2.6rem,9vw,4rem)",
              fontWeight: 900,
              letterSpacing: "-0.06em",
              textTransform: "uppercase",
              color: "#f59e0b",
              margin: 0,
              lineHeight: 1,
              position: "absolute",
              inset: 0,
              clipPath: "inset(35% 0 45% 0)",
              transform: "translateX(-2px)",
              opacity: 0.6,
              pointerEvents: "none",
              animation: "ls-flick 3s ease infinite 1.5s",
            }}
          >
            HEADZ<span style={{ fontStyle: "italic" }}>UP</span>
          </h1>
        </div>

        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 9,
            color: "rgba(245,158,11,0.45)",
            letterSpacing: "0.5em",
            textTransform: "uppercase",
            marginBottom: 32,
          }}
        >
          Hattiesburg, MS
        </p>

        {/* Rotating line type */}
        <div style={{ height: 18, marginBottom: 24, overflow: "hidden" }}>
          <p
            key={lIdx}
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 9,
              color: "rgba(245,158,11,0.55)",
              letterSpacing: "0.6em",
              textTransform: "uppercase",
              margin: 0,
              animation: "ls-word 0.4s ease forwards",
            }}
          >
            {LINES[lIdx]}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ width: "min(300px,75vw)", marginBottom: 10 }}>
          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.05)",
              position: "relative",
              overflow: "hidden",
              clipPath:
                "polygon(0 0,calc(100% - 4px) 0,100% 4px,100% 100%,4px 100%,0 calc(100% - 4px))",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "linear-gradient(to right,#f59e0b,#fbbf24)",
                width: `${progress}%`,
                transition: "width 0.1s linear",
                boxShadow: "0 0 12px rgba(245,158,11,0.5)",
              }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
              color: "#f59e0b",
              minWidth: 36,
              textAlign: "right",
              fontWeight: 500,
            }}
          >
            {progress}%
          </span>
          <div
            style={{
              width: 1,
              height: 10,
              background: "rgba(255,255,255,0.08)",
            }}
          />
          <div style={{ height: 14, overflow: "hidden" }}>
            <p
              key={wIdx}
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 9,
                color: "rgba(245,158,11,0.35)",
                letterSpacing: "0.4em",
                textTransform: "uppercase",
                margin: 0,
                animation: "ls-word 0.4s ease forwards",
              }}
            >
              {WORDS[wIdx]}
            </p>
          </div>
          <div
            style={{
              width: 1,
              height: 10,
              background: "rgba(255,255,255,0.08)",
            }}
          />
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 8,
              color: "rgba(245,158,11,0.2)",
              animation: "ls-blink 0.9s ease infinite",
            }}
          >
            ▮
          </span>
        </div>
      </div>

      <p
        style={{
          position: "absolute",
          bottom: 20,
          fontFamily: "'DM Mono',monospace",
          fontSize: 8,
          color: "rgba(245,158,11,0.2)",
          letterSpacing: "0.5em",
          textTransform: "uppercase",
          animation: "ls-pulse 3.5s ease infinite",
        }}
      >
        4 Hub Dr · Hattiesburg, MS 39402
      </p>
    </div>
  );
}
