"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import LoadingScreen from "@/lib/LoadingScreen";

// All 11 services from the screenshot
const FEATURED_SERVICES = [
  {
    tag: "Signature",
    name: "Haircut & Shave",
    desc: "Precision cut paired with a clean razor shave.",
    price: "$35.00",
    duration: "30 min",
    white: false,
  },
  {
    tag: "Classic",
    name: "Haircut",
    desc: "Hattiesburg's premier precision cut.",
    price: "$30.00",
    duration: "30 min",
    white: false,
  },
  {
    tag: "Kids",
    name: "Kids Cutz",
    desc: "Ages 1-12. Sharp styles for legends.",
    price: "$25.00",
    duration: "30 min",
    white: true,
  },
];

const EXTRA_SERVICES = [
  ["Beard Trim", "$20.00", "15 min"],
  ["Line", "$20.00", "15 min"],
  ["Line and Shave", "$25.00", "30 min"],
  ["Senior Cut", "$25.00", "30 min"],
  ["Senior Cut and Shave", "$30.00", "30 min"],
  ["Kids Line", "$15.00", "30 min"],
  ["Senior Line", "$15.00", "30 min"],
  ["Shave", "$20.00", "30 min"],
];

const ALL_BARBER_SERVICES = [
  ["Haircut & Shave", "$35.00"],
  ["Haircut", "$30.00"],
  ["Senior Cut and Shave", "$30.00"],
  ["Kids Cutz", "$25.00"],
  ["Line and Shave", "$25.00"],
  ["Senior Cut", "$25.00"],
  ["Beard Trim", "$20.00"],
  ["Line", "$20.00"],
  ["Shave", "$20.00"],
  ["Kids Line", "$15.00"],
  ["Senior Line", "$15.00"],
];

export default function HomePage() {
  const canvasRef = useRef(null);
  const router = useRouter();
  const [pageReady, setPageReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check login state on mount
  useEffect(() => {
    const token =
      typeof window !== "undefined" && localStorage.getItem("access");
    if (!token) return;
    setIsLoggedIn(true);
    import("@/lib/api").then(({ default: API }) => {
      API.get("dashboard/")
        .then((res) => {
          setIsStaff(!!res.data.is_staff);
        })
        .catch(() => {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          setIsLoggedIn(false);
        });
    });
  }, []);

  // Smart Book Now
  const handleBookNow = (e) => {
    e.preventDefault();
    const token = localStorage.getItem("access");
    router.push(token ? "/book" : "/login");
  };

  // Admin / barber dashboard nav
  const handleAdminNav = (e) => {
    e.preventDefault();
    router.push(isStaff ? "/barber-dashboard" : "/login");
  };

  const sf = { fontFamily: "'Syncopate', sans-serif" };

  // ── Three.js particles — only after loading screen done ───────────────────
  useEffect(() => {
    if (!pageReady) return;
    const container = canvasRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const count = window.innerWidth < 768 ? 1200 : 3000;
    const dotSize = window.innerWidth < 768 ? 0.012 : 0.007;
    const verts = [];
    for (let i = 0; i < count; i++) {
      verts.push(THREE.MathUtils.randFloatSpread(10));
      verts.push(THREE.MathUtils.randFloatSpread(10));
      verts.push(THREE.MathUtils.randFloatSpread(10));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.PointsMaterial({
      size: dotSize,
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.3,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    camera.position.z = 3;

    let mouseX = 0,
      mouseY = 0;
    const onMouse = (e) => {
      mouseX = (e.clientX - window.innerWidth / 2) / 100;
      mouseY = (e.clientY - window.innerHeight / 2) / 100;
      // Move cursor dots
      const cur = document.getElementById("cursor");
      const out = document.getElementById("cursor-outline");
      if (cur)
        gsap.to(cur, {
          left: e.clientX - 5,
          top: e.clientY - 5,
          duration: 0.08,
          ease: "none",
        });
      if (out)
        gsap.to(out, {
          left: e.clientX - 18,
          top: e.clientY - 18,
          duration: 0.22,
          ease: "power2.out",
        });
    };
    document.addEventListener("mousemove", onMouse);

    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      points.rotation.y += 0.001;
      points.position.x += (mouseX - points.position.x) * 0.02;
      points.position.y += (-mouseY - points.position.y) * 0.02;
      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, [pageReady]);

  // ── GSAP — only after loading screen done ─────────────────────────────────
  useEffect(() => {
    if (!pageReady) return;
    gsap.registerPlugin(ScrollTrigger);

    // Hero entrance
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.to(".hero-line", { y: 0, opacity: 1, duration: 1.5, stagger: 0.2 }).to(
      ".hero-fade",
      { opacity: 1, duration: 1.2, stagger: 0.15 },
      "-=1",
    );

    // Scroll reveals
    gsap.utils
      .toArray(".menu-card, .gallery-item, .review-card, .scroll-reveal")
      .forEach((el) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: "top 95%" },
          y: 24,
          opacity: 0,
          duration: 0.9,
          ease: "expo.out",
        });
      });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, [pageReady]);

  return (
    <>
      {/* ── Global styles — background set to #050505 immediately to kill white flash ── */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Inter:wght@400;900&display=swap");

        html,
        body {
          background: #050505 !important;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          color: white;
          font-family: "Inter", sans-serif;
        }
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }
        html {
          scroll-behavior: smooth;
        }

        /* Custom cursor */
        #cursor,
        #cursor-outline {
          display: none;
        }
        @media (pointer: fine) {
          * {
            cursor: none !important;
          }
          #cursor {
            display: block;
            width: 10px;
            height: 10px;
            background: #f59e0b;
            border-radius: 50%;
            position: fixed;
            pointer-events: none;
            z-index: 9999;
            top: 0;
            left: 0;
            will-change: transform;
          }
          #cursor-outline {
            display: block;
            width: 36px;
            height: 36px;
            border: 1px solid rgba(245, 158, 11, 0.5);
            border-radius: 50%;
            position: fixed;
            pointer-events: none;
            z-index: 9998;
            top: 0;
            left: 0;
            will-change: transform;
            transition:
              width 0.2s,
              height 0.2s,
              border-color 0.2s;
          }
        }

        /* Hero typography */
        .hero-title {
          font-size: clamp(2.5rem, 12vw, 10rem);
          line-height: 0.82;
          letter-spacing: -0.06em;
          font-family: "Syncopate", sans-serif;
          font-weight: 900;
          text-transform: uppercase;
        }
        .hero-line {
          opacity: 0;
          transform: translateY(100%);
        }
        .hero-fade {
          opacity: 0;
        }

        /* Service cards */
        .menu-card {
          background: linear-gradient(
            145deg,
            rgba(20, 20, 20, 0.85),
            rgba(5, 5, 5, 0.95)
          );
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition:
            border-color 0.3s ease,
            transform 0.3s ease;
        }
        @media (min-width: 1024px) {
          .menu-card:hover {
            border-color: #f59e0b;
            transform: translateY(-5px);
          }
        }

        /* Outline headings */
        .outline-text {
          color: transparent;
          -webkit-text-stroke: 1px rgba(255, 255, 255, 0.25);
        }

        /* Vertical sidebar text */
        .vertical-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }

        /* Gallery */
        .gallery-item {
          position: relative;
          overflow: hidden;
          background: #111;
          border: 1px solid rgba(255, 255, 255, 0.05);
          aspect-ratio: 1/1;
        }
        .gallery-item img {
          transition:
            transform 0.8s cubic-bezier(0.2, 1, 0.3, 1),
            filter 0.5s ease;
          filter: grayscale(1);
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        @media (hover: hover) {
          .gallery-item:hover img {
            transform: scale(1.08);
            filter: grayscale(0);
          }
        }
        @media (max-width: 768px) {
          .gallery-item img {
            filter: grayscale(0);
          }
        }

        /* Noise grain overlay */
        .noise-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 90;
          background-image: url("https://grainy-gradients.vercel.app/noise.svg");
          opacity: 0.04;
        }

        /* Pulse dot animation */
        @keyframes pulse-dot {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }
        .pulse-green {
          animation: pulse-dot 2s infinite;
        }

        /* CTA button */
        .book-btn {
          display: inline-block;
          position: relative;
          overflow: hidden;
          padding: 20px 48px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          font-family: "Syncopate", sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          text-decoration: none;
          cursor: pointer;
          background: transparent;
          color: white;
          transition: color 0.3s;
        }
        .book-btn span {
          position: relative;
          z-index: 1;
          transition: color 0.3s ease;
        }
        .book-btn::after {
          content: "";
          position: absolute;
          inset: 0;
          background: white;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (min-width: 768px) {
          .book-btn:hover span {
            color: black;
          }
          .book-btn:hover::after {
            transform: scaleX(1);
          }
        }

        /* Smooth page-in fade after loading screen */
        .page-root {
          opacity: 0;
          animation: pageIn 0.7s ease 0.05s forwards;
        }
        @keyframes pageIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>

      {/* ── Loading screen — renders on top of dark bg, no white flash ── */}
      <LoadingScreen onComplete={() => setPageReady(true)} />

      {/* ── Page content — hidden until loading done ── */}
      {pageReady && (
        <div className="page-root">
          {/* Custom cursor — shown/hidden purely via CSS @media (pointer: fine) */}
          <div id="cursor" />
          <div id="cursor-outline" />

          {/* Grain overlay */}
          <div className="noise-overlay" />

          {/* Particle canvas */}
          <div
            ref={canvasRef}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              pointerEvents: "none",
            }}
          />

          {/* Vertical sidebar */}
          <div
            style={{
              position: "fixed",
              right: 32,
              top: "50%",
              transform: "translateY(-50%)",
              opacity: 0.18,
              zIndex: 40,
              pointerEvents: "none",
              display: "none",
            }}
            className="lg:block"
          >
            <p
              className="vertical-text"
              style={{
                ...sf,
                fontSize: 10,
                letterSpacing: "1.5em",
                textTransform: "uppercase",
              }}
            >
              ESTD. BARBERSHOP . 2026
            </p>
          </div>

          {/* ── NAV ── */}
          <nav
            style={{
              position: "fixed",
              width: "100%",
              zIndex: 100,
              padding: "20px 28px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(5,5,5,0.85)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                ...sf,
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: "-0.05em",
              }}
            >
              HEADZ
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </div>

            {/* Desktop links */}
            <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
              {["services", "barber", "reviews", "location"].map((id) => (
                <a
                  key={id}
                  href={`#${id}`}
                  style={{
                    ...sf,
                    fontSize: 8,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "#a1a1aa",
                    textDecoration: "none",
                    transition: "color 0.2s",
                    display: window.innerWidth < 640 ? "none" : "block",
                  }}
                  onMouseEnter={(e) => (e.target.style.color = "#f59e0b")}
                  onMouseLeave={(e) => (e.target.style.color = "#a1a1aa")}
                >
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </a>
              ))}
              <a
                href="/book"
                onClick={handleBookNow}
                className="book-btn"
                style={{
                  padding: "14px 28px",
                  display: window.innerWidth < 640 ? "none" : "inline-block",
                }}
              >
                <span>Book_Now</span>
              </a>
              {isLoggedIn && isStaff && (
                <a
                  href="/barber-dashboard"
                  onClick={handleAdminNav}
                  style={{
                    ...sf,
                    fontSize: 8,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#f59e0b",
                    textDecoration: "none",
                    border: "1px solid rgba(245,158,11,0.3)",
                    padding: "10px 18px",
                    transition: "all 0.2s",
                    display: window.innerWidth < 640 ? "none" : "inline-block",
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

              {/* Hamburger — mobile only */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  display: window.innerWidth >= 640 ? "none" : "flex",
                  flexDirection: "column",
                  gap: 5,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
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
                      ? "rotate(45deg) translate(4px, 5px)"
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
                      ? "rotate(-45deg) translate(4px, -5px)"
                      : "none",
                  }}
                />
              </button>
            </div>
          </nav>

          {/* Mobile menu overlay */}
          {menuOpen && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 99,
                background: "rgba(5,5,5,0.97)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 40,
              }}
            >
              <button
                onClick={() => setMenuOpen(false)}
                style={{
                  position: "absolute",
                  top: 24,
                  right: 28,
                  background: "none",
                  border: "none",
                  color: "#71717a",
                  cursor: "pointer",
                  ...sf,
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                Close ✕
              </button>
              {["services", "barber", "reviews", "location"].map((id) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    ...sf,
                    fontSize: "clamp(1.4rem, 6vw, 2rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    color: "white",
                    textDecoration: "none",
                    letterSpacing: "-0.03em",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.target.style.color = "#f59e0b")}
                  onMouseLeave={(e) => (e.target.style.color = "white")}
                >
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </a>
              ))}
              <a
                href="/book"
                onClick={(e) => {
                  handleBookNow(e);
                  setMenuOpen(false);
                }}
                style={{
                  marginTop: 16,
                  ...sf,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "black",
                  background: "#f59e0b",
                  padding: "18px 40px",
                  textDecoration: "none",
                }}
              >
                Book Now →
              </a>
              {isStaff && (
                <a
                  href="/barber-dashboard"
                  onClick={(e) => {
                    handleAdminNav(e);
                    setMenuOpen(false);
                  }}
                  style={{
                    ...sf,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "#f59e0b",
                    background: "transparent",
                    border: "1px solid rgba(245,158,11,0.4)",
                    padding: "16px 40px",
                    textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                >
                  My Dashboard →
                </a>
              )}
            </div>
          )}

          <main style={{ position: "relative", zIndex: 10 }}>
            {/* ══ HERO ══ */}
            <section
              style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "96px 28px 40px",
                maxWidth: 1400,
                margin: "0 auto",
              }}
            >
              {/* Status badge */}
              <div
                className="hero-fade"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 28,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(24,24,27,0.9)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: "8px 18px",
                    borderRadius: 999,
                  }}
                >
                  <div
                    className="pulse-green"
                    style={{
                      width: 8,
                      height: 8,
                      background: "#22c55e",
                      borderRadius: "50%",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      ...sf,
                      fontSize: 9,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                    }}
                  >
                    Walk-ins Welcome
                  </span>
                </div>
                <div
                  style={{
                    width: 28,
                    height: 1,
                    background: "rgba(245,158,11,0.5)",
                  }}
                />
                <span
                  style={{
                    ...sf,
                    fontSize: 9,
                    color: "#f59e0b",
                    letterSpacing: "0.35em",
                    textTransform: "uppercase",
                  }}
                >
                  Barbershop
                </span>
              </div>

              {/* Title lines */}
              <div style={{ overflow: "hidden" }}>
                <h1 className="hero-line hero-title">HEADZUP</h1>
              </div>
              <div
                style={{
                  overflow: "hidden",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "0 40px",
                }}
              >
                <h1
                  className="hero-line hero-title"
                  style={{ color: "#f59e0b", fontStyle: "italic" }}
                >
                  BARBERSHOP_
                </h1>
                <p
                  className="hero-fade"
                  style={{
                    color: "#d4d4d8",
                    maxWidth: 260,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    lineHeight: 1.9,
                    marginTop: 16,
                  }}
                >
                  10/10 cuts. Hattiesburg&apos;s highest rated grooming
                  experience.
                </p>
              </div>

              <div className="hero-fade" style={{ marginTop: 52 }}>
                <a href="/book" onClick={handleBookNow} className="book-btn">
                  <span>Initiate Booking</span>
                </a>
              </div>

              {/* Scroll hint */}
              <div
                className="hero-fade"
                style={{
                  marginTop: 64,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 1,
                    height: 40,
                    background: "rgba(245,158,11,0.3)",
                  }}
                />
                <span
                  style={{
                    ...sf,
                    fontSize: 8,
                    color: "#52525b",
                    letterSpacing: "0.4em",
                    textTransform: "uppercase",
                  }}
                >
                  Scroll
                </span>
              </div>
            </section>

            {/* ══ SERVICES ══ */}
            <section
              id="services"
              style={{ padding: "96px 28px", maxWidth: 1200, margin: "0 auto" }}
            >
              <div className="scroll-reveal" style={{ marginBottom: 64 }}>
                <p
                  style={{
                    ...sf,
                    fontSize: 8,
                    letterSpacing: "0.5em",
                    color: "#71717a",
                    textTransform: "uppercase",
                    marginBottom: 16,
                  }}
                >
                  What We Offer
                </p>
                <h2
                  className="outline-text"
                  style={{
                    ...sf,
                    fontSize: "clamp(2rem,6vw,4rem)",
                    textTransform: "uppercase",
                    fontStyle: "italic",
                  }}
                >
                  The_Menu
                </h2>
              </div>

              {/* Featured 3 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                  marginBottom: 12,
                }}
              >
                {FEATURED_SERVICES.map((svc) => (
                  <div
                    key={svc.name}
                    className={
                      svc.white ? "scroll-reveal" : "menu-card scroll-reveal"
                    }
                    style={{
                      padding: "40px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: 280,
                      background: svc.white ? "white" : undefined,
                      color: svc.white ? "black" : undefined,
                      border: svc.white ? "none" : undefined,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          ...sf,
                          color: svc.white ? "#71717a" : "#f59e0b",
                          fontSize: 9,
                          letterSpacing: "0.25em",
                          textTransform: "uppercase",
                        }}
                      >
                        {svc.tag}
                      </span>
                      <h3
                        style={{
                          ...sf,
                          fontSize: 20,
                          marginTop: 14,
                          marginBottom: 8,
                          textTransform: "uppercase",
                        }}
                      >
                        {svc.name}
                      </h3>
                      <p
                        style={{
                          color: svc.white ? "#52525b" : "#a1a1aa",
                          fontSize: 12,
                          fontStyle: svc.white ? "italic" : undefined,
                          lineHeight: 1.6,
                        }}
                      >
                        {svc.desc}
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                        marginTop: 24,
                      }}
                    >
                      <span
                        style={{
                          color: svc.white ? "#a1a1aa" : "#71717a",
                          fontSize: 11,
                        }}
                      >
                        {svc.duration}
                      </span>
                      <span
                        style={{
                          ...sf,
                          fontSize: 20,
                          color: svc.white ? "black" : "white",
                        }}
                      >
                        {svc.price}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* All remaining 8 services */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 1,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                {EXTRA_SERVICES.map(([name, price, dur]) => (
                  <div
                    key={name}
                    className="scroll-reveal"
                    style={{
                      padding: "20px 24px",
                      background: "#050505",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "background 0.25s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(245,158,11,0.04)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#050505")
                    }
                  >
                    <div>
                      <span
                        style={{
                          ...sf,
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "white",
                        }}
                      >
                        {name}
                      </span>
                      <span
                        style={{
                          ...sf,
                          fontSize: 8,
                          color: "#52525b",
                          display: "block",
                          marginTop: 3,
                          letterSpacing: "0.1em",
                        }}
                      >
                        {dur}
                      </span>
                    </div>
                    <span
                      style={{
                        ...sf,
                        fontSize: 14,
                        color: "#f59e0b",
                        fontWeight: 700,
                        flexShrink: 0,
                        marginLeft: 16,
                      }}
                    >
                      {price}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* ══ BARBER ══ */}
            <section
              id="barber"
              style={{ padding: "96px 28px", background: "rgba(9,9,11,0.6)" }}
            >
              <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <div className="scroll-reveal" style={{ marginBottom: 64 }}>
                  <p
                    style={{
                      ...sf,
                      fontSize: 8,
                      letterSpacing: "0.5em",
                      color: "#71717a",
                      textTransform: "uppercase",
                      marginBottom: 16,
                    }}
                  >
                    Behind The Chair
                  </p>
                  <h2
                    className="outline-text"
                    style={{
                      ...sf,
                      fontSize: "clamp(2rem,6vw,4rem)",
                      textTransform: "uppercase",
                      fontStyle: "italic",
                    }}
                  >
                    The_Barber
                  </h2>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 64,
                    alignItems: "flex-start",
                  }}
                >
                  {/* Barber cards */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 32,
                      flexShrink: 0,
                    }}
                  >
                    {[
                      { name: "Jarvis", initial: "J" },
                      { name: "Mr. J", initial: "M" },
                    ].map((barber) => (
                      <div key={barber.name} className="scroll-reveal">
                        <div
                          style={{
                            width: 160,
                            height: 160,
                            background:
                              "linear-gradient(145deg, #1c1c1e, #111)",
                            border: "1px solid rgba(245,158,11,0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: 32,
                              height: 32,
                              borderTop: "2px solid #f59e0b",
                              borderLeft: "2px solid #f59e0b",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              right: 0,
                              width: 32,
                              height: 32,
                              borderBottom: "2px solid #f59e0b",
                              borderRight: "2px solid #f59e0b",
                            }}
                          />
                          <span
                            style={{
                              ...sf,
                              fontSize: 64,
                              fontWeight: 900,
                              color: "#f59e0b",
                              lineHeight: 1,
                            }}
                          >
                            {barber.initial}
                          </span>
                        </div>
                        <div style={{ marginTop: 16 }}>
                          <p
                            style={{
                              ...sf,
                              fontSize: 8,
                              letterSpacing: "0.5em",
                              color: "#71717a",
                              textTransform: "uppercase",
                            }}
                          >
                            Your Barber
                          </p>
                          <h3
                            style={{
                              ...sf,
                              fontSize: 22,
                              fontWeight: 900,
                              textTransform: "uppercase",
                              marginTop: 6,
                              color: "white",
                            }}
                          >
                            {barber.name}
                          </h3>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginTop: 10,
                            }}
                          >
                            <div
                              className="pulse-green"
                              style={{
                                width: 7,
                                height: 7,
                                background: "#22c55e",
                                borderRadius: "50%",
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                ...sf,
                                fontSize: 8,
                                color: "#4ade80",
                                textTransform: "uppercase",
                                letterSpacing: "0.2em",
                              }}
                            >
                              Accepting Clients
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Full service list */}
                  <div
                    className="scroll-reveal"
                    style={{ flex: 1, minWidth: 280 }}
                  >
                    <p
                      style={{
                        ...sf,
                        fontSize: 8,
                        letterSpacing: "0.5em",
                        color: "#71717a",
                        textTransform: "uppercase",
                        marginBottom: 20,
                      }}
                    >
                      Full Service Menu
                    </p>
                    <div>
                      {ALL_BARBER_SERVICES.map(([name, price], i) => (
                        <div
                          key={name}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "14px 0",
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.paddingLeft = "8px";
                            e.currentTarget.style.borderBottomColor =
                              "rgba(245,158,11,0.3)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.paddingLeft = "0";
                            e.currentTarget.style.borderBottomColor =
                              "rgba(255,255,255,0.05)";
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 14,
                            }}
                          >
                            <span
                              style={{
                                ...sf,
                                fontSize: 9,
                                color: "rgba(245,158,11,0.35)",
                                minWidth: 20,
                              }}
                            >
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span
                              style={{
                                ...sf,
                                fontSize: 11,
                                textTransform: "uppercase",
                                color: "white",
                                letterSpacing: "0.05em",
                              }}
                            >
                              {name}
                            </span>
                          </div>
                          <span
                            style={{
                              ...sf,
                              color: "#f59e0b",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {price}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 36 }}>
                      <a
                        href="/book"
                        onClick={handleBookNow}
                        className="book-btn"
                      >
                        <span>Book with Jarvis</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ══ REVIEWS ══ */}
            <section
              id="reviews"
              style={{ padding: "96px 28px", background: "rgba(5,5,5,0.8)" }}
            >
              <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <div
                  className="scroll-reveal"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 24,
                    marginBottom: 64,
                  }}
                >
                  <h2
                    className="outline-text"
                    style={{
                      ...sf,
                      fontSize: "clamp(2.5rem,6vw,4.5rem)",
                      textTransform: "uppercase",
                      fontStyle: "italic",
                    }}
                  >
                    5.0
                  </h2>
                  <div
                    style={{
                      fontSize: 22,
                      color: "#f59e0b",
                      letterSpacing: "0.1em",
                    }}
                  >
                    ★★★★★
                  </div>
                  <p
                    style={{
                      ...sf,
                      fontSize: 9,
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      color: "#71717a",
                    }}
                  >
                    155+ Verified 5-Star Booksy Reviews
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 16,
                  }}
                >
                  {[
                    {
                      quote:
                        "This man is an amazing barber with great energy and a great personality. Most importantly the cuts are fire!! Go book with him.",
                      name: "Ronnie E.",
                      date: "Dec 7, 2025",
                      border: "#f59e0b",
                    },
                    {
                      quote:
                        "My son loves his hair cut. Great experience every time we come in. Best atmosphere and professional staff!",
                      name: "Dunn L.",
                      date: "Jul 2, 2025",
                      border: "#52525b",
                    },
                    {
                      quote:
                        "Great atmosphere and a 10/10 cut. Professional staff and amazing service!",
                      name: "Dorian C.",
                      date: "Sep 7, 2024",
                      border: "#52525b",
                    },
                    {
                      quote:
                        "Great atmosphere and professional staff! Always feel welcome when I walk through the door.",
                      name: "Shameka H.",
                      date: "Sep 18, 2025",
                      border: "#f59e0b",
                    },
                  ].map((r) => (
                    <div
                      key={r.name}
                      className="review-card"
                      style={{
                        padding: 32,
                        borderLeft: `2px solid ${r.border}`,
                        background: "rgba(255,255,255,0.03)",
                        transition: "background 0.3s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(255,255,255,0.06)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(255,255,255,0.03)")
                      }
                    >
                      <div
                        style={{
                          color: "#f59e0b",
                          fontSize: 12,
                          marginBottom: 16,
                          letterSpacing: "0.1em",
                        }}
                      >
                        ★★★★★
                      </div>
                      <p
                        style={{
                          fontStyle: "italic",
                          color: "#d4d4d8",
                          marginBottom: 24,
                          fontSize: 13,
                          lineHeight: 1.85,
                        }}
                      >
                        &ldquo;{r.quote}&rdquo;
                      </p>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          ...sf,
                          fontSize: 8,
                          textTransform: "uppercase",
                        }}
                      >
                        <span style={{ color: "white" }}>{r.name}</span>
                        <span style={{ color: "#52525b" }}>{r.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ══ LOCATION ══ */}
            <section
              id="location"
              style={{ padding: "96px 28px", background: "rgba(9,9,11,0.7)" }}
            >
              <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <div className="scroll-reveal" style={{ marginBottom: 64 }}>
                  <p
                    style={{
                      ...sf,
                      fontSize: 8,
                      letterSpacing: "0.5em",
                      color: "#71717a",
                      textTransform: "uppercase",
                      marginBottom: 16,
                    }}
                  >
                    Come See Us
                  </p>
                  <h2
                    className="outline-text"
                    style={{
                      ...sf,
                      fontSize: "clamp(2rem,6vw,4rem)",
                      textTransform: "uppercase",
                      fontStyle: "italic",
                    }}
                  >
                    Find_Us
                  </h2>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: 64,
                  }}
                >
                  <div className="scroll-reveal">
                    <p
                      style={{
                        ...sf,
                        fontSize: 8,
                        letterSpacing: "0.5em",
                        color: "#71717a",
                        textTransform: "uppercase",
                        marginBottom: 16,
                      }}
                    >
                      Address
                    </p>
                    <h3
                      style={{
                        ...sf,
                        fontSize: "clamp(1.2rem,3vw,1.8rem)",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        marginBottom: 8,
                        color: "white",
                      }}
                    >
                      Hattiesburg, MS
                    </h3>
                    <p style={{ color: "#a1a1aa", fontSize: 15, marginTop: 4 }}>
                      4 Hub Dr, Hattiesburg, MS 39402
                    </p>

                    <div style={{ marginTop: 36 }}>
                      <p
                        style={{
                          ...sf,
                          fontSize: 8,
                          letterSpacing: "0.5em",
                          color: "#71717a",
                          textTransform: "uppercase",
                          marginBottom: 16,
                        }}
                      >
                        Hours
                      </p>
                      {[
                        ["Mon – Fri", "9:00 AM – 6:00 PM", false],
                        ["Saturday", "9:00 AM – 4:00 PM", false],
                        ["Sunday", "Closed", true],
                      ].map(([day, hrs, closed]) => (
                        <div
                          key={day}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            maxWidth: 340,
                            marginBottom: 10,
                            ...sf,
                            fontSize: 10,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}
                        >
                          <span style={{ color: "#a1a1aa" }}>{day}</span>
                          <span style={{ color: closed ? "#3f3f46" : "white" }}>
                            {hrs}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 36, display: "flex", gap: 24 }}>
                      {[
                        [
                          "Instagram",
                          "https://www.instagram.com/headz_up_inthe_burg",
                        ],
                        [
                          "Facebook",
                          "https://www.facebook.com/p/Headz-Up-Barber-Shop-100054366606015/",
                        ],
                      ].map(([label, href]) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            ...sf,
                            fontSize: 9,
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            color: "#71717a",
                            textDecoration: "underline",
                            transition: "color 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.target.style.color = "#f59e0b")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.color = "#71717a")
                          }
                        >
                          {label}
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Map */}
                  <div
                    className="scroll-reveal"
                    style={{
                      width: "100%",
                      minHeight: 320,
                      border: "1px solid rgba(255,255,255,0.08)",
                      overflow: "hidden",
                    }}
                  >
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3366.5!2d-89.3985!3d31.3271!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s4+Hub+Dr%2C+Hattiesburg%2C+MS+39402!5e0!3m2!1sen!2sus!4v1"
                      width="100%"
                      height="320"
                      style={{
                        border: 0,
                        filter: "grayscale(1) invert(0.88) contrast(0.9)",
                        display: "block",
                      }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ══ GALLERY ══ */}
            <section
              id="gallery"
              style={{ padding: "96px 28px", maxWidth: 1200, margin: "0 auto" }}
            >
              <div className="scroll-reveal" style={{ marginBottom: 48 }}>
                <p
                  style={{
                    ...sf,
                    fontSize: 8,
                    letterSpacing: "0.5em",
                    color: "#71717a",
                    textTransform: "uppercase",
                    marginBottom: 16,
                  }}
                >
                  The Portfolio
                </p>
                <h2
                  className="outline-text"
                  style={{
                    ...sf,
                    fontSize: "clamp(2rem,6vw,4rem)",
                    textTransform: "uppercase",
                    fontStyle: "italic",
                  }}
                >
                  The_Work
                </h2>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 12,
                }}
              >
                {["pic2.jpeg", "pic3.jpeg", "pic4.jpeg"].map((src) => (
                  <div key={src} className="gallery-item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/${src}`} alt="Fresh cut" />
                  </div>
                ))}
              </div>
            </section>

            {/* ══ FOOTER ══ */}
            <footer
              style={{
                padding: "64px 28px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(5,5,5,0.95)",
              }}
            >
              <div
                style={{
                  maxWidth: 1200,
                  margin: "0 auto",
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 32,
                }}
              >
                <div>
                  <div
                    style={{
                      ...sf,
                      fontWeight: 700,
                      fontSize: 20,
                      letterSpacing: "-0.05em",
                      marginBottom: 6,
                    }}
                  >
                    HEADZ
                    <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                      UP
                    </span>
                  </div>
                  <p
                    style={{ color: "#a1a1aa", fontSize: 13, marginBottom: 20 }}
                  >
                    4 Hub Dr, Hattiesburg, MS 39402
                  </p>
                  <div style={{ display: "flex", gap: 24 }}>
                    {[
                      [
                        "Instagram",
                        "https://www.instagram.com/headz_up_inthe_burg",
                      ],
                      [
                        "Facebook",
                        "https://www.facebook.com/p/Headz-Up-Barber-Shop-100054366606015/",
                      ],
                    ].map(([label, href]) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          ...sf,
                          fontSize: 8,
                          textTransform: "uppercase",
                          letterSpacing: "0.2em",
                          color: "#71717a",
                          textDecoration: "underline",
                          transition: "color 0.2s",
                        }}
                        onMouseEnter={(e) => (e.target.style.color = "#f59e0b")}
                        onMouseLeave={(e) => (e.target.style.color = "#71717a")}
                      >
                        {label}
                      </a>
                    ))}
                  </div>
                </div>
                <p
                  style={{
                    ...sf,
                    fontSize: 8,
                    color: "#3f3f46",
                    letterSpacing: "0.5em",
                    textTransform: "uppercase",
                  }}
                >
                  ©2026 HEADZUP BARBERSHOP
                </p>
              </div>
            </footer>
          </main>
        </div>
      )}
    </>
  );
}
