"use client";
// Month calendar + time slots, shared by booking and rescheduling.
import { useMemo, useState } from "react";
import { IconChevronLeft, IconChevronRight, Skeleton } from "@/components/ui/Feedback";
import { fmtTime, localDateStr, parseDate, partOfDay, todayStr } from "@/lib/time";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Rule for which days can be booked with a barber. */
export function makeDayRule(allDays = [], timeOff = []) {
  return (dateStr) => {
    const d = parseDate(dateStr);
    const today = parseDate(todayStr());
    if (d < today) return true;
    if (d.getDay() === 0) return true;
    if (timeOff.includes(dateStr)) return true;
    if (!allDays.length) return true;
    const dow = (d.getDay() + 6) % 7; // Mon = 0
    const info = allDays.find((x) => x.day_of_week === dow);
    return !info || !info.is_working;
  };
}

export function Calendar({ value, onChange, isDisabled, label = "Choose a day" }) {
  const start = value ? parseDate(value) : new Date();
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const now = new Date();
  const atMin = view.y === now.getFullYear() && view.m === now.getMonth();
  const today = todayStr();

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const days = new Date(view.y, view.m + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const out = Array(offset).fill(null);
    for (let d = 1; d <= days; d++) out.push(localDateStr(new Date(view.y, view.m, d)));
    return out;
  }, [view]);

  const monthName = new Date(view.y, view.m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const step = (n) => setView((v) => {
    const d = new Date(v.y, v.m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  return (
    <div role="group" aria-label={label}>
      <div className="cal-head">
        <button className="icon-btn" onClick={() => step(-1)} disabled={atMin} aria-label="Previous month"
          style={atMin ? { opacity: 0.3, cursor: "not-allowed" } : undefined}>
          <IconChevronLeft size={22} />
        </button>
        <p className="h4" aria-live="polite">{monthName}</p>
        <button className="icon-btn" onClick={() => step(1)} aria-label="Next month">
          <IconChevronRight size={22} />
        </button>
      </div>
      <div className="cal-grid">
        {DOW.map((d) => <div key={d} className="cal-dow" aria-hidden="true">{d.charAt(0)}<span className="sr-only">{d}</span></div>)}
        {cells.map((ds, i) => {
          if (!ds) return <div key={`b${i}`} />;
          const disabled = isDisabled(ds);
          const sel = value === ds;
          const d = parseDate(ds);
          return (
            <button key={ds} className={`cal-day ${sel ? "is-selected" : ""} ${ds === today ? "is-today" : ""}`}
              disabled={disabled} aria-pressed={sel}
              aria-label={`${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}${disabled ? ", not available" : ""}`}
              onClick={() => onChange(ds)}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SlotPicker({ slots, value, onChange, loading }) {
  if (loading) {
    return (
      <div className="slots" aria-busy="true">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={46} />)}
      </div>
    );
  }
  const groups = {};
  slots.forEach((t) => { (groups[partOfDay(t)] ||= []).push(t); });
  return (
    <div className="stack" style={{ "--stack": "18px" }}>
      {["Morning", "Afternoon", "Evening"].filter((g) => groups[g]).map((g) => (
        <div key={g}>
          <p className="small muted" style={{ marginBottom: 8, fontWeight: 650 }}>{g}</p>
          <div className="slots">
            {groups[g].map((t) => (
              <button key={t} className="slot" aria-pressed={value === t} onClick={() => onChange(t)}>
                {fmtTime(t)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkWeek({ allDays }) {
  if (!allDays?.length) return null;
  return (
    <ul className="row-wrap small" style={{ listStyle: "none", gap: "6px 16px", marginTop: 14 }} aria-label="Working days">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => {
        const info = allDays.find((x) => x.day_of_week === i);
        const on = info?.is_working;
        return (
          <li key={d} style={{ color: on ? "var(--ink-2)" : "var(--ink-3)", opacity: on ? 1 : 0.6 }}>
            <strong style={{ color: on ? "var(--ink)" : "inherit" }}>{d}</strong>{" "}
            {on && info.start_time ? `${fmtTime(info.start_time)}–${fmtTime(info.end_time)}` : "off"}
          </li>
        );
      })}
    </ul>
  );
}
