"use client";

import { useEffect, useState } from "react";

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("in"); // in | out
  const [visible, setVisible] = useState(true);

  const STATUS = ["Initializing", "Loading assets", "Almost ready", "Let's go"];
  const statusIdx =
    progress < 30 ? 0 : progress < 65 ? 1 : progress < 90 ? 2 : 3;

  useEffect(() => {
    let prog = 0;
    const tick = setInterval(() => {
      prog = Math.min(prog + Math.random() * 14 + 3, 100);
      setProgress(prog);
      if (prog >= 100) {
        clearInterval(tick);
        setTimeout(() => setPhase("out"), 300);
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 1000);
      }
    }, 75);
    return () => clearInterval(tick);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#040404",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: phase === "out" ? 0 : 1,
        transition: "opacity 0.7s cubic-bezier(0.4,0,0.2,1)",
        pointerEvents: phase === "out" ? "none" : "all",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        @keyframes ls-spin    { to { transform: rotate(360deg); } }
        @keyframes ls-unspin  { to { transform: rotate(-360deg); } }
        @keyframes ls-breathe { 0%,100%{opacity:.45} 50%{opacity:1} }
        @keyframes ls-glow    { 0%,100%{opacity:.5;transform:translate(-50%,-50%) scale(1)} 50%{opacity:.85;transform:translate(-50%,-50%) scale(1.1)} }
        @keyframes ls-up      { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ls-bounce  { 0%,100%{opacity:.2;transform:translateY(0)} 50%{opacity:.9;transform:translateY(-5px)} }
        @keyframes ls-shimmer { 0%{transform:translateX(-200%)} 100%{transform:translateX(300%)} }
        @keyframes ls-corner  { from{opacity:0;transform:scale(0.6)} to{opacity:1;transform:scale(1)} }
      `}</style>

      {/* Grain */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.03,
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.svg')",
        }}
      />

      {/* Amber glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 520,
          height: 520,
          background:
            "radial-gradient(circle, rgba(245,158,11,0.09) 0%, transparent 65%)",
          pointerEvents: "none",
          animation: "ls-glow 2.5s ease-in-out infinite",
        }}
      />

      {/* Corner brackets */}
      {[
        {
          top: 20,
          left: 20,
          borderTop: "1px solid rgba(245,158,11,0.3)",
          borderLeft: "1px solid rgba(245,158,11,0.3)",
        },
        {
          top: 20,
          right: 20,
          borderTop: "1px solid rgba(245,158,11,0.3)",
          borderRight: "1px solid rgba(245,158,11,0.3)",
        },
        {
          bottom: 20,
          left: 20,
          borderBottom: "1px solid rgba(245,158,11,0.3)",
          borderLeft: "1px solid rgba(245,158,11,0.3)",
        },
        {
          bottom: 20,
          right: 20,
          borderBottom: "1px solid rgba(245,158,11,0.3)",
          borderRight: "1px solid rgba(245,158,11,0.3)",
        },
      ].map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 26,
            height: 26,
            ...s,
            animation: `ls-corner 0.5s ease ${i * 0.07}s both`,
          }}
        />
      ))}

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Spinner ring */}
        <div
          style={{
            position: "relative",
            width: 104,
            height: 104,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "1px solid transparent",
              borderTopColor: "#f59e0b",
              borderRightColor: "rgba(245,158,11,0.2)",
              animation: "ls-spin 1.1s linear infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 13,
              borderRadius: "50%",
              border: "1px solid transparent",
              borderBottomColor: "rgba(245,158,11,0.4)",
              borderLeftColor: "rgba(245,158,11,0.15)",
              animation: "ls-unspin 1.9s linear infinite",
            }}
          />
          {/* Dot on ring */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              width: 5,
              height: 5,
              marginLeft: -2.5,
              background: "#f59e0b",
              borderRadius: "50%",
              animation: "ls-spin 1.1s linear infinite",
            }}
          />
          {/* HZ inside */}
          <span
            style={{
              fontFamily: "'Syncopate',sans-serif",
              fontWeight: 900,
              fontSize: 12,
              color: "white",
              letterSpacing: "-0.02em",
              animation: "ls-breathe 2.2s ease-in-out infinite",
            }}
          >
            HZ
          </span>
        </div>

        {/* Wordmark */}
        <div
          style={{
            textAlign: "center",
            animation: "ls-up 0.7s ease 0.1s both",
          }}
        >
          <p
            style={{
              fontFamily: "'Syncopate',sans-serif",
              fontWeight: 900,
              fontSize: "clamp(1.8rem,6vw,3rem)",
              letterSpacing: "-0.05em",
              textTransform: "uppercase",
              lineHeight: 1,
              margin: 0,
            }}
          >
            HEADZ
            <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
          </p>
          <p
            style={{
              fontFamily: "'DM Serif Display',serif",
              fontStyle: "italic",
              fontSize: 13,
              color: "#3f3f46",
              marginTop: 8,
            }}
          >
            Barbershop · Hattiesburg, MS
          </p>
        </div>

        {/* Progress */}
        <div
          style={{
            width: 252,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            animation: "ls-up 0.7s ease 0.25s both",
          }}
        >
          <div
            style={{
              width: "100%",
              height: 1,
              background: "rgba(255,255,255,0.06)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, rgba(245,158,11,0.5), #f59e0b)",
                transition: "width 0.1s linear",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                  animation: "ls-shimmer 1.2s ease-in-out infinite",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontStyle: "italic",
                fontSize: 9,
                color: "#3f3f46",
                letterSpacing: "0.1em",
              }}
            >
              {STATUS[statusIdx]}
            </span>
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 10,
                color: "#f59e0b",
                fontWeight: 500,
              }}
            >
              {Math.floor(progress)}%
            </span>
          </div>
        </div>

        {/* Bounce dots */}
        <div
          style={{
            display: "flex",
            gap: 7,
            animation: "ls-up 0.7s ease 0.4s both",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "#f59e0b",
                animation: `ls-bounce 1.3s ease-in-out ${i * 0.18}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom tag */}
      <p
        style={{
          position: "absolute",
          bottom: 24,
          fontFamily: "'Syncopate',sans-serif",
          fontSize: 7,
          letterSpacing: "0.55em",
          textTransform: "uppercase",
          color: "#1a1a1a",
          animation: "ls-up 0.7s ease 0.6s both",
        }}
      >
        ESTD. 2026 · HATTIESBURG
      </p>
    </div>
  );
}
