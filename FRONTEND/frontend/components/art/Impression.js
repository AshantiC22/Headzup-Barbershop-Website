"use client";
// A photo, re-painted as an oil sketch once it scrolls into view.
//   reveal="hover"  the real photo shows through on hover/focus (gallery)
//   reveal="never"  always the sketch (portraits)
// The <img> underneath is always there for screen readers, slow phones and
// images the painter can't read (cross-origin without CORS).
//
// Painting a photo takes a few hundred milliseconds on a phone, so it happens
// in one shared worker; the main thread only draws the finished bitmap.
import { useEffect, useRef, useState } from "react";
import { paintImage } from "@/lib/painter";

let worker = null; // null: not tried yet, false: unavailable
let nextId = 0;
const waiting = new Map();

function painter() {
  if (worker !== null) return worker;
  const supported =
    typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap === "function";
  if (!supported) return (worker = false);
  try {
    worker = new Worker(new URL("../../lib/impression.worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      waiting.get(data.id)?.(data);
      waiting.delete(data.id);
    };
  } catch {
    worker = false;
  }
  return worker;
}

/** Resolves to a painted ImageBitmap, or null if the photo can't be fetched or read. */
function paintOffThread(w, src, options) {
  const id = ++nextId;
  const url = new URL(src, window.location.href).href;
  return new Promise((resolve) => {
    waiting.set(id, (data) => resolve(data.ok ? data.result : null));
    w.postMessage({ id, url, ...options });
  });
}

/** The fallback for browsers without OffscreenCanvas: load and paint here. */
function paintHere(canvas, src, options) {
  return new Promise((resolve) => {
    const img = new Image();
    if (/^https?:/i.test(src) && !src.startsWith(window.location.origin)) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(paintImage(canvas, img, options));
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

export default function Impression({
  src,
  alt = "",
  seed = 9,
  detail = 1,
  reveal = "never",
  className = "",
  imgStyle,
  priority = false,
  sizes,
}) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const [state, setState] = useState("idle"); // idle, then painted or failed

  useEffect(() => {
    const box = boxRef.current;
    if (!box || !src) return;
    let done = false;
    let cancelled = false;
    const run = async () => {
      if (done) return;
      done = true;
      const r = box.getBoundingClientRect();
      if (!r.width || !r.height || !canvasRef.current) {
        setState("failed");
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // paint at a modest resolution: brushwork doesn't need retina pixels
      const scale = Math.min(1, 520 / Math.max(r.width, r.height));
      const options = { width: r.width * scale, height: r.height * scale, dpr: dpr * 0.9, seed, detail };
      const w = painter();
      if (!w) {
        const ok = await paintHere(canvasRef.current, src, options);
        if (!cancelled) setState(ok ? "painted" : "failed");
        return;
      }
      const result = await paintOffThread(w, src, options);
      const canvas = canvasRef.current;
      if (cancelled || !canvas) {
        result?.close();
        return;
      }
      if (!result) {
        setState("failed");
        return;
      }
      canvas.width = result.width;
      canvas.height = result.height;
      canvas.getContext("2d").drawImage(result, 0, 0);
      result.close();
      setState("painted");
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 600 });
          else setTimeout(run, 60);
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(box);
    return () => {
      io.disconnect();
      done = true;
      cancelled = true;
    };
  }, [src, seed, detail]);

  return (
    <div ref={boxRef} className={`impression reveal-${reveal} is-${state} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" sizes={sizes} style={imgStyle} />
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
