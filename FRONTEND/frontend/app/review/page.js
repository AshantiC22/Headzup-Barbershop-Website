"use client";
// The review link texted after a cut: /review?appt=123
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import API from "@/lib/api";
import { AuthShell } from "@/components/auth/AuthParts";
import StarRating from "@/components/ui/StarRating";
import { Notice, Skeleton, Spinner } from "@/components/ui/Feedback";
import { fmtDate } from "@/lib/time";

function ReviewContent() {
  const apptId = useSearchParams().get("appt");
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [already, setAlready] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!apptId) { setLoading(false); return; }
    let token = null;
    try { token = localStorage.getItem("access"); } catch {}
    if (!token) {
      window.location.replace(`/login?next=${encodeURIComponent(`/review?appt=${apptId}`)}`);
      return;
    }
    API.get("appointments/", { _noCache: true })
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.results || [];
        const hit = list.find((a) => String(a.id) === String(apptId));
        if (hit) { setAppt(hit); if (hit.reviewed || hit.has_review) setAlready(true); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apptId]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await API.post("review/submit/", { appointment_id: apptId, completed: true, rating, comment: comment.trim() });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.error || "The review didn't send. Try again.");
    } finally { setBusy(false); }
  };

  if (loading) return <AuthShell seed={5}><Skeleton h={40} w="70%" /><Skeleton h={160} className="mt-5" /></AuthShell>;

  if (!apptId) {
    return (
      <AuthShell seed={5}>
        <h1 className="h2">Which cut are we reviewing?</h1>
        <p className="muted mt-3 mb-5">This link is missing its appointment. Open My appointments to review a past cut.</p>
        <a href="/dashboard" className="btn btn-primary btn-lg btn-block">Open My appointments</a>
      </AuthShell>
    );
  }

  if (done || already) {
    return (
      <AuthShell seed={5}>
        <h1 className="h1">{done ? "Thank you." : "Already reviewed."}</h1>
        <p className="lede mt-3">
          {done
            ? `Your ${rating}-star review went to ${appt?.barber_name || "your barber"}. Reviews are how a barber's book fills up.`
            : "You've already left a review for this cut. Thanks for that."}
        </p>
        <a href="/book" className="btn btn-primary btn-lg btn-block mt-6">Book the next one</a>
        <a href="/dashboard" className="btn btn-quiet btn-block mt-2">My appointments</a>
      </AuthShell>
    );
  }

  return (
    <AuthShell seed={5}>
      <form onSubmit={submit}>
        <h1 className="h2">How was the cut?</h1>
        {appt && (
          <div className="placard mt-4 mb-6">
            <p className="placard-title">{appt.service_name}</p>
            <p className="placard-medium">with {appt.barber_name}, {fmtDate(appt.date, "long")}</p>
          </div>
        )}
        <StarRating value={rating} onChange={setRating} label="Your rating" />
        <div className="field mt-4">
          <label className="label" htmlFor="comment">Tell them about it <span className="label-note">(optional)</span></label>
          <textarea id="comment" className="textarea" rows={4} maxLength={500} value={comment}
            onChange={(e) => setComment(e.target.value)} placeholder="The fade, the lineup, the conversation…" />
          <p className="field-hint">{comment.length}/500</p>
        </div>
        {error && <Notice tone="bad" className="mt-3">{error}</Notice>}
        <button className="btn btn-primary btn-lg btn-block mt-5" disabled={busy}>
          {busy ? <Spinner label="Sending" /> : `Send ${rating}-star review`}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ReviewPage() {
  return <Suspense fallback={null}><ReviewContent /></Suspense>;
}
