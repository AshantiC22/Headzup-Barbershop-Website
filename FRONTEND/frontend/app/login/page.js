"use client";
// Client sign-in and sign-up. Honors ?next= so someone who started booking
// lands back in the booking flow after signing in.
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import API from "@/lib/api";
import { safeNext, saveSession, clearSession } from "@/lib/auth";
import {
  AuthShell, Field, PasswordInput, RecoveryFlow, Segmented, SecurityQuestionFields, SubmitButton, TextInput,
  normalizePhone, useSecurityQuestions,
} from "@/components/auth/AuthParts";
import { Notice } from "@/components/ui/Feedback";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const reason = params.get("reason");
  const questions = useSecurityQuestions();

  const [mode, setMode] = useState(params.get("mode") === "register" ? "register" : "login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [errs, setErrs] = useState({});

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const [rUser, setRUser] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rPass, setRPass] = useState("");
  const [rPass2, setRPass2] = useState("");
  const [secQ, setSecQ] = useState("");
  const [secA, setSecA] = useState("");

  const switchMode = (next) => { setMode(next); setError(""); setErrs({}); };

  const landing = (isStaff) => (isStaff ? "/barber-dashboard" : safeNext(next, "/dashboard"));

  const signIn = async (e) => {
    e.preventDefault();
    const fe = {};
    if (!user.trim()) fe.user = "Enter your username.";
    if (!pass) fe.pass = "Enter your password.";
    setErrs(fe);
    if (Object.keys(fe).length) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const r = await API.post("token/", { username: user.trim(), password: pass });
      saveSession(r.data);
      const dash = await API.get("dashboard/", { _noCache: true });
      router.replace(landing(dash.data.is_staff));
    } catch (err) {
      clearSession();
      setError(err?.response?.status === 401 || err?.response?.status === 400
        ? "That username and password don't match. Check the spelling, or reset your password."
        : "We couldn't reach the shop's server. Check your connection and try again.");
      setBusy(false);
    }
  };

  const register = async (e) => {
    e.preventDefault();
    const fe = {};
    if (rUser.trim().length < 3) fe.rUser = "Pick a username with at least 3 characters.";
    if (!/^\S+@\S+\.\S+$/.test(rEmail.trim())) fe.rEmail = "Enter an email we can send receipts to.";
    const phone = normalizePhone(rPhone);
    if (!phone) fe.rPhone = "Enter a 10-digit US phone number.";
    if (rPass.length < 8) fe.rPass = "Use at least 8 characters.";
    if (rPass !== rPass2) fe.rPass2 = "The two passwords don't match.";
    if (secQ && !secA.trim()) fe.secA = "Type an answer, or skip the security question.";
    setErrs(fe);
    if (Object.keys(fe).length) return;
    setBusy(true); setError("");
    try {
      await API.post("register/", { username: rUser.trim(), email: rEmail.trim(), password: rPass, phone });
      const r = await API.post("token/", { username: rUser.trim(), password: rPass });
      saveSession(r.data);
      if (secQ && secA.trim()) {
        await API.post("security-question/set/", { question: secQ, answer: secA.trim() }).catch(() => {});
      }
      router.replace(safeNext(next, "/dashboard"));
    } catch (err) {
      const d = err?.response?.data || {};
      const first = (v) => (Array.isArray(v) ? v[0] : v);
      if (d.username) setErrs({ rUser: first(d.username) });
      else if (d.email) setErrs({ rEmail: first(d.email) });
      else if (d.phone) setErrs({ rPhone: first(d.phone) });
      else if (d.password) setErrs({ rPass: first(d.password) });
      else setError(d.error || d.detail || "The account wasn't created. Try again in a moment.");
      setBusy(false);
    }
  };

  if (mode === "forgot") {
    return (
      <AuthShell>
        <RecoveryFlow onBack={() => switchMode("login")}
          onDone={(u) => { switchMode("login"); setUser(u); setPass(""); setSuccess("Password saved. Sign in with the new one."); }} />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Segmented label="Account" value={mode} onChange={switchMode}
        options={[["login", "Sign in"], ["register", "Create account"]]} />

      {reason === "book" && mode === "login" && (
        <Notice tone="info" className="mb-5">Sign in to book. New here? Creating an account takes about a minute.</Notice>
      )}
      {params.get("expired") === "true" && (
        <Notice tone="warn" className="mb-5">You were signed out. Sign in again to pick up where you left off.</Notice>
      )}
      {success && <Notice tone="ok" className="mb-5">{success}</Notice>}
      {error && <Notice tone="bad" className="mb-5">{error}</Notice>}

      {mode === "login" ? (
        <form onSubmit={signIn} noValidate>
          <h1 className="h2 mb-5">Welcome back</h1>
          <Field id="user" label="Username" error={errs.user}>
            <TextInput id="user" error={errs.user} value={user} onChange={(e) => setUser(e.target.value)}
              autoComplete="username" autoCapitalize="none" autoCorrect="off" />
          </Field>
          <Field id="pass" label="Password" error={errs.pass}>
            <PasswordInput id="pass" error={errs.pass} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
          </Field>
          <SubmitButton busy={busy} busyLabel="Signing in">Sign in</SubmitButton>
          <div className="auth-foot">
            <button type="button" className="link" onClick={() => switchMode("forgot")}>Forgot your password?</button>
          </div>
        </form>
      ) : (
        <form onSubmit={register} noValidate>
          <h1 className="h2 mb-2">Make an account</h1>
          <p className="muted mb-5">So your barber knows who&apos;s coming, and you get reminders before your cut.</p>
          <Field id="r-user" label="Username" error={errs.rUser}>
            <TextInput id="r-user" error={errs.rUser} value={rUser} onChange={(e) => setRUser(e.target.value)}
              autoComplete="username" autoCapitalize="none" autoCorrect="off" />
          </Field>
          <Field id="r-email" label="Email" error={errs.rEmail}>
            <TextInput id="r-email" type="email" inputMode="email" error={errs.rEmail} value={rEmail}
              onChange={(e) => setREmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field id="r-phone" label="Mobile number" error={errs.rPhone} hint="For booking texts and reminders.">
            <TextInput id="r-phone" type="tel" inputMode="tel" error={errs.rPhone} value={rPhone}
              onChange={(e) => setRPhone(e.target.value)} autoComplete="tel" placeholder="(601) 555-0100" />
          </Field>
          <Field id="r-pass" label="Password" error={errs.rPass} hint="At least 8 characters.">
            <PasswordInput id="r-pass" error={errs.rPass} value={rPass} onChange={(e) => setRPass(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field id="r-pass2" label="Type it again" error={errs.rPass2}>
            <PasswordInput id="r-pass2" error={errs.rPass2} value={rPass2} onChange={(e) => setRPass2(e.target.value)} autoComplete="new-password" />
          </Field>
          <SecurityQuestionFields questions={questions} q={secQ} setQ={setSecQ} a={secA} setA={setSecA} />
          {errs.secA && <p className="field-error">{errs.secA}</p>}
          <p className="small muted mt-5">
            We&apos;ll text booking confirmations and reminders to this number. Message and data rates may apply.
            Reply STOP to opt out. <Link className="link" href="/sms-optin">Text message details</Link>
          </p>
          <SubmitButton busy={busy} busyLabel="Creating your account">Create account</SubmitButton>
          <p className="small faint center mt-3">
            By creating an account you agree to the <Link className="link" href="/terms">terms and privacy policy</Link>.
          </p>
        </form>
      )}
      <div className="auth-foot">
        <Link className="link" href="/barber-login">Barbers sign in here</Link>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
