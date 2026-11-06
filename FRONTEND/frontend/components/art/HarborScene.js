"use client";
// ─────────────────────────────────────────────────────────────────────────────
// The hero painting: a harbor at sunrise (or under a gold-flecked night), and
// out of the water an impossibly tall barber pole that disappears into the
// clouds. The pole turns only while the shop is open — the real-world rule
// for barber poles, kept as a working signal on the site.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  composeHarbor, composeForegroundClouds, drawPole, drawStrokes, harborLayout,
  paint, paintPoleTile, poleEdges,
} from "@/lib/painter";

const POLE_SPEED = 24; // px per second of stripe travel

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function HarborScene({ turning = false, onLayout }) {
  const { palette } = useTheme();
  const boxRef = useRef(null);
  const paintRef = useRef(null);
  const poleRef = useRef(null);
  const foreRef = useRef(null);
  const [size, setSize] = useState(null);
  const [painted, setPainted] = useState(false);
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
    if (!size || !paintRef.current) return;
    const { w, h } = size;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const compose = composeHarbor({ w, h, mode: palette, seed: 7 });
    onLayoutRef.current?.(compose.layout);

    let firstThisSession = false;
    try { firstThisSession = !sessionStorage.getItem("hu_painted"); } catch {}
    const themeChanged = lastPalette.current && lastPalette.current !== palette;
    const animate = !prefersReducedMotion() && (firstThisSession || themeChanged);
    lastPalette.current = palette;
    setPainted(false);

    const cancel = paint(paintRef.current, {
      width: w, height: h, dpr, compose, animate, duration: themeChanged ? 900 : 1300,
      onDone: () => {
        setPainted(true);
        try { sessionStorage.setItem("hu_painted", "1"); } catch {}
      },
    });

    // Foreground wisps in front of the pole.
    const fore = foreRef.current;
    if (fore) {
      fore.width = Math.round(w * dpr); fore.height = Math.round(h * dpr);
      const fctx = fore.getContext("2d");
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.clearRect(0, 0, w, h);
      drawStrokes(fctx, composeForegroundClouds({ w, h, mode: palette, seed: 7 }));
    }
    return cancel;
  }, [size, palette]);

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
      <canvas ref={paintRef} className="harbor-paint" />
      <canvas ref={poleRef} className="harbor-pole" />
      <canvas ref={foreRef} className={`harbor-fore ${painted ? "is-on" : ""}`} />
    </div>
  );
}
