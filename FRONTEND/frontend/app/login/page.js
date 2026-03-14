"use client";

import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as THREE from "three";
import { gsap } from "gsap";
import API from "@/lib/api";
import LoadingScreen from "@/lib/LoadingScreen";
import useBreakpoint from "@/lib/useBreakpoint";

// ── Password strength ────────────────────────────────────────────────────────
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

// ── Validation ───────────────────────────────────────────────────────────────
// Username: 3–30 chars, any character except whitespace
function validateUsername(v) {
  if (!v.trim()) return "Username is required";
  if (v.trim().length < 3) return "At least 3 characters";
  if (v.trim().length > 30) return "Max 30 characters";
  if (/\s/.test(v)) return "No spaces allowed";
  return null;
}

// Email: must have @ and a dot after it — allows dummy emails like x@x.com
function validateEmail(v) {
  if (!v.trim()) return "Email is required";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{1,}$/;
  if (!re.test(v.trim())) return "Enter a valid email (e.g. name@example.com)";
  return null;
}

// Password: min 6 chars, any character
function validatePassword(v, label = "Password") {
  if (!v) return `${label} is required`;
  if (v.length < 6) return "Minimum 6 characters";
  if (v.length > 128) return "Max 128 characters";
  return null;
}

// ── Icons ────────────────────────────────────────────────────────────────────
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
const CheckIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Field component ───────────────────────────────────────────────────────────
function Field({
  label,
  type = "text",
  value,
  onChange,
  onKeyDown,
  placeholder,
  error,
  hint,
  showToggle,
  onToggle,
  showPassword,
  autoComplete,
  maxLength,
  children,
}) {
  const [focused, setFocused] = useState(false);
  const inputType = showToggle ? (showPassword ? "text" : "password") : type;
  const sf = { fontFamily: "'Syncopate', sans-serif" };
  const hasError = !!error;
  const borderColor = hasError
    ? "rgba(248,113,113,0.6)"
    : focused
      ? "#f59e0b"
      : "rgba(255,255,255,0.1)";

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
            color: hasError ? "#f87171" : focused ? "#f59e0b" : "#71717a",
            textTransform: "uppercase",
            transition: "color 0.2s",
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          style={{
            width: "100%",
            background: focused ? "rgba(255,255,255,0.03)" : "#0a0a0a",
            padding: showToggle ? "15px 48px 15px 16px" : "15px 16px",
            border: `1px solid ${borderColor}`,
            color: "white",
            fontSize: 16,
            outline: "none",
            fontFamily: "'DM Mono', monospace",
            transition: "border-color 0.2s, background 0.2s",
            borderRadius: 0,
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
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#52525b",
              display: "flex",
              alignItems: "center",
              padding: 4,
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
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          <span style={{ fontSize: 9 }}>⚠</span> {error}
        </p>
      )}
      {children}
    </div>
  );
}

// ── Password strength bar ─────────────────────────────────────────────────────
function StrengthBar({ password }) {
  const s = getStrength(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              background: i <= s.score ? s.color : "rgba(255,255,255,0.07)",
              transition: "background 0.3s",
              borderRadius: 2,
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p
          style={{
            fontFamily: "'Syncopate', sans-serif",
            fontSize: 7,
            letterSpacing: "0.2em",
            color: s.color,
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          {s.label}
        </p>
        {s.score >= 4 && (
          <span
            style={{
              color: "#4ade80",
              fontSize: 10,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <CheckIcon /> Strong password
          </span>
        )}
      </div>
    </div>
  );
}

// ── Alert boxes ───────────────────────────────────────────────────────────────
function ErrorBox({ message, action, actionLabel }) {
  const sf = { fontFamily: "'Syncopate', sans-serif" };
  if (!message) return null;
  return (
    <div
      style={{
        padding: "13px 16px",
        background: "rgba(248,113,113,0.06)",
        border: "1px solid rgba(248,113,113,0.25)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
        <span style={{ color: "#f87171", fontSize: 14, flexShrink: 0 }}>✕</span>
        <p
          style={{
            ...sf,
            fontSize: 8,
            color: "#f87171",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            margin: 0,
          }}
        >
          {message}
        </p>
      </div>
      {action && (
        <button
          onClick={action}
          style={{
            ...sf,
            fontSize: 7,
            color: "#f59e0b",
            background: "none",
            border: "1px solid rgba(245,158,11,0.35)",
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
            e.currentTarget.style.borderColor = "rgba(245,158,11,0.35)";
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
        padding: "13px 16px",
        background: "rgba(74,222,128,0.06)",
        border: "1px solid rgba(74,222,128,0.2)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
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

// ── Submit button ─────────────────────────────────────────────────────────────
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
        background: isDisabled ? "#27272a" : bg,
        color: isDisabled ? "#52525b" : color,
        ...sf,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        border: "none",
        cursor: isDisabled ? "not-allowed" : "pointer",
        transition: "all 0.25s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = "#f59e0b";
          e.currentTarget.style.letterSpacing = "0.3em";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = bg;
          e.currentTarget.style.letterSpacing = "0.25em";
        }
      }}
    >
      {loading ? (
        <>
          <span
            style={{
              width: 13,
              height: 13,
              border: "2px solid #52525b",
              borderTopColor: "#a1a1aa",
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

// ── Requirements checklist (registration) ────────────────────────────────────
function Requirement({ met, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: met ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${met ? "#4ade80" : "rgba(255,255,255,0.1)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.3s",
        }}
      >
        {met && <CheckIcon />}
      </div>
      <span
        style={{
          fontSize: 11,
          color: met ? "#a1a1aa" : "#52525b",
          transition: "color 0.3s",
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {text}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function LoginPage() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const [pageReady, setPageReady] = useState(false);
  const [mode, setMode] = useState("login");

  const searchParams = useSearchParams();
  const [sessionExpired, setSessionExpired] = useState(false);
  useEffect(() => {
    if (searchParams.get("expired") === "true") {
      setSessionExpired(true);
      window.history.replaceState({}, "", "/login");
    }
  }, [searchParams]);

  // Login fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Forgot password fields
  const [forgotInput, setForgotInput] = useState("");
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotToken, setForgotToken] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmNewPw, setConfirmNewPw] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmNew, setShowConfirmNew] = useState(false);

  // State
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [apiSuccess, setApiSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginErrType, setLoginErrType] = useState(null);

  const sf = { fontFamily: "'Syncopate', sans-serif" };
  const { isMobile } = useBreakpoint();

  // ── Three.js background ──
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
    for (let i = 0; i < 1200; i++) {
      verts.push(THREE.MathUtils.randFloatSpread(10));
      verts.push(THREE.MathUtils.randFloatSpread(10));
      verts.push(THREE.MathUtils.randFloatSpread(10));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.005,
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.18,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    camera.position.z = 3;
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      points.rotation.y += 0.0004;
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

  // ── Entry animations ──
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
      duration: 1.2,
      ease: "expo.out",
      delay: 0.1,
    });
  }, [pageReady]);

  // ── Mode switch animations ──
  useEffect(() => {
    setApiError("");
    setApiSuccess("");
    setFieldErrors({});
    setLoginErrType(null);
    if (pageReady)
      gsap.fromTo(
        ".form-field",
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: "expo.out" },
      );
  }, [mode, pageReady]);

  const shake = () =>
    gsap.to(".auth-panel", {
      x: [-8, 8, -6, 6, -3, 3, 0],
      duration: 0.45,
      ease: "power2.out",
    });
  const onEnter = (fn) => (e) => e.key === "Enter" && fn();

  // ── Login ──────────────────────────────────────────────────────────────────
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
      try {
        const dash = await API.get("dashboard/");
        const dest = dash.data.is_staff ? "/barber-dashboard" : "/book";
        gsap.to(".auth-panel", {
          y: -40,
          opacity: 0,
          duration: 0.5,
          ease: "expo.in",
          onComplete: () => router.push(dest),
        });
      } catch {
        gsap.to(".auth-panel", {
          y: -40,
          opacity: 0,
          duration: 0.5,
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

  // ── Register ───────────────────────────────────────────────────────────────
  const validateRegister = () => {
    const errs = {};
    const unErr = validateUsername(regName);
    if (unErr) errs.regName = unErr;
    const emErr = validateEmail(regEmail);
    if (emErr) errs.regEmail = emErr;
    const pwErr = validatePassword(regPw);
    if (pwErr) errs.regPw = pwErr;
    if (!regConfirm) errs.regConfirm = "Please confirm your password";
    else if (regPw !== regConfirm) errs.regConfirm = "Passwords don't match";
    if (!agreedToTerms) errs.terms = "You must agree to continue";
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
      setTimeout(() => router.push("/book"), 1400);
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
          data?.detail ||
            "Registration failed. Please check your info and try again.",
        );
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password ────────────────────────────────────────────────────────
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

  const handlePasswordReset = async () => {
    const errs = {};
    const pwErr = validatePassword(newPw, "New password");
    if (pwErr) errs.newPw = pwErr;
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
      const res = await API.post("token/", {
        username: forgotInput.trim(),
        password: newPw,
      });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      setTimeout(() => router.push("/book"), 1400);
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@400;500&display=swap");
        html,
        body {
          background: #050505 !important;
          margin: 0;
          padding: 0;
          color: white;
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
          animation: pageIn 0.45s ease forwards;
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
          transition: all 0.25s;
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
          transition: transform 0.25s ease;
        }
        .mode-tab.active::after {
          transform: scaleX(1);
        }
        .checkbox-custom {
          width: 18px;
          height: 18px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .checkbox-custom.checked {
          background: rgba(245, 158, 11, 0.15);
          border-color: #f59e0b;
        }
        input[type="checkbox"] {
          display: none;
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
              opacity: 0.03,
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
              width: 600,
              height: 600,
              zIndex: 1,
              pointerEvents: "none",
              background:
                "radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 65%)",
            }}
          />

          {/* Nav */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              padding: "20px 28px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(5,5,5,0.85)",
              backdropFilter: "blur(16px)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <a
              href="/"
              style={{
                ...sf,
                fontSize: 8,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#52525b",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#f59e0b")}
              onMouseLeave={(e) => (e.target.style.color = "#52525b")}
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

          {/* Main */}
          <div
            className="login-scroll"
            style={{
              position: "relative",
              zIndex: 10,
              padding: isMobile ? "72px 16px 40px" : "80px 24px 40px",
            }}
          >
            <div
              className="auth-panel"
              style={{ width: "100%", maxWidth: 480 }}
            >
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <p
                  style={{
                    ...sf,
                    fontSize: 8,
                    letterSpacing: "0.5em",
                    color: "#52525b",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  {mode === "login"
                    ? "Welcome Back"
                    : mode === "register"
                      ? "Join The Roster"
                      : "Account Recovery"}
                </p>
                <h1
                  style={{
                    ...sf,
                    fontSize: "clamp(1.8rem, 6vw, 2.8rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    lineHeight: 0.95,
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
                <p
                  style={{
                    color: "#3f3f46",
                    fontSize: 12,
                    marginTop: 10,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {mode === "login" && "Access your bookings and account"}
                  {mode === "register" &&
                    "Create your account — takes under a minute"}
                  {mode === "forgot" &&
                    "We'll verify your account and let you set a new password"}
                </p>
              </div>

              {/* Session expired banner */}
              {sessionExpired && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                    gap: 12,
                  }}
                >
                  <p
                    style={{
                      ...sf,
                      fontSize: 8,
                      color: "#f59e0b",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      margin: 0,
                    }}
                  >
                    Session expired — please sign in again
                  </p>
                  <button
                    onClick={() => setSessionExpired(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#52525b",
                      cursor: "pointer",
                      fontSize: 14,
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Mode tabs */}
              {mode !== "forgot" && (
                <div
                  style={{
                    display: "flex",
                    marginBottom: 28,
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
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
                        padding: "13px 12px",
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
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: mode === key ? "white" : "#3f3f46",
                          transition: "color 0.25s",
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: mode === key ? "#52525b" : "#27272a",
                          marginTop: 2,
                          transition: "color 0.25s",
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        {sub}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Back button for forgot */}
              {mode === "forgot" && (
                <button
                  onClick={resetForgot}
                  style={{
                    ...sf,
                    fontSize: 8,
                    color: "#52525b",
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
                    (e.currentTarget.style.color = "#52525b")
                  }
                >
                  ← Back to Sign In
                </button>
              )}

              {/* Form panel */}
              <div
                style={{
                  background: "rgba(255,255,255,0.015)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: isMobile ? "24px 18px" : "32px 28px",
                }}
              >
                {/* ── LOGIN ── */}
                {mode === "login" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 18,
                    }}
                  >
                    <Field
                      label="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={onEnter(handleLogin)}
                      placeholder="your_username"
                      error={fieldErrors.username}
                      autoComplete="username"
                      maxLength={30}
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
                      autoComplete="current-password"
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
                        color: "#3f3f46",
                        letterSpacing: "0.15em",
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
                          letterSpacing: "0.15em",
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

                {/* ── REGISTER ── */}
                {mode === "register" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 18,
                    }}
                  >
                    {/* Username */}
                    <Field
                      label="Username"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      onKeyDown={onEnter(handleRegister)}
                      placeholder="your_username"
                      error={fieldErrors.regName}
                      autoComplete="username"
                      maxLength={30}
                      hint={
                        regName.trim().length > 0
                          ? `${regName.trim().length}/30`
                          : "3–30 chars"
                      }
                    >
                      {/* Live requirements */}
                      {regName.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            marginTop: 4,
                          }}
                        >
                          <Requirement
                            met={regName.trim().length >= 3}
                            text="At least 3 characters"
                          />
                          <Requirement
                            met={!/\s/.test(regName)}
                            text="No spaces"
                          />
                          <Requirement
                            met={regName.trim().length <= 30}
                            text="Under 30 characters"
                          />
                        </div>
                      )}
                    </Field>

                    {/* Email */}
                    <Field
                      label="Email Address"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      onKeyDown={onEnter(handleRegister)}
                      placeholder="you@example.com"
                      error={fieldErrors.regEmail}
                      autoComplete="email"
                      hint="Used for booking confirmations"
                    />

                    {/* Password */}
                    <Field
                      label="Password"
                      type="password"
                      value={regPw}
                      onChange={(e) => setRegPw(e.target.value)}
                      onKeyDown={onEnter(handleRegister)}
                      placeholder="Min. 6 characters"
                      error={fieldErrors.regPw}
                      showToggle
                      showPassword={showRegPw}
                      onToggle={() => setShowRegPw(!showRegPw)}
                      autoComplete="new-password"
                    >
                      <StrengthBar password={regPw} />
                      {regPw.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            marginTop: 6,
                          }}
                        >
                          <Requirement
                            met={regPw.length >= 6}
                            text="At least 6 characters"
                          />
                          <Requirement
                            met={regPw.length <= 128}
                            text="Under 128 characters"
                          />
                        </div>
                      )}
                    </Field>

                    {/* Confirm password */}
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
                      autoComplete="new-password"
                    >
                      {regConfirm.length > 0 && regPw.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <Requirement
                            met={regPw === regConfirm}
                            text={
                              regPw === regConfirm
                                ? "Passwords match"
                                : "Passwords don't match yet"
                            }
                          />
                        </div>
                      )}
                    </Field>

                    {/* Terms */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <div
                        className={`checkbox-custom${agreedToTerms ? " checked" : ""}`}
                        onClick={() => setAgreedToTerms(!agreedToTerms)}
                        style={{ marginTop: 2 }}
                      >
                        {agreedToTerms && <CheckIcon />}
                      </div>
                      <p
                        style={{
                          fontSize: 11,
                          color: "#52525b",
                          lineHeight: 1.7,
                          margin: 0,
                          fontFamily: "'DM Mono', monospace",
                          cursor: "pointer",
                        }}
                        onClick={() => setAgreedToTerms(!agreedToTerms)}
                      >
                        I agree to the{" "}
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: "#f59e0b",
                            textDecoration: "underline",
                          }}
                        >
                          Terms of Service & Privacy Policy
                        </a>{" "}
                        and consent to receiving booking confirmation emails.
                      </p>
                    </div>
                    {fieldErrors.terms && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "#f87171",
                          margin: "0",
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        ⚠ {fieldErrors.terms}
                      </p>
                    )}

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
                        color: "#3f3f46",
                        letterSpacing: "0.15em",
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
                          letterSpacing: "0.15em",
                          textDecoration: "underline",
                          textTransform: "uppercase",
                          padding: 0,
                        }}
                      >
                        Sign In
                      </button>
                    </p>
                  </div>
                )}

                {/* ── FORGOT PASSWORD ── */}
                {mode === "forgot" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 18,
                    }}
                  >
                    {/* Step indicator */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {[1, 2].map((n) => (
                        <div
                          key={n}
                          style={{
                            flex: 1,
                            height: 2,
                            background:
                              forgotStep >= n
                                ? "#f59e0b"
                                : "rgba(255,255,255,0.07)",
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
                          value={forgotInput}
                          onChange={(e) => setForgotInput(e.target.value)}
                          onKeyDown={onEnter(handleForgotLookup)}
                          placeholder="your_username or you@example.com"
                          error={fieldErrors.forgotInput}
                          autoComplete="username"
                        />
                        <div
                          style={{
                            padding: "12px 14px",
                            background: "rgba(245,158,11,0.04)",
                            border: "1px solid rgba(245,158,11,0.12)",
                          }}
                        >
                          <p
                            style={{
                              fontSize: 11,
                              color: "#71717a",
                              margin: 0,
                              lineHeight: 1.7,
                              fontFamily: "'DM Mono', monospace",
                            }}
                          >
                            Enter your{" "}
                            <span style={{ color: "white" }}>username</span> or{" "}
                            <span style={{ color: "white" }}>email</span>. We'll
                            verify your account so you can set a new password.
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
                            padding: "12px 14px",
                            background: "rgba(74,222,128,0.04)",
                            border: "1px solid rgba(74,222,128,0.15)",
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
                              color: "#71717a",
                              margin: 0,
                              fontFamily: "'DM Mono', monospace",
                            }}
                          >
                            Account verified for{" "}
                            <span style={{ color: "white", fontWeight: 700 }}>
                              {forgotInput}
                            </span>
                          </p>
                        </div>
                        <Field
                          label="New Password"
                          type="password"
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          onKeyDown={onEnter(handlePasswordReset)}
                          placeholder="Min. 6 characters"
                          error={fieldErrors.newPw}
                          showToggle
                          showPassword={showNewPw}
                          onToggle={() => setShowNewPw(!showNewPw)}
                          autoComplete="new-password"
                        >
                          <StrengthBar password={newPw} />
                        </Field>
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
                          autoComplete="new-password"
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
                        color: "#3f3f46",
                        letterSpacing: "0.15em",
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
                          letterSpacing: "0.15em",
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
                  color: "#1c1c1c",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                }}
              >
                HEADZ UP BARBERSHOP · HATTIESBURG, MS
              </p>
            </div>
          </div>
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
