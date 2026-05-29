"use client";
export const dynamic = "force-dynamic";
import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import API from "@/lib/api";
import { useTheme } from "@/components/ThemeProvider";
import { useTheme, ThemeToggle } from "@/components/ThemeProvider";

// ── Design tokens ──────────────────────────────────────────────────────────────
let C = {
  bg:"#070709", glass:"rgba(255,255,255,0.04)", glassB:"rgba(255,255,255,0.07)",
  border:"rgba(255,255,255,0.08)", borderB:"rgba(255,255,255,0.15)",
  amber:"#f59e0b", amberL:"#fbbf24", amberD:"#d97706",
  amberDim:"rgba(245,158,11,0.10)", amberGlow:"rgba(245,158,11,0.18)", amberBorder:"rgba(245,158,11,0.35)",
  red:"#ef4444", redDim:"rgba(239,68,68,0.10)",
  green:"#22c55e", greenDim:"rgba(34,197,94,0.10)",
  text:"#f1f0ee", sub:"#9ca3af", muted:"#4b5563",
};
const SF   = { fontFamily:"'Syncopate',sans-serif" };
const MONO = { fontFamily:"'DM Mono',monospace" };

// ── Reusable input ─────────────────────────────────────────────────────────────
function Field({ label, type="text", value, onChange, placeholder, error, autoComplete, right }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ ...MONO, fontSize:9, color:focused?C.amber:C.muted, letterSpacing:"0.3em",
        textTransform:"uppercase", display:"block", marginBottom:6, transition:"color 0.2s" }}>
        {label}
      </label>
      <div style={{ position:"relative" }}>
        <input type={type} value={value} onChange={onChange}
          placeholder={placeholder} autoComplete={autoComplete}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{ width:"100%", padding:"12px 16px", paddingRight:right?44:16,
            background:C.inputBg||"rgba(255,255,255,0.05)", backdropFilter:"blur(10px)",
            WebkitBackdropFilter:"blur(10px)",
            border:`1px solid ${error?C.red:focused?C.amberBorder:C.border}`,
            borderRadius:12, color:C.text, ...MONO, fontSize:13, outline:"none",
            transition:"all 0.2s",
            boxShadow: focused?`0 0 0 3px ${C.amberDim}`:"none" }}/>
        {right && <div style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)" }}>{right}</div>}
      </div>
      {error && <p style={{ ...MONO, fontSize:10, color:C.red, marginTop:5 }}>{error}</p>}
    </div>
  );
}

// ── Ambient background ─────────────────────────────────────────────────────────
function AmbientBg() {
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
      {/* Glow orbs */}
      <div style={{ position:"absolute", top:"-20%", left:"-10%", width:"50vw", height:"50vw",
        borderRadius:"50%", background:"radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)",
        filter:"blur(40px)" }}/>
      <div style={{ position:"absolute", bottom:"-20%", right:"-10%", width:"45vw", height:"45vw",
        borderRadius:"50%", background:"radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 70%)",
        filter:"blur(40px)" }}/>
      <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        width:"30vw", height:"30vw", borderRadius:"50%",
        background:"radial-gradient(circle, rgba(245,158,11,0.03) 0%, transparent 70%)",
        filter:"blur(60px)" }}/>
      {/* Grid */}
      <div style={{ position:"absolute", inset:0,
        backgroundImage:"linear-gradient(rgba(245,158,11,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.025) 1px, transparent 1px)",
        backgroundSize:"48px 48px" }}/>
      {/* Scanlines */}
      <div style={{ position:"absolute", inset:0,
        backgroundImage:"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)" }}/>
    </div>
  );
}

// ── Main login content ─────────────────────────────────────────────────────────
function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { theme: T, isDark } = useTheme();
  const { theme: T, isDark } = useTheme();
  // All C.xxx refs use current theme
  C = T;

  const [mode,     setMode]     = useState("login"); // login | register | forgot
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [expired,  setExpired]  = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Login
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Register
  const [regUser,  setRegUser]  = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass,  setRegPass]  = useState("");
  const [regPass2, setRegPass2] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [regSecQ,  setRegSecQ]  = useState("");
  const [regSecA,  setRegSecA]  = useState("");
  const [secQuestions, setSecQuestions] = useState([]);

  // Forgot
  const [recStep,    setRecStep]    = useState(1);
  const [recUser,    setRecUser]    = useState("");
  const [recQ,       setRecQ]       = useState("");
  const [recA,       setRecA]       = useState("");
  const [recToken,   setRecToken]   = useState("");
  const [recNewPass, setRecNewPass] = useState("");
  const [recEmail,   setRecEmail]   = useState("");
  const [recMethod,  setRecMethod]  = useState("question");

  useEffect(() => {
    if (searchParams.get("expired") === "true") setExpired(true);
    if (searchParams.get("mode") === "register") setMode("register");
    API.get("security-questions/").then(r => setSecQuestions(r.data || [])).catch(() => {});
  }, [searchParams]);

  const switchMode = (m) => {
    setMode(m); setError(""); setSuccess(""); setFieldErrors({});
  };

  // ── Login handler ──
  const handleLogin = async () => {
    setError(""); setFieldErrors({});
    const errs = {};
    if (!loginUser.trim()) errs.loginUser = "Username required";
    if (!loginPass)        errs.loginPass = "Password required";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setLoading(true);
    try {
      const r = await API.post("token/", { username:loginUser.trim(), password:loginPass });
      localStorage.setItem("access",  r.data.access);
      localStorage.setItem("refresh", r.data.refresh);
      const dash = await API.get("dashboard/");
      router.replace(dash.data.is_staff ? "/barber-dashboard" : "/dashboard");
    } catch(e) {
      setError(e?.response?.data?.detail || "Invalid username or password");
    } finally { setLoading(false); }
  };

  // ── Register handler ──
  const handleRegister = async () => {
    setError(""); setFieldErrors({});
    const errs = {};
    if (!regUser.trim())   errs.regUser  = "Username required";
    if (!regEmail.trim())  errs.regEmail = "Email required";
    if (!regPass)          errs.regPass  = "Password required";
    if (regPass.length < 8) errs.regPass = "Min 8 characters";
    if (regPass !== regPass2) errs.regPass2 = "Passwords don't match";
    const rawPhone = regPhone.trim().replace(/\D/g,"");
    if (!rawPhone)          errs.regPhone = "Phone required for reminders";
    else if (rawPhone.length < 10) errs.regPhone = "Enter a valid 10-digit number";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    const normPhone = rawPhone.length === 10 ? `+1${rawPhone}` : `+${rawPhone}`;
    setLoading(true);
    try {
      await API.post("register/", { username:regUser.trim(), email:regEmail.trim(), password:regPass, phone:normPhone });
      if (regSecQ && regSecA.trim()) {
        const r2 = await API.post("token/", { username:regUser.trim(), password:regPass });
        localStorage.setItem("access",  r2.data.access);
        localStorage.setItem("refresh", r2.data.refresh);
        await API.post("security-question/set/", { question_id:regSecQ, answer:regSecA.trim() }).catch(()=>{});
        router.replace("/dashboard");
      } else {
        const r2 = await API.post("token/", { username:regUser.trim(), password:regPass });
        localStorage.setItem("access",  r2.data.access);
        localStorage.setItem("refresh", r2.data.refresh);
        router.replace("/dashboard");
      }
    } catch(e) {
      const data = e?.response?.data;
      if (data?.username) setError(data.username[0]);
      else if (data?.email) setError(data.email[0]);
      else setError(data?.error || data?.detail || "Registration failed. Try again.");
    } finally { setLoading(false); }
  };

  // ── Forgot password ──
  const handleForgotStep1 = async () => {
    setError(""); setLoading(true);
    try {
      if (recMethod === "question") {
        const r = await API.post("recovery/step1-by-question/", { username:recUser.trim() });
        setRecQ(r.data.question || ""); setRecStep(2);
      } else {
        await API.post("recovery/step1/", { username:recUser.trim() });
        setRecStep(2);
      }
    } catch(e) { setError(e?.response?.data?.error || "User not found"); }
    finally { setLoading(false); }
  };

  const handleForgotStep2 = async () => {
    setError(""); setLoading(true);
    try {
      if (recMethod === "question") {
        const r = await API.post("recovery/step2/", { username:recUser.trim(), answer:recA.trim() });
        setRecToken(r.data.token || ""); setRecStep(3);
      } else {
        await API.post("recovery/step2/", { username:recUser.trim(), email:recEmail.trim() });
        setRecStep(3);
      }
    } catch(e) { setError(e?.response?.data?.error || "Incorrect answer"); }
    finally { setLoading(false); }
  };

  const handleForgotStep3 = async () => {
    setError(""); setLoading(true);
    try {
      await API.post("recovery/step3/", { token:recToken, new_password:recNewPass });
      setSuccess("Password updated! You can now log in.");
      switchMode("login");
    } catch(e) { setError(e?.response?.data?.error || "Could not reset password"); }
    finally { setLoading(false); }
  };

  const eyeBtn = (show, setShow) => (
    <button type="button" onClick={()=>setShow(s=>!s)}
      style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:16, padding:0, lineHeight:1 }}>
      {show?"🙈":"👁"}
    </button>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"24px 20px", position:"relative" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.bg};color:${T.text};}
        input,button,select,textarea{font-family:inherit;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        input::placeholder{color:${T.placeholder||T.muted}!important;opacity:1!important;}
        input,textarea,select{background:${T.inputBg||T.surface}!important;color:${T.text}!important;}
        select option{background:${T.bg};color:${T.text};}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        .card-enter{animation:fadeUp 0.4s cubic-bezier(0.4,0,0.2,1) both;}
        ::selection{background:rgba(245,158,11,0.3);}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:rgba(245,158,11,0.2);border-radius:4px;}
      `}</style>

      <AmbientBg/>

      {/* ── Home button ── */}
      <div style={{ position:"fixed", top:16, left:16, zIndex:10 }}>
        <a href="/"
          style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
            background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)",
            WebkitBackdropFilter:"blur(20px)",
            border:"1px solid rgba(255,255,255,0.08)", borderRadius:10,
            color:C.muted, ...MONO, fontSize:10, textDecoration:"none",
            transition:"all 0.2s", letterSpacing:"0.08em" }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.amberBorder;e.currentTarget.style.color=C.amber;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.color=C.muted;}}>
          ← Home
        </a>
      </div>

      {/* Logo */}
      <div style={{ position:"relative", zIndex:1, textAlign:"center", marginBottom:32 }}>
        <img src="/logo1.jpg" alt="HEADZ UP" style={{ height:48, objectFit:"contain", marginBottom:12 }}/>
        <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
          <div style={{ flex:1, height:1, background:`linear-gradient(to right, transparent, ${C.amberBorder})`, maxWidth:60 }}/>
          <p style={{ ...MONO, fontSize:9, color:"rgba(245,158,11,0.4)", letterSpacing:"0.5em", textTransform:"uppercase" }}>
            {mode==="register" ? "Create Account" : mode==="forgot" ? "Recovery" : "Welcome Back"}
          </p>
          <div style={{ flex:1, height:1, background:`linear-gradient(to left, transparent, ${C.amberBorder})`, maxWidth:60 }}/>
        </div>
      </div>

      {/* Card */}
      <div className="card-enter" style={{ position:"relative", zIndex:1, width:"100%", maxWidth:420 }}>

        {/* Gradient border effect */}
        <div style={{ position:"absolute", inset:-1, borderRadius:21,
          background:isDark
            ?"linear-gradient(135deg, rgba(245,158,11,0.3), rgba(239,68,68,0.1), rgba(245,158,11,0.1))"
            :"linear-gradient(135deg, rgba(217,119,6,0.5), rgba(220,38,38,0.2), rgba(217,119,6,0.3))",
          zIndex:-1 }}/>

        <div style={{ background:isDark?"rgba(10,10,12,0.85)":C.cardBg, backdropFilter:"blur(40px)",
          WebkitBackdropFilter:"blur(40px)", borderRadius:20, overflow:"hidden",
          boxShadow:C.cardShadow }}>

          {/* Top accent */}
          <div style={{ height:3, background:"linear-gradient(to right, #ef4444, #f59e0b, #fbbf24)" }}/>

          <div style={{ padding:"28px 28px 32px" }}>

            {/* Mode tabs */}
            {mode !== "forgot" && (
              <div style={{ display:"flex", gap:4, marginBottom:28, padding:4,
                background:"rgba(255,255,255,0.03)", borderRadius:12, border:`1px solid ${C.border}` }}>
                {[["login","Sign In"],["register","Sign Up"]].map(([m,label])=>(
                  <button key={m} onClick={()=>switchMode(m)}
                    style={{ flex:1, padding:"9px 0", borderRadius:9,
                      background:mode===m?C.amberDim:"transparent",
                      border:mode===m?`1px solid ${C.amberBorder}`:"1px solid transparent",
                      color:mode===m?C.amber:C.muted, ...MONO, fontSize:10,
                      letterSpacing:"0.15em", textTransform:"uppercase", cursor:"pointer",
                      transition:"all 0.2s",
                      boxShadow:mode===m?"0 2px 12px rgba(245,158,11,0.12)":"none" }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Expired banner */}
            {expired && mode==="login" && (
              <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(245,158,11,0.06)",
                border:`1px solid rgba(245,158,11,0.2)`, marginBottom:16 }}>
                <p style={{ ...MONO, fontSize:11, color:C.amber }}>⏱ Session expired — please sign in again</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div style={{ padding:"10px 14px", borderRadius:10, background:C.greenDim,
                border:`1px solid rgba(34,197,94,0.3)`, marginBottom:16 }}>
                <p style={{ ...MONO, fontSize:11, color:C.green }}>✓ {success}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ padding:"10px 14px", borderRadius:10, background:C.redDim,
                border:`1px solid rgba(239,68,68,0.3)`, marginBottom:16 }}>
                <p style={{ ...MONO, fontSize:11, color:C.red }}>⚠ {error}</p>
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            {mode==="login" && (
              <div>
                <Field label="Username" value={loginUser} onChange={e=>setLoginUser(e.target.value)}
                  placeholder="your_username" autoComplete="username" error={fieldErrors.loginUser}/>
                <Field label="Password" type={showLoginPw?"text":"password"} value={loginPass}
                  onChange={e=>setLoginPass(e.target.value)} placeholder="••••••••"
                  autoComplete="current-password" error={fieldErrors.loginPass}
                  right={eyeBtn(showLoginPw, setShowLoginPw)}/>

                <button onClick={()=>switchMode("forgot")}
                  style={{ background:"none", border:"none", color:C.muted, ...MONO,
                    fontSize:10, cursor:"pointer", marginBottom:20, padding:0,
                    textDecoration:"underline", textDecorationStyle:"dotted" }}>
                  Forgot password?
                </button>

                <button disabled={loading} onClick={handleLogin}
                  style={{ width:"100%", padding:"14px",
                    background:loading?"rgba(245,158,11,0.1)":"linear-gradient(135deg, #f59e0b, #d97706)",
                    border:"none", borderRadius:12, color:loading?"rgba(245,158,11,0.5)":"#000",
                    ...SF, fontSize:9, fontWeight:700, textTransform:"uppercase",
                    letterSpacing:"0.2em", cursor:loading?"not-allowed":"pointer",
                    boxShadow:loading?"none":"0 4px 24px rgba(245,158,11,0.35)",
                    transition:"all 0.2s" }}>
                  {loading ? (
                    <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      <span style={{ width:14, height:14, border:"2px solid rgba(245,158,11,0.3)",
                        borderTopColor:C.amber, borderRadius:"50%", animation:"spin 0.7s linear infinite",
                        display:"inline-block" }}/>
                      Signing In...
                    </span>
                  ) : "Sign In →"}
                </button>

                <div style={{ textAlign:"center", marginTop:20 }}>
                  <p style={{ ...MONO, fontSize:10, color:C.muted }}>
                    New client?{" "}
                    <button onClick={()=>switchMode("register")}
                      style={{ background:"none", border:"none", color:C.amber, cursor:"pointer",
                        ...MONO, fontSize:10, padding:0 }}>
                      Create an account
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* ── REGISTER FORM ── */}
            {mode==="register" && (
              <div>
                <Field label="Username" value={regUser} onChange={e=>setRegUser(e.target.value)}
                  placeholder="choose_a_username" autoComplete="username" error={fieldErrors.regUser}/>
                <Field label="Email" type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)}
                  placeholder="you@email.com" autoComplete="email" error={fieldErrors.regEmail}/>
                <Field label="Phone Number *" type="tel" value={regPhone} onChange={e=>setRegPhone(e.target.value)}
                  placeholder="(601) 555-0100" autoComplete="tel" error={fieldErrors.regPhone}/>
                <p style={{ ...MONO, fontSize:9, color:C.muted, marginTop:-8, marginBottom:14, letterSpacing:"0.05em" }}>
                  Required for booking reminders & SMS notifications
                </p>
                <Field label="Password" type={showRegPw?"text":"password"} value={regPass}
                  onChange={e=>setRegPass(e.target.value)} placeholder="Min 8 characters"
                  autoComplete="new-password" error={fieldErrors.regPass}
                  right={eyeBtn(showRegPw, setShowRegPw)}/>
                <Field label="Confirm Password" type={showRegPw?"text":"password"} value={regPass2}
                  onChange={e=>setRegPass2(e.target.value)} placeholder="Repeat password"
                  autoComplete="new-password" error={fieldErrors.regPass2}/>

                {/* Security question — optional */}
                {secQuestions.length > 0 && (
                  <div style={{ padding:"14px", borderRadius:12, background:"rgba(255,255,255,0.03)",
                    border:`1px solid ${C.border}`, marginBottom:14 }}>
                    <p style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.25em",
                      textTransform:"uppercase", marginBottom:10 }}>Security Question (optional)</p>
                    <div style={{ marginBottom:10 }}>
                      <select value={regSecQ} onChange={e=>setRegSecQ(e.target.value)}
                        style={{ width:"100%", padding:"10px 12px", background:"rgba(255,255,255,0.04)",
                          border:`1px solid ${C.border}`, borderRadius:10, color:regSecQ?C.text:C.muted,
                          ...MONO, fontSize:12, outline:"none" }}>
                        <option value="">Select a question...</option>
                        {secQuestions.map(q=>(
                          <option key={q.id} value={q.id}>{q.question}</option>
                        ))}
                      </select>
                    </div>
                    {regSecQ && (
                      <input value={regSecA} onChange={e=>setRegSecA(e.target.value)}
                        placeholder="Your answer"
                        style={{ width:"100%", padding:"10px 12px", background:"rgba(255,255,255,0.04)",
                          border:`1px solid ${C.border}`, borderRadius:10, color:C.text,
                          ...MONO, fontSize:12, outline:"none" }}/>
                    )}
                  </div>
                )}

                <button disabled={loading} onClick={handleRegister}
                  style={{ width:"100%", padding:"14px",
                    background:loading?"rgba(245,158,11,0.1)":"linear-gradient(135deg, #f59e0b, #d97706)",
                    border:"none", borderRadius:12, color:loading?"rgba(245,158,11,0.5)":"#000",
                    ...SF, fontSize:9, fontWeight:700, textTransform:"uppercase",
                    letterSpacing:"0.2em", cursor:loading?"not-allowed":"pointer",
                    boxShadow:loading?"none":"0 4px 24px rgba(245,158,11,0.35)",
                    transition:"all 0.2s", marginBottom:16 }}>
                  {loading ? (
                    <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      <span style={{ width:14, height:14, border:"2px solid rgba(245,158,11,0.3)",
                        borderTopColor:C.amber, borderRadius:"50%", animation:"spin 0.7s linear infinite",
                        display:"inline-block" }}/>
                      Creating Account...
                    </span>
                  ) : "Create Account →"}
                </button>

                <p style={{ ...MONO, fontSize:9, color:C.muted, textAlign:"center", lineHeight:1.7 }}>
                  By signing up you agree to receive SMS reminders.{" "}
                  <a href="/sms-optin" style={{ color:C.amber, textDecoration:"none" }}>Learn more</a>
                </p>
              </div>
            )}

            {/* ── FORGOT PASSWORD ── */}
            {mode==="forgot" && (
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                  <button onClick={()=>switchMode("login")}
                    style={{ background:"none", border:"none", color:C.muted, cursor:"pointer",
                      fontSize:18, padding:0, lineHeight:1 }}>←</button>
                  <div>
                    <p style={{ ...SF, fontSize:11, fontWeight:700, textTransform:"uppercase",
                      letterSpacing:"-0.02em" }}>Password Recovery</p>
                    <p style={{ ...MONO, fontSize:10, color:C.muted }}>Step {recStep} of 3</p>
                  </div>
                </div>

                {/* Step progress */}
                <div style={{ display:"flex", gap:4, marginBottom:24 }}>
                  {[1,2,3].map(i=>(
                    <div key={i} style={{ flex:1, height:3, borderRadius:2,
                      background:i<=recStep?"linear-gradient(to right,#f59e0b,#d97706)":"rgba(255,255,255,0.08)",
                      transition:"background 0.3s" }}/>
                  ))}
                </div>

                {recStep===1 && (
                  <div>
                    <Field label="Username" value={recUser} onChange={e=>setRecUser(e.target.value)}
                      placeholder="your_username"/>
                    <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                      {[["question","Security Q"],["email","Email"]].map(([m,label])=>(
                        <button key={m} onClick={()=>setRecMethod(m)}
                          style={{ flex:1, padding:"9px", borderRadius:10,
                            background:recMethod===m?C.amberDim:"rgba(255,255,255,0.03)",
                            border:`1px solid ${recMethod===m?C.amberBorder:C.border}`,
                            color:recMethod===m?C.amber:C.muted, ...MONO, fontSize:10, cursor:"pointer" }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <button disabled={loading} onClick={handleForgotStep1}
                      style={{ width:"100%", padding:"13px",
                        background:"linear-gradient(135deg,#f59e0b,#d97706)", border:"none",
                        borderRadius:12, color:"#000", ...SF, fontSize:9, fontWeight:700,
                        textTransform:"uppercase", letterSpacing:"0.2em", cursor:"pointer",
                        boxShadow:"0 4px 20px rgba(245,158,11,0.3)", opacity:loading?0.7:1 }}>
                      Continue →
                    </button>
                  </div>
                )}

                {recStep===2 && (
                  <div>
                    {recMethod==="question" ? (
                      <>
                        <p style={{ ...MONO, fontSize:12, color:C.sub, marginBottom:14, lineHeight:1.7 }}>
                          {recQ}
                        </p>
                        <Field label="Your Answer" value={recA} onChange={e=>setRecA(e.target.value)}
                          placeholder="Your answer"/>
                      </>
                    ) : (
                      <Field label="Email Address" type="email" value={recEmail}
                        onChange={e=>setRecEmail(e.target.value)}
                        placeholder="you@email.com"/>
                    )}
                    <button disabled={loading} onClick={handleForgotStep2}
                      style={{ width:"100%", padding:"13px",
                        background:"linear-gradient(135deg,#f59e0b,#d97706)", border:"none",
                        borderRadius:12, color:"#000", ...SF, fontSize:9, fontWeight:700,
                        textTransform:"uppercase", letterSpacing:"0.2em", cursor:"pointer",
                        boxShadow:"0 4px 20px rgba(245,158,11,0.3)", opacity:loading?0.7:1 }}>
                      Verify →
                    </button>
                  </div>
                )}

                {recStep===3 && (
                  <div>
                    <Field label="New Password" type="password" value={recNewPass}
                      onChange={e=>setRecNewPass(e.target.value)}
                      placeholder="Min 8 characters"/>
                    <button disabled={loading} onClick={handleForgotStep3}
                      style={{ width:"100%", padding:"13px",
                        background:"linear-gradient(135deg,#f59e0b,#d97706)", border:"none",
                        borderRadius:12, color:"#000", ...SF, fontSize:9, fontWeight:700,
                        textTransform:"uppercase", letterSpacing:"0.2em", cursor:"pointer",
                        boxShadow:"0 4px 20px rgba(245,158,11,0.3)", opacity:loading?0.7:1 }}>
                      Reset Password →
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Bottom bar */}
          <div style={{ padding:"14px 28px", borderTop:`1px solid ${C.border}`,
            background:isDark?"rgba(0,0,0,0.2)":"rgba(0,0,0,0.04)",
            display:"flex", justifyContent:"space-between",
            alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <p style={{ ...MONO, fontSize:9, color:C.muted }}>✂️ HEADZ UP Barbershop</p>
            <a href="/terms" style={{ ...MONO, fontSize:9, color:C.muted, textDecoration:"none",
              letterSpacing:"0.1em" }}>Terms & Privacy</a>
          </div>
        </div>
      </div>

      {/* Bottom links */}
      <div style={{ position:"relative", zIndex:1, marginTop:16, display:"flex",
        gap:10, justifyContent:"center", flexWrap:"wrap" }}>
        <a href="/barber-login"
          style={{ ...MONO, fontSize:10, color:C.muted, textDecoration:"none",
            padding:"8px 16px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)",
            background:"rgba(255,255,255,0.02)", transition:"all 0.2s", display:"inline-block" }}
          onMouseEnter={e=>{e.currentTarget.style.color=C.amber;e.currentTarget.style.borderColor=C.amberBorder;}}
          onMouseLeave={e=>{e.currentTarget.style.color=C.muted;e.currentTarget.style.borderColor="rgba(255,255,255,0.06)";}}>
          ✂️ Barber login →
        </a>
        <a href="/"
          style={{ ...MONO, fontSize:10, color:C.muted, textDecoration:"none",
            padding:"8px 16px", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)",
            background:"rgba(255,255,255,0.02)", transition:"all 0.2s", display:"inline-block" }}
          onMouseEnter={e=>{e.currentTarget.style.color=C.amber;e.currentTarget.style.borderColor=C.amberBorder;}}
          onMouseLeave={e=>{e.currentTarget.style.color=C.muted;e.currentTarget.style.borderColor="rgba(255,255,255,0.06)";}}>
          ← Back to headzupp.com
        </a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"#070709", display:"flex",
        alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:18, height:18, border:"1.5px solid rgba(245,158,11,0.2)",
          borderTopColor:"#f59e0b", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}body{background:#070709;margin:0}`}</style>
      </div>
    }>
      <LoginContent/>
    </Suspense>
  );
}
