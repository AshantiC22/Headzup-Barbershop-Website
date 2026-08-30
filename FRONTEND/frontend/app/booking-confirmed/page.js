"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

const SF   = { fontFamily:"'Syncopate',sans-serif" };
const MONO = { fontFamily:"'DM Mono',monospace" };

function ConfirmedContent() {
  const { theme: T } = useTheme();
  const params   = useSearchParams();
  const service  = params.get("service")  || "";
  const barber   = params.get("barber")   || "";
  const date     = params.get("date")     || "";
  const time     = params.get("time")     || "";
  const deposit  = params.get("deposit")  || "10.00";
  const remaining= params.get("remaining")|| "0.00";
  const payment  = params.get("payment")  || "deposit";
  const hasError = params.get("error")    === "true";

  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 80); }, []);

  function fmtDate(d) {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      weekday:"long", month:"long", day:"numeric", year:"numeric"
    });
  }
  function fmtTime(t) {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hr = parseInt(h, 10);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  }

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text,
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"24px 20px" }}>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@0,400;0,500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.bg};color:${T.text};}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
        @keyframes drawCheck{to{stroke-dashoffset:0}}
        .fade-up{animation:fadeUp 0.4s cubic-bezier(0.4,0,0.2,1) both;}
      `}</style>

      {/* Background glow */}
      <div style={{ position:"fixed", top:"-20%", right:"-10%", width:500, height:500,
        borderRadius:"50%", background:"radial-gradient(circle,rgba(245,158,11,0.06),transparent 70%)",
        pointerEvents:"none" }}/>

      <div style={{ width:"100%", maxWidth:480,
        opacity: show ? 1 : 0,
        transform: show ? "none" : "translateY(20px)",
        transition: "opacity 0.4s ease, transform 0.4s ease" }}>

        {hasError ? (
          /* ── Error state ── */
          <div style={{ textAlign:"center", padding:"48px 32px",
            background:T.surface, backdropFilter:"blur(20px)",
            borderRadius:20, border:`1px solid rgba(239,68,68,0.3)` }}>
            <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
            <p style={{ ...SF, fontSize:14, fontWeight:700, color:T.text,
              textTransform:"uppercase", letterSpacing:"-0.02em", marginBottom:8 }}>
              Something went wrong
            </p>
            <p style={{ ...MONO, fontSize:12, color:T.sub, marginBottom:24, lineHeight:1.7 }}>
              Your payment may have gone through — check your email for confirmation. If you were charged but have no booking, contact us directly.
            </p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
              <a href="/dashboard" style={{ padding:"11px 22px",
                background:"linear-gradient(135deg,#f59e0b,#d97706)",
                borderRadius:10, color:"#000", textDecoration:"none",
                ...SF, fontSize:8, fontWeight:700, letterSpacing:"0.15em",
                textTransform:"uppercase" }}>
                My Dashboard →
              </a>
              <a href="/" style={{ padding:"11px 22px",
                background:T.surface, border:`1px solid ${T.border}`,
                borderRadius:10, color:T.sub, textDecoration:"none",
                ...MONO, fontSize:11 }}>
                Go Home
              </a>
            </div>
          </div>
        ) : (
          /* ── Success state ── */
          <>
            {/* Check mark */}
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{
                width: 72, height: 72, borderRadius:"50%", margin:"0 auto 16px",
                background:"rgba(34,197,94,0.08)",
                border:"2px solid rgba(34,197,94,0.4)",
                display:"flex", alignItems:"center", justifyContent:"center",
                animation:"pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both"
              }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M6 16l7 7 13-13"
                    stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray="32" strokeDashoffset="32"
                    style={{ animation:"drawCheck 0.4s 0.3s ease forwards" }}/>
                </svg>
              </div>
              <p style={{ ...MONO, fontSize:9, color:"rgba(245,158,11,0.7)",
                letterSpacing:"0.4em", textTransform:"uppercase", marginBottom:8 }}>
                ✂️ HEADZ UP Barbershop
              </p>
              <h1 style={{ ...SF, fontSize:"clamp(1.4rem,5vw,2rem)", fontWeight:700,
                color:T.text, textTransform:"uppercase", letterSpacing:"-0.03em",
                lineHeight:1, marginBottom:8 }}>
                You're Booked.
              </h1>
              <p style={{ ...MONO, fontSize:12, color:T.sub }}>
                {payment === "deposit"
                  ? `$${deposit} deposit paid · $${remaining} due at your appointment`
                  : "Your appointment is confirmed"}
              </p>
            </div>

            {/* Appointment card */}
            <div style={{ background:T.surface, backdropFilter:"blur(20px)",
              WebkitBackdropFilter:"blur(20px)",
              borderRadius:16, border:`1px solid ${T.amberBorder}`,
              overflow:"hidden", marginBottom:20 }}>
              <div style={{ height:3, background:"linear-gradient(to right,#f59e0b,#fbbf24,#f59e0b)" }}/>
              <div style={{ padding:24 }}>
                {[
                  { label:"Service",  value:service  },
                  { label:"Barber",   value:barber   },
                  { label:"Date",     value:fmtDate(date) },
                  { label:"Time",     value:fmtTime(time) },
                  { label:"Deposit",  value:`$${deposit} paid online` },
                  remaining && parseFloat(remaining) > 0
                    ? { label:"Due at Shop", value:`$${remaining}`, highlight:true }
                    : null,
                ].filter(Boolean).map(row => (
                  <div key={row.label} style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", padding:"10px 0",
                    borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ ...MONO, fontSize:10, color:T.sub,
                      letterSpacing:"0.1em", textTransform:"uppercase" }}>
                      {row.label}
                    </span>
                    <span style={{ ...MONO, fontSize:13, fontWeight:600,
                      color: row.highlight ? T.amber : T.text }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <div style={{ background:T.amberDim, border:`1px solid ${T.amberBorder}`,
              borderRadius:12, padding:"14px 16px", marginBottom:24 }}>
              <p style={{ ...MONO, fontSize:11, color:T.amber, lineHeight:1.7 }}>
                📍 <strong>2509 W 4th St, Hattiesburg MS 39401</strong><br/>
                A confirmation email has been sent to you. Show up on time — your spot is locked in.
              </p>
            </div>

            {/* Actions */}
            <div style={{ display:"flex", gap:10 }}>
              <a href="/dashboard" style={{ flex:1, textAlign:"center",
                padding:"13px", background:"linear-gradient(135deg,#f59e0b,#d97706)",
                borderRadius:11, color:"#000", textDecoration:"none",
                ...SF, fontSize:8, fontWeight:700, letterSpacing:"0.15em",
                textTransform:"uppercase", boxShadow:"0 4px 20px rgba(245,158,11,0.35)" }}>
                My Dashboard →
              </a>
              <a href="/book" style={{ flex:1, textAlign:"center",
                padding:"13px", background:T.surface,
                border:`1px solid ${T.border}`, borderRadius:11,
                color:T.sub, textDecoration:"none", ...MONO, fontSize:11 }}>
                Book Another
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BookingConfirmedPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"#070709",
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        <p style={{ fontFamily:"'DM Mono',monospace", color:"#9ca3af", fontSize:11 }}>
          Loading...
        </p>
      </div>
    }>
      <ConfirmedContent/>
    </Suspense>
  );
}
