"use client";
import { useEffect, useState, useRef } from "react";

// ─── Seeded pseudo-random (no Math.random drift per frame) ───────────────────
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Simple value noise ──────────────────────────────────────────────────────
function valueNoise(x, y, t) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const ti = Math.floor(t);
  const xf = x - xi;
  const yf = y - yi;
  const tf = t - ti;

  const fade = v => v * v * v * (v * (v * 6 - 15) + 10);
  const lerp  = (a, b, t) => a + t * (b - a);

  const hash = (xi, yi, ti) => {
    let n = xi * 374761393 + yi * 668265263 + ti * 374761393;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) & 0xffffffff) / 0xffffffff;
  };

  const u = fade(xf), v = fade(yf), w = fade(tf);

  return lerp(
    lerp(lerp(hash(xi,yi,ti), hash(xi+1,yi,ti), u), lerp(hash(xi,yi+1,ti), hash(xi+1,yi+1,ti), u), v),
    lerp(lerp(hash(xi,yi,ti+1), hash(xi+1,yi,ti+1), u), lerp(hash(xi,yi+1,ti+1), hash(xi+1,yi+1,ti+1), u), v),
    w
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [phase,    setPhase]    = useState("in");
  const [visible,  setVisible]  = useState(true);
  const [tick,     setTick]     = useState(0);
  const [glitch,   setGlitch]   = useState(false);
  const [scanLine, setScanLine] = useState(0);

  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const timeRef    = useRef(0);
  const embersRef  = useRef([]);

  // ── Progress ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let p = 0;
    const steps = [{sp:22,max:35},{sp:6,max:68},{sp:25,max:100}];
    let si = 0;
    const id = setInterval(() => {
      p = Math.min(p + Math.random() * steps[si].sp + 2, steps[si].max);
      setProgress(Math.round(p));
      if (p >= steps[si].max && si < steps.length - 1) si++;
      if (p >= 100) {
        clearInterval(id);
        setTimeout(() => setPhase("out"), 300);
        setTimeout(() => { setVisible(false); onComplete?.(); }, 950);
      }
    }, 50);
    return () => clearInterval(id);
  }, [onComplete]);

  // ── UI tick ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  // ── Glitch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fire = () => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 120);
      setTimeout(fire, 2800 + Math.random() * 1400);
    };
    const t = setTimeout(fire, 900);
    return () => clearTimeout(t);
  }, []);

  // ── Scan line ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setScanLine(s => (s + 2) % 100), 16);
    return () => clearInterval(id);
  }, []);

  // ── FIRE CANVAS ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Init embers
    embersRef.current = Array.from({ length: 55 }, () => spawnEmber(
      canvas.width, canvas.height, true
    ));

    function spawnEmber(W, H, randomY = false) {
      const spread = W * 0.55;
      const cx     = W / 2;
      return {
        x:     cx + (Math.random() - 0.5) * spread,
        y:     randomY ? H - Math.random() * H * 0.4 : H + 4,
        vx:    (Math.random() - 0.5) * 0.9,
        vy:    -(Math.random() * 1.6 + 0.5),
        life:  Math.random(),
        decay: 0.004 + Math.random() * 0.007,
        size:  Math.random() * 2.2 + 0.6,
        hot:   Math.random() > 0.45,  // white-hot vs amber
        drift: (Math.random() - 0.5) * 0.015,
      };
    }

    // ── DRAW LOOP ─────────────────────────────────────────────────────────
    function draw() {
      const ctx = canvas.getContext("2d");
      const W   = canvas.width;
      const H   = canvas.height;

      ctx.clearRect(0, 0, W, H);
      timeRef.current += 0.012;
      const t = timeRef.current;

      // ── Layer 1: FIRE FIELD (noise-driven columns) ──────────────────────
      // We draw many vertical columns, each height driven by noise.
      // This creates a continuous, organic fire sheet — not individual flames.
      const COLS        = Math.ceil(W / 3);   // one column per 3px
      const FIRE_HEIGHT = H * 0.52;           // max flame height from bottom

      for (let col = 0; col < COLS; col++) {
        const x      = col * 3;
        const nx     = col / COLS * 3.5;      // noise x scale

        // Multi-octave noise for organic shape
        const n1 = valueNoise(nx, 0, t * 1.1);
        const n2 = valueNoise(nx * 2.1, 0, t * 2.3 + 7) * 0.5;
        const n3 = valueNoise(nx * 4.2, 0, t * 4.1 + 13) * 0.25;
        const n  = (n1 + n2 + n3) / 1.75;

        // Flame height: taller in centre, shorter at edges, modulated by noise
        const edgeFade = 1 - Math.pow(Math.abs((col / COLS) - 0.5) * 2, 1.6);
        const flameH   = n * FIRE_HEIGHT * edgeFade * (0.55 + n * 0.7);

        if (flameH < 6) continue;

        const base = H;
        const tip  = H - flameH;

        // Gradient per column: deep red at base → amber → orange → yellow-white at tip
        const grad = ctx.createLinearGradient(0, base, 0, tip - flameH * 0.15);
        grad.addColorStop(0,    "rgba(180,20,0,0.82)");
        grad.addColorStop(0.15, "rgba(220,50,0,0.78)");
        grad.addColorStop(0.35, "rgba(240,90,0,0.72)");
        grad.addColorStop(0.55, "rgba(245,150,10,0.65)");
        grad.addColorStop(0.72, "rgba(250,190,30,0.45)");
        grad.addColorStop(0.86, "rgba(255,230,120,0.22)");
        grad.addColorStop(1,    "transparent");

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        // Column width widens at base, narrows to a point at tip
        const baseW = 3.5;
        ctx.beginPath();
        ctx.moveTo(x - baseW, base);
        ctx.bezierCurveTo(
          x - baseW * 0.8, base - flameH * 0.4,
          x - baseW * 0.3, base - flameH * 0.75,
          x,               tip
        );
        ctx.bezierCurveTo(
          x + baseW * 0.3, base - flameH * 0.75,
          x + baseW * 0.8, base - flameH * 0.4,
          x + baseW,       base
        );
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      // ── Layer 2: WIDE GLOW BASE (heat body) ────────────────────────────
      // Horizontal gaussian-like glow that pulses with a slow noise value
      const pulseN = valueNoise(1, 0, t * 0.6);
      const glowH  = H * (0.28 + pulseN * 0.12);
      const glow   = ctx.createLinearGradient(0, H, 0, H - glowH);
      glow.addColorStop(0,   "rgba(220,50,0,0.28)");
      glow.addColorStop(0.3, "rgba(240,100,0,0.14)");
      glow.addColorStop(0.65,"rgba(245,158,11,0.07)");
      glow.addColorStop(1,   "transparent");

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = glow;
      ctx.fillRect(0, H - glowH, W, glowH);
      ctx.restore();

      // ── Layer 3: EMBERS ────────────────────────────────────────────────
      embersRef.current.forEach((e, i) => {
        e.x  += e.vx;
        e.vx += e.drift;
        e.vy *= 0.998;           // very slight drag
        e.y  += e.vy;
        e.life -= e.decay;

        if (e.life <= 0 || e.y < -30) {
          embersRef.current[i] = spawnEmber(W, H);
          return;
        }

        const a   = Math.pow(Math.max(0, e.life), 0.7);
        const r   = e.size * (0.5 + e.life * 0.5);

        // Inner white-hot dot + outer amber halo
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        // Halo
        const hg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 3.5);
        hg.addColorStop(0,   e.hot ? `rgba(255,255,220,${a * 0.9})`  : `rgba(255,160,20,${a * 0.75})`);
        hg.addColorStop(0.35,e.hot ? `rgba(255,200,50,${a * 0.7})`   : `rgba(240,100,0,${a * 0.55})`);
        hg.addColorStop(1,   "transparent");
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = e.hot ? `rgba(255,255,255,${a})` : `rgba(255,210,80,${a * 0.9})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // ── Layer 4: SMOKE (near-black wisps at very top of flames) ────────
      // Thin, barely-visible dark wisps add depth without looking cartoony
      for (let col = 0; col < COLS; col += 4) {
        const x  = col * 3;
        const nx = col / COLS * 2.8;
        const sn = valueNoise(nx, 0.5, t * 0.55 + 20);
        const sh = sn * FIRE_HEIGHT * 0.18;
        if (sh < 10) continue;

        const edgeFade = 1 - Math.pow(Math.abs((col / COLS) - 0.5) * 2, 2);
        if (edgeFade < 0.2) continue;

        const smokeY = H - FIRE_HEIGHT * edgeFade * 0.6;
        const sg = ctx.createRadialGradient(x, smokeY, 0, x, smokeY, sh * 1.8);
        sg.addColorStop(0,   `rgba(20,10,5,${sn * 0.08 * edgeFade})`);
        sg.addColorStop(1,   "transparent");
        ctx.save();
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(x, smokeY, sh * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  if (!visible) return null;

  const pct      = progress;
  const segments = 20;
  const filled   = Math.floor((pct / 100) * segments);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:99999,
      background:"#000",
      opacity:   phase==="out" ? 0 : 1,
      transform: phase==="out" ? "scale(1.04)" : "scale(1)",
      transition:"opacity 0.65s ease, transform 0.65s ease",
      pointerEvents: phase==="out" ? "none" : "all",
      overflow:"hidden",
      fontFamily:"'Syncopate',sans-serif",
    }}>
      <style>{`
        @keyframes ls-flicker{0%,89%,91%,93%,100%{opacity:1}90%,92%{opacity:0.05}}
        @keyframes ls-rgb{
          0%  {text-shadow:3px 0 #f59e0b,-3px 0 rgba(239,68,68,0.6),0 0 20px rgba(245,158,11,0.4)}
          33% {text-shadow:-3px 0 #f59e0b,3px 0 rgba(239,68,68,0.6),0 0 20px rgba(245,158,11,0.4)}
          66% {text-shadow:0 3px #f59e0b,0 -3px rgba(239,68,68,0.6),0 0 20px rgba(245,158,11,0.4)}
          100%{text-shadow:3px 0 #f59e0b,-3px 0 rgba(239,68,68,0.6),0 0 20px rgba(245,158,11,0.4)}
        }
        @keyframes ls-glitch-1{
          0%,100%{clip-path:inset(0 0 95% 0);transform:translate(-4px,0)}
          20%    {clip-path:inset(30% 0 50% 0);transform:translate(4px,0)}
          40%    {clip-path:inset(60% 0 20% 0);transform:translate(-3px,0)}
          60%    {clip-path:inset(10% 0 75% 0);transform:translate(3px,0)}
          80%    {clip-path:inset(80% 0 5% 0);transform:translate(-2px,0)}
        }
        @keyframes ls-glitch-2{
          0%,100%{clip-path:inset(50% 0 30% 0);transform:translate(3px,0);color:#ef4444}
          25%    {clip-path:inset(20% 0 60% 0);transform:translate(-3px,0);color:#f59e0b}
          50%    {clip-path:inset(70% 0 10% 0);transform:translate(2px,0);color:#ef4444}
          75%    {clip-path:inset(5% 0 80% 0);transform:translate(-2px,0);color:#f59e0b}
        }
        @keyframes ls-pulse  {0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.02)}}
        @keyframes ls-blink  {0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes ls-slidein{from{opacity:0;transform:translateX(-40px) skewX(-6deg)}to{opacity:1;transform:none}}
        @keyframes ls-bar-flash{
          0%,100%{box-shadow:0 0 8px rgba(245,158,11,0.6)}
          50%    {box-shadow:0 0 24px rgba(245,158,11,1),0 0 48px rgba(245,158,11,0.4)}
        }
        @keyframes ls-shimmer{
          0%  {transform:translateY(0px) scaleX(1);  opacity:0.18}
          30% {transform:translateY(-3px) scaleX(1.02);opacity:0.28}
          60% {transform:translateY(-1px) scaleX(0.98);opacity:0.20}
          100%{transform:translateY(0px) scaleX(1);  opacity:0.18}
        }
        @keyframes ls-heatwave{
          0%  {clip-path:inset(0 0 0 0);transform:skewY(0deg)}
          20% {clip-path:inset(20% 0 0 0);transform:skewY(0.4deg)}
          40% {clip-path:inset(0 0 30% 0);transform:skewY(-0.3deg)}
          60% {clip-path:inset(10% 0 20% 0);transform:skewY(0.2deg)}
          80% {clip-path:inset(30% 0 0 0);transform:skewY(-0.4deg)}
          100%{clip-path:inset(0 0 0 0);transform:skewY(0deg)}
        }

        .ls-main-title{animation:ls-flicker 6s ease infinite,ls-rgb 3s ease infinite}
        .ls-glitch-1  {animation:ls-glitch-1 0.15s steps(1) infinite}
        .ls-glitch-2  {animation:ls-glitch-2 0.18s steps(1) infinite}
        .ls-bar-seg   {animation:ls-bar-flash 1.2s ease infinite}
        .ls-shimmer   {animation:ls-shimmer 2.6s ease-in-out infinite}
        .ls-heatwave  {animation:ls-heatwave 3.2s ease-in-out infinite}
      `}</style>

      {/* ── FIRE CANVAS ── */}
      <canvas ref={canvasRef} style={{
        position:"absolute", inset:0, zIndex:1, pointerEvents:"none",
      }}/>

      {/* ── CRT SCANLINES ── */}
      <div style={{position:"absolute",inset:0,zIndex:2,pointerEvents:"none",
        backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.18) 2px,rgba(0,0,0,0.18) 3px)"
      }}/>

      {/* ── MOVING SCAN LINE ── */}
      <div style={{
        position:"absolute",left:0,right:0,height:2,zIndex:4,pointerEvents:"none",
        top:`${scanLine}%`,
        background:"linear-gradient(to right,transparent,rgba(245,158,11,0.6),rgba(245,158,11,0.9),rgba(245,158,11,0.6),transparent)",
        boxShadow:"0 0 12px rgba(245,158,11,0.8)",
        opacity:0.7,
      }}/>

      {/* ── GRID ── */}
      <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(245,158,11,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.025) 1px,transparent 1px)",
        backgroundSize:"48px 48px",
      }}/>

      {/* ── TOP HUD ── */}
      <div style={{position:"absolute",top:16,left:24,right:24,zIndex:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(245,158,11,0.4)",letterSpacing:"0.5em",textTransform:"uppercase"}}>SYS://HEADZUP_OS v2.6</span>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(245,158,11,0.4)",letterSpacing:"0.4em",textTransform:"uppercase"}}>HAT.MS · 31.3271°N</span>
      </div>

      {/* ── BOTTOM HUD ── */}
      <div style={{position:"absolute",bottom:16,left:24,right:24,zIndex:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(245,158,11,0.3)",letterSpacing:"0.4em",textTransform:"uppercase"}}>2509 W 4TH ST · HATTIESBURG MS</span>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(245,158,11,0.3)",letterSpacing:"0.4em",textTransform:"uppercase",animation:"ls-blink 1s step-end infinite"}}>▮ INITIALIZING</span>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{
        position:"relative",zIndex:5,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        height:"100%",gap:0,padding:"60px 20px",
      }}>

        {/* Animated scissors */}
        <div style={{marginBottom:20,position:"relative"}}>
          <div style={{
            width:56,height:56,
            border:"1px solid rgba(245,158,11,0.3)",
            display:"flex",alignItems:"center",justifyContent:"center",
            clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
            background:"rgba(245,158,11,0.06)",
            boxShadow:"0 0 20px rgba(245,158,11,0.15),inset 0 0 20px rgba(245,158,11,0.04)",
          }}>
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <line x1={tick%20<10?8:3} y1={tick%20<10?10:18} x2="32" y2="32"
                stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"
                style={{transition:"all 0.3s cubic-bezier(0.4,0,0.2,1)"}}/>
              <line x1={tick%20<10?8:3} y1={tick%20<10?26:18} x2="32" y2="4"
                stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"
                style={{transition:"all 0.3s cubic-bezier(0.4,0,0.2,1)"}}/>
              <circle cx={tick%20<10?6:3} cy={tick%20<10?9:18}  r="3.5" stroke="#f59e0b" strokeWidth="1.5" fill="rgba(245,158,11,0.15)" style={{transition:"all 0.3s cubic-bezier(0.4,0,0.2,1)"}}/>
              <circle cx={tick%20<10?6:3} cy={tick%20<10?27:18} r="3.5" stroke="#f59e0b" strokeWidth="1.5" fill="rgba(245,158,11,0.15)" style={{transition:"all 0.3s cubic-bezier(0.4,0,0.2,1)"}}/>
            </svg>
          </div>
        </div>

        {/* WORDMARK */}
        <div style={{position:"relative",marginBottom:6}}>
          {/* CSS heat shimmer layer */}
          <div className="ls-shimmer" style={{
            position:"absolute",
            bottom:-8, left:"-5%", right:"-5%",
            height:"30%",
            background:"linear-gradient(to top,rgba(245,120,0,0.12),transparent)",
            filter:"blur(3px)",
            zIndex:-1,
            pointerEvents:"none",
          }}/>

          <div className="ls-main-title" style={{
            width:"clamp(220px,60vw,420px)",
            userSelect:"none",
            filter: glitch ? "drop-shadow(2px 0 0 #ef4444) drop-shadow(-2px 0 0 #f59e0b)" : "none",
            transition:"filter 0.1s",
          }}>
            <svg width="100%" viewBox="0 0 1200 350" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="gold-ls" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f8e7b5"/>
                  <stop offset="40%" stopColor="#d4af37"/>
                  <stop offset="100%" stopColor="#8c6b2a"/>
                </linearGradient>
              </defs>
              <text x="40" y="210" fontSize="140" fontFamily="Brush Script MT, cursive" fill="white" stroke="url(#gold-ls)" strokeWidth="6">Headz</text>
              <text x="820" y="210" fontSize="140" fontFamily="Brush Script MT, cursive" fill="white" stroke="url(#gold-ls)" strokeWidth="6">Up</text>
              <polygon points="600,40 780,280 420,280" fill="none" stroke="red" strokeWidth="14"/>
              <polygon points="600,60 760,270 440,270" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="6"/>
              <path d="M540 60 L570 10 L600 60 L630 10 L660 60 L660 75 L540 75 Z" fill="url(#gold-ls)"/>
              <path d="M560 150 Q580 110 630 120 Q660 140 650 180 Q640 210 600 215 Q570 210 560 180 Z" fill="#c89b6d"/>
              <path d="M580 190 Q600 240 640 190 Q630 230 600 240 Q580 230 580 190 Z" fill="#4a2f1d"/>
              <text x="500" y="320" fontSize="28" fontFamily="Arial Black, sans-serif" fill="rgba(245,158,11,0.8)">BEAUTY &amp; BARBER SHOP</text>
            </svg>
          </div>
        </div>

        {/* Tagline */}
        <p style={{fontFamily:"'DM Mono',monospace",fontSize:"clamp(8px,2vw,11px)",color:"rgba(245,158,11,0.55)",letterSpacing:"0.65em",textTransform:"uppercase",marginBottom:40,animation:"ls-pulse 3s ease infinite"}}>
          ✦ BARBERSHOP · HATTIESBURG MS ✦
        </p>

        {/* SEGMENTED PROGRESS BAR */}
        <div style={{width:"min(420px,85vw)",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(245,158,11,0.5)",letterSpacing:"0.4em",textTransform:"uppercase"}}>LOADING</span>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"#f59e0b",letterSpacing:"0.3em",fontWeight:500}}>{pct}%</span>
          </div>
          <div style={{display:"flex",gap:3}}>
            {Array.from({length:segments}).map((_,i)=>{
              const isFilled = i < filled;
              const isActive = i === filled;
              return (
                <div key={i}
                  className={isActive?"ls-bar-seg":""}
                  style={{
                    flex:1, height:10,
                    background: isFilled
                      ? i < segments*0.5 ? "#f59e0b"
                        : i < segments*0.8 ? "#fbbf24"
                        : "#ef4444"
                      : "rgba(255,255,255,0.05)",
                    clipPath:"polygon(0 0,calc(100% - 2px) 0,100% 2px,100% 100%,2px 100%,0 calc(100% - 2px))",
                    transition:"background 0.15s",
                    boxShadow:isFilled?"0 0 6px rgba(245,158,11,0.5)":"none",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* STATUS TEXT */}
        <div style={{height:16,overflow:"hidden",marginBottom:32}}>
          <p style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(245,158,11,0.4)",letterSpacing:"0.5em",textTransform:"uppercase",margin:0,animation:"ls-slidein 0.3s ease both"}}
            key={Math.floor(pct/10)}>
            {pct<25?"CONNECTING TO SERVER...":pct<45?"LOADING BARBER PROFILES...":pct<65?"SYNCING APPOINTMENTS...":pct<82?"CALIBRATING PRECISION...":pct<95?"ALMOST READY...":"HEADZ UP — LET'S GO"}
          </p>
        </div>

        {/* BOTTOM DECORATORS */}
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:20,height:20,border:"1px solid rgba(245,158,11,0.4)",transform:`rotate(${tick*4}deg)`,transition:"none",clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",background:"rgba(245,158,11,0.06)"}}/>
          <div style={{display:"flex",gap:4}}>
            {[0,1,2,3,4].map(i=>(
              <div key={i} style={{width:4,height:8+Math.sin((tick*0.3)+i*0.8)*6,background:`rgba(245,158,11,${0.2+Math.abs(Math.sin((tick*0.3)+i*0.8))*0.7})`,transition:"height 0.08s",boxShadow:`0 0 4px rgba(245,158,11,${Math.abs(Math.sin((tick*0.3)+i*0.8))*0.5})`}}/>
            ))}
          </div>
          <div style={{width:20,height:20,border:"1px solid rgba(239,68,68,0.4)",transform:`rotate(${-tick*3}deg)`,transition:"none",clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",background:"rgba(239,68,68,0.06)"}}/>
        </div>

      </div>
    </div>
  );
}
