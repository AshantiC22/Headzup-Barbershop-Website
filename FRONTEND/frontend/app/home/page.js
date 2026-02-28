"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import LoadingScreen from "@/lib/LoadingScreen";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const SERVICES = [
  {
    name: "Haircut & Shave",
    price: "$35",
    tag: "Signature",
    desc: "Precision cut + straight razor shave. The full experience.",
  },
  {
    name: "Haircut",
    price: "$30",
    tag: "Classic",
    desc: "Clean, sharp, precise. Hattiesburg's go-to cut.",
  },
  {
    name: "Low Cut",
    price: "$25",
    tag: "Clean",
    desc: "Tight all-around. Low maintenance, high impact.",
  },
  {
    name: "Line & Shave",
    price: "$25",
    tag: "Edge",
    desc: "Sharp line-up followed by a smooth shave.",
  },
  {
    name: "Senior Cut",
    price: "$25",
    tag: "Gentleman",
    desc: "Refined cuts for distinguished gentlemen.",
  },
  {
    name: "Kids Cutz",
    price: "$25",
    tag: "Youth",
    desc: "Ages 1–12. We make kids look legendary.",
  },
  {
    name: "Beard Trim",
    price: "$20",
    tag: "Detail",
    desc: "Sculpted, shaped, and defined beard lines.",
  },
  {
    name: "Line",
    price: "$20",
    tag: "Edge",
    desc: "The crispest edge-up in Hattiesburg.",
  },
  {
    name: "Shave",
    price: "$20",
    tag: "Smooth",
    desc: "Hot towel. Straight razor. Clean finish.",
  },
  {
    name: "Senior Line",
    price: "$15",
    tag: "Gentleman",
    desc: "Sharp line-up for senior clients.",
  },
  {
    name: "Kids Line",
    price: "$15",
    tag: "Youth",
    desc: "Fresh edge for the little ones.",
  },
];

const REVIEWS = [
  {
    quote:
      "This man is an amazing barber with great energy. Most importantly the cuts are fire!!",
    name: "Ronnie E.",
    date: "Dec 2025",
  },
  {
    quote:
      "My son loves his haircut. Best atmosphere and professional staff every single time.",
    name: "Dunn L.",
    date: "Jul 2025",
  },
  {
    quote:
      "Great atmosphere and a 10/10 cut. Professional staff and amazing service!",
    name: "Dorian C.",
    date: "Sep 2024",
  },
  {
    quote:
      "Always feel welcome when I walk through the door. Best barbers in Hattiesburg.",
    name: "Shameka H.",
    date: "Sep 2025",
  },
];

const TICKER_ITEMS = [
  "PRECISION CUTS",
  "BEARD TRIMS",
  "HATTIESBURG MS",
  "WALK-INS WELCOME",
  "KIDS CUTZ",
  "ONLINE BOOKING",
  "5 STAR RATED",
  "HOT TOWEL SHAVE",
  "FRESH FADES",
  "SENIOR CUTS",
  "LINE UPS",
  "STRAIGHT RAZOR SHAVES",
];

export default function HomePage() {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeService, setActiveService] = useState(0);
  const [hoveredService, setHoveredService] = useState(null);
  const cycleRef = useRef(null);
  const sf = { fontFamily: "'Syncopate', sans-serif" };

  useEffect(() => {
    if (!ready) return;
    const container = canvasRef.current;
    if (!container) return;
    const W = window.innerWidth,
      H = window.innerHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    container.appendChild(renderer.domElement);
    const isMob = W < 768;
    const count = isMob ? 600 : 1800;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 16;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: isMob ? 0.014 : 0.008,
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.18,
    });
    const field = new THREE.Points(geo, mat);
    scene.add(field);
    const pos2 = new Float32Array(400 * 3);
    for (let i = 0; i < 400 * 3; i++) pos2[i] = (Math.random() - 0.5) * 20;
    const geo2 = new THREE.BufferGeometry();
    geo2.setAttribute("position", new THREE.BufferAttribute(pos2, 3));
    const mat2 = new THREE.PointsMaterial({
      size: 0.004,
      color: 0xffffff,
      transparent: true,
      opacity: 0.08,
    });
    scene.add(new THREE.Points(geo2, mat2));
    camera.position.set(0, 0, 4);
    let mx = 0,
      my = 0,
      tx = 0,
      ty = 0;
    const onMouse = (e) => {
      mx = (e.clientX / W - 0.5) * 1.5;
      my = (e.clientY / H - 0.5) * 1.5;
    };
    window.addEventListener("mousemove", onMouse, { passive: true });
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      tx += (mx - tx) * 0.03;
      ty += (my - ty) * 0.03;
      field.rotation.y += 0.00035 + tx * 0.008;
      field.rotation.x += 0.00015 - ty * 0.005;
      camera.position.x += (tx * 0.2 - camera.position.x) * 0.05;
      camera.position.y += (-ty * 0.2 - camera.position.y) * 0.05;
      renderer.render(scene, camera);
    };
    tick();
    const onResize = () => {
      const nw = window.innerWidth,
        nh = window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    gsap
      .timeline({ delay: 0.05 })
      .to(".hl", {
        y: 0,
        opacity: 1,
        duration: 1.3,
        stagger: 0.12,
        ease: "expo.out",
      })
      .to(
        ".hf",
        { y: 0, opacity: 1, duration: 1.1, stagger: 0.08, ease: "expo.out" },
        "-=0.9",
      )
      .to(
        ".hfl",
        { opacity: 1, duration: 0.9, stagger: 0.06, ease: "power2.out" },
        "-=0.6",
      );

    gsap.utils.toArray(".sr").forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 48 },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "expo.out",
          scrollTrigger: {
            trigger: el,
            start: "top 86%",
            toggleActions: "play none none none",
          },
        },
      );
    });

    document.querySelectorAll(".sr-group").forEach((group) => {
      const children = group.querySelectorAll(".sr-child");
      gsap.fromTo(
        children,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "expo.out",
          scrollTrigger: {
            trigger: group,
            start: "top 84%",
            toggleActions: "play none none none",
          },
        },
      );
    });

    // ── FIX 1: gsap.to() on a plain obj — fromTo() crashes on non-DOM targets ──
    document.querySelectorAll(".count-up").forEach((el) => {
      const target = parseFloat(el.dataset.target);
      ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: () => {
          const obj = { val: 0 };
          gsap.to(obj, {
            val: target,
            duration: 1.8,
            ease: "expo.out",
            onUpdate: () => {
              el.textContent = Number.isInteger(target)
                ? Math.round(obj.val)
                : obj.val.toFixed(1);
            },
          });
        },
      });
    });
  }, [ready]);

  const startCycle = useCallback(() => {
    clearInterval(cycleRef.current);
    cycleRef.current = setInterval(
      () => setActiveService((i) => (i + 1) % SERVICES.length),
      3000,
    );
  }, []);

  useEffect(() => {
    if (!ready) return;
    startCycle();
    return () => clearInterval(cycleRef.current);
  }, [ready, startCycle]);

  useEffect(() => {
    if (!ready) return;
    const c1 = document.getElementById("c1");
    const c2 = document.getElementById("c2");
    if (!c1 || !c2) return;
    const onMove = (e) => {
      gsap.set(c1, { x: e.clientX - 4, y: e.clientY - 4 });
      gsap.to(c2, { x: e.clientX - 16, y: e.clientY - 16, duration: 0.25 });
    };
    const onEnter = () =>
      gsap.to(c2, {
        scale: 2.2,
        borderColor: "rgba(245,158,11,0.8)",
        duration: 0.25,
      });
    const onLeave = () =>
      gsap.to(c2, {
        scale: 1,
        borderColor: "rgba(245,158,11,0.5)",
        duration: 0.25,
      });
    window.addEventListener("mousemove", onMove, { passive: true });
    document.querySelectorAll("a, button, [data-hover]").forEach((el) => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });
    return () => window.removeEventListener("mousemove", onMove);
  }, [ready]);

  const displayIdx = hoveredService !== null ? hoveredService : activeService;

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Serif+Display:ital,wght@0,400;1,400&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap");
        html,
        body {
          background: #040404;
        }
        #c1,
        #c2 {
          display: none;
        }
        @media (pointer: fine) {
          * {
            cursor: none !important;
          }
          #c1 {
            display: block;
            position: fixed;
            z-index: 9999;
            pointer-events: none;
            width: 8px;
            height: 8px;
            background: #f59e0b;
            border-radius: 50%;
            top: 0;
            left: 0;
            will-change: transform;
          }
          #c2 {
            display: block;
            position: fixed;
            z-index: 9998;
            pointer-events: none;
            width: 32px;
            height: 32px;
            border: 1px solid rgba(245, 158, 11, 0.5);
            border-radius: 50%;
            top: 0;
            left: 0;
            will-change: transform;
          }
        }
        .hl {
          opacity: 0;
          transform: translateY(105%);
          display: block;
        }
        .hf {
          opacity: 0;
          transform: translateY(20px);
        }
        .hfl {
          opacity: 0;
        }
        .ghost-text {
          font-family: "Syncopate", sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          color: transparent;
          -webkit-text-stroke: 1px rgba(255, 255, 255, 0.04);
          user-select: none;
          pointer-events: none;
          line-height: 0.82;
        }
        .ghost-amber {
          -webkit-text-stroke: 1px rgba(245, 158, 11, 0.05);
        }
        .sec-label {
          font-family: "Syncopate", sans-serif;
          font-size: 8px;
          letter-spacing: 0.55em;
          text-transform: uppercase;
          color: #f59e0b;
        }
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .ticker-track {
          display: flex;
          animation: ticker 28s linear infinite;
          will-change: transform;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        .cta-btn {
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px 40px;
          font-family: "Syncopate", sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          text-decoration: none;
          color: white;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.35);
          transition:
            color 0.35s,
            border-color 0.35s;
        }
        .cta-btn::after {
          content: "";
          position: absolute;
          inset: 0;
          background: #f59e0b;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.42s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cta-btn span {
          position: relative;
          z-index: 1;
          transition: color 0.35s;
        }
        .cta-btn:hover {
          border-color: #f59e0b;
        }
        .cta-btn:hover::after {
          transform: scaleX(1);
        }
        .cta-btn:hover span {
          color: black;
        }
        .cta-amber {
          border-color: rgba(245, 158, 11, 0.5);
          color: #f59e0b;
        }
        .cta-amber::after {
          background: white;
        }
        .cta-amber:hover {
          border-color: white;
        }
        .cta-amber:hover span {
          color: black;
        }
        .cta-solid {
          background: white;
          color: black;
          border-color: white;
        }
        .cta-solid::after {
          background: #f59e0b;
        }
        .cta-solid span {
          color: black;
        }
        .noise {
          position: fixed;
          inset: 0;
          z-index: 200;
          pointer-events: none;
          background-image: url("https://grainy-gradients.vercel.app/noise.svg");
          opacity: 0.03;
          mix-blend-mode: overlay;
        }
        .svc-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          cursor: pointer;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          transition:
            background 0.2s,
            padding-left 0.25s;
        }
        .svc-item:hover,
        .svc-item.active {
          background: rgba(245, 158, 11, 0.04);
          padding-left: 28px;
        }
        .svc-item:last-child {
          border-bottom: none;
        }
        .rev-card {
          padding: 28px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.02);
          transition:
            border-color 0.3s,
            transform 0.3s,
            background 0.3s;
          position: relative;
          overflow: hidden;
        }
        .rev-card:hover {
          border-color: rgba(245, 158, 11, 0.25);
          transform: translateY(-3px);
          background: rgba(255, 255, 255, 0.035);
        }
        .barber-card {
          border: 1px solid rgba(255, 255, 255, 0.07);
          overflow: hidden;
          background: rgba(255, 255, 255, 0.02);
          transition:
            border-color 0.4s,
            transform 0.4s cubic-bezier(0.2, 1, 0.3, 1);
        }
        .barber-card:hover {
          border-color: rgba(245, 158, 11, 0.3);
          transform: translateY(-6px);
        }
        .gal-wrap {
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }
        .gal-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          filter: grayscale(1) brightness(0.65);
          transition:
            transform 1s cubic-bezier(0.2, 1, 0.3, 1),
            filter 0.6s;
        }
        .gal-wrap:hover .gal-img {
          transform: scale(1.06);
          filter: grayscale(0) brightness(0.9);
        }
        .gal-label {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 20px 18px 16px;
          background: linear-gradient(
            to top,
            rgba(4, 4, 4, 0.7) 0%,
            transparent 100%
          );
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .stripe {
          background-image: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 60px,
            rgba(245, 158, 11, 0.012) 60px,
            rgba(245, 158, 11, 0.012) 61px
          );
        }
        .stat-item {
          text-align: center;
          padding: 28px 20px;
          border-right: 1px solid rgba(255, 255, 255, 0.06);
        }
        .stat-item:last-child {
          border-right: none;
        }
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }
        .pulse {
          animation: pulse 2.2s ease-in-out infinite;
        }
        @media (max-width: 768px) {
          .desk-links {
            display: none !important;
          }
        }
        @media (min-width: 769px) {
          .mob-menu-btn {
            display: none !important;
          }
        }
        @media (max-width: 860px) {
          .svc-split {
            grid-template-columns: 1fr !important;
          }
          .svc-feature {
            display: none !important;
          }
        }
      `}</style>

      <LoadingScreen onComplete={() => setReady(true)} />

      {ready && (
        <>
          <div id="c1" />
          <div id="c2" />
          <div className="noise" />
          <div
            style={{
              position: "fixed",
              top: "-15%",
              right: "-8%",
              width: 650,
              height: 650,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 60%)",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: "-25%",
              left: "-12%",
              width: 800,
              height: 800,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.018) 0%, transparent 60%)",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />
          <div
            ref={canvasRef}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              pointerEvents: "none",
            }}
          />

          <nav
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              height: 60,
              padding: "0 clamp(20px,4vw,48px)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(4,4,4,0.82)",
              backdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <a
              href="/"
              style={{
                ...sf,
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "-0.05em",
                textDecoration: "none",
                color: "white",
                minHeight: "unset",
              }}
            >
              HEADZ
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </a>
            <div
              className="desk-links"
              style={{ display: "flex", gap: 32, alignItems: "center" }}
            >
              {["services", "barbers", "reviews", "location"].map((id) => (
                <a
                  key={id}
                  href={`#${id}`}
                  style={{
                    ...sf,
                    fontSize: 8,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "#52525b",
                    textDecoration: "none",
                    transition: "color 0.2s",
                    minHeight: "unset",
                  }}
                  onMouseEnter={(e) => (e.target.style.color = "#f59e0b")}
                  onMouseLeave={(e) => (e.target.style.color = "#52525b")}
                >
                  {id}
                </a>
              ))}
              <a
                href="/login"
                className="cta-btn"
                style={{
                  padding: "10px 22px",
                  fontSize: 8,
                  minHeight: "unset",
                }}
              >
                <span>Book Now</span>
              </a>
            </div>
            <button
              className="mob-menu-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                flexDirection: "column",
                gap: 5,
                minHeight: "unset",
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    display: "block",
                    width: 20,
                    height: 1.5,
                    background: menuOpen ? "#f59e0b" : "white",
                    transition: "all 0.3s",
                    transform: menuOpen
                      ? i === 0
                        ? "rotate(45deg) translate(4px,5px)"
                        : i === 2
                          ? "rotate(-45deg) translate(4px,-5px)"
                          : "none"
                      : "none",
                    opacity: menuOpen && i === 1 ? 0 : 1,
                  }}
                />
              ))}
            </button>
          </nav>

          {menuOpen && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 99,
                background: "rgba(4,4,4,0.98)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 48,
              }}
            >
              {["services", "barbers", "reviews", "location"].map((id) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    ...sf,
                    fontSize: "clamp(1.8rem,8vw,2.8rem)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "white",
                    textDecoration: "none",
                    letterSpacing: "-0.03em",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.target.style.color = "#f59e0b")}
                  onMouseLeave={(e) => (e.target.style.color = "white")}
                >
                  {id}
                </a>
              ))}
              <a
                href="/login"
                onClick={() => setMenuOpen(false)}
                style={{
                  ...sf,
                  fontSize: 10,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "black",
                  background: "#f59e0b",
                  padding: "16px 44px",
                  textDecoration: "none",
                  marginTop: 8,
                }}
              >
                Book Now →
              </a>
            </div>
          )}

          <main style={{ position: "relative", zIndex: 10 }}>
            {/* HERO */}
            <section
              style={{
                minHeight: "100svh",
                display: "grid",
                gridTemplateRows: "1fr auto",
                padding: "0 clamp(20px,4vw,56px)",
                paddingTop: 60,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "-2%",
                    transform: "translateY(-50%)",
                    zIndex: 0,
                    overflow: "hidden",
                    pointerEvents: "none",
                  }}
                >
                  <p
                    className="ghost-text"
                    style={{ fontSize: "clamp(7rem,25vw,22rem)" }}
                  >
                    HEADZ
                  </p>
                  <p
                    className="ghost-text ghost-amber"
                    style={{
                      fontSize: "clamp(6rem,20vw,18rem)",
                      marginTop: "-0.1em",
                      fontStyle: "italic",
                    }}
                  >
                    UP
                  </p>
                </div>
                <div style={{ position: "relative", zIndex: 1, maxWidth: 900 }}>
                  {/* FIX 2: JS clamp() → CSS clamp() string */}
                  <div
                    className="hf"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      marginBottom: "clamp(24px,4vw,40px)",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 14px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      <div
                        className="pulse"
                        style={{
                          width: 6,
                          height: 6,
                          background: "#22c55e",
                          borderRadius: "50%",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          ...sf,
                          fontSize: 7,
                          letterSpacing: "0.25em",
                          textTransform: "uppercase",
                          color: "#a1a1aa",
                        }}
                      >
                        Now Accepting Clients
                      </span>
                    </div>
                    <span
                      style={{
                        ...sf,
                        fontSize: 7,
                        letterSpacing: "0.4em",
                        textTransform: "uppercase",
                        color: "#f59e0b",
                      }}
                    >
                      Hattiesburg, MS
                    </span>
                  </div>
                  <div style={{ overflow: "hidden" }}>
                    <h1
                      className="hl"
                      style={{
                        ...sf,
                        fontSize: "clamp(3rem,9.5vw,8rem)",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        lineHeight: 0.87,
                        letterSpacing: "-0.04em",
                      }}
                    >
                      Where Sharp
                    </h1>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      flexWrap: "wrap",
                      gap: "0 0.25em",
                      overflow: "hidden",
                    }}
                  >
                    <h1
                      className="hl"
                      style={{
                        fontFamily: "'DM Serif Display',serif",
                        fontSize: "clamp(3.2rem,10.5vw,9rem)",
                        fontWeight: 400,
                        fontStyle: "italic",
                        lineHeight: 0.87,
                        color: "#f59e0b",
                      }}
                    >
                      Minds
                    </h1>
                    <h1
                      className="hl"
                      style={{
                        ...sf,
                        fontSize: "clamp(3rem,9.5vw,8rem)",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        lineHeight: 0.87,
                        letterSpacing: "-0.04em",
                      }}
                    >
                      Get
                    </h1>
                  </div>
                  <div style={{ overflow: "hidden" }}>
                    <h1
                      className="hl"
                      style={{
                        ...sf,
                        fontSize: "clamp(3rem,9.5vw,8rem)",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        lineHeight: 0.87,
                        letterSpacing: "-0.04em",
                      }}
                    >
                      Sharper<span style={{ color: "#f59e0b" }}>_</span>
                    </h1>
                  </div>
                  <div
                    className="hf"
                    style={{
                      marginTop: "clamp(28px,5vh,52px)",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "18px 40px",
                    }}
                  >
                    <a href="/login" className="cta-btn">
                      <span>Book Your Cut →</span>
                    </a>
                    <p
                      style={{
                        fontFamily: "'DM Serif Display',serif",
                        fontStyle: "italic",
                        fontSize: 14,
                        color: "#52525b",
                        maxWidth: 220,
                        lineHeight: 1.7,
                      }}
                    >
                      Hattiesburg's highest-rated shop. Real skill, every time.
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="hfl"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  margin: "0 -clamp(20px,4vw,56px)",
                }}
              >
                {[
                  {
                    label: "Google Rating",
                    value: "5.0",
                    suffix: "",
                    serif: true,
                  },
                  {
                    label: "Verified Reviews",
                    value: "155",
                    suffix: "+",
                    serif: false,
                  },
                  {
                    label: "Years Serving HB",
                    value: "5",
                    suffix: "+",
                    serif: false,
                  },
                ].map(({ label, value, suffix, serif }) => (
                  <div key={label} className="stat-item">
                    <p
                      style={{
                        fontFamily: serif
                          ? "'DM Serif Display',serif"
                          : "'Syncopate',sans-serif",
                        fontStyle: serif ? "italic" : "normal",
                        fontSize: "clamp(1.8rem,4vw,3rem)",
                        color: serif ? "#f59e0b" : "white",
                        lineHeight: 1,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        className="count-up"
                        data-target={parseFloat(value)}
                      >
                        {value}
                      </span>
                      <span style={{ fontSize: "0.55em", color: "#f59e0b" }}>
                        {suffix}
                      </span>
                    </p>
                    <p
                      style={{
                        ...sf,
                        fontSize: 7,
                        letterSpacing: "0.3em",
                        color: "#3f3f46",
                        textTransform: "uppercase",
                      }}
                    >
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* TICKER */}
            <div
              style={{
                padding: "16px 0",
                borderTop: "1px solid rgba(255,255,255,0.04)",
                background: "rgba(245,158,11,0.025)",
                overflow: "hidden",
              }}
            >
              <div className="ticker-track">
                {[0, 1].map((j) => (
                  <div key={j} style={{ display: "flex", flexShrink: 0 }}>
                    {TICKER_ITEMS.map((item, i) => (
                      <span
                        key={i}
                        style={{
                          ...sf,
                          fontSize: 8,
                          letterSpacing: "0.35em",
                          textTransform: "uppercase",
                          padding: "0 24px",
                          color: "#3f3f46",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item}
                        <span style={{ color: "#f59e0b", marginLeft: 24 }}>
                          ◆
                        </span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* SERVICES */}
            <section
              id="services"
              style={{ padding: "clamp(80px,12vh,140px) clamp(20px,4vw,56px)" }}
            >
              <div style={{ maxWidth: 1180, margin: "0 auto" }}>
                <div
                  className="sr"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginBottom: 56,
                    flexWrap: "wrap",
                    gap: 20,
                  }}
                >
                  <div>
                    <p className="sec-label" style={{ marginBottom: 14 }}>
                      — What We Offer
                    </p>
                    <h2
                      style={{
                        fontFamily: "'DM Serif Display',serif",
                        fontSize: "clamp(2.6rem,6vw,4.8rem)",
                        fontWeight: 400,
                        lineHeight: 0.88,
                        color: "white",
                      }}
                    >
                      The
                      <br />
                      <em style={{ color: "#f59e0b" }}>Menu</em>
                    </h2>
                  </div>
                  <a href="/login" className="cta-btn cta-amber">
                    <span>Book a Service →</span>
                  </a>
                </div>
                <div
                  className="svc-split"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 2,
                  }}
                >
                  <div
                    className="svc-feature"
                    style={{
                      background: "rgba(245,158,11,0.03)",
                      border: "1px solid rgba(245,158,11,0.1)",
                      padding: "clamp(28px,4vw,48px)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: 440,
                      position: "relative",
                      overflow: "hidden",
                    }}
                    onMouseEnter={() => clearInterval(cycleRef.current)}
                    onMouseLeave={() => startCycle()}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: -60,
                        right: -60,
                        width: 240,
                        height: 240,
                        border: "1px solid rgba(245,158,11,0.04)",
                        borderRadius: "50%",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: -80,
                        left: -80,
                        width: 320,
                        height: 320,
                        border: "1px solid rgba(245,158,11,0.03)",
                        borderRadius: "50%",
                        pointerEvents: "none",
                      }}
                    />
                    <div style={{ position: "relative", zIndex: 1 }}>
                      <span
                        style={{
                          ...sf,
                          fontSize: 7,
                          letterSpacing: "0.45em",
                          textTransform: "uppercase",
                          color: "#f59e0b",
                          display: "block",
                          marginBottom: 14,
                        }}
                      >
                        {SERVICES[displayIdx].tag}
                      </span>
                      <h3
                        style={{
                          fontFamily: "'DM Serif Display',serif",
                          fontSize: "clamp(2rem,4.5vw,3.4rem)",
                          lineHeight: 1,
                          color: "white",
                          marginBottom: 14,
                        }}
                      >
                        {SERVICES[displayIdx].name}
                      </h3>
                      <p
                        style={{
                          fontFamily: "'DM Serif Display',serif",
                          fontStyle: "italic",
                          fontSize: 15,
                          color: "#71717a",
                          lineHeight: 1.8,
                        }}
                      >
                        {SERVICES[displayIdx].desc}
                      </p>
                    </div>
                    <div style={{ position: "relative", zIndex: 1 }}>
                      <p
                        style={{
                          fontFamily: "'DM Serif Display',serif",
                          fontStyle: "italic",
                          fontSize: "clamp(3.5rem,7vw,5.5rem)",
                          color: "#f59e0b",
                          lineHeight: 1,
                          marginBottom: 20,
                        }}
                      >
                        {SERVICES[displayIdx].price}
                      </p>
                      <div style={{ display: "flex", gap: 5 }}>
                        {SERVICES.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveService(i)}
                            style={{
                              height: 2,
                              flex: 1,
                              background:
                                i === displayIdx
                                  ? "#f59e0b"
                                  : "rgba(255,255,255,0.1)",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              minHeight: "unset",
                              transition: "background 0.3s",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                    {SERVICES.map((svc, i) => (
                      <div
                        key={svc.name}
                        className={`svc-item${i === displayIdx ? " active" : ""}`}
                        onClick={() => setActiveService(i)}
                        onMouseEnter={() => setHoveredService(i)}
                        onMouseLeave={() => setHoveredService(null)}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'DM Mono',monospace",
                              fontSize: 9,
                              color:
                                i === displayIdx
                                  ? "#f59e0b"
                                  : "rgba(255,255,255,0.15)",
                              flexShrink: 0,
                            }}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span
                            style={{
                              ...sf,
                              fontSize: 9,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              color: i === displayIdx ? "white" : "#5a5a5a",
                              transition: "color 0.2s",
                            }}
                          >
                            {svc.name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontFamily: "'DM Serif Display',serif",
                            fontStyle: "italic",
                            fontSize: 15,
                            color: i === displayIdx ? "#f59e0b" : "#3a3a3a",
                            flexShrink: 0,
                            marginLeft: 12,
                            transition: "color 0.2s",
                          }}
                        >
                          {svc.price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "none" }} className="svc-mobile-grid">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2,1fr)",
                      gap: 8,
                      marginTop: 2,
                    }}
                  >
                    {SERVICES.map((svc) => (
                      <div
                        key={svc.name}
                        style={{
                          padding: "18px 16px",
                          border: "1px solid rgba(255,255,255,0.06)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            ...sf,
                            fontSize: 8,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: "white",
                          }}
                        >
                          {svc.name}
                        </span>
                        <span
                          style={{
                            fontFamily: "'DM Serif Display',serif",
                            fontStyle: "italic",
                            fontSize: 14,
                            color: "#f59e0b",
                            flexShrink: 0,
                          }}
                        >
                          {svc.price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* BARBERS */}
            <section
              id="barbers"
              style={{
                padding: "clamp(80px,12vh,140px) clamp(20px,4vw,56px)",
                background: "rgba(6,6,6,0.96)",
              }}
              className="stripe"
            >
              <div style={{ maxWidth: 1180, margin: "0 auto" }}>
                <div className="sr" style={{ marginBottom: 64 }}>
                  <p className="sec-label" style={{ marginBottom: 14 }}>
                    — Behind The Chair
                  </p>
                  <h2
                    style={{
                      fontFamily: "'DM Serif Display',serif",
                      fontSize: "clamp(2.6rem,6vw,4.8rem)",
                      fontWeight: 400,
                      lineHeight: 0.88,
                    }}
                  >
                    Your
                    <br />
                    <em style={{ color: "#f59e0b" }}>Barbers</em>
                  </h2>
                </div>
                <div
                  className="sr-group"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
                    gap: 20,
                  }}
                >
                  {[
                    {
                      name: "Jarvis",
                      initial: "J",
                      specialty: "Fades · Cuts · Kids · Lines",
                      bio: "Known for clean fades and flawless precision. Jarvis brings energy and consistency to every single client.",
                    },
                    {
                      name: "Mr. J",
                      initial: "M",
                      specialty: "Classics · Shaves · Seniors",
                      bio: "Old school technique with modern execution. Mr. J delivers razor-sharp results and a smooth chair-side experience.",
                    },
                  ].map((b) => (
                    <div key={b.name} className="barber-card sr-child">
                      <div
                        style={{
                          height: 300,
                          background:
                            "linear-gradient(160deg, #111 0%, #0a0a0a 100%)",
                          position: "relative",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "radial-gradient(ellipse at 50% 100%, rgba(245,158,11,0.07) 0%, transparent 65%)",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: 16,
                            left: 16,
                            width: 40,
                            height: 40,
                            borderTop: "1.5px solid rgba(245,158,11,0.35)",
                            borderLeft: "1.5px solid rgba(245,158,11,0.35)",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            bottom: 16,
                            right: 16,
                            width: 40,
                            height: 40,
                            borderBottom: "1.5px solid rgba(245,158,11,0.35)",
                            borderRight: "1.5px solid rgba(245,158,11,0.35)",
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "'DM Serif Display',serif",
                            fontStyle: "italic",
                            fontSize: 120,
                            color: "rgba(245,158,11,0.07)",
                            lineHeight: 1,
                            userSelect: "none",
                          }}
                        >
                          {b.initial}
                        </span>
                      </div>
                      <div style={{ padding: "24px 26px 28px" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 10,
                          }}
                        >
                          <div>
                            <h3
                              style={{
                                ...sf,
                                fontSize: 16,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                color: "white",
                                marginBottom: 4,
                              }}
                            >
                              {b.name}
                            </h3>
                            <p
                              style={{
                                ...sf,
                                fontSize: 7,
                                letterSpacing: "0.2em",
                                textTransform: "uppercase",
                                color: "#f59e0b",
                              }}
                            >
                              {b.specialty}
                            </p>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                            }}
                          >
                            <div
                              className="pulse"
                              style={{
                                width: 6,
                                height: 6,
                                background: "#22c55e",
                                borderRadius: "50%",
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                ...sf,
                                fontSize: 7,
                                letterSpacing: "0.15em",
                                textTransform: "uppercase",
                                color: "#4ade80",
                              }}
                            >
                              Accepting
                            </span>
                          </div>
                        </div>
                        <p
                          style={{
                            fontFamily: "'DM Serif Display',serif",
                            fontStyle: "italic",
                            fontSize: 14,
                            color: "#71717a",
                            lineHeight: 1.8,
                            marginBottom: 22,
                          }}
                        >
                          {b.bio}
                        </p>
                        <a
                          href="/login"
                          className="cta-btn"
                          style={{
                            width: "100%",
                            fontSize: 8,
                            padding: "12px",
                          }}
                        >
                          <span>Book with {b.name} →</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* GALLERY */}
            <section
              style={{ padding: "clamp(80px,12vh,140px) clamp(20px,4vw,56px)" }}
            >
              <div style={{ maxWidth: 1180, margin: "0 auto" }}>
                <div
                  className="sr"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginBottom: 40,
                    flexWrap: "wrap",
                    gap: 20,
                  }}
                >
                  <div>
                    <p className="sec-label" style={{ marginBottom: 14 }}>
                      — The Portfolio
                    </p>
                    <h2
                      style={{
                        fontFamily: "'DM Serif Display',serif",
                        fontSize: "clamp(2.6rem,6vw,4.8rem)",
                        fontWeight: 400,
                        lineHeight: 0.88,
                      }}
                    >
                      The
                      <br />
                      <em style={{ color: "#f59e0b" }}>Work</em>
                    </h2>
                  </div>
                  <p
                    style={{
                      fontFamily: "'DM Serif Display',serif",
                      fontStyle: "italic",
                      fontSize: 14,
                      color: "#3f3f46",
                      maxWidth: 240,
                      lineHeight: 1.8,
                    }}
                  >
                    Every cut is intentional. Every client leaves different.
                  </p>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gridTemplateRows: "auto auto",
                    gap: 3,
                  }}
                >
                  {[
                    {
                      src: "pic2.jpeg",
                      span: "1 / 2",
                      rowSpan: "1 / 3",
                      ratio: "3/4",
                    },
                    {
                      src: "pic3.jpeg",
                      span: "2 / 3",
                      rowSpan: "1 / 2",
                      ratio: "4/3",
                    },
                    {
                      src: "pic4.jpeg",
                      span: "3 / 4",
                      rowSpan: "1 / 3",
                      ratio: "3/4",
                    },
                  ].map(({ src, span, rowSpan, ratio }, i) => (
                    <div
                      key={src}
                      className="gal-wrap"
                      style={{
                        gridColumn: span,
                        gridRow: rowSpan,
                        aspectRatio: ratio,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/${src}`}
                        alt={`Cut ${i + 1}`}
                        className="gal-img"
                      />
                      <div className="gal-label">
                        <span
                          style={{
                            ...sf,
                            fontSize: 7,
                            letterSpacing: "0.3em",
                            color: "rgba(255,255,255,0.35)",
                            textTransform: "uppercase",
                          }}
                        >
                          0{i + 1}
                        </span>
                        <span
                          style={{
                            ...sf,
                            fontSize: 7,
                            letterSpacing: "0.25em",
                            color: "rgba(255,255,255,0.25)",
                            textTransform: "uppercase",
                          }}
                        >
                          HEADZ UP
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* REVIEWS */}
            <section
              id="reviews"
              style={{
                padding: "clamp(80px,12vh,140px) clamp(20px,4vw,56px)",
                background: "rgba(4,4,4,0.98)",
              }}
            >
              <div style={{ maxWidth: 1180, margin: "0 auto" }}>
                <div
                  className="sr"
                  style={{
                    display: "flex",
                    gap: "clamp(24px,5vw,64px)",
                    alignItems: "flex-start",
                    marginBottom: 72,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontFamily: "'DM Serif Display',serif",
                        fontStyle: "italic",
                        fontSize: "clamp(6rem,16vw,12rem)",
                        color: "#f59e0b",
                        lineHeight: 0.8,
                      }}
                    >
                      5.0
                    </p>
                    <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          style={{ color: "#f59e0b", fontSize: 14 }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    style={{
                      paddingLeft: "clamp(24px,4vw,48px)",
                      borderLeft: "1px solid rgba(255,255,255,0.06)",
                      alignSelf: "stretch",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: 12,
                    }}
                  >
                    <h2
                      style={{
                        fontFamily: "'DM Serif Display',serif",
                        fontSize: "clamp(1.4rem,3.5vw,2.6rem)",
                        color: "white",
                        lineHeight: 1.2,
                        maxWidth: 380,
                      }}
                    >
                      Hattiesburg's highest-rated barbershop.{" "}
                      <em style={{ color: "#f59e0b" }}>
                        155+ verified reviews.
                      </em>
                    </h2>
                    <p
                      style={{
                        ...sf,
                        fontSize: 7,
                        letterSpacing: "0.4em",
                        color: "#3f3f46",
                        textTransform: "uppercase",
                      }}
                    >
                      Verified on Booksy
                    </p>
                  </div>
                </div>
                <div
                  className="sr-group"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                    gap: 10,
                  }}
                >
                  {REVIEWS.map((r) => (
                    <div key={r.name} className="rev-card sr-child">
                      <div
                        style={{
                          position: "absolute",
                          top: -8,
                          right: 14,
                          fontFamily: "'DM Serif Display',serif",
                          fontStyle: "italic",
                          fontSize: 80,
                          color: "rgba(245,158,11,0.04)",
                          lineHeight: 1,
                          userSelect: "none",
                          pointerEvents: "none",
                        }}
                      >
                        "
                      </div>
                      <div
                        style={{ display: "flex", gap: 2, marginBottom: 14 }}
                      >
                        {[...Array(5)].map((_, j) => (
                          <span
                            key={j}
                            style={{ color: "#f59e0b", fontSize: 11 }}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <p
                        style={{
                          fontFamily: "'DM Serif Display',serif",
                          fontStyle: "italic",
                          fontSize: 14,
                          color: "#c4c4c8",
                          lineHeight: 1.85,
                          marginBottom: 22,
                        }}
                      >
                        &ldquo;{r.quote}&rdquo;
                      </p>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: 14,
                          borderTop: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <span
                          style={{
                            ...sf,
                            fontSize: 8,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: "white",
                          }}
                        >
                          {r.name}
                        </span>
                        <span
                          style={{
                            fontFamily: "'DM Mono',monospace",
                            fontSize: 10,
                            color: "#3f3f46",
                            fontStyle: "italic",
                          }}
                        >
                          {r.date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* LOCATION */}
            <section
              id="location"
              style={{
                padding: "clamp(80px,12vh,140px) clamp(20px,4vw,56px)",
                background: "rgba(6,6,6,0.98)",
              }}
            >
              <div style={{ maxWidth: 1180, margin: "0 auto" }}>
                <div className="sr" style={{ marginBottom: 64 }}>
                  <p className="sec-label" style={{ marginBottom: 14 }}>
                    — Come See Us
                  </p>
                  <h2
                    style={{
                      fontFamily: "'DM Serif Display',serif",
                      fontSize: "clamp(2.6rem,6vw,4.8rem)",
                      fontWeight: 400,
                      lineHeight: 0.88,
                    }}
                  >
                    Find
                    <br />
                    <em style={{ color: "#f59e0b" }}>Us</em>
                  </h2>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
                    gap: 56,
                  }}
                >
                  <div className="sr">
                    <div style={{ marginBottom: 36 }}>
                      <p
                        style={{
                          ...sf,
                          fontSize: 7,
                          letterSpacing: "0.5em",
                          color: "#3f3f46",
                          textTransform: "uppercase",
                          marginBottom: 10,
                        }}
                      >
                        Address
                      </p>
                      <p
                        style={{
                          fontFamily: "'DM Serif Display',serif",
                          fontSize: 22,
                          lineHeight: 1.4,
                        }}
                      >
                        4 Hub Dr
                        <br />
                        <em style={{ color: "#f59e0b" }}>
                          Hattiesburg, MS 39402
                        </em>
                      </p>
                    </div>
                    <div style={{ marginBottom: 36 }}>
                      <p
                        style={{
                          ...sf,
                          fontSize: 7,
                          letterSpacing: "0.5em",
                          color: "#3f3f46",
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
                            maxWidth: 300,
                            padding: "11px 0",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <span
                            style={{
                              ...sf,
                              fontSize: 9,
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                              color: closed ? "#2a2a2a" : "#71717a",
                            }}
                          >
                            {day}
                          </span>
                          <span
                            style={{
                              fontFamily: "'DM Mono',monospace",
                              fontSize: 11,
                              color: closed ? "#2a2a2a" : "white",
                            }}
                          >
                            {hrs}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 22 }}>
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
                            letterSpacing: "0.25em",
                            color: "#3f3f46",
                            textDecoration: "none",
                            borderBottom: "1px solid #3f3f46",
                            paddingBottom: 2,
                            transition: "color 0.2s, border-color 0.2s",
                            minHeight: "unset",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#f59e0b";
                            e.currentTarget.style.borderColor = "#f59e0b";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#3f3f46";
                            e.currentTarget.style.borderColor = "#3f3f46";
                          }}
                        >
                          {label}
                        </a>
                      ))}
                    </div>
                  </div>
                  <div
                    className="sr"
                    style={{
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.05)",
                      minHeight: 380,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 1,
                        background:
                          "linear-gradient(to right, transparent, rgba(245,158,11,0.4), transparent)",
                        zIndex: 2,
                      }}
                    />
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3366.5!2d-89.3985!3d31.3271!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s4+Hub+Dr%2C+Hattiesburg%2C+MS+39402!5e0!3m2!1sen!2sus!4v1"
                      width="100%"
                      height="100%"
                      style={{
                        border: 0,
                        filter: "grayscale(1) invert(0.88) contrast(0.82)",
                        display: "block",
                        minHeight: 380,
                      }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* FINAL CTA */}
            <section
              style={{
                padding: "clamp(80px,14vh,160px) clamp(20px,4vw,56px)",
                background: "#f59e0b",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "repeating-linear-gradient(-45deg, transparent, transparent 50px, rgba(0,0,0,0.03) 50px, rgba(0,0,0,0.03) 51px)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: "-2%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontFamily: "'DM Serif Display',serif",
                  fontStyle: "italic",
                  fontSize: "clamp(8rem,20vw,17rem)",
                  color: "rgba(0,0,0,0.06)",
                  lineHeight: 1,
                  pointerEvents: "none",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Book Now
              </div>
              <div
                style={{
                  maxWidth: 1180,
                  margin: "0 auto",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div className="sr">
                  <p
                    style={{
                      ...sf,
                      fontSize: 8,
                      letterSpacing: "0.5em",
                      color: "rgba(0,0,0,0.4)",
                      textTransform: "uppercase",
                      marginBottom: 14,
                    }}
                  >
                    — Ready?
                  </p>
                  <h2
                    style={{
                      fontFamily: "'DM Serif Display',serif",
                      fontSize: "clamp(3rem,8vw,7rem)",
                      fontWeight: 400,
                      color: "black",
                      lineHeight: 0.88,
                      marginBottom: 44,
                    }}
                  >
                    Your Next
                    <br />
                    <em>Cut Awaits</em>
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 16,
                      alignItems: "center",
                    }}
                  >
                    <a
                      href="/login"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "18px 44px",
                        background: "black",
                        color: "white",
                        textDecoration: "none",
                        ...sf,
                        fontSize: 9,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        transition: "all 0.3s",
                        minHeight: "unset",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.color = "black";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "black";
                        e.currentTarget.style.color = "white";
                      }}
                    >
                      Book Your Appointment →
                    </a>
                    <p
                      style={{
                        fontFamily: "'DM Serif Display',serif",
                        fontStyle: "italic",
                        fontSize: 14,
                        color: "rgba(0,0,0,0.45)",
                      }}
                    >
                      Online booking in under 60 seconds.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* FOOTER */}
            <footer
              style={{
                padding: "32px clamp(20px,4vw,56px)",
                background: "#040404",
                borderTop: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  maxWidth: 1180,
                  margin: "0 auto",
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <div
                  style={{
                    ...sf,
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: "-0.05em",
                  }}
                >
                  HEADZ
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    UP
                  </span>
                </div>
                <p
                  style={{
                    ...sf,
                    fontSize: 7,
                    color: "#1c1c1e",
                    letterSpacing: "0.5em",
                    textTransform: "uppercase",
                  }}
                >
                  © 2026 HEADZUP BARBERSHOP · HATTIESBURG, MS
                </p>
                <a
                  href="/terms"
                  style={{
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: "#27272a",
                    textDecoration: "underline",
                    transition: "color 0.2s",
                    minHeight: "unset",
                  }}
                  onMouseEnter={(e) => (e.target.style.color = "#f59e0b")}
                  onMouseLeave={(e) => (e.target.style.color = "#27272a")}
                >
                  Terms & Privacy
                </a>
              </div>
            </footer>
          </main>
        </>
      )}
    </>
  );
}
