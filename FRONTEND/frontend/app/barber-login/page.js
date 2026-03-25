"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import API from "@/lib/api";

const sf = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

// ── Eye icons ─────────────────────────────────────────────────────────────────
const EyeOpen = () => (
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
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeClosed = () => (
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
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// ── Field ─────────────────────────────────────────────────────────────────────
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
  showPassword,
  onToggle,
}) {
  const [focused, setFocused] = useState(false);
  const inputType = showToggle ? (showPassword ? "text" : "password") : type;
  const borderColor = error
    ? "rgba(248,113,113,0.6)"
    : focused
      ? "#f59e0b"
      : "rgba(255,255,255,0.1)";

  return (
    <div
      className="field"
      style={{ display: "flex", flexDirection: "column", gap: 6 }}
    >
      <label
        style={{
          ...sf,
          fontSize: 7,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: error ? "#f87171" : focused ? "#f59e0b" : "#52525b",
          transition: "color 0.2s",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={inputType}
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
            background: focused ? "rgba(255,255,255,0.03)" : "#0a0a0a",
            padding: showToggle ? "14px 46px 14px 14px" : "14px 14px",
            border: `1px solid ${borderColor}`,
            color: "white",
            fontSize: 16,
            outline: "none",
            ...mono,
            transition: "all 0.2s",
            borderRadius: 0,
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
              width: 44,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#52525b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
          >
            {showPassword ? <EyeClosed /> : <EyeOpen />}
          </button>
        )}
      </div>
      {error && (
        <p style={{ fontSize: 11, color: "#f87171", margin: 0, ...mono }}>
          <span style={{ fontSize: 9 }}>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BarberLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "signup"

  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Signup state
  const [fullName, setFullName] = useState("");
  const [regUsername, setRegUsername] = useState("");
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
    gsap.from(".barber-panel", {
      y: 40,
      opacity: 0,
      duration: 1.1,
      ease: "expo.out",
    });
  }, []);

  useEffect(() => {
    setApiError("");
    setApiSuccess("");
    setFieldErrors({});
    gsap.fromTo(
      ".field",
      { y: 8, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.38, stagger: 0.055, ease: "expo.out" },
    );
  }, [mode]);

  const shake = () =>
    gsap.to(".barber-panel", {
      keyframes: [{ x: -7 }, { x: 7 }, { x: -4 }, { x: 4 }, { x: 0 }],
      duration: 0.38,
      ease: "power2.out",
    });
  const onEnter = (fn) => (e) => {
    if (e.key === "Enter" && !loading) fn();
  };

  // ── Login ──
  const handleLogin = async () => {
    const errs = {};
    if (!username.trim()) errs.username = "Username is required";
    if (!password) errs.password = "Password is required";
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
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

      // Verify they are actually a barber
      const dash = await API.get("dashboard/");
      if (!dash.data.is_staff) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setApiError("This account does not have barber access.");
        shake();
        return;
      }

      gsap.to(".barber-panel", {
        y: -30,
        opacity: 0,
        duration: 0.5,
        ease: "expo.in",
        onComplete: () => router.push("/barber-dashboard"),
      });
    } catch (err) {
      if (err.response?.status === 401) {
        setApiError("Username or password is incorrect.");
        setFieldErrors({ password: "Check your credentials and try again" });
      } else {
        setApiError("Something went wrong. Please try again.");
      }
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── Sign Up ──
  const handleSignup = async () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = "Full name is required";
    if (!regUsername.trim()) errs.regUsername = "Username is required";
    else if (regUsername.trim().length < 3)
      errs.regUsername = "At least 3 characters";
    else if (/\s/.test(regUsername)) errs.regUsername = "No spaces allowed";
    if (!regEmail.trim()) errs.regEmail = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim()))
      errs.regEmail = "Enter a valid email";
    if (!regPw) errs.regPw = "Password is required";
    else if (regPw.length < 6) errs.regPw = "Minimum 6 characters";
    if (!inviteCode.trim()) errs.inviteCode = "Invite code is required";

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
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPw,
        invite_code: inviteCode.trim(),
      });
      setApiSuccess("Account created! Signing you in...");

      // Auto sign in
      const res = await API.post("token/", {
        username: regUsername.trim(),
        password: regPw,
      });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      setTimeout(() => router.push("/barber-dashboard"), 1400);
    } catch (err) {
      const data = err.response?.data || {};
      const newErrs = {};
      if (data.username)
        newErrs.regUsername = Array.isArray(data.username)
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
      if (data.password)
        newErrs.regPw = Array.isArray(data.password)
          ? data.password[0]
          : String(data.password);
      if (Object.keys(newErrs).length) {
        setFieldErrors(newErrs);
      } else {
        setApiError(data.detail || "Registration failed. Please try again.");
      }
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
          background: #050505;
          color: white;
          min-height: 100vh;
          overflow-y: auto !important;
          overflow-x: hidden;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #0a0a0a inset !important;
          -webkit-text-fill-color: white !important;
          caret-color: white;
          transition: background-color 5000s;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .tab {
          position: relative;
          cursor: pointer;
          transition: all 0.25s;
        }
        .tab::after {
          content: "";
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #f59e0b;
          transform: scaleX(0);
          transition: transform 0.25s ease;
        }
        .tab.active::after {
          transform: scaleX(1);
        }
      `}</style>

      {/* Background glow */}
      <div
        style={{
          position: "fixed",
          top: "40%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 600,
          height: 600,
          background:
            "radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          opacity: 0.025,
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.svg')",
          pointerEvents: "none",
          zIndex: 0,
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
          padding: "18px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(5,5,5,0.9)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <a
          href="/"
          style={{
            ...sf,
            fontSize: 7,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#3f3f46",
            textDecoration: "none",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#3f3f46")}
        >
          ← Home
        </a>
        <div
          style={{
            ...sf,
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: "-0.05em",
          }}
        >
          HEADZ<span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
          <span
            style={{
              ...sf,
              fontSize: 7,
              color: "#3f3f46",
              letterSpacing: "0.3em",
              marginLeft: 10,
              textTransform: "uppercase",
            }}
          >
            Barber Portal
          </span>
        </div>
      </nav>

      {/* Page */}
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px 16px 48px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div className="barber-panel" style={{ width: "100%", maxWidth: 440 }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            {/* Scissors icon */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
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
            </div>
            <p
              style={{
                ...sf,
                fontSize: 7,
                letterSpacing: "0.5em",
                color: "#3f3f46",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {mode === "login" ? "Welcome Back" : "Join The Team"}
            </p>
            <h1
              style={{
                ...sf,
                fontSize: "clamp(1.6rem, 5vw, 2.4rem)",
                fontWeight: 900,
                textTransform: "uppercase",
                lineHeight: 0.95,
                color: "white",
                margin: 0,
              }}
            >
              {mode === "login" ? (
                <>
                  Barber
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    _Login
                  </span>
                </>
              ) : (
                <>
                  New
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    _Barber
                  </span>
                </>
              )}
            </h1>
            <p
              style={{ fontSize: 11, color: "#27272a", marginTop: 8, ...mono }}
            >
              {mode === "login"
                ? "Access your schedule and dashboard"
                : "Invite code required — contact the shop owner"}
            </p>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              marginBottom: 24,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {[
              { key: "login", label: "Sign In" },
              { key: "signup", label: "Sign Up" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`tab${mode === key ? " active" : ""}`}
                style={{
                  flex: 1,
                  padding: "11px 10px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    ...sf,
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: mode === key ? "white" : "#27272a",
                    transition: "color 0.25s",
                  }}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* Form card */}
          <div
            style={{
              background: "rgba(255,255,255,0.015)",
              border: "1px solid rgba(255,255,255,0.06)",
              padding: "26px 22px",
            }}
          >
            {/* ── LOGIN ── */}
            {mode === "login" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <Field
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={onEnter(handleLogin)}
                  placeholder="your_username"
                  error={fieldErrors.username}
                  autoComplete="username"
                />
                <Field
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={onEnter(handleLogin)}
                  placeholder="••••••••"
                  error={fieldErrors.password}
                  showToggle
                  showPassword={showPw}
                  onToggle={() => setShowPw((p) => !p)}
                  autoComplete="current-password"
                />

                {apiError && (
                  <div
                    style={{
                      padding: "11px 14px",
                      background: "rgba(248,113,113,0.05)",
                      border: "1px solid rgba(248,113,113,0.2)",
                    }}
                  >
                    <p
                      style={{
                        ...sf,
                        fontSize: 7,
                        color: "#f87171",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        margin: 0,
                      }}
                    >
                      ✕ {apiError}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: loading ? "#1c1c1e" : "white",
                    color: loading ? "#3f3f46" : "black",
                    ...sf,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "all 0.25s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.background = "#f59e0b";
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
                    "Enter Dashboard →"
                  )}
                </button>
              </div>
            )}

            {/* ── SIGN UP ── */}
            {mode === "signup" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <Field
                  label="Full Name (display name)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onKeyDown={onEnter(handleSignup)}
                  placeholder="Jarvis Smith"
                  error={fieldErrors.fullName}
                  autoComplete="name"
                />
                <Field
                  label="Username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  onKeyDown={onEnter(handleSignup)}
                  placeholder="jarvis_cuts"
                  error={fieldErrors.regUsername}
                  autoComplete="username"
                />
                <Field
                  label="Email Address"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  onKeyDown={onEnter(handleSignup)}
                  placeholder="you@example.com"
                  error={fieldErrors.regEmail}
                  autoComplete="email"
                />
                <Field
                  label="Password"
                  type="password"
                  value={regPw}
                  onChange={(e) => setRegPw(e.target.value)}
                  onKeyDown={onEnter(handleSignup)}
                  placeholder="Min. 6 characters"
                  error={fieldErrors.regPw}
                  showToggle
                  showPassword={showRegPw}
                  onToggle={() => setShowRegPw((p) => !p)}
                  autoComplete="new-password"
                />

                {/* Invite code */}
                <div
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    paddingTop: 14,
                  }}
                >
                  <Field
                    label="Invite Code"
                    type="password"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    onKeyDown={onEnter(handleSignup)}
                    placeholder="Get this from the shop owner"
                    error={fieldErrors.inviteCode}
                    showToggle
                    showPassword={showCode}
                    onToggle={() => setShowCode((p) => !p)}
                    autoComplete="off"
                  />
                  <p
                    style={{
                      fontSize: 10,
                      color: "#27272a",
                      marginTop: 6,
                      ...mono,
                      lineHeight: 1.6,
                    }}
                  >
                    Only authorized barbers can create an account. Get the
                    invite code from the shop owner.
                  </p>
                </div>

                {apiError && (
                  <div
                    style={{
                      padding: "11px 14px",
                      background: "rgba(248,113,113,0.05)",
                      border: "1px solid rgba(248,113,113,0.2)",
                    }}
                  >
                    <p
                      style={{
                        ...sf,
                        fontSize: 7,
                        color: "#f87171",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        margin: 0,
                      }}
                    >
                      ✕ {apiError}
                    </p>
                  </div>
                )}
                {apiSuccess && (
                  <div
                    style={{
                      padding: "11px 14px",
                      background: "rgba(74,222,128,0.05)",
                      border: "1px solid rgba(74,222,128,0.15)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        background: "#4ade80",
                        borderRadius: "50%",
                        flexShrink: 0,
                      }}
                    />
                    <p
                      style={{
                        ...sf,
                        fontSize: 7,
                        color: "#4ade80",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        margin: 0,
                      }}
                    >
                      {apiSuccess}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSignup}
                  disabled={loading || !!apiSuccess}
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: loading || apiSuccess ? "#1c1c1e" : "#f59e0b",
                    color: loading || apiSuccess ? "#3f3f46" : "black",
                    ...sf,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: loading || apiSuccess ? "not-allowed" : "pointer",
                    transition: "all 0.25s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && !apiSuccess)
                      e.currentTarget.style.background = "white";
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && !apiSuccess)
                      e.currentTarget.style.background = "#f59e0b";
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
                      Creating Account...
                    </>
                  ) : (
                    "Create Barber Account →"
                  )}
                </button>
              </div>
            )}
          </div>

          <p
            style={{
              textAlign: "center",
              marginTop: 20,
              ...sf,
              fontSize: 7,
              color: "#1a1a1a",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
            }}
          >
            HEADZ UP BARBERSHOP · HATTIESBURG, MS
          </p>
        </div>
      </div>
    </>
  );
}
