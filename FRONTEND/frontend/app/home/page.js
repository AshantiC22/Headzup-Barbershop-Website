"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/lib/LoadingScreen";
import useBreakpoint from "@/lib/useBreakpoint";

const D = { fontFamily: "'Syncopate',sans-serif" };
const M = { fontFamily: "'DM Mono',monospace" };

/* ─── PERSONA SELECT ────────────────────────────────────────────────────── */
function PersonaSelect({ barbers, book, isMobile }) {
  const [sel, setSel] = useState(0);
  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState(false);
  const [hov, setHov] = useState(null);
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
        background: "#020202",
        borderTop: "2px solid rgba(245,158,11,0.15)",
        borderBottom: "2px solid rgba(245,158,11,0.15)",
      }}
    >
      <style>{`
        .ps-flash { animation: lockin 0.7s ease; }
        .ps-name  { animation: nameIn 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        .ps-sbar  { animation: statgrow 0.9s cubic-bezier(0.4,0,0.2,1) both; }
        .ps-scan  { animation: scanright 5s linear infinite; }
        .ps-card  { transition: transform 0.3s, border-color 0.3s, filter 0.3s; cursor:pointer; }
        .ps-card:hover { transform:translateY(-3px); }
        .ps-row   { transition: background 0.2s, border-color 0.2s; cursor:pointer; }
        .ps-row:hover  { background: rgba(245,158,11,0.04) !important; border-color: rgba(245,158,11,0.3) !important; }
      `}</style>

      {/* BG photo bleed */}
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
              filter: "brightness(0.12) saturate(0.3)",
              transition: "opacity 0.8s",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background:
                "radial-gradient(ellipse at 65% 35%, rgba(245,158,11,0.05) 0%, transparent 60%)",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right,rgba(2,2,2,0.97) 0%,rgba(2,2,2,0.75) 45%,rgba(2,2,2,0.95) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top,rgba(2,2,2,0.98) 0%,transparent 45%)",
          }}
        />
        <div
          className="ps-scan"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "25%",
            background:
              "linear-gradient(to right,transparent,rgba(245,158,11,0.025),transparent)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(245,158,11,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.02) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
            pointerEvents: "none",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1320,
          margin: "0 auto",
          padding: isMobile ? "44px 20px 52px" : "88px 40px 96px",
        }}
      >
        {/* Section header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: isMobile ? 32 : 52,
          }}
        >
          <div style={{ width: 3, height: 24, background: "var(--amber)" }} />
          <span
            style={{
              ...M,
              fontSize: 8,
              color: "var(--amber)",
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
                "linear-gradient(to right,rgba(245,158,11,0.25),transparent)",
            }}
          />
          <div className="hud-tag" style={{ fontSize: 8 }}>
            {String(sel + 1).padStart(2, "0")} /{" "}
            {String(list.length).padStart(2, "0")}
          </div>
        </div>

        {/* ── MOBILE ── */}
        {isMobile ? (
          <div>
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 12,
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
                  className="ps-card"
                  style={{
                    flexShrink: 0,
                    width: 88,
                    height: 116,
                    border: `2px solid ${i === sel ? "var(--amber)" : "rgba(255,255,255,0.07)"}`,
                    background: "var(--s1)",
                    overflow: "hidden",
                    padding: 0,
                    position: "relative",
                    filter: i === sel ? "none" : "brightness(0.4)",
                    minHeight: "auto",
                    minWidth: "auto",
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
                          color: "var(--amber)",
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
                        background: "var(--amber)",
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 6,
                      height: 6,
                      background: "var(--green)",
                      borderRadius: "50%",
                      border: "1px solid #020202",
                    }}
                  />
                </button>
              ))}
            </div>

            <div className={flash ? "ps-flash" : ""}>
              <div className="hud-tag" style={{ marginBottom: 12 }}>
                {locked ? "✓ Locked In" : "Barber · HEADZ UP"}
              </div>
              <h2
                key={`m-${active.id}`}
                className="ps-name"
                style={{
                  ...D,
                  fontSize: "clamp(2rem,7.5vw,2.8rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  lineHeight: 1.05,
                  marginBottom: active.bio ? 12 : 20,
                  color: locked ? "var(--amber)" : "white",
                }}
              >
                {active.name}
              </h2>
              {active.bio && (
                <p
                  style={{
                    ...M,
                    fontSize: 12,
                    color: "var(--sub)",
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
                        color: "var(--muted)",
                        letterSpacing: "0.3em",
                        textTransform: "uppercase",
                        width: 58,
                        flexShrink: 0,
                      }}
                    >
                      {s.k}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 2,
                        background: "rgba(255,255,255,0.06)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        className="ps-sbar"
                        key={`m-stat-${active.id}-${s.k}`}
                        style={{
                          position: "absolute",
                          inset: "0 auto 0 0",
                          background:
                            "linear-gradient(to right,var(--amber),var(--amber2))",
                          "--w": `${s.v}%`,
                          width: `${s.v}%`,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        ...M,
                        fontSize: 9,
                        color: "var(--amber)",
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
              <button onClick={lock} className="cta" style={{ width: "100%" }}>
                <span>Book {active.name} →</span>
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={lock}
                  style={{
                    flex: 1,
                    padding: "16px",
                    background: "var(--green)",
                    color: "black",
                    ...D,
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: "pointer",
                    clipPath:
                      "polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",
                  }}
                >
                  ✓ Confirm
                </button>
                <button
                  onClick={() => setLocked(false)}
                  style={{
                    padding: "16px 18px",
                    background: "transparent",
                    color: "var(--muted)",
                    ...M,
                    fontSize: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── DESKTOP ── */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "320px 1fr",
              gap: 56,
              alignItems: "start",
            }}
          >
            {/* Roster panel */}
            <div>
              <p
                style={{
                  ...M,
                  fontSize: 7,
                  color: "var(--dim)",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  marginBottom: 14,
                }}
              >
                — Fighter Roster —
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
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
                      alignItems: "center",
                      gap: 0,
                      background:
                        i === sel ? "rgba(245,158,11,0.05)" : "transparent",
                      border: `1px solid ${i === sel ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.06)"}`,
                      overflow: "hidden",
                      position: "relative",
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
                          background: "var(--amber)",
                        }}
                      />
                    )}
                    <div
                      style={{
                        width: 72,
                        height: 88,
                        flexShrink: 0,
                        overflow: "hidden",
                        background: "var(--s2)",
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
                                : "brightness(0.5) saturate(0.5)",
                            transition: "filter 0.3s",
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
                              fontSize: 26,
                              color: "var(--amber)",
                              fontWeight: 900,
                            }}
                          >
                            {(b.name || "?").charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, padding: "0 16px 0 12px" }}>
                      <p
                        style={{
                          ...M,
                          fontSize: 7,
                          color: i === sel ? "var(--amber)" : "var(--dim)",
                          letterSpacing: "0.4em",
                          textTransform: "uppercase",
                          marginBottom: 4,
                          transition: "color 0.2s",
                        }}
                      >
                        Barber #{String(i + 1).padStart(2, "0")}
                      </p>
                      <p
                        style={{
                          ...D,
                          fontSize: 12,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          color: i === sel ? "white" : "var(--muted)",
                          letterSpacing: "-0.02em",
                          transition: "color 0.2s",
                        }}
                      >
                        {b.name}
                      </p>
                    </div>
                    {i === sel && (
                      <span
                        style={{
                          ...M,
                          fontSize: 7,
                          color: "black",
                          background: "var(--amber)",
                          padding: "4px 10px",
                          marginRight: 12,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                        }}
                      >
                        {locked ? "LOCKED" : "ACTIVE"}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 20,
                  padding: "14px 16px",
                  border: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(245,158,11,0.025)",
                  borderLeft: "2px solid rgba(245,158,11,0.3)",
                }}
              >
                <p
                  style={{
                    ...M,
                    fontSize: 9,
                    color: "var(--dim)",
                    lineHeight: 1.8,
                  }}
                >
                  {locked
                    ? `✓ ${active.name} locked in — confirm below`
                    : "Select a barber then lock in your session"}
                </p>
              </div>
            </div>

            {/* Active display */}
            <div className={flash ? "ps-flash" : ""}>
              {/* Photo panel */}
              <div
                style={{
                  position: "relative",
                  height: 500,
                  overflow: "hidden",
                  border: "1px solid rgba(245,158,11,0.15)",
                  marginBottom: 28,
                  clipPath:
                    "polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))",
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
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(135deg,var(--s2),var(--s3))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        ...D,
                        fontSize: 160,
                        color: "rgba(245,158,11,0.06)",
                        fontWeight: 900,
                      }}
                    >
                      {(active.name || "?").charAt(0)}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top,rgba(2,2,2,0.97) 0%,rgba(2,2,2,0.35) 40%,transparent 70%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to right,rgba(2,2,2,0.5) 0%,transparent 40%)",
                  }}
                />

                {/* Scanline effect */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                      "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.08) 3px,rgba(0,0,0,0.08) 4px)",
                    pointerEvents: "none",
                  }}
                />

                {/* Corner brackets */}
                {[
                  {
                    top: 8,
                    left: 8,
                    borderTop: "1px solid rgba(245,158,11,0.6)",
                    borderLeft: "1px solid rgba(245,158,11,0.6)",
                  },
                  {
                    top: 8,
                    right: 8,
                    borderTop: "1px solid rgba(245,158,11,0.6)",
                    borderRight: "1px solid rgba(245,158,11,0.6)",
                  },
                  {
                    bottom: 8,
                    left: 8,
                    borderBottom: "1px solid rgba(245,158,11,0.6)",
                    borderLeft: "1px solid rgba(245,158,11,0.6)",
                  },
                  {
                    bottom: 8,
                    right: 8,
                    borderBottom: "1px solid rgba(245,158,11,0.6)",
                    borderRight: "1px solid rgba(245,158,11,0.6)",
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      width: 16,
                      height: 16,
                      ...s,
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
                    padding: "28px 32px",
                  }}
                >
                  <div
                    className="hud-tag"
                    style={{ marginBottom: 12, display: "inline-flex" }}
                  >
                    HEADZ UP · BARBER
                  </div>
                  <h2
                    key={`d-${active.id}`}
                    className="ps-name"
                    style={{
                      ...D,
                      fontSize: "clamp(2rem,3.5vw,3rem)",
                      fontWeight: 900,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      marginBottom: active.bio ? 10 : 0,
                      color: "white",
                    }}
                  >
                    {active.name}
                  </h2>
                  {active.bio && (
                    <p
                      style={{
                        ...M,
                        fontSize: 12,
                        color: "rgba(255,255,255,0.5)",
                        lineHeight: 1.6,
                        maxWidth: 440,
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
                        background: "var(--green)",
                        borderRadius: "50%",
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

                {/* HUD overlay top right */}
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    textAlign: "right",
                  }}
                >
                  <div className="hud-tag">HEADZ UP</div>
                </div>
              </div>

              {/* Stats + profile */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 24,
                  marginBottom: 24,
                }}
              >
                <div>
                  <p
                    style={{
                      ...M,
                      fontSize: 7,
                      color: "var(--dim)",
                      letterSpacing: "0.5em",
                      textTransform: "uppercase",
                      marginBottom: 14,
                    }}
                  >
                    // STATS
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 11,
                    }}
                  >
                    {STATS.map((s) => (
                      <div
                        key={s.k}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            ...M,
                            fontSize: 8,
                            color: "var(--muted)",
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
                            background: "rgba(255,255,255,0.06)",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            className="ps-sbar"
                            key={`d-stat-${active.id}-${s.k}`}
                            style={{
                              position: "absolute",
                              inset: "0 auto 0 0",
                              background:
                                "linear-gradient(to right,var(--amber),var(--amber2))",
                              "--w": `${s.v}%`,
                              width: `${s.v}%`,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            ...M,
                            fontSize: 9,
                            color: "var(--amber)",
                            minWidth: 28,
                            textAlign: "right",
                            fontWeight: 500,
                          }}
                        >
                          {s.v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p
                    style={{
                      ...M,
                      fontSize: 7,
                      color: "var(--dim)",
                      letterSpacing: "0.5em",
                      textTransform: "uppercase",
                      marginBottom: 14,
                    }}
                  >
                    // PROFILE
                  </p>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 9 }}
                  >
                    {[
                      ["Shop", "HEADZ UP"],
                      ["City", "Hattiesburg, MS"],
                      ["Style", "Precision Fades"],
                      ["Rating", "★★★★★"],
                      ["Status", "● Available"],
                    ].map(([l, v]) => (
                      <div
                        key={l}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingBottom: 8,
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <span
                          style={{
                            ...M,
                            fontSize: 8,
                            color: "var(--dim)",
                            letterSpacing: "0.2em",
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
                                ? "var(--amber)"
                                : "var(--body)",
                          }}
                        >
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div style={{ display: "flex", gap: 10 }}>
                {!locked ? (
                  <>
                    <button onClick={lock} className="cta" style={{ flex: 1 }}>
                      <span>Lock In — Book {active.name} →</span>
                    </button>
                    <a
                      href="/book"
                      onClick={book}
                      className="cta-ghost"
                      style={{ flexShrink: 0 }}
                    >
                      <span>All Barbers</span>
                    </a>
                  </>
                ) : (
                  <>
                    <button
                      onClick={lock}
                      style={{
                        flex: 1,
                        padding: "17px",
                        background: "var(--green)",
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
                      ✓ Confirmed — Book Now
                    </button>
                    <button
                      onClick={() => setLocked(false)}
                      className="cta-ghost"
                      style={{ flexShrink: 0 }}
                    >
                      <span>← Change</span>
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

/* ─── GALLERY CAROUSEL ──────────────────────────────────────────────────── */
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
  const angleRef = useRef(0);
  const COUNT = GALLERY.length;
  const STEP = 360 / COUNT;
  const R = isMobile ? 155 : 275;
  const W = isMobile ? 160 : 235;
  const H = isMobile ? 200 : 300;

  useEffect(() => {
    if (!spinning) return;
    const tick = () => {
      angleRef.current = (angleRef.current + 0.32) % 360;
      setAngle(angleRef.current);
      let idx = Math.round(((360 - angleRef.current) % 360) / STEP) % COUNT;
      if (idx < 0) idx += COUNT;
      setActive(idx);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spinning]);

  const onDS = (e) => {
    setSpinning(false);
    cancelAnimationFrame(rafRef.current);
    setDragging(true);
    setStartX(e.touches ? e.touches[0].clientX : e.clientX);
  };
  const onDM = (e) => {
    if (!dragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const d = x - startX;
    angleRef.current = (angleRef.current + d * 0.5) % 360;
    setAngle(angleRef.current);
    let idx = Math.round(((360 - angleRef.current) % 360) / STEP) % COUNT;
    if (idx < 0) idx += COUNT;
    setActive(idx);
    setStartX(x);
  };
  const onDE = () => {
    setDragging(false);
    setTimeout(() => setSpinning(true), 700);
  };
  const goTo = (i) => {
    setSpinning(false);
    cancelAnimationFrame(rafRef.current);
    angleRef.current = (360 - i * STEP) % 360;
    setAngle(angleRef.current);
    setActive(i);
    setTimeout(() => setSpinning(true), 1400);
  };

  return (
    <section
      style={{
        padding: isMobile ? "44px 0 52px" : "80px 0 88px",
        overflow: "hidden",
        background: "rgba(0,0,0,0.3)",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        position: "relative",
      }}
    >
      <style>{`
        .gc-front { animation: cardpulse 2.8s ease-in-out infinite; }
        @keyframes cardpulse { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0)} 50%{box-shadow:0 0 40px rgba(245,158,11,0.3)} }
      `}</style>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 520,
          height: 420,
          background:
            "radial-gradient(ellipse,rgba(245,158,11,0.06) 0%,transparent 60%)",
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
        <div
          className="hud-tag"
          style={{ display: "inline-flex", marginBottom: 12 }}
        >
          The Work
        </div>
        <h2
          style={{
            ...D,
            fontSize: "clamp(1.5rem,4vw,2.4rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
          }}
        >
          Fresh Every{" "}
          <span style={{ color: "var(--amber)", fontStyle: "italic" }}>
            Time_
          </span>
        </h2>
      </div>

      <div
        style={{
          position: "relative",
          height: isMobile ? 260 : 390,
          perspective: isMobile ? 600 : 920,
          perspectiveOrigin: "50% 50%",
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "none",
        }}
        onMouseDown={onDS}
        onMouseMove={onDM}
        onMouseUp={onDE}
        onMouseLeave={onDE}
        onTouchStart={onDS}
        onTouchMove={onDM}
        onTouchEnd={onDE}
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
                  transform: `rotateY(${i * STEP}deg) translateZ(${R}px)`,
                  overflow: "hidden",
                  border: isFront
                    ? "2px solid var(--amber)"
                    : "1px solid rgba(255,255,255,0.07)",
                  cursor: "pointer",
                  backfaceVisibility: "hidden",
                  clipPath: isFront
                    ? "polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))"
                    : "none",
                }}
              >
                <img
                  src={item.url}
                  alt={item.label}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center top",
                    filter: isFront ? "none" : "brightness(0.3) saturate(0.4)",
                    transition: "filter 0.4s",
                    pointerEvents: "none",
                  }}
                  loading="lazy"
                />
                {isFront && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background:
                        "linear-gradient(to top,rgba(3,3,3,0.97),transparent)",
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
                        marginBottom: 2,
                      }}
                    >
                      {item.label}
                    </p>
                    <p
                      style={{
                        ...M,
                        fontSize: 9,
                        color: "var(--amber)",
                        letterSpacing: "0.2em",
                      }}
                    >
                      {item.sub}
                    </p>
                  </div>
                )}
                {isFront && (
                  <>
                    {[
                      { top: 4, left: 4, bt: "1px", bl: "1px" },
                      { top: 4, right: 4, bt: "1px", br: "1px" },
                      { bottom: 4, left: 4, bb: "1px", bl: "1px" },
                      { bottom: 4, right: 4, bb: "1px", br: "1px" },
                    ].map((c, j) => (
                      <div
                        key={j}
                        style={{
                          position: "absolute",
                          width: 8,
                          height: 8,
                          top: c.top,
                          bottom: c.bottom,
                          left: c.left,
                          right: c.right,
                          borderTop: c.bt && "1px solid rgba(245,158,11,0.8)",
                          borderBottom:
                            c.bb && "1px solid rgba(245,158,11,0.8)",
                          borderLeft: c.bl && "1px solid rgba(245,158,11,0.8)",
                          borderRight: c.br && "1px solid rgba(245,158,11,0.8)",
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
            left: "12%",
            right: "12%",
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
          marginTop: isMobile ? 16 : 24,
        }}
      >
        {GALLERY.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === active ? 22 : 6,
              height: 5,
              background:
                i === active ? "var(--amber)" : "rgba(255,255,255,0.15)",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "all 0.32s",
              minHeight: "auto",
              minWidth: "auto",
              clipPath:
                i === active
                  ? "polygon(0 0,calc(100% - 3px) 0,100% 3px,100% 100%,3px 100%,0 calc(100% - 3px))"
                  : "none",
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
        ✦ Drag to spin ✦
      </p>
    </section>
  );
}

/* ─── STATIC DATA ───────────────────────────────────────────────────────── */
const SERVICES = [
  {
    name: "Haircut & Shave",
    price: 35,
    dur: "30 min",
    tag: "Signature",
    pop: true,
  },
  { name: "Haircut", price: 30, dur: "30 min", tag: "Classic", pop: false },
  {
    name: "Senior Cut and Shave",
    price: 30,
    dur: "30 min",
    tag: "Senior",
    pop: false,
  },
  {
    name: "Kids Cutz (1–12)",
    price: 25,
    dur: "30 min",
    tag: "Kids",
    pop: false,
  },
  {
    name: "Line and Shave",
    price: 25,
    dur: "30 min",
    tag: "Combo",
    pop: false,
  },
  { name: "Senior Cut", price: 25, dur: "30 min", tag: "Senior", pop: false },
  { name: "Beard Trim", price: 20, dur: "15 min", tag: "Beard", pop: false },
  { name: "Line", price: 20, dur: "15 min", tag: "Clean Up", pop: false },
  { name: "Shave", price: 20, dur: "30 min", tag: "Shave", pop: false },
  { name: "Kids Line", price: 15, dur: "30 min", tag: "Kids", pop: false },
  { name: "Senior Line", price: 15, dur: "30 min", tag: "Senior", pop: false },
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
    q: "My son has been going here since he was 3. Fantastic with kids and the cut is always perfect. Love this place.",
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
  "HEADZ UP Barbershop",
];

/* ─── HOME PAGE ─────────────────────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter();
  const heroRef = useRef(null);
  const { isMobile } = useBreakpoint();

  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [barbers, setBarbers] = useState([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [revealed, setRevealed] = useState({});
  const [hovSvc, setHovSvc] = useState(null);
  const [heroIn, setHeroIn] = useState(false);
  const [time, setTime] = useState("");

  /* clock */
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

  /* auth */
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

  /* barbers */
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

  /* scroll */
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* reveal */
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

  /* reviews */
  useEffect(() => {
    const t = setInterval(
      () => setReviewIdx((i) => (i + 1) % REVIEWS.length),
      6500,
    );
    return () => clearInterval(t);
  }, []);

  /* hero entry */
  useEffect(() => {
    if (ready) setTimeout(() => setHeroIn(true), 80);
  }, [ready]);

  const R = (id) => !!revealed[id];
  const go = (e, path) => {
    e.preventDefault();
    router.push(path);
  };
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
        .srow {
          cursor: pointer;
          transition:
            padding-left 0.22s cubic-bezier(0.4, 0, 0.2, 1),
            border-color 0.2s,
            background 0.2s;
        }
        .srow:hover {
          padding-left: 20px !important;
          border-color: rgba(245, 158, 11, 0.3) !important;
          background: rgba(245, 158, 11, 0.025) !important;
        }
        .ticker-track {
          animation: ticker 32s linear infinite;
          display: flex;
          width: max-content;
        }
        @keyframes ticker {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* ── AMBIENT ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.014) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.014) 1px,transparent 1px)",
          backgroundSize: "68px 68px",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "-8%",
          right: "-4%",
          width: 680,
          height: 680,
          background:
            "radial-gradient(circle,rgba(245,158,11,0.05) 0%,transparent 64%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "18%",
          left: "-8%",
          width: 520,
          height: 520,
          background:
            "radial-gradient(circle,rgba(245,158,11,0.03) 0%,transparent 60%)",
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
              "linear-gradient(to right,transparent,rgba(245,158,11,0.2),transparent)",
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
              padding: "0 var(--px)",
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
              }}
            >
              HEADZ
              <span style={{ color: "var(--amber)", fontStyle: "italic" }}>
                UP
              </span>
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
                <a key={l} href={h} className="nlink">
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
                      className="donly cta-ghost"
                      style={{ padding: "9px 16px", fontSize: 7.5 }}
                    >
                      <span>Dashboard</span>
                    </a>
                  )}
                  {isLoggedIn && !isStaff && (
                    <a
                      href="/dashboard"
                      className="donly cta-ghost"
                      style={{ padding: "9px 16px", fontSize: 7.5 }}
                    >
                      <span>My Account</span>
                    </a>
                  )}
                  {!isLoggedIn && (
                    <a
                      href="/barber-login"
                      className="donly cta-ghost"
                      style={{ padding: "9px 16px", fontSize: 7.5 }}
                    >
                      <span>Barbers</span>
                    </a>
                  )}
                </>
              )}
              <a
                href="/book"
                onClick={book}
                className="cta donly"
                style={{ padding: "10px 22px", fontSize: 7.5 }}
              >
                <span>Book Now</span>
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
                      background: menuOpen ? "var(--amber)" : "white",
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

        {/* Mobile menu */}
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
                  padding: "15px var(--px)",
                  ...M,
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--amber)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--muted)")
                }
              >
                {l}
              </a>
            ))}
            <div
              style={{
                padding: "18px var(--px) 4px",
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
                className="cta"
                style={{ justifyContent: "center" }}
              >
                <span>Book Appointment →</span>
              </a>
              {authReady && isLoggedIn && isStaff && (
                <a
                  href="/barber-dashboard"
                  style={{
                    ...D,
                    fontSize: 7,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--amber)",
                    border: "1px solid var(--amber-hi)",
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
                    color: "var(--amber)",
                    border: "1px solid var(--amber-hi)",
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
                    color: "var(--muted)",
                    border: "1px solid var(--border)",
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

        {/* ══ HERO ══ */}
        <section
          ref={heroRef}
          style={{
            minHeight: "100dvh",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg,#030303 0%,#090704 45%,#030303 100%)",
            }}
          />

          {/* Big editorial bg number */}
          <div
            style={{
              position: "absolute",
              right: "-3%",
              top: "6%",
              ...D,
              fontSize: "clamp(14rem,32vw,26rem)",
              fontWeight: 900,
              lineHeight: 1,
              color: "transparent",
              WebkitTextStroke: "1px rgba(255,255,255,0.033)",
              userSelect: "none",
              pointerEvents: "none",
              letterSpacing: "-0.06em",
            }}
          >
            01
          </div>

          {/* Vertical side text */}
          {!isMobile && (
            <div
              style={{
                position: "absolute",
                left: 18,
                top: "50%",
                transform: "translateY(-50%) rotate(-90deg)",
                transformOrigin: "center",
                ...M,
                fontSize: 8,
                letterSpacing: "0.6em",
                color: "var(--dim)",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Hattiesburg, Mississippi — Est. 2020
            </div>
          )}

          {/* Live clock */}
          <div
            style={{
              position: "absolute",
              top: 70,
              right: "var(--px)",
              ...M,
              fontSize: 11,
              color: "var(--dim)",
              letterSpacing: "0.28em",
            }}
          >
            {time}
          </div>

          {/* Horizontal accent line */}
          <div
            style={{
              position: "absolute",
              top: 98,
              left: 0,
              right: 0,
              height: 1,
              background:
                "linear-gradient(to right,transparent,rgba(245,158,11,0.12) 30%,rgba(245,158,11,0.12) 70%,transparent)",
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
              padding: isMobile ? "0 20px 56px" : "0 var(--px) 80px",
              paddingTop: isMobile ? 80 : 120,
            }}
          >
            {/* Status badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 28,
                opacity: heroIn ? 1 : 0,
                transform: heroIn ? "none" : "translateY(18px)",
                transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s",
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  background: "var(--green)",
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
                  letterSpacing: isMobile ? "0.15em" : "0.38em",
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
                      maxWidth: 200,
                    }}
                  />
                  <span
                    style={{
                      ...M,
                      fontSize: 8,
                      color: "var(--dim)",
                      letterSpacing: "0.2em",
                    }}
                  >
                    4 Hub Dr · Hattiesburg MS
                  </span>
                </>
              )}
            </div>

            {/* Headline */}
            <div style={{ marginBottom: isMobile ? 28 : 36 }}>
              {[
                { t: "Where", d: "0.18s", it: false, am: false },
                { t: "Every", d: "0.28s", it: false, am: false },
                { t: "Cut", d: "0.38s", it: false, am: false },
                { t: "Tells", d: "0.46s", it: false, am: false },
                { t: "A Story.", d: "0.55s", it: true, am: true },
              ].map(({ t, d, it, am }) => (
                <h1
                  key={t}
                  style={{
                    ...D,
                    fontSize: "clamp(2.6rem,7vw,6.8rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    lineHeight: isMobile ? 1.08 : 0.92,
                    letterSpacing: "-0.04em",
                    color: am ? "var(--amber)" : "white",
                    fontStyle: it ? "italic" : "normal",
                    opacity: heroIn ? 1 : 0,
                    transform: heroIn ? "none" : "translateY(36px)",
                    transition: `opacity 1s cubic-bezier(0.16,1,0.3,1) ${d}, transform 1s cubic-bezier(0.16,1,0.3,1) ${d}`,
                    margin: 0,
                  }}
                >
                  {t}
                </h1>
              ))}
            </div>

            {/* Subtext + cta */}
            <div
              style={{
                display: "flex",
                gap: isMobile ? 24 : 40,
                alignItems: "flex-end",
                flexWrap: "wrap",
                opacity: heroIn ? 1 : 0,
                transform: heroIn ? "none" : "translateY(20px)",
                transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.68s",
              }}
            >
              <div style={{ flex: 1, minWidth: isMobile ? "100%" : "260px" }}>
                <p
                  style={{
                    ...M,
                    fontSize: "clamp(12px,1.3vw,14px)",
                    color: "var(--sub)",
                    lineHeight: 1.85,
                    maxWidth: 420,
                  }}
                >
                  Hattiesburg's premier barbershop. We don't just cut hair — we
                  craft confidence. Every client, every time, no exceptions.
                </p>
              </div>
              <a href="/book" onClick={book} className="cta">
                <span>Book Your Cut →</span>
              </a>
            </div>

            {/* Stats strip */}
            <div
              style={{
                display: "flex",
                gap: 0,
                marginTop: isMobile ? 36 : 68,
                paddingTop: isMobile ? 18 : 28,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                flexWrap: "wrap",
                opacity: heroIn ? 1 : 0,
                transition: "all 1s cubic-bezier(0.16,1,0.3,1) 0.88s",
              }}
            >
              {[
                { n: "5.0", l: "Star Rating", s: "Google" },
                { n: "11", l: "Services", s: "Every style" },
                { n: "100+", l: "Clients", s: "& counting" },
                { n: "24/7", l: "Book Online", s: "Anytime" },
              ].map(({ n, l, s }, i) => (
                <div
                  key={l}
                  style={{
                    flex: 1,
                    minWidth: isMobile ? 110 : 130,
                    padding: `0 ${i > 0 ? 14 : 0}px`,
                    borderLeft:
                      i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    marginBottom: 14,
                  }}
                >
                  <p
                    style={{
                      ...D,
                      fontSize: "clamp(1.5rem,3vw,2.2rem)",
                      fontWeight: 900,
                      color: "var(--amber)",
                      lineHeight: 1,
                      marginBottom: 5,
                    }}
                  >
                    {n}
                  </p>
                  <p
                    style={{
                      ...M,
                      fontSize: 10,
                      color: "var(--body)",
                      letterSpacing: "0.1em",
                      marginBottom: 2,
                    }}
                  >
                    {l}
                  </p>
                  <p
                    style={{
                      ...M,
                      fontSize: 9,
                      color: "var(--dim)",
                      letterSpacing: "0.2em",
                    }}
                  >
                    {s}
                  </p>
                </div>
              ))}
            </div>
          </div>

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
              paddingBottom: 22,
              opacity: heroIn ? 1 : 0,
              transition: "opacity 1s ease 1.4s",
            }}
          >
            <span
              style={{
                ...M,
                fontSize: 8,
                color: "var(--dim)",
                letterSpacing: "0.5em",
                textTransform: "uppercase",
              }}
            >
              Scroll
            </span>
            <div
              style={{
                width: 1,
                height: 44,
                background:
                  "linear-gradient(to bottom,rgba(245,158,11,0.55),transparent)",
              }}
            />
          </div>
        </section>

        {/* ══ TICKER ══ */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(245,158,11,0.025)",
            overflow: "hidden",
            padding: "12px 0",
          }}
        >
          <div className="ticker-track">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span
                key={i}
                style={{
                  ...M,
                  fontSize: 9,
                  color: "rgba(245,158,11,0.5)",
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
            padding: isMobile ? "56px 20px" : "var(--section) var(--px)",
          }}
        >
          <div style={{ maxWidth: 1320, margin: "0 auto" }}>
            <div
              data-id="s1"
              className={`rv${R("s1") ? " on" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: isMobile ? 32 : 56,
              }}
            >
              <div
                style={{ width: 3, height: 24, background: "var(--amber)" }}
              />
              <span
                style={{
                  ...M,
                  fontSize: 8,
                  color: "var(--amber)",
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
                gap: isMobile ? 28 : 80,
                alignItems: "start",
                marginBottom: 44,
              }}
            >
              <div data-id="s2" className={`rv${R("s2") ? " on" : ""}`}>
                <h2
                  style={{
                    ...D,
                    fontSize: "clamp(2.2rem,5vw,4rem)",
                    fontWeight: 900,
                    lineHeight: isMobile ? 1.08 : 0.9,
                    letterSpacing: "-0.04em",
                  }}
                >
                  The
                  <br />
                  <span
                    style={{
                      WebkitTextStroke: "1px rgba(255,255,255,0.15)",
                      color: "transparent",
                    }}
                  >
                    Full
                  </span>
                  <br />
                  <span style={{ color: "var(--amber)", fontStyle: "italic" }}>
                    Menu_
                  </span>
                </h2>
              </div>
              <div
                data-id="s3"
                className={`rv d1${R("s3") ? " on" : ""}`}
                style={{ paddingTop: 8 }}
              >
                <p
                  style={{
                    ...M,
                    fontSize: 13,
                    color: "var(--sub)",
                    lineHeight: 1.8,
                    marginBottom: 22,
                  }}
                >
                  From a quick lineup to the full cut and shave experience —
                  every service delivered with the same obsessive precision.
                </p>
                <a
                  href="/book"
                  onClick={book}
                  className="cta"
                  style={{ padding: "14px 26px", fontSize: 8 }}
                >
                  <span>Book Any Service →</span>
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
                    padding: "20px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        ...M,
                        fontSize: 9,
                        color:
                          hovSvc === svc.name ? "var(--amber)" : "var(--dim)",
                        minWidth: 28,
                        transition: "color 0.2s",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        ...D,
                        fontSize: "clamp(8.5px,1.3vw,11.5px)",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        color: hovSvc === svc.name ? "white" : "var(--sub)",
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
                          background: "var(--amber)",
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
                      gap: 24,
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ ...M, fontSize: 9, color: "var(--dim)" }}>
                      {svc.dur}
                    </span>
                    <span
                      style={{
                        ...D,
                        fontSize: "clamp(13px,2vw,20px)",
                        fontWeight: 900,
                        color: hovSvc === svc.name ? "var(--amber)" : "white",
                        transition: "color 0.2s",
                        minWidth: 44,
                        textAlign: "right",
                      }}
                    >
                      ${svc.price}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        opacity: hovSvc === svc.name ? 1 : 0,
                        color: "var(--amber)",
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
            padding: isMobile ? "56px 20px" : "var(--section) var(--px)",
          }}
        >
          <div style={{ maxWidth: 1320, margin: "0 auto" }}>
            <div
              data-id="r1"
              className={`rv${R("r1") ? " on" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: isMobile ? 32 : 52,
              }}
            >
              <div
                style={{ width: 3, height: 24, background: "var(--amber)" }}
              />
              <span
                style={{
                  ...M,
                  fontSize: 8,
                  color: "var(--amber)",
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
                    ...D,
                    fontSize: "clamp(2rem,5vw,3.8rem)",
                    fontWeight: 900,
                    lineHeight: isMobile ? 1.08 : 0.9,
                    letterSpacing: "-0.04em",
                    marginBottom: 20,
                  }}
                >
                  Word
                  <br />
                  <span
                    style={{
                      WebkitTextStroke: "1px rgba(255,255,255,0.15)",
                      color: "transparent",
                    }}
                  >
                    of
                  </span>
                  <br />
                  <span style={{ color: "var(--amber)", fontStyle: "italic" }}>
                    Mouth_
                  </span>
                </h2>
                <p
                  style={{
                    ...M,
                    fontSize: 12,
                    color: "var(--muted)",
                    lineHeight: 1.8,
                    marginBottom: 32,
                  }}
                >
                  Real clients. Real reviews. No fluff.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {REVIEWS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setReviewIdx(i)}
                      style={{
                        width: i === reviewIdx ? 26 : 6,
                        height: 5,
                        background:
                          i === reviewIdx
                            ? "var(--amber)"
                            : "rgba(255,255,255,0.14)",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.32s",
                        padding: 0,
                        minHeight: "auto",
                        minWidth: "auto",
                        clipPath:
                          i === reviewIdx
                            ? "polygon(0 0,calc(100% - 3px) 0,100% 3px,100% 100%,3px 100%,0 calc(100% - 3px))"
                            : "none",
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
                      padding: isMobile ? "28px 22px" : "36px 32px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderLeft: "3px solid var(--amber)",
                      animation:
                        i === reviewIdx ? "fadeUp 0.5s ease both" : "none",
                    }}
                  >
                    <div style={{ display: "flex", gap: 3, marginBottom: 18 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          style={{ color: "var(--amber)", fontSize: 11 }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <p
                      style={{
                        ...D,
                        fontSize: "clamp(0.85rem,1.6vw,1.05rem)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        lineHeight: 1.55,
                        letterSpacing: "-0.02em",
                        color: "white",
                        marginBottom: 20,
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
                          background: "var(--amber)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
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
                            color: "var(--muted)",
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
            padding: isMobile ? "56px 20px" : "var(--section) var(--px)",
            background: "rgba(255,255,255,0.012)",
          }}
        >
          <div style={{ maxWidth: 1320, margin: "0 auto" }}>
            <div
              data-id="l1"
              className={`rv${R("l1") ? " on" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: isMobile ? 32 : 52,
              }}
            >
              <div
                style={{ width: 3, height: 24, background: "var(--amber)" }}
              />
              <span
                style={{
                  ...M,
                  fontSize: 8,
                  color: "var(--amber)",
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
                    ...D,
                    fontSize: "clamp(2rem,5vw,3.8rem)",
                    fontWeight: 900,
                    lineHeight: isMobile ? 1.08 : 0.9,
                    letterSpacing: "-0.04em",
                    marginBottom: 40,
                  }}
                >
                  Come
                  <br />
                  <span
                    style={{
                      WebkitTextStroke: "1px rgba(255,255,255,0.15)",
                      color: "transparent",
                    }}
                  >
                    See
                  </span>
                  <br />
                  <span style={{ color: "var(--amber)", fontStyle: "italic" }}>
                    Us_
                  </span>
                </h2>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 24,
                    marginBottom: 40,
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
                        paddingBottom: 24,
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
                            color: "var(--muted)",
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
                            color: "var(--body)",
                            lineHeight: 1.5,
                          }}
                        >
                          {v}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <a href="/book" onClick={book} className="cta">
                  <span>Lock In Your Spot →</span>
                </a>
              </div>
              <div data-id="l3" className={`rv d2${R("l3") ? " on" : ""}`}>
                <div
                  style={{
                    background: "var(--s1)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    padding: 48,
                    position: "relative",
                    overflow: "hidden",
                    minHeight: 380,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    clipPath:
                      "polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,20px 100%,0 calc(100% - 20px))",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
                      backgroundSize: "36px 36px",
                    }}
                  />
                  {[160, 240, 340].map((sz, i) => (
                    <div
                      key={sz}
                      style={{
                        position: "absolute",
                        width: sz,
                        height: sz,
                        border: `1px solid rgba(245,158,11,${0.14 - i * 0.04})`,
                        borderRadius: "50%",
                      }}
                    />
                  ))}
                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        background: "var(--amber)",
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
                        letterSpacing: "0.04em",
                      }}
                    >
                      HEADZ UP BARBERSHOP
                    </p>
                    <p style={{ ...M, fontSize: 11, color: "var(--sub)" }}>
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
                      color: "var(--dim)",
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
            background: "var(--amber)",
            padding: isMobile ? "56px 20px" : "72px var(--px)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(0,0,0,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.06) 1px,transparent 1px)",
              backgroundSize: "44px 44px",
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
              gap: 28,
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
                  e.currentTarget.style.color = "var(--amber)";
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
                  color: "rgba(0,0,0,0.45)",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "black")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(0,0,0,0.45)")
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
            padding: isMobile ? "28px 20px" : "32px var(--px)",
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
              <span style={{ color: "var(--amber)", fontStyle: "italic" }}>
                UP
              </span>
            </p>
            <p
              style={{
                ...M,
                fontSize: 9,
                color: "var(--dim)",
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
                    color: "var(--dim)",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--amber)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--dim)")
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
