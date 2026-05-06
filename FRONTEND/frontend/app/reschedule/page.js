"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const sf   = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };
const A    = "#f59e0b";

function RescheduleRespondInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const token  = searchParams.get("token");
    const action = searchParams.get("action");

    if (!token || !["accept", "reject"].includes(action)) {
      setStatus("invalid");
      return;
    }

    // Call backend directly with fetch — no auth header needed (AllowAny)
    // Using fetch instead of API.get so there's no axios redirect-following issue
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://api.headzupp.com";
    fetch(`${apiBase}/api/reschedule/respond/?token=${token}&action=${action}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then(async (res) => {
        const data = await res.json();
        if (data.status === "accepted")        setStatus("accepted");
        else if (data.status === "rejected")   setStatus("rejected");
        else if (data.status === "already_handled") setStatus("already");
        else                                   setStatus("error");
      })
      .catch(() => setStatus("error"));
  }, []);

  const CONFIG = {
    loading:  { icon:"↻", color:"#f59e0b", title:"Processing",        sub:"Please wait a moment while we handle your request." },
    accepted: { icon:"✓", color:"#4ade80", title:"Request Approved",   sub:"The client has been notified and their appointment is updated." },
    rejected: { icon:"✕", color:"#f87171", title:"Request Declined",   sub:"The client has been notified. Their original appointment time remains." },
    already:  { icon:"!",  color:"#f59e0b", title:"Already Handled",   sub:"This reschedule request has already been responded to." },
    invalid:  { icon:"?",  color:"#52525b", title:"Invalid Link",      sub:"This link is invalid or has expired. Contact the shop if you need help." },
    error:    { icon:"!",  color:"#f87171", title:"Something Went Wrong", sub:"Could not process the request. Please try from your dashboard or contact the shop." },
  };

  const cfg = CONFIG[status] || CONFIG.loading;
  const isLoading = status === "loading";

  return (
    <>
      <style jsx global>{`
        /* Noise + barber pole from design system */
        body::before{content:"";position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");opacity:0.018;pointer-events:none;z-index:9999;mix-blend-mode:overlay;}
        body::after{content:"";position:fixed;left:0;top:0;bottom:0;width:5px;background:repeating-linear-gradient(-45deg,#ef4444 0px,#ef4444 6px,#ffffff 6px,#ffffff 12px,#f59e0b 12px,#f59e0b 18px,#000 18px,#000 24px);opacity:0.5;z-index:9998;pointer-events:none;}
        @media(max-width:768px){body::after{display:none;}}
        .btn-primary{position:relative;overflow:hidden;}
        .btn-primary::after{content:"";position:absolute;top:0;left:0;width:35%;height:100%;background:linear-gradient(to right,transparent,rgba(255,255,255,0.18),transparent);transform:translateX(-100%);}
        .btn-primary:hover::after{transform:translateX(280%);transition:transform 0.5s ease;}
        @media(hover:none){button:active,a:active{opacity:0.75;}}
        @keyframes shimmer{from{transform:translateX(-100%)}to{transform:translateX(280%)}}
        @keyframes floatUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:none}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { background:#040404; color:white; min-height:100vh; }
        @keyframes spin    { from{transform:rotate(0deg)}   to{transform:rotate(360deg)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      {/* Grid BG */}
      <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.013) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.013) 1px,transparent 1px)", backgroundSize:"60px 60px", pointerEvents:"none" }}/>
      <div style={{ position:"fixed", top:"-10%", right:"-5%", width:600, height:600, background:"radial-gradient(circle,rgba(245,158,11,0.04) 0%,transparent 60%)", pointerEvents:"none" }}/>

      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, position:"relative", zIndex:10 }}>

        {/* Logo */}
        <div style={{ marginBottom:48 }}>
          <p style={{ ...sf, fontWeight:700, fontSize:22, letterSpacing:"-0.05em", textAlign:"center" }}>
            HEADZ<span style={{ color:A, fontStyle:"italic" }}>UP</span>
          </p>
        </div>

        {/* Card */}
        <div style={{ width:"100%", maxWidth:440, background:"rgba(255,255,255,0.02)", border:`1px solid ${cfg.color}22`, position:"relative", animation:"fadeUp 0.5s ease", clipPath:"polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,20px 100%,0 calc(100% - 20px))" }}>
          {/* Top accent */}
          <div style={{ height:3, background:`linear-gradient(to right,${cfg.color},${cfg.color}44,transparent)` }}/>
          {/* P5 corner */}
          <div style={{ position:"absolute", top:14, right:14, width:14, height:14, borderTop:`1.5px solid ${cfg.color}44`, borderRight:`1.5px solid ${cfg.color}44` }}/>

          <div style={{ padding:"40px 36px", textAlign:"center" }}>
            {/* Icon */}
            <div style={{ width:64, height:64, background:`${cfg.color}15`, border:`1px solid ${cfg.color}44`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 28px", clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))", animation:isLoading?"spin 1.2s linear infinite":"none" }}>
              <span style={{ fontSize:24, color:cfg.color, fontWeight:900 }}>{cfg.icon}</span>
            </div>

            <p style={{ ...mono, fontSize:8, letterSpacing:"0.4em", color:"#52525b", textTransform:"uppercase", marginBottom:12 }}>HEADZ UP Barbershop</p>

            <h1 style={{ ...sf, fontSize:"clamp(1.1rem,4vw,1.5rem)", fontWeight:900, textTransform:"uppercase", lineHeight:1.15, color:"white", marginBottom:16 }}>
              {cfg.title.split(" ").slice(0,-1).join(" ")}{" "}
              <span style={{ color:cfg.color, fontStyle:"italic" }}>{cfg.title.split(" ").slice(-1)[0]}_</span>
            </h1>

            <p style={{ ...mono, fontSize:12, color:"#71717a", lineHeight:1.75, marginBottom:isLoading?0:36 }}>{cfg.sub}</p>

            {/* Loading pulse bars */}
            {isLoading && (
              <div style={{ display:"flex", gap:6, justifyContent:"center", marginTop:28 }}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{ width:6, height:6, background:A, clipPath:"polygon(50% 0,100% 50%,50% 100%,0 50%)", animation:`pulse 1.2s ease ${i*0.2}s infinite` }}/>
                ))}
              </div>
            )}

            {/* Actions */}
            {!isLoading && (
              <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
                {(status === "accepted" || status === "rejected") && (
                  <button onClick={() => router.push("/barber-dashboard")}
                    style={{ padding:"13px 26px", background:A, color:"black", ...sf, fontSize:8, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.2em", border:"none", cursor:"pointer", clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))" }}>
                    Dashboard →
                  </button>
                )}
                <button onClick={() => router.push("/")}
                  style={{ padding:"13px 24px", background:"transparent", color:"#52525b", ...sf, fontSize:8, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.2em", border:"1px solid rgba(255,255,255,0.08)", cursor:"pointer", transition:"all 0.2s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.2)";e.currentTarget.style.color="white";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.color="#52525b";}}>
                  Home
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p style={{ ...mono, fontSize:9, color:"#3f3f46", marginTop:32, textAlign:"center", letterSpacing:"0.2em" }}>
          HEADZ UP · 2509 W 4th St, Hattiesburg MS
        </p>
      </div>
    </>
  );
}

export default function RescheduleRespondPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"#040404", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:20, height:20, border:"2px solid rgba(245,158,11,0.2)", borderTopColor:"#f59e0b", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <RescheduleRespondInner/>
    </Suspense>
  );
}
