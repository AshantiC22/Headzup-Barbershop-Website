"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/lib/LoadingScreen";
import useBreakpoint from "@/lib/useBreakpoint";

const D = { fontFamily: "'Syncopate',sans-serif" };
const M = { fontFamily: "'DM Mono',monospace" };

/* ── PERSONA SELECT ─────────────────────────────────────────────────────── */
function PersonaSelect({ barbers, book, isMobile }) {
  const [sel, setSel] = useState(0);
  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState(false);
  const list = barbers.length
    ? barbers
    : [{ id: 0, name: "Barber", bio: "", photo_url: null }];
  const active = list[sel] || list[0];
  const STATS = [
    { k: "Fade", v: 98 },
    { k: "Lineup", v: 99 },
    { k: "Beard", v: 95 },
    { k: "Precision", v: 97 },
    { k: "Vibe", v: 100 },
  ];
  const lock = (e) => {
    setFlash(true);
    setLocked(true);
    setTimeout(() => setFlash(false), 700);
    book(e);
  };

  return (
    <section
      id="barber"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#000",
        minHeight: isMobile ? "auto" : "100vh",
        display: "flex",
        alignItems: "center",
      }}
    >
      <style>{`
        .ps-flash{animation:lockin 0.7s ease;}
        .ps-name{animation:nameIn 0.5s cubic-bezier(0.16,1,0.3,1) both;}
        .ps-bar{animation:statgrow 1s cubic-bezier(0.4,0,0.2,1) both;}
        .ps-row{transition:background 0.2s,border-color 0.2s;cursor:pointer;}
        .ps-row:hover{background:rgba(245,158,11,0.06)!important;}
        @keyframes lockin{0%,100%{opacity:1}20%,60%{opacity:0}40%,80%{opacity:0.5}}
        @keyframes nameIn{from{opacity:0;transform:translateX(-24px) skewX(-4deg)}to{opacity:1;transform:none}}
        @keyframes statgrow{from{width:0}to{width:var(--w,100%)}}
        @keyframes scanH{from{left:-60%}to{left:160%}}
        @keyframes rgbShift{0%{text-shadow:2px 0 #f59e0b,-2px 0 rgba(245,158,11,0.3)}50%{text-shadow:-2px 0 rgba(245,158,11,0.5),2px 0 #f59e0b}100%{text-shadow:2px 0 #f59e0b,-2px 0 rgba(245,158,11,0.3)}}
      `}</style>

      {/* Bleed bg photo */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {active.photo_url || active.photo ? (
          <img
            key={`bg-${active.id}`}
            src={active.photo_url || active.photo}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              filter: "brightness(0.1) saturate(0.2)",
              transition: "opacity 1s",
            }}
          />
        ) : null}
        {/* Heavy vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right,#000 0%,rgba(0,0,0,0.88) 40%,rgba(0,0,0,0.6) 65%,rgba(0,0,0,0.85) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom,#000 0%,transparent 20%,transparent 80%,#000 100%)",
          }}
        />
        {/* Scanline */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "40%",
            background:
              "linear-gradient(to right,transparent,rgba(245,158,11,0.03),transparent)",
            animation: "scanH 6s linear infinite",
            pointerEvents: "none",
          }}
        />
        {/* CRT scanlines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.12) 2px,rgba(0,0,0,0.12) 3px)",
            pointerEvents: "none",
          }}
        />
        {/* Grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(245,158,11,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.03) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
            pointerEvents: "none",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 1320,
          margin: "0 auto",
          padding: isMobile ? "44px 20px 52px" : "0 44px",
        }}
      >
        {/* Header label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: isMobile ? 28 : 48,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{ ...D, fontSize: 10, color: "#f59e0b", fontWeight: 900 }}
            >
              B
            </span>
          </div>
          <span
            style={{
              ...M,
              fontSize: 8,
              color: "#f59e0b",
              letterSpacing: "0.6em",
              textTransform: "uppercase",
            }}
          >
            SELECT YOUR BARBER
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background:
                "linear-gradient(to right,rgba(245,158,11,0.3),transparent)",
            }}
          />
          <span
            style={{
              ...M,
              fontSize: 8,
              color: "rgba(245,158,11,0.3)",
              letterSpacing: "0.3em",
            }}
          >
            {String(sel + 1).padStart(2, "0")} /{" "}
            {String(list.length).padStart(2, "0")}
          </span>
        </div>

        {isMobile ? (
          /* Mobile layout */
          <div>
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 10,
                marginBottom: 24,
              }}
            >
              {list.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSel(i);
                    setLocked(false);
                  }}
                  style={{
                    flexShrink: 0,
                    width: 90,
                    height: 115,
                    border: `2px solid ${i === sel ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                    background: "#0a0a0a",
                    overflow: "hidden",
                    padding: 0,
                    position: "relative",
                    cursor: "pointer",
                    minHeight: "auto",
                    minWidth: "auto",
                    filter: i === sel ? "none" : "brightness(0.35)",
                    transition: "filter 0.3s",
                  }}
                >
                  {b.photo_url || b.photo ? (
                    <img
                      src={b.photo_url || b.photo}
                      alt={b.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center top",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#111",
                      }}
                    >
                      <span
                        style={{
                          ...D,
                          fontSize: 28,
                          color: "#f59e0b",
                          fontWeight: 900,
                        }}
                      >
                        {(b.name || "?").charAt(0)}
                      </span>
                    </div>
                  )}
                  {i === sel && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: "#f59e0b",
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: "absolute",
                      top: 5,
                      right: 5,
                      width: 6,
                      height: 6,
                      background: "#22c55e",
                      borderRadius: "50%",
                      border: "1.5px solid #000",
                    }}
                  />
                </button>
              ))}
            </div>
            <div className={flash ? "ps-flash" : ""}>
              <p
                style={{
                  ...M,
                  fontSize: 8,
                  color: "#f59e0b",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {locked ? "✓ LOCKED IN" : "BARBER PROFILE"}
              </p>
              <h2
                key={`m-${active.id}`}
                className="ps-name"
                style={{
                  ...D,
                  fontSize: "clamp(2rem,8vw,2.8rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  lineHeight: 1.05,
                  marginBottom: 12,
                  color: locked ? "#f59e0b" : "white",
                }}
              >
                {active.name}
              </h2>
              {active.bio && (
                <p
                  style={{
                    ...M,
                    fontSize: 12,
                    color: "#52525b",
                    lineHeight: 1.7,
                    marginBottom: 16,
                  }}
                >
                  {active.bio}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                {STATS.map((s) => (
                  <div
                    key={s.k}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{
                        ...M,
                        fontSize: 7,
                        color: "#52525b",
                        letterSpacing: "0.3em",
                        textTransform: "uppercase",
                        width: 60,
                        flexShrink: 0,
                      }}
                    >
                      {s.k}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 2,
                        background: "rgba(255,255,255,0.05)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        className="ps-bar"
                        key={`ms-${active.id}-${s.k}`}
                        style={{
                          position: "absolute",
                          inset: "0 auto 0 0",
                          background:
                            "linear-gradient(to right,#f59e0b,#fbbf24)",
                          "--w": `${s.v}%`,
                          width: `${s.v}%`,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        ...M,
                        fontSize: 9,
                        color: "#f59e0b",
                        minWidth: 24,
                        textAlign: "right",
                      }}
                    >
                      {s.v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {!locked ? (
              <button
                onClick={lock}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "#f59e0b",
                  color: "black",
                  ...D,
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Book {active.name} →
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={lock}
                  style={{
                    flex: 1,
                    padding: "16px",
                    background: "#22c55e",
                    color: "black",
                    ...D,
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ✓ Confirm Booking
                </button>
                <button
                  onClick={() => setLocked(false)}
                  style={{
                    padding: "16px 18px",
                    background: "transparent",
                    color: "#52525b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    ...M,
                    fontSize: 10,
                    minHeight: "auto",
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Desktop — full cinematic split layout */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "380px 1fr",
              gap: 0,
              minHeight: "80vh",
              alignItems: "stretch",
            }}
          >
            {/* Left — roster */}
            <div
              style={{
                borderRight: "1px solid rgba(245,158,11,0.15)",
                paddingRight: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                paddingTop: 60,
                paddingBottom: 60,
              }}
            >
              <p
                style={{
                  ...M,
                  fontSize: 7,
                  color: "rgba(245,158,11,0.3)",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  marginBottom: 20,
                  paddingLeft: 4,
                }}
              >
                — FIGHTER SELECT —
              </p>
              {list.map((b, i) => (
                <div
                  key={b.id}
                  onClick={() => {
                    setSel(i);
                    setLocked(false);
                  }}
                  className="ps-row"
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    background:
                      i === sel ? "rgba(245,158,11,0.05)" : "transparent",
                    border: `1px solid ${i === sel ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.05)"}`,
                    marginBottom: 6,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {i === sel && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        background: "#f59e0b",
                      }}
                    />
                  )}
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: 80,
                      height: 100,
                      flexShrink: 0,
                      overflow: "hidden",
                      background: "#0a0a0a",
                      marginLeft: i === sel ? 3 : 0,
                    }}
                  >
                    {b.photo_url || b.photo ? (
                      <img
                        src={b.photo_url || b.photo}
                        alt={b.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center top",
                          filter:
                            i === sel
                              ? "none"
                              : "brightness(0.4) saturate(0.4)",
                          transition: "filter 0.35s",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            ...D,
                            fontSize: 28,
                            color: "#f59e0b",
                            fontWeight: 900,
                          }}
                        >
                          {(b.name || "?").charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div
                    style={{
                      flex: 1,
                      padding: "16px 16px 16px 14px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <p
                      style={{
                        ...M,
                        fontSize: 7,
                        color: i === sel ? "#f59e0b" : "rgba(245,158,11,0.25)",
                        letterSpacing: "0.4em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                        transition: "color 0.25s",
                      }}
                    >
                      BARBER #{String(i + 1).padStart(2, "0")}
                    </p>
                    <p
                      style={{
                        ...D,
                        fontSize: 14,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        color: i === sel ? "white" : "#3f3f46",
                        letterSpacing: "-0.02em",
                        transition: "color 0.25s",
                      }}
                    >
                      {b.name}
                    </p>
                  </div>
                  {i === sel && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        paddingRight: 14,
                      }}
                    >
                      <span
                        style={{
                          ...M,
                          fontSize: 7,
                          color: "black",
                          background: "#f59e0b",
                          padding: "3px 9px",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {locked ? "LOCKED" : "ACTIVE"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {/* Instruction */}
              <div
                style={{
                  marginTop: 20,
                  padding: "14px 16px",
                  borderLeft: "2px solid rgba(245,158,11,0.25)",
                  background: "rgba(245,158,11,0.03)",
                }}
              >
                <p
                  style={{
                    ...M,
                    fontSize: 9,
                    color: "#3f3f46",
                    lineHeight: 1.8,
                  }}
                >
                  {locked
                    ? `✓ ${active.name} selected — confirm below`
                    : "Pick your barber, lock them in"}
                </p>
              </div>
            </div>

            {/* Right — big display */}
            <div
              className={flash ? "ps-flash" : ""}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                paddingLeft: 52,
              }}
            >
              {/* Massive photo */}
              <div
                style={{
                  position: "relative",
                  height: 520,
                  marginBottom: 32,
                  overflow: "hidden",
                }}
              >
                {/* Angled clip */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    overflow: "hidden",
                    clipPath:
                      "polygon(0 0,calc(100% - 24px) 0,100% 24px,100% 100%,24px 100%,0 calc(100% - 24px))",
                  }}
                >
                  {active.photo_url || active.photo ? (
                    <img
                      key={`hero-${active.id}`}
                      src={active.photo_url || active.photo}
                      alt={active.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center top",
                        display: "block",
                        transition: "opacity 0.6s",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: "linear-gradient(135deg,#0a0a0a,#111)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          ...D,
                          fontSize: 180,
                          color: "rgba(245,158,11,0.04)",
                          fontWeight: 900,
                          userSelect: "none",
                        }}
                      >
                        {(active.name || "?").charAt(0)}
                      </span>
                    </div>
                  )}
                  {/* Gradient overlays */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to top,rgba(0,0,0,0.97) 0%,rgba(0,0,0,0.4) 35%,transparent 65%)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to right,rgba(0,0,0,0.55) 0%,transparent 40%)",
                    }}
                  />
                  {/* CRT effect */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage:
                        "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 3px)",
                      pointerEvents: "none",
                    }}
                  />
                </div>

                {/* Corner brackets */}
                {[
                  { t: 8, l: 8, bt: 1, bl: 1 },
                  { t: 8, r: 8, bt: 1, br: 1 },
                  { b: 8, l: 8, bb: 1, bl: 1 },
                  { b: 8, r: 8, bb: 1, br: 1 },
                ].map((c, j) => (
                  <div
                    key={j}
                    style={{
                      position: "absolute",
                      width: 18,
                      height: 18,
                      top: c.t,
                      bottom: c.b,
                      left: c.l,
                      right: c.r,
                      borderTop: c.bt && "1px solid rgba(245,158,11,0.7)",
                      borderBottom: c.bb && "1px solid rgba(245,158,11,0.7)",
                      borderLeft: c.bl && "1px solid rgba(245,158,11,0.7)",
                      borderRight: c.br && "1px solid rgba(245,158,11,0.7)",
                    }}
                  />
                ))}

                {/* Info overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "24px 28px",
                  }}
                >
                  <p
                    style={{
                      ...M,
                      fontSize: 8,
                      color: "rgba(245,158,11,0.7)",
                      letterSpacing: "0.55em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    HEADZ UP · BARBER
                  </p>
                  <h2
                    key={`d-${active.id}`}
                    className="ps-name"
                    style={{
                      ...D,
                      fontSize: "clamp(2.2rem,3.8vw,3.2rem)",
                      fontWeight: 900,
                      letterSpacing: "-0.05em",
                      lineHeight: 1,
                      color: "white",
                      marginBottom: active.bio ? 10 : 12,
                    }}
                  >
                    {active.name}
                  </h2>
                  {active.bio && (
                    <p
                      style={{
                        ...M,
                        fontSize: 12,
                        color: "rgba(255,255,255,0.45)",
                        lineHeight: 1.6,
                        maxWidth: 460,
                        marginBottom: 12,
                      }}
                    >
                      {active.bio}
                    </p>
                  )}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        background: "#22c55e",
                        borderRadius: "50%",
                        boxShadow: "0 0 0 0 rgba(34,197,94,0.5)",
                        animation: "glow-green 2s infinite",
                      }}
                    />
                    <span
                      style={{
                        ...M,
                        fontSize: 9,
                        color: "#4ade80",
                        letterSpacing: "0.3em",
                        textTransform: "uppercase",
                      }}
                    >
                      Accepting Clients Now
                    </span>
                  </div>
                </div>

                {/* HUD badge top right */}
                <div style={{ position: "absolute", top: 16, right: 16 }}>
                  <div
                    style={{
                      background: "rgba(245,158,11,0.1)",
                      border: "1px solid rgba(245,158,11,0.4)",
                      padding: "5px 10px",
                    }}
                  >
                    <span
                      style={{
                        ...M,
                        fontSize: 7,
                        color: "#f59e0b",
                        letterSpacing: "0.35em",
                        textTransform: "uppercase",
                      }}
                    >
                      HEADZ UP
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats + profile row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 28,
                  marginBottom: 24,
                }}
              >
                {/* Stat bars */}
                <div>
                  <p
                    style={{
                      ...M,
                      fontSize: 7,
                      color: "rgba(245,158,11,0.35)",
                      letterSpacing: "0.5em",
                      textTransform: "uppercase",
                      marginBottom: 16,
                    }}
                  >
                    // SKILL_STATS
                  </p>
                  {STATS.map((s) => (
                    <div
                      key={s.k}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 11,
                      }}
                    >
                      <span
                        style={{
                          ...M,
                          fontSize: 8,
                          color: "#52525b",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          width: 70,
                          flexShrink: 0,
                        }}
                      >
                        {s.k}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 2,
                          background: "rgba(255,255,255,0.05)",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          className="ps-bar"
                          key={`d-${active.id}-${s.k}`}
                          style={{
                            position: "absolute",
                            inset: "0 auto 0 0",
                            background:
                              "linear-gradient(to right,#f59e0b,#fbbf24)",
                            "--w": `${s.v}%`,
                            width: `${s.v}%`,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          ...M,
                          fontSize: 9,
                          color: "#f59e0b",
                          minWidth: 28,
                          textAlign: "right",
                        }}
                      >
                        {s.v}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Profile */}
                <div>
                  <p
                    style={{
                      ...M,
                      fontSize: 7,
                      color: "rgba(245,158,11,0.35)",
                      letterSpacing: "0.5em",
                      textTransform: "uppercase",
                      marginBottom: 16,
                    }}
                  >
                    // PROFILE_DATA
                  </p>
                  {[
                    ["SHOP", "HEADZ UP"],
                    ["CITY", "Hattiesburg, MS"],
                    ["STYLE", "Precision Cuts"],
                    ["RATING", "★★★★★"],
                    ["STATUS", "● ONLINE"],
                  ].map(([l, v]) => (
                    <div
                      key={l}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: 9,
                        marginBottom: 9,
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <span
                        style={{
                          ...M,
                          fontSize: 7,
                          color: "#3f3f46",
                          letterSpacing: "0.25em",
                          textTransform: "uppercase",
                        }}
                      >
                        {l}
                      </span>
                      <span
                        style={{
                          ...M,
                          fontSize: 10,
                          color: v.startsWith("●")
                            ? "#4ade80"
                            : v.startsWith("★")
                              ? "#f59e0b"
                              : "#a1a1aa",
                        }}
                      >
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                {!locked ? (
                  <>
                    <button
                      onClick={lock}
                      style={{
                        flex: 1,
                        padding: "18px 24px",
                        background: "#f59e0b",
                        color: "black",
                        ...D,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        border: "none",
                        cursor: "pointer",
                        clipPath:
                          "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                        transition: "background 0.25s",
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "white")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "#f59e0b")
                      }
                    >
                      Lock In — Book {active.name} →
                    </button>
                    <a
                      href="/book"
                      onClick={book}
                      style={{
                        padding: "18px 24px",
                        background: "transparent",
                        color: "#52525b",
                        ...D,
                        fontSize: 9,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        border: "1px solid rgba(255,255,255,0.1)",
                        cursor: "pointer",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        transition: "all 0.2s",
                        clipPath:
                          "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(245,158,11,0.4)";
                        e.currentTarget.style.color = "#f59e0b";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.1)";
                        e.currentTarget.style.color = "#52525b";
                      }}
                    >
                      All →
                    </a>
                  </>
                ) : (
                  <>
                    <button
                      onClick={lock}
                      style={{
                        flex: 1,
                        padding: "18px 24px",
                        background: "#22c55e",
                        color: "black",
                        ...D,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        border: "none",
                        cursor: "pointer",
                        clipPath:
                          "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                      }}
                    >
                      ✓ CONFIRMED — BOOK NOW
                    </button>
                    <button
                      onClick={() => setLocked(false)}
                      style={{
                        padding: "18px 22px",
                        background: "transparent",
                        color: "#52525b",
                        border: "1px solid rgba(255,255,255,0.1)",
                        cursor: "pointer",
                        ...D,
                        fontSize: 8,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "white";
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#52525b";
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.1)";
                      }}
                    >
                      ← CHANGE
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── GALLERY ────────────────────────────────────────────────────────────── */
const GALLERY = [
  {
    url: "/pictures/IMG_20260331_115011 (2).jpg",
    label: "Precision Fade",
    sub: "Signature cut",
  },
  {
    url: "/pictures/IMG_20260331_115011 (3).jpg",
    label: "Clean Lineup",
    sub: "Sharp edges",
  },
  {
    url: "/pictures/IMG_20260331_115011 (4).jpg",
    label: "Beard Trim",
    sub: "Sculpted look",
  },
  {
    url: "/pictures/IMG_20260331_115011 (5).jpg",
    label: "Kids Cutz",
    sub: "Ages 1–12",
  },
  {
    url: "/pictures/IMG_20260331_115011 (6).jpg",
    label: "Full Experience",
    sub: "Cut & shave",
  },
  {
    url: "/pictures/IMG_20260331_115011 (7).jpg",
    label: "The Chair",
    sub: "Your throne",
  },
];

function GalleryCarousel({ isMobile }) {
  const [angle, setAngle] = useState(0);
  const [active, setActive] = useState(0);
  const [spinning, setSpinning] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const rafRef = useRef(null);
  const angRef = useRef(0);
  const N = GALLERY.length;
  const STEP = 360 / N;
  const R = isMobile ? 155 : 275;
  const W = isMobile ? 158 : 232;
  const H = isMobile ? 198 : 295;

  useEffect(() => {
    if (!spinning) return;
    const tick = () => {
      angRef.current = (angRef.current + 0.3) % 360;
      setAngle(angRef.current);
      let i = Math.round(((360 - angRef.current) % 360) / STEP) % N;
      if (i < 0) i += N;
      setActive(i);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spinning]);

  const ds = (e) => {
    setSpinning(false);
    cancelAnimationFrame(rafRef.current);
    setDragging(true);
    setStartX(e.touches ? e.touches[0].clientX : e.clientX);
  };
  const dm = (e) => {
    if (!dragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    angRef.current = (angRef.current + (x - startX) * 0.5) % 360;
    setAngle(angRef.current);
    let i = Math.round(((360 - angRef.current) % 360) / STEP) % N;
    if (i < 0) i += N;
    setActive(i);
    setStartX(x);
  };
  const de = () => {
    setDragging(false);
    setTimeout(() => setSpinning(true), 700);
  };
  const go = (i) => {
    setSpinning(false);
    cancelAnimationFrame(rafRef.current);
    angRef.current = (360 - i * STEP) % 360;
    setAngle(angRef.current);
    setActive(i);
    setTimeout(() => setSpinning(true), 1400);
  };

  return (
    <section
      style={{
        padding: isMobile ? "44px 0 52px" : "80px 0 92px",
        overflow: "hidden",
        background: "#000",
        borderTop: "1px solid rgba(245,158,11,0.1)",
        borderBottom: "1px solid rgba(245,158,11,0.1)",
        position: "relative",
      }}
    >
      <style>{`@keyframes gc-pulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0)}50%{box-shadow:0 0 50px rgba(245,158,11,0.35)}} .gc-active{animation:gc-pulse 2.5s ease-in-out infinite;}`}</style>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 600,
          height: 500,
          background:
            "radial-gradient(ellipse,rgba(245,158,11,0.05) 0%,transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          textAlign: "center",
          marginBottom: isMobile ? 28 : 44,
          padding: "0 20px",
        }}
      >
        <p
          style={{
            ...M,
            fontSize: 8,
            color: "rgba(245,158,11,0.5)",
            letterSpacing: "0.7em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          // THE_WORK
        </p>
        <h2
          style={{
            ...D,
            fontSize: "clamp(1.4rem,4vw,2.4rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            textTransform: "uppercase",
          }}
        >
          Fresh Every{" "}
          <span style={{ color: "#f59e0b", fontStyle: "italic" }}>Time_</span>
        </h2>
      </div>
      <div
        style={{
          position: "relative",
          height: isMobile ? 262 : 392,
          perspective: isMobile ? 600 : 920,
          perspectiveOrigin: "50% 50%",
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "none",
        }}
        onMouseDown={ds}
        onMouseMove={dm}
        onMouseUp={de}
        onMouseLeave={de}
        onTouchStart={ds}
        onTouchMove={dm}
        onTouchEnd={de}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transformStyle: "preserve-3d",
            transform: `translate(-50%,-50%) rotateY(${angle}deg)`,
          }}
        >
          {GALLERY.map((g, i) => {
            const front = i === active;
            return (
              <div
                key={i}
                className={front ? "gc-active" : ""}
                onClick={() => go(i)}
                style={{
                  position: "absolute",
                  width: W,
                  height: H,
                  left: -W / 2,
                  top: -H / 2,
                  transform: `rotateY(${i * STEP}deg) translateZ(${R}px)`,
                  overflow: "hidden",
                  cursor: "pointer",
                  backfaceVisibility: "hidden",
                  border: front
                    ? "2px solid #f59e0b"
                    : "1px solid rgba(255,255,255,0.06)",
                  clipPath: front
                    ? "polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,14px 100%,0 calc(100% - 14px))"
                    : "none",
                }}
              >
                <img
                  src={g.url}
                  alt={g.label}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center top",
                    filter: front ? "none" : "brightness(0.25) saturate(0.3)",
                    transition: "filter 0.45s",
                    pointerEvents: "none",
                  }}
                  loading="lazy"
                />
                {front && (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background:
                          "linear-gradient(to top,rgba(0,0,0,0.97),rgba(0,0,0,0.6) 60%,transparent)",
                        padding: isMobile ? "10px 12px 14px" : "14px 16px 18px",
                      }}
                    >
                      <p
                        style={{
                          ...D,
                          fontSize: isMobile ? 9 : 10,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          color: "white",
                          marginBottom: 3,
                        }}
                      >
                        {g.label}
                      </p>
                      <p
                        style={{
                          ...M,
                          fontSize: 9,
                          color: "#f59e0b",
                          letterSpacing: "0.22em",
                        }}
                      >
                        {g.sub}
                      </p>
                    </div>
                    {[
                      { t: 5, l: 5, bt: "1px", bl: "1px" },
                      { t: 5, r: 5, bt: "1px", br: "1px" },
                      { b: 5, l: 5, bb: "1px", bl: "1px" },
                      { b: 5, r: 5, bb: "1px", br: "1px" },
                    ].map((c, j) => (
                      <div
                        key={j}
                        style={{
                          position: "absolute",
                          width: 10,
                          height: 10,
                          top: c.t,
                          bottom: c.b,
                          left: c.l,
                          right: c.r,
                          borderTop: c.bt && "1px solid rgba(245,158,11,0.9)",
                          borderBottom:
                            c.bb && "1px solid rgba(245,158,11,0.9)",
                          borderLeft: c.bl && "1px solid rgba(245,158,11,0.9)",
                          borderRight: c.br && "1px solid rgba(245,158,11,0.9)",
                        }}
                      />
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: "14%",
            right: "14%",
            height: 1,
            background:
              "linear-gradient(to right,transparent,rgba(245,158,11,0.2),transparent)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          marginTop: isMobile ? 16 : 22,
        }}
      >
        {GALLERY.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            style={{
              width: i === active ? 22 : 6,
              height: 4,
              background: i === active ? "#f59e0b" : "rgba(255,255,255,0.14)",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "all 0.3s",
              minHeight: "auto",
              minWidth: "auto",
            }}
          />
        ))}
      </div>
      <p
        style={{
          ...M,
          fontSize: 8,
          color: "#27272a",
          textAlign: "center",
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          marginTop: 14,
        }}
      >
        ✦ DRAG TO SPIN ✦
      </p>
    </section>
  );
}

/* ── DATA ───────────────────────────────────────────────────────────────── */
const SERVICES = [
  { name: "Haircut & Shave", price: 35, dur: "30 min", pop: true },
  { name: "Haircut", price: 30, dur: "30 min", pop: false },
  { name: "Senior Cut and Shave", price: 30, dur: "30 min", pop: false },
  { name: "Kids Cutz (1–12)", price: 25, dur: "30 min", pop: false },
  { name: "Line and Shave", price: 25, dur: "30 min", pop: false },
  { name: "Senior Cut", price: 25, dur: "30 min", pop: false },
  { name: "Beard Trim", price: 20, dur: "15 min", pop: false },
  { name: "Line", price: 20, dur: "15 min", pop: false },
  { name: "Shave", price: 20, dur: "30 min", pop: false },
  { name: "Kids Line", price: 15, dur: "30 min", pop: false },
  { name: "Senior Line", price: 15, dur: "30 min", pop: false },
];
const REVIEWS = [
  {
    q: "This man is an amazing barber with great energy and a great personality. Most importantly the cuts are fire!! Go book with him.",
    name: "Ronnie E.",
    city: "Hattiesburg",
  },
  {
    q: "Best fade in Hattiesburg, hands down. I drive 40 minutes just to sit in that chair. Worth every mile.",
    name: "Marcus T.",
    city: "Laurel",
  },
  {
    q: "Came in first time, walked out looking like a new man. The lineup was immaculate. Already booked my next one.",
    name: "DeShawn K.",
    city: "Hattiesburg",
  },
  {
    q: "My son has been going here since he was 3. Fantastic with kids and the cut is always perfect.",
    name: "Tanya W.",
    city: "Hattiesburg",
  },
];
const TICKER = [
  "Precision Fades",
  "Clean Lineups",
  "Kids Cutz",
  "Beard Trims",
  "Senior Cuts",
  "Book Online 24/7",
  "Hattiesburg MS",
  "HEADZ UP",
];

/* ── HOME PAGE ──────────────────────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter();
  const { isMobile } = useBreakpoint();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [barbers, setBarbers] = useState([]);
  const [revIdx, setRevIdx] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [revealed, setRevealed] = useState({});
  const [hovSvc, setHovSvc] = useState(null);
  const [heroIn, setHeroIn] = useState(false);
  const [time, setTime] = useState("");

  useEffect(() => {
    const t = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      );
    t();
    const id = setInterval(t, 1000);
    return () => clearInterval(id);
  }, []);
  const checkAuth = useCallback(() => {
    const tok = localStorage.getItem("access");
    if (!tok) {
      setIsLoggedIn(false);
      setIsStaff(false);
      setAuthReady(true);
      return;
    }
    try {
      const p = JSON.parse(
        atob(tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (p.exp && p.exp * 1000 < Date.now()) {
        const ref = localStorage.getItem("refresh");
        if (!ref) {
          localStorage.removeItem("access");
          setIsLoggedIn(false);
          setIsStaff(false);
          setAuthReady(true);
          return;
        }
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/token/refresh/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: ref }),
          },
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.access) {
              localStorage.setItem("access", d.access);
              if (d.refresh) localStorage.setItem("refresh", d.refresh);
              const np = JSON.parse(
                atob(
                  d.access.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
                ),
              );
              setIsLoggedIn(true);
              setIsStaff(!!np.is_staff);
            } else {
              localStorage.removeItem("access");
              localStorage.removeItem("refresh");
              setIsLoggedIn(false);
              setIsStaff(false);
            }
          })
          .catch(() => {
            setIsLoggedIn(false);
            setIsStaff(false);
          })
          .finally(() => setAuthReady(true));
        return;
      }
      setIsLoggedIn(true);
      setIsStaff(!!p.is_staff);
    } catch {
      setIsLoggedIn(false);
      setIsStaff(false);
    }
    setAuthReady(true);
  }, []);
  useEffect(() => {
    checkAuth();
    window.addEventListener("focus", checkAuth);
    return () => window.removeEventListener("focus", checkAuth);
  }, [checkAuth]);
  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/barbers/`,
      {
        headers: localStorage.getItem("access")
          ? { Authorization: `Bearer ${localStorage.getItem("access")}` }
          : {},
      },
    )
      .then((r) => r.json())
      .then((d) => setBarbers(Array.isArray(d) ? d : d.results || []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting)
            setRevealed((p) => ({ ...p, [e.target.dataset.id]: true }));
        });
      },
      { threshold: 0.1 },
    );
    document.querySelectorAll("[data-id]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ready]);
  useEffect(() => {
    const t = setInterval(
      () => setRevIdx((i) => (i + 1) % REVIEWS.length),
      6500,
    );
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (ready) setTimeout(() => setHeroIn(true), 80);
  }, [ready]);

  const R = (id) => !!revealed[id];
  const book = (e) => {
    e.preventDefault();
    router.push(localStorage.getItem("access") ? "/book" : "/login");
  };

  return (
    <>
      {!ready && <LoadingScreen onComplete={() => setReady(true)} />}

      <style jsx global>{`
        @keyframes glow-green {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
          }
          50% {
            box-shadow: 0 0 0 9px rgba(34, 197, 94, 0);
          }
        }
        @keyframes scandown {
          from {
            top: -1px;
          }
          to {
            top: 101%;
          }
        }
        @keyframes ticker {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @keyframes menuSlide {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(22px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes nameIn {
          from {
            opacity: 0;
            transform: translateX(-24px) skewX(-4deg);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes statgrow {
          from {
            width: 0;
          }
          to {
            width: var(--w, 100%);
          }
        }
        @keyframes lockin {
          0%,
          100% {
            opacity: 1;
          }
          20%,
          60% {
            opacity: 0;
          }
          40%,
          80% {
            opacity: 0.5;
          }
        }
        .ticker-wrap {
          animation: ticker 34s linear infinite;
          display: flex;
          width: max-content;
        }
        .ticker-wrap:hover {
          animation-play-state: paused;
        }
        .srow {
          cursor: pointer;
          transition:
            padding-left 0.22s,
            border-color 0.2s,
            background 0.2s;
        }
        .srow:hover {
          padding-left: 18px !important;
          border-color: rgba(245, 158, 11, 0.3) !important;
          background: rgba(245, 158, 11, 0.022) !important;
        }
        .rv {
          opacity: 0;
          transform: translateY(26px);
          transition:
            opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .rv.on {
          opacity: 1;
          transform: none;
        }
        .rv.d1 {
          transition-delay: 0.08s;
        }
        .rv.d2 {
          transition-delay: 0.16s;
        }
        .rv.d3 {
          transition-delay: 0.24s;
        }
      `}</style>

      {/* ── BG EFFECTS ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.013) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.013) 1px,transparent 1px)",
          backgroundSize: "66px 66px",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "-10%",
          right: "-6%",
          width: 700,
          height: 700,
          background:
            "radial-gradient(circle,rgba(245,158,11,0.048) 0%,transparent 62%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "16%",
          left: "-9%",
          width: 540,
          height: 540,
          background:
            "radial-gradient(circle,rgba(245,158,11,0.03) 0%,transparent 58%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
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
            background:
              "linear-gradient(to right,transparent,rgba(245,158,11,0.22),transparent)",
            animation: "scandown 9s linear infinite",
          }}
        />
      </div>

      <div style={{ position: "relative", zIndex: 10 }}>
        {/* ══ NAV ══ */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 200,
            height: 58,
            background: scrollY > 50 ? "rgba(3,3,3,0.97)" : "transparent",
            backdropFilter: scrollY > 50 ? "blur(20px)" : "none",
            borderBottom:
              scrollY > 50 ? "1px solid rgba(255,255,255,0.06)" : "none",
            transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 1320,
              margin: "0 auto",
              padding: "0 clamp(18px,5vw,40px)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <a
              href="/"
              style={{
                ...D,
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "-0.06em",
                color: "white",
                textDecoration: "none",
              }}
            >
              HEADZ
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </a>
            <div
              className="donly"
              style={{ display: "flex", gap: 32, alignItems: "center" }}
            >
              {[
                ["#services", "Services"],
                ["#barber", "Barbers"],
                ["#reviews", "Reviews"],
                ["#location", "Visit"],
              ].map(([h, l]) => (
                <a
                  key={l}
                  href={h}
                  style={{
                    ...M,
                    fontSize: 10,
                    color: "#52525b",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#f59e0b")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#52525b")
                  }
                >
                  {l}
                </a>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {authReady && (
                <>
                  {isLoggedIn && isStaff && (
                    <a
                      href="/barber-dashboard"
                      className="donly"
                      style={{
                        ...D,
                        fontSize: 7.5,
                        color: "#f59e0b",
                        border: "1px solid rgba(245,158,11,0.35)",
                        padding: "9px 16px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        textDecoration: "none",
                        transition: "all 0.2s",
                        clipPath:
                          "polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(245,158,11,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      Dashboard
                    </a>
                  )}
                  {isLoggedIn && !isStaff && (
                    <a
                      href="/dashboard"
                      className="donly"
                      style={{
                        ...D,
                        fontSize: 7.5,
                        color: "#f59e0b",
                        border: "1px solid rgba(245,158,11,0.35)",
                        padding: "9px 16px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        textDecoration: "none",
                        transition: "all 0.2s",
                        clipPath:
                          "polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(245,158,11,0.1)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      My Account
                    </a>
                  )}
                  {!isLoggedIn && (
                    <a
                      href="/barber-login"
                      className="donly"
                      style={{
                        ...D,
                        fontSize: 7.5,
                        color: "#52525b",
                        border: "1px solid rgba(255,255,255,0.1)",
                        padding: "9px 16px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        textDecoration: "none",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#f59e0b";
                        e.currentTarget.style.borderColor =
                          "rgba(245,158,11,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#52525b";
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.1)";
                      }}
                    >
                      Barbers
                    </a>
                  )}
                </>
              )}
              <a
                href="/book"
                onClick={book}
                className="donly"
                style={{
                  ...D,
                  fontSize: 7.5,
                  fontWeight: 700,
                  color: "black",
                  background: "#f59e0b",
                  padding: "10px 22px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  clipPath:
                    "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                  transition: "background 0.25s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "white")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#f59e0b")
                }
              >
                Book Now
              </a>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="monly"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  background: "none",
                  border: "none",
                  padding: 8,
                }}
              >
                {[
                  {
                    r: menuOpen
                      ? "rotate(45deg) translate(4.5px,4.5px)"
                      : "none",
                  },
                  { op: menuOpen ? 0 : 1 },
                  {
                    r: menuOpen
                      ? "rotate(-45deg) translate(4.5px,-4.5px)"
                      : "none",
                  },
                ].map((s, i) => (
                  <span
                    key={i}
                    style={{
                      display: "block",
                      width: 20,
                      height: 1.5,
                      background: menuOpen ? "#f59e0b" : "white",
                      transition: "all 0.28s",
                      transform: s.r || "none",
                      opacity: s.op ?? 1,
                    }}
                  />
                ))}
              </button>
            </div>
          </div>
        </nav>

        {menuOpen && (
          <div
            style={{
              position: "fixed",
              top: 58,
              left: 0,
              right: 0,
              zIndex: 199,
              background: "rgba(3,3,3,0.98)",
              backdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              padding: "8px 0 20px",
              animation: "menuSlide 0.22s ease",
            }}
          >
            {[
              ["#services", "Services"],
              ["#barber", "Barbers"],
              ["#reviews", "Reviews"],
              ["#location", "Visit"],
            ].map(([h, l]) => (
              <a
                key={l}
                href={h}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "block",
                  padding: "15px clamp(18px,5vw,40px)",
                  ...M,
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "#52525b",
                  textDecoration: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
              >
                {l}
              </a>
            ))}
            <div
              style={{
                padding: "18px clamp(18px,5vw,40px) 4px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <a
                href="/book"
                onClick={(e) => {
                  book(e);
                  setMenuOpen(false);
                }}
                style={{
                  ...D,
                  fontSize: 8,
                  fontWeight: 700,
                  color: "black",
                  background: "#f59e0b",
                  padding: "15px",
                  textAlign: "center",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  display: "block",
                  clipPath:
                    "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                }}
              >
                Book Appointment →
              </a>
              {authReady && isLoggedIn && isStaff && (
                <a
                  href="/barber-dashboard"
                  style={{
                    ...D,
                    fontSize: 7,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#f59e0b",
                    border: "1px solid rgba(245,158,11,0.3)",
                    padding: "13px",
                    textAlign: "center",
                    textDecoration: "none",
                  }}
                >
                  Barber Dashboard
                </a>
              )}
              {authReady && isLoggedIn && !isStaff && (
                <a
                  href="/dashboard"
                  style={{
                    ...D,
                    fontSize: 7,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#f59e0b",
                    border: "1px solid rgba(245,158,11,0.3)",
                    padding: "13px",
                    textAlign: "center",
                    textDecoration: "none",
                  }}
                >
                  My Account
                </a>
              )}
              {authReady && !isLoggedIn && (
                <a
                  href="/barber-login"
                  style={{
                    ...D,
                    fontSize: 7,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#52525b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    padding: "13px",
                    textAlign: "center",
                    textDecoration: "none",
                  }}
                >
                  Barber Login
                </a>
              )}
            </div>
          </div>
        )}

        {/* ══ HERO — FULL SCREEN SPLIT ══ */}
        <section
          style={{
            minHeight: "100dvh",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{ position: "absolute", inset: 0, background: "#030303" }}
          />

          {/* Giant bg number */}
          <div
            style={{
              position: "absolute",
              right: "-3%",
              top: "5%",
              ...D,
              fontSize: "clamp(16rem,34vw,30rem)",
              fontWeight: 900,
              lineHeight: 1,
              color: "transparent",
              WebkitTextStroke: "1px rgba(255,255,255,0.028)",
              userSelect: "none",
              pointerEvents: "none",
              letterSpacing: "-0.06em",
            }}
          >
            01
          </div>

          {/* Vertical label */}
          {!isMobile && (
            <div
              style={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%) rotate(-90deg)",
                transformOrigin: "center",
                ...M,
                fontSize: 8,
                letterSpacing: "0.6em",
                color: "#27272a",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Hattiesburg, Mississippi — Est. 2020
            </div>
          )}

          {/* Clock */}
          <div
            style={{
              position: "absolute",
              top: 70,
              right: "clamp(18px,5vw,40px)",
              ...M,
              fontSize: 11,
              color: "#27272a",
              letterSpacing: "0.28em",
            }}
          >
            {time}
          </div>

          {/* Horizontal accent */}
          <div
            style={{
              position: "absolute",
              top: 96,
              left: 0,
              right: 0,
              height: 1,
              background:
                "linear-gradient(to right,transparent,rgba(245,158,11,0.1) 30%,rgba(245,158,11,0.1) 70%,transparent)",
            }}
          />

          {/* Hero content */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              maxWidth: 1320,
              margin: "0 auto",
              width: "100%",
              padding: isMobile ? "0 20px 56px" : "0 clamp(18px,5vw,40px) 80px",
              paddingTop: isMobile ? 80 : 120,
            }}
          >
            {/* Live status */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: isMobile ? 24 : 28,
                opacity: heroIn ? 1 : 0,
                transform: heroIn ? "none" : "translateY(16px)",
                transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s",
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  background: "#22c55e",
                  borderRadius: "50%",
                  animation: "glow-green 2.5s infinite",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  ...M,
                  fontSize: 10,
                  color: "#4ade80",
                  letterSpacing: isMobile ? "0.14em" : "0.36em",
                  textTransform: "uppercase",
                }}
              >
                Open · Accepting Clients Now
              </span>
              {!isMobile && (
                <>
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background:
                        "linear-gradient(to right,rgba(34,197,94,0.3),transparent)",
                      maxWidth: 180,
                    }}
                  />
                  <span
                    style={{
                      ...M,
                      fontSize: 8,
                      color: "#27272a",
                      letterSpacing: "0.2em",
                    }}
                  >
                    4 Hub Dr · Hattiesburg MS
                  </span>
                </>
              )}
            </div>

            {/* Headline — staggered words */}
            <div style={{ marginBottom: isMobile ? 24 : 32 }}>
              {[
                { t: "Where", d: "0.18s", it: false, am: false },
                { t: "Every", d: "0.26s", it: false, am: false },
                { t: "Cut", d: "0.34s", it: false, am: false },
                { t: "Tells", d: "0.42s", it: false, am: false },
                { t: "A Story.", d: "0.52s", it: true, am: true },
              ].map(({ t, d, it, am }) => (
                <h1
                  key={t}
                  style={{
                    ...D,
                    fontSize: "clamp(2.5rem,7.2vw,6.8rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    lineHeight: isMobile ? 1.08 : 0.9,
                    letterSpacing: "-0.04em",
                    color: am ? "#f59e0b" : "white",
                    fontStyle: it ? "italic" : "normal",
                    opacity: heroIn ? 1 : 0,
                    transform: heroIn ? "none" : "translateY(32px)",
                    transition: `opacity 1s cubic-bezier(0.16,1,0.3,1) ${d},transform 1s cubic-bezier(0.16,1,0.3,1) ${d}`,
                    margin: 0,
                  }}
                >
                  {t}
                </h1>
              ))}
            </div>

            {/* Sub + cta */}
            <div
              style={{
                display: "flex",
                gap: isMobile ? 22 : 36,
                alignItems: "flex-end",
                flexWrap: "wrap",
                opacity: heroIn ? 1 : 0,
                transform: heroIn ? "none" : "translateY(18px)",
                transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.66s",
              }}
            >
              <p
                style={{
                  ...M,
                  fontSize: "clamp(12px,1.3vw,14px)",
                  color: "#71717a",
                  lineHeight: 1.85,
                  maxWidth: 400,
                  flex: 1,
                  minWidth: isMobile ? "100%" : "240px",
                }}
              >
                Hattiesburg's premier barbershop. We don't just cut hair — we
                craft confidence. Every client, every time.
              </p>
              <a
                href="/book"
                onClick={book}
                style={{
                  ...D,
                  fontSize: 8.5,
                  fontWeight: 700,
                  color: "black",
                  background: "#f59e0b",
                  padding: "17px 34px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  flexShrink: 0,
                  clipPath:
                    "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                  transition: "background 0.25s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "white")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#f59e0b")
                }
              >
                <span>Book Your Cut →</span>
              </a>
            </div>

            {/* Stats strip */}
            <div
              style={{
                display: "flex",
                marginTop: isMobile ? 32 : 64,
                paddingTop: isMobile ? 18 : 26,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                flexWrap: "wrap",
                opacity: heroIn ? 1 : 0,
                transition: "all 1s cubic-bezier(0.16,1,0.3,1) 0.85s",
              }}
            >
              {[
                { n: "5.0", l: "Star Rating", s: "Google" },
                { n: "11", l: "Services", s: "Every style" },
                { n: "100+", l: "Happy Clients", s: "& Counting" },
                { n: "24/7", l: "Book Online", s: "Anytime" },
              ].map(({ n, l, s }, i) => (
                <div
                  key={l}
                  style={{
                    flex: 1,
                    minWidth: isMobile ? 100 : 120,
                    padding: `0 ${i > 0 ? 14 : 0}px`,
                    borderLeft:
                      i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    marginBottom: 12,
                  }}
                >
                  <p
                    style={{
                      ...D,
                      fontSize: "clamp(1.4rem,2.8vw,2.2rem)",
                      fontWeight: 900,
                      color: "#f59e0b",
                      lineHeight: 1,
                      marginBottom: 4,
                    }}
                  >
                    {n}
                  </p>
                  <p
                    style={{
                      ...M,
                      fontSize: 9,
                      color: "#a1a1aa",
                      letterSpacing: "0.1em",
                      marginBottom: 2,
                    }}
                  >
                    {l}
                  </p>
                  <p
                    style={{
                      ...M,
                      fontSize: 8,
                      color: "#3f3f46",
                      letterSpacing: "0.2em",
                    }}
                  >
                    {s}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll cue */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              paddingBottom: 20,
              opacity: heroIn ? 1 : 0,
              transition: "opacity 1s ease 1.4s",
            }}
          >
            <span
              style={{
                ...M,
                fontSize: 8,
                color: "#27272a",
                letterSpacing: "0.5em",
                textTransform: "uppercase",
              }}
            >
              Scroll
            </span>
            <div
              style={{
                width: 1,
                height: 40,
                background:
                  "linear-gradient(to bottom,rgba(245,158,11,0.5),transparent)",
              }}
            />
          </div>
        </section>

        {/* ══ TICKER ══ */}
        <div
          style={{
            borderTop: "1px solid rgba(245,158,11,0.12)",
            borderBottom: "1px solid rgba(245,158,11,0.12)",
            background: "rgba(245,158,11,0.02)",
            overflow: "hidden",
            padding: "11px 0",
          }}
        >
          <div className="ticker-wrap">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span
                key={i}
                style={{
                  ...M,
                  fontSize: 9,
                  color: "rgba(245,158,11,0.45)",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  padding: "0 32px",
                  flexShrink: 0,
                }}
              >
                ✦ {t}
              </span>
            ))}
          </div>
        </div>

        {/* ══ GALLERY ══ */}
        <GalleryCarousel isMobile={isMobile} />

        {/* ══ SERVICES ══ */}
        <section
          id="services"
          style={{
            padding: isMobile
              ? "56px 20px"
              : "clamp(56px,9vw,112px) clamp(18px,5vw,40px)",
          }}
        >
          <div style={{ maxWidth: 1320, margin: "0 auto" }}>
            {/* Header */}
            <div
              data-id="s1"
              className={`rv${R("s1") ? " on" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: isMobile ? 28 : 52,
              }}
            >
              <div style={{ width: 3, height: 26, background: "#f59e0b" }} />
              <span
                style={{
                  ...M,
                  fontSize: 8,
                  color: "#f59e0b",
                  letterSpacing: "0.6em",
                  textTransform: "uppercase",
                }}
              >
                Services · {SERVICES.length} Options
              </span>
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background:
                    "linear-gradient(to right,rgba(245,158,11,0.2),transparent)",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: isMobile ? 24 : 80,
                alignItems: "start",
                marginBottom: 40,
              }}
            >
              <div data-id="s2" className={`rv${R("s2") ? " on" : ""}`}>
                <h2
                  style={{
                    ...D,
                    fontSize: "clamp(2rem,5vw,4rem)",
                    fontWeight: 900,
                    lineHeight: isMobile ? 1.08 : 0.9,
                    letterSpacing: "-0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  The
                  <br />
                  <span
                    style={{
                      WebkitTextStroke: "1px rgba(255,255,255,0.14)",
                      color: "transparent",
                    }}
                  >
                    Full
                  </span>
                  <br />
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    Menu_
                  </span>
                </h2>
              </div>
              <div
                data-id="s3"
                className={`rv d1${R("s3") ? " on" : ""}`}
                style={{ paddingTop: isMobile ? 0 : 8 }}
              >
                <p
                  style={{
                    ...M,
                    fontSize: 13,
                    color: "#71717a",
                    lineHeight: 1.8,
                    marginBottom: 22,
                  }}
                >
                  From a quick lineup to the full cut and shave — every service
                  delivered with obsessive precision.
                </p>
                <a
                  href="/book"
                  onClick={book}
                  style={{
                    ...D,
                    fontSize: 8,
                    fontWeight: 700,
                    color: "black",
                    background: "#f59e0b",
                    padding: "13px 26px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    clipPath:
                      "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                    transition: "background 0.25s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "white")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#f59e0b")
                  }
                >
                  Book Any Service →
                </a>
              </div>
            </div>

            <div
              data-id="s4"
              className={`rv${R("s4") ? " on" : ""}`}
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              {SERVICES.map((svc, i) => (
                <div
                  key={svc.name}
                  className="srow"
                  onClick={book}
                  onMouseEnter={() => setHovSvc(svc.name)}
                  onMouseLeave={() => setHovSvc(null)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "19px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        ...M,
                        fontSize: 9,
                        color: hovSvc === svc.name ? "#f59e0b" : "#3f3f46",
                        minWidth: 28,
                        transition: "color 0.2s",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        ...D,
                        fontSize: "clamp(8px,1.2vw,11px)",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        color: hovSvc === svc.name ? "white" : "#71717a",
                        transition: "color 0.2s",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {svc.name}
                    </span>
                    {svc.pop && (
                      <span
                        style={{
                          ...M,
                          fontSize: 7,
                          color: "black",
                          background: "#f59e0b",
                          padding: "2px 8px",
                          flexShrink: 0,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                        }}
                      >
                        Popular
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 22,
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ ...M, fontSize: 9, color: "#3f3f46" }}>
                      {svc.dur}
                    </span>
                    <span
                      style={{
                        ...D,
                        fontSize: "clamp(13px,1.9vw,20px)",
                        fontWeight: 900,
                        color: hovSvc === svc.name ? "#f59e0b" : "white",
                        transition: "color 0.2s",
                        minWidth: 40,
                        textAlign: "right",
                      }}
                    >
                      ${svc.price}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        opacity: hovSvc === svc.name ? 1 : 0,
                        color: "#f59e0b",
                        transform:
                          hovSvc === svc.name
                            ? "translateX(0)"
                            : "translateX(-5px)",
                        transition: "all 0.2s",
                      }}
                    >
                      →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ PERSONA SELECT ══ */}
        <PersonaSelect barbers={barbers} book={book} isMobile={isMobile} />

        {/* ══ REVIEWS ══ */}
        <section
          id="reviews"
          style={{
            padding: isMobile
              ? "56px 20px"
              : "clamp(56px,9vw,112px) clamp(18px,5vw,40px)",
          }}
        >
          <div style={{ maxWidth: 1320, margin: "0 auto" }}>
            <div
              data-id="r1"
              className={`rv${R("r1") ? " on" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: isMobile ? 28 : 48,
              }}
            >
              <div style={{ width: 3, height: 26, background: "#f59e0b" }} />
              <span
                style={{
                  ...M,
                  fontSize: 8,
                  color: "#f59e0b",
                  letterSpacing: "0.6em",
                  textTransform: "uppercase",
                }}
              >
                Client Reviews
              </span>
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background:
                    "linear-gradient(to right,rgba(245,158,11,0.2),transparent)",
                }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: isMobile ? 24 : 80,
                alignItems: isMobile ? "start" : "center",
              }}
            >
              <div data-id="r2" className={`rv${R("r2") ? " on" : ""}`}>
                <h2
                  style={{
                    ...D,
                    fontSize: "clamp(1.9rem,4.8vw,3.8rem)",
                    fontWeight: 900,
                    lineHeight: isMobile ? 1.08 : 0.9,
                    letterSpacing: "-0.04em",
                    textTransform: "uppercase",
                    marginBottom: 18,
                  }}
                >
                  Word
                  <br />
                  <span
                    style={{
                      WebkitTextStroke: "1px rgba(255,255,255,0.14)",
                      color: "transparent",
                    }}
                  >
                    of
                  </span>
                  <br />
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    Mouth_
                  </span>
                </h2>
                <p
                  style={{
                    ...M,
                    fontSize: 12,
                    color: "#52525b",
                    lineHeight: 1.8,
                    marginBottom: 28,
                  }}
                >
                  Real clients. Real results. No fluff.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {REVIEWS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setRevIdx(i)}
                      style={{
                        width: i === revIdx ? 26 : 6,
                        height: 4,
                        background:
                          i === revIdx ? "#f59e0b" : "rgba(255,255,255,0.12)",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.32s",
                        padding: 0,
                        minHeight: "auto",
                        minWidth: "auto",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div data-id="r3" className={`rv d1${R("r3") ? " on" : ""}`}>
                {REVIEWS.map((rv, i) => (
                  <div
                    key={i}
                    style={{
                      display: i === revIdx ? "block" : "none",
                      padding: isMobile ? "24px 18px" : "34px 28px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderLeft: "3px solid #f59e0b",
                      animation:
                        i === revIdx ? "fadeUp 0.45s ease both" : "none",
                    }}
                  >
                    <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          style={{ color: "#f59e0b", fontSize: 11 }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <p
                      style={{
                        ...D,
                        fontSize: "clamp(0.82rem,1.5vw,1rem)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        lineHeight: 1.55,
                        letterSpacing: "-0.02em",
                        color: "white",
                        marginBottom: 18,
                      }}
                    >
                      "{rv.q}"
                    </p>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          background: "#f59e0b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          clipPath:
                            "polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px))",
                        }}
                      >
                        <span
                          style={{
                            ...D,
                            fontSize: 11,
                            fontWeight: 900,
                            color: "black",
                          }}
                        >
                          {rv.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p
                          style={{
                            ...M,
                            fontSize: 10,
                            color: "white",
                            letterSpacing: "0.2em",
                          }}
                        >
                          {rv.name}
                        </p>
                        <p
                          style={{
                            ...M,
                            fontSize: 9,
                            color: "#52525b",
                            letterSpacing: "0.2em",
                          }}
                        >
                          {rv.city}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══ LOCATION ══ */}
        <section
          id="location"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: isMobile
              ? "56px 20px"
              : "clamp(56px,9vw,112px) clamp(18px,5vw,40px)",
            background: "rgba(255,255,255,0.01)",
          }}
        >
          <div style={{ maxWidth: 1320, margin: "0 auto" }}>
            <div
              data-id="l1"
              className={`rv${R("l1") ? " on" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: isMobile ? 28 : 48,
              }}
            >
              <div style={{ width: 3, height: 26, background: "#f59e0b" }} />
              <span
                style={{
                  ...M,
                  fontSize: 8,
                  color: "#f59e0b",
                  letterSpacing: "0.6em",
                  textTransform: "uppercase",
                }}
              >
                Find Us
              </span>
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background:
                    "linear-gradient(to right,rgba(245,158,11,0.2),transparent)",
                }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: isMobile ? 24 : 80,
                alignItems: isMobile ? "start" : "center",
              }}
            >
              <div data-id="l2" className={`rv${R("l2") ? " on" : ""}`}>
                <h2
                  style={{
                    ...D,
                    fontSize: "clamp(1.9rem,4.8vw,3.8rem)",
                    fontWeight: 900,
                    lineHeight: isMobile ? 1.08 : 0.9,
                    letterSpacing: "-0.04em",
                    textTransform: "uppercase",
                    marginBottom: 36,
                  }}
                >
                  Come
                  <br />
                  <span
                    style={{
                      WebkitTextStroke: "1px rgba(255,255,255,0.14)",
                      color: "transparent",
                    }}
                  >
                    See
                  </span>
                  <br />
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    Us_
                  </span>
                </h2>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    marginBottom: 36,
                  }}
                >
                  {[
                    ["📍", "Address", "4 Hub Dr, Hattiesburg, MS 39402"],
                    ["🕐", "Mon – Fri", "9:00 AM – 6:00 PM"],
                    ["✂️", "Saturday", "9:00 AM – 4:00 PM"],
                    ["🚫", "Sunday", "Closed"],
                  ].map(([ic, l, v]) => (
                    <div
                      key={l}
                      style={{
                        display: "flex",
                        gap: 16,
                        alignItems: "flex-start",
                        paddingBottom: 20,
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <span
                        style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}
                      >
                        {ic}
                      </span>
                      <div>
                        <p
                          style={{
                            ...M,
                            fontSize: 8,
                            color: "#52525b",
                            letterSpacing: "0.4em",
                            textTransform: "uppercase",
                            marginBottom: 4,
                          }}
                        >
                          {l}
                        </p>
                        <p
                          style={{
                            ...M,
                            fontSize: 13,
                            color: "#a1a1aa",
                            lineHeight: 1.5,
                          }}
                        >
                          {v}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <a
                  href="/book"
                  onClick={book}
                  style={{
                    ...D,
                    fontSize: 8.5,
                    fontWeight: 700,
                    color: "black",
                    background: "#f59e0b",
                    padding: "17px 32px",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    clipPath:
                      "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                    transition: "background 0.25s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "white")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#f59e0b")
                  }
                >
                  Lock In Your Spot →
                </a>
              </div>
              <div data-id="l3" className={`rv d2${R("l3") ? " on" : ""}`}>
                <div
                  style={{
                    background: "#080808",
                    border: "1px solid rgba(255,255,255,0.07)",
                    position: "relative",
                    overflow: "hidden",
                    minHeight: 360,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    clipPath:
                      "polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px))",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
                      backgroundSize: "34px 34px",
                    }}
                  />
                  {[160, 240, 330].map((sz, i) => (
                    <div
                      key={sz}
                      style={{
                        position: "absolute",
                        width: sz,
                        height: sz,
                        border: `1px solid rgba(245,158,11,${0.12 - i * 0.035})`,
                        borderRadius: "50%",
                      }}
                    />
                  ))}
                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      textAlign: "center",
                      padding: "40px 24px",
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        background: "#f59e0b",
                        margin: "0 auto 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 48px rgba(245,158,11,0.45)",
                        clipPath:
                          "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                      }}
                    >
                      <span style={{ fontSize: 22 }}>📍</span>
                    </div>
                    <p
                      style={{
                        ...D,
                        fontSize: 9,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        color: "white",
                        marginBottom: 7,
                      }}
                    >
                      HEADZ UP BARBERSHOP
                    </p>
                    <p style={{ ...M, fontSize: 11, color: "#71717a" }}>
                      4 Hub Dr, Hattiesburg MS 39402
                    </p>
                  </div>
                  <p
                    style={{
                      position: "absolute",
                      bottom: 10,
                      right: 14,
                      ...M,
                      fontSize: 8,
                      color: "#27272a",
                      letterSpacing: "0.2em",
                    }}
                  >
                    31.3271° N · 89.2903° W
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ CTA BAND ══ */}
        <section
          style={{
            background: "#f59e0b",
            padding: isMobile ? "52px 20px" : "68px clamp(18px,5vw,40px)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(0,0,0,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.055) 1px,transparent 1px)",
              backgroundSize: "42px 42px",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              maxWidth: 1320,
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 24,
              position: "relative",
            }}
          >
            <h2
              style={{
                ...D,
                fontSize: "clamp(1.8rem,4vw,3rem)",
                fontWeight: 900,
                lineHeight: 0.92,
                letterSpacing: "-0.04em",
                color: "black",
                textTransform: "uppercase",
              }}
            >
              Ready To Look
              <br />
              Your Best?
            </h2>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <a
                href="/book"
                onClick={book}
                style={{
                  ...D,
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  padding: "17px 34px",
                  background: "black",
                  color: "white",
                  textDecoration: "none",
                  clipPath:
                    "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                  transition: "all 0.28s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#030303";
                  e.currentTarget.style.color = "#f59e0b";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "black";
                  e.currentTarget.style.color = "white";
                }}
              >
                Book Now →
              </a>
              <a
                href="tel:+16012345678"
                style={{
                  ...M,
                  fontSize: 11,
                  color: "rgba(0,0,0,0.4)",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "black")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(0,0,0,0.4)")
                }
              >
                Or call us
              </a>
            </div>
          </div>
        </section>

        {/* ══ FOOTER ══ */}
        <footer
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: isMobile ? "26px 20px" : "30px clamp(18px,5vw,40px)",
          }}
        >
          <div
            style={{
              maxWidth: 1320,
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <p
              style={{
                ...D,
                fontSize: 15,
                fontWeight: 900,
                letterSpacing: "-0.06em",
              }}
            >
              HEADZ
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </p>
            <p
              style={{
                ...M,
                fontSize: 9,
                color: "#27272a",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              © {new Date().getFullYear()} · Hattiesburg, MS
            </p>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                ["book", "Book", book],
                ["/login", "Login", null],
                ["/barber-login", "Barbers", null],
              ].map(([href, label, fn]) => (
                <a
                  key={label}
                  href={href}
                  onClick={fn || undefined}
                  style={{
                    ...M,
                    fontSize: 9,
                    color: "#3f3f46",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    transition: "color 0.2s",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#f59e0b")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#3f3f46")
                  }
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
