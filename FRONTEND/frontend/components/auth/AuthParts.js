"use client";
// Shared pieces for the client and barber sign-in pages.
import { useEffect, useState } from "react";
import Link from "next/link";
import API from "@/lib/api";
import { arrowSelect, rovingIndex } from "@/components/ui/roving";
import PaintedSky from "@/components/art/PaintedSky";
import { ShopSign } from "@/components/site/SiteNav";
import { IconArrowLeft, IconEye, Notice, Spinner } from "@/components/ui/Feedback";
import { SHOP } from "@/lib/shop";

export function AuthShell({ children, seed = 3 }) {
  return (
    <div className="sky-page">
      <PaintedSky seed={seed} />
      <div className="sky-content auth-wrap">
        <header className="auth-top">
          <ShopSign />
          <Link href="/" className="btn btn-quiet btn-sm auth-home">
            <IconArrowLeft size={16} /> Home
          </Link>
        </header>
        <main id="main" className="auth-card panel">
          {children}
        </main>
      </div>
    </div>
  );
}

export function Field({ id, label, note, error, hint, children }) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {note && <span className="label-note"> {note}</span>}
      </label>
      {children}
      {error ? (
        <p className="field-error" id={`${id}-err`}>
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ id, error, ...rest }) {
  return (
    <input
      id={id}
      className="input"
      aria-invalid={error ? "true" : undefined}
      aria-describedby={error ? `${id}-err` : undefined}
      {...rest}
    />
  );
}

export function PasswordInput({ id, error, ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input
        id={id}
        className="input"
        type={show ? "text" : "password"}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        {...rest}
      />
      <button
        type="button"
        className="icon-btn input-action"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
      >
        <IconEye off={show} />
      </button>
    </div>
  );
}

export function SubmitButton({ busy, children, busyLabel }) {
  return (
    <button type="submit" className="btn btn-primary btn-lg btn-block mt-6" disabled={busy}>
      {busy ? <Spinner label={busyLabel || "One moment"} /> : children}
    </button>
  );
}

export function Segmented({ value, options, onChange, label }) {
  return (
    <div
      className="hu-theme-switch auth-seg"
      role="tablist"
      aria-label={label}
      onKeyDown={(e) =>
        arrowSelect(
          e,
          options.map(([v]) => v),
          value,
          onChange,
        )
      }
    >
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={value === v}
          tabIndex={rovingIndex(
            v,
            value,
            options.map(([o]) => o),
          )}
          className={value === v ? "is-on" : ""}
          onClick={() => onChange(v)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/** Normalizes a typed US phone number to +1XXXXXXXXXX, or returns null. */
export function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function useSecurityQuestions() {
  const [qs, setQs] = useState([]);
  useEffect(() => {
    API.get("security-questions/")
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.questions || [];
        setQs(list.map((q) => (typeof q === "string" ? q : q.question)).filter(Boolean));
      })
      .catch(() => {});
  }, []);
  return qs;
}

/** Optional security question, saved right after the account is created. */
export function SecurityQuestionFields({ questions, q, setQ, a, setA }) {
  const [open, setOpen] = useState(false);
  if (!questions.length) return null;
  return (
    <div className="auth-optional">
      <button
        type="button"
        className="btn btn-quiet btn-sm"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft: 0 }}
      >
        {open ? "Skip the security question" : "Add a security question"}
      </button>
      {!open && <p className="field-hint">It&apos;s how you get back in if you forget your password.</p>}
      {open && (
        <div className="mt-3">
          <Field id="secq" label="Security question">
            <select id="secq" className="select" value={q} onChange={(e) => setQ(e.target.value)}>
              <option value="">Choose one</option>
              {questions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>
          {q && (
            <Field id="seca" label="Your answer" hint="Not case sensitive.">
              <TextInput id="seca" value={a} onChange={(e) => setA(e.target.value)} autoComplete="off" />
            </Field>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Forgot password: username or email → security question → new password.
 * Accounts without a security question are told to call the shop.
 */
export function RecoveryFlow({ onDone, onBack }) {
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState("");
  const [account, setAccount] = useState(null); // { user_id, username, security_question }
  const [answer, setAnswer] = useState("");
  const [token, setToken] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [noQuestion, setNoQuestion] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      const d = e?.response?.data || {};
      if (d.no_question) setNoQuestion(true);
      setError(d.error || "That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!identifier.trim()) return setError("Enter your username or the email on your account.");
      return run(async () => {
        const r = await API.post("recovery/step1/", { identifier: identifier.trim() });
        setAccount(r.data);
        setStep(2);
      });
    }
    if (step === 2) {
      if (!answer.trim()) return setError("Type your answer.");
      return run(async () => {
        const r = await API.post("recovery/step2/", { user_id: account.user_id, answer: answer.trim() });
        setToken(r.data.token);
        setStep(3);
      });
    }
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    return run(async () => {
      await API.post("recovery/step3/", { user_id: account.user_id, token, new_password: pw });
      onDone?.(account.username);
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <button type="button" className="btn btn-quiet btn-sm mb-2" onClick={onBack} style={{ paddingLeft: 0 }}>
        <IconArrowLeft size={16} /> Back to sign in
      </button>
      <h1 className="h2">Reset your password</h1>
      <p className="muted mt-2 mb-5">Step {step} of 3</p>

      {error && (
        <Notice tone="bad" className="mb-4">
          {error}
          {noQuestion && (
            <>
              {" "}
              Call the shop at{" "}
              <a className="link" href={`tel:${SHOP.phone}`}>
                {SHOP.phoneDisplay}
              </a>{" "}
              and we&apos;ll reset it for you.
            </>
          )}
        </Notice>
      )}

      {step === 1 && (
        <Field id="rec-id" label="Username or email">
          <TextInput
            id="rec-id"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </Field>
      )}
      {step === 2 && account && (
        <>
          <p className="placard-medium mb-4">
            Signed up as <strong>{account.username}</strong>. {account.security_question}
          </p>
          <Field id="rec-a" label="Your answer">
            <TextInput
              id="rec-a"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </Field>
        </>
      )}
      {step === 3 && (
        <>
          <Field id="rec-pw" label="New password" hint="At least 8 characters.">
            <PasswordInput
              id="rec-pw"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
          </Field>
          <Field id="rec-pw2" label="Type it again">
            <PasswordInput
              id="rec-pw2"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        </>
      )}
      <SubmitButton busy={busy}>{step === 3 ? "Save new password" : "Continue"}</SubmitButton>
    </form>
  );
}
