"use client";
import { useEffect, useState, useRef } from "react";

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [phase,    setPhase]    = useState("in");
  const [visible,  setVisible]  = useState(true);
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      const speed = p < 40 ? 1.8 : p < 75 ? 1.1 : p < 92 ? 0.7 : 0.4;
      p = Math.min(p + speed, 100);
      setProgress(Math.round(p));
      if (p >= 100) {
        clearInterval(id);
        setTimeout(() => setPhase("out"), 400);
        setTimeout(() => { setVisible(false); onComplete?.(); }, 1000);
      }
    }, 40);
    return () => clearInterval(id);
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const embers = Array.from({ length: 35 }, () => ({
      x: Math.random() * 1400, y: Math.random() * 900,
      vy: -(0.4 + Math.random() * 1.2), vx: (Math.random() - 0.5) * 0.5,
      life: Math.random(), size: Math.random() * 2 + 0.5,
    }));

    const ctx = canvas.getContext("2d");
    let t = 0;

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      t += 0.01;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, 0, W, H);
      for (const e of embers) {
        e.x += e.vx; e.y += e.vy; e.life -= 0.004;
        if (e.life <= 0 || e.y < -10) {
          e.x = W/2 + (Math.random()-0.5)*W*0.6;
          e.y = H + 5; e.life = 0.5 + Math.random()*0.5;
          e.vy = -(0.4 + Math.random()*1.2);
          e.size = Math.random()*2+0.5;
        }
        const a = Math.pow(Math.max(0,e.life),0.5)*0.7;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI*2);
        ctx.fillStyle = `rgba(245,158,11,${a})`;
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
  }, []);

  if (!visible) return null;

  const pct = progress;
  const segments = 24;
  const label = pct < 20 ? "Initializing..."
              : pct < 50 ? "Loading assets..."
              : pct < 80 ? "Almost there..."
              : pct < 95 ? "Final touches..."
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

      {/* Background video */}
      <video autoPlay muted loop playsInline
        style={{ position:"absolute",inset:0,width:"100%",height:"100%",
          objectFit:"cover",opacity:0.35,zIndex:0,pointerEvents:"none" }}>
        <source src="/loading-bg.mp4" type="video/mp4"/>
      </video>

      {/* Gradient overlay */}
      <div style={{ position:"absolute",inset:0,zIndex:1,pointerEvents:"none",
        background:"linear-gradient(to bottom,rgba(0,0,0,0.65),rgba(0,0,0,0.2),rgba(0,0,0,0.75))" }}/>

      {/* Canvas embers */}
      <canvas ref={canvasRef} style={{ position:"absolute",inset:0,
        width:"100%",height:"100%",zIndex:2,pointerEvents:"none" }}/>

      {/* Barber pole stripe */}
      <div style={{ position:"absolute",top:0,left:0,right:0,height:4,zIndex:3,
        background:"repeating-linear-gradient(90deg,#ef4444 0,#ef4444 10px,#fff 10px,#fff 20px,#f59e0b 20px,#f59e0b 30px,#000 30px,#000 40px)",
        opacity:0.65 }}/>

      {/* Main content */}
      <div style={{
        position:"relative", zIndex:4,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        width:"100%", height:"100%", padding:"0 24px",
      }}>

        {/* Logo */}
        <div style={{
          fontFamily:"'Syncopate',sans-serif",
          fontSize:"clamp(2rem,10vw,4.5rem)",
          fontWeight:700, color:"#fff",
          letterSpacing:"-0.04em", lineHeight:1,
          marginBottom:8,
        }}>
          HEADZ <span style={{ color:"#f59e0b", fontStyle:"italic" }}>UP</span>
        </div>

        {/* Tagline */}
        <div style={{
          fontFamily:"'DM Mono',monospace",
          fontSize:"clamp(7px,1.5vw,9px)",
          letterSpacing:"0.5em", textTransform:"uppercase",
          color:"rgba(245,158,11,0.5)",
          marginBottom:40,
        }}>
          ✦ Barbershop · Hattiesburg MS ✦
        </div>

        {/* Progress bar */}
        <div style={{ width:"min(400px,80vw)", marginBottom:12 }}>
          <div style={{ display:"flex", gap:3 }}>
            {Array.from({ length:segments }, (_, i) => {
              const filled   = (pct / 100) * segments;
              const isFilled = i < filled;
              const isActive = i === Math.floor(filled);
              return (
                <div key={i} style={{
                  flex:1, height:8,
                  clipPath:"polygon(0 0,calc(100% - 2px) 0,100% 2px,100% 100%,2px 100%,0 calc(100% - 2px))",
                  transition:"background 0.12s ease",
                  background: isFilled
                    ? i < segments*0.5 ? "#f59e0b"
                      : i < segments*0.8 ? "#fbbf24"
                      : "#ef4444"
                    : "rgba(255,255,255,0.04)",
                  boxShadow: isFilled
                    ? `0 0 ${isActive?10:4}px rgba(245,158,11,${isActive?0.8:0.35})`
                    : "none",
                }}/>
              );
            })}
          </div>
        </div>

        {/* Percent */}
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:8 }}>
          <span style={{
            fontFamily:"'DM Mono',monospace",
            fontSize:"clamp(10px,2vw,13px)",
            color:"rgba(245,158,11,0.6)",
            letterSpacing:"0.1em",
          }}>
            {pct}%
          </span>
        </div>

        {/* Status */}
        <p style={{
          fontFamily:"'DM Mono',monospace",
          fontSize:9, letterSpacing:"0.45em",
          textTransform:"uppercase",
          color:"rgba(245,158,11,0.38)",
          margin:0,
        }}>
          {label}
        </p>

      </div>
    </div>
  );
}
