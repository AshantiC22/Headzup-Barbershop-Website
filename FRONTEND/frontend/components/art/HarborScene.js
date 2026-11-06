"use client";
// The hero painting: a harbor at sunrise (or under a gold-flecked night), and
// out of the water an impossibly tall barber pole that disappears into the
// clouds. The pole turns only while the shop is open — the real-world rule
// for barber poles, kept as a working signal on the site.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { drawPole, harborLayout, paintPoleTile, poleEdges } from "@/lib/painter";
import { useScenePainter } from "./useScenePainter";

const POLE_SPEED = 24; // px per second of stripe travel

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function HarborScene({ turning = false, onLayout }) {
  const { palette } = useTheme();
  const boxRef = useRef(null);
  const paintSlot = useRef(null);
  const poleRef = useRef(null);
  const foreSlot = useRef(null);
  const [size, setSize] = useState(null);
  // Which painting (size + palette) has finished going down. The foreground
  // wisps fade in only once the painting under them is complete.
  const [paintedFor, setPaintedFor] = useState(null);
  const paintKey = size ? `${size.w}x${size.h}:${palette}` : null;
  const painted = paintedFor === paintKey;
  const onPainted = useCallback((key) => {
    setPaintedFor(key);
    try { sessionStorage.setItem("hu_painted", "1"); } catch {}
  }, []);
  const requestPaint = useScenePainter({ paint: paintSlot, fore: foreSlot }, onPainted);
  const lastPalette = useRef(null);
  const poleState = useRef(null);
  const visible = useRef(true);
  const onLayoutRef = useRef(onLayout);
  useEffect(() => { onLayoutRef.current = onLayout; }, [onLayout]);

  // Track the box size; ignore small height changes from mobile URL bars.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    let t;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      setSize((prev) => {
        if (prev && Math.abs(prev.w - w) < 2 && Math.abs(prev.h - h) < 80) return prev;
        return { w, h };
      });
    };
    measure();
    const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(measure, 120); });
    ro.observe(el);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);

  // Paint the scene.
  useEffect(() => {
    if (!size) return;
    const { w, h } = size;
    onLayoutRef.current?.(harborLayout(w, h));
    let firstThisSession = false;
    try { firstThisSession = !sessionStorage.getItem("hu_painted"); } catch {}
    const themeChanged = lastPalette.current && lastPalette.current !== palette;
    lastPalette.current = palette;
    requestPaint.current?.({
      scene: "harbor", key: `${w}x${h}:${palette}`, w, h, mode: palette, seed: 7,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      animate: !prefersReducedMotion() && (firstThisSession || themeChanged),
      duration: themeChanged ? 900 : 1300,
    });
  }, [size, palette, requestPaint]);

  // Build the pole's stripe tile and geometry.
  useEffect(() => {
    if (!size || !poleRef.current) return;
    const L = harborLayout(size.w, size.h);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = L.pole.w;
    const pad = Math.ceil(pw * 0.12);
    const cw = pw + pad * 2;
    const top = -40;
    const capH = Math.round(pw * 0.7);
    const ch = L.horizon - top + Math.round(capH * 0.35);
    const canvas = poleRef.current;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    canvas.style.left = `${L.pole.x - cw / 2}px`;
    canvas.style.top = `${top}px`;
    const { tile, period } = paintPoleTile({ width: pw, mode: palette, dpr });
    poleState.current = {
      ctx: canvas.getContext("2d"), dpr, pw, pad, cw, ch, tile, period,
      edges: poleEdges(pw, ch - capH), offset: poleState.current?.offset || 0, mode: palette,
    };
    const s = poleState.current;
    const draw = () => {
      s.ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      s.ctx.clearRect(0, 0, s.cw, s.ch);
      s.ctx.translate(s.pad, 0);
      drawPole(s.ctx, { width: s.pw, height: s.ch, tile: s.tile, period: s.period, offset: s.offset, mode: s.mode, edges: s.edges });
    };
    s.draw = draw;
    draw();
  }, [size, palette]);

  // Turn the pole while open; pause when off-screen or the tab is hidden.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting; }, { threshold: 0 });
    io.observe(el);
    if (!turning || prefersReducedMotion()) return () => io.disconnect();
    let raf, last = performance.now(), acc = 0;
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      const s = poleState.current;
      if (s && visible.current && !document.hidden && acc >= 1 / 30) {
        s.offset += POLE_SPEED * acc;
        acc = 0;
        s.draw?.();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [turning, size, palette]);

  return (
    <div ref={boxRef} className="harbor" aria-hidden="true">
      <div ref={paintSlot} className="harbor-paint" />
      <canvas ref={poleRef} className="harbor-pole" />
      <div ref={foreSlot} className={`harbor-fore ${painted ? "is-on" : ""}`} />
    </div>
  );
}
