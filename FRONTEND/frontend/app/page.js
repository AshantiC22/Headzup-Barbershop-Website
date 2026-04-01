"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/lib/LoadingScreen";
import useBreakpoint from "@/lib/useBreakpoint";

const sf = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

// ── Persona / Character Select ─────────────────────────────────────────────
function PersonaSelect({ homeBarbers, book, isMobile }) {
  const sf = { fontFamily: "'Syncopate', sans-serif" };
  const mono = { fontFamily: "'DM Mono', monospace" };
  const [selected, setSelected] = useState(0);
  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState(false);

  const barbers =
    homeBarbers.length > 0
      ? homeBarbers
      : [{ id: 0, name: "Loading...", bio: "", photo_url: null }];
  const active = barbers[selected] || barbers[0];

  // Stat bars — use bio keywords or defaults
  const getStats = (b) => {
    const n = (b.name || "").toLowerCase();
    const bio = (b.bio || "").toLowerCase();
    return [
      {
        label: "Fade",
        val: bio.includes("fade") || bio.includes("skin") ? 98 : 92,
      },
      {
        label: "Lineup",
        val: bio.includes("line") || bio.includes("edge") ? 99 : 90,
      },
      {
        label: "Beard",
        val: bio.includes("beard") || bio.includes("shave") ? 96 : 85,
      },
      { label: "Precision", val: 97 },
      { label: "Vibe", val: 100 },
    ];
  };

  const handleSelect = (i) => {
    if (locked) return;
    setSelected(i);
  };

  const handleLock = (e) => {
    setLocked(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
    book(e);
  };

  const handleChange = () => {
    setLocked(false);
    setSelected(0);
  };

  const stats = getStats(active);

  return (
    <section
      id="barber"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#020202",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <style>{`
        @keyframes lockin   { 0%{opacity:1}25%{opacity:0}50%{opacity:1}75%{opacity:0}100%{opacity:1} }
        @keyframes slidein  { from{transform:translateX(-20px);opacity:0} to{transform:none;opacity:1} }
        @keyframes statgrow { from{width:0} to{width:var(--w)} }
        @keyframes scanH    { from{left:-100%} to{left:200%} }
        .persona-flash { animation: lockin 0.6s ease; }
        .stat-bar      { animation: statgrow 0.8s cubic-bezier(0.4,0,0.2,1) both; }
        .persona-name  { animation: slidein 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .card-idle     { transition: transform 0.3s ease, border-color 0.3s, filter 0.3s; }
        .card-idle:hover { transform: translateY(-4px) scale(1.02); }
      `}</style>

      {/* Full bleed atmospheric bg — big photo of active barber */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        {active.photo_url || active.photo ? (
          <img
            key={active.id}
            src={active.photo_url || active.photo}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              filter: "brightness(0.18) saturate(0.4)",
              transition: "opacity 0.6s ease",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background:
                "radial-gradient(ellipse at 60% 40%,rgba(245,158,11,0.06) 0%,transparent 60%)",
            }}
          />
        )}
        {/* Vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right,rgba(2,2,2,0.98) 0%,rgba(2,2,2,0.7) 50%,rgba(2,2,2,0.92) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top,rgba(2,2,2,0.95) 0%,transparent 40%)",
          }}
        />
        {/* Scan line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "30%",
            background:
              "linear-gradient(to right,transparent,rgba(245,158,11,0.03),transparent)",
            animation: "scanH 4s linear infinite",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Grid lines overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(245,158,11,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.025) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1320,
          margin: "0 auto",
          padding: isMobile ? "40px 20px 48px" : "80px 40px 88px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: isMobile ? 32 : 52,
          }}
        >
          <div
            style={{ width: 40, height: 1, background: "rgba(245,158,11,0.5)" }}
          />
          <span
            style={{
              ...mono,
              fontSize: 8,
              color: "#f59e0b",
              letterSpacing: "0.6em",
              textTransform: "uppercase",
            }}
          >
            Select Your Barber
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background:
                "linear-gradient(to right,rgba(245,158,11,0.2),transparent)",
            }}
          />
          <span
            style={{
              ...mono,
              fontSize: 8,
              color: "#27272a",
              letterSpacing: "0.3em",
            }}
          >
            {String(selected + 1).padStart(2, "0")} /{" "}
            {String(barbers.length).padStart(2, "0")}
          </span>
        </div>

        {isMobile ? (
          /* ── MOBILE LAYOUT ── */
          <div>
            {/* Character thumbnails row */}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 28,
                overflowX: "auto",
                paddingBottom: 8,
              }}
            >
              {barbers.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => handleSelect(i)}
                  className="card-idle"
                  style={{
                    flexShrink: 0,
                    width: 80,
                    height: 108,
                    border: `2px solid ${i === selected ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                    background: "#0a0a0a",
                    overflow: "hidden",
                    cursor: "pointer",
                    padding: 0,
                    position: "relative",
                    filter: i === selected ? "none" : "brightness(0.5)",
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
                        display: "block",
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
                          ...sf,
                          fontSize: 24,
                          color: "#f59e0b",
                          fontWeight: 900,
                        }}
                      >
                        {b.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  {i === selected && (
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
                </button>
              ))}
            </div>

            {/* Active barber info */}
            <div
              className={flash ? "persona-flash" : ""}
              style={{ marginBottom: 24 }}
            >
              <p
                style={{
                  ...mono,
                  fontSize: 8,
                  color: "#f59e0b",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {locked ? "✓ Selected" : "HEADZ UP · Barber"}
              </p>
              <h2
                key={active.id}
                className="persona-name"
                style={{
                  ...sf,
                  fontSize: "clamp(1.8rem,7vw,2.8rem)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  marginBottom: 12,
                  color: locked ? "#f59e0b" : "white",
                }}
              >
                {active.name}
              </h2>
              {active.bio && (
                <p
                  style={{
                    ...mono,
                    fontSize: 12,
                    color: "#52525b",
                    lineHeight: 1.7,
                    marginBottom: 16,
                  }}
                >
                  {active.bio}
                </p>
              )}

              {/* Stats */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                {stats.map((s) => (
                  <div
                    key={s.label}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{
                        ...mono,
                        fontSize: 8,
                        color: "#52525b",
                        letterSpacing: "0.3em",
                        textTransform: "uppercase",
                        width: 60,
                        flexShrink: 0,
                      }}
                    >
                      {s.label}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 3,
                        background: "rgba(255,255,255,0.06)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        className="stat-bar"
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          height: "100%",
                          background: `linear-gradient(to right,#f59e0b,#fbbf24)`,
                          "--w": `${s.val}%`,
                          width: `${s.val}%`,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        ...mono,
                        fontSize: 8,
                        color: "#f59e0b",
                        minWidth: 28,
                        textAlign: "right",
                      }}
                    >
                      {s.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              {!locked ? (
                <button
                  onClick={handleLock}
                  style={{
                    flex: 1,
                    padding: "16px",
                    background: "#f59e0b",
                    color: "black",
                    ...sf,
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  Book {active.name} →
                </button>
              ) : (
                <>
                  <button
                    onClick={handleLock}
                    style={{
                      flex: 1,
                      padding: "16px",
                      background: "#22c55e",
                      color: "black",
                      ...sf,
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
                    onClick={handleChange}
                    style={{
                      padding: "16px 20px",
                      background: "transparent",
                      color: "#52525b",
                      ...sf,
                      fontSize: 7,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      border: "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                    }}
                  >
                    Change
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* ── DESKTOP LAYOUT ── */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "340px 1fr",
              gap: 60,
              alignItems: "start",
            }}
          >
            {/* Left — character roster */}
            <div>
              <p
                style={{
                  ...mono,
                  fontSize: 7,
                  color: "#27272a",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                — Choose Fighter —
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {barbers.map((b, i) => (
                  <button
                    key={b.id}
                    onClick={() => handleSelect(i)}
                    className="card-idle"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "0 0 0 0",
                      background: "transparent",
                      border: `1px solid ${i === selected ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.06)"}`,
                      cursor: "pointer",
                      overflow: "hidden",
                      position: "relative",
                      textAlign: "left",
                      filter: i === selected ? "none" : "brightness(0.6)",
                    }}
                  >
                    {/* Photo thumbnail */}
                    <div
                      style={{
                        width: 72,
                        height: 88,
                        flexShrink: 0,
                        overflow: "hidden",
                        background: "#0a0a0a",
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
                            display: "block",
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
                              ...sf,
                              fontSize: 28,
                              color: "#f59e0b",
                              fontWeight: 900,
                            }}
                          >
                            {b.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Name + status */}
                    <div style={{ flex: 1, padding: "0 16px 0 4px" }}>
                      <p
                        style={{
                          ...mono,
                          fontSize: 7,
                          color: i === selected ? "#f59e0b" : "#27272a",
                          letterSpacing: "0.4em",
                          textTransform: "uppercase",
                          marginBottom: 5,
                          transition: "color 0.2s",
                        }}
                      >
                        Barber
                      </p>
                      <p
                        style={{
                          ...sf,
                          fontSize: 13,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          color: i === selected ? "white" : "#52525b",
                          letterSpacing: "-0.02em",
                          transition: "color 0.2s",
                        }}
                      >
                        {b.name}
                      </p>
                    </div>
                    {/* Active indicator */}
                    {i === selected && (
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
                    {/* Selected badge */}
                    {i === selected && (
                      <span
                        style={{
                          ...mono,
                          fontSize: 7,
                          color: "#000",
                          background: "#f59e0b",
                          padding: "4px 10px",
                          marginRight: 12,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          flexShrink: 0,
                        }}
                      >
                        {locked ? "✓ Locked" : "Selected"}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Instruction text */}
              <div
                style={{
                  marginTop: 28,
                  padding: "16px",
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(245,158,11,0.03)",
                }}
              >
                <p
                  style={{
                    ...mono,
                    fontSize: 8,
                    color: "#3f3f46",
                    letterSpacing: "0.2em",
                    lineHeight: 1.8,
                  }}
                >
                  {locked
                    ? `✓ ${active.name} selected — confirm your booking below`
                    : "Click a barber to view their profile, then book your session"}
                </p>
              </div>
            </div>

            {/* Right — active barber big display */}
            <div
              className={flash ? "persona-flash" : ""}
              style={{ position: "relative" }}
            >
              {/* Big photo panel */}
              <div
                style={{
                  position: "relative",
                  height: 480,
                  overflow: "hidden",
                  border: "1px solid rgba(245,158,11,0.15)",
                  marginBottom: 32,
                }}
              >
                {/* Photo */}
                {active.photo_url || active.photo ? (
                  <img
                    key={active.id}
                    src={active.photo_url || active.photo}
                    alt={active.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center top",
                      display: "block",
                      transition: "opacity 0.5s ease",
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
                        ...sf,
                        fontSize: 120,
                        color: "rgba(245,158,11,0.08)",
                        fontWeight: 900,
                        letterSpacing: "-0.06em",
                      }}
                    >
                      {active.name.charAt(0)}
                    </span>
                  </div>
                )}

                {/* Gradient overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top,rgba(2,2,2,0.98) 0%,rgba(2,2,2,0.3) 50%,transparent 100%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to right,rgba(2,2,2,0.6) 0%,transparent 50%)",
                  }}
                />

                {/* Barber name overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "28px 32px",
                  }}
                >
                  <p
                    style={{
                      ...mono,
                      fontSize: 8,
                      color: "#f59e0b",
                      letterSpacing: "0.6em",
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}
                  >
                    HEADZ UP · BARBER
                  </p>
                  <h2
                    key={`name-${active.id}`}
                    className="persona-name"
                    style={{
                      ...sf,
                      fontSize: "clamp(2rem,4vw,3.2rem)",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      color: "white",
                      marginBottom: 8,
                    }}
                  >
                    {active.name}
                  </h2>
                  {active.bio && (
                    <p
                      style={{
                        ...mono,
                        fontSize: 12,
                        color: "rgba(255,255,255,0.5)",
                        lineHeight: 1.6,
                        maxWidth: 420,
                      }}
                    >
                      {active.bio}
                    </p>
                  )}
                  {/* Accepting dot */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        background: "#22c55e",
                        borderRadius: "50%",
                        animation: "glow 2s infinite",
                      }}
                    />
                    <span
                      style={{
                        ...mono,
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

                {/* Corner tag */}
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    ...mono,
                    fontSize: 7,
                    color: "#f59e0b",
                    background: "rgba(245,158,11,0.1)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    padding: "6px 12px",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                  }}
                >
                  HEADZ UP
                </div>
              </div>

              {/* Stats panel */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                }}
              >
                {/* Stat bars */}
                <div>
                  <p
                    style={{
                      ...mono,
                      fontSize: 7,
                      color: "#27272a",
                      letterSpacing: "0.4em",
                      textTransform: "uppercase",
                      marginBottom: 14,
                    }}
                  >
                    Stats
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {stats.map((s) => (
                      <div
                        key={s.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            ...mono,
                            fontSize: 8,
                            color: "#52525b",
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            width: 68,
                            flexShrink: 0,
                          }}
                        >
                          {s.label}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 3,
                            background: "rgba(255,255,255,0.06)",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            className="stat-bar"
                            key={`${active.id}-${s.label}`}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              height: "100%",
                              background:
                                "linear-gradient(to right,#f59e0b,#fbbf24)",
                              "--w": `${s.val}%`,
                              width: `${s.val}%`,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            ...mono,
                            fontSize: 9,
                            color: "#f59e0b",
                            minWidth: 28,
                            textAlign: "right",
                          }}
                        >
                          {s.val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick info */}
                <div>
                  <p
                    style={{
                      ...mono,
                      fontSize: 7,
                      color: "#27272a",
                      letterSpacing: "0.4em",
                      textTransform: "uppercase",
                      marginBottom: 14,
                    }}
                  >
                    Profile
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {[
                      { label: "Shop", val: "HEADZ UP" },
                      { label: "Location", val: "Hattiesburg, MS" },
                      { label: "Specialty", val: "Precision Fades" },
                      { label: "Status", val: "✦ Available", green: true },
                    ].map(({ label, val, green }) => (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingBottom: 8,
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <span
                          style={{
                            ...mono,
                            fontSize: 8,
                            color: "#3f3f46",
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                          }}
                        >
                          {label}
                        </span>
                        <span
                          style={{
                            ...mono,
                            fontSize: 10,
                            color: green ? "#4ade80" : "#a1a1aa",
                          }}
                        >
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                {!locked ? (
                  <>
                    <button
                      onClick={handleLock}
                      style={{
                        flex: 1,
                        padding: "18px 28px",
                        background: "#f59e0b",
                        color: "black",
                        ...sf,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.25s",
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#f59e0b";
                      }}
                    >
                      Book {active.name} →
                    </button>
                    <a
                      href="/book"
                      onClick={book}
                      style={{
                        padding: "18px 28px",
                        background: "transparent",
                        color: "#52525b",
                        ...sf,
                        fontSize: 9,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        border: "1px solid rgba(255,255,255,0.1)",
                        cursor: "pointer",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        transition: "all 0.2s",
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
                      View All →
                    </a>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleLock}
                      style={{
                        flex: 1,
                        padding: "18px 28px",
                        background: "#22c55e",
                        color: "black",
                        ...sf,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.25s",
                      }}
                    >
                      ✓ Confirm — Book Now
                    </button>
                    <button
                      onClick={handleChange}
                      style={{
                        padding: "18px 24px",
                        background: "transparent",
                        color: "#52525b",
                        ...sf,
                        fontSize: 8,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        border: "1px solid rgba(255,255,255,0.1)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.3)";
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.1)";
                        e.currentTarget.style.color = "#52525b";
                      }}
                    >
                      ← Change
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

// ── Gallery images ─────────────────────────────────────────────────────────
const GALLERY = [
  {
    url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80",
    label: "Precision Fade",
    sub: "Signature cut",
  },
  {
    url: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80",
    label: "Clean Lineup",
    sub: "Sharp edges",
  },
  {
    url: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=80",
    label: "Beard Trim",
    sub: "Sculpted look",
  },
  {
    url: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&q=80",
    label: "Kids Cutz",
    sub: "Ages 1–12",
  },
  {
    url: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80",
    label: "Full Experience",
    sub: "Cut & shave",
  },
  {
    url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80",
    label: "The Chair",
    sub: "Your throne",
  },
];

// ── 3D Spinning Carousel ───────────────────────────────────────────────────
function GalleryCarousel({ isMobile }) {
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(true);
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const rafRef = useRef(null);
  const angleRef = useRef(0);

  const COUNT = GALLERY.length;
  const STEP = 360 / COUNT;
  const RADIUS = isMobile ? 150 : 270;
  const W = isMobile ? 155 : 230;
  const H = isMobile ? 195 : 290;

  useEffect(() => {
    if (!spinning) return;
    const tick = () => {
      angleRef.current = (angleRef.current + 0.35) % 360;
      setAngle(angleRef.current);
      const idx = Math.round(((360 - angleRef.current) % 360) / STEP) % COUNT;
      setActive(idx < 0 ? idx + COUNT : idx);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spinning]);

  const onDragStart = (e) => {
    setSpinning(false);
    cancelAnimationFrame(rafRef.current);
    setDragging(true);
    setStartX(e.touches ? e.touches[0].clientX : e.clientX);
  };
  const onDragMove = (e) => {
    if (!dragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const delta = x - startX;
    angleRef.current = (angleRef.current + delta * 0.5) % 360;
    setAngle(angleRef.current);
    const idx = Math.round(((360 - angleRef.current) % 360) / STEP) % COUNT;
    setActive(idx < 0 ? idx + COUNT : idx);
    setStartX(x);
  };
  const onDragEnd = () => {
    setDragging(false);
    setTimeout(() => setSpinning(true), 600);
  };

  const goTo = (i) => {
    setSpinning(false);
    cancelAnimationFrame(rafRef.current);
    angleRef.current = (360 - i * STEP) % 360;
    setAngle(angleRef.current);
    setActive(i);
    setTimeout(() => setSpinning(true), 1200);
  };

  return (
    <section
      style={{
        padding: isMobile ? "48px 0 52px" : "80px 0 88px",
        overflow: "hidden",
        background: "rgba(0,0,0,0.25)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes cardpulse { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0)} 50%{box-shadow:0 0 32px rgba(245,158,11,0.35)} }
        .gc-front { animation: cardpulse 2.5s ease-in-out infinite; }
      `}</style>

      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 500,
          height: 400,
          background:
            "radial-gradient(ellipse,rgba(245,158,11,0.07) 0%,transparent 60%)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: isMobile ? 28 : 44,
          padding: "0 20px",
        }}
      >
        <p
          style={{
            ...mono,
            fontSize: 9,
            color: "#f59e0b",
            letterSpacing: "0.6em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          The Work
        </p>
        <h2
          style={{
            ...sf,
            fontSize: "clamp(1.4rem,4vw,2.2rem)",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          Fresh Every{" "}
          <span style={{ color: "#f59e0b", fontStyle: "italic" }}>Time_</span>
        </h2>
      </div>

      {/* 3D Stage */}
      <div
        style={{
          position: "relative",
          height: isMobile ? 260 : 380,
          perspective: isMobile ? 600 : 900,
          perspectiveOrigin: "50% 50%",
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "none",
        }}
        onMouseDown={onDragStart}
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={onDragStart}
        onTouchMove={onDragMove}
        onTouchEnd={onDragEnd}
      >
        {/* Rotating ring */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transformStyle: "preserve-3d",
            transform: `translate(-50%,-50%) rotateY(${angle}deg)`,
          }}
        >
          {GALLERY.map((item, i) => {
            const isFront = i === active;
            return (
              <div
                key={i}
                className={isFront ? "gc-front" : ""}
                onClick={() => goTo(i)}
                style={{
                  position: "absolute",
                  width: W,
                  height: H,
                  left: -W / 2,
                  top: -H / 2,
                  transform: `rotateY(${i * STEP}deg) translateZ(${RADIUS}px)`,
                  borderRadius: 4,
                  overflow: "hidden",
                  border: isFront
                    ? "2px solid #f59e0b"
                    : "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  transition: "border 0.4s",
                  backfaceVisibility: "hidden",
                }}
              >
                <img
                  src={item.url}
                  alt={item.label}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    filter: isFront ? "none" : "brightness(0.35) saturate(0.5)",
                    transition: "filter 0.4s",
                    pointerEvents: "none",
                  }}
                  loading="lazy"
                />
                {/* Front card label */}
                {isFront && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background:
                        "linear-gradient(to top,rgba(4,4,4,0.96) 0%,rgba(4,4,4,0.6) 60%,transparent 100%)",
                      padding: isMobile ? "10px 12px 14px" : "14px 16px 18px",
                    }}
                  >
                    <p
                      style={{
                        ...sf,
                        fontSize: isMobile ? 9 : 11,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        color: "white",
                        margin: "0 0 3px",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {item.label}
                    </p>
                    <p
                      style={{
                        ...mono,
                        fontSize: isMobile ? 9 : 10,
                        color: "#f59e0b",
                        letterSpacing: "0.2em",
                        margin: 0,
                      }}
                    >
                      {item.sub}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Ground line */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: "15%",
            right: "15%",
            height: 1,
            background:
              "linear-gradient(to right,transparent,rgba(245,158,11,0.25),transparent)",
          }}
        />
      </div>

      {/* Dots */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          marginTop: isMobile ? 16 : 24,
        }}
      >
        {GALLERY.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === active ? 22 : 6,
              height: 6,
              background: i === active ? "#f59e0b" : "rgba(255,255,255,0.15)",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "all 0.3s",
              borderRadius: 0,
              minHeight: "auto",
              minWidth: "auto",
            }}
          />
        ))}
      </div>

      {/* Hint */}
      <p
        style={{
          ...mono,
          fontSize: 9,
          color: "#27272a",
          textAlign: "center",
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          marginTop: 14,
          animation: "pulse 3s ease infinite",
        }}
      >
        ✦ Drag to spin ✦
      </p>
    </section>
  );
}

const SERVICES = [
  {
    name: "Haircut & Shave",
    price: 35,
    duration: "30 min",
    tag: "Signature",
    popular: true,
  },
  {
    name: "Haircut",
    price: 30,
    duration: "30 min",
    tag: "Classic",
    popular: false,
  },
  {
    name: "Senior Cut and Shave",
    price: 30,
    duration: "30 min",
    tag: "Senior",
    popular: false,
  },
  {
    name: "Kids Cutz (1–12)",
    price: 25,
    duration: "30 min",
    tag: "Kids",
    popular: false,
  },
  {
    name: "Line and Shave",
    price: 25,
    duration: "30 min",
    tag: "Combo",
    popular: false,
  },
  {
    name: "Senior Cut",
    price: 25,
    duration: "30 min",
    tag: "Senior",
    popular: false,
  },
  {
    name: "Beard Trim",
    price: 20,
    duration: "15 min",
    tag: "Beard",
    popular: false,
  },
  {
    name: "Line",
    price: 20,
    duration: "15 min",
    tag: "Clean Up",
    popular: false,
  },
  {
    name: "Shave",
    price: 20,
    duration: "30 min",
    tag: "Shave",
    popular: false,
  },
  {
    name: "Kids Line",
    price: 15,
    duration: "30 min",
    tag: "Kids",
    popular: false,
  },
  {
    name: "Senior Line",
    price: 15,
    duration: "30 min",
    tag: "Senior",
    popular: false,
  },
];

const REVIEWS = [
  {
    quote:
      "This man is an amazing barber with great energy and a great personality. Most importantly the cuts are fire!! Go book with him.",
    name: "Ronnie E.",
    city: "Hattiesburg",
  },
  {
    quote:
      "Best fade in Hattiesburg, hands down. I drive 40 minutes just to sit in that chair. Worth every mile.",
    name: "Marcus T.",
    city: "Laurel",
  },
  {
    quote:
      "Came in first time, walked out looking like a new man. The lineup was immaculate. Already booked my next one.",
    name: "DeShawn K.",
    city: "Hattiesburg",
  },
  {
    quote:
      "My son has been going here since he was 3. Fantastic with kids and the cut is always perfect. Love this place.",
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
];

export default function HomePage() {
  const router = useRouter();
  const heroRef = useRef(null);
  const { isMobile } = useBreakpoint();

  const [pageReady, setPageReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [homeBarbers, setHomeBarbers] = useState([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [revealed, setRevealed] = useState({});
  const [hovSvc, setHovSvc] = useState(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [time, setTime] = useState("");

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      );
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Auth — read JWT payload directly, no API call needed
  const checkAuth = useCallback(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      setIsLoggedIn(false);
      setIsStaff(false);
      setAuthReady(true);
      return;
    }
    try {
      // JWT is base64url encoded — decode the payload (middle part)
      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      // Check token hasn't expired
      const expired = payload.exp && payload.exp * 1000 < Date.now();
      if (expired) {
        // Try to silently refresh — don't block the UI
        const refresh = localStorage.getItem("refresh");
        if (!refresh) {
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
            body: JSON.stringify({ refresh }),
          },
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.access) {
              localStorage.setItem("access", d.access);
              if (d.refresh) localStorage.setItem("refresh", d.refresh);
              const newPayload = JSON.parse(
                atob(
                  d.access.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
                ),
              );
              setIsLoggedIn(true);
              setIsStaff(!!newPayload.is_staff);
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
      // Token is valid — read claims instantly
      setIsLoggedIn(true);
      setIsStaff(!!payload.is_staff);
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

  // Barbers
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
      .then((d) => setHomeBarbers(Array.isArray(d) ? d : d.results || []))
      .catch(() => {});
  }, []);

  // Scroll
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Scroll reveal
  useEffect(() => {
    if (!pageReady) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting)
            setRevealed((p) => ({ ...p, [e.target.dataset.id]: true }));
        });
      },
      { threshold: 0.12 },
    );
    document.querySelectorAll("[data-id]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pageReady]);

  // Review cycle
  useEffect(() => {
    const t = setInterval(
      () => setReviewIdx((i) => (i + 1) % REVIEWS.length),
      6000,
    );
    return () => clearInterval(t);
  }, []);

  // Hero entry
  useEffect(() => {
    if (pageReady) setTimeout(() => setHeroLoaded(true), 100);
  }, [pageReady]);

  const go = (e, path) => {
    e.preventDefault();
    router.push(path);
  };
  const book = (e) => {
    e.preventDefault();
    const t = localStorage.getItem("access");
    router.push(t ? "/book" : "/login");
  };

  const R = (id) => revealed[id] || false;

  return (
    <>
      {!pageReady && <LoadingScreen onComplete={() => setPageReady(true)} />}

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
        html {
          background: #040404;
          overflow-x: hidden;
          scroll-behavior: smooth;
        }
        body {
          background: #040404;
          color: white;
          font-family: "DM Mono", monospace;
          overflow-x: hidden;
          -webkit-text-size-adjust: 100%;
        }
        ::selection {
          background: rgba(245, 158, 11, 0.3);
          color: white;
        }

        /* Reveal */
        .rv {
          opacity: 0;
          transform: translateY(28px);
          transition:
            opacity 0.95s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.95s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .rv.on {
          opacity: 1;
          transform: none;
        }
        .rv.d1 {
          transition-delay: 0.1s;
        }
        .rv.d2 {
          transition-delay: 0.2s;
        }
        .rv.d3 {
          transition-delay: 0.3s;
        }
        .rv.d4 {
          transition-delay: 0.4s;
        }

        /* Hero text entrance */
        @keyframes heroIn {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }

        /* Ticker */
        @keyframes tick {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .ticker {
          animation: tick 28s linear infinite;
          display: flex;
          width: max-content;
        }
        .ticker:hover {
          animation-play-state: paused;
        }

        /* Outline text */
        .outline {
          -webkit-text-stroke: 1px rgba(255, 255, 255, 0.12);
          color: transparent;
        }

        /* Pulse */
        @keyframes glow {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
          }
        }

        /* Book button */
        .cta {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 18px 36px;
          background: #f59e0b;
          color: #000;
          font-family: "Syncopate", sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          text-decoration: none;
          border: none;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: color 0.35s;
        }
        .cta::after {
          content: "";
          position: absolute;
          inset: 0;
          background: #000;
          transform: translateX(-101%);
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cta:hover {
          color: white;
        }
        .cta:hover::after {
          transform: translateX(0);
        }
        .cta span {
          position: relative;
          z-index: 1;
        }

        /* Ghost CTA */
        .cta-ghost {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 17px 32px;
          background: transparent;
          color: #71717a;
          font-family: "Syncopate", sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          transition: all 0.3s;
        }
        .cta-ghost:hover {
          color: #f59e0b;
          border-color: rgba(245, 158, 11, 0.4);
          background: rgba(245, 158, 11, 0.04);
        }

        /* Nav link */
        .nlink {
          color: #52525b;
          text-decoration: none;
          transition: color 0.2s;
          font-family: "DM Mono", monospace;
          font-size: 10px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
        }
        .nlink:hover {
          color: #f59e0b;
        }

        /* Service row */
        .srow {
          cursor: pointer;
          transition:
            padding-left 0.25s cubic-bezier(0.4, 0, 0.2, 1),
            border-color 0.25s;
        }
        .srow:hover {
          padding-left: 20px !important;
          border-color: rgba(245, 158, 11, 0.3) !important;
        }

        /* Barber card */
        .bcard {
          transition:
            transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
            border-color 0.3s;
        }
        .bcard:hover {
          transform: translateY(-6px);
          border-color: rgba(245, 158, 11, 0.4) !important;
        }

        @media (max-width: 639px) {
          .donly {
            display: none !important;
          }
        }
        @media (min-width: 640px) {
          .monly {
            display: none !important;
          }
        }

        @keyframes menuSlide {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes lineGrow {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }
        @keyframes scandown {
          from {
            top: -2px;
          }
          to {
            top: 102%;
          }
        }
      `}</style>

      {/* ── SCANLINE ── */}
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
              "linear-gradient(to right,transparent,rgba(245,158,11,0.25),transparent)",
            animation: "scandown 8s linear infinite",
          }}
        />
      </div>

      {/* ── GRID ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      {/* ── GRAIN ── */}
      {/* grain overlay */}

      {/* ── AMBER AMBIENT ── */}
      <div
        style={{
          position: "fixed",
          top: "-10%",
          right: "-5%",
          width: 700,
          height: 700,
          background:
            "radial-gradient(circle,rgba(245,158,11,0.055) 0%,transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "20%",
          left: "-10%",
          width: 500,
          height: 500,
          background:
            "radial-gradient(circle,rgba(245,158,11,0.035) 0%,transparent 60%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 10 }}>
        {/* ═══════════════════════ NAV ═══════════════════════ */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 200,
            height: 60,
            background: scrollY > 40 ? "rgba(4,4,4,0.96)" : "transparent",
            backdropFilter: scrollY > 40 ? "blur(24px)" : "none",
            borderBottom:
              scrollY > 40 ? "1px solid rgba(255,255,255,0.07)" : "none",
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
              padding: "0 28px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* Logo */}
            <a
              href="/"
              style={{
                ...sf,
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: "-0.06em",
                textDecoration: "none",
                color: "white",
              }}
            >
              HEADZ
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </a>

            {/* Desktop links */}
            <div
              className="donly"
              style={{ display: "flex", gap: 36, alignItems: "center" }}
            >
              <a href="#services" className="nlink">
                Services
              </a>
              <a href="#barber" className="nlink">
                Barber
              </a>
              <a href="#reviews" className="nlink">
                Reviews
              </a>
              <a href="#location" className="nlink">
                Location
              </a>
            </div>

            {/* Right actions */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {authReady && (
                <>
                  {/* Barber — show dashboard */}
                  {isLoggedIn && isStaff && (
                    <a
                      href="/barber-dashboard"
                      className="donly cta-ghost"
                      style={{ padding: "10px 18px", fontSize: 8 }}
                    >
                      <span>Dashboard</span>
                    </a>
                  )}
                  {/* Client logged in — show My Account */}
                  {isLoggedIn && !isStaff && (
                    <a
                      href="/dashboard"
                      className="donly cta-ghost"
                      style={{ padding: "10px 18px", fontSize: 8 }}
                    >
                      <span>My Account</span>
                    </a>
                  )}
                  {/* Nobody logged in — show Barber Login */}
                  {!isLoggedIn && (
                    <a
                      href="/barber-login"
                      className="donly cta-ghost"
                      style={{ padding: "10px 18px", fontSize: 8 }}
                    >
                      <span>Barber Login</span>
                    </a>
                  )}
                </>
              )}
              <a
                href="/book"
                onClick={book}
                className="cta donly"
                style={{ padding: "11px 22px", fontSize: 8 }}
              >
                <span>Book Now</span>
              </a>

              {/* Hamburger */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="monly"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 8,
                }}
              >
                {[
                  {
                    rotate: menuOpen
                      ? "rotate(45deg) translate(4.5px,4.5px)"
                      : "none",
                  },
                  { opacity: menuOpen ? 0 : 1, rotate: "none" },
                  {
                    rotate: menuOpen
                      ? "rotate(-45deg) translate(4.5px,-4.5px)"
                      : "none",
                  },
                ].map((s, i) => (
                  <span
                    key={i}
                    style={{
                      display: "block",
                      width: 22,
                      height: 1.5,
                      background: menuOpen ? "#f59e0b" : "white",
                      transition: "all 0.3s",
                      transform: s.rotate,
                      opacity: s.opacity ?? 1,
                    }}
                  />
                ))}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            style={{
              position: "fixed",
              top: 60,
              left: 0,
              right: 0,
              zIndex: 199,
              background: "rgba(4,4,4,0.98)",
              backdropFilter: "blur(24px)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              padding: "8px 0 24px",
              animation: "menuSlide 0.2s ease",
            }}
          >
            {[
              ["services", "Services"],
              ["barber", "Barber"],
              ["reviews", "Reviews"],
              ["location", "Location"],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "block",
                  padding: "16px 28px",
                  ...mono,
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
                {label}
              </a>
            ))}
            <div
              style={{
                padding: "20px 28px 4px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <a
                href="/book"
                onClick={book}
                className="cta"
                style={{ justifyContent: "center" }}
              >
                <span>Book Appointment</span>
              </a>
              {authReady && isLoggedIn && isStaff && (
                <a
                  href="/barber-dashboard"
                  style={{
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#f59e0b",
                    textDecoration: "none",
                    border: "1px solid rgba(245,158,11,0.3)",
                    padding: "14px",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  Barber Dashboard
                </a>
              )}
              {authReady && isLoggedIn && !isStaff && (
                <a
                  href="/dashboard"
                  style={{
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#f59e0b",
                    textDecoration: "none",
                    border: "1px solid rgba(245,158,11,0.3)",
                    padding: "14px",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  My Account
                </a>
              )}
              {authReady && !isLoggedIn && (
                <a
                  href="/barber-login"
                  style={{
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#52525b",
                    textDecoration: "none",
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: "14px",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  Barber Login
                </a>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════ HERO ═══════════════════════ */}
        <section
          ref={heroRef}
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            overflow: "hidden",
          }}
        >
          {/* Full-bleed dark background texture */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg,#040404 0%,#0a0804 40%,#040404 100%)",
            }}
          />

          {/* Large decorative number — editorial */}
          <div
            style={{
              position: "absolute",
              right: "-2%",
              top: "8%",
              ...sf,
              fontSize: "clamp(12rem,28vw,22rem)",
              fontWeight: 900,
              lineHeight: 1,
              color: "transparent",
              WebkitTextStroke: "1px rgba(255,255,255,0.04)",
              userSelect: "none",
              pointerEvents: "none",
              letterSpacing: "-0.06em",
            }}
          >
            01
          </div>

          {/* Vertical text — left side */}
          <div
            style={{
              position: "absolute",
              left: 20,
              top: "50%",
              transform: "translateY(-50%) rotate(-90deg)",
              transformOrigin: "center center",
              ...mono,
              fontSize: 8,
              letterSpacing: "0.6em",
              color: "#27272a",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              display: isMobile ? "none" : "block",
            }}
          >
            Hattiesburg, Mississippi — Est. 2020
          </div>

          {/* Live time — top right */}
          <div
            style={{
              position: "absolute",
              top: 72,
              right: 28,
              ...mono,
              fontSize: 11,
              color: "#27272a",
              letterSpacing: "0.3em",
            }}
          >
            {time}
          </div>

          {/* Horizontal rule top */}
          <div
            style={{
              position: "absolute",
              top: 100,
              left: 0,
              right: 0,
              height: 1,
              background:
                "linear-gradient(to right,transparent,rgba(245,158,11,0.15) 30%,rgba(245,158,11,0.15) 70%,transparent)",
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
              padding: isMobile ? "0 20px 60px" : "0 28px 80px",
              paddingTop: isMobile ? 80 : 120,
            }}
          >
            {/* Status pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 32,
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? "none" : "translateY(20px)",
                transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  background: "#22c55e",
                  borderRadius: "50%",
                  animation: "glow 2.5s infinite",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  ...mono,
                  fontSize: 10,
                  color: "#4ade80",
                  letterSpacing: isMobile ? "0.15em" : "0.4em",
                  textTransform: "uppercase",
                }}
              >
                Open · Accepting Clients Now
              </span>
            </div>

            {/* Main headline */}
            <div style={{ marginBottom: 36 }}>
              {[
                { text: "Where", delay: "0.2s", italic: false },
                { text: "Every", delay: "0.3s", italic: false },
                { text: "Cut Tells", delay: "0.4s", italic: false },
                { text: "A Story.", delay: "0.5s", italic: true, amber: true },
              ].map(({ text, delay, italic, amber }) => (
                <h1
                  key={text}
                  style={{
                    ...sf,
                    fontSize: "clamp(2.8rem,7.5vw,7.2rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    lineHeight: isMobile ? 1.05 : 0.92,
                    letterSpacing: "-0.04em",
                    color: amber ? "#f59e0b" : "white",
                    fontStyle: italic ? "italic" : "normal",
                    opacity: heroLoaded ? 1 : 0,
                    transform: heroLoaded ? "none" : "translateY(40px)",
                    transition: `opacity 1s cubic-bezier(0.16,1,0.3,1) ${delay}, transform 1s cubic-bezier(0.16,1,0.3,1) ${delay}`,
                    margin: 0,
                  }}
                >
                  {text}
                </h1>
              ))}
            </div>

            {/* Sub copy + CTA side by side */}
            <div
              style={{
                display: "flex",
                gap: isMobile ? 24 : 40,
                alignItems: "flex-end",
                flexWrap: "wrap",
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? "none" : "translateY(24px)",
                transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.7s",
              }}
            >
              <div style={{ flex: 1, minWidth: isMobile ? "100%" : "280px" }}>
                <p
                  style={{
                    ...mono,
                    fontSize: "clamp(12px,1.4vw,14px)",
                    color: "#71717a",
                    lineHeight: 1.85,
                    maxWidth: 420,
                  }}
                >
                  HEADZ UP is Hattiesburg's premier barbershop. We don't just
                  cut hair — we craft confidence. Every client, every time, no
                  exceptions.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexShrink: 0,
                  flexWrap: "wrap",
                }}
              >
                <a href="/book" onClick={book} className="cta">
                  <span>Book Your Cut →</span>
                </a>
              </div>
            </div>

            {/* Stats strip */}
            <div
              style={{
                display: "flex",
                gap: 0,
                marginTop: isMobile ? 36 : 72,
                paddingTop: isMobile ? 20 : 32,
                borderTop: "1px solid rgba(255,255,255,0.07)",
                flexWrap: "wrap",
                opacity: heroLoaded ? 1 : 0,
                transition: "all 1s cubic-bezier(0.16,1,0.3,1) 0.9s",
              }}
            >
              {[
                { n: "5.0", label: "Star Rating", sub: "Google Reviews" },
                { n: "11", label: "Services", sub: "Every Style" },
                { n: "100+", label: "Happy Clients", sub: "& Counting" },
                { n: "24/7", label: "Book Online", sub: "Anytime, Anywhere" },
              ].map(({ n, label, sub }, i) => (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    minWidth: isMobile ? 120 : 130,
                    padding: `0 ${i > 0 ? "16px" : "0"} 0 ${i > 0 ? "16px" : "0"}`,
                    borderLeft:
                      i > 0 ? "1px solid rgba(255,255,255,0.07)" : "none",
                    marginBottom: 16,
                  }}
                >
                  <p
                    style={{
                      ...sf,
                      fontSize: "clamp(1.6rem,3.5vw,2.4rem)",
                      fontWeight: 900,
                      color: "#f59e0b",
                      lineHeight: 1,
                      marginBottom: 6,
                    }}
                  >
                    {n}
                  </p>
                  <p
                    style={{
                      ...mono,
                      fontSize: 10,
                      color: "#d4d4d4",
                      letterSpacing: "0.1em",
                      marginBottom: 2,
                    }}
                  >
                    {label}
                  </p>
                  <p
                    style={{
                      ...mono,
                      fontSize: 9,
                      color: "#3f3f46",
                      letterSpacing: "0.2em",
                    }}
                  >
                    {sub}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll line */}
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
              paddingBottom: 24,
              opacity: heroLoaded ? 1 : 0,
              transition: "opacity 1s ease 1.4s",
            }}
          >
            <span
              style={{
                ...mono,
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
                height: 48,
                background:
                  "linear-gradient(to bottom,rgba(245,158,11,0.6),transparent)",
              }}
            />
          </div>
        </section>

        {/* ═══════════════════════ TICKER ═══════════════════════ */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(245,158,11,0.03)",
            overflow: "hidden",
            padding: "13px 0",
          }}
        >
          <div className="ticker">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span
                key={i}
                style={{
                  ...mono,
                  fontSize: 9,
                  color: "rgba(245,158,11,0.55)",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  padding: "0 36px",
                  flexShrink: 0,
                }}
              >
                ✦ {t}
              </span>
            ))}
          </div>
        </div>

        {/* ═══════════════════════ GALLERY CAROUSEL ═══════════════════════ */}
        <GalleryCarousel isMobile={isMobile} />

        {/* ═══════════════════════ SERVICES ═══════════════════════ */}
        <section
          id="services"
          style={{ padding: isMobile ? "60px 20px" : "120px 28px" }}
        >
          <div style={{ maxWidth: 1320, margin: "0 auto" }}>
            {/* Section label */}
            <div
              data-id="s1"
              className={`rv${R("s1") ? " on" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                marginBottom: 64,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 1,
                  background: "rgba(245,158,11,0.5)",
                }}
              />
              <span
                style={{
                  ...mono,
                  fontSize: 8,
                  color: "#f59e0b",
                  letterSpacing: "0.6em",
                  textTransform: "uppercase",
                }}
              >
                Services · {SERVICES.length} Options
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: isMobile ? "32px" : "0 80px",
                alignItems: "start",
              }}
            >
              {/* Left — headline */}
              <div
                data-id="s2"
                className={`rv${R("s2") ? " on" : ""}`}
                style={{ marginBottom: 40 }}
              >
                <h2
                  style={{
                    ...sf,
                    fontSize: "clamp(2.2rem,5vw,4rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    lineHeight: 0.88,
                    letterSpacing: "-0.04em",
                  }}
                >
                  The
                  <br />
                  <span className="outline">Full</span>
                  <br />
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    Menu_
                  </span>
                </h2>
              </div>

              {/* Right — description */}
              <div
                data-id="s3"
                className={`rv d1${R("s3") ? " on" : ""}`}
                style={{ paddingTop: 8 }}
              >
                <p
                  style={{
                    ...mono,
                    fontSize: 13,
                    color: "#71717a",
                    lineHeight: 1.8,
                    marginBottom: 24,
                  }}
                >
                  From a quick lineup to a full cut and shave experience — every
                  service delivered with the same obsessive precision.
                </p>
                <a
                  href="/book"
                  onClick={book}
                  className="cta"
                  style={{ padding: "14px 28px", fontSize: 8 }}
                >
                  <span>Book Any Service →</span>
                </a>
              </div>
            </div>

            {/* Service list */}
            <div
              data-id="s4"
              className={`rv${R("s4") ? " on" : ""}`}
              style={{
                marginTop: 48,
                borderTop: "1px solid rgba(255,255,255,0.07)",
              }}
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
                    padding: "22px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {/* Index */}
                    <span
                      style={{
                        ...mono,
                        fontSize: 9,
                        color: hovSvc === svc.name ? "#f59e0b" : "#27272a",
                        minWidth: 32,
                        transition: "color 0.2s",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    {/* Name */}
                    <span
                      style={{
                        ...sf,
                        fontSize: "clamp(9px,1.3vw,12px)",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        color: hovSvc === svc.name ? "white" : "#a1a1aa",
                        transition: "color 0.2s",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {svc.name}
                    </span>

                    {/* Popular badge */}
                    {svc.popular && (
                      <span
                        style={{
                          ...mono,
                          fontSize: 7,
                          color: "#000",
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
                      gap: 28,
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ ...mono, fontSize: 9, color: "#3f3f46" }}>
                      {svc.duration}
                    </span>
                    <span
                      style={{
                        ...sf,
                        fontSize: "clamp(14px,2vw,22px)",
                        fontWeight: 900,
                        color: hovSvc === svc.name ? "#f59e0b" : "white",
                        transition: "color 0.2s",
                        minWidth: 48,
                        textAlign: "right",
                      }}
                    >
                      ${svc.price}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        opacity: hovSvc === svc.name ? 1 : 0,
                        color: "#f59e0b",
                        transform:
                          hovSvc === svc.name
                            ? "translateX(0)"
                            : "translateX(-6px)",
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

        {/* ═══════════════════════ BARBER ═══════════════════════ */}
        {/* ═══════════════════════ PERSONA SELECT ═══════════════════════ */}
        <PersonaSelect
          homeBarbers={homeBarbers}
          book={book}
          isMobile={isMobile}
          R={R}
          mono={mono}
          sf={sf}
        />

        {/* ═══════════════════════ REVIEWS ═══════════════════════ */}
        <section
          id="reviews"
          style={{ padding: isMobile ? "60px 20px" : "120px 28px" }}
        >
          <div style={{ maxWidth: 1320, margin: "0 auto" }}>
            <div
              data-id="r1"
              className={`rv${R("r1") ? " on" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                marginBottom: 64,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 1,
                  background: "rgba(245,158,11,0.5)",
                }}
              />
              <span
                style={{
                  ...mono,
                  fontSize: 8,
                  color: "#f59e0b",
                  letterSpacing: "0.6em",
                  textTransform: "uppercase",
                }}
              >
                Client Reviews
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: isMobile ? 28 : 80,
                alignItems: isMobile ? "start" : "center",
              }}
            >
              <div data-id="r2" className={`rv${R("r2") ? " on" : ""}`}>
                <h2
                  style={{
                    ...sf,
                    fontSize: "clamp(2.2rem,5vw,4rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    lineHeight: 0.88,
                    letterSpacing: "-0.04em",
                  }}
                >
                  Word
                  <br />
                  <span className="outline">of</span>
                  <br />
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    Mouth_
                  </span>
                </h2>
                <p
                  style={{
                    ...mono,
                    fontSize: 13,
                    color: "#52525b",
                    lineHeight: 1.8,
                    marginTop: 24,
                  }}
                >
                  Don't take our word for it. These are real clients, real
                  reviews.
                </p>

                {/* Dot nav */}
                <div style={{ display: "flex", gap: 8, marginTop: 40 }}>
                  {REVIEWS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setReviewIdx(i)}
                      style={{
                        width: i === reviewIdx ? 28 : 6,
                        height: 6,
                        background:
                          i === reviewIdx
                            ? "#f59e0b"
                            : "rgba(255,255,255,0.15)",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.35s",
                        padding: 0,
                        borderRadius: 0,
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
                      display: i === reviewIdx ? "block" : "none",
                      padding: "40px 36px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderLeft: "2px solid #f59e0b",
                      animation:
                        i === reviewIdx ? "menuSlide 0.5s ease" : "none",
                    }}
                  >
                    <div style={{ display: "flex", gap: 3, marginBottom: 20 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          style={{ color: "#f59e0b", fontSize: 12 }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <p
                      style={{
                        ...sf,
                        fontSize: "clamp(0.95rem,1.8vw,1.15rem)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        lineHeight: 1.5,
                        letterSpacing: "-0.02em",
                        color: "white",
                        marginBottom: 24,
                      }}
                    >
                      "{rv.quote}"
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
                        }}
                      >
                        <span
                          style={{
                            ...sf,
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
                            ...mono,
                            fontSize: 10,
                            color: "white",
                            letterSpacing: "0.2em",
                          }}
                        >
                          {rv.name}
                        </p>
                        <p
                          style={{
                            ...mono,
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

        {/* ═══════════════════════ LOCATION ═══════════════════════ */}
        <section
          id="location"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            padding: isMobile ? "60px 20px" : "120px 28px",
            background: "rgba(255,255,255,0.015)",
          }}
        >
          <div style={{ maxWidth: 1320, margin: "0 auto" }}>
            <div
              data-id="l1"
              className={`rv${R("l1") ? " on" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                marginBottom: 64,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 1,
                  background: "rgba(245,158,11,0.5)",
                }}
              />
              <span
                style={{
                  ...mono,
                  fontSize: 8,
                  color: "#f59e0b",
                  letterSpacing: "0.6em",
                  textTransform: "uppercase",
                }}
              >
                Find Us
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: isMobile ? 28 : 80,
                alignItems: isMobile ? "start" : "center",
              }}
            >
              <div data-id="l2" className={`rv${R("l2") ? " on" : ""}`}>
                <h2
                  style={{
                    ...sf,
                    fontSize: "clamp(2.2rem,5vw,4rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    lineHeight: 0.88,
                    letterSpacing: "-0.04em",
                    marginBottom: 48,
                  }}
                >
                  Come
                  <br />
                  <span className="outline">See</span>
                  <br />
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    Us_
                  </span>
                </h2>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 28,
                    marginBottom: 48,
                  }}
                >
                  {[
                    {
                      icon: "📍",
                      label: "Address",
                      value: "4 Hub Dr, Hattiesburg, MS 39402",
                    },
                    {
                      icon: "🕐",
                      label: "Mon – Fri",
                      value: "9:00 AM – 6:00 PM",
                    },
                    {
                      icon: "✂️",
                      label: "Saturday",
                      value: "9:00 AM – 4:00 PM",
                    },
                    { icon: "🚫", label: "Sunday", value: "Closed" },
                  ].map(({ icon, label, value }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        gap: 18,
                        alignItems: "flex-start",
                        paddingBottom: 28,
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <span
                        style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}
                      >
                        {icon}
                      </span>
                      <div>
                        <p
                          style={{
                            ...mono,
                            fontSize: 8,
                            color: "#52525b",
                            letterSpacing: "0.4em",
                            textTransform: "uppercase",
                            marginBottom: 5,
                          }}
                        >
                          {label}
                        </p>
                        <p
                          style={{
                            ...mono,
                            fontSize: 14,
                            color: "#d4d4d4",
                            lineHeight: 1.5,
                          }}
                        >
                          {value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <a href="/book" onClick={book} className="cta">
                  <span>Lock In Your Spot →</span>
                </a>
              </div>

              {/* Visual map card */}
              <div
                data-id="l3"
                className={`rv d2${R("l3") ? " on" : ""}`}
                style={{ position: "relative" }}
              >
                <div
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: 48,
                    position: "relative",
                    overflow: "hidden",
                    minHeight: 400,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Grid inside */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",
                      backgroundSize: "40px 40px",
                    }}
                  />

                  {/* Ripple rings */}
                  {[160, 240, 340].map((size, i) => (
                    <div
                      key={size}
                      style={{
                        position: "absolute",
                        width: size,
                        height: size,
                        border: `1px solid rgba(245,158,11,${0.15 - i * 0.04})`,
                        borderRadius: "50%",
                        pointerEvents: "none",
                      }}
                    />
                  ))}

                  {/* Pin */}
                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        background: "#f59e0b",
                        margin: "0 auto 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 50px rgba(245,158,11,0.5)",
                      }}
                    >
                      <span style={{ fontSize: 24 }}>📍</span>
                    </div>
                    <p
                      style={{
                        ...sf,
                        fontSize: 10,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        color: "white",
                        marginBottom: 8,
                        letterSpacing: "0.05em",
                      }}
                    >
                      HEADZ UP BARBERSHOP
                    </p>
                    <p style={{ ...mono, fontSize: 11, color: "#71717a" }}>
                      4 Hub Dr, Hattiesburg MS
                    </p>
                    <p style={{ ...mono, fontSize: 11, color: "#71717a" }}>
                      39402
                    </p>
                  </div>

                  {/* Coordinate text */}
                  <p
                    style={{
                      position: "absolute",
                      bottom: 12,
                      right: 16,
                      ...mono,
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

        {/* ═══════════════════════ CTA BAND ═══════════════════════ */}
        <section style={{ background: "#f59e0b", padding: "80px 28px" }}>
          <div
            style={{
              maxWidth: 1320,
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 32,
            }}
          >
            <div>
              <h2
                style={{
                  ...sf,
                  fontSize: "clamp(1.8rem,4vw,3.2rem)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  lineHeight: 0.9,
                  letterSpacing: "-0.04em",
                  color: "black",
                }}
              >
                Ready To Look
                <br />
                Your Best?
              </h2>
            </div>
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
                  ...sf,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  padding: "18px 36px",
                  background: "black",
                  color: "white",
                  textDecoration: "none",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  display: "inline-block",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#040404";
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
                  ...mono,
                  fontSize: 11,
                  color: "rgba(0,0,0,0.5)",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "black")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(0,0,0,0.5)")
                }
              >
                Or call us
              </a>
            </div>
          </div>
        </section>

        {/* ═══════════════════════ FOOTER ═══════════════════════ */}
        <footer
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            padding: "36px 28px",
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
              gap: 16,
            }}
          >
            <p
              style={{
                ...sf,
                fontSize: 16,
                fontWeight: 900,
                letterSpacing: "-0.06em",
              }}
            >
              HEADZ
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </p>
            <p
              style={{
                ...mono,
                fontSize: 9,
                color: "#27272a",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              © {new Date().getFullYear()} · Hattiesburg, MS
            </p>
            <div style={{ display: "flex", gap: 24 }}>
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
                    ...mono,
                    fontSize: 9,
                    color: "#3f3f46",
                    textDecoration: "none",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    transition: "color 0.2s",
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
