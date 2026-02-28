"use client";
// app/offline/page.js
export default function OfflinePage() {
  const sf = { fontFamily: "'Syncopate', sans-serif" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Serif+Display:ital@1&display=swap');
        html, body { background: #040404 !important; margin: 0; padding: 0; color: white; }
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.03,
          backgroundImage: "url('/noise.svg')",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "40%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 500,
          height: 500,
          background:
            "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          textAlign: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Wifi icon */}
        <div
          style={{
            marginBottom: 32,
            animation: "pulse 2.5s ease-in-out infinite",
          }}
        >
          <svg
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(245,158,11,0.5)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" fill="rgba(245,158,11,0.5)" />
          </svg>
        </div>

        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              ...sf,
              fontSize: 8,
              letterSpacing: "0.5em",
              color: "#f59e0b",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            No Connection
          </p>
          <h1 style={{ margin: "0 0 8px" }}>
            <span
              style={{
                ...sf,
                fontSize: "clamp(1.8rem,6vw,3rem)",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "-0.04em",
              }}
            >
              You're{" "}
            </span>
            <span
              style={{
                fontFamily: "'DM Serif Display',serif",
                fontStyle: "italic",
                fontSize: "clamp(2rem,6.5vw,3.3rem)",
                color: "#f59e0b",
              }}
            >
              Offline_
            </span>
          </h1>
        </div>

        <p
          style={{
            fontFamily: "'DM Serif Display',serif",
            fontStyle: "italic",
            fontSize: 15,
            color: "#52525b",
            maxWidth: 320,
            lineHeight: 1.85,
            marginBottom: 40,
          }}
        >
          Check your internet connection and try again. Your appointment data is
          safe.
        </p>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "16px 40px",
            background: "#f59e0b",
            color: "black",
            ...sf,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            border: "none",
            cursor: "pointer",
            transition: "background 0.3s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "white")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#f59e0b")}
        >
          Try Again →
        </button>

        <p
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
