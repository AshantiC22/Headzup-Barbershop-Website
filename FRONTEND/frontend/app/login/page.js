"use client";
export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import API from "@/lib/api";

const sf = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

// ── Validation ────────────────────────────────────────────────────────────────
const validateUsername = (v) => {
  if (!v?.trim()) return "Required";
  if (v.trim().length < 3) return "Min 3 characters";
  if (/\s/.test(v)) return "No spaces";
  return null;
};
const validateEmail = (v) => {
  if (!v?.trim()) return "Required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "Invalid email";
  return null;
};
const validatePassword = (v) => {
  if (!v) return "Required";
  if (v.length < 6) return "Min 6 characters";
  return null;
};

function getStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

// ── Eye icon ──────────────────────────────────────────────────────────────────
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
  hint,
}) {
  const [focused, setFocused] = useState(false);
  const inputType = showToggle ? (showPw ? "text" : "password") : type;
  const borderColor = error
    ? "rgba(248,113,113,0.6)"
    : focused
      ? "#f59e0b"
      : "rgba(255,255,255,0.1)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
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
        {hint && (
          <span style={{ ...mono, fontSize: 9, color: "#3f3f46" }}>{hint}</span>
        )}
      </div>
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
            background: focused ? "rgba(255,255,255,0.02)" : "#080808",
            border: `1px solid ${borderColor}`,
            padding: showToggle ? "15px 48px 15px 16px" : "15px 16px",
            color: "white",
            fontSize: 16,
            fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.02em",
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
        <p
          style={{
            ...mono,
            fontSize: 10,
            color: "#f87171",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

// ── Main inner component ──────────────────────────────────────────────────────
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState("login"); // login | register | forgot
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Login fields
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Register fields
  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regPass2, setRegPass2] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  // Security question during registration
  const [regSecQ, setRegSecQ] = useState("");
  const [regSecA, setRegSecA] = useState("");
  const [secQuestions, setSecQuestions] = useState([]);

  // Recovery state — 3 steps
  const [recStep, setRecStep] = useState(1); // 1=find account | 2=answer question | 3=reset
  const [recId, setRecId] = useState(""); // username or email entered
  const [recUserId, setRecUserId] = useState(null);
  const [recUsername, setRecUsername] = useState("");
  const [recQuestion, setRecQuestion] = useState("");
  const [recAnswer, setRecAnswer] = useState("");
  const [recToken, setRecToken] = useState("");
  const [recNewPass, setRecNewPass] = useState("");
  const [recNewUser, setRecNewUser] = useState("");
  const [recShowPass, setRecShowPass] = useState(false);
  // "I forgot both" mode
  const [recByQ, setRecByQ] = useState(false);
  const [recPickQ, setRecPickQ] = useState("");
  const [recMatches, setRecMatches] = useState([]);

  useEffect(() => {
    if (searchParams.get("expired") === "true") setExpired(true);
    // Load security questions for registration
    API.get("security-questions/")
      .then((r) => setSecQuestions(r.data.questions || []))
      .catch(() => {});
  }, [searchParams]);

  const handleLogin = async () => {
    setError("");
    setSuccess("");
    if (!loginUser.trim() || !loginPass) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await API.post("token/", {
        username: loginUser.trim(),
        password: loginPass,
      });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      const dash = await API.get("dashboard/");
      router.replace(dash.data.is_staff ? "/barber-dashboard" : "/book");
    } catch (e) {
      setError(
        e.response?.status === 401
          ? "Invalid username or password."
          : "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError("");
    setSuccess("");
    setFieldErrors({});
    const errs = {};
    const eu = validateUsername(regUser);
    const ee = validateEmail(regEmail);
    const ep = validatePassword(regPass);
    if (eu) errs.regUser = eu;
    if (ee) errs.regEmail = ee;
    if (ep) errs.regPass = ep;
    if (regPass !== regPass2) errs.regPass2 = "Passwords don't match";
    if (!regSecQ) errs.regSecQ = "Choose a security question";
    if (!regSecA.trim()) errs.regSecA = "Enter your security answer";
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await API.post("register/", {
        username: regUser.trim(),
        email: regEmail.trim(),
        password: regPass,
        phone: regPhone.trim(),
      });
      const res = await API.post("token/", {
        username: regUser.trim(),
        password: regPass,
      });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      // Save security question — authenticated now
      try {
        await API.post("security-question/set/", {
          question: regSecQ,
          answer: regSecA.trim(),
        });
      } catch {}
      router.replace("/book");
    } catch (e) {
      const d = e.response?.data || {};
      if (d.username) setFieldErrors((p) => ({ ...p, regUser: d.username[0] }));
      else if (d.email) setFieldErrors((p) => ({ ...p, regEmail: d.email[0] }));
      else setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Recovery handlers
  const resetRecovery = () => {
    setRecStep(1);
    setRecId("");
    setRecUserId(null);
    setRecUsername("");
    setRecQuestion("");
    setRecAnswer("");
    setRecToken("");
    setRecNewPass("");
    setRecNewUser("");
    setRecByQ(false);
    setRecPickQ("");
    setRecMatches([]);
    setError("");
    setSuccess("");
  };

  const handleRecStep1 = async () => {
    setError("");
    setLoading(true);
    try {
      if (recByQ) {
        // Find by security question answer
        if (!recPickQ || !recAnswer.trim()) {
          setError("Choose a question and enter your answer");
          setLoading(false);
          return;
        }
        const r = await API.post("recovery/step1-by-question/", {
          question: recPickQ,
          answer: recAnswer.trim(),
        });
        setRecMatches(r.data.matches || []);
        if (r.data.matches?.length === 1) {
          // Single match — get a real token via step2 using the same answer
          const match = r.data.matches[0];
          const t = await API.post("recovery/step2/", {
            user_id: match.user_id,
            answer: recAnswer.trim(),
          });
          setRecUserId(match.user_id);
          setRecUsername(match.username);
          setRecToken(t.data.token);
          setRecNewUser(match.username);
          setRecStep(3);
          setSuccess("✓ Identity verified — set your new credentials below.");
        } else {
          setRecStep(2); // show account picker
        }
      } else {
        if (!recId.trim()) {
          setError("Enter your username or email");
          setLoading(false);
          return;
        }
        const r = await API.post("recovery/step1/", {
          identifier: recId.trim(),
        });
        setRecUserId(r.data.user_id);
        setRecUsername(r.data.username);
        setRecQuestion(r.data.security_question);
        setRecStep(2);
      }
    } catch (e) {
      setError(e.response?.data?.error || "Account not found");
    } finally {
      setLoading(false);
    }
  };

  const handleRecStep2 = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await API.post("recovery/step2/", {
        user_id: recUserId,
        answer: recAnswer.trim(),
      });
      setRecToken(r.data.token);
      setRecNewUser(recUsername); // pre-fill username
      setRecStep(3);
      setSuccess("✓ Correct! Now set your new credentials.");
    } catch (e) {
      setError(e.response?.data?.error || "Incorrect answer");
    } finally {
      setLoading(false);
    }
  };

  const handleRecStep3 = async () => {
    setError("");
    setLoading(true);
    if (!recNewPass && !recNewUser) {
      setError("Enter a new password or new username");
      setLoading(false);
      return;
    }
    if (recNewPass && recNewPass.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }
    try {
      const r = await API.post("recovery/step3/", {
        user_id: recUserId,
        token: recToken,
        new_password: recNewPass || undefined,
        new_username: recNewUser !== recUsername ? recNewUser : undefined,
      });
      setSuccess(`✓ ${r.data.message} — Sign in below.`);
      setTimeout(() => {
        setMode("login");
        resetRecovery();
      }, 2200);
    } catch (e) {
      setError(e.response?.data?.error || "Could not update. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Legacy — kept so old code paths don't break
  const handleForgot = handleRecStep1;

  const strength = getStrength(regPass);
  const strengthColors = [
    "#27272a",
    "#f87171",
    "#fbbf24",
    "#fbbf24",
    "#4ade80",
  ];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

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
        @keyframes scandown {
          from {
            top: -1px;
          }
          to {
            top: 100%;
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }
        .field-enter {
          animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

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

      {/* Amber glow */}
      <div
        style={{
          position: "fixed",
          top: "-10%",
          right: "-5%",
          width: 600,
          height: 600,
          background:
            "radial-gradient(circle,rgba(245,158,11,0.06) 0%,transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "0",
          left: "-10%",
          width: 400,
          height: 400,
          background:
            "radial-gradient(circle,rgba(245,158,11,0.04) 0%,transparent 60%)",
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
            animation: "scandown 10s linear infinite",
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
        }}
      >
        {/* ── LEFT PANEL — Branding ── */}
        <div
          style={{
            width: "45%",
            background: "rgba(245,158,11,0.04)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            padding: "48px 28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
          className="left-panel"
        >
          <style>{`@media(max-width:768px){.left-panel{display:none!important}}`}</style>

          {/* Top */}
          <div>
            <a
              href="/"
              style={{
                ...sf,
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: "-0.06em",
                textDecoration: "none",
                color: "white",
              }}
            >
              HEADZ
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </a>
          </div>

          {/* Center — big editorial text */}
          <div>
            {/* Big ghost number */}
            <p
              style={{
                ...sf,
                fontSize: "clamp(6rem,14vw,12rem)",
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: "-0.06em",
                WebkitTextStroke: "1px rgba(255,255,255,0.06)",
                color: "transparent",
                userSelect: "none",
                marginBottom: -20,
              }}
            >
              HZ
            </p>
            <h2
              style={{
                ...sf,
                fontSize: "clamp(1.8rem,3vw,2.8rem)",
                fontWeight: 900,
                textTransform: "uppercase",
                lineHeight: 0.9,
                letterSpacing: "-0.04em",
              }}
            >
              Your Chair
              <br />
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                Awaits_
              </span>
            </h2>
            <p
              style={{
                ...mono,
                fontSize: 12,
                color: "#52525b",
                lineHeight: 1.8,
                marginTop: 24,
                maxWidth: 320,
              }}
            >
              Book your appointment, track your visits, and experience
              Hattiesburg's premier barbershop — all in one place.
            </p>
          </div>

          {/* Bottom — location + hours */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.07)",
                marginBottom: 4,
              }}
            />
            <p
              style={{
                ...mono,
                fontSize: 10,
                color: "#3f3f46",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              4 Hub Dr · Hattiesburg MS
            </p>
            <p
              style={{
                ...mono,
                fontSize: 10,
                color: "#3f3f46",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              Mon–Fri 9AM–6PM · Sat 9AM–4PM
            </p>
          </div>

          {/* Corner accent */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 120,
              height: 120,
              borderTop: "1px solid rgba(245,158,11,0.15)",
              borderLeft: "1px solid rgba(245,158,11,0.15)",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* ── RIGHT PANEL — Form ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "32px 20px",
            overflowY: "auto",
            overflowY: "auto",
          }}
        >
          <div style={{ maxWidth: 420, width: "100%", margin: "0 auto" }}>
            {/* Mobile logo */}
            <a
              href="/"
              style={{
                ...sf,
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: "-0.06em",
                textDecoration: "none",
                color: "white",
                display: "block",
                marginBottom: 40,
              }}
              className="mobile-logo"
            >
              <style>{`.mobile-logo{display:none} @media(max-width:768px){.mobile-logo{display:block!important}}`}</style>
              HEADZ
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </a>

            {/* Mode tabs */}
            {mode !== "forgot" && (
              <div
                style={{
                  display: "flex",
                  marginBottom: 48,
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {[
                  ["login", "Sign In"],
                  ["register", "Create Account"],
                ].map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      setError("");
                      setSuccess("");
                    }}
                    style={{
                      ...sf,
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: "0.25em",
                      textTransform: "uppercase",
                      padding: "14px 0",
                      marginRight: 24,
                      background: "none",
                      border: "none",
                      borderBottom: `2px solid ${mode === m ? "#f59e0b" : "transparent"}`,
                      color: mode === m ? "white" : "#3f3f46",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      marginBottom: -1,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Session expired */}
            {expired && (
              <div
                style={{
                  marginBottom: 24,
                  padding: "12px 16px",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#f59e0b", fontSize: 14 }}>⚡</span>
                <p
                  style={{
                    ...mono,
                    fontSize: 11,
                    color: "#f59e0b",
                    lineHeight: 1.5,
                  }}
                >
                  Session expired — please sign in again.
                </p>
              </div>
            )}

            {/* Success message */}
            {success && (
              <div
                style={{
                  marginBottom: 24,
                  padding: "12px 16px",
                  background: "rgba(74,222,128,0.08)",
                  border: "1px solid rgba(74,222,128,0.25)",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#4ade80", fontSize: 14 }}>✓</span>
                <p style={{ ...mono, fontSize: 11, color: "#4ade80" }}>
                  {success}
                </p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div
                style={{
                  marginBottom: 24,
                  padding: "12px 16px",
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.25)",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#f87171", fontSize: 14 }}>⚠</span>
                <p style={{ ...mono, fontSize: 11, color: "#f87171" }}>
                  {error}
                </p>
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            {mode === "login" && (
              <div
                className="field-enter"
                style={{ display: "flex", flexDirection: "column", gap: 22 }}
              >
                <h1
                  style={{
                    ...sf,
                    fontSize: "clamp(1.4rem,3vw,2rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "-0.04em",
                    marginBottom: 8,
                  }}
                >
                  Welcome
                  <br />
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    Back_
                  </span>
                </h1>

                <Field
                  label="Username"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="your_username"
                  autoComplete="username"
                />

                <Field
                  label="Password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  showToggle
                  showPw={showLoginPw}
                  onToggle={() => setShowLoginPw(!showLoginPw)}
                  autoComplete="current-password"
                />

                <div style={{ textAlign: "right" }}>
                  <button
                    onClick={() => {
                      setMode("forgot");
                      setError("");
                      setSuccess("");
                    }}
                    style={{
                      ...mono,
                      fontSize: 10,
                      color: "#52525b",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#f59e0b")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#52525b")
                    }
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  style={{
                    padding: "16px 17px",
                    minHeight: "52px",
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
                    position: "relative",
                    overflow: "hidden",
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
                    <span>Sign In →</span>
                  )}
                </button>
              </div>
            )}

            {/* ── REGISTER FORM ── */}
            {mode === "register" && (
              <div
                className="field-enter"
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                <h1
                  style={{
                    ...sf,
                    fontSize: "clamp(1.4rem,3vw,2rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "-0.04em",
                    marginBottom: 8,
                  }}
                >
                  Join
                  <br />
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    HEADZ UP_
                  </span>
                </h1>

                <Field
                  label="Username"
                  value={regUser}
                  onChange={(e) => setRegUser(e.target.value)}
                  placeholder="your_username"
                  error={fieldErrors.regUser}
                  autoComplete="username"
                />

                <Field
                  label="Email Address"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@email.com"
                  error={fieldErrors.regEmail}
                  autoComplete="email"
                />

                <div>
                  <Field
                    label="Phone Number"
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="(601) 555-0100"
                    error={fieldErrors.regPhone}
                    autoComplete="tel"
                  />
                  <p
                    style={{
                      ...mono,
                      fontSize: 9,
                      color: "#52525b",
                      marginTop: 6,
                    }}
                  >
                    Optional — used for appointment text reminders only
                  </p>
                </div>

                <div>
                  <Field
                    label="Password"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    placeholder="Min 6 characters"
                    error={fieldErrors.regPass}
                    showToggle
                    showPw={showRegPw}
                    onToggle={() => setShowRegPw(!showRegPw)}
                    autoComplete="new-password"
                  />
                  {/* Strength bar */}
                  {regPass && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: 2,
                              background:
                                i <= strength
                                  ? strengthColors[strength]
                                  : "rgba(255,255,255,0.08)",
                              transition: "background 0.3s",
                              borderRadius: 1,
                            }}
                          />
                        ))}
                      </div>
                      <p
                        style={{
                          ...mono,
                          fontSize: 9,
                          color: strengthColors[strength],
                        }}
                      >
                        {strengthLabels[strength]}
                      </p>
                    </div>
                  )}
                </div>

                <Field
                  label="Confirm Password"
                  value={regPass2}
                  onChange={(e) => setRegPass2(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  placeholder="••••••••"
                  error={fieldErrors.regPass2}
                  showToggle
                  showPw={showRegPw}
                  onToggle={() => setShowRegPw(!showRegPw)}
                  autoComplete="new-password"
                />

                {/* Security Question */}
                <div>
                  <p
                    style={{
                      ...sf,
                      fontSize: 7,
                      letterSpacing: "0.3em",
                      color: "#a1a1aa",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Security Question
                  </p>
                  <p
                    style={{
                      ...mono,
                      fontSize: 10,
                      color: "#52525b",
                      marginBottom: 10,
                      lineHeight: 1.6,
                    }}
                  >
                    Used to recover your account if you forget your password
                  </p>
                  <select
                    value={regSecQ}
                    onChange={(e) => setRegSecQ(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#080808",
                      border: `1px solid ${fieldErrors.regSecQ ? "#f87171" : "rgba(255,255,255,0.1)"}`,
                      padding: "14px 12px",
                      color: regSecQ ? "white" : "#52525b",
                      fontSize: 14,
                      outline: "none",
                      marginBottom: 10,
                      fontFamily: "'DM Mono',monospace",
                      cursor: "pointer",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = fieldErrors.regSecQ
                        ? "#f87171"
                        : "rgba(255,255,255,0.1)")
                    }
                  >
                    <option value="" disabled>
                      Choose a question...
                    </option>
                    {secQuestions.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.regSecQ && (
                    <p
                      style={{
                        ...mono,
                        fontSize: 10,
                        color: "#f87171",
                        marginBottom: 6,
                      }}
                    >
                      ⚠ {fieldErrors.regSecQ}
                    </p>
                  )}
                  {regSecQ && (
                    <Field
                      label="Your Answer"
                      value={regSecA}
                      onChange={(e) => setRegSecA(e.target.value)}
                      placeholder="Your answer (case insensitive)"
                      error={fieldErrors.regSecA}
                    />
                  )}
                </div>

                <button
                  onClick={handleRegister}
                  disabled={loading}
                  style={{
                    padding: "16px 17px",
                    minHeight: "52px",
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
                    <span>Create Account →</span>
                  )}
                </button>

                <p
                  style={{
                    ...mono,
                    fontSize: 10,
                    color: "#27272a",
                    textAlign: "center",
                    lineHeight: 1.6,
                  }}
                >
                  By creating an account you agree to our terms of service.
                </p>
              </div>
            )}

            {/* ── ACCOUNT RECOVERY ── */}
            {mode === "forgot" && (
              <div
                className="field-enter"
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                {/* Back button */}
                <button
                  onClick={() => {
                    setMode("login");
                    resetRecovery();
                  }}
                  style={{
                    ...mono,
                    fontSize: 10,
                    color: "#52525b",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 0,
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#f59e0b")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#52525b")
                  }
                >
                  ← Back to Sign In
                </button>

                {/* Step indicator */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            recStep > s
                              ? "#22c55e"
                              : recStep === s
                                ? "#f59e0b"
                                : "rgba(255,255,255,0.06)",
                          border: `1px solid ${recStep > s ? "#22c55e" : recStep === s ? "#f59e0b" : "rgba(255,255,255,0.1)"}`,
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            ...sf,
                            fontSize: 8,
                            fontWeight: 900,
                            color: recStep >= s ? "black" : "#52525b",
                          }}
                        >
                          {recStep > s ? "✓" : s}
                        </span>
                      </div>
                      {s < 3 && (
                        <div
                          style={{
                            width: 24,
                            height: 1,
                            background:
                              recStep > s
                                ? "#22c55e"
                                : "rgba(255,255,255,0.08)",
                          }}
                        />
                      )}
                    </div>
                  ))}
                  <span
                    style={{
                      ...mono,
                      fontSize: 10,
                      color: "#71717a",
                      marginLeft: 8,
                    }}
                  >
                    {recStep === 1
                      ? "Find Account"
                      : recStep === 2
                        ? "Security Question"
                        : "Reset Credentials"}
                  </span>
                </div>

                <h1
                  style={{
                    ...sf,
                    fontSize: "clamp(1.2rem,3vw,1.8rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "-0.04em",
                  }}
                >
                  {recStep === 1 ? (
                    <>
                      Find Your
                      <br />
                      <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                        Account_
                      </span>
                    </>
                  ) : recStep === 2 ? (
                    <>
                      Security
                      <br />
                      <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                        Question_
                      </span>
                    </>
                  ) : (
                    <>
                      New
                      <br />
                      <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                        Credentials_
                      </span>
                    </>
                  )}
                </h1>

                {/* ── STEP 1 — Find account ── */}
                {recStep === 1 && (
                  <>
                    {/* Toggle between "I know my username/email" vs "I forgot both" */}
                    <div
                      style={{
                        display: "flex",
                        border: "1px solid rgba(255,255,255,0.08)",
                        marginBottom: 4,
                      }}
                    >
                      {[
                        { label: "I know my username / email", val: false },
                        { label: "I forgot both", val: true },
                      ].map(({ label, val }) => (
                        <button
                          key={String(val)}
                          onClick={() => {
                            setRecByQ(val);
                            setError("");
                            setRecMatches([]);
                          }}
                          style={{
                            flex: 1,
                            padding: "10px 8px",
                            background:
                              recByQ === val ? "#f59e0b" : "transparent",
                            color: recByQ === val ? "black" : "#52525b",
                            ...sf,
                            fontSize: 6,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            lineHeight: 1.4,
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {!recByQ ? (
                      <Field
                        label="Username or Email"
                        value={recId}
                        onChange={(e) => setRecId(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRecStep1()}
                        placeholder="Enter your username or email"
                      />
                    ) : (
                      <>
                        <p
                          style={{
                            ...mono,
                            fontSize: 11,
                            color: "#71717a",
                            lineHeight: 1.6,
                          }}
                        >
                          Choose your security question and enter the answer —
                          we'll find your account.
                        </p>
                        <div>
                          <p
                            style={{
                              ...sf,
                              fontSize: 7,
                              letterSpacing: "0.3em",
                              color: "#a1a1aa",
                              textTransform: "uppercase",
                              marginBottom: 8,
                            }}
                          >
                            Security Question
                          </p>
                          <select
                            value={recPickQ}
                            onChange={(e) => setRecPickQ(e.target.value)}
                            style={{
                              width: "100%",
                              background: "#080808",
                              border: "1px solid rgba(255,255,255,0.1)",
                              padding: "14px 12px",
                              color: recPickQ ? "white" : "#52525b",
                              fontSize: 14,
                              outline: "none",
                              fontFamily: "'DM Mono',monospace",
                              marginBottom: 12,
                              cursor: "pointer",
                            }}
                            onFocus={(e) =>
                              (e.target.style.borderColor = "#f59e0b")
                            }
                            onBlur={(e) =>
                              (e.target.style.borderColor =
                                "rgba(255,255,255,0.1)")
                            }
                          >
                            <option value="" disabled>
                              Choose your question...
                            </option>
                            {secQuestions.map((q) => (
                              <option key={q} value={q}>
                                {q}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Field
                          label="Your Answer"
                          value={recAnswer}
                          onChange={(e) => setRecAnswer(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleRecStep1()
                          }
                          placeholder="Your answer"
                        />
                      </>
                    )}

                    {/* Multiple matches */}
                    {recMatches.length > 1 && (
                      <div>
                        <p
                          style={{
                            ...mono,
                            fontSize: 11,
                            color: "#a1a1aa",
                            marginBottom: 10,
                          }}
                        >
                          Multiple accounts found — choose yours:
                        </p>
                        {recMatches.map((m) => (
                          <button
                            key={m.user_id}
                            onClick={async () => {
                              try {
                                const t = await API.post("recovery/step2/", {
                                  user_id: m.user_id,
                                  answer: recAnswer.trim(),
                                });
                                setRecUserId(m.user_id);
                                setRecUsername(m.username);
                                setRecToken(t.data.token);
                                setRecNewUser(m.username);
                                setRecStep(3);
                                setSuccess(
                                  "✓ Identity verified — set your new credentials below.",
                                );
                              } catch (e) {
                                setError(
                                  e.response?.data?.error || "Could not verify",
                                );
                              }
                            }}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              background: "rgba(245,158,11,0.05)",
                              border: "1px solid rgba(245,158,11,0.2)",
                              color: "#f59e0b",
                              ...sf,
                              fontSize: 8,
                              textTransform: "uppercase",
                              letterSpacing: "0.15em",
                              cursor: "pointer",
                              marginBottom: 6,
                              textAlign: "left",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "rgba(245,158,11,0.1)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                "rgba(245,158,11,0.05)")
                            }
                          >
                            {m.username}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={handleRecStep1}
                      disabled={loading}
                      style={{
                        padding: "16px",
                        minHeight: "52px",
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
                          Finding account...
                        </>
                      ) : (
                        <span>Find My Account →</span>
                      )}
                    </button>
                  </>
                )}

                {/* ── STEP 2 — Answer security question ── */}
                {recStep === 2 && (
                  <>
                    <div
                      style={{
                        padding: "14px 16px",
                        background: "rgba(245,158,11,0.05)",
                        border: "1px solid rgba(245,158,11,0.15)",
                      }}
                    >
                      <p
                        style={{
                          ...mono,
                          fontSize: 10,
                          color: "#a1a1aa",
                          marginBottom: 4,
                        }}
                      >
                        Account found
                      </p>
                      <p
                        style={{
                          ...sf,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: "white",
                        }}
                      >
                        {recUsername}
                      </p>
                    </div>

                    <div>
                      <p
                        style={{
                          ...sf,
                          fontSize: 7,
                          letterSpacing: "0.3em",
                          color: "#a1a1aa",
                          textTransform: "uppercase",
                          marginBottom: 10,
                        }}
                      >
                        Security Question
                      </p>
                      <div
                        style={{
                          padding: "14px 16px",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          marginBottom: 14,
                        }}
                      >
                        <p
                          style={{
                            ...mono,
                            fontSize: 13,
                            color: "white",
                            lineHeight: 1.6,
                          }}
                        >
                          {recQuestion}
                        </p>
                      </div>
                      <Field
                        label="Your Answer"
                        value={recAnswer}
                        onChange={(e) => setRecAnswer(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRecStep2()}
                        placeholder="Type your answer..."
                      />
                      <p
                        style={{
                          ...mono,
                          fontSize: 10,
                          color: "#52525b",
                          marginTop: 6,
                        }}
                      >
                        Not case sensitive
                      </p>
                    </div>

                    <button
                      onClick={handleRecStep2}
                      disabled={loading}
                      style={{
                        padding: "16px",
                        minHeight: "52px",
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
                          Verifying...
                        </>
                      ) : (
                        <span>Verify Answer →</span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setRecStep(1);
                        setRecAnswer("");
                        setError("");
                      }}
                      style={{
                        ...mono,
                        fontSize: 10,
                        color: "#52525b",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#f59e0b")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "#52525b")
                      }
                    >
                      ← Try different account
                    </button>
                  </>
                )}

                {/* ── STEP 3 — Set new credentials ── */}
                {recStep === 3 && (
                  <>
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "rgba(34,197,94,0.06)",
                        border: "1px solid rgba(34,197,94,0.2)",
                      }}
                    >
                      <p style={{ ...mono, fontSize: 11, color: "#4ade80" }}>
                        ✓ Identity verified — set your new credentials below
                      </p>
                    </div>

                    <Field
                      label="New Username (optional — leave to keep current)"
                      value={recNewUser}
                      onChange={(e) => setRecNewUser(e.target.value)}
                      placeholder={recUsername}
                    />

                    <div>
                      <Field
                        label="New Password (optional — leave to keep current)"
                        value={recNewPass}
                        onChange={(e) => setRecNewPass(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRecStep3()}
                        placeholder="Min 6 characters"
                        showToggle
                        showPw={recShowPass}
                        onToggle={() => setRecShowPass(!recShowPass)}
                      />
                      <p
                        style={{
                          ...mono,
                          fontSize: 10,
                          color: "#52525b",
                          marginTop: 6,
                        }}
                      >
                        Leave blank to keep your current password
                      </p>
                    </div>

                    <button
                      onClick={handleRecStep3}
                      disabled={loading}
                      style={{
                        padding: "16px",
                        minHeight: "52px",
                        background: loading ? "#111" : "#22c55e",
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
                          Saving...
                        </>
                      ) : (
                        <span>Save New Credentials ✓</span>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
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
              width: 18,
              height: 18,
              border: "1.5px solid rgba(245,158,11,0.2)",
              borderTopColor: "#f59e0b",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}} body{background:#040404;margin:0}`}</style>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
