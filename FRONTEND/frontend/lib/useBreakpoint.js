// lib/useBreakpoint.js
// Shared hook — returns { isMobile, isTablet, width }
// isMobile = < 640px,  isTablet = < 1024px
"use client";
import { useState, useEffect } from "react";

export default function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return {
    width,
    isMobile: width < 640,
    isTablet: width < 1024,
  };
}
