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

      if (!token) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      try {
        await API.get("dashboard/");
        // Valid token — allow through regardless of role
        setChecking(false);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          router.replace("/login?expired=true");
        } else {
          // Network issue — let them through if token exists
          setChecking(false);
        }
      }
    };

    verify();
  }, []);

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050505",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            background: "#f59e0b",
            borderRadius: "50%",
            animation: "pulse 1s infinite",
          }}
        />
        <span
          style={{
            fontFamily: "'Syncopate', sans-serif",
            fontSize: 9,
            color: "#71717a",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          Verifying Access...
        </span>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&display=swap');
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>
      </div>
    );
  }

  return children;
}
