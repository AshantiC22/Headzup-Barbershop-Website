"use client";

import { useEffect, useState } from "react";

export default function PWAProvider() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          setSwRegistered(true);
          console.log("[PWA] Service worker registered:", reg.scope);
        })
        .catch((err) => console.warn("[PWA] SW registration failed:", err));
    }

    // Android/Chrome — capture beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari — show manual hint if not standalone
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setTimeout(() => setShowIOSHint(true), 3000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log("[PWA] Install outcome:", outcome);
    setInstallPrompt(null);
    setShowBanner(false);
  };

  const dismiss = () => {
    setShowBanner(false);
    setShowIOSHint(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  };

  const sf = { fontFamily: "'Syncopate', sans-serif" };

  // ── Android/Chrome install banner ─────────────────────────────────────────
  if (showBanner && installPrompt && !dismissed) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 99998,
          background: "#0a0a0a",
          borderTop: "1px solid rgba(245,158,11,0.3)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          animation: "slide-up 0.4s cubic-bezier(0.2,1,0.3,1) both",
        }}
      >
        <style>{`
          @keyframes slide-up { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        `}</style>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 44,
              height: 44,
              background: "#f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                ...sf,
                fontWeight: 900,
                fontSize: 12,
                color: "black",
                letterSpacing: "-0.04em",
              }}
            >
              HU
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                ...sf,
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 3px",
                color: "white",
              }}
            >
              Add to Home Screen
            </p>
            <p
              style={{
                fontFamily: "'DM Serif Display',serif",
                fontStyle: "italic",
                fontSize: 12,
                color: "#52525b",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Book cuts faster — no browser needed
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={dismiss}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#71717a",
              ...sf,
              fontSize: 8,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "#71717a";
            }}
          >
            Not Now
          </button>
          <button
            onClick={handleInstall}
            style={{
              padding: "10px 20px",
              background: "#f59e0b",
              color: "black",
              border: "none",
              ...sf,
              fontSize: 8,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "white")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f59e0b")}
          >
            Install →
          </button>
        </div>
      </div>
    );
  }

  // ── iOS Safari install hint ───────────────────────────────────────────────
  if (showIOSHint && !dismissed) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 24,
          left: 16,
          right: 16,
          zIndex: 99998,
          background: "#0a0a0a",
          border: "1px solid rgba(245,158,11,0.3)",
          padding: "18px 20px 20px",
          animation: "slide-up 0.4s cubic-bezier(0.2,1,0.3,1) both",
        }}
      >
        <style>{`@keyframes slide-up { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }`}</style>

        {/* Close */}
        <button
          onClick={dismiss}
          style={{
            position: "absolute",
            top: 12,
            right: 14,
            background: "none",
            border: "none",
            color: "#52525b",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ✕
        </button>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              background: "#f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{ ...sf, fontWeight: 900, fontSize: 11, color: "black" }}
            >
              HU
            </span>
          </div>
          <div>
            <p
              style={{
                ...sf,
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 4px",
                color: "white",
              }}
            >
              Add HEADZ UP to Home Screen
            </p>
            <p
              style={{
                fontFamily: "'DM Serif Display',serif",
                fontStyle: "italic",
                fontSize: 12,
                color: "#52525b",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Book cuts faster — works like a real app
            </p>
          </div>
        </div>

        {/* Step-by-step instructions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            {
              n: "1",
              text: "Tap the Share button at the bottom of Safari",
              icon: "⬆️",
            },
            {
              n: "2",
              text: 'Scroll down and tap "Add to Home Screen"',
              icon: "➕",
            },
            { n: "3", text: 'Tap "Add" — done!', icon: "✓" },
          ].map(({ n, text, icon }) => (
            <div
              key={n}
              style={{ display: "flex", gap: 10, alignItems: "center" }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  border: "1px solid rgba(245,158,11,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ ...sf, fontSize: 8, color: "#f59e0b" }}>
                  {n}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#a1a1aa", margin: 0 }}>
                {icon} {text}
              </p>
            </div>
          ))}
        </div>

        {/* Arrow pointing to browser chrome */}
        <div style={{ marginTop: 14, textAlign: "center" }}>
          <p
            style={{
              ...sf,
              fontSize: 7,
              color: "#3f3f46",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            ↑ Share button is in your browser toolbar
          </p>
        </div>
      </div>
    );
  }

  return null;
}
