"use client";
// ─────────────────────────────────────────────────────────────────────────────
// A photo, re-painted as brushwork once it scrolls into view.
//   reveal="hover"  — the real photo shows through on hover/focus (gallery)
//   reveal="never"  — always the painting (portraits)
// The <img> underneath is always there for screen readers, slow phones and
// images the painter can't read (cross-origin without CORS).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import { paintImage } from "@/lib/painter";

export default function Impression({
  src, alt = "", seed = 9, detail = 1, reveal = "never", className = "", imgStyle, priority = false, sizes,
}) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const [state, setState] = useState("idle"); // idle → painted | failed

  useEffect(() => {
    const box = boxRef.current;
    if (!box || !src) return;
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      const img = new Image();
      if (/^https?:/i.test(src) && !src.startsWith(window.location.origin)) img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => {
        const r = box.getBoundingClientRect();
        if (!r.width || !r.height || !canvasRef.current) { setState("failed"); return; }
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        // paint at a modest resolution: brushwork doesn't need retina pixels
        const scale = Math.min(1, 520 / Math.max(r.width, r.height));
        const ok = paintImage(canvasRef.current, img, {
          width: r.width * scale, height: r.height * scale, dpr: dpr * 0.9, seed, detail,
        });
        setState(ok ? "painted" : "failed");
      };
      img.onerror = () => setState("failed");
      img.src = src;
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        io.disconnect();
        if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 600 });
        else setTimeout(run, 60);
      }
    }, { rootMargin: "200px" });
    io.observe(box);
    return () => { io.disconnect(); done = true; };
  }, [src, seed, detail]);

  return (
    <div ref={boxRef} className={`impression reveal-${reveal} is-${state} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" sizes={sizes} style={imgStyle} />
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
