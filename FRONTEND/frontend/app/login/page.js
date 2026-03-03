"use client";

import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as THREE from "three";
import { gsap } from "gsap";
import API from "@/lib/api";
import LoadingScreen from "@/lib/LoadingScreen";
import useBreakpoint from "@/lib/useBreakpoint";

function getStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: s, label: "Weak", color: "#f87171" };
  if (s <= 3) return { score: s, label: "Fair", color: "#fbbf24" };
  return { score: s, label: "Strong", color: "#4ade80" };
}

const EyeOpen = () => (
  <svg
    width="16"
    height="16"
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
    width="16"
    height="16"
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

function Field({
  label,
  type,
  value,
  onChange,
  onKeyDown,
  placeholder,
  error,
  hint,
  showToggle,
  onToggle,
  showPassword,
}) {
  const sf = { fontFamily: "'Syncopate', sans-serif" };
  const inputType = showToggle ? (showPassword ? "text" : "password") : type;
  return (
    <div
      className="form-field"
      style={{ display: "flex", flexDirection: "column", gap: 6 }}
    >
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
            fontSize: 8,
            letterSpacing: "0.3em",
            color: error ? "#f87171" : "#a1a1aa",
            textTransform: "uppercase",
          }}
        >
          {label}
        </label>
        {hint && (
          <span style={{ fontSize: 10, color: "#52525b", fontStyle: "italic" }}>
            {hint}
          </span>
        )}
      </div>
      <div style={{ position: "relative" }}>
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          style={{
            width: "100%",
            background: "#0a0a0a",
            padding: showToggle ? "14px 48px 14px 16px" : "14px 16px",
            border: `1px solid ${error ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)"}`,
            color: "white",
            fontSize: 14,
            outline: "none",
            fontFamily: "Inter, sans-serif",
            transition: "border-color 0.2s",
            borderRadius: 0,
          }}
          onFocus={(e) =>
            (e.target.style.borderColor = error ? "#f87171" : "#f59e0b")
          }
          onBlur={(e) =>
            (e.target.style.borderColor = error
              ? "rgba(248,113,113,0.5)"
              : "rgba(255,255,255,0.1)")
          }
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#52525b",
              display: "flex",
              alignItems: "center",
              padding: 0,
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
        <p
          style={{
            fontSize: 11,
            color: "#f87171",
            fontStyle: "italic",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

function ErrorBox({ message, action, actionLabel }) {
  const sf = { fontFamily: "'Syncopate', sans-serif" };
  if (!message) return null;
  return (
    <div
      style={{
        padding: "14px 16px",
        background: "rgba(248,113,113,0.08)",
        border: "1px solid rgba(248,113,113,0.3)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <p
        style={{
          ...sf,
          fontSize: 8,
          color: "#f87171",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          margin: 0,
          flex: 1,
        }}
      >
        {message}
      </p>
      {action && (
        <button
          onClick={action}
          style={{
            ...sf,
            fontSize: 7,
            color: "#f59e0b",
            background: "none",
            border: "1px solid rgba(245,158,11,0.4)",
            padding: "6px 12px",
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            flexShrink: 0,
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(245,158,11,0.1)";
            e.currentTarget.style.borderColor = "#f59e0b";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)";
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function SuccessBox({ message }) {
  const sf = { fontFamily: "'Syncopate', sans-serif" };
  if (!message) return null;
  return (
    <div
      style={{
        padding: "14px 16px",
        background: "rgba(74,222,128,0.08)",
        border: "1px solid rgba(74,222,128,0.25)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          background: "#4ade80",
          borderRadius: "50%",
          flexShrink: 0,
          boxShadow: "0 0 8px rgba(74,222,128,0.7)",
        }}
      />
      <p
        style={{
          ...sf,
          fontSize: 8,
          color: "#4ade80",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          margin: 0,
        }}
      >
        {message}
      </p>
    </div>
  );
}

function SubmitBtn({
  onClick,
  loading,
  disabled,
  label,
  loadingLabel,
  bg = "white",
  color = "black",
}) {
  const sf = { fontFamily: "'Syncopate', sans-serif" };
  const isDisabled = loading || disabled;
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      style={{
        width: "100%",
        padding: "18px",
        background: isDisabled ? "#3f3f46" : bg,
        color: isDisabled ? "#71717a" : color,
        ...sf,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        border: "none",
        cursor: isDisabled ? "not-allowed" : "pointer",
        transition: "all 0.3s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) e.currentTarget.style.background = "#f59e0b";
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) e.currentTarget.style.background = bg;
      }}
    >
      {loading ? (
        <>
          <span
            style={{
              width: 14,
              height: 14,
              border: "2px solid #71717a",
              borderTopColor: "transparent",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.7s linear infinite",
            }}
          />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const [pageReady, setPageReady] = useState(false);
  const [mode, setMode] = useState("login"); // login | register | forgot

  // Session expired banner — shown when api.js redirects with ?expired=true
  const searchParams = useSearchParams();
  const [sessionExpired, setSessionExpired] = useState(false);
  useEffect(() => {
    if (searchParams.get("expired") === "true") {
      setSessionExpired(true);
      // Clean URL without reload
      window.history.replaceState({}, "", "/login");
    }
  }, [searchParams]);

  // Login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Register
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Forgot
  const [forgotInput, setForgotInput] = useState("");
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotToken, setForgotToken] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmNewPw, setConfirmNewPw] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmNew, setShowConfirmNew] = useState(false);

  // Shared
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [apiSuccess, setApiSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginErrType, setLoginErrType] = useState(null); // "username" | "password" | null

  const sf = { fontFamily: "'Syncopate', sans-serif" };
  const { isMobile } = useBreakpoint();
  const strength = getStrength(regPw);

  // Particles
  useEffect(() => {
    if (!pageReady) return;
    const container = canvasRef.current;
    if (!container) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    const verts = [];
    for (let i = 0; i < 1400; i++) {
      verts.push(THREE.MathUtils.randFloatSpread(10));
      verts.push(THREE.MathUtils.randFloatSpread(10));
      verts.push(THREE.MathUtils.randFloatSpread(10));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.006,
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.22,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    camera.position.z = 3;
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      points.rotation.y += 0.0005;
      points.rotation.x += 0.0002;
      renderer.render(scene, camera);
    };
    tick();
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, [pageReady]);

  useEffect(() => {
    if (!pageReady) return;
    gsap.from(".auth-logo", {
      y: -20,
      opacity: 0,
      duration: 0.9,
      ease: "expo.out",
    });
    gsap.from(".auth-panel", {
      y: 50,
      opacity: 0,
      duration: 1.3,
      ease: "expo.out",
      delay: 0.1,
    });
  }, [pageReady]);

  useEffect(() => {
    setApiError("");
    setApiSuccess("");
    setFieldErrors({});
    setLoginErrType(null);
    if (pageReady)
      gsap.fromTo(
        ".form-field",
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: "expo.out" },
      );
  }, [mode, pageReady]);

  const shake = () =>
    gsap.to(".auth-panel", {
      x: [-8, 8, -6, 6, -3, 3, 0],
      duration: 0.5,
      ease: "power2.out",
    });
  const onEnter = (fn) => (e) => e.key === "Enter" && fn();

  // ── LOGIN ──────────────────────────────────────────────────────────────────
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
    setLoginErrType(null);
    try {
      const res = await API.post("token/", {
        username: username.trim(),
        password,
      });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      // Check if staff — redirect to admin schedule, otherwise book page
      try {
        const dash = await API.get("dashboard/");
        const dest = dash.data.is_staff ? "/barber-dashboard" : "/book";
        gsap.to(".auth-panel", {
          y: -40,
          opacity: 0,
          duration: 0.6,
          ease: "expo.in",
          onComplete: () => router.push(dest),
        });
      } catch {
        gsap.to(".auth-panel", {
          y: -40,
          opacity: 0,
          duration: 0.6,
          ease: "expo.in",
          onComplete: () => router.push("/book"),
        });
      }
    } catch (err) {
      if (err.response?.status === 401) {
        try {
          const check = await API.post("check-username/", {
            username: username.trim(),
          });
          if (check.data.exists) {
            setLoginErrType("password");
            setApiError("Password is incorrect.");
            setFieldErrors({
              password: "That password doesn't match this account",
            });
          } else {
            setLoginErrType("username");
            setApiError("No account found with that username.");
            setFieldErrors({
              username:
                "Username not found — try a different spelling or create an account",
            });
          }
        } catch {
          setApiError("Username or password is incorrect.");
        }
      } else {
        setApiError("Something went wrong. Please try again.");
      }
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER ───────────────────────────────────────────────────────────────
  const validateRegister = () => {
    const errs = {};
    if (!regName.trim()) errs.regName = "Username is required";
    else if (regName.length < 3) errs.regName = "At least 3 characters";
    else if (/\s/.test(regName)) errs.regName = "No spaces allowed";
    if (!regEmail.trim()) errs.regEmail = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail))
      errs.regEmail = "Enter a valid email";
    if (!regPw) errs.regPw = "Password is required";
    else if (regPw.length < 6) errs.regPw = "Minimum 6 characters";
    if (!regConfirm) errs.regConfirm = "Please confirm your password";
    else if (regPw !== regConfirm) errs.regConfirm = "Passwords don't match";
    return errs;
  };

  const handleRegister = async () => {
    const errs = validateRegister();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setLoading(true);
    setApiError("");
    setFieldErrors({});
    try {
      await API.post("register/", {
        username: regName.trim(),
        email: regEmail.trim(),
        password: regPw,
      });
      setApiSuccess("Account created! Signing you in...");
      const res = await API.post("token/", {
        username: regName.trim(),
        password: regPw,
      });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      setTimeout(() => router.push("/book"), 1200);
    } catch (err) {
      const data = err.response?.data;
      const newErrs = {};
      if (data?.username)
        newErrs.regName = Array.isArray(data.username)
          ? data.username[0]
          : data.username;
      if (data?.email)
        newErrs.regEmail = Array.isArray(data.email)
          ? data.email[0]
          : data.email;
      if (data?.password)
        newErrs.regPw = Array.isArray(data.password)
          ? data.password[0]
          : data.password;
      if (Object.keys(newErrs).length) setFieldErrors(newErrs);
      else
        setApiError(
          data?.detail || "Registration failed. Please check your info.",
        );
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── FORGOT — step 1 ────────────────────────────────────────────────────────
  const handleForgotLookup = async () => {
    if (!forgotInput.trim()) {
      setFieldErrors({ forgotInput: "Enter your username or email" });
      return;
    }
    setLoading(true);
    setApiError("");
    setFieldErrors({});
    try {
      const res = await API.post("password-reset/", {
        identifier: forgotInput.trim(),
      });
      setForgotToken(res.data.token || "");
      setForgotStep(2);
      setApiSuccess("Account found! Set your new password below.");
    } catch (err) {
      if (err.response?.status === 404)
        setFieldErrors({
          forgotInput: "No account found with that username or email",
        });
      else setApiError("Could not find your account. Please try again.");
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── FORGOT — step 2 ────────────────────────────────────────────────────────
  const handlePasswordReset = async () => {
    const errs = {};
    if (!newPw) errs.newPw = "New password is required";
    else if (newPw.length < 6) errs.newPw = "Minimum 6 characters";
    if (!confirmNewPw) errs.confirmNewPw = "Please confirm your password";
    else if (newPw !== confirmNewPw)
      errs.confirmNewPw = "Passwords don't match";
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setLoading(true);
    setApiError("");
    setFieldErrors({});
    try {
      await API.post("password-reset/confirm/", {
        token: forgotToken,
        identifier: forgotInput.trim(),
        password: newPw,
      });
      setApiSuccess("Password updated! Signing you in...");
      const loginField = forgotInput.includes("@") ? null : forgotInput.trim();
      const res = await API.post("token/", {
        username: loginField || forgotInput.trim(),
        password: newPw,
      });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      setTimeout(() => router.push("/book"), 1200);
    } catch {
      setApiError("Could not reset password. Please start over.");
      shake();
    } finally {
      setLoading(false);
    }
  };

  const resetForgot = () => {
    setMode("login");
    setForgotStep(1);
    setForgotInput("");
    setNewPw("");
    setConfirmNewPw("");
    setForgotToken("");
  };

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Inter:wght@300;400;700;900&display=swap");
        html,
        body {
          background: #050505 !important;
          margin: 0;
          padding: 0;
          color: white;
          font-family: "Inter", sans-serif;
        }
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #0a0a0a inset !important;
          -webkit-text-fill-color: white !important;
          caret-color: white;
          transition: background-color 5000s;
        }
        .page-root {
          opacity: 0;
          animation: pageIn 0.5s ease forwards;
        }
        @keyframes pageIn {
          to {
            opacity: 1;
          }
        }
        .login-scroll {
          min-height: 100vh;
          overflow-y: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .mode-tab {
          position: relative;
          cursor: pointer;
          transition: all 0.3s;
        }
        .mode-tab::after {
          content: "";
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #f59e0b;
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }
        .mode-tab.active::after {
          transform: scaleX(1);
        }
      `}</style>

      <LoadingScreen onComplete={() => setPageReady(true)} />

      {pageReady && (
        <div className="page-root" style={{ position: "relative" }}>
          <div
            ref={canvasRef}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1,
              pointerEvents: "none",
              opacity: 0.04,
              backgroundImage:
                "url('https://grainy-gradients.vercel.app/noise.svg')",
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "40%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 700,
              height: 700,
              zIndex: 1,
              pointerEvents: "none",
              background:
                "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 65%)",
            }}
          />

          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              padding: "24px 32px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(5,5,5,0.8)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <a
              href="/"
              style={{
                ...sf,
                fontSize: 8,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "#71717a",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#f59e0b")}
              onMouseLeave={(e) => (e.target.style.color = "#71717a")}
            >
              ← Home
            </a>
            <div
              className="auth-logo"
              style={{
                ...sf,
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: "-0.05em",
              }}
            >
              HEADZ
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </div>
          </div>

          <div
            className="login-scroll"
            style={{
              position: "relative",
              zIndex: 10,
              padding: isMobile ? "72px 14px 40px" : "80px 24px 40px",
            }}
          >
            <div
              className="auth-panel"
              style={{ width: "100%", maxWidth: 500 }}
            >
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <p
                  style={{
                    ...sf,
                    fontSize: 8,
                    letterSpacing: "0.5em",
                    color: "#71717a",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  {mode === "login"
                    ? "Welcome Back"
                    : mode === "register"
                      ? "Create Your Account"
                      : "Account Recovery"}
                </p>
                <h1
                  style={{
                    ...sf,
                    fontSize: "clamp(1.6rem, 5vw, 2.6rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    lineHeight: 1,
                    color: "white",
                    margin: 0,
                  }}
                >
                  {mode === "login" && (
                    <>
                      Sign
                      <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                        _In
                      </span>
                    </>
                  )}
                  {mode === "register" && (
                    <>
                      New
                      <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                        _Client
                      </span>
                    </>
                  )}
                  {mode === "forgot" && (
                    <>
                      Reset
                      <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                        _Password
                      </span>
                    </>
                  )}
                </h1>
                <p style={{ color: "#52525b", fontSize: 12, marginTop: 10 }}>
                  {mode === "login" && "Access your bookings and account"}
                  {mode === "register" &&
                    "Takes 30 seconds — no credit card required"}
                  {mode === "forgot" &&
                    "Enter your username or email to recover your account"}
                </p>
              </div>

              {/* Session expired banner */}
              {sessionExpired && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                    gap: 12,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Syncopate',sans-serif",
                      fontSize: 8,
                      color: "#f59e0b",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      margin: 0,
                    }}
                  >
                    Your session expired — please sign in again
                  </p>
                  <button
                    onClick={() => setSessionExpired(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#52525b",
                      cursor: "pointer",
                      fontSize: 12,
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {mode !== "forgot" && (
                <div
                  style={{
                    display: "flex",
                    marginBottom: 32,
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {[
                    { key: "login", label: "Sign In", sub: "Existing client" },
                    {
                      key: "register",
                      label: "New Client",
                      sub: "First time here",
                    },
                  ].map(({ key, label, sub }) => (
                    <button
                      key={key}
                      onClick={() => setMode(key)}
                      className={`mode-tab${mode === key ? " active" : ""}`}
                      style={{
                        flex: 1,
                        padding: "14px 12px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          ...sf,
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                          color: mode === key ? "white" : "#52525b",
                          transition: "color 0.3s",
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: mode === key ? "#71717a" : "#3f3f46",
                          marginTop: 2,
                          transition: "color 0.3s",
                        }}
                      >
                        {sub}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {mode === "forgot" && (
                <button
                  onClick={resetForgot}
                  style={{
                    ...sf,
                    fontSize: 8,
                    color: "#71717a",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: 0,
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#f59e0b")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#71717a")
                  }
                >
                  ← Back to Sign In
                </button>
              )}

              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  padding: isMobile ? "24px 18px" : "36px 32px",
                }}
              >
                {/* LOGIN */}
                {mode === "login" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 20,
                    }}
                  >
                    <Field
                      label="Username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={onEnter(handleLogin)}
                      placeholder="your_username"
                      error={fieldErrors.username}
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
                      onToggle={() => setShowPw(!showPw)}
                    />
                    <ErrorBox
                      message={apiError}
                      action={
                        loginErrType === "password"
                          ? () => setMode("forgot")
                          : loginErrType === "username"
                            ? () => setMode("register")
                            : null
                      }
                      actionLabel={
                        loginErrType === "password"
                          ? "Reset Password →"
                          : loginErrType === "username"
                            ? "Create Account →"
                            : null
                      }
                    />
                    <SubmitBtn
                      onClick={handleLogin}
                      loading={loading}
                      label="Enter The Chair →"
                      loadingLabel="Signing In..."
                    />
                    <p
                      style={{
                        textAlign: "center",
                        ...sf,
                        fontSize: 8,
                        color: "#52525b",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        margin: 0,
                      }}
                    >
                      Forgot your password?{" "}
                      <button
                        onClick={() => setMode("forgot")}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#f59e0b",
                          cursor: "pointer",
                          ...sf,
                          fontSize: 8,
                          letterSpacing: "0.2em",
                          textDecoration: "underline",
                          textTransform: "uppercase",
                          padding: 0,
                        }}
                      >
                        Recover It
                      </button>
                    </p>
                  </div>
                )}

                {/* REGISTER */}
                {mode === "register" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 18,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        gap: 14,
                      }}
                    >
                      <Field
                        label="Username"
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        onKeyDown={onEnter(handleRegister)}
                        placeholder="no_spaces"
                        error={fieldErrors.regName}
                        hint="3+ chars"
                      />
                      <Field
                        label="Email"
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        onKeyDown={onEnter(handleRegister)}
                        placeholder="you@email.com"
                        error={fieldErrors.regEmail}
                      />
                    </div>
                    <div>
                      <Field
                        label="Password"
                        type="password"
                        value={regPw}
                        onChange={(e) => setRegPw(e.target.value)}
                        onKeyDown={onEnter(handleRegister)}
                        placeholder="min. 6 characters"
                        error={fieldErrors.regPw}
                        showToggle
                        showPassword={showRegPw}
                        onToggle={() => setShowRegPw(!showRegPw)}
                      />
                      {regPw && (
                        <div style={{ marginTop: 8 }}>
                          <div
                            style={{ display: "flex", gap: 4, marginBottom: 4 }}
                          >
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                style={{
                                  flex: 1,
                                  height: 2,
                                  background:
                                    i <= strength.score
                                      ? strength.color
                                      : "rgba(255,255,255,0.08)",
                                  transition: "background 0.3s",
                                }}
                              />
                            ))}
                          </div>
                          <p
                            style={{
                              ...sf,
                              fontSize: 7,
                              letterSpacing: "0.2em",
                              color: strength.color,
                              textTransform: "uppercase",
                              margin: 0,
                            }}
                          >
                            {strength.label}
                          </p>
                        </div>
                      )}
                    </div>
                    <Field
                      label="Confirm Password"
                      type="password"
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      onKeyDown={onEnter(handleRegister)}
                      placeholder="••••••••"
                      error={fieldErrors.regConfirm}
                      showToggle
                      showPassword={showConfirm}
                      onToggle={() => setShowConfirm(!showConfirm)}
                    />
                    <p
                      style={{
                        fontSize: 11,
                        color: "#3f3f46",
                        lineHeight: 1.6,
                        margin: 0,
                      }}
                    >
                      By creating an account you agree to our{" "}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#f59e0b",
                          textDecoration: "underline",
                        }}
                      >
                        Terms & Privacy Policy
                      </a>{" "}
                      and to receive appointment confirmation emails.
                    </p>
                    <ErrorBox message={apiError} />
                    <SuccessBox message={apiSuccess} />
                    <SubmitBtn
                      onClick={handleRegister}
                      loading={loading}
                      disabled={!!apiSuccess}
                      label="Join The Roster →"
                      loadingLabel="Creating Account..."
                      bg="#f59e0b"
                    />
                    <p
                      style={{
                        textAlign: "center",
                        ...sf,
                        fontSize: 8,
                        color: "#52525b",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        margin: 0,
                      }}
                    >
                      Already have an account?{" "}
                      <button
                        onClick={() => setMode("login")}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#f59e0b",
                          cursor: "pointer",
                          ...sf,
                          fontSize: 8,
                          letterSpacing: "0.2em",
                          textDecoration: "underline",
                          textTransform: "uppercase",
                          padding: 0,
                        }}
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                )}

                {/* FORGOT */}
                {mode === "forgot" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 20,
                    }}
                  >
                    <div style={{ display: "flex", gap: 8 }}>
                      {[1, 2].map((n) => (
                        <div
                          key={n}
                          style={{
                            flex: 1,
                            height: 2,
                            background:
                              forgotStep >= n
                                ? "#f59e0b"
                                : "rgba(255,255,255,0.08)",
                            transition: "background 0.4s",
                            borderRadius: 2,
                          }}
                        />
                      ))}
                    </div>
                    <p
                      style={{
                        ...sf,
                        fontSize: 7,
                        color: "#52525b",
                        textTransform: "uppercase",
                        letterSpacing: "0.3em",
                        margin: 0,
                      }}
                    >
                      Step {forgotStep} of 2 —{" "}
                      {forgotStep === 1
                        ? "Find Your Account"
                        : "Set New Password"}
                    </p>

                    {forgotStep === 1 && (
                      <>
                        <Field
                          label="Username or Email"
                          type="text"
                          value={forgotInput}
                          onChange={(e) => setForgotInput(e.target.value)}
                          onKeyDown={onEnter(handleForgotLookup)}
                          placeholder="your_username or email@example.com"
                          error={fieldErrors.forgotInput}
                        />
                        <div
                          style={{
                            padding: "12px 16px",
                            background: "rgba(245,158,11,0.05)",
                            border: "1px solid rgba(245,158,11,0.15)",
                          }}
                        >
                          <p
                            style={{
                              fontSize: 11,
                              color: "#a1a1aa",
                              margin: 0,
                              lineHeight: 1.6,
                            }}
                          >
                            Enter your{" "}
                            <span style={{ color: "white" }}>username</span> or{" "}
                            <span style={{ color: "white" }}>
                              email address
                            </span>
                            . We'll verify your account so you can set a new
                            password.
                          </p>
                        </div>
                        <ErrorBox message={apiError} />
                        <SubmitBtn
                          onClick={handleForgotLookup}
                          loading={loading}
                          label="Find My Account →"
                          loadingLabel="Looking Up Account..."
                        />
                      </>
                    )}

                    {forgotStep === 2 && (
                      <>
                        <div
                          style={{
                            padding: "12px 16px",
                            background: "rgba(74,222,128,0.05)",
                            border: "1px solid rgba(74,222,128,0.2)",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
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
                              fontSize: 11,
                              color: "#a1a1aa",
                              margin: 0,
                            }}
                          >
                            Account verified for{" "}
                            <span style={{ color: "white", fontWeight: 700 }}>
                              {forgotInput}
                            </span>
                          </p>
                        </div>
                        <div>
                          <Field
                            label="New Password"
                            type="password"
                            value={newPw}
                            onChange={(e) => setNewPw(e.target.value)}
                            onKeyDown={onEnter(handlePasswordReset)}
                            placeholder="min. 6 characters"
                            error={fieldErrors.newPw}
                            showToggle
                            showPassword={showNewPw}
                            onToggle={() => setShowNewPw(!showNewPw)}
                          />
                          {newPw && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ display: "flex", gap: 4 }}>
                                {[1, 2, 3, 4, 5].map((i) => {
                                  const s = getStrength(newPw);
                                  return (
                                    <div
                                      key={i}
                                      style={{
                                        flex: 1,
                                        height: 2,
                                        background:
                                          i <= s.score
                                            ? s.color
                                            : "rgba(255,255,255,0.08)",
                                        transition: "background 0.3s",
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <Field
                          label="Confirm New Password"
                          type="password"
                          value={confirmNewPw}
                          onChange={(e) => setConfirmNewPw(e.target.value)}
                          onKeyDown={onEnter(handlePasswordReset)}
                          placeholder="••••••••"
                          error={fieldErrors.confirmNewPw}
                          showToggle
                          showPassword={showConfirmNew}
                          onToggle={() => setShowConfirmNew(!showConfirmNew)}
                        />
                        <ErrorBox message={apiError} />
                        <SuccessBox message={apiSuccess} />
                        <SubmitBtn
                          onClick={handlePasswordReset}
                          loading={loading}
                          label="Update Password →"
                          loadingLabel="Updating..."
                          bg="#f59e0b"
                        />
                      </>
                    )}

                    <p
                      style={{
                        textAlign: "center",
                        ...sf,
                        fontSize: 8,
                        color: "#52525b",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        margin: 0,
                      }}
                    >
                      Remembered it?{" "}
                      <button
                        onClick={resetForgot}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#f59e0b",
                          cursor: "pointer",
                          ...sf,
                          fontSize: 8,
                          letterSpacing: "0.2em",
                          textDecoration: "underline",
                          textTransform: "uppercase",
                          padding: 0,
                        }}
                      >
                        Back to Sign In
                      </button>
                    </p>
                  </div>
                )}
              </div>

              <p
                style={{
                  textAlign: "center",
                  marginTop: 24,
                  ...sf,
                  fontSize: 7,
                  color: "#27272a",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                }}
              >
                HEADZ UP BARBERSHOP · HATTIESBURG, MS
              </p>
            </div>
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </>
  );
}
export default function LoginPageWrapper() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
