"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import API from "@/lib/api";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: "#030303",
  surface: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.07)",
  amber: "#F59E0B",
  amberGlow: "rgba(245,158,11,0.15)",
  amberBorder: "rgba(245,158,11,0.35)",
  muted: "#52525b",
  dim: "#27272a",
};

const sf = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

// ── Scissors SVG ──────────────────────────────────────────────────────────────
const ScissorIcon = ({ size = 20, color = T.amber, opacity = 1 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity }}
  >
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);

// ── Eye toggle ────────────────────────────────────────────────────────────────
const EyeIcon = ({ open }) =>
  open ? (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

// ── Input field ───────────────────────────────────────────────────────────────
function Field({
  label,
  type = "text",
  value,
  onChange,
  onKeyDown,
  placeholder,
  error,
  autoComplete,
  showToggle,
  showPw,
  onToggle,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          ...sf,
          fontSize: 6,
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          color: error ? "#f87171" : focused ? T.amber : T.muted,
          transition: "color 0.2s",
        }}
      >
        {label}
      </label>
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
            background: focused ? "rgba(245,158,11,0.03)" : T.bg,
            padding: showToggle ? "13px 44px 13px 14px" : "13px 14px",
            border: `1px solid ${error ? "rgba(248,113,113,0.5)" : focused ? T.amberBorder : T.border}`,
            color: "white",
            fontSize: 15,
            outline: "none",
            ...mono,
            transition: "all 0.2s",
            letterSpacing: "0.02em",
          }}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            tabIndex={-1}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 42,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.muted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = T.amber)}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}
          >
            <EyeIcon open={showPw} />
          </button>
        )}
      </div>
      {error && (
        <p style={{ ...mono, fontSize: 10, color: "#f87171", margin: 0 }}>
          ⚠ {error}
        </p>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BarberLoginPage() {
  const router = useRouter();
  const panelRef = useRef(null);
  const [mode, setMode] = useState("login");

  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Signup state
  const [fullName, setFullName] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [showCode, setShowCode] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [apiSuccess, setApiSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Entry animation
  useEffect(() => {
    gsap.fromTo(
      ".login-panel",
      { y: 32, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.1, ease: "expo.out" },
    );
    gsap.fromTo(
      ".login-side",
      { x: -24, opacity: 0 },
      { x: 0, opacity: 1, duration: 1.2, delay: 0.15, ease: "expo.out" },
    );
  }, []);

  // Field re-animate on mode switch
  useEffect(() => {
    setApiError("");
    setApiSuccess("");
    setFieldErrors({});
    gsap.fromTo(
      ".form-field",
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.055, ease: "expo.out" },
    );
  }, [mode]);

  const shake = () => {
    gsap.to(".login-panel", {
      keyframes: [{ x: -8 }, { x: 8 }, { x: -5 }, { x: 5 }, { x: 0 }],
      duration: 0.38,
      ease: "power2.out",
    });
  };

  const onEnter = (fn) => (e) => {
    if (e.key === "Enter" && !loading) fn();
  };

  // ── Login ──
  const handleLogin = async () => {
    const errs = {};
    if (!username.trim()) errs.username = "Required";
    if (!password) errs.password = "Required";
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      shake();
      return;
    }
    setLoading(true);
    setApiError("");
    setFieldErrors({});
    try {
      const res = await API.post("token/", {
        username: username.trim(),
        password,
      });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      const dash = await API.get("dashboard/");
      if (!dash.data.is_staff) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setApiError("This account doesn't have barber access.");
        shake();
        return;
      }
      gsap.to(".login-panel", {
        y: -28,
        opacity: 0,
        duration: 0.5,
        ease: "expo.in",
        onComplete: () => router.push("/barber-dashboard"),
      });
    } catch (err) {
      if (err.response?.status === 401) {
        setApiError("Username or password is incorrect.");
        setFieldErrors({ password: "Check your credentials" });
      } else {
        setApiError("Something went wrong. Try again.");
      }
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── Sign Up ──
  const handleSignup = async () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = "Required";
    if (!regUser.trim()) errs.regUser = "Required";
    else if (regUser.length < 3) errs.regUser = "Min. 3 characters";
    else if (/\s/.test(regUser)) errs.regUser = "No spaces";
    if (!regEmail.trim()) errs.regEmail = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail))
      errs.regEmail = "Invalid email";
    if (!regPw) errs.regPw = "Required";
    else if (regPw.length < 6) errs.regPw = "Min. 6 characters";
    if (!inviteCode.trim()) errs.inviteCode = "Required";
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      shake();
      return;
    }
    setLoading(true);
    setApiError("");
    setFieldErrors({});
    try {
      await API.post("barber/register/", {
        full_name: fullName.trim(),
        username: regUser.trim(),
        email: regEmail.trim(),
        password: regPw,
        invite_code: inviteCode.trim(),
      });
      setApiSuccess("Account created — signing you in...");
      const res = await API.post("token/", {
        username: regUser.trim(),
        password: regPw,
      });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      setTimeout(() => router.push("/barber-dashboard"), 1200);
    } catch (err) {
      const data = err.response?.data || {};
      const newErrs = {};
      if (data.username)
        newErrs.regUser = Array.isArray(data.username)
          ? data.username[0]
          : String(data.username);
      if (data.email)
        newErrs.regEmail = Array.isArray(data.email)
          ? data.email[0]
          : String(data.email);
      if (data.invite_code)
        newErrs.inviteCode = Array.isArray(data.invite_code)
          ? data.invite_code[0]
          : String(data.invite_code);
      if (data.full_name)
        newErrs.fullName = Array.isArray(data.full_name)
          ? data.full_name[0]
          : String(data.full_name);
      if (Object.keys(newErrs).length) setFieldErrors(newErrs);
      else
        setApiError(
          data.detail || "Registration failed. Check your invite code.",
        );
      shake();
    } finally {
      setLoading(false);
    }
  };

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
        html,
        body {
          background: ${T.bg};
          color: white;
          min-height: 100vh;
          overflow-y: auto !important;
          overflow-x: hidden;
          font-family: "DM Mono", monospace;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px ${T.bg} inset !important;
          -webkit-text-fill-color: white !important;
          caret-color: white;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.4;
            transform: scale(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
        @keyframes drift {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-12px) rotate(2deg);
          }
          100% {
            transform: translateY(0px) rotate(0deg);
          }
        }
        @keyframes scanline {
          0% {
            top: -10%;
          }
          100% {
            top: 110%;
          }
        }
      `}</style>

      {/* ── Background decorative elements ── */}
      {/* Scanline sweep */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "2px",
            background:
              "linear-gradient(to bottom, transparent, rgba(245,158,11,0.04), transparent)",
            animation: "scanline 8s linear infinite",
          }}
        />
      </div>
      {/* Grid lines */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* Amber glow */}
      <div
        style={{
          position: "fixed",
          top: "30%",
          left: "35%",
          transform: "translate(-50%,-50%)",
          width: 500,
          height: 500,
          background:
            "radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Grain */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          opacity: 0.03,
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.svg')",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── Decorative corner marks ── */}
      {[
        { top: 16, left: 16 },
        { top: 16, right: 16 },
        { bottom: 16, left: 16 },
        { bottom: 16, right: 16 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "fixed",
            ...pos,
            zIndex: 1,
            pointerEvents: "none",
            width: 20,
            height: 20,
            opacity: 0.15,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 8,
              height: 1,
              background: T.amber,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1,
              height: 8,
              background: T.amber,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 8,
              height: 1,
              background: T.amber,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 1,
              height: 8,
              background: T.amber,
            }}
          />
        </div>
      ))}

      {/* ── Nav ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(3,3,3,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <a
          href="/"
          style={{
            ...sf,
            fontSize: 6,
            letterSpacing: "0.35em",
            color: T.muted,
            textDecoration: "none",
            textTransform: "uppercase",
            transition: "color 0.2s",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = T.amber)}
          onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}
        >
          ← Home
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ScissorIcon size={13} />
          <span
            style={{
              ...sf,
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: "-0.05em",
            }}
          >
            HEADZ<span style={{ color: T.amber, fontStyle: "italic" }}>UP</span>
          </span>
          <div style={{ width: 1, height: 14, background: T.border }} />
          <span
            style={{
              ...sf,
              fontSize: 6,
              letterSpacing: "0.35em",
              color: T.muted,
              textTransform: "uppercase",
            }}
          >
            Staff Portal
          </span>
        </div>
      </nav>

      {/* ── Page layout ── */}
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* ── LEFT SIDE PANEL (desktop only) ── */}
        <div
          className="login-side"
          style={{
            width: 300,
            flexShrink: 0,
            borderRight: "1px solid rgba(255,255,255,0.04)",
            padding: "120px 32px 48px",
            display: "none",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "rgba(255,255,255,0.01)",
          }}
          id="login-side-panel"
        >
          <div>
            {/* Floating scissors decoration */}
            <div
              style={{
                marginBottom: 40,
                animation: "drift 6s ease-in-out infinite",
              }}
            >
              <ScissorIcon size={48} color={T.amber} opacity={0.15} />
            </div>

            <p
              style={{
                ...sf,
                fontSize: 6,
                letterSpacing: "0.6em",
                color: T.muted,
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Est. 2026
            </p>
            <h2
              style={{
                ...sf,
                fontSize: "2.4rem",
                fontWeight: 900,
                textTransform: "uppercase",
                lineHeight: 0.9,
                color: "white",
                marginBottom: 24,
              }}
            >
              THE
              <br />
              CHAIR<span style={{ color: T.amber }}>_</span>
              <br />
              IS
              <br />
              YOURS.
            </h2>
            <div
              style={{
                width: 40,
                height: 2,
                background: T.amber,
                marginBottom: 24,
              }}
            />
            <p
              style={{ ...mono, fontSize: 11, color: T.muted, lineHeight: 1.8 }}
            >
              Barber-only portal.
              <br />
              Sign in to manage your
              <br />
              schedule and clients.
            </p>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              paddingTop: 24,
              borderTop: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <p
              style={{
                ...sf,
                fontSize: 6,
                letterSpacing: "0.3em",
                color: T.dim,
                textTransform: "uppercase",
              }}
            >
              HEADZ UP BARBERSHOP
              <br />
              HATTIESBURG, MS
            </p>
          </div>
        </div>

        {/* ── RIGHT: Form ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "90px 20px 48px",
          }}
        >
          <div className="login-panel" style={{ width: "100%", maxWidth: 420 }}>
            {/* Header */}
            <div style={{ marginBottom: 32, position: "relative" }}>
              {/* Rule line with scissors */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: `linear-gradient(to right, transparent, ${T.border})`,
                  }}
                />
                <ScissorIcon size={16} opacity={0.5} />
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: `linear-gradient(to left, transparent, ${T.border})`,
                  }}
                />
              </div>

              <p
                style={{
                  ...sf,
                  fontSize: 6,
                  letterSpacing: "0.6em",
                  color: T.muted,
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                {mode === "login" ? "Welcome Back" : "Join The Team"}
              </p>
              <h1
                style={{
                  ...sf,
                  fontSize: "clamp(1.8rem,5vw,2.6rem)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  lineHeight: 0.9,
                  margin: 0,
                }}
              >
                {mode === "login" ? (
                  <>
                    Barber
                    <br />
                    <span style={{ color: T.amber, fontStyle: "italic" }}>
                      _Login
                    </span>
                  </>
                ) : (
                  <>
                    New
                    <br />
                    <span style={{ color: T.amber, fontStyle: "italic" }}>
                      _Barber
                    </span>
                  </>
                )}
              </h1>
              <p
                style={{
                  ...mono,
                  fontSize: 10,
                  color: T.dim,
                  marginTop: 10,
                  lineHeight: 1.6,
                }}
              >
                {mode === "login"
                  ? "Access your schedule, appointments & dashboard"
                  : "Need an invite code from the shop owner to register"}
              </p>
            </div>

            {/* Mode tabs */}
            <div
              style={{
                display: "flex",
                marginBottom: 28,
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${T.border}`,
                padding: 3,
                gap: 3,
              }}
            >
              {[
                { key: "login", label: "Sign In" },
                { key: "signup", label: "Sign Up" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: mode === key ? T.amber : "transparent",
                    color: mode === key ? "black" : T.muted,
                    ...sf,
                    fontSize: 7,
                    fontWeight: mode === key ? 700 : 400,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.25s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* ── LOGIN ── */}
              {mode === "login" && (
                <>
                  <div className="form-field">
                    <Field
                      label="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={onEnter(handleLogin)}
                      placeholder="your_username"
                      error={fieldErrors.username}
                      autoComplete="username"
                    />
                  </div>
                  <div className="form-field">
                    <Field
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={onEnter(handleLogin)}
                      placeholder="••••••••"
                      error={fieldErrors.password}
                      autoComplete="current-password"
                      showToggle
                      showPw={showPw}
                      onToggle={() => setShowPw((p) => !p)}
                    />
                  </div>

                  {apiError && (
                    <div
                      className="form-field"
                      style={{
                        padding: "10px 14px",
                        background: "rgba(248,113,113,0.05)",
                        border: "1px solid rgba(248,113,113,0.2)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "#f87171",
                          flexShrink: 0,
                        }}
                      />
                      <p
                        style={{
                          ...sf,
                          fontSize: 7,
                          color: "#f87171",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          margin: 0,
                        }}
                      >
                        {apiError}
                      </p>
                    </div>
                  )}

                  <button
                    className="form-field"
                    onClick={handleLogin}
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "16px",
                      background: loading ? T.dim : "white",
                      color: loading ? "#3f3f46" : "black",
                      ...sf,
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      border: "none",
                      cursor: loading ? "not-allowed" : "pointer",
                      transition: "all 0.25s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      marginTop: 4,
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) e.currentTarget.style.background = T.amber;
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) e.currentTarget.style.background = "white";
                    }}
                  >
                    {loading ? (
                      <>
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            border: "2px solid #3f3f46",
                            borderTopColor: "#71717a",
                            borderRadius: "50%",
                            display: "inline-block",
                            animation: "spin 0.7s linear infinite",
                          }}
                        />
                        Signing In...
                      </>
                    ) : (
                      <>
                        Enter Dashboard <ScissorIcon size={12} color="black" />
                      </>
                    )}
                  </button>
                </>
              )}

              {/* ── SIGN UP ── */}
              {mode === "signup" && (
                <>
                  {[
                    {
                      label: "Full Name",
                      val: fullName,
                      set: setFullName,
                      key: "fullName",
                      ph: "Jarvis Smith",
                      ac: "name",
                    },
                    {
                      label: "Username",
                      val: regUser,
                      set: setRegUser,
                      key: "regUser",
                      ph: "jarvis_cuts",
                      ac: "username",
                    },
                    {
                      label: "Email Address",
                      val: regEmail,
                      set: setRegEmail,
                      key: "regEmail",
                      ph: "you@example.com",
                      ac: "email",
                      type: "email",
                    },
                  ].map(({ label, val, set, key, ph, ac, type }) => (
                    <div key={key} className="form-field">
                      <Field
                        label={label}
                        type={type || "text"}
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        onKeyDown={onEnter(handleSignup)}
                        placeholder={ph}
                        error={fieldErrors[key]}
                        autoComplete={ac}
                      />
                    </div>
                  ))}

                  <div className="form-field">
                    <Field
                      label="Password"
                      type="password"
                      value={regPw}
                      onChange={(e) => setRegPw(e.target.value)}
                      onKeyDown={onEnter(handleSignup)}
                      placeholder="Min. 6 characters"
                      error={fieldErrors.regPw}
                      autoComplete="new-password"
                      showToggle
                      showPw={showRegPw}
                      onToggle={() => setShowRegPw((p) => !p)}
                    />
                  </div>

                  {/* Invite code — visually separated */}
                  <div
                    className="form-field"
                    style={{
                      paddingTop: 10,
                      borderTop: `1px solid ${T.border}`,
                    }}
                  >
                    <Field
                      label="Invite Code"
                      type="password"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      onKeyDown={onEnter(handleSignup)}
                      placeholder="Get from the shop owner"
                      error={fieldErrors.inviteCode}
                      autoComplete="off"
                      showToggle
                      showPw={showCode}
                      onToggle={() => setShowCode((p) => !p)}
                    />
                    <p
                      style={{
                        ...mono,
                        fontSize: 9,
                        color: T.dim,
                        marginTop: 6,
                        lineHeight: 1.6,
                      }}
                    >
                      Only authorized barbers can create an account.
                    </p>
                  </div>

                  {apiError && (
                    <div
                      className="form-field"
                      style={{
                        padding: "10px 14px",
                        background: "rgba(248,113,113,0.05)",
                        border: "1px solid rgba(248,113,113,0.2)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "#f87171",
                          flexShrink: 0,
                        }}
                      />
                      <p
                        style={{
                          ...sf,
                          fontSize: 7,
                          color: "#f87171",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          margin: 0,
                        }}
                      >
                        {apiError}
                      </p>
                    </div>
                  )}

                  {apiSuccess && (
                    <div
                      className="form-field"
                      style={{
                        padding: "10px 14px",
                        background: "rgba(74,222,128,0.05)",
                        border: "1px solid rgba(74,222,128,0.2)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "#4ade80",
                          animation: "pulse 1s infinite",
                          flexShrink: 0,
                        }}
                      />
                      <p
                        style={{
                          ...sf,
                          fontSize: 7,
                          color: "#4ade80",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          margin: 0,
                        }}
                      >
                        {apiSuccess}
                      </p>
                    </div>
                  )}

                  <button
                    className="form-field"
                    onClick={handleSignup}
                    disabled={loading || !!apiSuccess}
                    style={{
                      width: "100%",
                      padding: "16px",
                      background: loading || apiSuccess ? T.dim : T.amber,
                      color: loading || apiSuccess ? "#3f3f46" : "black",
                      ...sf,
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      border: "none",
                      cursor: loading || apiSuccess ? "not-allowed" : "pointer",
                      transition: "all 0.25s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      marginTop: 4,
                    }}
                    onMouseEnter={(e) => {
                      if (!loading && !apiSuccess)
                        e.currentTarget.style.background = "white";
                    }}
                    onMouseLeave={(e) => {
                      if (!loading && !apiSuccess)
                        e.currentTarget.style.background = T.amber;
                    }}
                  >
                    {loading ? (
                      <>
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            border: "2px solid #3f3f46",
                            borderTopColor: "#71717a",
                            borderRadius: "50%",
                            display: "inline-block",
                            animation: "spin 0.7s linear infinite",
                          }}
                        />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Account <ScissorIcon size={12} color="black" />
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: 32,
                paddingTop: 20,
                borderTop: `1px solid ${T.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 6,
                  letterSpacing: "0.3em",
                  color: T.dim,
                  textTransform: "uppercase",
                }}
              >
                HEADZ UP · 2026
              </p>
              <div style={{ display: "flex", gap: 3 }}>
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: T.amber,
                      opacity: 0.2 + i * 0.3,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Show side panel on desktop */}
      <style>{`
        @media (min-width: 900px) {
          #login-side-panel { display: flex !important; }
        }
      `}</style>
    </>
  );
}
