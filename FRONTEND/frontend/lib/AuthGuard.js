"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import API from "@/lib/api";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verify = async () => {
      const token = localStorage.getItem("access");
      const refresh = localStorage.getItem("refresh");

      // No tokens at all — send to login
      if (!token && !refresh) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      // Try up to 3 times to handle Railway cold starts
      let lastErr = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await API.get("dashboard/");
          // Token is valid — let them through
          setChecking(false);
          return;
        } catch (err) {
          lastErr = err;

          // Hard 401 with no refresh token — session is truly expired
          if (err.response?.status === 401 && !refresh) {
            localStorage.removeItem("access");
            localStorage.removeItem("refresh");
            router.replace("/login?expired=true");
            return;
          }

          // Network error or server sleeping — wait and retry
          if (!err.response) {
            if (attempt < 3) {
              await new Promise((r) => setTimeout(r, 1500 * attempt));
              continue;
            }
            // After 3 network failures — let them through if tokens exist
            // Don't wipe tokens just because Railway is sleeping
            setChecking(false);
            return;
          }

          // Any other error — let them through
          setChecking(false);
          return;
        }
      }

      // Fallback — if tokens exist, trust them
      if (localStorage.getItem("access") || localStorage.getItem("refresh")) {
        setChecking(false);
      } else {
        router.replace("/login?expired=true");
      }
    };

    verify();
  }, []);

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#040404",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@400;500&display=swap');
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { to { opacity: 1; } }
          body { background: #040404; margin: 0; }
        `}</style>
        <p
          style={{
            fontFamily: "'Syncopate',sans-serif",
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: "-0.06em",
            opacity: 0,
            animation: "fadeIn 0.4s ease 0.1s forwards",
          }}
        >
          HEADZ<span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
        </p>
        <div
          style={{
            width: 1,
            height: 32,
            background: "linear-gradient(to bottom,#f59e0b,transparent)",
          }}
        />
        <div
          style={{
            width: 16,
            height: 16,
            border: "1.5px solid rgba(245,158,11,0.2)",
            borderTopColor: "#f59e0b",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  return children;
}
