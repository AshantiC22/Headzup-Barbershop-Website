"use client";
// Owns the canvases for a painted scene and paints into them, in a worker when
// the browser can hand a canvas to one (everything current; Safari since 16.4)
// and on the main thread otherwise.
//
// The canvases are created here, inside the slot elements, rather than in JSX:
// a canvas can only be transferred to a worker once, and React's development
// double-mount would otherwise try to transfer the same element twice.
//
//   const request = useScenePainter({ paint: paintSlot, fore: foreSlot }, onDone);
//   request.current?.({ scene: "harbor", key, w, h, dpr, mode, seed, animate, duration });
import { useEffect, useRef } from "react";
import { composeForegroundClouds, composeHarbor, composeSky, drawStrokes, paint } from "@/lib/painter";

const canTransfer = () =>
  typeof Worker !== "undefined" &&
  typeof HTMLCanvasElement !== "undefined" &&
  "transferControlToOffscreen" in HTMLCanvasElement.prototype;

function paintHere(els, req, onDone) {
  const compose = req.scene === "harbor" ? composeHarbor(req) : composeSky(req);
  return paint(els.paint, {
    width: req.w, height: req.h, dpr: req.dpr, compose, animate: req.animate, duration: req.duration,
    onDone: () => {
      if (els.fore) {
        els.fore.width = Math.round(req.w * req.dpr);
        els.fore.height = Math.round(req.h * req.dpr);
        const ctx = els.fore.getContext("2d");
        ctx.setTransform(req.dpr, 0, 0, req.dpr, 0, 0);
        drawStrokes(ctx, composeForegroundClouds(req));
      }
      onDone(req.key);
    },
  });
}

export function useScenePainter(slots, onDone) {
  const request = useRef(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const els = {};
    for (const [name, slot] of Object.entries(slots)) {
      if (!slot.current) continue;
      els[name] = document.createElement("canvas");
      slot.current.appendChild(els[name]);
    }
    const done = (key) => onDoneRef.current?.(key);

    let worker = null;
    if (canTransfer()) {
      try {
        worker = new Worker(new URL("../../lib/paint.worker.js", import.meta.url), { type: "module" });
        const offscreen = Object.fromEntries(Object.entries(els).map(([n, c]) => [n, c.transferControlToOffscreen()]));
        worker.postMessage({ type: "canvases", ...offscreen }, Object.values(offscreen));
        worker.onmessage = (e) => { if (e.data?.type === "done") done(e.data.key); };
      } catch {
        worker?.terminate();
        worker = null;
      }
    }

    let cancel = () => {};
    request.current = (req) => {
      if (worker) worker.postMessage({ type: "paint", ...req });
      else { cancel(); cancel = paintHere(els, req, done); }
    };

    return () => {
      cancel();
      worker?.terminate();
      Object.values(els).forEach((c) => c.remove());
      request.current = null;
    };
    // The slot refs are stable for the component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return request;
}
