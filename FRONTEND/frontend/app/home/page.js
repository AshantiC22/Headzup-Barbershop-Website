"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import LoadingScreen from "@/lib/LoadingScreen";

const sf = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

const SERVICES = [
  {
    name: "Haircut & Shave",
    price: "$35",
    duration: "30 min",
    tag: "Signature",
  },
  { name: "Haircut", price: "$30", duration: "30 min", tag: "Classic" },
  {
    name: "Senior Cut and Shave",
    price: "$30",
    duration: "30 min",
    tag: "Senior",
  },
  { name: "Kids Cutz (1–12)", price: "$25", duration: "30 min", tag: "Kids" },
  { name: "Line and Shave", price: "$25", duration: "30 min", tag: "Combo" },
  { name: "Senior Cut", price: "$25", duration: "30 min", tag: "Senior" },
  { name: "Beard Trim", price: "$20", duration: "15 min", tag: "Beard" },
  { name: "Line", price: "$20", duration: "15 min", tag: "Clean Up" },
  { name: "Shave", price: "$20", duration: "30 min", tag: "Shave" },
  { name: "Kids Line", price: "$15", duration: "30 min", tag: "Kids" },
  { name: "Senior Line", price: "$15", duration: "30 min", tag: "Senior" },
];

const REVIEWS = [
  {
    quote:
      "This man is an amazing barber with great energy and a great personality. Most importantly the cuts are fire!! Go book with him.",
    name: "Ronnie E.",
    rating: 5,
  },
  {
    quote:
      "Best fade in Hattiesburg, hands down. I drive 40 minutes just to sit in that chair. Worth every mile.",
    name: "Marcus T.",
    rating: 5,
  },
  {
    quote:
      "Came in first time, walked out looking like a new man. The lineup was immaculate. Already booked my next one.",
    name: "DeShawn K.",
    rating: 5,
  },
  {
    quote:
      "My son has been going here since he was 3. Fantastic with kids and the cut is always perfect. Love this place.",
    name: "Tanya W.",
    rating: 5,
  },
];

const TICKER_ITEMS = [
  "PRECISION FADES",
  "CLEAN LINEUPS",
  "KIDS CUTZ",
  "BEARD TRIMS",
  "SENIOR CUTS",
  "SHAVES",
  "BOOK ONLINE",
  "HATTIESBURG MS",
];

export default function HomePage() {
  const canvasRef = useRef(null);
  const heroRef = useRef(null);
  const router = useRouter();

  const [pageReady, setPageReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [homeBarbers, setHomeBarbers] = useState([]);
  const [activeReview, setActiveReview] = useState(0);
  const [hoveredSvc, setHoveredSvc] = useState(null);
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Auth check
  const checkAuth = useCallback(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      setIsLoggedIn(false);
      setIsStaff(false);
      return;
    }
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/dashboard/`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
      .then((r) => r.json())
      .then((d) => {
        setIsLoggedIn(true);
        setIsStaff(!!d.is_staff);
      })
      .catch(() => {
        setIsLoggedIn(false);
        setIsStaff(false);
      });
  }, []);

  useEffect(() => {
    checkAuth();
    window.addEventListener("focus", checkAuth);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) checkAuth();
    });
    return () => window.removeEventListener("focus", checkAuth);
  }, [checkAuth]);

  // Load barbers
  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/barbers/`,
      {
        headers: localStorage.getItem("access")
          ? { Authorization: `Bearer ${localStorage.getItem("access")}` }
          : {},
      },
    )
      .then((r) => r.json())
      .then((d) => setHomeBarbers(Array.isArray(d) ? d : d.results || []))
      .catch(() => {});
  }, []);

  // Scroll tracking
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mouse tracking for parallax
  useEffect(() => {
    const onMouse = (e) =>
      setMousePos({
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
      });
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  // THREE.js particles
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Particle geometry — scattered starfield
    const count = window.innerWidth < 768 ? 800 : 2000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 20;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const mat = new THREE.PointsMaterial({
      size: 0.025,
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.25,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    camera.position.z = 5;

    let raf;
    let time = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      time += 0.0005;
      points.rotation.y = time;
      points.rotation.x = time * 0.4;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, []);

  // Review auto-rotate
  useEffect(() => {
    const t = setInterval(
      () => setActiveReview((i) => (i + 1) % REVIEWS.length),
      5000,
    );
    return () => clearInterval(t);
  }, []);

  // Scroll reveal
  useEffect(() => {
    if (!pageReady) return;
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pageReady]);

  const handleBookNow = (e) => {
    e.preventDefault();
    const token = localStorage.getItem("access");
    router.push(token ? "/book" : "/login");
  };

  return (
    <>
      {!pageReady && <LoadingScreen onComplete={() => setPageReady(true)} />}

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap");

        *,
        *::before,
        *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html {
          background: #040404;
          overflow-x: hidden;
        }
        body {
          background: #040404;
          color: white;
          font-family: "DM Mono", monospace;
          overflow-x: hidden;
        }

        /* Reveal animations */
        .reveal {
          opacity: 0;
          transform: translateY(32px);
          transition:
            opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.delay-1 {
          transition-delay: 0.1s;
        }
        .reveal.delay-2 {
          transition-delay: 0.2s;
        }
        .reveal.delay-3 {
          transition-delay: 0.3s;
        }
        .reveal.delay-4 {
          transition-delay: 0.4s;
        }
        .reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }

        /* Ticker */
        @keyframes ticker {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .ticker-track {
          display: flex;
          animation: ticker 20s linear infinite;
          width: max-content;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }

        /* Hero text flicker */
        @keyframes flicker {
          0%,
          100% {
            opacity: 1;
          }
          41% {
            opacity: 1;
          }
          42% {
            opacity: 0.8;
          }
          43% {
            opacity: 1;
          }
          77% {
            opacity: 1;
          }
          78% {
            opacity: 0.85;
          }
          79% {
            opacity: 1;
          }
        }

        /* Pulse green dot */
        @keyframes pulse-green {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
          }
        }

        /* Shimmer on price tags */
        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        /* Mobile menu */
        @keyframes menuIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 639px) {
          .desktop-only {
            display: none !important;
          }
        }
        @media (min-width: 640px) {
          .mobile-only {
            display: none !important;
          }
        }

        /* Book button */
        .book-btn {
          display: inline-block;
          padding: 16px 40px;
          background: #f59e0b;
          color: black;
          font-family: "Syncopate", sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          text-decoration: none;
          border: none;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
        }
        .book-btn::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          right: 0;
          bottom: 0;
          background: white;
          transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 0;
        }
        .book-btn:hover::before {
          left: 0;
        }
        .book-btn span {
          position: relative;
          z-index: 1;
        }

        /* Service row hover */
        .svc-row {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .svc-row:hover {
          padding-left: 16px !important;
          border-color: rgba(245, 158, 11, 0.4) !important;
        }

        /* Nav link */
        .nav-link {
          transition: color 0.2s;
        }
        .nav-link:hover {
          color: #f59e0b !important;
        }

        /* Outline text */
        .outline-text {
          -webkit-text-stroke: 1px rgba(255, 255, 255, 0.15);
          color: transparent;
        }
      `}</style>

      {/* ── PARTICLE CANVAS ── */}
      <div
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* ── GRID ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* ── GRAIN ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.035,
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.svg')",
        }}
      />

      {/* ── AMBIENT GLOWS ── */}
      <div
        style={{
          position: "fixed",
          top: "-20%",
          right: "-10%",
          width: 600,
          height: 600,
          background:
            "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "30%",
          left: "-15%",
          width: 500,
          height: 500,
          background:
            "radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 10 }}>
        {/* ════════════════ NAV ════════════════ */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: scrollY > 60 ? "rgba(4,4,4,0.95)" : "transparent",
            backdropFilter: scrollY > 60 ? "blur(20px)" : "none",
            borderBottom:
              scrollY > 60 ? "1px solid rgba(255,255,255,0.06)" : "none",
            transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              padding: "0 28px",
              height: 64,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* Logo */}
            <a
              href="/"
              style={{
                ...sf,
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: "-0.06em",
                textDecoration: "none",
                color: "white",
                animation: "flicker 8s ease-in-out infinite",
              }}
            >
              HEADZ
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </a>

            {/* Desktop nav */}
            <div
              className="desktop-only"
              style={{ display: "flex", gap: 32, alignItems: "center" }}
            >
              {["services", "barber", "reviews", "location"].map((id) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="nav-link"
                  style={{
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: "#71717a",
                    textDecoration: "none",
                  }}
                >
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </a>
              ))}
            </div>

            {/* CTA group */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {isLoggedIn && isStaff && (
                <a
                  href="/barber-dashboard"
                  className="desktop-only"
                  style={{
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#f59e0b",
                    textDecoration: "none",
                    border: "1px solid rgba(245,158,11,0.3)",
                    padding: "9px 16px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(245,158,11,0.1)";
                    e.currentTarget.style.borderColor = "#f59e0b";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
                  }}
                >
                  Dashboard
                </a>
              )}
              {!isLoggedIn && (
                <a
                  href="/barber-login"
                  className="desktop-only"
                  style={{
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#52525b",
                    textDecoration: "none",
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: "9px 16px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#f59e0b";
                    e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#52525b";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.08)";
                  }}
                >
                  Barber Login
                </a>
              )}
              <a
                href="/book"
                onClick={handleBookNow}
                className="book-btn desktop-only"
                style={{ padding: "12px 24px", fontSize: 8 }}
              >
                <span>Book Now</span>
              </a>

              {/* Hamburger */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="mobile-only"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 8,
                  minHeight: 44,
                  minWidth: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: 22,
                    height: 1.5,
                    background: menuOpen ? "#f59e0b" : "white",
                    transition: "all 0.3s",
                    transform: menuOpen
                      ? "rotate(45deg) translate(4.5px, 4.5px)"
                      : "none",
                  }}
                />
                <span
                  style={{
                    display: "block",
                    width: 22,
                    height: 1.5,
                    background: menuOpen ? "#f59e0b" : "white",
                    transition: "all 0.3s",
                    opacity: menuOpen ? 0 : 1,
                  }}
                />
                <span
                  style={{
                    display: "block",
                    width: 22,
                    height: 1.5,
                    background: menuOpen ? "#f59e0b" : "white",
                    transition: "all 0.3s",
                    transform: menuOpen
                      ? "rotate(-45deg) translate(4.5px, -4.5px)"
                      : "none",
                  }}
                />
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div
              style={{
                background: "rgba(4,4,4,0.98)",
                backdropFilter: "blur(20px)",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                padding: "20px 28px 28px",
                animation: "menuIn 0.25s ease",
              }}
            >
              {["services", "barber", "reviews", "location"].map((id) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block",
                    ...sf,
                    fontSize: 8,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: "#71717a",
                    textDecoration: "none",
                    padding: "14px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#f59e0b")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#71717a")
                  }
                >
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </a>
              ))}
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <a
                  href="/book"
                  onClick={handleBookNow}
                  className="book-btn"
                  style={{ textAlign: "center" }}
                >
                  <span>Book Now</span>
                </a>
                {!isLoggedIn && (
                  <a
                    href="/barber-login"
                    style={{
                      ...sf,
                      fontSize: 7,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "#52525b",
                      textDecoration: "none",
                      border: "1px solid rgba(255,255,255,0.08)",
                      padding: "14px",
                      textAlign: "center",
                      transition: "all 0.2s",
                    }}
                  >
                    Barber Login
                  </a>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* ════════════════ HERO ════════════════ */}
        <section
          ref={heroRef}
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 28px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Issue number — editorial feel */}
          <div
            style={{
              position: "absolute",
              top: 80,
              right: 28,
              ...mono,
              fontSize: 8,
              color: "#27272a",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
            }}
          >
            Vol.01 — Est. Hattiesburg MS
          </div>

          {/* Decorative lines */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "20%",
              width: 1,
              height: "60%",
              background:
                "linear-gradient(to bottom, transparent, rgba(245,158,11,0.3), transparent)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "20%",
              width: 1,
              height: "60%",
              background:
                "linear-gradient(to bottom, transparent, rgba(245,158,11,0.15), transparent)",
            }}
          />

          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              width: "100%",
              paddingTop: 80,
            }}
          >
            {/* Pre-heading */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  background: "#22c55e",
                  borderRadius: "50%",
                  animation: "pulse-green 2s infinite",
                  flexShrink: 0,
                }}
              />
              <p
                style={{
                  ...mono,
                  fontSize: 9,
                  color: "#4ade80",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                }}
              >
                Now Accepting Clients — Hattiesburg, MS
              </p>
            </div>

            {/* Main headline — editorial split layout */}
            <div style={{ position: "relative", marginBottom: 40 }}>
              {/* Big outline background word */}
              <p
                className="outline-text"
                style={{
                  ...sf,
                  fontSize: "clamp(5rem,18vw,16rem)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  lineHeight: 0.85,
                  letterSpacing: "-0.06em",
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `translate(-50%,-50%) translate(${mousePos.x * -15}px, ${mousePos.y * -10}px)`,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  transition: "transform 0.1s ease",
                  userSelect: "none",
                }}
              >
                CUT
              </p>

              <h1
                style={{
                  ...sf,
                  fontSize: "clamp(2.8rem,8vw,7rem)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  lineHeight: 0.88,
                  letterSpacing: "-0.04em",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <span style={{ display: "block", color: "white" }}>Fresh</span>
                <span
                  style={{
                    display: "block",
                    color: "#f59e0b",
                    fontStyle: "italic",
                  }}
                >
                  Cuts,
                </span>
                <span style={{ display: "block", color: "white" }}>Sharp</span>
                <span style={{ display: "block" }}>
                  <span style={{ color: "white" }}>Lines</span>
                  <span style={{ color: "#f59e0b" }}>.</span>
                </span>
              </h1>
            </div>

            <p
              style={{
                ...mono,
                fontSize: "clamp(12px,1.8vw,15px)",
                color: "#71717a",
                maxWidth: 440,
                lineHeight: 1.8,
                marginBottom: 44,
              }}
            >
              Hattiesburg's premier barbershop. Walk in looking regular, walk
              out looking legendary. Book your slot before it's gone.
            </p>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <a href="/book" onClick={handleBookNow} className="book-btn">
                <span>Book Your Cut →</span>
              </a>
              <a
                href="#services"
                style={{
                  ...sf,
                  fontSize: 8,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "#52525b",
                  textDecoration: "none",
                  padding: "16px 24px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#f59e0b";
                  e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#52525b";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                See Services
              </a>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: 0,
                marginTop: 60,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                paddingTop: 32,
                flexWrap: "wrap",
              }}
            >
              {[
                { value: "5★", label: "Rating" },
                { value: "100+", label: "Happy Clients" },
                { value: "11", label: "Services" },
                { value: "24/7", label: "Online Booking" },
              ].map(({ value, label }, i) => (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    minWidth: 120,
                    padding: "0 24px 0 0",
                    borderRight:
                      i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    paddingLeft: i > 0 ? 24 : 0,
                    marginBottom: 16,
                  }}
                >
                  <p
                    style={{
                      ...sf,
                      fontSize: "clamp(1.4rem,3vw,2rem)",
                      fontWeight: 900,
                      color: "#f59e0b",
                      margin: "0 0 4px",
                    }}
                  >
                    {value}
                  </p>
                  <p
                    style={{
                      ...mono,
                      fontSize: 9,
                      color: "#52525b",
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll hint */}
          <div
            style={{
              position: "absolute",
              bottom: 32,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <p
              style={{
                ...mono,
                fontSize: 8,
                color: "#27272a",
                letterSpacing: "0.4em",
                textTransform: "uppercase",
              }}
            >
              Scroll
            </p>
            <div
              style={{
                width: 1,
                height: 40,
                background:
                  "linear-gradient(to bottom, rgba(245,158,11,0.5), transparent)",
              }}
            />
          </div>
        </section>

        {/* ════════════════ TICKER ════════════════ */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(245,158,11,0.04)",
            overflow: "hidden",
            padding: "14px 0",
          }}
        >
          <div className="ticker-track">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span
                key={i}
                style={{
                  ...sf,
                  fontSize: 8,
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  color: "#f59e0b",
                  padding: "0 32px",
                  flexShrink: 0,
                  opacity: 0.7,
                }}
              >
                ✦ {item}
              </span>
            ))}
          </div>
        </div>

        {/* ════════════════ SERVICES ════════════════ */}
        <section id="services" style={{ padding: "100px 28px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div
              className="reveal"
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginBottom: 56,
                flexWrap: "wrap",
                gap: 20,
              }}
            >
              <div>
                <p
                  style={{
                    ...mono,
                    fontSize: 8,
                    color: "#f59e0b",
                    letterSpacing: "0.5em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  What We Do
                </p>
                <h2
                  style={{
                    ...sf,
                    fontSize: "clamp(2rem,5vw,3.5rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                  }}
                >
                  The_Menu<span style={{ color: "#f59e0b" }}>.</span>
                </h2>
              </div>
              <p
                style={{
                  ...mono,
                  fontSize: 12,
                  color: "#52525b",
                  maxWidth: 280,
                  lineHeight: 1.7,
                }}
              >
                Every cut done with intention. Pick your service, pick your
                barber, lock in your time.
              </p>
            </div>

            {/* Service list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {SERVICES.map((svc, i) => (
                <div
                  key={svc.name}
                  className="svc-row reveal"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "20px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    gap: 12,
                    transitionDelay: `${i * 0.04}s`,
                  }}
                  onMouseEnter={() => setHoveredSvc(svc.name)}
                  onMouseLeave={() => setHoveredSvc(null)}
                  onClick={handleBookNow}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        ...mono,
                        fontSize: 9,
                        color: hoveredSvc === svc.name ? "#f59e0b" : "#27272a",
                        minWidth: 28,
                        transition: "color 0.2s",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        ...sf,
                        fontSize: "clamp(10px,1.5vw,13px)",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        color: hoveredSvc === svc.name ? "white" : "#d4d4d4",
                        transition: "color 0.2s",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {svc.name}
                    </span>
                    <span
                      style={{
                        ...mono,
                        fontSize: 8,
                        color: "#3f3f46",
                        padding: "2px 8px",
                        border: "1px solid rgba(255,255,255,0.05)",
                        flexShrink: 0,
                      }}
                    >
                      {svc.tag}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 24,
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ ...mono, fontSize: 10, color: "#52525b" }}>
                      {svc.duration}
                    </span>
                    <span
                      style={{
                        ...sf,
                        fontSize: "clamp(14px,2vw,20px)",
                        fontWeight: 900,
                        color: hoveredSvc === svc.name ? "#f59e0b" : "white",
                        transition: "color 0.2s",
                      }}
                    >
                      {svc.price}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        color: hoveredSvc === svc.name ? "#f59e0b" : "#3f3f46",
                        transition: "all 0.2s",
                        transform:
                          hoveredSvc === svc.name ? "translateX(4px)" : "none",
                      }}
                    >
                      →
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="reveal"
              style={{ marginTop: 40, textAlign: "center" }}
            >
              <a href="/book" onClick={handleBookNow} className="book-btn">
                <span>Book Any Service →</span>
              </a>
            </div>
          </div>
        </section>

        {/* ════════════════ BARBER ════════════════ */}
        <section
          id="barber"
          style={{
            padding: "100px 28px",
            background: "rgba(255,255,255,0.015)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div className="reveal" style={{ marginBottom: 56 }}>
              <p
                style={{
                  ...mono,
                  fontSize: 8,
                  color: "#f59e0b",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                In The Chair
              </p>
              <h2
                style={{
                  ...sf,
                  fontSize: "clamp(2rem,5vw,3.5rem)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                }}
              >
                Meet The
                <br />
                <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                  Barber_
                </span>
              </h2>
            </div>

            {homeBarbers.length === 0 ? (
              <div
                className="reveal"
                style={{ padding: "64px 0", textAlign: "center" }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    margin: "0 auto 20px",
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 32 }}>✂️</span>
                </div>
                <p style={{ ...mono, fontSize: 12, color: "#52525b" }}>
                  Barber profiles coming soon. Check back shortly.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {homeBarbers.map((b, i) => (
                  <div
                    key={b.id}
                    className={`reveal delay-${i + 1}`}
                    style={{
                      flex: "1 1 300px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      padding: "32px 28px",
                      position: "relative",
                      overflow: "hidden",
                      transition: "all 0.3s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(245,158,11,0.3)";
                      e.currentTarget.style.background =
                        "rgba(245,158,11,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.08)";
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.02)";
                    }}
                  >
                    {/* Corner accent */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: 0,
                        height: 0,
                        borderStyle: "solid",
                        borderWidth: "0 48px 48px 0",
                        borderColor: `transparent rgba(245,158,11,0.2) transparent transparent`,
                      }}
                    />

                    {/* Avatar */}
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        background: "#0a0a0a",
                        border: "1px solid rgba(245,158,11,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 20,
                      }}
                    >
                      {b.photo ? (
                        <img
                          src={b.photo}
                          alt={b.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            ...sf,
                            fontSize: 28,
                            fontWeight: 900,
                            color: "#f59e0b",
                          }}
                        >
                          {b.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        ...mono,
                        fontSize: 8,
                        color: "#f59e0b",
                        letterSpacing: "0.4em",
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      Barber
                    </p>
                    <h3
                      style={{
                        ...sf,
                        fontSize: 20,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        marginBottom: 12,
                      }}
                    >
                      {b.name}
                    </h3>

                    {b.bio && (
                      <p
                        style={{
                          ...mono,
                          fontSize: 12,
                          color: "#71717a",
                          lineHeight: 1.7,
                          marginBottom: 24,
                        }}
                      >
                        {b.bio}
                      </p>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 24,
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          background: "#22c55e",
                          borderRadius: "50%",
                          animation: "pulse-green 2s infinite",
                        }}
                      />
                      <span
                        style={{
                          ...sf,
                          fontSize: 7,
                          color: "#4ade80",
                          textTransform: "uppercase",
                          letterSpacing: "0.2em",
                        }}
                      >
                        Accepting Clients
                      </span>
                    </div>

                    <a
                      href="/book"
                      onClick={handleBookNow}
                      style={{
                        ...sf,
                        fontSize: 7,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "#f59e0b",
                        textDecoration: "none",
                        padding: "10px 0",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        borderBottom: "1px solid rgba(245,158,11,0.3)",
                        transition: "gap 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.gap = "14px")}
                      onMouseLeave={(e) => (e.currentTarget.style.gap = "8px")}
                    >
                      Book Now →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ════════════════ REVIEWS ════════════════ */}
        <section id="reviews" style={{ padding: "100px 28px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div className="reveal" style={{ marginBottom: 56 }}>
              <p
                style={{
                  ...mono,
                  fontSize: 8,
                  color: "#f59e0b",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Word on The Street
              </p>
              <h2
                style={{
                  ...sf,
                  fontSize: "clamp(2rem,5vw,3.5rem)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                }}
              >
                They Said
                <br />
                <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                  It,
                </span>{" "}
                Not Us.
              </h2>
            </div>

            {/* Review carousel */}
            <div className="reveal" style={{ position: "relative" }}>
              <div style={{ overflow: "hidden" }}>
                {REVIEWS.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: i === activeReview ? "block" : "none",
                      animation: "menuIn 0.5s ease",
                    }}
                  >
                    <div
                      style={{
                        padding: "40px 0",
                        borderLeft: "2px solid #f59e0b",
                        paddingLeft: 32,
                      }}
                    >
                      {/* Stars */}
                      <div
                        style={{ display: "flex", gap: 4, marginBottom: 20 }}
                      >
                        {Array.from({ length: r.rating }).map((_, j) => (
                          <span
                            key={j}
                            style={{ color: "#f59e0b", fontSize: 14 }}
                          >
                            ★
                          </span>
                        ))}
                      </div>

                      <p
                        style={{
                          ...sf,
                          fontSize: "clamp(1rem,2.5vw,1.4rem)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          lineHeight: 1.4,
                          letterSpacing: "-0.02em",
                          maxWidth: 700,
                          marginBottom: 24,
                          color: "white",
                        }}
                      >
                        "{r.quote}"
                      </p>

                      <p
                        style={{
                          ...mono,
                          fontSize: 10,
                          color: "#52525b",
                          letterSpacing: "0.3em",
                          textTransform: "uppercase",
                        }}
                      >
                        — {r.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dots */}
              <div style={{ display: "flex", gap: 8, marginTop: 28 }}>
                {REVIEWS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveReview(i)}
                    style={{
                      width: i === activeReview ? 24 : 6,
                      height: 6,
                      background:
                        i === activeReview
                          ? "#f59e0b"
                          : "rgba(255,255,255,0.15)",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.3s",
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════ LOCATION ════════════════ */}
        <section
          id="location"
          style={{
            padding: "100px 28px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.01)",
          }}
        >
          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 64,
              alignItems: "center",
            }}
          >
            <div className="reveal">
              <p
                style={{
                  ...mono,
                  fontSize: 8,
                  color: "#f59e0b",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Find Us
              </p>
              <h2
                style={{
                  ...sf,
                  fontSize: "clamp(2rem,4vw,3rem)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  marginBottom: 36,
                }}
              >
                Come
                <br />
                <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                  Through_
                </span>
              </h2>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  marginBottom: 40,
                }}
              >
                {[
                  {
                    icon: "📍",
                    label: "Address",
                    value: "4 Hub Dr, Hattiesburg, MS 39402",
                  },
                  {
                    icon: "🕐",
                    label: "Hours",
                    value: "Mon–Fri 9AM–6PM · Sat 9AM–4PM",
                  },
                  { icon: "📵", label: "Sunday", value: "Closed — Rest Day" },
                ].map(({ icon, label, value }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      gap: 16,
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>
                      {icon}
                    </span>
                    <div>
                      <p
                        style={{
                          ...mono,
                          fontSize: 8,
                          color: "#52525b",
                          letterSpacing: "0.3em",
                          textTransform: "uppercase",
                          marginBottom: 4,
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          ...mono,
                          fontSize: 13,
                          color: "#d4d4d4",
                          lineHeight: 1.6,
                        }}
                      >
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <a href="/book" onClick={handleBookNow} className="book-btn">
                <span>Reserve Your Spot →</span>
              </a>
            </div>

            {/* Map-style graphic */}
            <div
              className="reveal delay-2"
              style={{
                position: "relative",
                height: 320,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {/* Grid lines inside box */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
              {/* Center pin */}
              <div
                style={{ position: "relative", zIndex: 1, textAlign: "center" }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    background: "#f59e0b",
                    margin: "0 auto 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 40px rgba(245,158,11,0.4)",
                  }}
                >
                  <span style={{ fontSize: 20 }}>📍</span>
                </div>
                <p
                  style={{
                    ...sf,
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "white",
                    marginBottom: 4,
                  }}
                >
                  HEADZ UP
                </p>
                <p style={{ ...mono, fontSize: 10, color: "#71717a" }}>
                  4 Hub Dr, Hattiesburg
                </p>
                {/* Ripple rings */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    width: 120,
                    height: 120,
                    border: "1px solid rgba(245,158,11,0.15)",
                    borderRadius: "50%",
                    zIndex: -1,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    width: 200,
                    height: 200,
                    border: "1px solid rgba(245,158,11,0.08)",
                    borderRadius: "50%",
                    zIndex: -1,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    width: 300,
                    height: 300,
                    border: "1px solid rgba(245,158,11,0.04)",
                    borderRadius: "50%",
                    zIndex: -1,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════ FOOTER ════════════════ */}
        <footer
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "40px 28px",
          }}
        >
          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <p
              style={{
                ...sf,
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "-0.06em",
              }}
            >
              HEADZ
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </p>
            <p
              style={{
                ...mono,
                fontSize: 9,
                color: "#27272a",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              © {new Date().getFullYear()} HEADZ UP Barbershop · Hattiesburg, MS
            </p>
            <div style={{ display: "flex", gap: 20 }}>
              <a
                href="/book"
                onClick={handleBookNow}
                style={{
                  ...mono,
                  fontSize: 10,
                  color: "#52525b",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
              >
                Book
              </a>
              <a
                href="/barber-login"
                style={{
                  ...mono,
                  fontSize: 10,
                  color: "#52525b",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
              >
                Barbers
              </a>
              <a
                href="/login"
                style={{
                  ...mono,
                  fontSize: 10,
                  color: "#52525b",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
              >
                Login
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
