// The next open chair: the earliest time any barber can take you, today first.
//
// The slot endpoint is public, so the home page can ask before anyone logs in.
// It's one request per barber per day, so we walk forward a day at a time and
// stop at the first day with an opening. Every request has a timeout; a slow
// or dead API gives the page an answer to show (call the shop) instead of a
// spinner that never stops.
import { API_ROOT } from "./config";
import { addDays, parseDate, toMinutes } from "./time";

export const LOOK_AHEAD_DAYS = 7;
export const REQUEST_TIMEOUT_MS = 6000;

const pad = (n) => String(n).padStart(2, "0");

/** "14:30:00" → "14:30". */
export const hhmm = (t) => {
  const m = toMinutes(t);
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

/** Today's date in the shop (Central time), wherever the visitor is. */
export function shopToday(now = new Date(), timeZone = "America/Chicago") {
  try {
    // en-CA formats as YYYY-MM-DD
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
      now,
    );
  } catch {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
}

/**
 * Every opening on one day, earliest first; ties go to the barber listed first.
 * results: [{ barber, slots: ["14:30:00", …] }]
 */
export function pickOpenings(results) {
  const out = [];
  results.forEach(({ barber, slots }, order) => {
    const seen = new Set();
    for (const raw of slots || []) {
      if (typeof raw !== "string" || !/^\d{1,2}:\d{2}/.test(raw)) continue;
      const time = hhmm(raw);
      if (seen.has(time)) continue;
      seen.add(time);
      out.push({ barber, time, order });
    }
  });
  out.sort((a, b) => toMinutes(a.time) - toMinutes(b.time) || a.order - b.order);
  return out.map(({ barber, time }) => ({ barber, time }));
}

/**
 * The lead opening plus a few alternatives worth offering: the next time with
 * each other barber first, then later times with anyone.
 */
export function alternatives(openings, max = 3) {
  const [lead, ...rest] = openings;
  if (!lead) return [];
  const picked = [];
  const used = new Set([lead.barber.id]);
  for (const o of rest) {
    if (picked.length >= max) break;
    if (!used.has(o.barber.id)) {
      used.add(o.barber.id);
      picked.push(o);
    }
  }
  for (const o of rest) {
    if (picked.length >= max) break;
    if (!picked.includes(o) && o.time !== lead.time) picked.push(o);
  }
  return picked.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
}

/** fetch() that gives up after `ms`, and also when `signal` aborts. */
async function fetchJson(url, { signal, ms = REQUEST_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), ms);
  const onAbort = () => ctrl.abort(signal.reason);
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    return { status: res.status, ok: res.ok, data: res.ok ? await res.json() : null };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/** Barbers taking bookings, from the public list. Throws when the API can't be reached. */
export async function fetchBarbers({ signal, fetchImpl } = {}) {
  const { ok, status, data } = await fetchJson(`${API_ROOT}/api/barbers/`, { signal, fetchImpl });
  if (!ok) throw new Error(`barbers ${status}`);
  return (Array.isArray(data) ? data : data?.results || []).filter((b) => b && b.id && b.name);
}

/** One barber's open times on one day. A barber who's off or inactive has none. */
export async function fetchSlots(barberId, date, { signal, fetchImpl } = {}) {
  const url = `${API_ROOT}/api/available-slots/?barber=${encodeURIComponent(barberId)}&date=${date}`;
  const { ok, status, data } = await fetchJson(url, { signal, fetchImpl });
  if (status === 404) return [];
  if (!ok) throw new Error(`slots ${status}`);
  return Array.isArray(data?.available_slots) ? data.available_slots : [];
}

/**
 * Walks forward from `today` and returns the first day with an opening:
 *   { date, openings, partial }   partial: some barbers' books didn't load
 *   { date: null, openings: [] }  nobody has anything in the window
 * Throws only when no barber's book could be read at all.
 */
export async function findNextChair({
  barbers,
  today = shopToday(),
  days = LOOK_AHEAD_DAYS,
  getSlots = fetchSlots,
  signal,
}) {
  if (!barbers?.length) return { date: null, openings: [], partial: false };
  let anyRead = false;
  let partial = false;
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    if (parseDate(date).getDay() === 0) continue; // closed Sundays
    const settled = await Promise.allSettled(barbers.map((b) => getSlots(b.id, date, { signal })));
    if (signal?.aborted) throw signal.reason ?? new Error("aborted");
    const read = [];
    settled.forEach((r, idx) => {
      if (r.status === "fulfilled") read.push({ barber: barbers[idx], slots: r.value });
      else partial = true;
    });
    if (!read.length) {
      // the first day failing for everyone means the API is down; later days
      // failing after earlier ones worked is the same thing, mid-walk
      throw new Error("No barber's book could be read");
    }
    anyRead = true;
    const openings = pickOpenings(read);
    if (openings.length) return { date, openings, partial };
  }
  return { date: null, openings: [], partial: partial && anyRead };
}

/** /book link that lands on the confirm step with this time held in the form. */
export function bookingHref({ barber, time }, date, service) {
  const q = new URLSearchParams({ barber: String(barber.id), date, time });
  if (service) q.set("service", service);
  return `/book?${q.toString()}`;
}
