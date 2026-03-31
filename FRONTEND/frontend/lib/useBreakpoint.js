"use client";
// lib/useBreakpoint.js
// Returns { isMobile, isTablet, isSmall, width }
// isSmall  = < 380px  (iPhone SE, Galaxy A series small)
// isMobile = < 640px  (all phones)
// isTablet = < 1024px (tablets and small laptops)

import { useState, useEffect } from "react";

export default function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  useEffect(() => {
    let raf;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener("resize", handler, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handler);
    };
  }, []);

  return {
    width,
    isSmall: width < 380, // iPhone SE, tiny Androids
    isMobile: width < 640, // all phones
    isTablet: width < 1024, // tablets
  };
}
