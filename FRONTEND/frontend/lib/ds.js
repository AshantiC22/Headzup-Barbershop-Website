// ── HEADZ UP Design System ────────────────────────────────────────────────────
// Import this in every page: import { DS, GlobalStyles, ScissorDivider, SectionStamp, BtnPrimary, BtnSecondary, Pill } from "@/lib/ds"

export const A  = "#f59e0b";   // amber — primary
export const R  = "#ef4444";   // red   — accent
export const BG = "#050505";   // near-black background
export const SF   = { fontFamily:"'Syncopate',sans-serif" };
export const MONO = { fontFamily:"'DM Mono',monospace" };

// ── Global CSS string — paste into <style jsx global> ─────────────────────────
export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{scroll-behavior:smooth;}
  body{background:#050505;color:white;overflow-x:hidden;}

  /* Noise texture */
  body::before {
    content:"";position:fixed;inset:0;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    opacity:0.018;pointer-events:none;z-index:9999;mix-blend-mode:overlay;
  }

  /* Barber pole left edge */
  body::after {
    content:"";position:fixed;left:0;top:0;bottom:0;width:5px;
    background:repeating-linear-gradient(-45deg,#ef4444 0px,#ef4444 6px,#ffffff 6px,#ffffff 12px,#f59e0b 12px,#f59e0b 18px,#000 18px,#000 24px);
    opacity:0.5;z-index:9998;pointer-events:none;
  }

  @keyframes glow-green { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)} 50%{box-shadow:0 0 0 9px rgba(34,197,94,0)} }
  @keyframes scandown   { from{top:-1px} to{top:101%} }
  @keyframes shimmer    { from{transform:translateX(-100%)} to{transform:translateX(280%)} }
  @keyframes floatUp    { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:none} }
  @keyframes spin       { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes fadeIn     { from{opacity:0} to{opacity:1} }
  @keyframes slideInR   { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:none} }
  @keyframes slideUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }

  /* Reveal on scroll */
  .rv { opacity:0;transform:translateY(28px);transition:opacity 0.9s cubic-bezier(0.16,1,0.3,1),transform 0.9s cubic-bezier(0.16,1,0.3,1); }
  .rv.on { opacity:1;transform:none; }
  .rv.d1 { transition-delay:0.08s; } .rv.d2 { transition-delay:0.18s; } .rv.d3 { transition-delay:0.28s; }

  /* Primary button shimmer */
  .btn-primary { position:relative;overflow:hidden; }
  .btn-primary::after { content:"";position:absolute;top:0;left:0;width:35%;height:100%;background:linear-gradient(to right,transparent,rgba(255,255,255,0.18),transparent);transform:translateX(-100%); }
  .btn-primary:hover::after { transform:translateX(280%);transition:transform 0.5s ease; }

  /* Highlight underline */
  .hl { position:relative;display:inline-block; }
  .hl::after { content:"";position:absolute;bottom:-2px;left:0;right:0;height:2px;background:linear-gradient(to right,#ef4444,#f59e0b);transform:scaleX(0);transform-origin:left;transition:transform 0.4s cubic-bezier(0.16,1,0.3,1); }
  .hl:hover::after { transform:scaleX(1); }

  /* Mobile/desktop visibility */
  .donly { display:flex!important; } .monly { display:none!important; }
  @media(max-width:768px){ .donly{display:none!important;} .monly{display:flex!important;} body::after{display:none;} }

  /* Tap feedback */
  @media(hover:none){ button:active,a:active{opacity:0.75;transform:scale(0.97);} }
`;

// ── ScissorDivider ─────────────────────────────────────────────────────────────
export function ScissorDivider() {
  return (
    <div style={{ position:"relative",height:32,overflow:"hidden",width:"100%",pointerEvents:"none" }}>
      <div style={{ position:"absolute",top:"50%",left:0,right:0,height:1,
        background:`linear-gradient(to right,transparent,${A}33 15%,${A}66 50%,${A}33 85%,transparent)`,
        transform:"translateY(-50%)" }}/>
      <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        background:"#050505",padding:"0 16px" }}>
        <svg width="28" height="20" viewBox="0 0 24 24" fill="none" stroke={A}
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
          <line x1="20" y1="4" x2="8.12" y2="15.88"/>
          <line x1="14.47" y1="14.48" x2="20" y2="20"/>
          <line x1="8.12" y1="8.12" x2="12" y2="12"/>
        </svg>
      </div>
      {[-180,180].map((x,i)=>(
        <div key={i} style={{ position:"absolute",top:"50%",left:"50%",
          transform:`translate(calc(-50% + ${x}px),-50%) rotate(45deg)`,
          width:5,height:5,background:A,opacity:0.4 }}/>
      ))}
    </div>
  );
}

// ── SectionStamp ──────────────────────────────────────────────────────────────
export function SectionStamp({ left, right, sub }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:0 }}>
      <div style={{ background:R,padding:"5px 14px 5px 10px",
        clipPath:"polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)" }}>
        <span style={{ ...SF,fontSize:8,fontWeight:900,color:"white",
          letterSpacing:"0.4em",textTransform:"uppercase" }}>{left}</span>
      </div>
      <div style={{ background:A,padding:"5px 14px 5px 12px",
        clipPath:"polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)",marginRight:12 }}>
        <span style={{ ...SF,fontSize:8,fontWeight:900,color:"black",
          letterSpacing:"0.4em",textTransform:"uppercase" }}>{right}</span>
      </div>
      {sub&&<span style={{ ...MONO,fontSize:9,color:`${A}55`,letterSpacing:"0.35em",textTransform:"uppercase" }}>{sub}</span>}
      <div style={{ flex:1,height:2,background:`linear-gradient(to right,${A}44,transparent)`,marginLeft:12 }}/>
    </div>
  );
}

// ── BarberPoleLine ─────────────────────────────────────────────────────────────
export function BarberPoleLine({ height = 4, opacity = 0.35 }) {
  return (
    <div style={{ height,width:"100%",opacity,
      background:"repeating-linear-gradient(90deg,#ef4444 0px,#ef4444 8px,#fff 8px,#fff 16px,#f59e0b 16px,#f59e0b 24px,#000 24px,#000 32px)" }}/>
  );
}

// ── BarberPoleCorner ───────────────────────────────────────────────────────────
export function BarberPoleCorner({ size = 36, opacity = 0.25 }) {
  return (
    <div style={{ position:"absolute",top:0,right:0,width:size,height:size,overflow:"hidden",pointerEvents:"none" }}>
      <div style={{ position:"absolute",top:0,right:0,width:size*1.5,height:size*1.5,opacity,
        background:"repeating-linear-gradient(-45deg,#ef4444 0px,#ef4444 5px,#fff 5px,#fff 10px,#f59e0b 10px,#f59e0b 15px,#000 15px,#000 20px)" }}/>
    </div>
  );
}

// ── PageBackground ─────────────────────────────────────────────────────────────
export function PageBackground() {
  return (
    <>
      <div style={{ position:"fixed",inset:0,zIndex:0,pointerEvents:"none",
        backgroundImage:`linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)`,
        backgroundSize:"66px 66px" }}/>
      <div style={{ position:"fixed",top:"-10%",right:"-6%",width:600,height:600,
        background:`radial-gradient(circle,rgba(245,158,11,0.06) 0%,transparent 62%)`,pointerEvents:"none",zIndex:0 }}/>
      <div style={{ position:"fixed",bottom:"16%",left:"-9%",width:480,height:480,
        background:`radial-gradient(circle,rgba(245,158,11,0.03) 0%,transparent 58%)`,pointerEvents:"none",zIndex:0 }}/>
    </>
  );
}
