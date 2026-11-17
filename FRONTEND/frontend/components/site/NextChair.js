"use client";
// The top of the home page: the earliest open time in the shop, and one
// button that takes it. Every way this can go has its own answer: still
// checking, slow, found, the week's full, the book didn't load.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconPhone, IconRefresh } from "@/components/ui/Feedback";
import { SHOP } from "@/lib/shop";
import { addDays, fmtDate, fmtTime } from "@/lib/time";
import { alternatives, bookingHref, fetchBarbers, findNextChair, shopToday } from "@/lib/nextChair";

const SLOW_MS = 3500;
const STALE_MS = 3 * 60_000;

/**
 * Barbers and the next open chair, loaded together.
 *   barbers: { status: "loading" | "ready" | "failed", list }
 *   chair:   { status: "loading" | "found" | "full" | "nobody" | "failed", date, openings, partial, slow }
 */
export function useShopBook() {
  const [barbers, setBarbers] = useState({ status: "loading", list: [] });
  const [chair, setChair] = useState({ status: "loading", openings: [] });
  const [attempt, setAttempt] = useState(0);
  const checkedAt = useRef(0);

  useEffect(() => {
    const ctrl = new AbortController();
    const slow = setTimeout(() => setChair((c) => (c.status === "loading" ? { ...c, slow: true } : c)), SLOW_MS);
    (async () => {
      let list;
      try {
        list = await fetchBarbers({ signal: ctrl.signal });
        setBarbers({ status: "ready", list });
      } catch {
        if (ctrl.signal.aborted) return;
        setBarbers((b) => (b.list.length ? b : { status: "failed", list: [] }));
        setChair((c) => (c.status === "found" ? c : { status: "failed", openings: [] }));
        return;
      }
      try {
        const today = shopToday();
        const got = await findNextChair({ barbers: list, today, signal: ctrl.signal });
        checkedAt.current = Date.now();
        setChair(
          got.openings.length
            ? { status: "found", today, date: got.date, openings: got.openings, partial: got.partial }
            : { status: list.length ? "full" : "nobody", today, openings: [] },
        );
      } catch {
        if (ctrl.signal.aborted) return;
        // keep showing an earlier answer rather than swapping it for an error
        setChair((c) => (c.status === "found" ? c : { status: "failed", openings: [] }));
      }
    })().finally(() => clearTimeout(slow));
    return () => {
      ctrl.abort();
      clearTimeout(slow);
    };
  }, [attempt]);

  // Coming back to the tab later: the time we showed may have gone.
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState === "visible" && checkedAt.current && Date.now() - checkedAt.current > STALE_MS) {
        setAttempt((n) => n + 1);
      }
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, []);

  const retry = useCallback(() => {
    setChair({ status: "loading", openings: [] });
    setBarbers((b) => (b.status === "failed" ? { status: "loading", list: [] } : b));
    setAttempt((n) => n + 1);
  }, []);

  return { barbers, chair, retry };
}

const firstName = (name = "") => name.trim().split(/\s+/)[0] || name;

/** "today" / "tomorrow" / "Wednesday" / "Wed, Nov 25" for dates further out. */
export function dayWord(date, today) {
  if (!date || !today) return "";
  if (date === today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  if (date <= addDays(today, 6)) return fmtDate(date, "long").split(",")[0];
  return fmtDate(date);
}

/** "2:30" for the button: the big time above it already says AM or PM. */
const clock = (t) => fmtTime(t).replace(/\s?[AP]M$/, "");

function takeLabel(date, today, time) {
  const day = dayWord(date, today);
  if (day === "today") return `Take the ${clock(time)}`;
  if (day === "tomorrow") return `Take tomorrow's ${clock(time)}`;
  return `Take ${day}'s ${clock(time)}`;
}

export default function NextChair({ chair, retry }) {
  const { status } = chair;

  if (status === "loading") {
    return (
      <section className="chair" aria-labelledby="chair-title" aria-busy="true">
        <h2 id="chair-title" className="chair-title">
          Next open chair
        </h2>
        <p className="chair-checking" role="status">
          <span className="spinner" aria-hidden="true" />
          {chair.slow ? "Still checking. The book is slow to answer right now." : "Checking every barber's book"}
        </p>
        <div className="chair-time chair-time-ghost wet" aria-hidden="true">
          0:00
        </div>
        <Link href="/book" className="btn btn-ghost btn-lg">
          Pick a time yourself
        </Link>
        {/* holds the room the other open times take once they load */}
        <div className="chair-more-ghost" aria-hidden="true" />
      </section>
    );
  }

  if (status === "failed") {
    return (
      <section className="chair" aria-labelledby="chair-title">
        <h2 id="chair-title" className="chair-title">
          Next open chair
        </h2>
        <p className="chair-line">
          The shop&apos;s book didn&apos;t load, so open times can&apos;t show here. Call and we&apos;ll find you a
          chair, or try again.
        </p>
        <div className="row-wrap mt-5">
          <a href={`tel:${SHOP.phone}`} className="btn btn-primary btn-lg">
            <IconPhone /> {SHOP.phoneDisplay}
          </a>
          <button type="button" className="btn btn-ghost btn-lg" onClick={retry}>
            <IconRefresh /> Try again
          </button>
        </div>
      </section>
    );
  }

  if (status === "nobody") {
    return (
      <section className="chair" aria-labelledby="chair-title">
        <h2 id="chair-title" className="chair-title">
          Next open chair
        </h2>
        <p className="chair-line">
          No barbers are taking bookings online right now. Call the shop and they&apos;ll find you a chair.
        </p>
        <div className="row-wrap mt-5">
          <a href={`tel:${SHOP.phone}`} className="btn btn-primary btn-lg">
            <IconPhone /> {SHOP.phoneDisplay}
          </a>
        </div>
      </section>
    );
  }

  if (status === "full") {
    return (
      <section className="chair" aria-labelledby="chair-title">
        <h2 id="chair-title" className="chair-title">
          Next open chair
        </h2>
        <p className="chair-line">
          Every chair is booked for the next week. Join the waitlist and you&apos;ll get a text when a time opens up.
        </p>
        <div className="row-wrap mt-5">
          <Link href="/waitlist" className="btn btn-primary btn-lg">
            Join the waitlist
          </Link>
          <a href={`tel:${SHOP.phone}`} className="btn btn-ghost btn-lg">
            <IconPhone /> Call the shop
          </a>
        </div>
      </section>
    );
  }

  const [lead] = chair.openings;
  const more = alternatives(chair.openings, 3);
  const day = dayWord(chair.date, chair.today);
  return (
    <section className="chair is-found" aria-labelledby="chair-title">
      <h2 id="chair-title" className="chair-title">
        Next open chair
      </h2>
      <p className="chair-time num">
        <time dateTime={`${chair.date}T${lead.time}`}>{fmtTime(lead.time)}</time>
      </p>
      <p className="chair-line">
        <span className="chair-day">{day}</span>, with {firstName(lead.barber.name)}
      </p>
      <Link href={bookingHref(lead, chair.date)} className="btn btn-signal btn-lg chair-take">
        {takeLabel(chair.date, chair.today, lead.time)}
      </Link>
      {more.length > 0 && (
        <div className="chair-more">
          <p className="small muted">Or {day}:</p>
          <ul role="list">
            {more.map((o) => (
              <li key={`${o.barber.id}-${o.time}`}>
                <Link href={bookingHref(o, chair.date)} className="chair-alt">
                  <span className="num">{fmtTime(o.time)}</span> with {firstName(o.barber.name)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {chair.partial && (
        <p className="tiny faint mt-3">Some barbers&apos; books didn&apos;t load. The booking page shows everyone.</p>
      )}
    </section>
  );
}
