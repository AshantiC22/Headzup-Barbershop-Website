"use client";
// Text-message opt-in. The consent language below is what the toll-free
// number was verified with; keep it word-for-word if you edit this page.
import { useState } from "react";
import API from "@/lib/api";
import { AuthShell, Field, TextInput, normalizePhone } from "@/components/auth/AuthParts";
import { Notice, Spinner } from "@/components/ui/Feedback";
import { SHOP } from "@/lib/shop";

export default function SMSOptInPage() {
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const norm = normalizePhone(phone);
    if (!norm) return setError("Enter a 10-digit US mobile number.");
    if (!agreed) return setError("Check the box to agree to text messages.");
    let token = null;
    try { token = localStorage.getItem("access"); } catch {}
    if (!token) { window.location.href = "/login?next=/sms-optin"; return; }
    setError(""); setBusy(true);
    try {
      await API.patch("client/update-phone/", { phone: norm });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.error || "That number didn't save. Try again.");
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <AuthShell seed={9}>
        <h1 className="h1">You&apos;re on the list.</h1>
        <p className="lede mt-3">
          Confirmations, reminders and updates will text to that number. Reply STOP any time to unsubscribe.
        </p>
        <a href="/dashboard" className="btn btn-primary btn-lg btn-block mt-6">Go to My appointments</a>
      </AuthShell>
    );
  }

  return (
    <AuthShell seed={9}>
      <form onSubmit={submit} noValidate>
        <h1 className="h2">Text message updates</h1>
        <p className="muted mt-3 mb-4">
          Get appointment confirmations, reminders and updates from HEADZ UP Barbershop by SMS.
        </p>
        <ul className="sms-list">
          <li>Booking confirmations</li>
          <li>Reminders 24 hours and 1 hour before your appointment</li>
          <li>&ldquo;Cut complete&rdquo; messages and review requests</li>
          <li>Cancellation and reschedule notices</li>
        </ul>
        <Field id="sms-phone" label="Mobile number">
          <TextInput id="sms-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="(601) 555-0100" autoComplete="tel" />
        </Field>
        <label className="check mt-4">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            I agree to receive SMS text messages from HEADZ UP Barbershop at the phone number provided.
            Message frequency varies. Message &amp; data rates may apply. Reply <strong>STOP</strong> to
            unsubscribe at any time. Reply <strong>HELP</strong> for help.
          </span>
        </label>
        {error && <Notice tone="bad" className="mt-4">{error}</Notice>}
        <button className="btn btn-primary btn-lg btn-block mt-5" disabled={busy}>
          {busy ? <Spinner label="Saving" /> : "Subscribe to text updates"}
        </button>
        <p className="small faint mt-4">
          By subscribing you consent to receive recurring automated transactional SMS messages from HEADZ UP
          Barbershop ({SHOP.street}, {SHOP.city} {SHOP.region} {SHOP.zip}) to the number provided. Consent is not a
          condition of any purchase. View our <a className="link" href="/terms">Terms &amp; Privacy Policy</a>.
        </p>
        <p className="small faint mt-2">
          STOP to unsubscribe. HELP for help. <a className="link" href={`mailto:${SHOP.email}`}>{SHOP.email}</a>
        </p>
      </form>
    </AuthShell>
  );
}
