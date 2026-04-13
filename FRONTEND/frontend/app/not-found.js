"use client";

import { useRouter } from "next/navigation";

const sf   = { fontFamily:"'Syncopate',sans-serif" };
const mono = { fontFamily:"'DM Mono',monospace" };

export default function NotFound() {
  const router = useRouter();

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#040404;color:white;min-height:100vh;}
        @keyframes nf-fadeup { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:none} }
        @keyframes nf-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes nf-glow   { 0%,100%{opacity:0.04} 50%{opacity:0.08} }
        @keyframes nf-scan   { from{top:-1px} to{top:100%} }
        @keyframes nf-pulse  { 0%,100%{opacity:0.25} 50%{opacity:0.6} }
        .nf-a { animation: nf-fadeup 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
        .nf-b { animation: nf-fadeup 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s  both; }
        .nf-c { animation: nf-fadeup 0.8s cubic-bezier(0.16,1,0.3,1) 0.35s both; }
        .nf-d { animation: nf-fadeup 0.8s cubic-bezier(0.16,1,0.3,1) 0.5s  both; }
        .nf-e { animation: nf-fadeup 0.7s cubic-bezier(0.16,1,0.3,1) 0.65s both; }
        .nf-scissors { animation: nf-float 3.2s ease-in-out infinite; }
        .nf-btn-primary   { transition: background 0.22s; }
        .nf-btn-primary:hover { background: white !important; }
        .nf-btn-secondary { transition: all 0.22s; }
        .nf-btn-secondary:hover { color: white !important; border-color: rgba(255,255,255,0.35) !important; }
      `}</style>

      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(255,255,255,0.013) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.013) 1px,transparent 1px)",
        backgroundSize:"60px 60px" }}/>
      <div style={{ position:"fixed", top:"30%", left:"50%", transform:"translate(-50%,-50%)",
        width:700, height:700, borderRadius:"50%",
        background:"radial-gradient(circle,rgba(245,158,11,0.055) 0%,transparent 60%)",
        pointerEvents:"none", zIndex:0, animation:"nf-glow 4s ease-in-out infinite" }}/>
      <div style={{ position:"fixed", left:0, right:0, height:1, zIndex:1, pointerEvents:"none",
        background:"linear-gradient(to right,transparent,rgba(245,158,11,0.2),transparent)",
        animation:"nf-scan 8s linear infinite" }}/>

      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:50, height:60,
        padding:"0 clamp(18px,5vw,44px)", display:"flex", alignItems:"center",
        justifyContent:"space-between", background:"rgba(4,4,4,0.88)",
        backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
        <a href="/" style={{ ...sf, fontWeight:700, fontSize:18, letterSpacing:"-0.05em", color:"white", textDecoration:"none" }}>
          HEADZ<span style={{ color:"#f59e0b", fontStyle:"italic" }}>UP</span>
        </a>
        <a href="/book" style={{ ...mono, fontSize:10, color:"#a1a1aa", letterSpacing:"0.25em", textTransform:"uppercase",
          textDecoration:"none", padding:"8px 16px", border:"1px solid rgba(255,255,255,0.08)", transition:"all 0.2s" }}
          onMouseEnter={e=>{e.currentTarget.style.color="#f59e0b";e.currentTarget.style.borderColor="rgba(245,158,11,0.4)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="#a1a1aa";e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";}}>
          Book Now
        </a>
      </nav>

      <div style={{ position:"relative", zIndex:10, minHeight:"100vh", display:"flex",
        flexDirection:"column", alignItems:"center", justifyContent:"center",
        padding:"80px 24px 60px", textAlign:"center" }}>

        <div className="nf-a" style={{ position:"relative", marginBottom:8 }}>
          <h1 style={{ ...sf, fontSize:"clamp(7rem,25vw,16rem)", fontWeight:900,
            lineHeight:0.85, margin:0, letterSpacing:"-0.06em", color:"transparent",
            WebkitTextStroke:"1px rgba(245,158,11,0.2)", userSelect:"none" }}>404</h1>
          <div className="nf-scissors" style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)" }}>
            <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="#f59e0b"
              strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.8 }}>
              <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
              <line x1="20" y1="4" x2="8.12" y2="15.88"/>
              <line x1="14.47" y1="14.48" x2="20" y2="20"/>
              <line x1="8.12" y1="8.12" x2="12" y2="12"/>
            </svg>
          </div>
        </div>

        <div className="nf-b" style={{ width:56, height:2, margin:"20px auto 28px",
          background:"linear-gradient(to right,transparent,#f59e0b,transparent)" }}/>

        <div className="nf-b" style={{ display:"flex", alignItems:"center", gap:0, marginBottom:20, justifyContent:"center" }}>
          <div style={{ background:"#ef4444", padding:"5px 14px 5px 10px", clipPath:"polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)" }}>
            <span style={{ ...sf, fontSize:7, fontWeight:900, color:"white", letterSpacing:"0.4em", textTransform:"uppercase" }}>PAGE</span>
          </div>
          <div style={{ background:"#f59e0b", padding:"5px 16px 5px 12px", clipPath:"polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)" }}>
            <span style={{ ...sf, fontSize:7, fontWeight:900, color:"black", letterSpacing:"0.4em", textTransform:"uppercase" }}>NOT FOUND</span>
          </div>
        </div>

        <div className="nf-c" style={{ marginBottom:14 }}>
          <h2 style={{ ...sf, fontSize:"clamp(1.3rem,4.5vw,2.2rem)", fontWeight:900,
            textTransform:"uppercase", letterSpacing:"-0.03em", color:"white", margin:0 }}>
            This Page Got <span style={{ color:"#f59e0b", fontStyle:"italic" }}>Cut_</span>
          </h2>
        </div>

        <p className="nf-d" style={{ ...mono, fontSize:13, color:"#52525b",
          maxWidth:360, lineHeight:1.85, marginBottom:44 }}>
          This page doesn&apos;t exist or may have been moved. Let&apos;s get you back on track.
        </p>

        <div className="nf-e" style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center" }}>
          <a href="/" className="nf-btn-primary"
            style={{ padding:"16px 36px", background:"#f59e0b", color:"black",
              ...sf, fontSize:8, fontWeight:700, letterSpacing:"0.22em", textTransform:"uppercase",
              textDecoration:"none", clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))" }}>
            Take Me Home →
          </a>
          <a href="/book" className="nf-btn-secondary"
            style={{ padding:"16px 36px", background:"transparent", color:"#52525b",
              ...sf, fontSize:8, letterSpacing:"0.22em", textTransform:"uppercase",
              border:"1px solid rgba(255,255,255,0.1)", textDecoration:"none",
              clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))" }}>
            Book A Cut
          </a>
          <button onClick={()=>router.back()}
            style={{ padding:"16px 28px", background:"transparent", color:"#3f3f46",
              ...mono, fontSize:10, letterSpacing:"0.2em", textTransform:"uppercase",
              border:"1px solid rgba(255,255,255,0.05)", cursor:"pointer", transition:"all 0.22s" }}
            onMouseEnter={e=>{e.currentTarget.style.color="#a1a1aa";e.currentTarget.style.borderColor="rgba(255,255,255,0.15)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="#3f3f46";e.currentTarget.style.borderColor="rgba(255,255,255,0.05)";}}>
            ← Go Back
          </button>
        </div>

        <p style={{ position:"absolute", bottom:28, ...mono, fontSize:8,
          color:"#1c1c1e", letterSpacing:"0.55em", textTransform:"uppercase",
          animation:"nf-pulse 4s ease-in-out infinite" }}>
          HEADZ UP BARBERSHOP · HATTIESBURG, MS · 2509 W 4TH ST
        </p>
      </div>
    </>
  );
}
