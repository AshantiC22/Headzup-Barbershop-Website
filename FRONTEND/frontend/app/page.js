"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/lib/LoadingScreen";
import useBreakpoint from "@/lib/useBreakpoint";

// Pre-warm Railway backend
if (typeof window !== "undefined") {
  fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/barbers/`, {
    method: "HEAD", signal: AbortSignal.timeout?.(8000),
  }).catch(() => {});
}

const D = { fontFamily:"'Syncopate',sans-serif" };
const M = { fontFamily:"'DM Mono',monospace" };
const A = "#f59e0b";
const R = "#ef4444";

// Only use photo if it's a base64 data URL or a real https URL — ignore stale Railway /media/ paths
const validPhoto = (url) => {
  if (!url) return null;
  if (url.startsWith("data:")) return url;        // base64 — always valid
  if (url.startsWith("https://")) return url;     // external https URL — valid
  return null;                                     // http:// or /media/ path — skip
};

/* ═══════════════════════════════════════════════════════════════════════════
   PERSONA SELECT  —  full-screen fighter-select like Def Jam / P5
═══════════════════════════════════════════════════════════════════════════ */
function PersonaSelect({ barbers, book, isMobile }) {
  const [sel,    setSel]    = useState(0);
  const [locked, setLocked] = useState(false);
  const [flash,  setFlash]  = useState(false);
  const [hover,  setHover]  = useState(null);
  const list   = barbers.length ? barbers : [{ id:0, name:"Barber", bio:"", photo_url:null }];
  const active = list[sel] || list[0];
  const STATS  = [{k:"FADE",v:98},{k:"LINEUP",v:99},{k:"BEARD",v:95},{k:"PRECISION",v:97},{k:"VIBE",v:100}];

  const lock = (e) => {
    setFlash(true); setLocked(true);
    setTimeout(()=>setFlash(false), 700);
    book(e);
  };

  return (
    <section id="barber" style={{ position: "relative", overflow: "hidden", background: "#000", borderTop: `3px solid ${A}`, borderBottom: `3px solid ${A}` }}>
      <style>{`
        .ps-flash { animation: p5-flash 0.7s ease; }
        .ps-name  { animation: p5-namein 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        .ps-bar   { animation: p5-bar 1s cubic-bezier(0.4,0,0.2,1) both; }
        .ps-scan  { animation: p5-scanH 5s linear infinite; }
        .ps-card  { transition: transform 0.25s, filter 0.25s, border-color 0.25s; cursor:pointer; }
        .ps-card:hover { transform:scale(1.03); }
        .ps-row   { transition: background 0.18s, border-color 0.18s; cursor:pointer; }
        .ps-row:hover { background:rgba(245,158,11,0.07) !important; border-color:rgba(245,158,11,0.4) !important; }
        @keyframes p5-flash  { 0%,100%{opacity:1} 20%,60%{opacity:0} 40%,80%{opacity:0.4} }
        @keyframes p5-namein { from{opacity:0;transform:translateX(-32px) skewX(-5deg)} to{opacity:1;transform:none} }
        @keyframes p5-bar    { from{width:0} to{width:var(--w,100%)} }
        @keyframes p5-scanH  { from{left:-60%} to{left:160%} }
        @keyframes p5-glow   { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)} 50%{box-shadow:0 0 0 10px rgba(34,197,94,0)} }
      `}</style>

      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {validPhoto(active.photo_url || active.photo) ? (
          <img
            key={`bg-${active.id}`}
            src={validPhoto(active.photo_url || active.photo)}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", filter: "brightness(0.08) saturate(0.2)", transition: "opacity 1s" }}
          />
        ) : null}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(0,0,0,0.98) 0%,rgba(0,0,0,0.82) 50%,rgba(0,0,0,0.96) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: 0, right: "30%", width: 2, height: "140%", background: `linear-gradient(to bottom,transparent,${R}22,transparent)`, transform: "rotate(15deg)", transformOrigin: "top center" }} />
          <div style={{ position: "absolute", top: 0, right: "55%", width: 1, height: "140%", background: `linear-gradient(to bottom,transparent,rgba(245,158,11,0.1),transparent)`, transform: "rotate(15deg)", transformOrigin: "top center" }} />
        </div>
        <div className="ps-scan" style={{ position: "absolute", top: 0, bottom: 0, width: "35%", background: `linear-gradient(to right,transparent,rgba(245,158,11,0.025),transparent)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${A}08 1px,transparent 1px),linear-gradient(90deg,${A}08 1px,transparent 1px)`, backgroundSize: "48px 48px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 3px)", pointerEvents: "none" }} />
      </div>

      <div style={{ position: "relative", zIndex: 2, maxWidth: 1320, margin: "0 auto", padding: isMobile ? "44px 20px 52px" : "0 44px", minHeight: isMobile ? "auto" : "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: isMobile ? 28 : 44, overflow: "hidden" }}>
          <div style={{ background: A, padding: "6px 16px 6px 12px", clipPath: "polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)", marginRight: 10 }}>
            <span style={{ ...D, fontSize: 8, fontWeight: 900, color: "#000", letterSpacing: "0.4em", textTransform: "uppercase" }}>SELECT</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.06)", padding: "6px 16px 6px 14px", clipPath: "polygon(8px 0,100% 0,calc(100% - 10px) 100%,0 100%)", marginRight: 10 }}>
            <span style={{ ...D, fontSize: 8, fontWeight: 900, color: "white", letterSpacing: "0.4em", textTransform: "uppercase" }}>YOUR</span>
          </div>
          <div style={{ background: R, padding: "6px 16px 6px 14px", clipPath: "polygon(8px 0,100% 0,calc(100% - 10px) 100%,0 100%)" }}>
            <span style={{ ...D, fontSize: 8, fontWeight: 900, color: "white", letterSpacing: "0.4em", textTransform: "uppercase" }}>BARBER</span>
          </div>
          <div style={{ flex: 1, height: 2, background: `linear-gradient(to right,${R}88,transparent)`, marginLeft: 16 }} />
          <span style={{ ...M, fontSize: 8, color: `${A}66`, letterSpacing: "0.3em" }}>{String(sel + 1).padStart(2, "0")}/{String(list.length).padStart(2, "0")}</span>
        </div>

        {isMobile ? (
          <div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 22 }}>
              {list.map((b, i) => (
                <button key={b.id} onClick={() => { setSel(i); setLocked(false); }}
                  style={{
                    flexShrink: 0, width: 92, height: 118, border: `2px solid ${i === sel ? A : "rgba(255,255,255,0.07)"}`,
                    background: "#0a0a0a", overflow: "hidden", padding: 0, position: "relative", cursor: "pointer",
                    minHeight: "auto", minWidth: "auto", filter: i === sel ? "none" : "brightness(0.3)", transition: "all 0.3s",
                    clipPath: i === sel ? "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))" : "none"
                  }}>
                  {validPhoto(b.photo_url || b.photo) ? (
                    <img src={validPhoto(b.photo_url || b.photo)} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>
                      <span style={{ ...D, fontSize: 28, color: A, fontWeight: 900 }}>{(b.name || "?").charAt(0)}</span>
                    </div>
                  )}
                  {i === sel && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: A }} />}
                  <div style={{ position: "absolute", top: 5, right: 5, width: 7, height: 7, background: "#22c55e", borderRadius: "50%", border: `1.5px solid #000` }} />
                </button>
              ))}
            </div>

            <div className={flash ? "ps-flash" : ""}>
              <div style={{ display: "inline-flex", background: locked ? "#22c55e" : A, padding: "4px 12px 4px 10px", clipPath: "polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))", marginBottom: 12 }}>
                <span style={{ ...M, fontSize: 8, color: "#000", letterSpacing: "0.4em", textTransform: "uppercase" }}>{locked ? "✓ LOCKED IN" : "BARBER PROFILE"}</span>
              </div>

              <h2 key={`m-${active.id}`} className="ps-name" style={{ ...D, fontSize: "clamp(2rem,8vw,2.8rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 10, color: locked ? A : "white", textTransform: "uppercase" }}>
                {active.name}
              </h2>

              {active.bio && <p style={{ ...M, fontSize: 12, color: "#a1a1aa", lineHeight: 1.7, marginBottom: 16 }}>{active.bio}</p>}

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {STATS.map(s => (
                  <div key={s.k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ ...M, fontSize: 7, color: "#a1a1aa", letterSpacing: "0.3em", textTransform: "uppercase", width: 64, flexShrink: 0 }}>{s.k}</span>
                    <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.05)", position: "relative", overflow: "hidden" }}>
                      <div className="ps-bar" key={`ms-${active.id}-${s.k}`} style={{ position: "absolute", inset: "0 auto 0 0", background: `linear-gradient(to right,${A},#fbbf24)`, "--w": `${s.v}%`, width: `${s.v}%` }} />
                    </div>
                    <span style={{ ...M, fontSize: 9, color: A, minWidth: 24, textAlign: "right" }}>{s.v}</span>
                  </div>
                ))}
              </div>

              {!locked ? (
                <button onClick={lock} style={{ width: "100%", padding: "16px", background: A, color: "black", ...D, fontSize: 8, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", border: "none", cursor: "pointer", clipPath: "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))" }}>
                  Book {active.name} →
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={lock} style={{ flex: 1, padding: "16px", background: "#22c55e", color: "black", ...D, fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", border: "none", cursor: "pointer", clipPath: "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))" }}>
                    ✓ CONFIRM
                  </button>
                  <button onClick={() => setLocked(false)} style={{ padding: "16px 18px", background: "transparent", color: "#a1a1aa", border: `1px solid rgba(255,255,255,0.1)`, cursor: "pointer", ...M, fontSize: 10, minHeight: "auto" }}>
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 0, alignItems: "stretch" }}>
            <div style={{ borderRight: `1px solid ${A}22`, paddingRight: 32, paddingTop: 20, paddingBottom: 20 }}>
              {list.map((b, i) => (
                <div key={b.id} onClick={() => { setSel(i); setLocked(false); }} className="ps-row"
                  style={{ display: "flex", alignItems: "stretch", background: i === sel ? `${A}08` : "transparent", border: `1px solid ${i === sel ? `${A}44` : "rgba(255,255,255,0.05)"}`, marginBottom: 6, position: "relative", overflow: "hidden" }}>
                  {i === sel && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: A }} />}
                  {i === sel && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 2, background: `linear-gradient(to bottom,transparent,${R},transparent)` }} />}
                  <div style={{ width: 82, height: 100, flexShrink: 0, overflow: "hidden", background: "#0a0a0a", marginLeft: i === sel ? 3 : 0 }}>
                    {validPhoto(b.photo_url || b.photo) ? (
                      <img src={validPhoto(b.photo_url || b.photo)} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", filter: i === sel ? "none" : "brightness(0.35) saturate(0.4)", transition: "filter 0.3s" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ ...D, fontSize: 30, color: A, fontWeight: 900 }}>{(b.name || "?").charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, padding: "16px 14px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <p style={{ ...M, fontSize: 7, color: i === sel ? `${A}cc` : "rgba(245,158,11,0.2)", letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 5, transition: "color 0.25s" }}>BARBER #{String(i + 1).padStart(2, "0")}</p>
                    <p style={{ ...D, fontSize: 13, fontWeight: 900, textTransform: "uppercase", color: i === sel ? "white" : "#a1a1aa", letterSpacing: "-0.02em", transition: "color 0.25s" }}>{b.name}</p>
                  </div>
                  {i === sel && (
                    <div style={{ display: "flex", alignItems: "center", paddingRight: 14 }}>
                      <div style={{ background: locked ? "#22c55e" : A, padding: "3px 8px", clipPath: "polygon(0 0,calc(100% - 4px) 0,100% 4px,100% 100%,4px 100%,0 calc(100% - 4px))" }}>
                        <span style={{ ...M, fontSize: 7, color: "#000", letterSpacing: "0.2em", textTransform: "uppercase" }}>{locked ? "LOCKED" : "ACTIVE"}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div style={{ marginTop: 16, padding: "14px", borderLeft: `3px solid ${A}44`, background: `${A}04` }}>
                <p style={{ ...M, fontSize: 9, color: "#a1a1aa", lineHeight: 1.8 }}>
                  {locked ? `✓ ${active.name} locked in` : "Select a barber to see their profile"}
                </p>
              </div>
            </div>

            <div className={flash ? "ps-flash" : ""} style={{ paddingLeft: 44, paddingTop: 20, paddingBottom: 20, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
                <div style={{ background: R, padding: "5px 14px 5px 10px", clipPath: "polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)", marginRight: 0 }}>
                  <span style={{ ...M, fontSize: 7, color: "white", letterSpacing: "0.4em", textTransform: "uppercase" }}>HEADZ UP</span>
                </div>
                <div style={{ background: `${A}`, padding: "5px 18px 5px 14px", clipPath: "polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)" }}>
                  <span style={{ ...M, fontSize: 7, color: "black", letterSpacing: "0.4em", textTransform: "uppercase" }}>BARBER</span>
                </div>
                <div style={{ flex: 1, height: 2, background: `linear-gradient(to right,${A}55,transparent)`, marginLeft: 12 }} />
              </div>

              <div style={{ display: "flex", gap: 20, flex: 1, alignItems: "flex-start" }}>
                <div style={{
                  position: "relative",
                  width: 300,
                  flexShrink: 0,
                  clipPath: "polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,20px 100%,0 calc(100% - 20px))",
                  background: "#080808",
                  boxShadow: `0 0 0 1px ${A}22, 0 32px 80px rgba(0,0,0,0.8)`,
                }}>
                  <div style={{ height: 380, overflow: "hidden", position: "relative" }}>
                    {validPhoto(active.photo_url || active.photo) ? (
                      <>
                        <img
                          key={`hero-${active.id}`}
                          src={validPhoto(active.photo_url || active.photo)}
                          alt={active.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%", display: "block", transition: "transform 0.8s cubic-bezier(0.4,0,0.2,1)" }}
                        />
                        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
                      </>
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg,#0d0d0d,#1a1a1a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ ...D, fontSize: 120, color: `${A}08`, fontWeight: 900, userSelect: "none" }}>{(active.name || "?").charAt(0)}</span>
                      </div>
                    )}

                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 120, background: "linear-gradient(to top,#080808 0%,rgba(8,8,8,0.7) 60%,transparent 100%)" }} />

                    {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, left: 8 }, { bottom: 8, right: 8 }].map((c, j) => (
                      <div key={j} style={{ position: "absolute", width: 18, height: 18, ...(c.top !== undefined ? { top: c.top } : {}), ...(c.bottom !== undefined ? { bottom: c.bottom } : {}), ...(c.left !== undefined ? { left: c.left } : {}), ...(c.right !== undefined ? { right: c.right } : {}), pointerEvents: "none" }} />
                    ))}

                    <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 7, height: 7, background: "#22c55e", borderRadius: "50%", animation: "p5-glow 2s infinite", boxShadow: "0 0 8px #22c55e" }} />
                      <span style={{ ...M, fontSize: 7, color: "#4ade80", letterSpacing: "0.3em", textTransform: "uppercase" }}>AVAILABLE</span>
                    </div>

                    <div style={{ position: "absolute", top: 10, right: 10, background: `${R}dd`, padding: "3px 9px", clipPath: "polygon(6px 0,100% 0,100% 100%,0 100%)" }}>
                      <span style={{ ...M, fontSize: 6, color: "white", letterSpacing: "0.3em", textTransform: "uppercase" }}>HEADZ UP</span>
                    </div>

                    <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
                      <p key={`name-${active.id}`} className="ps-name" style={{ ...D, fontSize: 22, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.04em", color: "white", lineHeight: 1, textShadow: "0 2px 20px rgba(0,0,0,0.9)" }}>
                        {active.name}
                      </p>
                      {active.bio && (
                        <p style={{ ...M, fontSize: 9, color: "rgba(255,255,255,0.45)", marginTop: 4, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", textShadow: "0 1px 8px rgba(0,0,0,1)" }}>
                          {active.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: "16px 16px 18px", background: "#080808", borderTop: `1px solid rgba(245,158,11,0.12)` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ ...M, fontSize: 7, color: "rgba(245,158,11,0.4)", letterSpacing: "0.5em", textTransform: "uppercase" }}>SKILL RATINGS</span>
                      <div style={{ display: "flex", gap: 3 }}>
                        {[...Array(5)].map((_, i) => (
                          <div key={i} style={{ width: 4, height: 4, background: A, opacity: 0.6 + (i * 0.08), clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)" }} />
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                      {STATS.map((s, si) => {
                        const colors = [
                          { bar: "#f59e0b", glow: "rgba(245,158,11,0.6)", val: "#f59e0b" },
                          { bar: "#fbbf24", glow: "rgba(251,191,36,0.6)", val: "#fbbf24" },
                          { bar: "#ef4444", glow: "rgba(239,68,68,0.6)", val: "#f87171" },
                          { bar: "#f59e0b", glow: "rgba(245,158,11,0.6)", val: "#f59e0b" },
                          { bar: "#22c55e", glow: "rgba(34,197,94,0.6)", val: "#4ade80" },
                        ];
                        const col = colors[si] || colors[0];
                        return (
                          <div key={s.k}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                              <span style={{ ...M, fontSize: 7, color: "#3f3f46", letterSpacing: "0.25em", textTransform: "uppercase" }}>{s.k}</span>
                              <span style={{ ...M, fontSize: 9, color: col.val, fontWeight: 700 }}>{s.v}</span>
                            </div>
                            <div style={{ height: 3, background: "rgba(255,255,255,0.04)", position: "relative", overflow: "hidden", clipPath: "polygon(0 0,100% 0,100% 100%,0 100%)" }}>
                              <div className="ps-bar" key={`sb-${active.id}-${s.k}`} style={{ position: "absolute", inset: "0 auto 0 0", background: `linear-gradient(to right,${col.bar},${col.val})`, boxShadow: `0 0 8px ${col.glow}`, "--w": `${s.v}%`, width: `${s.v}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 2 }}>{[...Array(5)].map((_, i) => <span key={i} style={{ color: A, fontSize: 10 }}>★</span>)}</div>
                      <span style={{ ...M, fontSize: 9, color: "#52525b" }}>5.0 · Hattiesburg</span>
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 3, height: 14, background: A }} />
                      <span style={{ ...M, fontSize: 7, color: `${A}66`, letterSpacing: "0.5em", textTransform: "uppercase" }}>PROFILE_DATA</span>
                    </div>
                    {[["SHOP", "HEADZ UP"], ["CITY", "Hattiesburg, MS"], ["STYLE", "Precision Cuts"], ["RATING", "★★★★★"], ["STATUS", "● ONLINE"]].map(([l, v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, marginBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ ...M, fontSize: 7, color: "#52525b", letterSpacing: "0.25em", textTransform: "uppercase" }}>{l}</span>
                        <span style={{ ...M, fontSize: 10, color: v.startsWith("●") ? "#4ade80" : v.startsWith("★") ? A : "#a1a1aa" }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 3, height: 14, background: R }} />
                      <span style={{ ...M, fontSize: 7, color: `${R}88`, letterSpacing: "0.5em", textTransform: "uppercase" }}>SPECIALTIES</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {["Fades", "Lineups", "Beards", "Kids", "Locs", "Designs"].map(tag => (
                        <span key={tag} style={{ ...M, fontSize: 8, color: A, padding: "3px 10px", background: `${A}10`, border: `1px solid ${A}25`, clipPath: "polygon(0 0,calc(100% - 4px) 0,100% 4px,100% 100%,4px 100%,0 calc(100% - 4px))" }}>{tag}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: "12px 14px", background: "rgba(245,158,11,0.05)", border: `1px solid ${A}20`, clipPath: "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))" }}>
                    <p style={{ ...M, fontSize: 9, color: `${A}88`, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 4 }}>DEPOSIT</p>
                    <p style={{ ...D, fontSize: 20, color: A, fontWeight: 900 }}>$10 <span style={{ ...M, fontSize: 9, color: "#52525b" }}>to secure your spot</span></p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
                    {!locked ? (
                      <>
                        <button onClick={lock} style={{ width: "100%", padding: "16px 20px", background: A, color: "black", ...D, fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", border: "none", cursor: "pointer", clipPath: "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))", transition: "background 0.2s" }}>
                          BOOK {active.name.split(" ")[0].toUpperCase()} →
                        </button>
                        <a href="/book" onClick={book} style={{ width: "100%", padding: "13px 20px", background: "transparent", color: "#52525b", ...D, fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", border: `1px solid rgba(255,255,255,0.08)`, cursor: "pointer", textDecoration: "none", display: "block", textAlign: "center", transition: "all 0.2s" }}>
                          VIEW ALL BARBERS
                        </a>
                      </>
                    ) : (
                      <>
                        <button onClick={lock} style={{ width: "100%", padding: "16px 20px", background: "#22c55e", color: "black", ...D, fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", border: "none", cursor: "pointer", clipPath: "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))" }}>
                          ✓ LOCKED IN — BOOK NOW
                        </button>
                        <button onClick={() => setLocked(false)} style={{ width: "100%", padding: "13px 20px", background: "transparent", color: "#52525b", border: `1px solid rgba(255,255,255,0.08)`, cursor: "pointer", ...D, fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", transition: "all 0.2s" }}>
                          ← CHANGE BARBER
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GALLERY CAROUSEL
═══════════════════════════════════════════════════════════════════════════ */
const GALLERY = [
  { url:"/pictures/IMG_20260331_115011 (2).jpg", label:"Precision Fade",  sub:"Signature cut" },
  { url:"/pictures/IMG_20260331_115011 (3).jpg", label:"Clean Lineup",    sub:"Sharp edges"   },
  { url:"/pictures/IMG_20260331_115011 (4).jpg", label:"Beard Trim",      sub:"Sculpted look" },
  { url:"/pictures/IMG_20260331_115011 (5).jpg", label:"Kids Cutz",       sub:"Ages 1–12"     },
  { url:"/pictures/IMG_20260331_115011 (6).jpg", label:"Full Experience",  sub:"Cut & shave"   },
  { url:"/pictures/IMG_20260331_115011 (7).jpg", label:"The Chair",       sub:"Your throne"   },
];

function GalleryCarousel({ isMobile }) {
  const [angle,setAngle]     = useState(0);
  const [active,setActive]   = useState(0);
  const [spin,setSpin]       = useState(true);
  const [drag,setDrag]       = useState(false);
  const [sx,setSx]           = useState(0);
  const rafRef = useRef(null);
  const angRef = useRef(0);
  const N=GALLERY.length; const STEP=360/N;
  const RAD=isMobile?155:275; const W=isMobile?158:232; const H=isMobile?198:295;

  useEffect(()=>{
    if(!spin)return;
    const t=()=>{angRef.current=(angRef.current+0.3)%360;setAngle(angRef.current);let i=Math.round(((360-angRef.current)%360)/STEP)%N;if(i<0)i+=N;setActive(i);rafRef.current=requestAnimationFrame(t);};
    rafRef.current=requestAnimationFrame(t);
    return()=>cancelAnimationFrame(rafRef.current);
  },[spin]);

  const ds=(e)=>{setSpin(false);cancelAnimationFrame(rafRef.current);setDrag(true);setSx(e.touches?e.touches[0].clientX:e.clientX);};
  const dm=(e)=>{if(!drag)return;const x=e.touches?e.touches[0].clientX:e.clientX;angRef.current=(angRef.current+(x-sx)*0.5)%360;setAngle(angRef.current);let i=Math.round(((360-angRef.current)%360)/STEP)%N;if(i<0)i+=N;setActive(i);setSx(x);};
  const de=()=>{setDrag(false);setTimeout(()=>setSpin(true),700);};
  const go=(i)=>{setSpin(false);cancelAnimationFrame(rafRef.current);angRef.current=((360-i*STEP)%360);setAngle(angRef.current);setActive(i);setTimeout(()=>setSpin(true),1400);};

  return (
    <section style={{ padding:isMobile?"44px 0 52px":"80px 0 92px", overflow:"hidden", background:"#000", borderTop:`1px solid ${A}22`, borderBottom:`1px solid ${A}22`, position:"relative" }}>
      <style>{`@keyframes gc-p{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0)}50%{box-shadow:0 0 50px rgba(245,158,11,0.4)}} .gc-a{animation:gc-p 2.5s ease-in-out infinite;}`}</style>
      <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:600,height:500,background:"radial-gradient(ellipse,rgba(245,158,11,0.06) 0%,transparent 60%)",pointerEvents:"none" }}/>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:isMobile?28:44, padding:"0 clamp(20px,5vw,44px)" }}>
        <div style={{ background:R, padding:"5px 14px 5px 10px", clipPath:"polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)", marginRight:0 }}>
          <span style={{ ...D, fontSize:8, fontWeight:900, color:"white", letterSpacing:"0.4em", textTransform:"uppercase" }}>THE</span>
        </div>
        <div style={{ background:A, padding:"5px 16px 5px 12px", clipPath:"polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)" }}>
          <span style={{ ...D, fontSize:8, fontWeight:900, color:"black", letterSpacing:"0.4em", textTransform:"uppercase" }}>WORK</span>
        </div>
        <div style={{ flex:1, height:2, background:`linear-gradient(to right,${A}55,transparent)`, marginLeft:12 }}/>
      </div>

      {/* Carousel */}
      <div style={{ position:"relative",height:isMobile?262:392,perspective:isMobile?600:920,perspectiveOrigin:"50% 50%",cursor:drag?"grabbing":"grab",userSelect:"none",WebkitUserSelect:"none",touchAction:"none" }}
        onMouseDown={ds} onMouseMove={dm} onMouseUp={de} onMouseLeave={de}
        onTouchStart={ds} onTouchMove={dm} onTouchEnd={de}>
        <div style={{ position:"absolute",top:"50%",left:"50%",transformStyle:"preserve-3d",transform:`translate(-50%,-50%) rotateY(${angle}deg)` }}>
          {GALLERY.map((g,i)=>{
            const front=i===active;
            return (
              <div key={i} className={front?"gc-a":""} onClick={()=>go(i)}
                style={{ position:"absolute",width:W,height:H,left:-W/2,top:-H/2,transform:`rotateY(${i*STEP}deg) translateZ(${RAD}px)`,overflow:"hidden",cursor:"pointer",backfaceVisibility:"hidden",border:front?`2px solid ${A}`:`1px solid rgba(255,255,255,0.06)`,clipPath:front?"polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,14px 100%,0 calc(100% - 14px))":"none" }}>
                <img src={g.url} alt={g.label} style={{ width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top",filter:front?"none":"brightness(0.22) saturate(0.3)",transition:"filter 0.45s",pointerEvents:"none" }} loading="lazy"/>
                {front && <>
                  <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.97),rgba(0,0,0,0.55) 55%,transparent)" }}/>
                  <div style={{ position:"absolute",bottom:0,left:0,right:0,padding:isMobile?"10px 12px 14px":"14px 16px 18px" }}>
                    <p style={{ ...D,fontSize:isMobile?9:10,fontWeight:900,textTransform:"uppercase",color:"white",marginBottom:3 }}>{g.label}</p>
                    <p style={{ ...M,fontSize:9,color:A,letterSpacing:"0.22em" }}>{g.sub}</p>
                  </div>
                  {/* P5 corner brackets */}
                  {[{t:5,l:5,bt:"2px",bl:"2px"},{t:5,r:5,bt:"2px",br:"2px"},{b:5,l:5,bb:"2px",bl:"2px"},{b:5,r:5,bb:"2px",br:"2px"}].map((c,j)=>(
                    <div key={j} style={{ position:"absolute",width:10,height:10,top:c.t,bottom:c.b,left:c.l,right:c.r,borderTop:c.bt&&`${c.bt} solid ${A}cc`,borderBottom:c.bb&&`${c.bb} solid ${A}cc`,borderLeft:c.bl&&`${c.bl} solid ${A}cc`,borderRight:c.br&&`${c.br} solid ${A}cc` }}/>
                  ))}
                  {/* Red slash on front card */}
                  <div style={{ position:"absolute",top:0,bottom:0,right:"25%",width:2,background:`linear-gradient(to bottom,transparent,${R}44,transparent)`,transform:"skewX(6deg)",pointerEvents:"none" }}/>
                </>}
              </div>
            );
          })}
        </div>
        <div style={{ position:"absolute",bottom:6,left:"14%",right:"14%",height:1,background:`linear-gradient(to right,transparent,${A}33,transparent)` }}/>
      </div>

      {/* Dots */}
      <div style={{ display:"flex",justifyContent:"center",gap:8,marginTop:isMobile?16:22 }}>
        {GALLERY.map((_,i)=>(
          <button key={i} onClick={()=>go(i)} style={{ width:i===active?22:6,height:4,background:i===active?A:"rgba(255,255,255,0.12)",border:"none",cursor:"pointer",padding:0,transition:"all 0.3s",minHeight:"auto",minWidth:"auto",clipPath:i===active?"polygon(0 0,calc(100% - 3px) 0,100% 3px,100% 100%,3px 100%,0 calc(100% - 3px))":"none" }}/>
        ))}
      </div>
      <p style={{ ...M,fontSize:9,color:"#a1a1aa",textAlign:"center",letterSpacing:"0.4em",textTransform:"uppercase",marginTop:14 }}>✦ DRAG TO SPIN ✦</p>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATIC DATA
═══════════════════════════════════════════════════════════════════════════ */
const SERVICES = [
  {name:"Haircut & Shave",      price:35,dur:"30 min",pop:true},
  {name:"Haircut",              price:30,dur:"30 min",pop:false},
  {name:"Senior Cut and Shave", price:30,dur:"30 min",pop:false},
  {name:"Kids Cutz (1–12)",     price:25,dur:"30 min",pop:false},
  {name:"Line and Shave",       price:25,dur:"30 min",pop:false},
  {name:"Senior Cut",           price:25,dur:"30 min",pop:false},
  {name:"Beard Trim",           price:20,dur:"15 min",pop:false},
  {name:"Line",                 price:20,dur:"15 min",pop:false},
  {name:"Shave",                price:20,dur:"30 min",pop:false},
  {name:"Kids Line",            price:15,dur:"30 min",pop:false},
  {name:"Senior Line",          price:15,dur:"30 min",pop:false},
];
const REVIEWS = [
  {q:"This man is an amazing barber with great energy and a great personality. Most importantly the cuts are fire!! Go book with him.",name:"Ronnie E.",city:"Hattiesburg"},
  {q:"Best fade in Hattiesburg, hands down. I drive 40 minutes just to sit in that chair. Worth every mile.",name:"Marcus T.",city:"Laurel"},
  {q:"Came in first time, walked out looking like a new man. The lineup was immaculate. Already booked my next one.",name:"DeShawn K.",city:"Hattiesburg"},
  {q:"My son has been going here since he was 3. Fantastic with kids and the cut is always perfect.",name:"Tanya W.",city:"Hattiesburg"},
];
const TICKER = ["Precision Fades","Clean Lineups","Kids Cutz","Beard Trims","Senior Cuts","Book Online 24/7","Hattiesburg MS","HEADZ UP"];

/* ═══════════════════════════════════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const router = useRouter();
  const { isMobile } = useBreakpoint();
  const [ready,      setReady]      = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [isStaff,    setIsStaff]    = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady,  setAuthReady]  = useState(false);
  const [barbers,    setBarbers]    = useState([]);
  const [revIdx,     setRevIdx]     = useState(0);
  const [scrollY,    setScrollY]    = useState(0);
  const [revealed,   setRevealed]   = useState({});
  const [hovSvc,     setHovSvc]     = useState(null);
  const [heroIn,     setHeroIn]     = useState(false);
  const [time,       setTime]       = useState("");

  useEffect(()=>{const t=()=>setTime(new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true}));t();const id=setInterval(t,1000);return()=>clearInterval(id);},[]);
  const checkAuth=useCallback(()=>{const tok=localStorage.getItem("access");if(!tok){setIsLoggedIn(false);setIsStaff(false);setAuthReady(true);return;}try{const p=JSON.parse(atob(tok.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));if(p.exp&&p.exp*1000<Date.now()){const ref=localStorage.getItem("refresh");if(!ref){localStorage.removeItem("access");setIsLoggedIn(false);setIsStaff(false);setAuthReady(true);return;}fetch(`${process.env.NEXT_PUBLIC_API_URL||"http://127.0.0.1:8000"}/api/token/refresh/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refresh:ref})}).then(r=>r.ok?r.json():null).then(d=>{if(d?.access){localStorage.setItem("access",d.access);if(d.refresh)localStorage.setItem("refresh",d.refresh);const np=JSON.parse(atob(d.access.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));setIsLoggedIn(true);setIsStaff(!!np.is_staff);}else{localStorage.removeItem("access");localStorage.removeItem("refresh");setIsLoggedIn(false);setIsStaff(false);}}).catch(()=>{setIsLoggedIn(false);setIsStaff(false);}).finally(()=>setAuthReady(true));return;}setIsLoggedIn(true);setIsStaff(!!p.is_staff);}catch{setIsLoggedIn(false);setIsStaff(false);}setAuthReady(true);},[]);
  useEffect(()=>{checkAuth();window.addEventListener("focus",checkAuth);return()=>window.removeEventListener("focus",checkAuth);},[checkAuth]);
  useEffect(()=>{fetch(`${process.env.NEXT_PUBLIC_API_URL||"http://127.0.0.1:8000"}/api/barbers/`,{headers:localStorage.getItem("access")?{Authorization:`Bearer ${localStorage.getItem("access")}`}:{},signal:AbortSignal.timeout?.(10000)}).then(r=>r.json()).then(d=>setBarbers(Array.isArray(d)?d:d.results||[])).catch(()=>{});},[]);
  useEffect(()=>{const fn=()=>setScrollY(window.scrollY);window.addEventListener("scroll",fn,{passive:true});return()=>window.removeEventListener("scroll",fn);},[]);
  useEffect(()=>{if(!ready)return;const io=new IntersectionObserver(e=>{e.forEach(x=>{if(x.isIntersecting)setRevealed(p=>({...p,[x.target.dataset.id]:true}));});},{threshold:0.1});document.querySelectorAll("[data-id]").forEach(el=>io.observe(el));return()=>io.disconnect();},[ready]);
  useEffect(()=>{const t=setInterval(()=>setRevIdx(i=>(i+1)%REVIEWS.length),6500);return()=>clearInterval(t);},[]);
  useEffect(()=>{if(ready)setTimeout(()=>setHeroIn(true),80);},[ready]);

  const Rv=(id)=>!!revealed[id];
  const book=(e)=>{e.preventDefault();router.push(localStorage.getItem("access")?"/book":"/login");};

  return (
    <>
      {!ready && <LoadingScreen onComplete={()=>setReady(true)}/>}

      <style jsx global>{`
        @keyframes glow-green{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)}50%{box-shadow:0 0 0 9px rgba(34,197,94,0)}}
        @keyframes scandown{from{top:-1px}to{top:101%}}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes menuSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
        .ticker-w{animation:ticker 34s linear infinite;display:flex;width:max-content;}
        .ticker-w:hover{animation-play-state:paused;}
        .srow{cursor:pointer;transition:padding-left 0.2s,border-color 0.18s,background 0.18s;}
        .srow:hover{padding-left:18px!important;border-color:rgba(245,158,11,0.3)!important;background:rgba(245,158,11,0.02)!important;}
        .rv{opacity:0;transform:translateY(24px);transition:opacity 0.9s cubic-bezier(0.16,1,0.3,1),transform 0.9s cubic-bezier(0.16,1,0.3,1);}
        .rv.on{opacity:1;transform:none;}
        .rv.d1{transition-delay:0.08s;}.rv.d2{transition-delay:0.16s;}.rv.d3{transition-delay:0.24s;}
        .donly{display:flex!important;}
        .monly{display:none!important;}
        @media(max-width:768px){
          .donly{display:none!important;}
          .monly{display:flex!important;}
        }
      `}</style>

      {/* BG */}
      <div style={{ position:"fixed",inset:0,zIndex:0,pointerEvents:"none",backgroundImage:`linear-gradient(rgba(255,255,255,0.013) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.013) 1px,transparent 1px)`,backgroundSize:"66px 66px" }}/>
      <div style={{ position:"fixed",top:"-10%",right:"-6%",width:700,height:700,background:`radial-gradient(circle,rgba(245,158,11,0.045) 0%,transparent 62%)`,pointerEvents:"none",zIndex:0 }}/>
      <div style={{ position:"fixed",bottom:"16%",left:"-9%",width:540,height:540,background:`radial-gradient(circle,rgba(245,158,11,0.025) 0%,transparent 58%)`,pointerEvents:"none",zIndex:0 }}/>
      <div style={{ position:"fixed",inset:0,zIndex:1,pointerEvents:"none",overflow:"hidden" }}>
        <div style={{ position:"absolute",left:0,right:0,height:1,background:`linear-gradient(to right,transparent,rgba(245,158,11,0.2),transparent)`,animation:"scandown 9s linear infinite" }}/>
      </div>

      <div style={{ position:"relative",zIndex:10 }}>

        {/* ══════════════════════ NAV ══════════════════════ */}
        <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:200,height:56,background:scrollY>50?"rgba(3,3,3,0.97)":"transparent",backdropFilter:scrollY>50?"blur(20px)":"none",borderBottom:scrollY>50?`1px solid rgba(255,255,255,0.06)`:"none",transition:"all 0.4s",display:"flex",alignItems:"center" }}>
          <div style={{ width:"100%",maxWidth:1320,margin:"0 auto",padding:"0 clamp(18px,5vw,44px)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <a href="/" style={{ ...D,fontWeight:700,fontSize:16,letterSpacing:"-0.06em",color:"white",textDecoration:"none" }}>
              HEADZ<span style={{ color:A,fontStyle:"italic" }}>UP</span>
            </a>
            <div className="donly" style={{ display:"flex",gap:32,alignItems:"center" }}>
              {[["#services","Services"],["#barber","Barbers"],["#reviews","Reviews"],["#location","Visit"],["/newsletter","News"]].map(([h,l])=>(
                <a key={l} href={h} style={{ ...M,fontSize:11,color:"#d4d4d4",letterSpacing:"0.28em",textTransform:"uppercase",textDecoration:"none",transition:"color 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.color=A}
                  onMouseLeave={e=>e.currentTarget.style.color="#a1a1aa"}>{l}</a>
              ))}
            </div>
            <div style={{ display:"flex",gap:10,alignItems:"center" }}>
              {authReady && <>
                {isLoggedIn&&isStaff  && <a href="/barber-dashboard" className="donly" style={{ ...D,fontSize:7.5,color:A,border:`1px solid ${A}44`,padding:"9px 16px",letterSpacing:"0.2em",textTransform:"uppercase",textDecoration:"none",clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",transition:"all 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background=`${A}11`} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Dashboard</a>}
                {isLoggedIn&&!isStaff && <a href="/dashboard"        className="donly" style={{ ...D,fontSize:7.5,color:A,border:`1px solid ${A}44`,padding:"9px 16px",letterSpacing:"0.2em",textTransform:"uppercase",textDecoration:"none",clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",transition:"all 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background=`${A}11`} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>My Account</a>}
                {!isLoggedIn          && <a href="/barber-login"     className="donly" style={{ ...D,fontSize:7.5,color:"#a1a1aa",border:"1px solid rgba(255,255,255,0.1)",padding:"9px 16px",letterSpacing:"0.2em",textTransform:"uppercase",textDecoration:"none",transition:"all 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.color=A;e.currentTarget.style.borderColor=`${A}44`;}} onMouseLeave={e=>{e.currentTarget.style.color="#a1a1aa";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}>Barbers</a>}
              </>}
              <a href="/book" onClick={book} className="donly" style={{ ...D,fontSize:7.5,fontWeight:700,color:"black",background:A,padding:"10px 22px",letterSpacing:"0.22em",textTransform:"uppercase",textDecoration:"none",display:"inline-flex",alignItems:"center",clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",transition:"background 0.22s" }} onMouseEnter={e=>e.currentTarget.style.background="white"} onMouseLeave={e=>e.currentTarget.style.background=A}>Book Now</a>
              <button onClick={()=>setMenuOpen(o=>!o)} className="monly" style={{ display:"flex",flexDirection:"column",gap:5,width:44,height:44,alignItems:"center",justifyContent:"center",background:"none",border:"none",padding:8 }}>
                {[{r:menuOpen?"rotate(45deg) translate(4.5px,4.5px)":"none"},{op:menuOpen?0:1},{r:menuOpen?"rotate(-45deg) translate(4.5px,-4.5px)":"none"}].map((s,i)=>(
                  <span key={i} style={{ display:"block",width:20,height:1.5,background:menuOpen?A:"white",transition:"all 0.28s",transform:s.r||"none",opacity:s.op??1 }}/>
                ))}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ position:"fixed",top:56,left:0,right:0,zIndex:199,background:"rgba(3,3,3,0.98)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"8px 0 20px",animation:"menuSlide 0.22s ease" }}>
            {[["#services","Services"],["#barber","Barbers"],["#reviews","Reviews"],["#location","Visit"],["/newsletter","News"]].map(([h,l])=>(
              <a key={l} href={h} onClick={()=>setMenuOpen(false)} style={{ display:"block",padding:"15px clamp(18px,5vw,44px)",...M,fontSize:10,letterSpacing:"0.3em",textTransform:"uppercase",color:"#a1a1aa",textDecoration:"none",borderBottom:"1px solid rgba(255,255,255,0.04)",transition:"color 0.2s" }}
                onMouseEnter={e=>e.currentTarget.style.color=A}
                onMouseLeave={e=>e.currentTarget.style.color="#a1a1aa"}>{l}</a>
            ))}
            <div style={{ padding:"18px clamp(18px,5vw,44px) 4px",display:"flex",flexDirection:"column",gap:8 }}>
              <a href="/book" onClick={e=>{book(e);setMenuOpen(false);}} style={{ ...D,fontSize:8,fontWeight:700,color:"black",background:A,padding:"15px",textAlign:"center",letterSpacing:"0.22em",textTransform:"uppercase",textDecoration:"none",display:"block",clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))" }}>Book Appointment →</a>
              {authReady&&isLoggedIn&&isStaff  && <a href="/barber-dashboard" style={{ ...D,fontSize:7,letterSpacing:"0.2em",textTransform:"uppercase",color:A,border:`1px solid ${A}44`,padding:"13px",textAlign:"center",textDecoration:"none" }}>Barber Dashboard</a>}
              {authReady&&isLoggedIn&&!isStaff && <a href="/dashboard"        style={{ ...D,fontSize:7,letterSpacing:"0.2em",textTransform:"uppercase",color:A,border:`1px solid ${A}44`,padding:"13px",textAlign:"center",textDecoration:"none" }}>My Account</a>}
              {authReady&&!isLoggedIn          && <a href="/barber-login"     style={{ ...D,fontSize:7,letterSpacing:"0.2em",textTransform:"uppercase",color:"#a1a1aa",border:"1px solid rgba(255,255,255,0.1)",padding:"13px",textAlign:"center",textDecoration:"none" }}>Barber Login</a>}
            </div>
          </div>
        )}

        {/* ══════════════════════ HERO — P5/DMC STYLE ══════════════════════ */}
        <section style={{ minHeight:"100dvh",position:"relative",overflow:"hidden",display:"flex",alignItems:"flex-end" }}>
          <div style={{ position:"absolute",inset:0,background:"#030303" }}/>

          {/* DMC-style diagonal red panel — far right */}
          {!isMobile && (
            <div style={{ position:"absolute",top:0,bottom:0,right:0,width:"38%",background:`linear-gradient(135deg,transparent 0%,rgba(239,68,68,0.03) 100%)`,borderLeft:`1px solid ${R}18`,clipPath:"polygon(15% 0,100% 0,100% 100%,0 100%)",pointerEvents:"none" }}/>
          )}

          {/* Diagonal slash accent */}
          <div style={{ position:"absolute",top:0,bottom:0,left:"62%",width:3,background:`linear-gradient(to bottom,transparent,${R}33,${A}22,transparent)`,transform:"skewX(8deg)",pointerEvents:"none" }}/>

          {/* Big editorial number */}
          <div style={{ position:"absolute",right:"-2%",top:"4%",...D,fontSize:"clamp(16rem,34vw,32rem)",fontWeight:900,lineHeight:1,color:"transparent",WebkitTextStroke:"1px rgba(255,255,255,0.025)",userSelect:"none",pointerEvents:"none",letterSpacing:"-0.06em" }}>01</div>

          {/* Vertical label */}
          {!isMobile && <div style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%) rotate(-90deg)",transformOrigin:"center",...M,fontSize:8,letterSpacing:"0.6em",color:"#52525b",textTransform:"uppercase",whiteSpace:"nowrap" }}>Hattiesburg, Mississippi — Est. 2020</div>}

          {/* Clock */}
          <div style={{ position:"absolute",top:68,right:"clamp(18px,5vw,44px)",...M,fontSize:12,color:"#a1a1aa",letterSpacing:"0.28em" }}>{time}</div>

          {/* Top accent line */}
          <div style={{ position:"absolute",top:94,left:0,right:0,height:1,background:`linear-gradient(to right,transparent,${A}14 30%,${A}14 70%,transparent)` }}/>

          {/* Hero content */}
          <div style={{ position:"relative",zIndex:1,maxWidth:1320,margin:"0 auto",width:"100%",padding:isMobile?"0 20px 56px":"0 clamp(18px,5vw,44px) 80px",paddingTop:isMobile?78:118 }}>

            {/* P5 status stamp */}
            <div style={{ display:"flex",alignItems:"center",gap:0,marginBottom:isMobile?22:28,opacity:heroIn?1:0,transform:heroIn?"none":"translateY(16px)",transition:"all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s" }}>
              <div style={{ width:7,height:7,background:"#22c55e",borderRadius:"50%",animation:"glow-green 2.5s infinite",flexShrink:0,marginRight:8 }}/>
              <div style={{ background:"#22c55e", padding:"4px 14px 4px 10px", clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))", marginRight:8 }}>
                <span style={{ ...M,fontSize:7,color:"black",letterSpacing:"0.4em",textTransform:"uppercase",fontWeight:500 }}>OPEN</span>
              </div>
              <span style={{ ...M,fontSize:10,color:"#4ade80",letterSpacing:isMobile?"0.14em":"0.36em",textTransform:"uppercase" }}>Accepting Clients Now</span>
              {!isMobile && <><div style={{ flex:1,height:1,background:`linear-gradient(to right,rgba(34,197,94,0.3),transparent)`,maxWidth:180,marginLeft:16 }}/><span style={{ ...M,fontSize:9,color:"#a1a1aa",letterSpacing:"0.2em" }}>2509 W 4th St · Hattiesburg MS</span></>}
            </div>

            {/* Headline — Persona 5 style stagger */}
            <div style={{ marginBottom:isMobile?22:30 }}>
              {[{t:"Where",d:"0.16s",am:false},{t:"Every",d:"0.24s",am:false},{t:"Cut",d:"0.32s",am:false},{t:"Tells",d:"0.40s",am:false},{t:"A Story.",d:"0.50s",am:true,it:true}].map(({t,d,am,it})=>(
                <h1 key={t} style={{ ...D,fontSize:"clamp(2.5rem,7.5vw,7rem)",fontWeight:900,textTransform:"uppercase",lineHeight:isMobile?1.08:0.9,letterSpacing:"-0.04em",color:am?A:"white",fontStyle:it?"italic":"normal",opacity:heroIn?1:0,transform:heroIn?"none":"translateY(30px)",transition:`opacity 1s cubic-bezier(0.16,1,0.3,1) ${d},transform 1s cubic-bezier(0.16,1,0.3,1) ${d}`,margin:0 }}>{t}</h1>
              ))}
            </div>

            {/* Sub + CTA */}
            <div style={{ display:"flex",gap:isMobile?20:32,alignItems:"flex-end",flexWrap:"wrap",opacity:heroIn?1:0,transform:heroIn?"none":"translateY(16px)",transition:"all 0.9s cubic-bezier(0.16,1,0.3,1) 0.64s" }}>
              <p style={{ ...M,fontSize:"clamp(12px,1.3vw,14px)",color:"#a1a1aa",lineHeight:1.85,maxWidth:400,flex:1,minWidth:isMobile?"100%":"240px" }}>
                Hattiesburg's premier barbershop. We don't just cut hair — we craft confidence. Every client, every time.
              </p>
              <a href="/book" onClick={book} style={{ ...D,fontSize:8.5,fontWeight:700,color:"black",background:A,padding:"17px 34px",letterSpacing:"0.22em",textTransform:"uppercase",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:10,flexShrink:0,clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",transition:"background 0.22s" }}
                onMouseEnter={e=>e.currentTarget.style.background="white"}
                onMouseLeave={e=>e.currentTarget.style.background=A}>
                <span>Book Your Cut →</span>
              </a>
            </div>

            {/* Stats — P5 data panels */}
            <div style={{ display:"flex",marginTop:isMobile?28:60,paddingTop:isMobile?16:24,borderTop:"1px solid rgba(255,255,255,0.06)",flexWrap:"wrap",opacity:heroIn?1:0,transition:"all 1s cubic-bezier(0.16,1,0.3,1) 0.82s" }}>
              {[{n:"5.0",l:"Star Rating",s:"Google"},{n:"11",l:"Services",s:"Every style"},{n:"100+",l:"Clients",s:"& Counting"},{n:"24/7",l:"Book Online",s:"Anytime"}].map(({n,l,s},i)=>(
                <div key={l} style={{ flex:1,minWidth:isMobile?98:118,padding:`0 ${i>0?12:0}px`,borderLeft:i>0?"1px solid rgba(255,255,255,0.06)":"none",marginBottom:10 }}>
                  <p style={{ ...D,fontSize:"clamp(1.4rem,2.8vw,2.2rem)",fontWeight:900,color:A,lineHeight:1,marginBottom:4 }}>{n}</p>
                  <p style={{ ...M,fontSize:10,color:"#d4d4d4",letterSpacing:"0.1em",marginBottom:2 }}>{l}</p>
                  <p style={{ ...M,fontSize:9,color:"#d4d4d4",letterSpacing:"0.2em" }}>{s}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll cue */}
          <div style={{ position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:8,paddingBottom:18,opacity:heroIn?1:0,transition:"opacity 1s ease 1.4s" }}>
            <span style={{ ...M,fontSize:9,color:"#a1a1aa",letterSpacing:"0.5em",textTransform:"uppercase" }}>Scroll</span>
            <div style={{ width:1,height:40,background:`linear-gradient(to bottom,rgba(245,158,11,0.5),transparent)` }}/>
          </div>
        </section>

        {/* ══ TICKER ══ */}
        <div style={{ borderTop:`1px solid ${R}22`,borderBottom:`1px solid ${R}22`,background:`${R}06`,overflow:"hidden",padding:"10px 0",position:"relative" }}>
          <div className="ticker-w">
            {[...TICKER,...TICKER].map((t,i)=>(
              <span key={i} style={{ ...M,fontSize:9,color:`${R}77`,letterSpacing:"0.5em",textTransform:"uppercase",padding:"0 28px",flexShrink:0 }}>✦ {t}</span>
            ))}
          </div>
        </div>

        {/* ══ GALLERY ══ */}
        <GalleryCarousel isMobile={isMobile}/>

        {/* ══ SERVICES — P5 PANEL STYLE ══ */}
        <section id="services" style={{ padding:isMobile?"56px 20px":"clamp(56px,9vw,112px) clamp(18px,5vw,44px)" }}>
          <div style={{ maxWidth:1320,margin:"0 auto" }}>

            {/* P5 header */}
            <div data-id="s1" className={`rv${Rv("s1")?" on":""}`} style={{ display:"flex",alignItems:"center",gap:0,marginBottom:isMobile?28:52 }}>
              <div style={{ background:R,padding:"5px 14px 5px 10px",clipPath:"polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)",marginRight:0 }}>
                <span style={{ ...D,fontSize:8,fontWeight:900,color:"white",letterSpacing:"0.4em",textTransform:"uppercase" }}>THE</span>
              </div>
              <div style={{ background:A,padding:"5px 14px 5px 12px",clipPath:"polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)",marginRight:8 }}>
                <span style={{ ...D,fontSize:8,fontWeight:900,color:"black",letterSpacing:"0.4em",textTransform:"uppercase" }}>MENU</span>
              </div>
              <span style={{ ...M,fontSize:8,color:"rgba(255,255,255,0.2)",letterSpacing:"0.4em",marginRight:12 }}>·</span>
              <span style={{ ...M,fontSize:8,color:`${A}66`,letterSpacing:"0.4em",textTransform:"uppercase" }}>{SERVICES.length} Services</span>
              <div style={{ flex:1,height:2,background:`linear-gradient(to right,${A}44,transparent)`,marginLeft:16 }}/>
            </div>

            <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?24:80,alignItems:"start",marginBottom:36 }}>
              <div data-id="s2" className={`rv${Rv("s2")?" on":""}`}>
                <h2 style={{ ...D,fontSize:"clamp(2rem,5vw,4rem)",fontWeight:900,lineHeight:isMobile?1.08:0.9,letterSpacing:"-0.04em",textTransform:"uppercase" }}>
                  The<br/><span style={{ WebkitTextStroke:"1px rgba(255,255,255,0.14)",color:"transparent" }}>Full</span><br/><span style={{ color:A,fontStyle:"italic" }}>Menu_</span>
                </h2>
              </div>
              <div data-id="s3" className={`rv d1${Rv("s3")?" on":""}`} style={{ paddingTop:isMobile?0:8 }}>
                <p style={{ ...M,fontSize:14,color:"#d4d4d4",lineHeight:1.8,marginBottom:22 }}>From a quick lineup to the full cut and shave — every service with obsessive precision.</p>
                <a href="/book" onClick={book} style={{ ...D,fontSize:8,fontWeight:700,color:"black",background:A,padding:"13px 26px",letterSpacing:"0.2em",textTransform:"uppercase",textDecoration:"none",display:"inline-flex",alignItems:"center",clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",transition:"background 0.22s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="white"}
                  onMouseLeave={e=>e.currentTarget.style.background=A}>Book Any Service →</a>
              </div>
            </div>

            <div data-id="s4" className={`rv${Rv("s4")?" on":""}`} style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
              {SERVICES.map((svc,i)=>(
                <div key={svc.name} className="srow" onClick={book}
                  onMouseEnter={()=>setHovSvc(svc.name)} onMouseLeave={()=>setHovSvc(null)}
                  style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",gap:12 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:14,flex:1,minWidth:0 }}>
                    <span style={{ ...M,fontSize:9,color:hovSvc===svc.name?A:"#a1a1aa",minWidth:28,transition:"color 0.2s" }}>{String(i+1).padStart(2,"0")}</span>
                    <span style={{ ...D,fontSize:"clamp(8px,1.2vw,11px)",textTransform:"uppercase",fontWeight:700,color:hovSvc===svc.name?"white":"#a1a1aa",transition:"color 0.2s",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{svc.name}</span>
                    {svc.pop && <span style={{ ...M,fontSize:7,color:"black",background:A,padding:"2px 8px",flexShrink:0,letterSpacing:"0.2em",textTransform:"uppercase" }}>Popular</span>}
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:20,flexShrink:0 }}>
                    <span style={{ ...M,fontSize:10,color:"#d4d4d4" }}>{svc.dur}</span>
                    <span style={{ ...D,fontSize:"clamp(12px,1.9vw,20px)",fontWeight:900,color:hovSvc===svc.name?A:"white",transition:"color 0.2s",minWidth:40,textAlign:"right" }}>${svc.price}</span>
                    <span style={{ fontSize:12,opacity:hovSvc===svc.name?1:0,color:A,transform:hovSvc===svc.name?"translateX(0)":"translateX(-5px)",transition:"all 0.2s" }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ PERSONA SELECT ══ */}
        <PersonaSelect barbers={barbers} book={book} isMobile={isMobile}/>

        {/* ══ REVIEWS ══ */}
        <section id="reviews" style={{ padding:isMobile?"56px 20px":"clamp(56px,9vw,112px) clamp(18px,5vw,44px)" }}>
          <div style={{ maxWidth:1320,margin:"0 auto" }}>
            <div data-id="r1" className={`rv${Rv("r1")?" on":""}`} style={{ display:"flex",alignItems:"center",gap:0,marginBottom:isMobile?28:48 }}>
              <div style={{ background:R,padding:"5px 14px 5px 10px",clipPath:"polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)",marginRight:0 }}>
                <span style={{ ...D,fontSize:8,fontWeight:900,color:"white",letterSpacing:"0.4em",textTransform:"uppercase" }}>CLIENT</span>
              </div>
              <div style={{ background:A,padding:"5px 14px 5px 12px",clipPath:"polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)" }}>
                <span style={{ ...D,fontSize:8,fontWeight:900,color:"black",letterSpacing:"0.4em",textTransform:"uppercase" }}>REVIEWS</span>
              </div>
              <div style={{ flex:1,height:2,background:`linear-gradient(to right,${A}44,transparent)`,marginLeft:12 }}/>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?24:80,alignItems:isMobile?"start":"center" }}>
              <div data-id="r2" className={`rv${Rv("r2")?" on":""}`}>
                <h2 style={{ ...D,fontSize:"clamp(1.9rem,4.8vw,3.8rem)",fontWeight:900,lineHeight:isMobile?1.08:0.9,letterSpacing:"-0.04em",textTransform:"uppercase",marginBottom:18 }}>
                  Word<br/><span style={{ WebkitTextStroke:"1px rgba(255,255,255,0.14)",color:"transparent" }}>of</span><br/><span style={{ color:A,fontStyle:"italic" }}>Mouth_</span>
                </h2>
                <p style={{ ...M,fontSize:13,color:"#d4d4d4",lineHeight:1.8,marginBottom:28 }}>Real clients. Real results. No fluff.</p>
                <div style={{ display:"flex",gap:8 }}>
                  {REVIEWS.map((_,i)=>(
                    <button key={i} onClick={()=>setRevIdx(i)} style={{ width:i===revIdx?26:6,height:4,background:i===revIdx?A:"rgba(255,255,255,0.12)",border:"none",cursor:"pointer",transition:"all 0.32s",padding:0,minHeight:"auto",minWidth:"auto",clipPath:i===revIdx?"polygon(0 0,calc(100% - 3px) 0,100% 3px,100% 100%,3px 100%,0 calc(100% - 3px))":"none" }}/>
                  ))}
                </div>
              </div>
              <div data-id="r3" className={`rv d1${Rv("r3")?" on":""}`}>
                {REVIEWS.map((rv,i)=>(
                  <div key={i} style={{ display:i===revIdx?"block":"none",padding:isMobile?"22px 18px":"32px 28px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderLeft:`3px solid ${A}`,animation:i===revIdx?"fadeUp 0.45s ease both":"none" }}>
                    <div style={{ display:"flex",gap:2,marginBottom:14 }}>{[1,2,3,4,5].map(s=><span key={s} style={{ color:A,fontSize:11 }}>★</span>)}</div>
                    <p style={{ ...D,fontSize:"clamp(0.8rem,1.5vw,1rem)",fontWeight:700,textTransform:"uppercase",lineHeight:1.55,letterSpacing:"-0.02em",color:"white",marginBottom:18 }}>"{rv.q}"</p>
                    <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                      <div style={{ width:32,height:32,background:A,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,clipPath:"polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px))" }}>
                        <span style={{ ...D,fontSize:11,fontWeight:900,color:"black" }}>{rv.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p style={{ ...M,fontSize:10,color:"white",letterSpacing:"0.2em" }}>{rv.name}</p>
                        <p style={{ ...M,fontSize:10,color:"#d4d4d4",letterSpacing:"0.2em" }}>{rv.city}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══ LOCATION ══ */}
        <section id="location" style={{ borderTop:"1px solid rgba(255,255,255,0.06)",padding:isMobile?"56px 20px":"clamp(56px,9vw,112px) clamp(18px,5vw,44px)",background:"rgba(255,255,255,0.01)" }}>
          <div style={{ maxWidth:1320,margin:"0 auto" }}>
            <div data-id="l1" className={`rv${Rv("l1")?" on":""}`} style={{ display:"flex",alignItems:"center",gap:0,marginBottom:isMobile?28:48 }}>
              <div style={{ background:R,padding:"5px 14px 5px 10px",clipPath:"polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)",marginRight:0 }}>
                <span style={{ ...D,fontSize:8,fontWeight:900,color:"white",letterSpacing:"0.4em",textTransform:"uppercase" }}>FIND</span>
              </div>
              <div style={{ background:A,padding:"5px 14px 5px 12px",clipPath:"polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)" }}>
                <span style={{ ...D,fontSize:8,fontWeight:900,color:"black",letterSpacing:"0.4em",textTransform:"uppercase" }}>US</span>
              </div>
              <div style={{ flex:1,height:2,background:`linear-gradient(to right,${A}44,transparent)`,marginLeft:12 }}/>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?24:80,alignItems:isMobile?"start":"center" }}>
              <div data-id="l2" className={`rv${Rv("l2")?" on":""}`}>
                <h2 style={{ ...D,fontSize:"clamp(1.9rem,4.8vw,3.8rem)",fontWeight:900,lineHeight:isMobile?1.08:0.9,letterSpacing:"-0.04em",textTransform:"uppercase",marginBottom:32 }}>
                  Come<br/><span style={{ WebkitTextStroke:"1px rgba(255,255,255,0.14)",color:"transparent" }}>See</span><br/><span style={{ color:A,fontStyle:"italic" }}>Us_</span>
                </h2>
                <div style={{ display:"flex",flexDirection:"column",gap:18,marginBottom:32 }}>
                  {[["📍","Address","2509 W 4th St, Hattiesburg, MS 39401"],["🕐","Mon – Fri","9:00 AM – 6:00 PM"],["✂️","Saturday","9:00 AM – 4:00 PM"],["🚫","Sunday","Closed"]].map(([ic,l,v])=>(
                    <div key={l} style={{ display:"flex",gap:14,alignItems:"flex-start",paddingBottom:18,borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize:16,flexShrink:0,marginTop:2 }}>{ic}</span>
                      <div>
                        <p style={{ ...M,fontSize:9,color:"#d4d4d4",letterSpacing:"0.4em",textTransform:"uppercase",marginBottom:4 }}>{l}</p>
                        <p style={{ ...M,fontSize:14,color:"#d4d4d4",lineHeight:1.5 }}>{v}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <a href="/book" onClick={book} style={{ ...D,fontSize:8.5,fontWeight:700,color:"black",background:A,padding:"17px 32px",letterSpacing:"0.22em",textTransform:"uppercase",textDecoration:"none",display:"inline-flex",alignItems:"center",clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",transition:"background 0.22s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="white"}
                  onMouseLeave={e=>e.currentTarget.style.background=A}>Lock In Your Spot →</a>
              </div>
              <div data-id="l3" className={`rv d2${Rv("l3")?" on":""}`}>
                <div style={{ background:"#080808",border:`1px solid rgba(255,255,255,0.07)`,position:"relative",overflow:"hidden",minHeight:360,display:"flex",alignItems:"center",justifyContent:"center",clipPath:"polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px))" }}>
                  <div style={{ position:"absolute",inset:0,backgroundImage:`linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)`,backgroundSize:"34px 34px" }}/>
                  {[160,240,330].map((sz,i)=>(
                    <div key={sz} style={{ position:"absolute",width:sz,height:sz,border:`1px solid rgba(245,158,11,${0.12-i*0.035})`,borderRadius:"50%" }}/>
                  ))}
                  <div style={{ position:"relative",zIndex:1,textAlign:"center",padding:"40px 24px" }}>
                    <div style={{ width:52,height:52,background:A,margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 48px rgba(245,158,11,0.45)`,clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))" }}>
                      <span style={{ fontSize:22 }}>📍</span>
                    </div>
                    <p style={{ ...D,fontSize:9,fontWeight:900,textTransform:"uppercase",color:"white",marginBottom:7 }}>HEADZ UP BARBERSHOP</p>
                    <p style={{ ...M,fontSize:12,color:"#d4d4d4" }}>2509 W 4th St, Hattiesburg MS 39401</p>
                  </div>
                  <p style={{ position:"absolute",bottom:10,right:14,...M,fontSize:9,color:"#a1a1aa",letterSpacing:"0.2em" }}>31.3271° N · 89.2903° W</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ CTA BAND — DMC RED/GOLD ══ */}
        <section style={{ position:"relative",overflow:"hidden",padding:isMobile?"52px 20px":"68px clamp(18px,5vw,44px)" }}>
          {/* Split bg — half red half amber */}
          <div style={{ position:"absolute",inset:0,background:`linear-gradient(135deg,${R} 0%,${R} 48%,${A} 48%,${A} 100%)` }}/>
          {/* Diagonal slash */}
          <div style={{ position:"absolute",top:0,bottom:0,left:"48%",width:3,background:"rgba(0,0,0,0.3)",transform:"skewX(-3deg)",zIndex:1 }}/>
          <div style={{ position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(0,0,0,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.07) 1px,transparent 1px)",backgroundSize:"42px 42px",pointerEvents:"none" }}/>

          <div style={{ maxWidth:1320,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:24,position:"relative",zIndex:2 }}>
            <h2 style={{ ...D,fontSize:"clamp(1.8rem,4vw,3rem)",fontWeight:900,lineHeight:0.92,letterSpacing:"-0.04em",color:"black",textTransform:"uppercase" }}>
              Ready To Look<br/>Your Best?
            </h2>
            <div style={{ display:"flex",gap:12,alignItems:"center",flexWrap:"wrap" }}>
              <a href="/book" onClick={book} style={{ ...D,fontSize:8.5,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",padding:"17px 34px",background:"black",color:"white",textDecoration:"none",clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",transition:"all 0.25s" }}
                onMouseEnter={e=>{e.currentTarget.style.background="#030303";e.currentTarget.style.color=A;}}
                onMouseLeave={e=>{e.currentTarget.style.background="black";e.currentTarget.style.color="white";}}>Book Now →</a>
              <a href="tel:+16012345678" style={{ ...M,fontSize:11,color:"rgba(0,0,0,0.45)",textDecoration:"none",transition:"color 0.2s" }}
                onMouseEnter={e=>e.currentTarget.style.color="black"}
                onMouseLeave={e=>e.currentTarget.style.color="rgba(0,0,0,0.45)"}>Or call us</a>
            </div>
          </div>
        </section>

        {/* ══ FOOTER ══ */}
        <footer style={{ borderTop:"1px solid rgba(255,255,255,0.06)",padding:isMobile?"24px 20px":"28px clamp(18px,5vw,44px)" }}>
          <div style={{ maxWidth:1320,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14 }}>
            <p style={{ ...D,fontSize:15,fontWeight:900,letterSpacing:"-0.06em" }}>HEADZ<span style={{ color:A,fontStyle:"italic" }}>UP</span></p>
            <p style={{ ...M,fontSize:10,color:"#a1a1aa",letterSpacing:"0.3em",textTransform:"uppercase" }}>© 2026 · Hattiesburg, MS</p>
            <div style={{ display:"flex",gap:18 }}>
              {[["book","Book",book],["/login","Login",null],["/barber-login","Barbers",null]].map(([href,label,fn])=>(
                <a key={label} href={href} onClick={fn||undefined} style={{ ...M,fontSize:10,color:"#d4d4d4",letterSpacing:"0.2em",textTransform:"uppercase",transition:"color 0.2s",textDecoration:"none" }}
                  onMouseEnter={e=>e.currentTarget.style.color=A}
                  onMouseLeave={e=>e.currentTarget.style.color="#a1a1aa"}>{label}</a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}