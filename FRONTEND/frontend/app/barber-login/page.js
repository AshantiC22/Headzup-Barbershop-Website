"use client";
// Barber sign-in and invite-code sign-up (token/, barber/register/).
import { useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";
import { clearSession, saveSession } from "@/lib/auth";
import {
  AuthShell, Field, PasswordInput, RecoveryFlow, Segmented, SecurityQuestionFields, SubmitButton, TextInput,
  normalizePhone, useSecurityQuestions,
} from "@/components/auth/AuthParts";
import { Notice } from "@/components/ui/Feedback";

export default function BarberLoginPage() {
  const router = useRouter();
  const questions = useSecurityQuestions();
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [errs, setErrs] = useState({});

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const [f, setF] = useState({ name: "", user: "", email: "", phone: "", pass: "", invite: "" });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const [secQ, setSecQ] = useState("");
  const [secA, setSecA] = useState("");

  const switchMode = (m) => { setMode(m); setError(""); setErrs({}); };

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
      if (!dash.data.is_staff) {
        clearSession();
        setError("This is a client account. Clients sign in on the main sign-in page.");
        setBusy(false);
        return;
      }
      router.replace("/barber-dashboard");
    } catch (err) {
      clearSession();
      setError(err?.response?.status === 401 || err?.response?.status === 400
        ? "That username and password don't match."
        : "We couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  };

  const join = async (e) => {
    e.preventDefault();
    const fe = {};
    if (!f.name.trim()) fe.name = "Enter the name clients will see.";
    if (f.user.trim().length < 3) fe.user = "Pick a username with at least 3 characters.";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) fe.email = "Enter a valid email.";
    const phone = normalizePhone(f.phone);
    if (!phone) fe.phone = "Enter a 10-digit US phone number. Booking texts go here.";
    if (f.pass.length < 8) fe.pass = "Use at least 8 characters.";
    if (!f.invite.trim()) fe.invite = "Ask the shop owner for the invite code.";
    setErrs(fe);
    if (Object.keys(fe).length) return;
    setBusy(true); setError("");
    try {
      await API.post("barber/register/", {
        full_name: f.name.trim(), username: f.user.trim(), email: f.email.trim(),
        password: f.pass, phone, invite_code: f.invite.trim(),
      });
      const r = await API.post("token/", { username: f.user.trim(), password: f.pass });
      saveSession(r.data);
      if (secQ && secA.trim()) {
        await API.post("security-question/set/", { question: secQ, answer: secA.trim() }).catch(() => {});
      }
      router.replace("/barber-dashboard");
    } catch (err) {
      const d = err?.response?.data || {};
      const first = (v) => (Array.isArray(v) ? v[0] : v);
      if (d.invite_code) setErrs({ invite: "That invite code isn't right. Check with the shop owner." });
      else if (d.username) setErrs({ user: first(d.username) });
      else if (d.email) setErrs({ email: first(d.email) });
      else setError(d.error || d.detail || "The account wasn't created. Try again.");
      setBusy(false);
    }
  };

  if (mode === "forgot") {
    return (
      <AuthShell seed={11}>
        <RecoveryFlow onBack={() => switchMode("login")}
          onDone={(u) => { switchMode("login"); setUser(u); setSuccess("Password saved. Sign in with the new one."); }} />
      </AuthShell>
    );
  }

  return (
    <AuthShell seed={11}>
      <Segmented label="Barber account" value={mode} onChange={switchMode}
        options={[["login", "Sign in"], ["join", "Join the shop"]]} />
      {success && <Notice tone="ok" className="mb-5">{success}</Notice>}
      {error && <Notice tone="bad" className="mb-5">{error}</Notice>}

      {mode === "login" ? (
        <form onSubmit={signIn} noValidate>
          <h1 className="h2 mb-2">Barber sign-in</h1>
          <p className="muted mb-5">Your chair, your book, your clients.</p>
          <Field id="b-user" label="Username" error={errs.user}>
            <TextInput id="b-user" error={errs.user} value={user} onChange={(e) => setUser(e.target.value)}
              autoComplete="username" autoCapitalize="none" autoCorrect="off" />
          </Field>
          <Field id="b-pass" label="Password" error={errs.pass}>
            <PasswordInput id="b-pass" error={errs.pass} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
          </Field>
          <SubmitButton busy={busy} busyLabel="Signing in">Sign in</SubmitButton>
          <div className="auth-foot">
            <button type="button" className="link" onClick={() => switchMode("forgot")}>Forgot your password?</button>
          </div>
        </form>
      ) : (
        <form onSubmit={join} noValidate>
          <h1 className="h2 mb-2">Join the shop</h1>
          <p className="muted mb-5">You&apos;ll need the invite code from the owner.</p>
          <Field id="j-name" label="Name clients will see" error={errs.name}>
            <TextInput id="j-name" error={errs.name} value={f.name} onChange={set("name")} autoComplete="name" />
          </Field>
          <Field id="j-user" label="Username" error={errs.user}>
            <TextInput id="j-user" error={errs.user} value={f.user} onChange={set("user")} autoComplete="username" autoCapitalize="none" />
          </Field>
          <Field id="j-email" label="Email" error={errs.email}>
            <TextInput id="j-email" type="email" inputMode="email" error={errs.email} value={f.email} onChange={set("email")} autoComplete="email" />
          </Field>
          <Field id="j-phone" label="Mobile number" error={errs.phone} hint="New bookings, cancellations and reviews get texted here.">
            <TextInput id="j-phone" type="tel" inputMode="tel" error={errs.phone} value={f.phone} onChange={set("phone")} autoComplete="tel" placeholder="(601) 555-0100" />
          </Field>
          <Field id="j-pass" label="Password" error={errs.pass} hint="At least 8 characters.">
            <PasswordInput id="j-pass" error={errs.pass} value={f.pass} onChange={set("pass")} autoComplete="new-password" />
          </Field>
          <Field id="j-invite" label="Invite code" error={errs.invite}>
            <TextInput id="j-invite" error={errs.invite} value={f.invite} onChange={set("invite")} autoCapitalize="none" autoComplete="off" />
          </Field>
          <SecurityQuestionFields questions={questions} q={secQ} setQ={setSecQ} a={secA} setA={setSecA} />
          <SubmitButton busy={busy} busyLabel="Setting up your chair">Create barber account</SubmitButton>
        </form>
      )}
      <div className="auth-foot">
        <a className="link" href="/login">Client sign-in</a>
      </div>
    </AuthShell>
  );
}
