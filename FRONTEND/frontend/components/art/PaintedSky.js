"use client";
// A painted sky that sits behind a whole page (sign-in, confirmations, 404).
// It paints once per size/theme and never animates after that.
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { composeSky, paint } from "@/lib/painter";

export default function PaintedSky({ seed = 3, light = true, fixed = true, className = "" }) {
  const { palette } = useTheme();
  const ref = useRef(null);
  const [size, setSize] = useState(null);

  useEffect(() => {
    let t;
    const measure = () => {
      const el = ref.current?.parentElement;
      const w = fixed ? window.innerWidth : el?.clientWidth || window.innerWidth;
      const h = fixed ? window.innerHeight : el?.clientHeight || window.innerHeight;
      setSize((p) => (p && Math.abs(p.w - w) < 2 && Math.abs(p.h - h) < 100 ? p : { w, h }));
    };
    measure();
    const onResize = () => { clearTimeout(t); t = setTimeout(measure, 150); };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(t); };
  }, [fixed]);

  useEffect(() => {
    if (!size || !ref.current) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const compose = composeSky({ w: size.w, h: size.h, mode: palette, seed, light });
    return paint(ref.current, { width: size.w, height: size.h, dpr, compose, animate: false });
  }, [size, palette, seed, light]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`painted-sky ${fixed ? "is-fixed" : ""} ${className}`}
      style={size ? { width: size.w, height: size.h } : undefined}
    />
  );
}
