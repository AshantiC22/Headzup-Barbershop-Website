"use client";
// Where both booking paths land: pay-at-shop goes straight here, and Stripe's
// deposit flow comes back here through the API's deposit-success redirect.
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthParts";
import { IconCalendar, IconCheck, IconPin, Notice } from "@/components/ui/Feedback";
import { ADDRESS_LINE, SHOP } from "@/lib/shop";
import { fmtDate, fmtTime, to24Hour } from "@/lib/time";

const money = (n) => {
  const v = parseFloat(n);
  if (Number.isNaN(v)) return "";
  return `$${v.toFixed(v % 1 ? 2 : 0)}`;
};

function icsFile({ service, barber, date, time, minutes = 30 }) {
  const [hh, mm] = to24Hour(time).split(":");
  const start = `${date.replace(/-/g, "")}T${hh}${mm}00`;
  const endMins = parseInt(hh, 10) * 60 + parseInt(mm, 10) + minutes;
  const end = `${date.replace(/-/g, "")}T${String(Math.floor(endMins / 60)).padStart(2, "0")}${String(endMins % 60).padStart(2, "0")}00`;
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Headz Up//Booking//EN", "BEGIN:VEVENT",
    `UID:${start}-${Math.random().toString(36).slice(2)}@headzupp.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;TZID=${SHOP.timezone}:${start}`, `DTEND;TZID=${SHOP.timezone}:${end}`,
    `SUMMARY:${service} with ${barber} at Headz Up`,
    `LOCATION:${ADDRESS_LINE.replace(/,/g, "\\,")}`,
    "DESCRIPTION:Arrive five minutes early. Reschedule or cancel at headzupp.com/dashboard",
    "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:Haircut in one hour", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ];
  return new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
}

function ConfirmedContent() {
  const p = useSearchParams();
  // The deposit redirect doesn't URL-encode names, so "Haircut & Shave" arrives
  // split at the "&". Read the raw query between service= and &barber= instead.
  const rawService = (() => {
    if (typeof window === "undefined") return null;
    const m = window.location.search.match(/[?&]service=(.*?)&barber=/);
    try { return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null; } catch { return m ? m[1] : null; }
  })();
  const service = rawService || p.get("service") || "";
  const barber = p.get("barber") || "";
  const date = p.get("date") || "";
  const time = p.get("time") || "";
  const payment = p.get("payment") || "deposit";
  const deposit = p.get("deposit");
  const remaining = p.get("remaining");
  const price = p.get("price");
  const failed = p.get("error") === "true";
  const [stamp, setStamp] = useState(false);
  useEffect(() => { const t = setTimeout(() => setStamp(true), 250); return () => clearTimeout(t); }, []);

  const addToCalendar = () => {
    const url = URL.createObjectURL(icsFile({ service, barber, date, time }));
    const a = document.createElement("a");
    a.href = url; a.download = "headz-up-appointment.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  if (failed) {
    return (
      <AuthShell seed={21}>
        <h1 className="h2">The booking didn&apos;t confirm</h1>
        <p className="muted mt-3 mb-5">
          Your card may still have been charged. Check My appointments first; if the booking isn&apos;t there,
          call the shop and we&apos;ll sort it out.
        </p>
        <div className="stack" style={{ "--stack": "10px" }}>
          <a href="/dashboard" className="btn btn-primary btn-lg btn-block">Check My appointments</a>
          <a href={`tel:${SHOP.phone}`} className="btn btn-ghost btn-lg btn-block">Call {SHOP.phoneDisplay}</a>
        </div>
      </AuthShell>
    );
  }

  const paidOnline = payment === "deposit" || payment === "online";
  return (
    <AuthShell seed={21}>
      <div className={`confirm-stamp ${stamp ? "is-on" : ""}`} aria-hidden="true"><IconCheck size={30} /></div>
      <h1 className="h1 mt-4">You&apos;re booked.</h1>
      <p className="lede mt-3">
        {service && barber ? <>{service} with {barber}</> : "Your appointment is set"}
        {date && <>, {fmtDate(date, "long")}</>}{time && <> at {fmtTime(time)}</>}.
      </p>

      <div className="placard mt-6">
        <dl className="sum-rows">
          {service && <div className="sum-row"><dt>Service</dt><dd>{service}</dd></div>}
          {barber && <div className="sum-row"><dt>Barber</dt><dd>{barber}</dd></div>}
          {date && <div className="sum-row"><dt>When</dt><dd>{fmtDate(date)}{time && `, ${fmtTime(time)}`}</dd></div>}
          {paidOnline && deposit && <div className="sum-row"><dt>Deposit paid</dt><dd>{money(deposit)}</dd></div>}
          {paidOnline && remaining && parseFloat(remaining) > 0 && (
            <div className="sum-row sum-total"><dt>Due in the chair</dt><dd className="price" style={{ fontSize: "1.25rem" }}>{money(remaining)}</dd></div>
          )}
          {!paidOnline && price && (
            <div className="sum-row sum-total"><dt>Pay at the shop</dt><dd className="price" style={{ fontSize: "1.25rem" }}>{money(price)}</dd></div>
          )}
        </dl>
      </div>

      <Notice tone="info" className="mt-5">
        {ADDRESS_LINE}. Get there five minutes early; your chair is held for 15 minutes past your time.
        A confirmation text is on its way.
      </Notice>

      <div className="stack mt-6" style={{ "--stack": "10px" }}>
        <a href="/dashboard" className="btn btn-primary btn-lg btn-block">See my appointments</a>
        <div className="row" style={{ gap: 10 }}>
          {date && time && (
            <button className="btn btn-ghost grow" onClick={addToCalendar}><IconCalendar /> Add to calendar</button>
          )}
          <a className="btn btn-ghost grow" href={SHOP.mapsLink} target="_blank" rel="noopener noreferrer"><IconPin /> Directions</a>
        </div>
      </div>
    </AuthShell>
  );
}

export default function BookingConfirmedPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmedContent />
    </Suspense>
  );
}
