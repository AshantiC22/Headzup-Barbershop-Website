"use client";
export const dynamic = "force-dynamic";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/lib/LoadingScreen";
import useBreakpoint from "@/lib/useBreakpoint";

if (typeof window !== "undefined") {
  fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.headzupp.com"}/api/barbers/`, {
    method: "HEAD", signal: AbortSignal.timeout?.(8000),
  }).catch(() => {});
}

const D = { fontFamily:"'Syncopate',sans-serif" };
const M = { fontFamily:"'DM Mono',monospace" };
const A  = "#f59e0b";
const R  = "#ef4444";
const SHOP_PHONE         = "+16012065206";
const SHOP_PHONE_DISPLAY = "(601) 206-5206";

const validPhoto = (url) => {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  if (url.startsWith("https://")) return url;
  return null;
};

// ── STATIC DATA ───────────────────────────────────────────────────────────────
const SERVICES = [
  {name:"Haircut & Shave",      price:35, dur:"30 min", pop:true},
  {name:"Haircut",              price:30, dur:"30 min", pop:false},
  {name:"Senior Cut and Shave", price:30, dur:"30 min", pop:false},
  {name:"Kids Cutz (1–12)",     price:25, dur:"30 min", pop:false},
  {name:"Line and Shave",       price:25, dur:"30 min", pop:false},
  {name:"Senior Cut",           price:25, dur:"30 min", pop:false},
  {name:"Beard Trim",           price:20, dur:"15 min", pop:false},
  {name:"Line",                 price:20, dur:"15 min", pop:false},
  {name:"Shave",                price:20, dur:"30 min", pop:false},
  {name:"Kids Line",            price:15, dur:"30 min", pop:false},
  {name:"Senior Line",          price:15, dur:"30 min", pop:false},
];
const REVIEWS = [
  {q:"This man is an amazing barber with great energy. Most importantly the cuts are fire!!", name:"Ronnie E.", city:"Hattiesburg"},
  {q:"Best fade in Hattiesburg, hands down. I drive 40 minutes just to sit in that chair.", name:"Marcus T.", city:"Laurel"},
  {q:"Came in first time, walked out looking like a new man. The lineup was immaculate.", name:"DeShawn K.", city:"Hattiesburg"},
  {q:"My son has been going here since he was 3. Fantastic with kids and the cut is always perfect.", name:"Tanya W.", city:"Hattiesburg"},
];
const TICKER = ["Precision Fades","Clean Lineups","Kids Cutz","Beard Trims","Senior Cuts","Book Online 24/7","Hattiesburg MS","HEADZ UP"];
const GALLERY = [
  {url:"/pictures/IMG_20260331_115011 (2).jpg", num:"01", label:"The Fade", sub:"Signature"},
  {url:"/pictures/IMG_20260331_115011 (3).jpg", num:"02", label:"Edge Up",  sub:"Precision"},
  {url:"/pictures/IMG_20260331_115011 (4).jpg", num:"03", label:"Beard",    sub:"Sculpted"},
  {url:"/pictures/IMG_20260331_115011 (5).jpg", num:"04", label:"Kids Cut", sub:"Gentle"},
  {url:"/pictures/IMG_20260331_115011 (6).jpg", num:"05", label:"Full Cut",  sub:"Premium"},
  {url:"/pictures/IMG_20260331_115011 (7).jpg", num:"06", label:"Lineup",   sub:"Sharp"},
];

// ── BARBER POLE SVG SIGNATURE ELEMENT ────────────────────────────────────────
function BarberPole({ vertical = false, opacity = 0.07 }) {
  return (
    <svg width={vertical ? 24 : "100%"} height={vertical ? "100%" : 24}
      style={{ position:"absolute", pointerEvents:"none", opacity }}>
      <defs>
        <pattern id={`bp-${vertical}`} x="0" y="0"
          width={vertical ? 24 : 24} height={vertical ? 24 : 24}
          patternUnits="userSpaceOnUse"
          patternTransform={vertical ? "rotate(0)" : "rotate(45)"}>
          <rect width="8" height="24" fill={R}/>
          <rect x="8" width="8" height="24" fill="white"/>
          <rect x="16" width="8" height="24" fill={A}/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#bp-${vertical})`}/>
    </svg>
  );
}

// ── CUSTOM DIVIDER ────────────────────────────────────────────────────────────
function ScissorDivider({ flip = false }) {
  return (
    <div style={{ position:"relative", height:32, overflow:"hidden", margin:"0 auto", width:"100%", pointerEvents:"none" }}>
      <div style={{ position:"absolute", top:"50%", left:0, right:0, height:1,
        background:`linear-gradient(to right, transparent, ${A}33 15%, ${A}66 50%, ${A}33 85%, transparent)`,
        transform:"translateY(-50%)" }}/>
      {/* Scissor SVG centered */}
      <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        background:"#050505", padding:"0 16px" }}>
        <svg width="28" height="20" viewBox="0 0 24 24" fill="none" stroke={A}
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
          <line x1="20" y1="4" x2="8.12" y2="15.88"/>
          <line x1="14.47" y1="14.48" x2="20" y2="20"/>
          <line x1="8.12" y1="8.12" x2="12" y2="12"/>
        </svg>
      </div>
      {/* Diamond accents */}
      {[-180, 180].map((x, i) => (
        <div key={i} style={{ position:"absolute", top:"50%", left:"50%",
          transform:`translate(calc(-50% + ${x}px), -50%) rotate(45deg)`,
          width:5, height:5, background:A, opacity:0.4 }}/>
      ))}
    </div>
  );
}

// ── SECTION STAMP ─────────────────────────────────────────────────────────────
function SectionStamp({ left, right, sub }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:0 }}>
      <div style={{ background:R, padding:"5px 14px 5px 10px",
        clipPath:"polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)" }}>
        <span style={{ ...D, fontSize:8, fontWeight:900, color:"white",
          letterSpacing:"0.4em", textTransform:"uppercase" }}>{left}</span>
      </div>
      <div style={{ background:A, padding:"5px 14px 5px 12px",
        clipPath:"polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)", marginRight:12 }}>
        <span style={{ ...D, fontSize:8, fontWeight:900, color:"black",
          letterSpacing:"0.4em", textTransform:"uppercase" }}>{right}</span>
      </div>
      {sub && <span style={{ ...M, fontSize:9, color:`${A}55`, letterSpacing:"0.35em",
        textTransform:"uppercase" }}>{sub}</span>}
      <div style={{ flex:1, height:2,
        background:`linear-gradient(to right,${A}44,transparent)`, marginLeft:12 }}/>
    </div>
  );
}

// ── GALLERY ───────────────────────────────────────────────────────────────────
function GalleryGrid({ isMobile }) {
  const [hov, setHov] = useState(null);
  const [mousePos, setMousePos] = useState({x:0,y:0});
  const onMove = (e, i) => {
    if (hov !== i) return;
    const r = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - r.left) / r.width - 0.5) * 10,
      y: ((e.clientY - r.top)  / r.height - 0.5) * -8,
    });
  };

  if (isMobile) {
    return (
      <div style={{ padding:"0 0 0 0" }}>
        {/* Featured large */}
        <div style={{ position:"relative", paddingTop:"65%", overflow:"hidden",
          marginBottom:3 }}>
          <img src={GALLERY[0].url} alt={GALLERY[0].label} style={{ position:"absolute",
            inset:0, width:"100%", height:"100%", objectFit:"cover",
            filter:"brightness(0.7) saturate(0.8)" }}/>
          <div style={{ position:"absolute", inset:0,
            background:"linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 55%)" }}/>
          <div style={{ position:"absolute", bottom:14, left:16 }}>
            <p style={{ ...M, fontSize:8, color:A, letterSpacing:"0.3em",
              textTransform:"uppercase", marginBottom:3 }}>Featured</p>
            <p style={{ ...D, fontSize:14, fontWeight:900, color:"white",
              textTransform:"uppercase" }}>{GALLERY[0].label}</p>
          </div>
          <div style={{ position:"absolute", top:12, right:12, ...D, fontSize:28,
            fontWeight:900, color:"rgba(255,255,255,0.08)", letterSpacing:"-0.05em" }}>01</div>
        </div>
        {/* Thumbnail strip */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:3 }}>
          {GALLERY.slice(1).map((g,i) => (
            <div key={i} style={{ position:"relative", paddingTop:"100%", overflow:"hidden" }}>
              <img src={g.url} alt={g.label} style={{ position:"absolute", inset:0,
                width:"100%", height:"100%", objectFit:"cover",
                filter:"brightness(0.5) saturate(0.3)" }}/>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:3,
      padding:"0 clamp(20px,5vw,44px)" }}>
      <style>{`
        .gc { transition: transform 0.45s cubic-bezier(0.16,1,0.3,1),
          box-shadow 0.35s, clip-path 0.35s; }
        .gc:hover { transform:scale(1.05); z-index:10; }
        .gcl { opacity:0; transform:translateY(8px);
          transition: opacity 0.3s, transform 0.3s; }
        .gc:hover .gcl { opacity:1; transform:none; }
        .gco { opacity:0; transition:opacity 0.3s; }
        .gc:hover .gco { opacity:1; }
      `}</style>
      {GALLERY.map((g,i) => {
        const isH = hov === i;
        return (
          <div key={i} className="gc"
            style={{ position:"relative", paddingTop:"145%", overflow:"hidden",
              clipPath:isH ? "polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))" : "none",
              boxShadow:isH ? `0 24px 80px rgba(0,0,0,0.9),0 0 0 1px ${A}80` : "none",
              zIndex:isH?10:1,
            }}
            onMouseEnter={()=>setHov(i)}
            onMouseLeave={()=>{setHov(null);setMousePos({x:0,y:0});}}
            onMouseMove={e=>onMove(e,i)}>
            <img src={g.url} alt={g.label} style={{
              position:"absolute", inset:0, width:"100%", height:"100%",
              objectFit:"cover", objectPosition:"center top",
              transform:`perspective(600px) rotateX(${isH ? mousePos.y : 0}deg) rotateY(${isH ? mousePos.x : 0}deg) scale(${isH?1.08:1})`,
              filter:isH ? "brightness(0.9) contrast(1.1) saturate(1.15)" : "brightness(0.4) saturate(0.25)",
              transition:"filter 0.4s, transform 0.1s",
            }}/>
            <div style={{ position:"absolute", inset:0,
              background:"linear-gradient(to top,rgba(0,0,0,0.9) 0%,rgba(0,0,0,0.15) 55%,transparent 100%)",
              pointerEvents:"none" }}/>
            {/* Hover amber overlay */}
            <div className="gco" style={{ position:"absolute", inset:0,
              background:`linear-gradient(to top,${A}20 0%,transparent 60%)`,
              pointerEvents:"none" }}/>
            {/* CRT grain */}
            <div style={{ position:"absolute", inset:0,
              backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 3px)",
              pointerEvents:"none" }}/>
            {/* Number */}
            <div style={{ position:"absolute", top:10, left:10, ...D, fontSize:isH?18:12,
              fontWeight:900, color:isH?A:"rgba(255,255,255,0.15)",
              transition:"font-size 0.3s, color 0.3s" }}>{g.num}</div>
            {/* Label */}
            <div className="gcl" style={{ position:"absolute", bottom:0, left:0, right:0,
              padding:"12px 10px 14px", zIndex:2 }}>
              <p style={{ ...M, fontSize:8, color:A, letterSpacing:"0.3em",
                textTransform:"uppercase", marginBottom:2 }}>{g.sub}</p>
              <p style={{ ...D, fontSize:9, fontWeight:900, color:"white",
                textTransform:"uppercase" }}>{g.label}</p>
            </div>
            {isH && <div style={{ position:"absolute", inset:0,
              border:`1px solid ${A}40`, pointerEvents:"none", zIndex:3 }}/>}
          </div>
        );
      })}
    </div>
  );
}

// ── PERSONA SELECT (BARBER SELECTOR) ─────────────────────────────────────────
function PersonaSelect({ barbers, book, isMobile }) {
  const [sel,    setSel]    = useState(0);
  const [flash,  setFlash]  = useState(false);
  const list   = barbers.length ? barbers : [{ id:0, name:"Barber", bio:"", photo_url:null }];
  const active = list[sel] || list[0];


  const lock = (e) => {
    setFlash(true);
    setTimeout(() => setFlash(false), 700);
    book(e);
  };

  return (
    <section id="barber" style={{ position:"relative", overflow:"hidden",
      background:"#000", borderTop:`3px solid ${A}`, borderBottom:`3px solid ${A}` }}>
      <style>{`
        .ps-fl { animation: p5-flash 0.7s ease; }
        .ps-nm { animation: p5-namein 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        .ps-br { animation: p5-bar 1s cubic-bezier(0.4,0,0.2,1) both; }
        .ps-sc { animation: p5-scanH 5s linear infinite; }
        .ps-cd { transition:transform 0.25s,filter 0.25s,border-color 0.25s;cursor:pointer; }
        .ps-cd:hover { transform:scale(1.03); }
        .ps-rw { transition:background 0.18s,border-color 0.18s;cursor:pointer; }
        .ps-rw:hover { background:rgba(245,158,11,0.07)!important;border-color:rgba(245,158,11,0.4)!important; }
        @keyframes p5-flash  { 0%,100%{opacity:1} 20%,60%{opacity:0} 40%,80%{opacity:0.4} }
        @keyframes p5-namein { from{opacity:0;transform:translateX(-32px) skewX(-5deg)} to{opacity:1;transform:none} }
        @keyframes p5-bar    { from{width:0} to{width:var(--w,100%)} }
        @keyframes p5-scanH  { from{left:-60%} to{left:160%} }
      `}</style>

      {/* BG */}
      <div style={{ position:"absolute", inset:0, zIndex:0 }}>
        {validPhoto(active.photo_url||active.photo) && (
          <img key={"bg-"+active.id} src={validPhoto(active.photo_url||active.photo)}
            alt="" style={{ width:"100%", height:"100%", objectFit:"cover",
              objectPosition:"center top", filter:"brightness(0.07) saturate(0.2)" }}/>
        )}
        <div style={{ position:"absolute", inset:0,
          background:"linear-gradient(135deg,rgba(0,0,0,0.98) 0%,rgba(0,0,0,0.82) 50%,rgba(0,0,0,0.96) 100%)" }}/>
        <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
          <div style={{ position:"absolute", top:0, right:"30%", width:2, height:"140%",
            background:`linear-gradient(to bottom,transparent,${R}22,transparent)`,
            transform:"rotate(15deg)", transformOrigin:"top center" }}/>
          <div style={{ position:"absolute", top:0, right:"55%", width:1, height:"140%",
            background:`linear-gradient(to bottom,transparent,${A}10,transparent)`,
            transform:"rotate(15deg)", transformOrigin:"top center" }}/>
        </div>
        <div className="ps-sc" style={{ position:"absolute", top:0, bottom:0, width:"35%",
          background:`linear-gradient(to right,transparent,${A}025,transparent)`,
          pointerEvents:"none" }}/>
        <div style={{ position:"absolute", inset:0,
          backgroundImage:`linear-gradient(${A}08 1px,transparent 1px),linear-gradient(90deg,${A}08 1px,transparent 1px)`,
          backgroundSize:"48px 48px", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", inset:0,
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 3px)",
          pointerEvents:"none" }}/>
      </div>

      <div style={{ position:"relative", zIndex:1, maxWidth:1320, margin:"0 auto",
        padding:isMobile ? "40px 20px" : "52px clamp(18px,5vw,44px)" }}>
        <div style={{ display:"grid",
          gridTemplateColumns:isMobile ? "1fr" : (list.length > 2 ? "180px 1fr" : "180px 1fr"),
          gap:isMobile ? 28 : 52 }}>

          {/* Left: barber selector cards */}
          <div style={{ display:"flex", flexDirection:isMobile?"row":"column",
            gap:isMobile?10:8, overflowX:isMobile?"auto":"visible" }}>
            {list.map((b, i) => {
              const isSel = i === sel;
              return (
                <div key={b.id} className="ps-cd"
                  onClick={() => setSel(i)}
                  style={{ flexShrink:0,
                    border:`1px solid ${isSel ? A : "rgba(255,255,255,0.07)"}`,
                    background:isSel ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.02)",
                    padding:isMobile?"6px":"8px",
                    clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                    filter:isSel ? "none" : "brightness(0.55)",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:0,
                    width:isMobile?80:"100%",
                  }}>
                  {/* Photo - prominent */}
                  {validPhoto(b.photo_url||b.photo) ? (
                    <div style={{ width:"100%", position:"relative" }}>
                      <img src={validPhoto(b.photo_url||b.photo)} alt={b.name}
                        style={{ width:"100%", height:isMobile?52:72,
                          objectFit:"cover", objectPosition:"center top", display:"block",
                          clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))" }}/>
                      {isSel && <div style={{ position:"absolute",inset:0,border:`1px solid ${A}`,
                        clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",
                        pointerEvents:"none" }}/>}
                    </div>
                  ) : (
                    <div style={{ width:"100%", height:isMobile?52:72,
                      background:`${A}15`, display:"flex",
                      alignItems:"center", justifyContent:"center",
                      clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))" }}>
                      <span style={{ ...D, fontSize:20, fontWeight:900, color:A }}>
                        {(b.name||"B").charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {/* Name below photo */}
                  <p style={{ ...D, fontSize:isMobile?7:6.5, fontWeight:700,
                    textTransform:"uppercase", letterSpacing:"0.08em",
                    color:isSel?"white":"#71717a", textAlign:"center",
                    marginTop:4, transition:"color 0.2s" }}>{b.name.split(" ")[0]}</p>
                </div>
              );
            })}
          </div>

          {/* Center: active barber showcase */}
          <div className={flash ? "ps-fl" : ""} style={{ minHeight:isMobile?280:360 }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:isMobile?16:20 }}>
              <div style={{ background:R, padding:"4px 12px 4px 8px",
                clipPath:"polygon(0 0,100% 0,calc(100% - 6px) 100%,0 100%)" }}>
                <span style={{ ...M, fontSize:7, color:"white",
                  letterSpacing:"0.4em" }}>YOUR BARBER</span>
              </div>
              <div style={{ flex:1, height:1, background:`linear-gradient(to right,${R}33,transparent)`, marginLeft:8 }}/>
            </div>

            {/* Barber name */}
            <h2 className="ps-nm" key={active.id+"n"} style={{ ...D,
              fontSize:"clamp(2.2rem,6vw,5rem)", fontWeight:900,
              textTransform:"uppercase", letterSpacing:"-0.04em",
              lineHeight:0.88, color:"white", margin:"0 0 12px" }}>
              {active.name}
            </h2>

            {/* Tagline */}
            <p style={{ ...M, fontSize:12, color:"#a1a1aa", marginBottom:isMobile?20:32,
              lineHeight:1.7, maxWidth:380 }}>
              {active.bio || "Precision cuts. Clean lineups. Every time."}
            </p>



            {/* CTA */}
            <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
              <button onClick={lock} style={{ padding:"15px 32px", background:A, color:"black",
                ...D, fontSize:8.5, fontWeight:700, letterSpacing:"0.22em",
                textTransform:"uppercase", border:"none", cursor:"pointer",
                clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                transition:"background 0.22s",
                transform:"translateX(-4px)", /* asymmetric offset */
              }}
                onMouseEnter={e=>e.currentTarget.style.background="white"}
                onMouseLeave={e=>e.currentTarget.style.background=A}>
                Book {active.name.split(" ")[0]} →
              </button>
              {list.length > 1 && (
                <button onClick={()=>setSel(i=>(i+1)%list.length)}
                  style={{ padding:"15px 18px", background:"transparent",
                    border:`1px solid rgba(255,255,255,0.12)`, color:"#a1a1aa",
                    ...M, fontSize:10, letterSpacing:"0.2em", textTransform:"uppercase",
                    cursor:"pointer", transition:"all 0.2s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=`${A}44`;e.currentTarget.style.color=A;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.12)";e.currentTarget.style.color="#a1a1aa";}}>
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  HOME PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const router   = useRouter();
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
  const [statsVis,   setStatsVis]   = useState(false);
  const statsRef = useRef(null);

  useEffect(()=>{
    const t=()=>setTime(new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true}));
    t(); const id=setInterval(t,1000); return()=>clearInterval(id);
  },[]);

  const checkAuth=useCallback(()=>{
    const tok=localStorage.getItem("access");
    if(!tok){setIsLoggedIn(false);setIsStaff(false);setAuthReady(true);return;}
    try{
      const p=JSON.parse(atob(tok.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
      if(p.exp&&p.exp*1000<Date.now()){
        const ref=localStorage.getItem("refresh");
        if(!ref){localStorage.removeItem("access");setIsLoggedIn(false);setIsStaff(false);setAuthReady(true);return;}
        fetch(`${process.env.NEXT_PUBLIC_API_URL||"https://api.headzupp.com"}/api/token/refresh/`,{
          method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refresh:ref})
        }).then(r=>r.ok?r.json():null).then(d=>{
          if(d?.access){
            localStorage.setItem("access",d.access);
            if(d.refresh)localStorage.setItem("refresh",d.refresh);
            const np=JSON.parse(atob(d.access.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
            setIsLoggedIn(true);setIsStaff(!!np.is_staff);
          }else{localStorage.removeItem("access");localStorage.removeItem("refresh");setIsLoggedIn(false);setIsStaff(false);}
        }).catch(()=>{setIsLoggedIn(false);setIsStaff(false);}).finally(()=>setAuthReady(true));
        return;
      }
      setIsLoggedIn(true);setIsStaff(!!p.is_staff);
    }catch{setIsLoggedIn(false);setIsStaff(false);}
    setAuthReady(true);
  },[]);

  useEffect(()=>{checkAuth();window.addEventListener("focus",checkAuth);return()=>window.removeEventListener("focus",checkAuth);},[checkAuth]);

  useEffect(()=>{
    fetch(`${process.env.NEXT_PUBLIC_API_URL||"https://api.headzupp.com"}/api/barbers/`,{
      headers:localStorage.getItem("access")?{Authorization:`Bearer ${localStorage.getItem("access")}`}:{},
      signal:AbortSignal.timeout?.(10000)
    }).then(r=>r.json()).then(d=>setBarbers(Array.isArray(d)?d:d.results||[])).catch(()=>{});
  },[]);

  useEffect(()=>{
    const fn=()=>setScrollY(window.scrollY);
    window.addEventListener("scroll",fn,{passive:true});
    return()=>window.removeEventListener("scroll",fn);
  },[]);

  useEffect(()=>{
    if(!ready)return;
    const io=new IntersectionObserver(e=>{
      e.forEach(x=>{if(x.isIntersecting)setRevealed(p=>({...p,[x.target.dataset.id]:true}));});
    },{threshold:0.1});
    document.querySelectorAll("[data-id]").forEach(el=>io.observe(el));
    return()=>io.disconnect();
  },[ready]);

  useEffect(()=>{
    const t=setInterval(()=>setRevIdx(i=>(i+1)%REVIEWS.length),6500);
    return()=>clearInterval(t);
  },[]);

  useEffect(()=>{if(ready)setTimeout(()=>setHeroIn(true),80);},[ready]);

  // Stats float-in observer
  useEffect(()=>{
    if(!statsRef.current)return;
    const io=new IntersectionObserver(([e])=>{if(e.isIntersecting)setStatsVis(true);},{threshold:0.3});
    io.observe(statsRef.current);
    return()=>io.disconnect();
  },[ready]);

  const Rv=(id)=>!!revealed[id];
  const book=(e)=>{e.preventDefault();router.push(localStorage.getItem("access")?"/book":"/login");};

  return (
    <>
      {!ready && <LoadingScreen onComplete={()=>setReady(true)}/>}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        body{background:#050505;color:white;overflow-x:hidden;}

        /* Noise texture overlay */
        body::before {
          content:"";
          position:fixed;inset:0;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
          opacity:0.018;
          pointer-events:none;
          z-index:9999;
          mix-blend-mode:overlay;
        }

        /* Barber pole stripe — left edge signature */
        body::after {
          content:"";
          position:fixed;left:0;top:0;bottom:0;width:5px;
          background:repeating-linear-gradient(
            -45deg,
            #ef4444 0px,#ef4444 6px,
            #ffffff 6px,#ffffff 12px,
            #f59e0b 12px,#f59e0b 18px,
            #000 18px,#000 24px
          );
          opacity:0.5;
          z-index:9998;
          pointer-events:none;
        }

        @keyframes glow-green { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)} 50%{box-shadow:0 0 0 9px rgba(34,197,94,0)} }
        @keyframes scandown { from{top:-1px} to{top:101%} }
        @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes menuSlide { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
        @keyframes floatUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:none} }
        @keyframes statPop { from{opacity:0;transform:translateY(24px) scale(0.92)} to{opacity:1;transform:none} }
        @keyframes shimmer { from{transform:translateX(-100%)} to{transform:translateX(200%)} }
        @keyframes pulseBorder { 0%,100%{border-color:rgba(245,158,11,0.2)} 50%{border-color:rgba(245,158,11,0.5)} }

        .ticker-w { animation:ticker 34s linear infinite;display:flex;width:max-content; }
        .ticker-w:hover { animation-play-state:paused; }

        /* Service row */
        .srow { cursor:pointer;transition:padding-left 0.22s,border-color 0.2s,background 0.2s; }
        .srow:hover { padding-left:20px!important;border-color:rgba(245,158,11,0.28)!important;background:rgba(245,158,11,0.025)!important; }

        /* Reveal animation */
        .rv { opacity:0;transform:translateY(28px);transition:opacity 0.9s cubic-bezier(0.16,1,0.3,1),transform 0.9s cubic-bezier(0.16,1,0.3,1); }
        .rv.on { opacity:1;transform:none; }
        .rv.d1 { transition-delay:0.08s; } .rv.d2 { transition-delay:0.18s; } .rv.d3 { transition-delay:0.28s; }

        /* Primary button shimmer */
        .btn-primary { position:relative;overflow:hidden; }
        .btn-primary::after { content:"";position:absolute;top:0;left:0;width:35%;height:100%;background:linear-gradient(to right,transparent,rgba(255,255,255,0.18),transparent);transform:translateX(-100%);transition:none; }
        .btn-primary:hover::after { transform:translateX(280%);transition:transform 0.5s ease; }

        /* Active glow on important text */
        .highlight { position:relative;display:inline-block; }
        .highlight::after { content:"";position:absolute;bottom:-2px;left:0;right:0;height:2px;background:linear-gradient(to right,#ef4444,#f59e0b);transform:scaleX(0);transform-origin:left;transition:transform 0.4s cubic-bezier(0.16,1,0.3,1); }
        .highlight:hover::after { transform:scaleX(1); }

        /* Mobile responsive */
        .donly { display:flex!important; }
        .monly { display:none!important; }
        @media(max-width:768px){
          .donly{display:none!important;}
          .monly{display:flex!important;}
          body::after{display:none;}
        }

        /* Tap feedback */
        @media(hover:none){ .srow:active{background:rgba(245,158,11,0.06)!important;} }

        /* Stats float card */
        .stat-card-float {
          animation: statPop 0.7s cubic-bezier(0.16,1,0.3,1) both;
        }

        /* Review slide */
        @keyframes revSlide { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:none} }
        .rev-in { animation:revSlide 0.5s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      {/* ── FIXED BG LAYER ── */}
      <div style={{ position:"fixed",inset:0,zIndex:0,pointerEvents:"none",
        backgroundImage:`linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)`,
        backgroundSize:"66px 66px" }}/>
      <div style={{ position:"fixed",top:"-10%",right:"-6%",width:700,height:700,
        background:`radial-gradient(circle,${A}07 0%,transparent 62%)`,pointerEvents:"none",zIndex:0 }}/>
      <div style={{ position:"fixed",bottom:"16%",left:"-9%",width:540,height:540,
        background:`radial-gradient(circle,${A}04 0%,transparent 58%)`,pointerEvents:"none",zIndex:0 }}/>
      <div style={{ position:"fixed",inset:0,zIndex:1,pointerEvents:"none",overflow:"hidden" }}>
        <div style={{ position:"absolute",left:0,right:0,height:1,
          background:`linear-gradient(to right,transparent,${A}20,transparent)`,
          animation:"scandown 9s linear infinite" }}/>
      </div>

      <div style={{ position:"relative",zIndex:10 }}>

        {/* ══════════════════════════════════════════════════════════════
            NAV
        ══════════════════════════════════════════════════════════════ */}
        <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:200,height:58,
          background:scrollY>50?"rgba(3,3,3,0.97)":"transparent",
          backdropFilter:scrollY>50?"blur(20px)":"none",
          borderBottom:scrollY>50?`1px solid rgba(255,255,255,0.06)`:"none",
          transition:"all 0.4s",display:"flex",alignItems:"center" }}>
          <div style={{ width:"100%",maxWidth:1320,margin:"0 auto",
            padding:"0 clamp(18px,5vw,44px)",
            display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <a href="/" style={{ textDecoration:"none",display:"flex",alignItems:"center" }}>
              <img src="/logo1.jpg" alt="HEADZ UP Barbershop"
                style={{ height:36,width:"auto",objectFit:"contain" }}/>
            </a>
            <div className="donly" style={{ display:"flex",gap:32,alignItems:"center" }}>
              {[["#services","Services"],["#barber","Barbers"],["#reviews","Reviews"],["#location","Visit"],["/newsletter","News"]].map(([h,l])=>(
                <a key={l} href={h} style={{ ...M,fontSize:11,color:"#a1a1aa",
                  letterSpacing:"0.28em",textTransform:"uppercase",textDecoration:"none",transition:"color 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.color=A}
                  onMouseLeave={e=>e.currentTarget.style.color="#a1a1aa"}>{l}</a>
              ))}
            </div>
            <div style={{ display:"flex",gap:10,alignItems:"center" }}>
              {authReady && <>
                {isLoggedIn&&isStaff  && <a href="/barber-dashboard" className="donly" style={{ ...D,fontSize:7.5,color:A,border:`1px solid ${A}44`,padding:"8px 16px",letterSpacing:"0.2em",textTransform:"uppercase",textDecoration:"none",clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",transition:"all 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background=`${A}11`} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Dashboard</a>}
                {isLoggedIn&&!isStaff && <a href="/dashboard" className="donly" style={{ ...D,fontSize:7.5,color:A,border:`1px solid ${A}44`,padding:"8px 16px",letterSpacing:"0.2em",textTransform:"uppercase",textDecoration:"none",clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",transition:"all 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background=`${A}11`} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>My Account</a>}
                {!isLoggedIn && <a href="/barber-login" className="donly" style={{ ...D,fontSize:7.5,color:"#a1a1aa",border:"1px solid rgba(255,255,255,0.1)",padding:"8px 16px",letterSpacing:"0.2em",textTransform:"uppercase",textDecoration:"none",transition:"all 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.color=A;e.currentTarget.style.borderColor=`${A}44`;}} onMouseLeave={e=>{e.currentTarget.style.color="#a1a1aa";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}>Barbers</a>}
              </>}
              <a href="/book" onClick={book} className="btn-primary donly"
                style={{ ...D,fontSize:7.5,fontWeight:700,color:"black",background:A,
                  padding:"10px 22px",letterSpacing:"0.22em",textTransform:"uppercase",
                  textDecoration:"none",display:"inline-flex",alignItems:"center",
                  clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                  transition:"background 0.22s" }}
                onMouseEnter={e=>e.currentTarget.style.background="white"}
                onMouseLeave={e=>e.currentTarget.style.background=A}>Book Now</a>
              <button onClick={()=>setMenuOpen(o=>!o)} className="monly"
                style={{ display:"flex",flexDirection:"column",gap:5,width:44,height:44,
                  alignItems:"center",justifyContent:"center",background:"none",border:"none",padding:8 }}>
                {[{r:menuOpen?"rotate(45deg) translate(4.5px,4.5px)":"none"},{op:menuOpen?0:1},{r:menuOpen?"rotate(-45deg) translate(4.5px,-4.5px)":"none"}].map((s,i)=>(
                  <span key={i} style={{ display:"block",width:20,height:1.5,
                    background:menuOpen?A:"white",transition:"all 0.28s",
                    transform:s.r||"none",opacity:s.op??1 }}/>
                ))}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ position:"fixed",top:58,left:0,right:0,zIndex:199,
            background:"rgba(3,3,3,0.98)",backdropFilter:"blur(24px)",
            borderBottom:`1px solid rgba(255,255,255,0.07)`,
            animation:"menuSlide 0.25s ease both",padding:"20px clamp(18px,5vw,24px)" }}>
            {[["#services","Services"],["#barber","Barbers"],["#reviews","Reviews"],["#location","Visit"],["/newsletter","News"],
              ...(authReady&&isLoggedIn&&isStaff?[["/barber-dashboard","My Dashboard"]]
                :authReady&&isLoggedIn?[["/dashboard","My Account"]]
                :[["/login","Log In"],["/barber-login","Barber Portal"]])
            ].map(([h,l])=>(
              <a key={l} href={h} onClick={()=>setMenuOpen(false)}
                style={{ display:"block",...M,fontSize:12,color:"#a1a1aa",
                  letterSpacing:"0.3em",textTransform:"uppercase",padding:"14px 0",
                  borderBottom:"1px solid rgba(255,255,255,0.04)",textDecoration:"none" }}>{l}</a>
            ))}
            <div style={{ paddingTop:20 }}>
              <a href="/book" onClick={(e)=>{setMenuOpen(false);book(e);}}
                className="btn-primary"
                style={{ display:"block",textAlign:"center",...D,fontSize:8,fontWeight:700,
                  color:"black",background:A,padding:"16px 24px",letterSpacing:"0.22em",
                  textTransform:"uppercase",textDecoration:"none",
                  clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))" }}>
                Book Your Cut →
              </a>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            HERO — with stats floating OVER the bottom edge
        ══════════════════════════════════════════════════════════════ */}
        <section style={{ position:"relative", minHeight:isMobile?"90vh":"100vh",
          display:"flex", flexDirection:"column", justifyContent:"flex-end",
          overflow:"visible", /* IMPORTANT - lets stats float out */
          paddingBottom: isMobile ? 80 : 120,
          background:"#050505" }}>

          {/* Hero background layers */}
          <div style={{ position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden" }}>
            {/* Diagonal red panel */}
            {!isMobile && (
              <div style={{ position:"absolute",top:0,bottom:0,right:0,width:"38%",
                background:`linear-gradient(135deg,transparent 0%,${R}05 100%)`,
                borderLeft:`1px solid ${R}18`,
                clipPath:"polygon(15% 0,100% 0,100% 100%,0 100%)" }}/>
            )}
            {/* Slash accent */}
            <div style={{ position:"absolute",top:0,bottom:0,left:"62%",width:3,
              background:`linear-gradient(to bottom,transparent,${R}33,${A}22,transparent)`,
              transform:"skewX(8deg)" }}/>
            {/* Giant editorial 01 */}
            <div style={{ position:"absolute",right:"-2%",top:"4%",...D,
              fontSize:"clamp(16rem,34vw,32rem)",fontWeight:900,lineHeight:1,
              color:"transparent",WebkitTextStroke:"1px rgba(255,255,255,0.022)",
              userSelect:"none",pointerEvents:"none",letterSpacing:"-0.06em" }}>01</div>
            {/* Barber pole stripe — right edge */}
            {!isMobile && (
              <div style={{ position:"absolute",right:0,top:0,bottom:0,width:6,
                background:"repeating-linear-gradient(-45deg,#ef4444 0px,#ef4444 6px,#fff 6px,#fff 12px,#f59e0b 12px,#f59e0b 18px,#000 18px,#000 24px)",
                opacity:0.3 }}/>
            )}
            {/* Vertical text label */}
            {!isMobile && (
              <div style={{ position:"absolute",left:16,top:"50%",
                transform:"translateY(-50%) rotate(-90deg)",transformOrigin:"center",
                ...M,fontSize:8,letterSpacing:"0.6em",color:"#3f3f46",
                textTransform:"uppercase",whiteSpace:"nowrap" }}>
                Hattiesburg, Mississippi — Est. 2020
              </div>
            )}
          </div>

          {/* Scan line */}
          <div style={{ position:"absolute",top:0,left:0,right:0,height:1,zIndex:2,pointerEvents:"none",
            background:`linear-gradient(to right,transparent,${A}20,transparent)`,
            animation:"scandown 9s linear infinite" }}/>

          {/* Clock — top right */}
          <div style={{ position:"absolute",top:72,right:"clamp(18px,5vw,44px)",zIndex:2,
            ...M,fontSize:11,color:"#a1a1aa",letterSpacing:"0.28em",opacity:heroIn?1:0,
            transition:"opacity 1s ease 1.2s" }}>{time}</div>

          {/* HERO CONTENT */}
          <div style={{ position:"relative",zIndex:2,maxWidth:1320,margin:"0 auto",
            width:"100%",padding:`${isMobile?0:0}px clamp(18px,5vw,44px) 0`,
            paddingTop:isMobile?82:120 }}>

            {/* Status badge */}
            <div style={{ display:"flex",alignItems:"center",gap:0,
              marginBottom:isMobile?22:30,
              opacity:heroIn?1:0,transform:heroIn?"none":"translateY(16px)",
              transition:"all 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s" }}>
              <div style={{ width:7,height:7,background:"#22c55e",borderRadius:"50%",
                animation:"glow-green 2.5s infinite",flexShrink:0,marginRight:10 }}/>
              <div style={{ background:"#22c55e",padding:"4px 14px 4px 10px",
                clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",
                marginRight:10 }}>
                <span style={{ ...M,fontSize:7,color:"black",letterSpacing:"0.4em",
                  textTransform:"uppercase",fontWeight:500 }}>OPEN</span>
              </div>
              <span style={{ ...M,fontSize:10,color:"#4ade80",
                letterSpacing:isMobile?"0.14em":"0.36em",textTransform:"uppercase" }}>
                Accepting Clients Now
              </span>
              {!isMobile && (
                <>
                  <div style={{ flex:1,height:1,
                    background:`linear-gradient(to right,rgba(34,197,94,0.3),transparent)`,
                    maxWidth:180,marginLeft:16 }}/>
                  <span style={{ ...M,fontSize:9,color:"#a1a1aa",letterSpacing:"0.2em" }}>
                    2509 W 4th St · Hattiesburg MS
                  </span>
                </>
              )}
            </div>

            {/* Logo */}
            <div style={{ marginBottom:isMobile?28:40,
              opacity:heroIn?1:0,transform:heroIn?"none":"translateY(20px)",
              transition:"all 1s cubic-bezier(0.16,1,0.3,1) 0.08s",
              position:"relative",display:"inline-block" }}>
              <div style={{ position:"absolute",inset:"-12px -16px",
                background:"radial-gradient(ellipse,rgba(245,158,11,0.1) 0%,transparent 70%)",
                pointerEvents:"none",zIndex:0 }}/>
              <div style={{ position:"absolute",top:0,right:0,width:18,height:18,
                borderTop:`2px solid ${R}`,borderRight:`2px solid ${R}`,zIndex:2,pointerEvents:"none" }}/>
              <div style={{ position:"absolute",bottom:0,left:0,width:18,height:18,
                borderBottom:`2px solid ${A}`,borderLeft:`2px solid ${A}`,zIndex:2,pointerEvents:"none" }}/>
              <div style={{ position:"relative",zIndex:1,
                clipPath:"polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,14px 100%,0 calc(100% - 14px))",
                border:`1px solid ${A}25`,overflow:"hidden",display:"inline-block" }}>
                <img src="/logo1.jpg" alt="HEADZ UP Barbershop"
                  style={{ width:isMobile?"190px":"300px",height:"auto",display:"block",
                    objectFit:"contain",filter:"brightness(0.92) contrast(1.05) saturate(1.1)",
                    mixBlendMode:"luminosity" }}/>
                <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"35%",
                  background:"linear-gradient(to top,rgba(3,3,3,0.85),transparent)",
                  pointerEvents:"none" }}/>
                <div style={{ position:"absolute",inset:0,
                  backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.05) 3px,rgba(0,0,0,0.05) 4px)",
                  pointerEvents:"none",zIndex:1 }}/>
              </div>
            </div>

            {/* Headline — rubber hose thick stacked words */}
            <div style={{ marginBottom:isMobile?28:36 }}>
              {[
                {t:"Where",  d:"0.16s", am:false, it:false, offset: 0},
                {t:"Every",  d:"0.24s", am:false, it:false, offset: isMobile?0:12},
                {t:"Cut",    d:"0.32s", am:false, it:false, offset: 0},
                {t:"Tells",  d:"0.40s", am:false, it:false, offset: isMobile?0:8},
                {t:"A Story.",d:"0.50s",am:true,  it:true,  offset: isMobile?0:-6},
              ].map(({t,d,am,it,offset})=>(
                <h1 key={t} style={{ ...D,
                  fontSize:"clamp(2.6rem,7.8vw,7.2rem)",
                  fontWeight:900,textTransform:"uppercase",
                  lineHeight:isMobile?1.05:0.88,letterSpacing:"-0.04em",
                  color:am?A:"white",fontStyle:it?"italic":"normal",
                  marginLeft:offset,
                  opacity:heroIn?1:0,
                  transform:heroIn?"none":"translateY(30px)",
                  transition:`opacity 1s cubic-bezier(0.16,1,0.3,1) ${d},transform 1s cubic-bezier(0.16,1,0.3,1) ${d}`,
                  margin:`0 0 0 ${offset}px`,
                }}>{t}</h1>
              ))}
            </div>

            {/* Sub + CTA — asymmetric */}
            <div style={{ display:"flex",gap:isMobile?18:36,alignItems:"flex-end",
              flexWrap:"wrap",marginBottom:isMobile?0:8,
              opacity:heroIn?1:0,transform:heroIn?"none":"translateY(16px)",
              transition:"all 0.9s cubic-bezier(0.16,1,0.3,1) 0.64s",
              marginLeft:isMobile?0:4 /* subtle asymmetric offset */ }}>
              <p style={{ ...M,fontSize:"clamp(12px,1.3vw,13px)",color:"#71717a",
                lineHeight:1.8,maxWidth:360,flex:1,minWidth:isMobile?"100%":"220px" }}>
                Hattiesburg's premier shop. We craft confidence — every client, every time.
              </p>
              {/* Primary CTA — bold thick strong */}
              <a href="/book" onClick={book} className="btn-primary"
                style={{ ...D,fontSize:9,fontWeight:700,color:"black",background:A,
                  padding:"18px 36px",letterSpacing:"0.22em",textTransform:"uppercase",
                  textDecoration:"none",display:"inline-flex",alignItems:"center",
                  gap:10,flexShrink:0,
                  clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                  transition:"background 0.22s",
                  boxShadow:`0 8px 32px ${A}30`,
                  transform:"translateX(-8px)", /* controlled asymmetry */
                }}
                onMouseEnter={e=>{e.currentTarget.style.background="white";e.currentTarget.style.boxShadow="0 12px 40px rgba(255,255,255,0.25)";}}
                onMouseLeave={e=>{e.currentTarget.style.background=A;e.currentTarget.style.boxShadow=`0 8px 32px ${A}30`;}}>
                <span>Book Your Cut</span>
                <span style={{ fontSize:16,marginTop:1 }}>→</span>
              </a>
            </div>
          </div>

          {/* ── STATS CARD — floats OVER hero bottom edge ── */}
          <div ref={statsRef} style={{
            position:"absolute",
            bottom: isMobile ? -60 : -48,
            left: isMobile ? 20 : "clamp(18px,5vw,44px)",
            right: isMobile ? 20 : "clamp(18px,5vw,44px)",
            maxWidth: 860,
            zIndex: 20,
          }}>
            <div style={{
              background:"rgba(8,8,8,0.97)",
              border:`1px solid rgba(245,158,11,0.2)`,
              backdropFilter:"blur(24px)",
              clipPath:"polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))",
              display:"flex",
              flexWrap:"nowrap",
              overflow:"hidden",
              boxShadow:`0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px ${A}15`,
              animation: statsVis ? "pulseBorder 3s ease infinite" : "none",
            }}>
              {/* Left amber accent bar */}
              <div style={{ width:4, background:`linear-gradient(to bottom,${R},${A})`, flexShrink:0 }}/>

              {[
                {n:"5.0★",l:"Rating",     s:"Google"},
                {n:"11",  l:"Services",   s:"Every style"},
                {n:"100+",l:"Clients",    s:"& counting"},
                {n:"24/7",l:"Book Online",s:"Anytime"},
              ].map(({n,l,s},i)=>(
                <div key={l} className={statsVis?"stat-card-float":""}
                  style={{ flex:1, padding:isMobile?"14px 12px":"20px 20px",
                    borderLeft:i>0?`1px solid rgba(255,255,255,0.05)`:"none",
                    animationDelay:`${i*0.08}s`,
                    position:"relative", overflow:"hidden" }}>
                  {/* Shimmer */}
                  <div style={{ position:"absolute",top:0,left:"-35%",width:"35%",
                    height:"100%",background:"linear-gradient(to right,transparent,rgba(255,255,255,0.025),transparent)",
                    animation:statsVis?`shimmer ${3+i*0.4}s ease-in-out infinite ${i*0.5}s`:"none" }}/>
                  <p style={{ ...D,fontSize:isMobile?"clamp(1.1rem,4vw,1.6rem)":"clamp(1.3rem,2.6vw,2rem)",
                    fontWeight:900,color:A,lineHeight:1,marginBottom:4 }}>{n}</p>
                  <p style={{ ...M,fontSize:isMobile?9:10,color:"white",
                    letterSpacing:"0.1em",marginBottom:2,textTransform:"uppercase" }}>{l}</p>
                  <p style={{ ...M,fontSize:8,color:"#52525b",
                    letterSpacing:"0.2em",textTransform:"uppercase" }}>{s}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SPACER for floating stats card */}
        <div style={{ height: isMobile ? 80 : 68, background:"#050505" }}/>

        {/* ══════════════════════════════════════════════════════════════
            TICKER BAND
        ══════════════════════════════════════════════════════════════ */}
        <div style={{ borderTop:`1px solid ${R}22`,borderBottom:`1px solid ${R}22`,
          background:`${R}06`,overflow:"hidden",padding:"10px 0",position:"relative" }}>
          <div className="ticker-w">
            {[...TICKER,...TICKER].map((t,i)=>(
              <span key={i} style={{ ...M,fontSize:9,color:`${R}77`,
                letterSpacing:"0.5em",textTransform:"uppercase",padding:"0 28px",flexShrink:0 }}>✦ {t}</span>
            ))}
          </div>
        </div>

        {/* CUSTOM DIVIDER */}
        <div style={{ padding:"0 clamp(18px,5vw,44px)", marginTop:8 }}>
          <ScissorDivider/>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            GALLERY
        ══════════════════════════════════════════════════════════════ */}
        <section style={{ paddingBottom:isMobile?0:0 }}>
          <div style={{ maxWidth:1320,margin:"0 auto",padding:isMobile?"0 0 40px":"0 0 56px" }}>
            <div data-id="gal" className={`rv${Rv("gal")?" on":""}`}
              style={{ padding:"0 clamp(18px,5vw,44px)", marginBottom:isMobile?16:24 }}>
              <SectionStamp left="THE" right="GALLERY" sub="Our work"/>
            </div>
            <GalleryGrid isMobile={isMobile}/>
          </div>
        </section>

        {/* CUSTOM DIVIDER */}
        <div style={{ padding:"0 clamp(18px,5vw,44px)", marginBottom:8 }}>
          <ScissorDivider flip/>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            SERVICES
        ══════════════════════════════════════════════════════════════ */}
        <section id="services" style={{ padding:isMobile?"48px 20px":"clamp(48px,8vw,100px) clamp(18px,5vw,44px)" }}>
          <div style={{ maxWidth:1320,margin:"0 auto" }}>

            <div data-id="s1" className={`rv${Rv("s1")?" on":""}`} style={{ marginBottom:isMobile?28:52 }}>
              <SectionStamp left="THE" right="MENU" sub={`${SERVICES.length} services`}/>
            </div>

            {/* Two-col header — asymmetric */}
            <div style={{ display:"grid",
              gridTemplateColumns:isMobile?"1fr":"1fr 1fr",
              gap:isMobile?20:80,alignItems:"start",marginBottom:36 }}>
              <div data-id="s2" className={`rv${Rv("s2")?" on":""}`}>
                <h2 style={{ ...D,fontSize:"clamp(1.9rem,4.8vw,4rem)",fontWeight:900,
                  lineHeight:isMobile?1.06:0.88,letterSpacing:"-0.04em",textTransform:"uppercase" }}>
                  The<br/>
                  <span style={{ WebkitTextStroke:"1px rgba(255,255,255,0.12)",color:"transparent" }}>Full</span><br/>
                  <span style={{ color:A,fontStyle:"italic" }}>Menu_</span>
                </h2>
              </div>
              <div data-id="s3" className={`rv d1${Rv("s3")?" on":""}`}
                style={{ paddingTop:isMobile?0:10, marginLeft:isMobile?0:-8 /* asymmetric */ }}>
                <p style={{ ...M,fontSize:13,color:"#71717a",lineHeight:1.85,marginBottom:24 }}>
                  From a quick lineup to the full cut and shave —<br/>
                  <span style={{ color:"#a1a1aa" }}>obsessive precision on every service.</span>
                </p>
                <a href="/book" onClick={book} className="btn-primary"
                  style={{ ...D,fontSize:8,fontWeight:700,color:"black",background:A,
                    padding:"14px 28px",letterSpacing:"0.2em",textTransform:"uppercase",
                    textDecoration:"none",display:"inline-flex",alignItems:"center",
                    clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                    transition:"background 0.22s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="white"}
                  onMouseLeave={e=>e.currentTarget.style.background=A}>
                  Book Any Service →
                </a>
              </div>
            </div>

            {/* Service list */}
            <div data-id="s4" className={`rv${Rv("s4")?" on":""}`}
              style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
              {SERVICES.map((svc,i)=>(
                <div key={svc.name} className="srow" onClick={book}
                  onMouseEnter={()=>setHovSvc(svc.name)} onMouseLeave={()=>setHovSvc(null)}
                  style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"17px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",gap:12 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:14,flex:1,minWidth:0 }}>
                    <span style={{ ...M,fontSize:9,color:hovSvc===svc.name?A:"#3f3f46",
                      minWidth:28,transition:"color 0.2s" }}>{String(i+1).padStart(2,"0")}</span>
                    <span style={{ ...D,fontSize:"clamp(8px,1.2vw,11px)",textTransform:"uppercase",
                      fontWeight:700,color:hovSvc===svc.name?"white":"#a1a1aa",
                      transition:"color 0.2s",overflow:"hidden",textOverflow:"ellipsis",
                      whiteSpace:"nowrap" }}>{svc.name}</span>
                    {svc.pop && (
                      <span style={{ ...M,fontSize:7,color:"black",background:A,
                        padding:"2px 8px",flexShrink:0,letterSpacing:"0.2em",
                        textTransform:"uppercase",
                        clipPath:"polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px))" }}>
                        Popular
                      </span>
                    )}
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:20,flexShrink:0 }}>
                    <span style={{ ...M,fontSize:10,color:"#52525b" }}>{svc.dur}</span>
                    <span style={{ ...D,fontSize:"clamp(12px,1.9vw,20px)",fontWeight:900,
                      color:hovSvc===svc.name?A:"white",transition:"color 0.2s",
                      minWidth:40,textAlign:"right" }}>${svc.price}</span>
                    <span style={{ fontSize:12,opacity:hovSvc===svc.name?1:0,color:A,
                      transform:hovSvc===svc.name?"translateX(0)":"translateX(-6px)",
                      transition:"all 0.2s" }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            BARBER SELECT — persona style
        ══════════════════════════════════════════════════════════════ */}
        <PersonaSelect barbers={barbers} book={book} isMobile={isMobile}/>

        {/* ══════════════════════════════════════════════════════════════
            REVIEWS — asymmetric layout
        ══════════════════════════════════════════════════════════════ */}
        <section id="reviews" style={{ padding:isMobile?"48px 20px":"clamp(48px,8vw,100px) clamp(18px,5vw,44px)" }}>
          <div style={{ maxWidth:1320,margin:"0 auto" }}>
            <div data-id="r1" className={`rv${Rv("r1")?" on":""}`} style={{ marginBottom:isMobile?28:52 }}>
              <SectionStamp left="CLIENT" right="REVIEWS" sub={`${REVIEWS.length} testimonials`}/>
            </div>

            {/* Two-column: left active review + right stack */}
            <div style={{ display:"grid",
              gridTemplateColumns:isMobile?"1fr":"1.4fr 1fr",
              gap:isMobile?20:52, alignItems:"start" }}>

              {/* Active review — large */}
              <div data-id="r2" className={`rv${Rv("r2")?" on":""}`}>
                <div className="rev-in" key={revIdx}
                  style={{ background:"rgba(8,8,8,0.8)",
                    border:`1px solid rgba(255,255,255,0.07)`,
                    padding:isMobile?"24px 20px":"36px 32px",
                    position:"relative",overflow:"hidden",
                    clipPath:"polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,18px 100%,0 calc(100% - 18px))" }}>
                  {/* Accent bar */}
                  <div style={{ position:"absolute",top:0,left:0,right:0,height:3,
                    background:`linear-gradient(to right,${R},${A})` }}/>
                  {/* Barber pole corner mark */}
                  <div style={{ position:"absolute",top:0,right:0,width:32,height:32,overflow:"hidden" }}>
                    <div style={{ position:"absolute",top:0,right:0,width:48,height:48,
                      background:"repeating-linear-gradient(-45deg,#ef4444 0px,#ef4444 4px,#fff 4px,#fff 8px,#f59e0b 8px,#f59e0b 12px,#000 12px,#000 16px)",
                      opacity:0.25 }}/>
                  </div>
                  {/* Quote marks */}
                  <div style={{ ...D,fontSize:isMobile?48:72,color:`${A}12`,
                    lineHeight:0.8,marginBottom:12,fontWeight:900 }}>"</div>
                  <p style={{ ...M,fontSize:isMobile?13:15,color:"#d4d4d4",
                    lineHeight:1.85,marginBottom:24,fontStyle:"italic" }}>
                    {REVIEWS[revIdx].q}
                  </p>
                  <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:36,height:36,background:`${A}20`,
                      border:`1px solid ${A}30`,display:"flex",alignItems:"center",
                      justifyContent:"center",flexShrink:0,
                      clipPath:"polygon(0 0,calc(100% - 4px) 0,100% 4px,100% 100%,4px 100%,0 calc(100% - 4px))" }}>
                      <span style={{ ...D,fontSize:13,fontWeight:900,color:A }}>
                        {REVIEWS[revIdx].name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p style={{ ...D,fontSize:8,fontWeight:700,textTransform:"uppercase",
                        letterSpacing:"0.1em",color:"white" }}>{REVIEWS[revIdx].name}</p>
                      <p style={{ ...M,fontSize:9,color:"#52525b",letterSpacing:"0.2em" }}>
                        {REVIEWS[revIdx].city}
                      </p>
                    </div>
                    <div style={{ marginLeft:"auto",display:"flex",gap:2 }}>
                      {[1,2,3,4,5].map(s=>(
                        <span key={s} style={{ color:A,fontSize:12 }}>★</span>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Navigation dots */}
                <div style={{ display:"flex",gap:6,marginTop:16,paddingLeft:4 }}>
                  {REVIEWS.map((_,i)=>(
                    <button key={i} onClick={()=>setRevIdx(i)}
                      style={{ width:i===revIdx?24:6,height:6,
                        background:i===revIdx?A:"rgba(255,255,255,0.1)",
                        border:"none",cursor:"pointer",
                        clipPath:"polygon(0 0,calc(100% - 2px) 0,100% 2px,100% 100%,2px 100%,0 calc(100% - 2px))",
                        transition:"width 0.3s,background 0.3s" }}/>
                  ))}
                </div>
              </div>

              {/* Right: other reviews stacked */}
              <div data-id="r3" className={`rv d1${Rv("r3")?" on":""}`}
                style={{ display:"flex",flexDirection:"column",gap:10,
                  marginTop:isMobile?0:8 /* slight offset = asymmetry */ }}>
                {REVIEWS.filter((_,i)=>i!==revIdx).map((r,i)=>(
                  <div key={i} onClick={()=>setRevIdx(REVIEWS.indexOf(r))}
                    style={{ background:"rgba(8,8,8,0.5)",
                      border:`1px solid rgba(255,255,255,0.04)`,
                      padding:"16px 18px",cursor:"pointer",
                      transition:"border-color 0.2s,background 0.2s",
                      clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))" }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=`${A}30`;e.currentTarget.style.background="rgba(8,8,8,0.8)";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.04)";e.currentTarget.style.background="rgba(8,8,8,0.5)";}}>
                    <p style={{ ...M,fontSize:11,color:"#71717a",lineHeight:1.7,
                      marginBottom:10,fontStyle:"italic",
                      overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,
                      WebkitBoxOrient:"vertical" }}>
                      "{r.q}"
                    </p>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                      <p style={{ ...D,fontSize:7.5,color:"#a1a1aa",
                        textTransform:"uppercase",letterSpacing:"0.1em" }}>{r.name}</p>
                      <div style={{ display:"flex",gap:1 }}>
                        {[1,2,3,4,5].map(s=>(
                          <span key={s} style={{ color:A,fontSize:9,opacity:0.7 }}>★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* CTA pill inside review section */}
                <div style={{ marginTop:8, padding:"16px 18px",
                  background:`${A}08`, border:`1px solid ${A}20`,
                  clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))" }}>
                  <p style={{ ...M,fontSize:11,color:"#71717a",marginBottom:12,lineHeight:1.7 }}>
                    Join hundreds of satisfied clients.
                  </p>
                  <a href="/book" onClick={book}
                    style={{ ...D,fontSize:7.5,fontWeight:700,color:"black",background:A,
                      padding:"10px 20px",letterSpacing:"0.2em",textTransform:"uppercase",
                      textDecoration:"none",display:"inline-flex",alignItems:"center",
                      clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",
                      transition:"background 0.2s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="white"}
                    onMouseLeave={e=>e.currentTarget.style.background=A}>
                    Book Now →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CUSTOM DIVIDER */}
        <div style={{ padding:"0 clamp(18px,5vw,44px)", margin:"8px 0" }}>
          <ScissorDivider/>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            LOCATION
        ══════════════════════════════════════════════════════════════ */}
        <section id="location" style={{ padding:isMobile?"48px 20px":"clamp(48px,8vw,100px) clamp(18px,5vw,44px)" }}>
          <div style={{ maxWidth:1320,margin:"0 auto" }}>
            <div data-id="l1" className={`rv${Rv("l1")?" on":""}`} style={{ marginBottom:isMobile?28:52 }}>
              <SectionStamp left="FIND" right="US" sub="2509 W 4th St"/>
            </div>
            <div style={{ display:"grid",
              gridTemplateColumns:isMobile?"1fr":"1fr 1fr",
              gap:isMobile?24:80, alignItems:"center" }}>
              <div data-id="l2" className={`rv${Rv("l2")?" on":""}`}>
                <h2 style={{ ...D,fontSize:"clamp(1.9rem,4.5vw,3.8rem)",fontWeight:900,
                  lineHeight:isMobile?1.06:0.88,letterSpacing:"-0.04em",
                  textTransform:"uppercase",marginBottom:32 }}>
                  Come<br/>
                  <span style={{ WebkitTextStroke:"1px rgba(255,255,255,0.12)",color:"transparent" }}>See</span><br/>
                  <span style={{ color:A,fontStyle:"italic" }}>Us_</span>
                </h2>
                <div style={{ display:"flex",flexDirection:"column",gap:14,marginBottom:32 }}>
                  {[
                    ["📍","Address","2509 W 4th St, Hattiesburg, MS 39401"],
                    ["🕐","Mon – Fri","9:00 AM – 6:00 PM"],
                    ["✂️","Saturday","9:00 AM – 4:00 PM"],
                    ["🚫","Sunday","Closed"],
                  ].map(([ic,l,v])=>(
                    <div key={l} style={{ display:"flex",gap:14,alignItems:"flex-start",
                      paddingBottom:14,borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize:15,flexShrink:0,marginTop:2 }}>{ic}</span>
                      <div>
                        <p style={{ ...M,fontSize:9,color:"#52525b",letterSpacing:"0.4em",
                          textTransform:"uppercase",marginBottom:3 }}>{l}</p>
                        <p style={{ ...M,fontSize:13,color:"#d4d4d4",lineHeight:1.5 }}>{v}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Primary CTA */}
                <a href="/book" onClick={book} className="btn-primary"
                  style={{ ...D,fontSize:8.5,fontWeight:700,color:"black",background:A,
                    padding:"17px 32px",letterSpacing:"0.22em",textTransform:"uppercase",
                    textDecoration:"none",display:"inline-flex",alignItems:"center",
                    clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                    transition:"background 0.22s",transform:"translateX(-4px)" }}
                  onMouseEnter={e=>e.currentTarget.style.background="white"}
                  onMouseLeave={e=>e.currentTarget.style.background=A}>
                  Lock In Your Spot →
                </a>
              </div>
              <div data-id="l3" className={`rv d2${Rv("l3")?" on":""}`}>
                <div style={{ background:"#080808",border:`1px solid rgba(255,255,255,0.06)`,
                  position:"relative",overflow:"hidden",minHeight:340,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  clipPath:"polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px))" }}>
                  <div style={{ position:"absolute",inset:0,
                    backgroundImage:`linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)`,
                    backgroundSize:"34px 34px" }}/>
                  {/* Barber pole corner */}
                  <div style={{ position:"absolute",top:0,right:0,width:48,height:48,overflow:"hidden" }}>
                    <div style={{ position:"absolute",top:0,right:0,width:72,height:72,
                      background:"repeating-linear-gradient(-45deg,#ef4444 0px,#ef4444 5px,#fff 5px,#fff 10px,#f59e0b 10px,#f59e0b 15px,#000 15px,#000 20px)",
                      opacity:0.25 }}/>
                  </div>
                  {[160,240,320].map((sz,i)=>(
                    <div key={sz} style={{ position:"absolute",width:sz,height:sz,
                      border:`1px solid ${A}${Math.round(14-i*4).toString(16).padStart(2,"0")}`,borderRadius:"50%" }}/>
                  ))}
                  <div style={{ position:"relative",zIndex:1,textAlign:"center",padding:"40px 24px" }}>
                    <div style={{ width:52,height:52,background:A,margin:"0 auto 14px",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      boxShadow:`0 0 48px ${A}45`,
                      clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))" }}>
                      <span style={{ fontSize:22 }}>📍</span>
                    </div>
                    <p style={{ ...D,fontSize:9,fontWeight:900,textTransform:"uppercase",
                      color:"white",marginBottom:7 }}>HEADZ UP BARBERSHOP</p>
                    <p style={{ ...M,fontSize:12,color:"#a1a1aa" }}>
                      2509 W 4th St, Hattiesburg MS 39401
                    </p>
                  </div>
                  <p style={{ position:"absolute",bottom:10,right:14,...M,fontSize:9,
                    color:"#3f3f46",letterSpacing:"0.2em" }}>31.3271° N · 89.2903° W</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            CTA BAND — rubber hose red/gold split
        ══════════════════════════════════════════════════════════════ */}
        <section style={{ position:"relative",overflow:"hidden",
          padding:isMobile?"52px 20px":"72px clamp(18px,5vw,44px)" }}>
          {/* Split bg */}
          <div style={{ position:"absolute",inset:0,
            background:`linear-gradient(135deg,${R} 0%,${R} 48%,${A} 48%,${A} 100%)` }}/>
          <div style={{ position:"absolute",top:0,bottom:0,left:"48%",width:3,
            background:"rgba(0,0,0,0.25)",transform:"skewX(-3deg)",zIndex:1 }}/>
          <div style={{ position:"absolute",inset:0,
            backgroundImage:"linear-gradient(rgba(0,0,0,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.06) 1px,transparent 1px)",
            backgroundSize:"42px 42px",pointerEvents:"none" }}/>
          {/* Barber pole top edge */}
          <div style={{ position:"absolute",top:0,left:0,right:0,height:6,
            background:"repeating-linear-gradient(90deg,#ef4444 0px,#ef4444 12px,#fff 12px,#fff 24px,#f59e0b 24px,#f59e0b 36px,#000 36px,#000 48px)",
            opacity:0.5 }}/>

          <div style={{ maxWidth:1320,margin:"0 auto",display:"flex",
            justifyContent:"space-between",alignItems:"center",
            flexWrap:"wrap",gap:24,position:"relative",zIndex:2 }}>
            <h2 style={{ ...D,fontSize:"clamp(1.7rem,4vw,2.9rem)",fontWeight:900,
              lineHeight:0.9,letterSpacing:"-0.04em",color:"black",textTransform:"uppercase",
              transform:"translateX(-4px)" /* asymmetric */ }}>
              Ready To Look<br/>Your Best?
            </h2>
            <div style={{ display:"flex",gap:12,alignItems:"center",flexWrap:"wrap" }}>
              {/* Primary — bold thick strong */}
              <a href="/book" onClick={book} className="btn-primary"
                style={{ ...D,fontSize:9,fontWeight:700,letterSpacing:"0.22em",
                  textTransform:"uppercase",padding:"18px 36px",background:"black",
                  color:"white",textDecoration:"none",
                  clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                  transition:"all 0.25s" }}
                onMouseEnter={e=>{e.currentTarget.style.background="#030303";e.currentTarget.style.color=A;}}
                onMouseLeave={e=>{e.currentTarget.style.background="black";e.currentTarget.style.color="white";}}>
                Book Now →
              </a>
              {/* Secondary — minimal */}
              <a href={`tel:${SHOP_PHONE}`}
                style={{ ...M,fontSize:11,color:"rgba(0,0,0,0.5)",textDecoration:"none",
                  transition:"color 0.2s",letterSpacing:"0.1em" }}
                onMouseEnter={e=>e.currentTarget.style.color="black"}
                onMouseLeave={e=>e.currentTarget.style.color="rgba(0,0,0,0.5)"}>
                or call {SHOP_PHONE_DISPLAY}
              </a>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════════════════════ */}
        <footer style={{ borderTop:"1px solid rgba(255,255,255,0.05)",
          padding:isMobile?"24px 20px":"28px clamp(18px,5vw,44px)",
          position:"relative",overflow:"hidden" }}>
          {/* Barber pole footer accent */}
          <div style={{ position:"absolute",bottom:0,left:0,right:0,height:3,
            background:"repeating-linear-gradient(90deg,#ef4444 0px,#ef4444 8px,#fff 8px,#fff 16px,#f59e0b 16px,#f59e0b 24px,#000 24px,#000 32px)",
            opacity:0.3 }}/>
          <div style={{ maxWidth:1320,margin:"0 auto",display:"flex",
            justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14 }}>
            <p style={{ ...D,fontSize:15,fontWeight:900,letterSpacing:"-0.06em" }}>
              HEADZ<span style={{ color:A,fontStyle:"italic" }}>UP</span>
            </p>
            <p style={{ ...M,fontSize:10,color:"#3f3f46",letterSpacing:"0.3em",
              textTransform:"uppercase" }}>© 2026 · Hattiesburg, MS</p>
            <div style={{ display:"flex",gap:18 }}>
              {[["book","Book",book],["/login","Login",null],["/barber-login","Barbers",null],["/terms","Terms",null]].map(([href,label,fn])=>(
                <a key={label} href={href} onClick={fn||undefined}
                  style={{ ...M,fontSize:10,color:"#52525b",letterSpacing:"0.2em",
                    textTransform:"uppercase",transition:"color 0.2s",textDecoration:"none" }}
                  onMouseEnter={e=>e.currentTarget.style.color=A}
                  onMouseLeave={e=>e.currentTarget.style.color="#52525b"}>{label}</a>
              ))}
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
