// ─────────────────────────────────────────────────────────────────────────────
// Date and time helpers.
// Every date string in the API is a plain "YYYY-MM-DD" (shop-local), and every
// time is "HH:MM" or "HH:MM:SS". These helpers never go through UTC, which is
// what made "today" flip to tomorrow after 6 PM in the old pages.
// ─────────────────────────────────────────────────────────────────────────────
import { HOURS, SHOP } from "./shop";

const pad = (n) => String(n).padStart(2, "0");

/** Local calendar date as YYYY-MM-DD (not UTC). */
export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr() {
  return localDateStr(new Date());
}

export function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

/** "YYYY-MM-DD" → Date at local midnight. */
export function parseDate(dateStr) {
  const [y, m, d] = String(dateStr || "").split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

/** Accepts "14:30", "14:30:00" or "2:30 PM" and returns minutes since midnight. */
export function toMinutes(t) {
  if (!t) return 0;
  const s = String(t).trim();
  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (ampm) {
    let h = parseInt(ampm[1], 10) % 12;
    if (/p/i.test(ampm[3])) h += 12;
    return h * 60 + parseInt(ampm[2], 10);
  }
  const [h, m] = s.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

/** Any time format → "HH:MM:SS" for the API. */
export function to24Hour(t) {
  const mins = toMinutes(t);
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}:00`;
}

/** Any time format → "2:30 PM". */
export function fmtTime(t) {
  if (!t && t !== 0) return "";
  const mins = toMinutes(t);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
}

export function fmtDate(dateStr, style = "short") {
  if (!dateStr) return "";
  const d = parseDate(dateStr);
  const opts =
    style === "long"   ? { weekday: "long", month: "long", day: "numeric" } :
    style === "full"   ? { weekday: "long", month: "long", day: "numeric", year: "numeric" } :
    style === "day"    ? { weekday: "short" } :
                         { weekday: "short", month: "short", day: "numeric" };
  return d.toLocaleDateString("en-US", opts);
}

/** Date + time strings → a local Date. */
export function apptDate(dateStr, timeStr) {
  const d = parseDate(dateStr);
  const mins = toMinutes(timeStr);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
}

/** "in 3 days", "in 2 hours", "in 20 minutes", or null if past. */
export function timeUntil(dateStr, timeStr) {
  const diff = apptDate(dateStr, timeStr) - new Date();
  if (diff < 0) return null;
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins} minute${mins === 1 ? "" : "s"}`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `in ${hrs} hour${hrs === 1 ? "" : "s"}`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

/** Bucket a slot into morning / afternoon / evening for grouping. */
export function partOfDay(t) {
  const m = toMinutes(t);
  if (m < 12 * 60) return "Morning";
  if (m < 17 * 60) return "Afternoon";
  return "Evening";
}

// ── Shop open/closed, computed in Central time wherever the visitor is ──────
function shopNowParts() {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: SHOP.timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    const dayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
    const h = parseInt(parts.hour, 10) % 24;
    return { day: dayIdx, minutes: h * 60 + parseInt(parts.minute, 10) };
  } catch {
    const d = new Date();
    return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
  }
}

/**
 * Returns { open, label, detail, today } for the shop right now.
 * label is short ("Open now"), detail says what's next ("until 6:00 PM").
 */
export function shopStatus() {
  const { day, minutes } = shopNowParts();
  const today = HOURS[day];
  if (today.open && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) {
    const left = toMinutes(today.close) - minutes;
    return {
      open: true,
      today: day,
      label: left <= 45 ? "Closing soon" : "Open now",
      detail: `until ${fmtTime(today.close)}`,
    };
  }
  // Find the next opening
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7;
    const h = HOURS[d];
    if (!h.open) continue;
    if (i === 0 && minutes >= toMinutes(h.open)) continue;
    const when = i === 0 ? "today" : i === 1 ? "tomorrow" : h.label;
    return { open: false, today: day, label: "Closed now", detail: `opens ${when} at ${fmtTime(h.open)}` };
  }
  return { open: false, today: day, label: "Closed now", detail: "" };
}
