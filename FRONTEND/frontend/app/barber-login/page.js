"use client";
// barber-login v5 — full_name fix, safe error handling

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";

const sf = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

// ── Icons ─────────────────────────────────────────────────────────────────────
const Eye = ({ open }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const Scissors = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#f59e0b"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);

function Field({
  label,
  type = "text",
  value,
  onChange,
  onKeyDown,
  placeholder,
  error,
  showToggle,
  showPw,
  onToggle,
  autoComplete,
  note,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <label
          style={{
            ...sf,
            fontSize: 6,
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: error ? "#f87171" : focused ? "#f59e0b" : "#52525b",
            transition: "color 0.2s",
          }}
        >
          {label}
        </label>
        {note && (
          <span style={{ ...mono, fontSize: 9, color: "#27272a" }}>{note}</span>
        )}
      </div>
      <div style={{ position: "relative" }}>
        <input
          type={showToggle ? (showPw ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          style={{
            width: "100%",
            background: focused ? "rgba(255,255,255,0.025)" : "#080808",
            border: `1px solid ${error ? "rgba(248,113,113,0.6)" : focused ? "#f59e0b" : "rgba(255,255,255,0.1)"}`,
            padding: showToggle ? "15px 48px 15px 16px" : "15px 16px",
            color: "white",
            fontSize: 16,
            fontFamily: "'DM Mono', monospace",
            outline: "none",
            borderRadius: 0,
            WebkitAppearance: "none",
            transition: "border-color 0.2s, background 0.2s",
          }}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            tabIndex={-1}
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "#52525b",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
          >
            <Eye open={showPw} />
          </button>
        )}
      </div>
      {error && (
        <p style={{ ...mono, fontSize: 10, color: "#f87171" }}>⚠ {error}</p>
      )}
    </div>
  );
}

export default function BarberLoginPage() {
  const router = useRouter();
  const canvasRef = useRef(null);

  const [mode, setMode] = useState("login"); // login | signup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Login
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  // Signup
  const [regName, setRegName] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regInvite, setRegInvite] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Animated scissors canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf,
      t = 0;

    const draw = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    draw();
    window.addEventListener("resize", draw);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.008;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw floating scissors silhouettes
      const items = [
        {
          x: canvas.width * 0.1,
          y: canvas.height * 0.2,
          size: 60,
          rot: t * 0.3,
        },
        {
          x: canvas.width * 0.85,
          y: canvas.height * 0.15,
          size: 40,
          rot: -t * 0.2,
        },
        {
          x: canvas.width * 0.75,
          y: canvas.height * 0.7,
          size: 50,
          rot: t * 0.15,
        },
        {
          x: canvas.width * 0.15,
          y: canvas.height * 0.75,
          size: 35,
          rot: -t * 0.25,
        },
        {
          x: canvas.width * 0.5,
          y: canvas.height * 0.1,
          size: 30,
          rot: t * 0.4,
        },
      ];

      items.forEach(({ x, y, size, rot }) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.globalAlpha = 0.04;
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1;
        // Simple scissors shape
        ctx.beginPath();
        ctx.arc(0, -size * 0.4, size * 0.15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, size * 0.4, size * 0.15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-size * 0.15, -size * 0.3);
        ctx.lineTo(size * 0.7, size * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-size * 0.15, size * 0.3);
        ctx.lineTo(size * 0.7, -size * 0.2);
        ctx.stroke();
        ctx.restore();
      });

      // Ambient particles
      for (let i = 0; i < 3; i++) {
        const px = (Math.sin(t * 0.5 + i * 2.1) * 0.4 + 0.5) * canvas.width;
        const py = (Math.cos(t * 0.3 + i * 1.7) * 0.4 + 0.5) * canvas.height;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(245,158,11,0.12)";
        ctx.fill();
      }
    };
    animate();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", draw);
    };
  }, []);

  const handleLogin = async () => {
    setError("");
    setSuccess("");
    if (!user.trim()) {
      setError("Username is required.");
      return;
    }
    if (!pass) {
      setError("Password is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await API.post("token/", {
        username: user.trim(),
        password: pass,
      });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      const dash = await API.get("dashboard/");
      if (!dash.data.is_staff) {
        setError(
          "This account is not a barber account. Use the client login instead.",
        );
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        return;
      }
      router.replace("/barber-dashboard");
    } catch (e) {
      if (e.response?.status === 401) {
        setError("Wrong username or password. Try again.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setError("");
    setSuccess("");
    setFieldErrors({});
    const errs = {};
    if (!regName.trim()) errs.regName = "Required";
    if (!regUser.trim()) errs.regUser = "Required";
    if (!regEmail.trim()) errs.regEmail = "Required";
    if (!regPass || regPass.length < 6) errs.regPass = "Min 6 characters";
    if (!regInvite.trim()) errs.regInvite = "Invite code required";
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    let registerData = null;
    try {
      // Step 1 — create the barber account
      const res = await API.post("barber/register/", {
        full_name: regName.trim(),
        username: regUser.trim(),
        email: regEmail.trim(),
        password: regPass,
        invite_code: regInvite.trim(),
      });
      registerData = res.data;
    } catch (e) {
      const d = e.response?.data || {};
      const msg = (v) =>
        Array.isArray(v) ? v[0] : typeof v === "string" ? v : JSON.stringify(v);
      if (d.invite_code)
        setFieldErrors((p) => ({ ...p, regInvite: msg(d.invite_code) }));
      else if (d.full_name)
        setFieldErrors((p) => ({ ...p, regName: msg(d.full_name) }));
      else if (d.username)
        setFieldErrors((p) => ({ ...p, regUser: msg(d.username) }));
      else if (d.email)
        setFieldErrors((p) => ({ ...p, regEmail: msg(d.email) }));
      else if (d.password)
        setFieldErrors((p) => ({ ...p, regPass: msg(d.password) }));
      else if (d.message && typeof d.message === "string") setError(d.message);
      else if (d.detail && typeof d.detail === "string") setError(d.detail);
      else setError("Registration failed. Check your details and invite code.");
      setLoading(false);
      return;
    }

    // Step 2 — log in using tokens from register response OR fallback token call
    try {
      if (registerData?.access && registerData?.refresh) {
        // Backend returned tokens directly — use them
        localStorage.setItem("access", registerData.access);
        localStorage.setItem("refresh", registerData.refresh);
      } else {
        // Fallback: request tokens separately
        const tokenRes = await API.post("token/", {
          username: regUser.trim(),
          password: regPass,
        });
        localStorage.setItem("access", tokenRes.data.access);
        localStorage.setItem("refresh", tokenRes.data.refresh);
      }
      setSuccess("Account created! Taking you to your dashboard...");
      setTimeout(() => router.replace("/barber-dashboard"), 300);
    } catch {
      setSuccess("Account created! Please sign in with your credentials.");
      setTimeout(() => {
        setMode("login");
        setUser(regUser);
        setSuccess("");
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap");
        *,
        *::before,
        *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }
        html,
        body {
          background: #040404;
          color: white;
          font-family: "DM Mono", monospace;
          min-height: 100vh;
          overflow-x: hidden;
          -webkit-text-size-adjust: 100%;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #080808 inset !important;
          -webkit-text-fill-color: white !important;
          caret-color: white;
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.5;
            transform: scaleY(0.95);
          }
          50% {
            opacity: 1;
            transform: scaleY(1);
          }
        }
        @keyframes scandown {
          from {
            top: -1px;
          }
          to {
            top: 100%;
          }
        }
        .form-enter {
          animation: fadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      {/* Animated canvas background */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* Grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Grain */}
      {/* grain overlay */}

      {/* Deep amber glow — top */}
      <div
        style={{
          position: "fixed",
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 800,
          height: 500,
          background:
            "radial-gradient(ellipse,rgba(245,158,11,0.07) 0%,transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Scanline */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 1,
            background:
              "linear-gradient(to right,transparent,rgba(245,158,11,0.2),transparent)",
            animation: "scandown 8s linear infinite",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 24px",
        }}
      >
        {/* Back link */}
        <a
          href="/"
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            ...mono,
            fontSize: 9,
            color: "#3f3f46",
            textDecoration: "none",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            transition: "color 0.2s",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#3f3f46")}
        >
          ← Home
        </a>

        {/* Main card */}
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            background: "rgba(4,4,4,0.85)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            overflow: "hidden",
          }}
        >
          {/* Card header — amber band */}
          <div
            style={{
              background: "#f59e0b",
              padding: "28px 36px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <p
                style={{
                  ...mono,
                  fontSize: 8,
                  color: "rgba(0,0,0,0.5)",
                  letterSpacing: "0.4em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Barber Portal
              </p>
              <h1
                style={{
                  ...sf,
                  fontSize: 22,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "-0.04em",
                  color: "black",
                  lineHeight: 1,
                }}
              >
                HEADZ<span style={{ fontStyle: "italic" }}>UP</span>
              </h1>
            </div>
            <Scissors />
          </div>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {[
              ["login", "Sign In"],
              ["signup", "Create Account"],
            ].map(([m, label]) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                  setSuccess("");
                  setFieldErrors({});
                }}
                style={{
                  flex: 1,
                  padding: "14px 0",
                  ...sf,
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  background:
                    mode === m ? "rgba(245,158,11,0.06)" : "transparent",
                  color: mode === m ? "#f59e0b" : "#3f3f46",
                  border: "none",
                  borderBottom: `2px solid ${mode === m ? "#f59e0b" : "transparent"}`,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  marginBottom: -1,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Form body */}
          <div style={{ padding: "36px" }}>
            {/* Alerts */}
            {error && (
              <div
                style={{
                  marginBottom: 20,
                  padding: "12px 14px",
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.25)",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#f87171" }}>⚠</span>
                <p style={{ ...mono, fontSize: 11, color: "#f87171" }}>
                  {error}
                </p>
              </div>
            )}
            {success && (
              <div
                style={{
                  marginBottom: 20,
                  padding: "12px 14px",
                  background: "rgba(74,222,128,0.08)",
                  border: "1px solid rgba(74,222,128,0.25)",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#4ade80" }}>✓</span>
                <p style={{ ...mono, fontSize: 11, color: "#4ade80" }}>
                  {success}
                </p>
              </div>
            )}

            {/* ── LOGIN ── */}
            {mode === "login" && (
              <div
                className="form-enter"
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                <Field
                  label="Username"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="your_username"
                  autoComplete="username"
                />

                <Field
                  label="Password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  showToggle
                  showPw={showPw}
                  onToggle={() => setShowPw(!showPw)}
                  autoComplete="current-password"
                />

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  style={{
                    padding: "17px",
                    background: loading ? "#111" : "#f59e0b",
                    color: loading ? "#52525b" : "black",
                    ...sf,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "all 0.3s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    marginTop: 4,
                  }}
                >
                  {loading ? (
                    <>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          border: "2px solid #3f3f46",
                          borderTopColor: "#71717a",
                          borderRadius: "50%",
                          display: "inline-block",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                      Signing in...
                    </>
                  ) : (
                    <span>Enter Dashboard →</span>
                  )}
                </button>

                <div
                  style={{
                    paddingTop: 16,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      ...mono,
                      fontSize: 10,
                      color: "#27272a",
                      marginBottom: 8,
                    }}
                  >
                    Not a barber yet?
                  </p>
                  <button
                    onClick={() => setMode("signup")}
                    style={{
                      ...mono,
                      fontSize: 10,
                      color: "#52525b",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#f59e0b")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#52525b")
                    }
                  >
                    Create your account →
                  </button>
                </div>
              </div>
            )}

            {/* ── SIGNUP ── */}
            {mode === "signup" && (
              <div
                className="form-enter"
                style={{ display: "flex", flexDirection: "column", gap: 18 }}
              >
                <Field
                  label="Full Name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ashanti Cocroft"
                  error={fieldErrors.regName}
                  autoComplete="name"
                />

                <Field
                  label="Username"
                  value={regUser}
                  onChange={(e) => setRegUser(e.target.value)}
                  placeholder="ashanti_cuts"
                  error={fieldErrors.regUser}
                  autoComplete="username"
                />

                <Field
                  label="Email"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@email.com"
                  error={fieldErrors.regEmail}
                  autoComplete="email"
                />

                <Field
                  label="Password"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  placeholder="Min 6 characters"
                  error={fieldErrors.regPass}
                  showToggle
                  showPw={showPw}
                  onToggle={() => setShowPw(!showPw)}
                  autoComplete="new-password"
                />

                {/* Invite code — special styling */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 7 }}
                >
                  <label
                    style={{
                      ...sf,
                      fontSize: 6,
                      letterSpacing: "0.4em",
                      textTransform: "uppercase",
                      color: fieldErrors.regInvite ? "#f87171" : "#f59e0b",
                    }}
                  >
                    Invite Code
                  </label>
                  <input
                    type="text"
                    value={regInvite}
                    onChange={(e) => setRegInvite(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                    placeholder="HEADZUP2026"
                    autoComplete="off"
                    spellCheck={false}
                    style={{
                      width: "100%",
                      background: regInvite
                        ? "rgba(245,158,11,0.06)"
                        : "#080808",
                      border: `1px solid ${fieldErrors.regInvite ? "rgba(248,113,113,0.6)" : regInvite ? "rgba(245,158,11,0.5)" : "rgba(245,158,11,0.2)"}`,
                      padding: "15px 16px",
                      color: "#f59e0b",
                      fontSize: 16,
                      fontFamily: "'Syncopate', sans-serif",
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      outline: "none",
                      borderRadius: 0,
                      WebkitAppearance: "none",
                      transition: "all 0.2s",
                    }}
                  />
                  {fieldErrors.regInvite ? (
                    <p style={{ ...mono, fontSize: 10, color: "#f87171" }}>
                      ⚠ {fieldErrors.regInvite}
                    </p>
                  ) : (
                    <p style={{ ...mono, fontSize: 10, color: "#27272a" }}>
                      Provided by HEADZ UP management
                    </p>
                  )}
                </div>

                <button
                  onClick={handleSignup}
                  disabled={loading}
                  style={{
                    padding: "17px",
                    background: loading ? "#111" : "#f59e0b",
                    color: loading ? "#52525b" : "black",
                    ...sf,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "all 0.3s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    marginTop: 4,
                  }}
                >
                  {loading ? (
                    <>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          border: "2px solid #3f3f46",
                          borderTopColor: "#71717a",
                          borderRadius: "50%",
                          display: "inline-block",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                      Creating account...
                    </>
                  ) : (
                    <span>Join the Team →</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Card footer */}
          <div
            style={{
              padding: "16px 36px 24px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <p
              style={{
                ...mono,
                fontSize: 9,
                color: "#1a1a1a",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              Barbers only
            </p>
            <a
              href="/login"
              style={{
                ...mono,
                fontSize: 9,
                color: "#27272a",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#52525b")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#27272a")}
            >
              Client login →
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
