"use client";

import { Suspense } from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as THREE from "three";
import { gsap } from "gsap";
import API from "@/lib/api";
import LoadingScreen from "@/lib/LoadingScreen";
import useBreakpoint from "@/lib/useBreakpoint";

// ── Password strength ─────────────────────────────────────────────────────────
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

// ── Validation ────────────────────────────────────────────────────────────────
function validateUsername(v) {
  const trimmed = (v || "").trim();
  if (!trimmed) return "Username is required";
  if (trimmed.length < 3) return "At least 3 characters required";
  if (trimmed.length > 30) return "Maximum 30 characters";
  if (/\s/.test(v)) return "No spaces allowed in username";
  return null;
}

function validateEmail(v) {
  const trimmed = (v || "").trim();
  if (!trimmed) return "Email address is required";
  // allows dummy emails like x@x.com, foo@bar.io, etc.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{1,}$/.test(trimmed))
    return "Enter a valid email address (e.g. name@example.com)";
  return null;
}

function validatePassword(v, label = "Password") {
  if (!v) return `${label} is required`;
  if (v.length < 6) return `${label} must be at least 6 characters`;
  if (v.length > 128) return `${label} cannot exceed 128 characters`;
  return null;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
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
const CheckIcon = ({ size = 10 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
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
  hint,
  showToggle,
  onToggle,
  showPassword,
  autoComplete,
  maxLength,
  id,
  children,
}) {
  const [focused, setFocused] = useState(false);
  const inputType = showToggle ? (showPassword ? "text" : "password") : type;
  const hasError = !!error;
  const borderColor = hasError
    ? "rgba(248,113,113,0.7)"
    : focused
      ? "#f59e0b"
      : "rgba(255,255,255,0.1)";
  const labelColor = hasError ? "#f87171" : focused ? "#f59e0b" : "#71717a";
  const fieldId = id || label?.toLowerCase().replace(/\s+/g, "-");

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
          htmlFor={fieldId}
          style={{
            fontFamily: "'Syncopate', sans-serif",
            fontSize: 8,
            letterSpacing: "0.3em",
            color: labelColor,
            textTransform: "uppercase",
            transition: "color 0.2s",
            cursor: "pointer",
          }}
        >
          {label}
        </label>
        {hint && (
          <span
            style={{
              fontSize: 10,
              color: "#3f3f46",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {hint}
          </span>
        )}
      </div>
      <div style={{ position: "relative" }}>
        <input
          id={fieldId}
          type={inputType}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          style={{
            width: "100%",
            background: focused ? "rgba(255,255,255,0.03)" : "#0a0a0a",
            padding: showToggle ? "15px 50px 15px 16px" : "15px 16px",
            border: `1px solid ${borderColor}`,
            color: "white",
            fontSize: 16, // 16px prevents iOS zoom
            outline: "none",
            fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.02em",
            transition: "border-color 0.2s, background 0.2s",
            borderRadius: 0,
            WebkitAppearance: "none",
          }}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 48,
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
      {hasError && (
        <p
          role="alert"
          style={{
            fontSize: 11,
            color: "#f87171",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "'DM Mono', monospace",
            lineHeight: 1.5,
          }}
        >
          <span style={{ fontSize: 10, flexShrink: 0 }}>⚠</span> {error}
        </p>
      )}
      {children}
    </div>
  );
}

// ── Strength bar ──────────────────────────────────────────────────────────────
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
        <span
          style={{
            fontFamily: "'Syncopate', sans-serif",
            fontSize: 7,
            letterSpacing: "0.2em",
            color: s.color,
            textTransform: "uppercase",
          }}
        >
          {s.label}
        </span>
        {s.score >= 4 && (
          <span
            style={{
              color: "#4ade80",
              fontSize: 10,
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            <CheckIcon /> Strong password
          </span>
        )}
      </div>
    </div>
  );
}

// ── Requirement row ───────────────────────────────────────────────────────────
function Req({ met, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div
        style={{
          width: 15,
          height: 15,
          borderRadius: "50%",
          background: met ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${met ? "#4ade80" : "rgba(255,255,255,0.1)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.25s",
        }}
      >
        {met && <CheckIcon size={8} />}
      </div>
      <span
        style={{
          fontSize: 11,
          color: met ? "#a1a1aa" : "#3f3f46",
          transition: "color 0.25s",
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {text}
      </span>
    </div>
  );
}

// ── Alert boxes ───────────────────────────────────────────────────────────────
function ErrorBox({ message, action, actionLabel }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      style={{
        padding: "13px 16px",
        background: "rgba(248,113,113,0.06)",
        border: "1px solid rgba(248,113,113,0.2)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flex: 1,
          minWidth: 0,
        }}
      >
        <span style={{ color: "#f87171", fontSize: 13, flexShrink: 0 }}>✕</span>
        <p
          style={{
            fontFamily: "'Syncopate', sans-serif",
            fontSize: 8,
            color: "#f87171",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>
      </div>
      {action && (
        <button
          onClick={action}
          style={{
            fontFamily: "'Syncopate', sans-serif",
            fontSize: 7,
            color: "#f59e0b",
            background: "none",
            border: "1px solid rgba(245,158,11,0.3)",
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
            e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function SuccessBox({ message }) {
  if (!message) return null;
  return (
    <div
      role="status"
      style={{
        padding: "13px 16px",
        background: "rgba(74,222,128,0.05)",
        border: "1px solid rgba(74,222,128,0.18)",
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
          boxShadow: "0 0 8px rgba(74,222,128,0.6)",
        }}
      />
      <p
        style={{
          fontFamily: "'Syncopate', sans-serif",
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
  const isDisabled = loading || disabled;
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      type="button"
      style={{
        width: "100%",
        padding: "18px",
        background: isDisabled ? "#1c1c1e" : bg,
        color: isDisabled ? "#3f3f46" : color,
        fontFamily: "'Syncopate', sans-serif",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        border: isDisabled ? "1px solid rgba(255,255,255,0.05)" : "none",
        cursor: isDisabled ? "not-allowed" : "pointer",
        transition: "all 0.25s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = "#f59e0b";
          e.currentTarget.style.letterSpacing = "0.32em";
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
              border: "2px solid #3f3f46",
              borderTopColor: "#71717a",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.7s linear infinite",
              flexShrink: 0,
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

// ── Main ──────────────────────────────────────────────────────────────────────
function LoginPage() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const [pageReady, setPageReady] = useState(false);
  const [mode, setMode] = useState("login");
  const { isMobile } = useBreakpoint();

  // Session expired
  const searchParams = useSearchParams();
  const [sessionExpired, setSessionExpired] = useState(false);
  useEffect(() => {
    if (searchParams.get("expired") === "true") {
      setSessionExpired(true);
      window.history.replaceState({}, "", "/login");
    }
  }, [searchParams]);

  // ── Form state ──
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [forgotInput, setForgotInput] = useState("");
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotToken, setForgotToken] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmNewPw, setConfirmNewPw] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmNew, setShowConfirmNew] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [apiSuccess, setApiSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginErrType, setLoginErrType] = useState(null);

  const sf = { fontFamily: "'Syncopate', sans-serif" };

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
      opacity: 0.15,
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

  // ── Entry animation ──
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

  // ── Mode switch: clear errors + animate ──
  useEffect(() => {
    setApiError("");
    setApiSuccess("");
    setFieldErrors({});
    setLoginErrType(null);
    if (pageReady) {
      gsap.fromTo(
        ".form-field",
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.38, stagger: 0.055, ease: "expo.out" },
      );
    }
  }, [mode]); // intentionally exclude pageReady to avoid double-fire on mount

  const shake = useCallback(() => {
    gsap.to(".auth-panel", {
      keyframes: [
        { x: -8 },
        { x: 8 },
        { x: -5 },
        { x: 5 },
        { x: -2 },
        { x: 0 },
      ],
      duration: 0.4,
      ease: "power2.out",
    });
  }, []);

  const onEnter = (fn) => (e) => {
    if (e.key === "Enter" && !loading) fn();
  };

  // ── Redirect if already logged in ──
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return; // not logged in — stay on page
    // Only auto-redirect if they landed here without intent (no ?next param)
    const next = new URLSearchParams(window.location.search).get("next");
    if (next) return; // they were sent here for a reason — let them re-auth
    API.get("dashboard/")
      .then((res) => {
        router.replace(res.data.is_staff ? "/barber-dashboard" : "/dashboard");
      })
      .catch(() => {
        // token invalid — clear it and stay on login
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
      });
  }, []);

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
      const dash = await API.get("dashboard/");
      const dest = dash.data.is_staff ? "/barber-dashboard" : "/book";
      gsap.to(".auth-panel", {
        y: -40,
        opacity: 0,
        duration: 0.5,
        ease: "expo.in",
        onComplete: () => router.push(dest),
      });
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
                "Username not found — check spelling or create an account",
            });
          }
        } catch {
          setApiError("Username or password is incorrect.");
        }
      } else if (err.response?.status === 429) {
        setApiError("Too many attempts. Please wait a moment and try again.");
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
    if (!agreedToTerms) errs.terms = "You must agree to the terms to continue";
    return errs;
  };

  const handleRegister = async () => {
    const errs = validateRegister();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      shake();
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
          : String(data.username);
      if (data?.email)
        newErrs.regEmail = Array.isArray(data.email)
          ? data.email[0]
          : String(data.email);
      if (data?.password)
        newErrs.regPw = Array.isArray(data.password)
          ? data.password[0]
          : String(data.password);
      if (Object.keys(newErrs).length) {
        setFieldErrors(newErrs);
      } else
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
    if (!confirmNewPw) errs.confirmNewPw = "Please confirm your new password";
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
    setApiSuccess("");
    setApiError("");
  };

  // ── Render ────────────────────────────────────────────────────────────────
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
          animation: pageIn 0.4s ease forwards;
        }
        @keyframes pageIn {
          to {
            opacity: 1;
          }
        }
        .login-scroll {
          min-height: 100vh;
          min-height: 100dvh;
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
          background: none;
          border: none;
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
        .checkbox-box {
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
          color: #f59e0b;
        }
        .checkbox-box.checked {
          background: rgba(245, 158, 11, 0.12);
          border-color: #f59e0b;
        }
        .checkbox-box:focus-visible {
          outline: 2px solid #f59e0b;
          outline-offset: 2px;
        }
      `}</style>

      <LoadingScreen onComplete={() => setPageReady(true)} />

      {pageReady && (
        <div className="page-root" style={{ position: "relative" }}>
          {/* Three.js canvas */}
          <div
            ref={canvasRef}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
          {/* Noise overlay */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1,
              pointerEvents: "none",
              opacity: 0.025,
              backgroundImage:
                "url('https://grainy-gradients.vercel.app/noise.svg')",
            }}
          />
          {/* Amber glow */}
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
          <nav
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
              background: "rgba(5,5,5,0.88)",
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
          </nav>

          {/* Scroll wrapper */}
          <div
            className="login-scroll"
            style={{
              position: "relative",
              zIndex: 10,
              padding: isMobile ? "76px 16px 48px" : "84px 24px 48px",
            }}
          >
            <div
              className="auth-panel"
              style={{ width: "100%", maxWidth: 460 }}
            >
              {/* Title */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <p
                  style={{
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.5em",
                    color: "#3f3f46",
                    textTransform: "uppercase",
                    marginBottom: 10,
                    marginTop: 0,
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
                    color: "#27272a",
                    fontSize: 12,
                    marginTop: 10,
                    marginBottom: 0,
                    fontFamily: "'DM Mono', monospace",
                    lineHeight: 1.6,
                  }}
                >
                  {mode === "login" && "Access your bookings and account"}
                  {mode === "register" &&
                    "Takes under a minute — no card required"}
                  {mode === "forgot" &&
                    "Verify your account and set a new password"}
                </p>
              </div>

              {/* Session expired */}
              {sessionExpired && (
                <div
                  style={{
                    padding: "11px 14px",
                    background: "rgba(245,158,11,0.05)",
                    border: "1px solid rgba(245,158,11,0.18)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 18,
                    gap: 12,
                  }}
                >
                  <p
                    style={{
                      ...sf,
                      fontSize: 7,
                      color: "#f59e0b",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    Session expired — please sign in again
                  </p>
                  <button
                    onClick={() => setSessionExpired(false)}
                    aria-label="Dismiss"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#3f3f46",
                      cursor: "pointer",
                      fontSize: 14,
                      padding: "2px 4px",
                      lineHeight: 1,
                      flexShrink: 0,
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
                    marginBottom: 24,
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
                      aria-selected={mode === key}
                      style={{
                        flex: 1,
                        padding: "12px 10px",
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
                          color: mode === key ? "white" : "#27272a",
                          transition: "color 0.25s",
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: mode === key ? "#3f3f46" : "#1c1c1e",
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

              {/* Back link for forgot */}
              {mode === "forgot" && (
                <button
                  onClick={resetForgot}
                  style={{
                    ...sf,
                    fontSize: 8,
                    color: "#3f3f46",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    marginBottom: 22,
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
                    (e.currentTarget.style.color = "#3f3f46")
                  }
                >
                  ← Back to Sign In
                </button>
              )}

              {/* Form card */}
              <div
                style={{
                  background: "rgba(255,255,255,0.012)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: isMobile ? "22px 16px" : "30px 26px",
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
                      id="login-username"
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
                      id="login-password"
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
                          ? "Reset →"
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
                        fontSize: 7,
                        color: "#27272a",
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
                          fontSize: 7,
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
                    <Field
                      id="reg-username"
                      label="Username"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      onKeyDown={onEnter(handleRegister)}
                      placeholder="choose_a_username"
                      error={fieldErrors.regName}
                      autoComplete="username"
                      maxLength={30}
                      hint={
                        regName.trim().length > 0
                          ? `${regName.trim().length}/30`
                          : "3–30 chars, no spaces"
                      }
                    >
                      {regName.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 5,
                            marginTop: 6,
                          }}
                        >
                          <Req
                            met={regName.trim().length >= 3}
                            text="At least 3 characters"
                          />
                          <Req met={!/\s/.test(regName)} text="No spaces" />
                          <Req
                            met={regName.trim().length <= 30}
                            text="Under 30 characters"
                          />
                        </div>
                      )}
                    </Field>

                    <Field
                      id="reg-email"
                      label="Email Address"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      onKeyDown={onEnter(handleRegister)}
                      placeholder="you@example.com"
                      error={fieldErrors.regEmail}
                      autoComplete="email"
                      hint="For booking confirmations"
                    />

                    <Field
                      id="reg-password"
                      label="Password"
                      type="password"
                      value={regPw}
                      onChange={(e) => setRegPw(e.target.value)}
                      onKeyDown={onEnter(handleRegister)}
                      placeholder="Min. 6 characters"
                      error={fieldErrors.regPw}
                      showToggle
                      showPassword={showRegPw}
                      onToggle={() => setShowRegPw((p) => !p)}
                      autoComplete="new-password"
                    >
                      <StrengthBar password={regPw} />
                      {regPw.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 5,
                            marginTop: 6,
                          }}
                        >
                          <Req
                            met={regPw.length >= 6}
                            text="At least 6 characters"
                          />
                          <Req
                            met={regPw.length <= 128}
                            text="Under 128 characters"
                          />
                        </div>
                      )}
                    </Field>

                    <Field
                      id="reg-confirm"
                      label="Confirm Password"
                      type="password"
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      onKeyDown={onEnter(handleRegister)}
                      placeholder="••••••••"
                      error={fieldErrors.regConfirm}
                      showToggle
                      showPassword={showConfirm}
                      onToggle={() => setShowConfirm((p) => !p)}
                      autoComplete="new-password"
                    >
                      {regConfirm.length > 0 && regPw.length > 0 && (
                        <div style={{ marginTop: 5 }}>
                          <Req
                            met={regPw === regConfirm}
                            text={
                              regPw === regConfirm
                                ? "Passwords match ✓"
                                : "Passwords don't match yet"
                            }
                          />
                        </div>
                      )}
                    </Field>

                    {/* Terms */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          cursor: "pointer",
                        }}
                        onClick={() => setAgreedToTerms((v) => !v)}
                        role="checkbox"
                        aria-checked={agreedToTerms}
                        tabIndex={0}
                        onKeyDown={(e) =>
                          e.key === " " && setAgreedToTerms((v) => !v)
                        }
                      >
                        <div
                          className={`checkbox-box${agreedToTerms ? " checked" : ""}`}
                          style={{ marginTop: 2 }}
                          aria-hidden="true"
                        >
                          {agreedToTerms && <CheckIcon size={9} />}
                        </div>
                        <p
                          style={{
                            fontSize: 11,
                            color: "#3f3f46",
                            lineHeight: 1.7,
                            margin: 0,
                            fontFamily: "'DM Mono', monospace",
                          }}
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
                            margin: "6px 0 0 27px",
                            fontFamily: "'DM Mono', monospace",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <span style={{ fontSize: 10 }}>⚠</span>{" "}
                          {fieldErrors.terms}
                        </p>
                      )}
                    </div>

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
                        fontSize: 7,
                        color: "#27272a",
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
                          fontSize: 7,
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
                    {/* Step bar */}
                    <div>
                      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
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
                          color: "#3f3f46",
                          textTransform: "uppercase",
                          letterSpacing: "0.25em",
                          margin: 0,
                        }}
                      >
                        Step {forgotStep} of 2 —{" "}
                        {forgotStep === 1
                          ? "Find Your Account"
                          : "Set New Password"}
                      </p>
                    </div>

                    {forgotStep === 1 && (
                      <>
                        <Field
                          id="forgot-input"
                          label="Username or Email"
                          value={forgotInput}
                          onChange={(e) => setForgotInput(e.target.value)}
                          onKeyDown={onEnter(handleForgotLookup)}
                          placeholder="username or email@example.com"
                          error={fieldErrors.forgotInput}
                          autoComplete="username"
                        />
                        <div
                          style={{
                            padding: "11px 14px",
                            background: "rgba(245,158,11,0.03)",
                            border: "1px solid rgba(245,158,11,0.1)",
                          }}
                        >
                          <p
                            style={{
                              fontSize: 11,
                              color: "#52525b",
                              margin: 0,
                              lineHeight: 1.7,
                              fontFamily: "'DM Mono', monospace",
                            }}
                          >
                            Enter your{" "}
                            <span style={{ color: "#a1a1aa" }}>username</span>{" "}
                            or{" "}
                            <span style={{ color: "#a1a1aa" }}>
                              email address
                            </span>
                            . We'll verify your account before allowing a
                            password change.
                          </p>
                        </div>
                        <ErrorBox message={apiError} />
                        <SubmitBtn
                          onClick={handleForgotLookup}
                          loading={loading}
                          label="Find My Account →"
                          loadingLabel="Looking Up..."
                        />
                      </>
                    )}

                    {forgotStep === 2 && (
                      <>
                        <div
                          style={{
                            padding: "11px 14px",
                            background: "rgba(74,222,128,0.04)",
                            border: "1px solid rgba(74,222,128,0.12)",
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
                              color: "#52525b",
                              margin: 0,
                              fontFamily: "'DM Mono', monospace",
                            }}
                          >
                            Account found for{" "}
                            <span style={{ color: "white" }}>
                              {forgotInput}
                            </span>
                          </p>
                        </div>
                        <Field
                          id="new-password"
                          label="New Password"
                          type="password"
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          onKeyDown={onEnter(handlePasswordReset)}
                          placeholder="Min. 6 characters"
                          error={fieldErrors.newPw}
                          showToggle
                          showPassword={showNewPw}
                          onToggle={() => setShowNewPw((p) => !p)}
                          autoComplete="new-password"
                        >
                          <StrengthBar password={newPw} />
                        </Field>
                        <Field
                          id="confirm-new-password"
                          label="Confirm New Password"
                          type="password"
                          value={confirmNewPw}
                          onChange={(e) => setConfirmNewPw(e.target.value)}
                          onKeyDown={onEnter(handlePasswordReset)}
                          placeholder="••••••••"
                          error={fieldErrors.confirmNewPw}
                          showToggle
                          showPassword={showConfirmNew}
                          onToggle={() => setShowConfirmNew((p) => !p)}
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
                        fontSize: 7,
                        color: "#27272a",
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
                          fontSize: 7,
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
                  color: "#1a1a1a",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  userSelect: "none",
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
