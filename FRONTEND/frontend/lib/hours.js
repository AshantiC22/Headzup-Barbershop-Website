// The shop's week. Barbers set it from their dashboard and the API serves it
// at shop/hours/ (0 = Monday there). The site works in JS getDay() order
// (0 = Sunday) because that's what Date gives us.
//
// DEFAULT_HOURS is only a fallback: what shows if the API can't be reached
// at all, so the footer never goes blank.

export const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Monday first, the way people read a week (and the way the API stores it). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Mon–Fri 9–6, Sat 9–4, closed Sunday. Times are 24h, Central.
export const DEFAULT_HOURS = DAY_LABELS.map((label, day) => ({
  day,
  label,
  open: day === 0 ? null : "09:00",
  close: day === 0 ? null : day === 6 ? "16:00" : "18:00",
}));

const HHMM = /^([01]\d|2[0-3]):[0-5]\d/;

/**
 * API payload → site week, or null when it isn't a full, sane week (so the
 * caller keeps what it had rather than showing half a schedule).
 */
export function fromApi(data) {
  const days = data?.days;
  if (!Array.isArray(days) || days.length !== 7) return null;
  const out = new Array(7).fill(null);
  for (const d of days) {
    const apiDay = Number(d?.day_of_week);
    if (!Number.isInteger(apiDay) || apiDay < 0 || apiDay > 6) return null;
    const day = (apiDay + 1) % 7;
    if (out[day]) return null;
    const open = typeof d.open_time === "string" && HHMM.test(d.open_time) ? d.open_time.slice(0, 5) : null;
    const close = typeof d.close_time === "string" && HHMM.test(d.close_time) ? d.close_time.slice(0, 5) : null;
    const isOpen = d.is_open === true && open && close && open < close;
    out[day] = { day, label: DAY_LABELS[day], open: isOpen ? open : null, close: isOpen ? close : null };
  }
  return out;
}

/** Who last changed the hours, if a barber ever has. */
export function metaFromApi(data) {
  return data?.updated_by && data?.updated_at ? { by: data.updated_by, at: data.updated_at } : null;
}

/**
 * Editor rows (Monday first) → API body. Closed days keep whatever times
 * were in the inputs so reopening a day brings them back.
 */
export function toApi(rows) {
  return {
    days: rows.map((r) => ({
      day_of_week: (r.day + 6) % 7,
      is_open: !!r.isOpen,
      open_time: r.open,
      close_time: r.close,
    })),
  };
}

/** The first thing wrong with an edited week, as a sentence, or "". */
export function weekProblem(rows) {
  for (const r of rows) {
    if (!r.isOpen) continue;
    if (!HHMM.test(r.open || "") || !HHMM.test(r.close || "")) return `${r.label} needs an opening and a closing time.`;
    if (r.open >= r.close) return `${r.label} closes before it opens.`;
  }
  if (!rows.some((r) => r.isOpen)) {
    return "The shop has to be open at least one day. For time away, block days off instead.";
  }
  return "";
}
