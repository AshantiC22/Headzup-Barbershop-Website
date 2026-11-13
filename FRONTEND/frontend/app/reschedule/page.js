"use client";
// The approve / decline link from a reschedule-request email:
// /reschedule?token=…&action=accept|reject
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthParts";
import { Spinner } from "@/components/ui/Feedback";
import { API_ROOT } from "@/lib/auth";

const COPY = {
  loading:  { title: "Working on it", body: "Sending your answer to the shop." },
  accepted: { title: "Approved.", body: "The client has been told, and their appointment moved to the new time." },
  rejected: { title: "Declined.", body: "The client has been told. Their original time still stands." },
  already:  { title: "Already handled.", body: "Someone already answered this request. Nothing else to do." },
  invalid:  { title: "This link doesn't work.", body: "It may be incomplete or expired. Answer the request from the barber dashboard instead." },
  error:    { title: "That didn't go through.", body: "Answer the request from the barber dashboard, or try the link again in a minute." },
};

function Inner() {
  const p = useSearchParams();
  const token = p.get("token");
  const action = p.get("action");
  const valid = !!token && (action === "accept" || action === "reject");
  const [result, setResult] = useState("loading");
  useEffect(() => {
    if (!valid) return;
    fetch(`${API_ROOT}/api/reschedule/respond/?token=${encodeURIComponent(token)}&action=${action}`)
      .then((r) => r.json())
      .then((d) => setResult(
        d.status === "accepted" ? "accepted" : d.status === "rejected" ? "rejected" : d.status === "already_handled" ? "already" : "error",
      ))
      .catch(() => setResult("error"));
  }, [valid, token, action]);
  const status = valid ? result : "invalid";
  const c = COPY[status];
  return (
    <AuthShell seed={17}>
      <h1 className="h1" aria-live="polite">{status === "loading" ? <Spinner label={c.title} /> : c.title}</h1>
      <p className="lede mt-3">{c.body}</p>
      {status !== "loading" && (
        <a href="/barber-dashboard" className="btn btn-primary btn-lg btn-block mt-6">Open the barber dashboard</a>
      )}
    </AuthShell>
  );
}

export default function ReschedulePage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
