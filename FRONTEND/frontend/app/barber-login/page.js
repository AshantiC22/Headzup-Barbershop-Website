"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

// ── Input field ────────────────────────────────────────────────────────────────
function Field({ label, type="text", value, onChange, placeholder, error, autoComplete, right, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ ...MONO, fontSize:9, color:focused?C.amber:C.muted,
        letterSpacing:"0.3em", textTransform:"uppercase", display:"block",
        marginBottom:6, transition:"color 0.2s" }}>
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
            boxShadow:focused?`0 0 0 3px rgba(245,158,11,0.08)`:"none" }}/>
        {right && <div style={{ position:"absolute", right:14, top:"50%",
          transform:"translateY(-50%)" }}>{right}</div>}
      </div>
      {hint && !error && <p style={{ ...MONO, fontSize:9, color:C.muted, marginTop:5 }}>{hint}</p>}
      {error && <p style={{ ...MONO, fontSize:10, color:C.red, marginTop:5 }}>{error}</p>}
    </div>
  );
}

// ── Ambient background ─────────────────────────────────────────────────────────
function AmbientBg() {
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
      <div style={{ position:"absolute", top:"-20%", right:"-10%", width:"50vw", height:"50vw",
        borderRadius:"50%", background:"radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)",
        filter:"blur(40px)" }}/>
      <div style={{ position:"absolute", bottom:"-20%", left:"-10%", width:"45vw", height:"45vw",
        borderRadius:"50%", background:"radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)",
        filter:"blur(40px)" }}/>
      <div style={{ position:"absolute", top:"40%", left:"30%",
        width:"25vw", height:"25vw", borderRadius:"50%",
        background:"radial-gradient(circle, rgba(245,158,11,0.03) 0%, transparent 70%)",
        filter:"blur(60px)" }}/>
      <div style={{ position:"absolute", inset:0,
        backgroundImage:"linear-gradient(rgba(245,158,11,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.025) 1px, transparent 1px)",
        backgroundSize:"48px 48px" }}/>
      <div style={{ position:"absolute", inset:0,
        backgroundImage:"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)" }}/>
    </div>
  );
}

export default function BarberLoginPage() {
  const router = useRouter();
  const { theme: T, isDark } = useTheme();
  const { theme: T, isDark } = useTheme();
  C = T;

  const [mode,    setMode]    = useState("login");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [secQuestions, setSecQuestions] = useState([]);

  // Login
  const [user,   setUser]   = useState("");
  const [pass,   setPass]   = useState("");
  const [showPw, setShowPw] = useState(false);

  // Sign up
  const [regName,   setRegName]   = useState("");
  const [regUser,   setRegUser]   = useState("");
  const [regEmail,  setRegEmail]  = useState("");
  const [regPass,   setRegPass]   = useState("");
  const [regPhone,  setRegPhone]  = useState("");
  const [regInvite, setRegInvite] = useState("");
  const [regSecQ,   setRegSecQ]   = useState("");
  const [regSecA,   setRegSecA]   = useState("");

  // Forgot
  const [recStep,   setRecStep]   = useState(1);
  const [recUser,   setRecUser]   = useState("");
  const [recQ,      setRecQ]      = useState("");
  const [recA,      setRecA]      = useState("");
  const [recToken,  setRecToken]  = useState("");
  const [recNew,    setRecNew]    = useState("");
  const [recMethod, setRecMethod] = useState("question");
  const [recEmail,  setRecEmail]  = useState("");

  useEffect(() => {
    API.get("security-questions/").then(r=>setSecQuestions(r.data||[])).catch(()=>{});
  }, []);

  const switchMode = (m) => {
    setMode(m); setError(""); setSuccess(""); setFieldErrors({});
  };

  const eyeBtn = () => (
    <button type="button" onClick={()=>setShowPw(s=>!s)}
      style={{ background:"none", border:"none", color:C.muted, cursor:"pointer",
        fontSize:16, padding:0, lineHeight:1 }}>
      {showPw?"🙈":"👁"}
    </button>
  );

  // ── Login ──
  const handleLogin = async () => {
    setError(""); setFieldErrors({});
    const errs = {};
    if (!user.trim()) errs.user = "Username required";
    if (!pass)        errs.pass = "Password required";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setLoading(true);
    try {
      const r = await API.post("token/", { username:user.trim(), password:pass });
      localStorage.setItem("access", r.data.access);
      localStorage.setItem("refresh", r.data.refresh);
      const dash = await API.get("dashboard/");
      if (!dash.data.is_staff) {
        localStorage.removeItem("access"); localStorage.removeItem("refresh");
        setError("This account doesn't have barber access.");
        return;
      }
      router.replace("/barber-dashboard");
    } catch(e) {
      setError(e?.response?.data?.detail || "Invalid username or password");
    } finally { setLoading(false); }
  };

  // ── Sign up ──
  const handleSignup = async () => {
    setError(""); setFieldErrors({});
    const errs = {};
    if (!regName.trim())   errs.regName   = "Full name required";
    if (!regUser.trim())   errs.regUser   = "Username required";
    if (!regEmail.trim())  errs.regEmail  = "Email required";
    if (!regPass)          errs.regPass   = "Password required";
    if (regPass.length<8)  errs.regPass   = "Min 8 characters";
    if (!regInvite.trim()) errs.regInvite = "Invite code required";
    const rawPhone = regPhone.trim().replace(/\D/g,"");
    if (!rawPhone)         errs.regPhone  = "Phone required";
    else if (rawPhone.length<10) errs.regPhone = "Enter valid 10-digit number";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    const normPhone = rawPhone.length===10 ? `+1${rawPhone}` : `+${rawPhone}`;
    setLoading(true);
    try {
      await API.post("barber/register/", {
        full_name:   regName.trim(),
        username:    regUser.trim(),
        email:       regEmail.trim(),
        password:    regPass,
        phone:       normPhone,
        invite_code: regInvite.trim(),
      });
      const r2 = await API.post("token/", { username:regUser.trim(), password:regPass });
      localStorage.setItem("access", r2.data.access);
      localStorage.setItem("refresh", r2.data.refresh);
      if (regSecQ && regSecA.trim()) {
        await API.post("security-question/set/", { question_id:regSecQ, answer:regSecA.trim() }).catch(()=>{});
      }
      router.replace("/barber-dashboard");
    } catch(e) {
      const data = e?.response?.data;
      if (data?.invite_code) setError("Invalid invite code");
      else if (data?.username) setError(data.username[0]);
      else setError(data?.error || data?.detail || "Registration failed");
    } finally { setLoading(false); }
  };

  // ── Forgot ──
  const handleForgotStep1 = async () => {
    setError(""); setLoading(true);
    try {
      if (recMethod==="question") {
        const r = await API.post("recovery/step1-by-question/", { username:recUser.trim() });
        setRecQ(r.data.question||""); setRecStep(2);
      } else {
        await API.post("recovery/step1/", { username:recUser.trim() });
        setRecStep(2);
      }
    } catch(e) { setError(e?.response?.data?.error||"User not found"); }
    finally { setLoading(false); }
  };

  const handleForgotStep2 = async () => {
    setError(""); setLoading(true);
    try {
      if (recMethod==="question") {
        const r = await API.post("recovery/step2/", { username:recUser.trim(), answer:recA.trim() });
        setRecToken(r.data.token||""); setRecStep(3);
      } else {
        await API.post("recovery/step2/", { username:recUser.trim(), email:recEmail.trim() });
        setRecStep(3);
      }
    } catch(e) { setError(e?.response?.data?.error||"Incorrect answer"); }
    finally { setLoading(false); }
  };

  const handleForgotStep3 = async () => {
    setError(""); setLoading(true);
    try {
      await API.post("recovery/step3/", { token:recToken, new_password:recNew });
      setSuccess("Password updated! You can now sign in.");
      switchMode("login");
    } catch(e) { setError(e?.response?.data?.error||"Could not reset password"); }
    finally { setLoading(false); }
  };

  const PrimaryBtn = ({ onClick, disabled, children }) => (
    <button onClick={onClick} disabled={disabled}
      style={{ width:"100%", padding:"14px",
        background:disabled?"rgba(245,158,11,0.1)":"linear-gradient(135deg,#f59e0b,#d97706)",
        border:"none", borderRadius:12,
        color:disabled?"rgba(245,158,11,0.4)":"#000",
        ...SF, fontSize:9, fontWeight:700, textTransform:"uppercase",
        letterSpacing:"0.2em", cursor:disabled?"not-allowed":"pointer",
        boxShadow:disabled?"none":"0 4px 24px rgba(245,158,11,0.35)",
        transition:"all 0.2s" }}>
      {loading ? (
        <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <span style={{ width:14, height:14, border:"2px solid rgba(245,158,11,0.3)",
            borderTopColor:C.amber, borderRadius:"50%", animation:"spin 0.7s linear infinite",
            display:"inline-block" }}/>
          Loading...
        </span>
      ) : children}
    </button>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"24px 20px", position:"relative" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.bg};color:${T.text};}
        input,button,select{font-family:inherit;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        input::placeholder{color:${T.placeholder||T.muted}!important;opacity:1!important;}
        input,textarea,select{background:${T.inputBg||T.surface}!important;color:${T.text}!important;}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::selection{background:rgba(245,158,11,0.3);}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:rgba(245,158,11,0.2);border-radius:4px;}
        * { -webkit-tap-highlight-color: transparent; }
        button { touch-action: manipulation; }
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

      {/* ── Logo ── */}
      <div style={{ position:"relative", zIndex:1, textAlign:"center", marginBottom:28 }}>
        <img src="/logo1.jpg" alt="HEADZ UP" style={{ height:44, objectFit:"contain", marginBottom:12 }}/>
        <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
          <div style={{ flex:1, height:1, background:`linear-gradient(to right,transparent,${C.amberBorder})`, maxWidth:50 }}/>
          <p style={{ ...MONO, fontSize:9, color:"rgba(245,158,11,0.4)", letterSpacing:"0.4em", textTransform:"uppercase" }}>
            Barber Portal
          </p>
          <div style={{ flex:1, height:1, background:`linear-gradient(to left,transparent,${C.amberBorder})`, maxWidth:50 }}/>
        </div>
      </div>

      {/* ── Card ── */}
      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:420,
        animation:"fadeUp 0.4s cubic-bezier(0.4,0,0.2,1) both" }}>

        {/* Gradient border */}
        <div style={{ position:"absolute", inset:-1, borderRadius:21,
          background:"linear-gradient(135deg,rgba(239,68,68,0.4),rgba(245,158,11,0.15),rgba(239,68,68,0.1))",
          zIndex:-1 }}/>

        <div style={{ background:isDark?"rgba(10,10,12,0.88)":C.cardBg, backdropFilter:"blur(40px)",
          WebkitBackdropFilter:"blur(40px)", borderRadius:20, overflow:"hidden",
          boxShadow:C.cardShadow }}>

          {/* Top accent — red for barber, amber for client */}
          <div style={{ height:3, background:"linear-gradient(to right,#ef4444,#f59e0b,#ef4444)" }}/>

          <div style={{ padding:"26px 28px 30px" }}>

            {/* Mode tabs */}
            {mode!=="forgot" && (
              <div style={{ display:"flex", gap:4, marginBottom:24, padding:4,
                background:"rgba(255,255,255,0.03)", borderRadius:12,
                border:`1px solid ${C.border}` }}>
                {[["login","Sign In"],["signup","Sign Up"]].map(([m,label])=>(
                  <button key={m} onClick={()=>switchMode(m)}
                    style={{ flex:1, padding:"9px 0", borderRadius:9,
                      background:mode===m?"linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.05))":"transparent",
                      border:mode===m?"1px solid rgba(239,68,68,0.35)":"1px solid transparent",
                      color:mode===m?C.red:C.muted, ...MONO, fontSize:10,
                      letterSpacing:"0.15em", textTransform:"uppercase", cursor:"pointer",
                      transition:"all 0.2s",
                      boxShadow:mode===m?"0 2px 12px rgba(239,68,68,0.12)":"none" }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Alerts */}
            {success && (
              <div style={{ padding:"10px 14px", borderRadius:10, background:C.greenDim,
                border:"1px solid rgba(34,197,94,0.3)", marginBottom:16 }}>
                <p style={{ ...MONO, fontSize:11, color:C.green }}>✓ {success}</p>
              </div>
            )}
            {error && (
              <div style={{ padding:"10px 14px", borderRadius:10, background:C.redDim,
                border:"1px solid rgba(239,68,68,0.3)", marginBottom:16 }}>
                <p style={{ ...MONO, fontSize:11, color:C.red }}>⚠ {error}</p>
              </div>
            )}

            {/* ── LOGIN ── */}
            {mode==="login" && (
              <div>
                <Field label="Username" value={user} onChange={e=>setUser(e.target.value)}
                  placeholder="your_username" autoComplete="username" error={fieldErrors.user}/>
                <Field label="Password" type={showPw?"text":"password"} value={pass}
                  onChange={e=>setPass(e.target.value)} placeholder="••••••••"
                  autoComplete="current-password" error={fieldErrors.pass}
                  right={eyeBtn()}/>
                <button onClick={()=>switchMode("forgot")}
                  style={{ background:"none", border:"none", color:C.muted, ...MONO,
                    fontSize:10, cursor:"pointer", marginBottom:20, padding:0,
                    textDecoration:"underline", textDecorationStyle:"dotted" }}>
                  Forgot password?
                </button>
                <PrimaryBtn onClick={handleLogin} disabled={loading}>
                  Sign In →
                </PrimaryBtn>
                <div style={{ textAlign:"center", marginTop:18 }}>
                  <p style={{ ...MONO, fontSize:10, color:C.muted }}>
                    New barber?{" "}
                    <button onClick={()=>switchMode("signup")}
                      style={{ background:"none", border:"none", color:C.amber,
                        cursor:"pointer", ...MONO, fontSize:10, padding:0 }}>
                      Create account
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* ── SIGN UP ── */}
            {mode==="signup" && (
              <div>
                <Field label="Full Name" value={regName} onChange={e=>setRegName(e.target.value)}
                  placeholder="Marcus Williams" autoComplete="name" error={fieldErrors.regName}/>
                <Field label="Username" value={regUser} onChange={e=>setRegUser(e.target.value)}
                  placeholder="choose_a_username" autoComplete="username" error={fieldErrors.regUser}/>
                <Field label="Email" type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)}
                  placeholder="you@email.com" autoComplete="email" error={fieldErrors.regEmail}/>
                <Field label="Phone Number" type="tel" value={regPhone} onChange={e=>setRegPhone(e.target.value)}
                  placeholder="(601) 555-0100" autoComplete="tel" error={fieldErrors.regPhone}/>
                <Field label="Password" type={showPw?"text":"password"} value={regPass}
                  onChange={e=>setRegPass(e.target.value)} placeholder="Min 8 characters"
                  autoComplete="new-password" error={fieldErrors.regPass}
                  right={eyeBtn()}/>

                {/* Invite code */}
                <div style={{ marginBottom:14 }}>
                  <Field label="Invite Code" value={regInvite} onChange={e=>setRegInvite(e.target.value)}
                    placeholder="Enter your invite code" error={fieldErrors.regInvite}
                    hint="Get your invite code from HEADZ UP management"/>
                </div>

                {/* Security question */}
                {secQuestions.length>0 && (
                  <div style={{ padding:"14px", borderRadius:12, background:"rgba(255,255,255,0.03)",
                    border:`1px solid ${C.border}`, marginBottom:16 }}>
                    <p style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.25em",
                      textTransform:"uppercase", marginBottom:10 }}>Security Question (optional)</p>
                    <select value={regSecQ} onChange={e=>setRegSecQ(e.target.value)}
                      style={{ width:"100%", padding:"10px 12px",
                        background:C.inputBg, border:`1px solid ${C.border}`,
                        borderRadius:10, color:regSecQ?C.text:C.muted, ...MONO,
                        fontSize:12, outline:"none", marginBottom:8 }}>
                      <option value="">Select a question...</option>
                      {secQuestions.map(q=>(
                        <option key={q.id} value={q.id}>{q.question}</option>
                      ))}
                    </select>
                    {regSecQ && (
                      <input value={regSecA} onChange={e=>setRegSecA(e.target.value)}
                        placeholder="Your answer"
                        style={{ width:"100%", padding:"10px 12px",
                          background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`,
                          borderRadius:10, color:C.text, ...MONO, fontSize:12, outline:"none" }}/>
                    )}
                  </div>
                )}

                <PrimaryBtn onClick={handleSignup} disabled={loading}>
                  Create Barber Account →
                </PrimaryBtn>
              </div>
            )}

            {/* ── FORGOT ── */}
            {mode==="forgot" && (
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                  <button onClick={()=>switchMode("login")}
                    style={{ background:"none", border:"none", color:C.muted,
                      cursor:"pointer", fontSize:18, padding:0, lineHeight:1 }}>←</button>
                  <div>
                    <p style={{ ...SF, fontSize:11, fontWeight:700, textTransform:"uppercase",
                      letterSpacing:"-0.02em" }}>Password Recovery</p>
                    <p style={{ ...MONO, fontSize:10, color:C.muted }}>Step {recStep} of 3</p>
                  </div>
                </div>

                {/* Progress */}
                <div style={{ display:"flex", gap:4, marginBottom:24 }}>
                  {[1,2,3].map(i=>(
                    <div key={i} style={{ flex:1, height:3, borderRadius:2,
                      background:i<=recStep?"linear-gradient(to right,#ef4444,#f59e0b)":"rgba(255,255,255,0.08)",
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
                            color:recMethod===m?C.amber:C.muted, ...MONO, fontSize:10,
                            cursor:"pointer", transition:"all 0.2s" }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <PrimaryBtn onClick={handleForgotStep1} disabled={loading}>Continue →</PrimaryBtn>
                  </div>
                )}
                {recStep===2 && (
                  <div>
                    {recMethod==="question" ? (
                      <>
                        <p style={{ ...MONO, fontSize:12, color:C.sub, marginBottom:14, lineHeight:1.7 }}>{recQ}</p>
                        <Field label="Your Answer" value={recA} onChange={e=>setRecA(e.target.value)} placeholder="Answer"/>
                      </>
                    ) : (
                      <Field label="Email Address" type="email" value={recEmail}
                        onChange={e=>setRecEmail(e.target.value)} placeholder="you@email.com"/>
                    )}
                    <PrimaryBtn onClick={handleForgotStep2} disabled={loading}>Verify →</PrimaryBtn>
                  </div>
                )}
                {recStep===3 && (
                  <div>
                    <Field label="New Password" type="password" value={recNew}
                      onChange={e=>setRecNew(e.target.value)} placeholder="Min 8 characters"/>
                    <PrimaryBtn onClick={handleForgotStep3} disabled={loading}>Reset Password →</PrimaryBtn>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Bottom bar */}
          <div style={{ padding:"14px 28px", borderTop:`1px solid ${C.border}`,
            background:isDark?"rgba(0,0,0,0.2)":"rgba(0,0,0,0.04)", display:"flex", justifyContent:"space-between",
            alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <p style={{ ...MONO, fontSize:9, color:C.muted }}>✂️ HEADZ UP · Barber Portal</p>
            <a href="/login" style={{ ...MONO, fontSize:9, color:C.muted,
              textDecoration:"none", letterSpacing:"0.1em" }}>
              Client login →
            </a>
          </div>
        </div>
      </div>

      {/* Back to home */}
      <div style={{ position:"relative", zIndex:1, marginTop:16, display:"flex",
        gap:10, justifyContent:"center", alignItems:"center", flexWrap:"wrap" }}>
        <ThemeToggle/>
        <a href="/"
          style={{ ...MONO, fontSize:10, color:C.muted, textDecoration:"none",
            padding:"8px 16px", borderRadius:8,
            border:"1px solid rgba(255,255,255,0.06)",
            background:"rgba(255,255,255,0.02)",
            display:"inline-block", transition:"all 0.2s" }}
          onMouseEnter={e=>{e.currentTarget.style.color=C.amber;e.currentTarget.style.borderColor=C.amberBorder;}}
          onMouseLeave={e=>{e.currentTarget.style.color=C.muted;e.currentTarget.style.borderColor="rgba(255,255,255,0.06)";}}>
          ← Back to headzupp.com
        </a>
      </div>
    </div>
  );
}
