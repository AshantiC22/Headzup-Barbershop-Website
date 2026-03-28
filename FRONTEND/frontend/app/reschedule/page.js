"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import API from "@/lib/api";

const sf = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

function RescheduleRespondInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("loading"); // loading | success | rejected | error | invalid

  useEffect(() => {
    const token = searchParams.get("token");
    const action = searchParams.get("action");

    if (!token || !["accept", "reject"].includes(action)) {
      setStatus("invalid");
      return;
    }

    // Hit the backend respond endpoint
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/reschedule/respond/?token=${token}&action=${action}`;
    // Backend redirects to frontend /?reschedule=accepted|rejected|invalid
    // But since we're on Next.js we call the API directly
    API.get(`reschedule/respond/?token=${token}&action=${action}`)
      .then(() => {
        setStatus(action === "accept" ? "accepted" : "rejected");
      })
      .catch((err) => {
        const msg = err.response?.data?.detail || "";
        if (msg.includes("already")) setStatus("already");
        else setStatus("error");
      });
  }, []);

  const CONFIG = {
    loading: {
      icon: "↻",
      color: "#f59e0b",
      title: "Processing...",
      sub: "Please wait a moment.",
    },
    accepted: {
      icon: "✓",
      color: "#4ade80",
      title: "Reschedule Accepted",
      sub: "The appointment has been updated. Check your dashboard for the new time.",
    },
    rejected: {
      icon: "✕",
      color: "#f87171",
      title: "Reschedule Rejected",
      sub: "The original appointment time has been kept.",
    },
    already: {
      icon: "!",
      color: "#f59e0b",
      title: "Already Handled",
      sub: "This reschedule request has already been responded to.",
    },
    invalid: {
      icon: "?",
      color: "#52525b",
      title: "Invalid Link",
      sub: "This link is invalid or has expired.",
    },
    error: {
      icon: "!",
      color: "#f87171",
      title: "Something Went Wrong",
      sub: "Please try again or contact the shop.",
    },
  };

  const cfg = CONFIG[status] || CONFIG.loading;

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@400;500&display=swap");
        *,
        *::before,
        *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          background: #040404;
          color: white;
          min-height: 100vh;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Background grain */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          opacity: 0.025,
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.svg')",
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
          padding: "24px",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 48 }}>
          <p
            style={{
              ...sf,
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: "-0.05em",
              textAlign: "center",
            }}
          >
            HEADZ
            <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            padding: "40px 32px",
            textAlign: "center",
            animation: "fadeUp 0.5s ease",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: `${cfg.color}18`,
              border: `1px solid ${cfg.color}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              animation:
                status === "loading" ? "spin 1s linear infinite" : "none",
            }}
          >
            <span style={{ fontSize: 24, color: cfg.color, fontWeight: 900 }}>
              {cfg.icon}
            </span>
          </div>

          <p
            style={{
              ...sf,
              fontSize: 7,
              letterSpacing: "0.4em",
              color: "#52525b",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            HEADZ UP Barbershop
          </p>

          <h1
            style={{
              ...sf,
              fontSize: "clamp(1.2rem,4vw,1.6rem)",
              fontWeight: 900,
              textTransform: "uppercase",
              lineHeight: 1.1,
              color: "white",
              marginBottom: 16,
            }}
          >
            {cfg.title.split(" ").slice(0, -1).join(" ")}{" "}
            <span style={{ color: cfg.color, fontStyle: "italic" }}>
              {cfg.title.split(" ").slice(-1)[0]}_
            </span>
          </h1>

          <p
            style={{
              ...mono,
              fontSize: 13,
              color: "#71717a",
              lineHeight: 1.7,
              marginBottom: 32,
            }}
          >
            {cfg.sub}
          </p>

          {status !== "loading" && (
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  padding: "13px 24px",
                  background: "#f59e0b",
                  color: "black",
                  ...sf,
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                My Dashboard →
              </button>
              <button
                onClick={() => router.push("/")}
                style={{
                  padding: "13px 24px",
                  background: "transparent",
                  color: "#52525b",
                  ...sf,
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                }}
              >
                Home
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function RescheduleRespondPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#040404",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              border: "2px solid rgba(245,158,11,0.2)",
              borderTopColor: "#f59e0b",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      }
    >
      <RescheduleRespondInner />
    </Suspense>
  );
}
