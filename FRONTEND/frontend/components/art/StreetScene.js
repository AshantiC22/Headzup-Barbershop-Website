"use client";
// The hero painting: an old street at night in river fog, a big moon behind a
// spire, and the shop's barber pole standing in the road like a gas lamp.
//
// The pole is the shop's open sign. While the shop is open its globe is lit,
// it throws light on the wet cobbles, and the stripes turn; when the shop is
// closed the globe is cold glass and the pole stands still.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { drawLampPole, lampGeometry, paintPoleTile, poleEdges, streetLayout } from "@/lib/painter";
import { useScenePainter } from "./useScenePainter";

const POLE_SPEED = 22; // px per second of stripe travel

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function StreetScene({ open = false }) {
  const { palette } = useTheme();
  const boxRef = useRef(null);
  const paintSlot = useRef(null);
  const poleRef = useRef(null);
  const fogSlot = useRef(null);
  const [size, setSize] = useState(null);

  // Which painting (size + palette) has finished going down. The fog and the
  // lamp come up only once the painting under them is complete.
  const [paintedFor, setPaintedFor] = useState(null);
  const paintKey = size ? `${size.w}x${size.h}:${palette}` : null;
  const painted = paintedFor === paintKey;
  const lit = open && painted;
  const onPainted = useCallback((key) => {
    setPaintedFor(key);
    try {
      sessionStorage.setItem("hu_painted", "1");
    } catch {}
  }, []);
  const requestPaint = useScenePainter({ paint: paintSlot, fore: fogSlot }, onPainted);
  const lastPalette = useRef(null);
  const poleState = useRef(null);
  const visible = useRef(true);

  // Track the box size; ignore small height changes from mobile URL bars.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    let t;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width),
        h = Math.round(r.height);
      setSize((prev) => {
        if (prev && Math.abs(prev.w - w) < 2 && Math.abs(prev.h - h) < 80) return prev;
        return { w, h };
      });
    };
    measure();
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(measure, 120);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, []);

  // Paint the street.
  useEffect(() => {
    if (!size) return;
    const { w, h } = size;
    let firstThisSession = false;
    try {
      firstThisSession = !sessionStorage.getItem("hu_painted");
    } catch {}
    const themeChanged = lastPalette.current && lastPalette.current !== palette;
    lastPalette.current = palette;
    requestPaint.current?.({
      scene: "street",
      key: `${w}x${h}:${palette}`,
      w,
      h,
      mode: palette,
      seed: 7,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      animate: !prefersReducedMotion() && (firstThisSession || themeChanged),
      duration: themeChanged ? 900 : 1500,
    });
  }, [size, palette, requestPaint]);

  // Size the pole's canvas and paint its stripe tile.
  useEffect(() => {
    if (!size || !poleRef.current) return;
    const L = streetLayout(size.w, size.h);
    const G = lampGeometry(L);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = G.width;
    const ox = L.pole.x - cw / 2,
      oy = G.top - 2;
    const ch = L.pole.base - oy + 2;
    const canvas = poleRef.current;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    Object.assign(canvas.style, { width: `${cw}px`, height: `${ch}px`, left: `${ox}px`, top: `${oy}px` });
    const { tile, period } = paintPoleTile({ width: L.pole.w, mode: palette, dpr });
    poleState.current = {
      ctx: canvas.getContext("2d"),
      dpr,
      cw,
      ch,
      ox,
      oy,
      L,
      tile,
      period,
      edges: poleEdges(L.pole.w, G.bodyBottom - G.bodyTop),
      offset: poleState.current?.offset || 0,
      mode: palette,
      lit: poleState.current?.lit || false,
    };
    const s = poleState.current;
    s.draw = () => {
      s.ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      s.ctx.clearRect(0, 0, s.cw, s.ch);
      drawLampPole(s.ctx, {
        L: s.L,
        tile: s.tile,
        period: s.period,
        offset: s.offset,
        mode: s.mode,
        edges: s.edges,
        lit: s.lit,
        ox: s.ox,
        oy: s.oy,
      });
    };
    s.draw();
  }, [size, palette]);

  // Light or put out the globe.
  useEffect(() => {
    const s = poleState.current;
    if (!s) return;
    s.lit = lit;
    s.draw?.();
  }, [lit, size, palette]);

  // Turn the stripes while open; pause when off-screen or the tab is hidden.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = e.isIntersecting;
      },
      { threshold: 0 },
    );
    io.observe(el);
    if (!open || prefersReducedMotion()) return () => io.disconnect();
    let raf,
      last = performance.now(),
      acc = 0;
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
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [open, size, palette]);

  const L = size ? streetLayout(size.w, size.h) : null;
  return (
    <div ref={boxRef} className={`street ${lit ? "is-lit" : ""}`} aria-hidden="true">
      <div ref={paintSlot} className="street-paint" />
      {L && (
        <>
          <div
            className="lamp-pool"
            style={{
              left: L.pole.x,
              top: L.ground + L.h * 0.03,
              "--pool-w": `${Math.round(L.pole.w * (L.narrow ? 7 : 11))}px`,
              "--pool-h": `${Math.round(L.h * 0.1)}px`,
            }}
          />
        </>
      )}
      <canvas ref={poleRef} className="street-pole" />
      {L && (
        <div
          className="lamp-glow"
          style={{ left: L.pole.x, top: L.pole.globeY, "--glow-size": `${Math.round(L.pole.globeR * 13)}px` }}
        />
      )}
      <div ref={fogSlot} className={`street-fog ${painted ? "is-on" : ""}`} />
    </div>
  );
}
