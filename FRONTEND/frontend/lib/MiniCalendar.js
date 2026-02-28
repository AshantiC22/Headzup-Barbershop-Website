// lib/MiniCalendar.js
// Compact calendar for use inside reschedule modals
// Usage: <MiniCalendar selected={date} onSelect={setDate} sf={sf} />
"use client";

import { useState } from "react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function MiniCalendar({
  selected,
  onSelect,
  sf = {},
  maxDaysOut = 60,
  blockSundays = true,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = toISO(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxDaysOut);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const canPrev = !(
    viewYear === today.getFullYear() && viewMonth === today.getMonth()
  );
  const canNext = new Date(viewYear, viewMonth + 1, 1) <= maxDate;

  const prev = () => {
    if (!canPrev) return;
    viewMonth === 0
      ? (setViewYear((y) => y - 1), setViewMonth(11))
      : setViewMonth((m) => m - 1);
  };
  const next = () => {
    if (!canNext) return;
    viewMonth === 11
      ? (setViewYear((y) => y + 1), setViewMonth(0))
      : setViewMonth((m) => m + 1);
  };

  const getStatus = (day) => {
    if (!day) return "empty";
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    if (d < today) return "past";
    if (d > maxDate) return "far";
    if (blockSundays && d.getDay() === 0) return "sunday";
    return "ok";
  };

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        background: "#080808",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "11px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <button
          onClick={prev}
          disabled={!canPrev}
          style={{
            width: 28,
            height: 28,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            color: canPrev ? "#a1a1aa" : "#2a2a2a",
            cursor: canPrev ? "pointer" : "default",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (canPrev) {
              e.currentTarget.style.borderColor = "#f59e0b";
              e.currentTarget.style.color = "#f59e0b";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = canPrev ? "#a1a1aa" : "#2a2a2a";
          }}
        >
          ‹
        </button>
        <p
          style={{
            ...sf,
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            margin: 0,
          }}
        >
          {MONTHS[viewMonth]}{" "}
          <span style={{ color: "#f59e0b" }}>{viewYear}</span>
        </p>
        <button
          onClick={next}
          disabled={!canNext}
          style={{
            width: 28,
            height: 28,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            color: canNext ? "#a1a1aa" : "#2a2a2a",
            cursor: canNext ? "pointer" : "default",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (canNext) {
              e.currentTarget.style.borderColor = "#f59e0b";
              e.currentTarget.style.color = "#f59e0b";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = canNext ? "#a1a1aa" : "#2a2a2a";
          }}
        >
          ›
        </button>
      </div>

      {/* Day labels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          padding: "8px 10px 3px",
        }}
      >
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              ...sf,
              fontSize: 7,
              letterSpacing: "0.15em",
              color: d === "Su" ? "#3a3a3a" : "#3f3f46",
              padding: "3px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 1,
          padding: "2px 10px 10px",
        }}
      >
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const iso = toISO(viewYear, viewMonth, day);
          const status = getStatus(day);
          const isSel = selected === iso;
          const isToday = iso === todayISO;
          const dim =
            status === "past" || status === "far" || status === "sunday";

          return (
            <button
              key={iso}
              onClick={() => status === "ok" && onSelect(iso)}
              style={{
                aspectRatio: "1/1",
                border: isSel
                  ? "1px solid #f59e0b"
                  : isToday
                    ? "1px solid rgba(245,158,11,0.3)"
                    : "1px solid transparent",
                background: isSel ? "#f59e0b" : "transparent",
                color: isSel
                  ? "black"
                  : dim
                    ? "#252525"
                    : isToday
                      ? "#f59e0b"
                      : "#c4c4c8",
                cursor: status === "ok" ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontFamily: "'DM Mono',monospace",
                fontWeight: isSel || isToday ? 700 : 400,
                transition: "all 0.12s",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (status === "ok" && !isSel) {
                  e.currentTarget.style.background = "rgba(245,158,11,0.1)";
                  e.currentTarget.style.color = "#f59e0b";
                  e.currentTarget.style.borderColor = "rgba(245,158,11,0.2)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSel) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = dim
                    ? "#252525"
                    : isToday
                      ? "#f59e0b"
                      : "#c4c4c8";
                  e.currentTarget.style.borderColor = isToday
                    ? "rgba(245,158,11,0.3)"
                    : "transparent";
                }
              }}
            >
              {day}
              {isToday && !isSel && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 2,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 2.5,
                    height: 2.5,
                    borderRadius: "50%",
                    background: "#f59e0b",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date strip */}
      {selected && (
        <div
          style={{
            padding: "8px 14px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(245,158,11,0.04)",
          }}
        >
          <p
            style={{
              ...sf,
              fontSize: 7,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#f59e0b",
              margin: 0,
            }}
          >
            {new Date(selected + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      )}
    </div>
  );
}
