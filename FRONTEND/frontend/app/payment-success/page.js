"use client";
// Older Stripe checkout links return here. We look up the newest appointment
// and show the same confirmation as /booking-confirmed.
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import API from "@/lib/api";
import { AuthShell } from "@/components/auth/AuthParts";
import { Notice, Skeleton } from "@/components/ui/Feedback";
import { ADDRESS_LINE } from "@/lib/shop";
import { apptDate, fmtDate, fmtTime } from "@/lib/time";

function Content() {
  const [state, setState] = useState({ loading: true, appt: null });
  useEffect(() => {
    API.get("appointments/", { _noCache: true })
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.results || [];
        const upcoming = list
          .filter((a) => !["cancelled", "no_show"].includes(a.status) && apptDate(a.date, a.time) > new Date(Date.now() - 3600e3))
          .sort((a, b) => (b.id || 0) - (a.id || 0));
        setState({ loading: false, appt: upcoming[0] || null });
      })
      .catch(() => setState({ loading: false, appt: null }));
  }, []);

  const a = state.appt;
  return (
    <AuthShell seed={21}>
      <h1 className="h1">Payment received.</h1>
      {state.loading ? (
        <div className="mt-5"><Skeleton h={22} w="80%" /><Skeleton h={120} className="mt-4" /></div>
      ) : a ? (
        <>
          <p className="lede mt-3">
            {a.service_name} with {a.barber_name}, {fmtDate(a.date, "long")} at {fmtTime(a.time)}.
          </p>
          <Notice tone="info" className="mt-5">
            {ADDRESS_LINE}. Get there five minutes early; your chair is held for 15 minutes past your time.
          </Notice>
        </>
      ) : (
        <p className="lede mt-3">
          Your booking will show up in My appointments in a moment. If it doesn&apos;t, call the shop.
        </p>
      )}
      <Link href="/dashboard" className="btn btn-primary btn-lg btn-block mt-6">See my appointments</Link>
      <Link href="/" className="btn btn-quiet btn-block mt-2">Back to the home page</Link>
    </AuthShell>
  );
}

export default function PaymentSuccessPage() {
  return <Suspense fallback={null}><Content /></Suspense>;
}
