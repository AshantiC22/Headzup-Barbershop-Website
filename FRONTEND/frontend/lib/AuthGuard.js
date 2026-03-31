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
      const access = localStorage.getItem("access");
      const refresh = localStorage.getItem("refresh");

      // No tokens at all — go to login
      if (!access && !refresh) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      // If we have tokens, trust them and let the user in immediately
      // The API interceptor in api.js handles 401s and refresh automatically
      // Don't make an extra verification call that can wipe tokens on cold starts
      setChecking(false);
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
          @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&display=swap');
          @keyframes spin    { to { transform: rotate(360deg); } }
          @keyframes fadeIn  { to { opacity: 1; } }
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
