"use client";
// Month calendar + time slots, shared by booking and rescheduling.
import { useEffect, useMemo, useRef, useState } from "react";
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

const KEY_DAYS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

function addDaysStr(ds, n) {
  const d = parseDate(ds);
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

/**
 * Month grid. Keyboard: one Tab stop for the whole month; arrows move a day or
 * a week (skipping days that can't be booked), Home/End go to the ends of the
 * week, Page Up/Down change month, Enter or Space picks the day.
 */
export function Calendar({ value, onChange, isDisabled, label = "Choose a day" }) {
  const start = value ? parseDate(value) : new Date();
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const gridRef = useRef(null);
  const pendingFocus = useRef(null);
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

  const open = cells.filter((ds) => ds && !isDisabled(ds));
  const tabStop = open.includes(value) ? value : open.includes(today) ? today : open[0];

  // After a keyboard move into another month, focus lands once it renders.
  useEffect(() => {
    if (!pendingFocus.current) return;
    gridRef.current?.querySelector(`[data-date="${pendingFocus.current}"]`)?.focus();
    pendingFocus.current = null;
  }, [cells]);

  const monthName = new Date(view.y, view.m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const step = (n) =>
    setView((v) => {
      const d = new Date(v.y, v.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const focusDay = (ds) => {
    const d = parseDate(ds);
    if (d.getFullYear() === view.y && d.getMonth() === view.m) {
      gridRef.current?.querySelector(`[data-date="${ds}"]`)?.focus();
    } else {
      pendingFocus.current = ds;
      setView({ y: d.getFullYear(), m: d.getMonth() });
    }
  };

  const onKeyDown = (e) => {
    const from = e.target.dataset?.date;
    if (!from) return;
    let target = null;
    if (e.key in KEY_DAYS) {
      // Walk in that direction to the next day that can be booked (within ~2 months).
      let ds = from;
      for (let i = 0; i < 62 && !target; i++) {
        ds = addDaysStr(ds, KEY_DAYS[e.key]);
        if (ds < today) break;
        if (!isDisabled(ds)) target = ds;
      }
    } else if (e.key === "Home" || e.key === "End") {
      const dow = (parseDate(from).getDay() + 6) % 7;
      const edge = addDaysStr(from, e.key === "Home" ? -dow : 6 - dow);
      target = isDisabled(edge) ? null : edge;
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      // Same day of the month in the next/previous month, or the first bookable day after it.
      if (e.key === "PageUp" && atMin) return;
      const d = parseDate(from);
      const want = new Date(d.getFullYear(), d.getMonth() + (e.key === "PageUp" ? -1 : 1), 1);
      want.setDate(Math.min(d.getDate(), new Date(want.getFullYear(), want.getMonth() + 1, 0).getDate()));
      let ds = localDateStr(want);
      for (let i = 0; i < 31 && (ds < today || isDisabled(ds)); i++) ds = addDaysStr(ds, 1);
      target = ds >= today && !isDisabled(ds) ? ds : null;
    } else return;
    e.preventDefault();
    if (target) focusDay(target);
  };

  return (
    <div role="group" aria-label={label}>
      <div className="cal-head">
        <button
          type="button"
          className="icon-btn"
          onClick={() => step(-1)}
          disabled={atMin}
          aria-label="Previous month"
        >
          <IconChevronLeft size={22} />
        </button>
        <p className="h4" aria-live="polite">
          {monthName}
        </p>
        <button type="button" className="icon-btn" onClick={() => step(1)} aria-label="Next month">
          <IconChevronRight size={22} />
        </button>
      </div>
      <div className="cal-grid" ref={gridRef} onKeyDown={onKeyDown}>
        {DOW.map((d) => (
          <div key={d} className="cal-dow" aria-hidden="true">
            {d.charAt(0)}
            <span className="sr-only">{d}</span>
          </div>
        ))}
        {cells.map((ds, i) => {
          if (!ds) return <div key={`b${i}`} />;
          const disabled = isDisabled(ds);
          const sel = value === ds;
          const d = parseDate(ds);
          return (
            <button
              key={ds}
              type="button"
              data-date={ds}
              className={`cal-day ${sel ? "is-selected" : ""} ${ds === today ? "is-today" : ""}`}
              disabled={disabled}
              aria-pressed={sel}
              tabIndex={ds === tabStop ? 0 : -1}
              aria-label={`${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}${ds === today ? ", today" : ""}${disabled ? ", not available" : ""}`}
              onClick={() => onChange(ds)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
      <p className="sr-only">Use the arrow keys to move between days and Enter to choose one.</p>
    </div>
  );
}

export function SlotPicker({ slots, value, onChange, loading }) {
  if (loading) {
    return (
      <div className="slots" aria-busy="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} h={46} />
        ))}
      </div>
    );
  }
  const groups = {};
  slots.forEach((t) => {
    (groups[partOfDay(t)] ||= []).push(t);
  });
  return (
    <div className="stack" style={{ "--stack": "18px" }}>
      {["Morning", "Afternoon", "Evening"]
        .filter((g) => groups[g])
        .map((g) => (
          <div key={g}>
            <p className="small muted mb-2" style={{ fontWeight: 650 }}>
              {g}
            </p>
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
    <ul className="work-week small mt-4" aria-label="Working days">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => {
        const info = allDays.find((x) => x.day_of_week === i);
        const on = info?.is_working;
        return (
          <li key={d} className={on ? "" : "is-off"}>
            <strong>{d}</strong>{" "}
            {on && info.start_time ? `${fmtTime(info.start_time)}–${fmtTime(info.end_time)}` : "off"}
          </li>
        );
      })}
    </ul>
  );
}
