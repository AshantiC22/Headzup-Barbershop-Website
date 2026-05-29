"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";

const C_DARK = {
  bg:"#070709", surface:"rgba(255,255,255,0.04)", border:"rgba(255,255,255,0.08)",
  text:"#f1f0ee", sub:"#9ca3af", muted:"#4b5563",
  amber:"#f59e0b", amberDim:"rgba(245,158,11,0.10)", amberBorder:"rgba(245,158,11,0.35)",
};
let C = C_DARK;
const SF   = { fontFamily:"'Syncopate',sans-serif" };
const MONO = { fontFamily:"'DM Mono',monospace" };

// ── Photo data — actual shop photos ───────────────────────────────────────────
// Add more photos by adding entries here. Sizes: big=2x2, tall=1x2, wide=2x1, sm=1x1
// Upload photos to /public/pictures/ and reference them here
const PHOTOS = [
  { id:1,  src:"/pictures/IMG_20260331_115011 (2).jpg", service:"The Fade",  size:"big"  },
  { id:2,  src:"/pictures/IMG_20260331_115011 (3).jpg", service:"Edge Up",   size:"tall" },
  { id:3,  src:"/pictures/IMG_20260331_115011 (4).jpg", service:"Beard",     size:"sm"   },
  { id:4,  src:"/pictures/IMG_20260331_115011 (5).jpg", service:"Kids Cut",  size:"sm"   },
  { id:5,  src:"/pictures/IMG_20260331_115011 (6).jpg", service:"Full Cut",  size:"wide" },
  { id:6,  src:"/pictures/IMG_20260331_115011 (7).jpg", service:"Lineup",    size:"tall" },
  // ── Add more photos below as you get them ────────────────────────────────
  // { id:7, src:"/pictures/your-photo.jpg", service:"Skin Fade", size:"sm" },
];

const SERVICES = ["All", "The Fade", "Edge Up", "Beard", "Kids Cut", "Full Cut", "Lineup"];

// ── Single mosaic tile ─────────────────────────────────────────────────────────
function MosaicTile({ photo, onClick }) {
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState(false);

  const gridStyle = {
    sm:   { gridColumn:"span 1", gridRow:"span 1" },
    tall: { gridColumn:"span 1", gridRow:"span 2" },
    wide: { gridColumn:"span 2", gridRow:"span 1" },
    big:  { gridColumn:"span 2", gridRow:"span 2" },
  }[photo.size] || { gridColumn:"span 1", gridRow:"span 1" };

  return (
    <div onClick={()=>onClick(photo)}
      style={{ ...gridStyle, position:"relative", overflow:"hidden",
        borderRadius:8, cursor:"pointer", background:"rgba(255,255,255,0.04)",
        minHeight: photo.size==="sm"||photo.size==="wide" ? 160 :
                   photo.size==="tall"||photo.size==="big" ? 324 : 160,
      }}
      className="mosaic-tile">
      {/* Placeholder shimmer */}
      {!loaded && !error && (
        <div style={{ position:"absolute", inset:0,
          background:"linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)",
          backgroundSize:"200% 100%", animation:"shimmer 1.4s ease-in-out infinite" }}/>
      )}

      {/* Fallback placeholder when no image yet */}
      {error && (
        <div style={{ position:"absolute", inset:0, display:"flex",
          flexDirection:"column", alignItems:"center", justifyContent:"center",
          gap:8, background:"rgba(245,158,11,0.04)",
          border:"1px dashed rgba(245,158,11,0.2)" }}>
          <span style={{ fontSize:28, opacity:0.4 }}>✂️</span>
          <p style={{ ...MONO, fontSize:9, color:"rgba(245,158,11,0.4)",
            letterSpacing:"0.2em", textTransform:"uppercase", textAlign:"center",
            padding:"0 8px" }}>{photo.service}</p>
        </div>
      )}

      {/* Actual image */}
      {!error && (
        <img src={photo.src} alt={photo.service}
          onLoad={()=>setLoaded(true)}
          onError={()=>setError(true)}
          style={{ width:"100%", height:"100%", objectFit:"cover",
            display:"block", opacity:loaded?1:0,
            transition:"opacity 0.4s ease, transform 0.4s ease" }}
          className="mosaic-img"/>
      )}

      {/* Hover overlay */}
      <div className="tile-overlay" style={{ position:"absolute", inset:0,
        background:"linear-gradient(to top, rgba(7,7,9,0.85) 0%, rgba(7,7,9,0) 50%)",
        opacity:0, transition:"opacity 0.25s ease" }}>
        <div style={{ position:"absolute", bottom:12, left:12, right:12 }}>
          <p style={{ ...MONO, fontSize:12, fontWeight:700, color:"#f1f0ee",
            marginBottom:4 }}>{photo.service}</p>
          <p style={{ ...MONO, fontSize:9, color:"rgba(245,158,11,0.8)",
            letterSpacing:"0.15em", textTransform:"uppercase" }}>
            ✂️ HEADZ UP
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Lightbox ───────────────────────────────────────────────────────────────────
function Lightbox({ photo, photos, onClose, onNext, onPrev }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft")  onPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onNext, onPrev]);

  const idx = photos.findIndex(p => p.id === photo.id);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999,
      background:"rgba(0,0,0,0.95)", backdropFilter:"blur(20px)",
      WebkitBackdropFilter:"blur(20px)",
      display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>

      {/* Close */}
      <button onClick={onClose}
        style={{ position:"absolute", top:20, right:20, background:"rgba(255,255,255,0.08)",
          border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, width:40, height:40,
          color:"#f1f0ee", fontSize:18, cursor:"pointer", zIndex:10,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
        ✕
      </button>

      {/* Prev */}
      <button onClick={e=>{e.stopPropagation();onPrev();}}
        style={{ position:"absolute", left:20, top:"50%", transform:"translateY(-50%)",
          background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)",
          borderRadius:10, width:44, height:44, color:"#f1f0ee", fontSize:20,
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
        ‹
      </button>

      {/* Image */}
      <div onClick={e=>e.stopPropagation()}
        style={{ maxWidth:"90vw", maxHeight:"85vh", position:"relative" }}>
        <img src={photo.src} alt={photo.service}
          style={{ maxWidth:"90vw", maxHeight:"80vh", objectFit:"contain",
            borderRadius:12, display:"block" }}/>
        <div style={{ position:"absolute", bottom:0, left:0, right:0,
          padding:"16px 20px", borderRadius:"0 0 12px 12px",
          background:"linear-gradient(to top, rgba(7,7,9,0.9), transparent)" }}>
          <p style={{ ...SF, fontSize:14, fontWeight:700, color:"#f1f0ee",
            textTransform:"uppercase", letterSpacing:"-0.02em", marginBottom:4 }}>
            {photo.service}
          </p>
          <p style={{ ...MONO, fontSize:10, color:"rgba(245,158,11,0.7)",
            letterSpacing:"0.2em" }}>
            ✂️ HEADZ UP BARBERSHOP · {idx+1} / {photos.length}
          </p>
        </div>
      </div>

      {/* Next */}
      <button onClick={e=>{e.stopPropagation();onNext();}}
        style={{ position:"absolute", right:20, top:"50%", transform:"translateY(-50%)",
          background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)",
          borderRadius:10, width:44, height:44, color:"#f1f0ee", fontSize:20,
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
        ›
      </button>

      {/* Dots */}
      <div style={{ position:"absolute", bottom:20, left:"50%",
        transform:"translateX(-50%)", display:"flex", gap:6 }}>
        {photos.map((p,i) => (
          <div key={p.id} style={{ width: i===idx?20:6, height:6, borderRadius:3,
            background: i===idx?"#f59e0b":"rgba(255,255,255,0.25)",
            transition:"all 0.2s" }}/>
        ))}
      </div>
    </div>
  );
}

// ── Main gallery page ──────────────────────────────────────────────────────────
export default function GalleryPage() {
  const { theme: T } = useTheme();
  C = T;

  const [filter,    setFilter]    = useState("All");
  const [lightbox,  setLightbox]  = useState(null);

  const filtered = filter === "All"
    ? PHOTOS
    : PHOTOS.filter(p => p.service === filter);

  const openLightbox = useCallback((photo) => setLightbox(photo), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const nextPhoto = useCallback(() => {
    if (!lightbox) return;
    const idx = filtered.findIndex(p => p.id === lightbox.id);
    setLightbox(filtered[(idx+1) % filtered.length]);
  }, [lightbox, filtered]);
  const prevPhoto = useCallback(() => {
    if (!lightbox) return;
    const idx = filtered.findIndex(p => p.id === lightbox.id);
    setLightbox(filtered[(idx - 1 + filtered.length) % filtered.length]);
  }, [lightbox, filtered]);

  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@0,400;0,500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${C.bg};color:${C.text};}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}

        .mosaic-tile{transition:transform 0.22s cubic-bezier(0.4,0,0.2,1),box-shadow 0.22s;}
        .mosaic-tile:hover{transform:scale(1.02);box-shadow:0 8px 32px rgba(0,0,0,0.5);z-index:2;}
        .mosaic-tile:hover .tile-overlay{opacity:1!important;}
        .mosaic-tile:hover .mosaic-img{transform:scale(1.05);}

        *{-webkit-tap-highlight-color:transparent;}
        button{touch-action:manipulation;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:rgba(245,158,11,0.2);border-radius:4px;}
      `}</style>

      {/* ── Header ── */}
      <header style={{ position:"sticky", top:0, zIndex:100,
        background:`${C.bg}ee`, backdropFilter:"blur(20px)",
        WebkitBackdropFilter:"blur(20px)",
        borderBottom:`1px solid ${C.border}`,
        padding:"0 24px", height:58,
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <a href="/" style={{ display:"flex", alignItems:"center", gap:6,
            padding:"6px 10px", background:C.surface,
            backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
            border:`1px solid ${C.border}`, borderRadius:8,
            color:C.muted, textDecoration:"none", ...MONO, fontSize:9,
            letterSpacing:"0.1em", transition:"all 0.2s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.amberBorder;e.currentTarget.style.color=C.amber;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
            ← Home
          </a>
          <div style={{ width:1, height:18, background:C.border }}/>
          <p style={{ ...SF, fontSize:11, fontWeight:700, color:C.text,
            textTransform:"uppercase", letterSpacing:"-0.02em" }}>
            Gallery
          </p>
        </div>
        <a href="/book"
          style={{ padding:"7px 18px",
            background:"linear-gradient(135deg,#f59e0b,#d97706)",
            border:"none", borderRadius:10, color:"#000",
            ...SF, fontSize:7, fontWeight:700, textTransform:"uppercase",
            letterSpacing:"0.15em", textDecoration:"none",
            boxShadow:"0 3px 14px rgba(245,158,11,0.3)", display:"inline-block" }}>
          Book Now →
        </a>
      </header>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"32px 20px" }}>

        {/* ── Hero text ── */}
        <div style={{ marginBottom:32, animation:"fadeUp 0.4s ease both" }}>
          <p style={{ ...MONO, fontSize:9, color:C.amber, letterSpacing:"0.5em",
            textTransform:"uppercase", marginBottom:8 }}>
            ✦ Our Work
          </p>
          <h1 style={{ ...SF, fontSize:"clamp(1.8rem,5vw,3rem)", fontWeight:700,
            color:C.text, textTransform:"uppercase", letterSpacing:"-0.04em",
            lineHeight:1, marginBottom:10 }}>
            Fresh Cuts.<br/>
            <span style={{ color:C.amber, fontStyle:"italic" }}>Every Time.</span>
          </h1>
          <p style={{ ...MONO, fontSize:12, color:C.sub, maxWidth:480, lineHeight:1.8 }}>
            Every cut tells a story. Browse our work — fades, lineups, beards, and everything in between. See something you like? Book it.
          </p>
        </div>

        {/* ── Filter bar ── */}
        <div style={{ display:"flex", gap:6, marginBottom:24, flexWrap:"wrap" }}>
          {SERVICES.map(s => (
            <button key={s} onClick={()=>setFilter(s)}
              style={{ padding:"7px 16px", borderRadius:20,
                background: filter===s
                  ? "linear-gradient(135deg,#f59e0b,#d97706)"
                  : C.surface,
                backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
                border: `1px solid ${filter===s ? "transparent" : C.border}`,
                color: filter===s ? "#000" : C.sub,
                ...MONO, fontSize:10, cursor:"pointer",
                fontWeight: filter===s ? 700 : 400,
                boxShadow: filter===s ? "0 3px 12px rgba(245,158,11,0.3)" : "none",
                transition:"all 0.18s" }}>
              {s}
              {s==="All" && (
                <span style={{ marginLeft:6, opacity:0.6, fontSize:9 }}>
                  {PHOTOS.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Mosaic grid ── */}
        <div style={{ display:"grid",
          gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))",
          gridAutoRows:160, gap:6,
          animation:"fadeUp 0.4s 0.1s ease both", opacity:0,
          animationFillMode:"both" }}>
          {filtered.map(photo => (
            <MosaicTile key={photo.id} photo={photo} onClick={openLightbox}/>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <p style={{ fontSize:40, marginBottom:12 }}>✂️</p>
            <p style={{ ...MONO, fontSize:12, color:C.muted }}>
              No photos for this service yet
            </p>
          </div>
        )}

        {/* ── CTA ── */}
        <div style={{ textAlign:"center", marginTop:60, padding:"48px 24px",
          background:C.surface, backdropFilter:"blur(20px)",
          WebkitBackdropFilter:"blur(20px)",
          borderRadius:20, border:`1px solid ${C.amberBorder}`,
          position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
            background:"linear-gradient(to right,#ef4444,#f59e0b,#fbbf24)" }}/>
          <p style={{ ...MONO, fontSize:9, color:C.amber, letterSpacing:"0.4em",
            textTransform:"uppercase", marginBottom:12 }}>Ready for yours?</p>
          <h2 style={{ ...SF, fontSize:"clamp(1.4rem,4vw,2.2rem)", fontWeight:700,
            color:C.text, textTransform:"uppercase", letterSpacing:"-0.03em",
            marginBottom:8, lineHeight:1 }}>
            Book Your Next Cut
          </h2>
          <p style={{ ...MONO, fontSize:12, color:C.sub, marginBottom:28 }}>
            Available 24/7 online · 2509 W 4th St, Hattiesburg MS
          </p>
          <a href="/book"
            style={{ display:"inline-block", padding:"14px 36px",
              background:"linear-gradient(135deg,#f59e0b,#d97706)",
              borderRadius:14, color:"#000",
              ...SF, fontSize:9, fontWeight:700, textTransform:"uppercase",
              letterSpacing:"0.2em", textDecoration:"none",
              boxShadow:"0 6px 24px rgba(245,158,11,0.4)", transition:"all 0.2s" }}>
            Book Now →
          </a>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <Lightbox photo={lightbox} photos={filtered}
          onClose={closeLightbox} onNext={nextPhoto} onPrev={prevPhoto}/>
      )}
    </div>
  );
}
