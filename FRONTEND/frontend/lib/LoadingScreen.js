"use client";
import { useEffect, useState, useRef } from "react";

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [phase,    setPhase]    = useState("in");   // "in" | "out"
  const [visible,  setVisible]  = useState(true);
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const timeRef    = useRef(0);
  const embersRef  = useRef([]);

  // ── Progress ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      // Smooth, predictable progress — no Math.random() jumps
      const speed = p < 40 ? 1.8 : p < 75 ? 1.1 : p < 92 ? 0.7 : 0.4;
      p = Math.min(p + speed, 100);
      setProgress(Math.round(p));
      if (p >= 100) {
        clearInterval(id);
        setTimeout(() => setPhase("out"), 200);
        setTimeout(() => { setVisible(false); onComplete?.(); }, 750);
      }
    }, 40);
    return () => clearInterval(id);
  }, [onComplete]);

  // ── Fire canvas ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Spawn ember helper
    const spawnEmber = (W, H, randomY = false) => ({
      x:     W / 2 + (Math.random() - 0.5) * W * 0.5,
      y:     randomY ? H - Math.random() * H * 0.35 : H + 4,
      vx:    (Math.random() - 0.5) * 0.7,
      vy:    -(Math.random() * 1.4 + 0.4),
      life:  Math.random(),
      decay: 0.003 + Math.random() * 0.006,
      size:  Math.random() * 2 + 0.5,
      hot:   Math.random() > 0.5,
      drift: (Math.random() - 0.5) * 0.012,
    });

    // Init embers
    embersRef.current = Array.from({ length: 40 }, () =>
      spawnEmber(canvas.width, canvas.height, true)
    );

    // Smooth noise
    const hash = (x, y, t) => {
      let n = (x * 374761393 + y * 668265263 + t * 374761393) | 0;
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 0xffffffff;
    };
    const lerp  = (a, b, t) => a + t * (b - a);
    const fade  = v => v * v * v * (v * (v * 6 - 15) + 10);
    const noise = (x, y, t) => {
      const xi = x | 0, yi = y | 0, ti = t | 0;
      const xf = fade(x - xi), yf = fade(y - yi), tf = fade(t - ti);
      return lerp(
        lerp(lerp(hash(xi,yi,ti), hash(xi+1,yi,ti), xf), lerp(hash(xi,yi+1,ti), hash(xi+1,yi+1,ti), xf), yf),
        lerp(lerp(hash(xi,yi,ti+1), hash(xi+1,yi,ti+1), xf), lerp(hash(xi,yi+1,ti+1), hash(xi+1,yi+1,ti+1), xf), yf),
        tf
      );
    };

    const draw = () => {
      const ctx = canvas.getContext("2d");
      const W   = canvas.width;
      const H   = canvas.height;
      ctx.clearRect(0, 0, W, H);
      timeRef.current += 0.01;
      const t = timeRef.current;

      // Fire columns
      const COLS  = Math.ceil(W / 4);
      const FIRE_H = H * 0.48;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let col = 0; col < COLS; col++) {
        const x  = col * 4;
        const nx = col / COLS * 3.5;
        const n  = noise(nx, 0, t * 1.1) * 0.6
                 + noise(nx * 2, 0, t * 2.2) * 0.3
                 + noise(nx * 4, 0, t * 4.0) * 0.1;
        const ef = 1 - Math.pow(Math.abs((col / COLS) - 0.5) * 2, 1.6);
        const fh = n * FIRE_H * ef * (0.5 + n * 0.7);
        if (fh < 5) continue;
        const g = ctx.createLinearGradient(0, H, 0, H - fh);
        g.addColorStop(0,    "rgba(180,20,0,0.75)");
        g.addColorStop(0.3,  "rgba(240,80,0,0.6)");
        g.addColorStop(0.6,  "rgba(245,150,10,0.45)");
        g.addColorStop(0.85, "rgba(250,210,40,0.2)");
        g.addColorStop(1,    "transparent");
        ctx.beginPath();
        ctx.moveTo(x - 2, H);
        ctx.bezierCurveTo(x - 1.5, H - fh * 0.4, x - 0.5, H - fh * 0.75, x, H - fh);
        ctx.bezierCurveTo(x + 0.5, H - fh * 0.75, x + 1.5, H - fh * 0.4, x + 2, H);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.restore();

      // Base glow
      const pn = noise(1, 0, t * 0.5);
      const gh = H * (0.25 + pn * 0.1);
      const gg = ctx.createLinearGradient(0, H, 0, H - gh);
      gg.addColorStop(0,   "rgba(220,50,0,0.22)");
      gg.addColorStop(0.4, "rgba(240,100,0,0.1)");
      gg.addColorStop(1,   "transparent");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = gg;
      ctx.fillRect(0, H - gh, W, gh);
      ctx.restore();

      // Embers
      embersRef.current.forEach((e, i) => {
        e.x  += e.vx;
        e.vx += e.drift;
        e.y  += e.vy;
        e.vy *= 0.999;
        e.life -= e.decay;
        if (e.life <= 0 || e.y < -20) {
          embersRef.current[i] = spawnEmber(W, H);
          return;
        }
        const a = Math.pow(Math.max(0, e.life), 0.6);
        const r = e.size * (0.4 + e.life * 0.6);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const hg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 3);
        hg.addColorStop(0,   e.hot ? `rgba(255,255,220,${a*0.85})`  : `rgba(255,150,20,${a*0.7})`);
        hg.addColorStop(0.4, e.hot ? `rgba(255,190,50,${a*0.6})`    : `rgba(240,90,0,${a*0.5})`);
        hg.addColorStop(1,   "transparent");
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = e.hot ? `rgba(255,255,255,${a})` : `rgba(255,200,60,${a*0.9})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  if (!visible) return null;

  const pct      = progress;
  const segments = 24;
  const filled   = Math.floor((pct / 100) * segments);
  const label    = pct < 25 ? "Connecting..."
                 : pct < 50 ? "Loading barbers..."
                 : pct < 75 ? "Syncing schedule..."
                 : pct < 95 ? "Almost ready..."
                 : "Let's go ✂️";

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:99999,
      background:"#000",
      opacity:   phase === "out" ? 0 : 1,
      transform: phase === "out" ? "scale(1.03)" : "scale(1)",
      transition:"opacity 0.55s cubic-bezier(0.4,0,0.2,1), transform 0.55s cubic-bezier(0.4,0,0.2,1)",
      pointerEvents: phase === "out" ? "none" : "all",
      overflow:"hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@400;500&display=swap');

        /* Barber pole top edge */
        .ls-pole {
          position:absolute; top:0; left:0; right:0; height:4px;
          background:repeating-linear-gradient(90deg,#ef4444 0px,#ef4444 10px,#fff 10px,#fff 20px,#f59e0b 20px,#f59e0b 30px,#000 30px,#000 40px);
          opacity:0.65;
        }

        /* Subtle grid */
        .ls-grid {
          position:absolute; inset:0;
          background-image:linear-gradient(rgba(245,158,11,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.02) 1px,transparent 1px);
          background-size:52px 52px;
          pointer-events:none;
        }

        /* CRT scanlines — very subtle */
        .ls-scan {
          position:absolute; inset:0; pointer-events:none;
          background-image:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.12) 2px,rgba(0,0,0,0.12) 3px);
        }

        /* Progress bar segments */
        .ls-seg {
          flex:1; height:8px;
          clip-path:polygon(0 0,calc(100% - 2px) 0,100% 2px,100% 100%,2px 100%,0 calc(100% - 2px));
          transition:background 0.12s ease, box-shadow 0.12s ease;
        }

        /* Logo fade in */
        @keyframes ls-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        .ls-logo { animation:ls-in 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .ls-tag  { animation:ls-in 0.7s cubic-bezier(0.16,1,0.3,1) 0.25s both; }
        .ls-bar  { animation:ls-in 0.7s cubic-bezier(0.16,1,0.3,1) 0.35s both; }

        /* Status label slide */
        @keyframes ls-status { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:none} }
        .ls-status { animation:ls-status 0.3s ease both; }

        /* Scissors snip */
        @keyframes ls-snip { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-18deg)} }
        .ls-scissors { animation:ls-snip 1.8s cubic-bezier(0.4,0,0.2,1) infinite; transform-origin:50% 65%; }

        /* Blink cursor */
        @keyframes ls-blink { 0%,49%{opacity:1}50%,100%{opacity:0} }
        .ls-cursor { animation:ls-blink 1s step-end infinite; }
      `}</style>

      {/* Fire canvas */}
      <canvas ref={canvasRef} style={{ position:"absolute", inset:0, zIndex:1, pointerEvents:"none" }}/>

      {/* Layers */}
      <div className="ls-grid" style={{ zIndex:2 }}/>
      <div className="ls-scan" style={{ zIndex:3 }}/>
      <div className="ls-pole" style={{ zIndex:6 }}/>

      {/* HUD — top */}
      <div style={{ position:"absolute", top:14, left:20, right:20, zIndex:10,
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:"rgba(245,158,11,0.35)",
          letterSpacing:"0.5em", textTransform:"uppercase" }}>HEADZUP · v2.6</span>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:"rgba(245,158,11,0.35)",
          letterSpacing:"0.4em", textTransform:"uppercase" }}>HAT.MS · 31.3°N</span>
      </div>

      {/* HUD — bottom */}
      <div style={{ position:"absolute", bottom:14, left:20, right:20, zIndex:10,
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:"rgba(245,158,11,0.25)",
          letterSpacing:"0.35em", textTransform:"uppercase" }}>2509 W 4TH ST · HATTIESBURG</span>
        <span className="ls-cursor" style={{ fontFamily:"'DM Mono',monospace", fontSize:8,
          color:"rgba(245,158,11,0.4)", letterSpacing:"0.4em" }}>▮</span>
      </div>

      {/* Main content */}
      <div style={{
        position:"relative", zIndex:5,
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        height:"100%", gap:0, padding:"60px 20px",
      }}>

        {/* Scissors icon */}
        <div style={{ marginBottom:18 }}>
          <div style={{
            width:50, height:50,
            border:"1px solid rgba(245,158,11,0.25)",
            display:"flex", alignItems:"center", justifyContent:"center",
            clipPath:"polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px))",
            background:"rgba(245,158,11,0.05)",
          }}>
            <svg className="ls-scissors" width="26" height="26" viewBox="0 0 24 24"
              fill="none" stroke="#f59e0b" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3"/>
              <circle cx="6" cy="18" r="3"/>
              <line x1="20" y1="4" x2="8.12" y2="15.88"/>
              <line x1="14.47" y1="14.48" x2="20" y2="20"/>
              <line x1="8.12" y1="8.12" x2="12" y2="12"/>
            </svg>
          </div>
        </div>

        {/* Logo */}
        <div className="ls-logo" style={{ marginBottom:8, position:"relative" }}>
          <div style={{
            position:"absolute", bottom:-6, left:"-8%", right:"-8%", height:"30%",
            background:"linear-gradient(to top,rgba(245,120,0,0.1),transparent)",
            filter:"blur(4px)", zIndex:-1,
          }}/>
          <img
            src="/logo1.jpg"
            alt="HEADZ UP Barbershop"
            style={{
              width:"clamp(160px,45vw,300px)",
              height:"auto",
              objectFit:"contain",
              userSelect:"none",
              filter:"brightness(1.05) contrast(1.02)",
            }}
          />
        </div>

        {/* Tagline */}
        <p className="ls-tag" style={{
          fontFamily:"'DM Mono',monospace",
          fontSize:"clamp(8px,1.8vw,10px)",
          color:"rgba(245,158,11,0.45)",
          letterSpacing:"0.6em",
          textTransform:"uppercase",
          marginBottom:36,
        }}>
          ✦ BARBERSHOP · HATTIESBURG MS ✦
        </p>

        {/* Progress bar */}
        <div className="ls-bar" style={{ width:"min(380px,80vw)", marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8,
              color:"rgba(245,158,11,0.4)", letterSpacing:"0.4em", textTransform:"uppercase" }}>
              LOADING
            </span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8,
              color:"#f59e0b", letterSpacing:"0.3em", fontWeight:500 }}>
              {pct}%
            </span>
          </div>
          <div style={{ display:"flex", gap:2.5 }}>
            {Array.from({ length: segments }).map((_, i) => {
              const isFilled = i < filled;
              const isActive = i === filled;
              return (
                <div key={i} className="ls-seg" style={{
                  background: isFilled
                    ? i < segments * 0.5 ? "#f59e0b"
                      : i < segments * 0.8 ? "#fbbf24"
                      : "#ef4444"
                    : "rgba(255,255,255,0.04)",
                  boxShadow: isFilled
                    ? `0 0 ${isActive ? 10 : 4}px rgba(245,158,11,${isActive ? 0.8 : 0.35})`
                    : "none",
                }}/>
              );
            })}
          </div>
        </div>

        {/* Status text */}
        <p className="ls-status" key={label} style={{
          fontFamily:"'DM Mono',monospace",
          fontSize:9,
          color:"rgba(245,158,11,0.38)",
          letterSpacing:"0.45em",
          textTransform:"uppercase",
          marginBottom:0,
        }}>
          {label}
        </p>

      </div>
    </div>
  );
}
