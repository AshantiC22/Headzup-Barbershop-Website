"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";

export default function NotFound() {
  const router = useRouter();
  const sf = { fontFamily: "'Syncopate',sans-serif" };
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!ready) return;
    gsap
      .timeline({ defaults: { ease: "expo.out" } })
      .from(".nf-num", { y: 70, opacity: 0, duration: 1.3 })
      .from(".nf-title", { y: 30, opacity: 0, duration: 0.9 }, "-=0.6")
      .from(".nf-sub", { y: 20, opacity: 0, duration: 0.7 }, "-=0.5")
      .from(".nf-btns", { y: 20, opacity: 0, duration: 0.6 }, "-=0.4")
      .from(".nf-brand", { opacity: 0, duration: 0.6 }, "-=0.3");
  }, [ready]);

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400&display=swap");
        html,
        body {
          background: #040404 !important;
          margin: 0;
          padding: 0;
          color: white;
        }
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }
        ::selection {
          background: rgba(245, 158, 11, 0.3);
          color: white;
        }
        .nf-outline {
          color: transparent;
          -webkit-text-stroke: 1px rgba(245, 158, 11, 0.25);
          font-family: "Syncopate", sans-serif;
          font-weight: 900;
          letter-spacing: -0.06em;
          text-transform: uppercase;
        }
        @keyframes nf-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes nf-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>

      {/* Grain */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.03,
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.svg')",
        }}
      />
      {/* Glow */}
      <div
        style={{
          position: "fixed",
          top: "40%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 600,
          height: 600,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(245,158,11,0.055) 0%, transparent 65%)",
        }}
      />

      {/* Nav */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: 60,
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(4,4,4,0.85)",
          backdropFilter: "blur(16px)",
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
            color: "white",
            textDecoration: "none",
          }}
        >
          HEADZ<span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
        </a>
      </nav>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px 60px",
          textAlign: "center",
        }}
      >
        {/* 404 number */}
        <div
          className="nf-num"
          style={{ position: "relative", marginBottom: 4 }}
        >
          <h1
            className="nf-outline"
            style={{
              fontSize: "clamp(8rem,22vw,16rem)",
              lineHeight: 0.85,
              margin: 0,
            }}
          >
            404
          </h1>
          {/* Scissor icon floating in center */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              animation: "nf-float 3s ease-in-out infinite",
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.7 }}
            >
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" />
              <line x1="14.47" y1="14.48" x2="20" y2="20" />
              <line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
          </div>
        </div>

        {/* Horizontal rule */}
        <div
          style={{
            width: 64,
            height: 1,
            background: "rgba(245,158,11,0.3)",
            margin: "20px auto 24px",
          }}
        />

        {/* Title */}
        <h2 className="nf-title" style={{ margin: "0 0 16px" }}>
          <span
            style={{
              ...sf,
              fontSize: "clamp(1.3rem,4.5vw,2.2rem)",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "-0.03em",
              color: "white",
            }}
          >
            This Page Got{" "}
          </span>
          <span
            style={{
              fontFamily: "'DM Serif Display',serif",
              fontStyle: "italic",
              fontSize: "clamp(1.5rem,5vw,2.5rem)",
              color: "#f59e0b",
            }}
          >
            Cut_
          </span>
        </h2>

        {/* Sub */}
        <p
          className="nf-sub"
          style={{
            fontFamily: "'DM Serif Display',serif",
            fontStyle: "italic",
            fontSize: 16,
            color: "#52525b",
            maxWidth: 340,
            lineHeight: 1.8,
            margin: "0 0 44px",
          }}
        >
          Looks like this page doesn&apos;t exist. It may have been moved,
          deleted, or you typed the wrong URL.
        </p>

        {/* Buttons */}
        <div
          className="nf-btns"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <a
            href="/"
            style={{
              padding: "16px 36px",
              background: "#f59e0b",
              color: "black",
              ...sf,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              textDecoration: "none",
              transition: "all 0.3s",
              display: "inline-flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f59e0b";
            }}
          >
            Take Me Home →
          </a>
          <a
            href="/book"
            style={{
              padding: "16px 36px",
              background: "transparent",
              color: "#52525b",
              ...sf,
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              border: "1px solid rgba(255,255,255,0.1)",
              textDecoration: "none",
              transition: "all 0.3s",
              display: "inline-flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "#52525b";
            }}
          >
            Book A Cut
          </a>
        </div>

        {/* Bottom brand */}
        <p
          className="nf-brand"
          style={{
            position: "absolute",
            bottom: 28,
            ...sf,
            fontSize: 7,
            color: "#1c1c1e",
            letterSpacing: "0.55em",
            textTransform: "uppercase",
          }}
        >
          HEADZ UP BARBERSHOP · HATTIESBURG, MS
        </p>
      </div>
    </>
  );
}
