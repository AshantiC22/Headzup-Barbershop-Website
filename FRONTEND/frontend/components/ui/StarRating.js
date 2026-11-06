"use client";
// Five painted stars. Arrow keys work; it's a real radio group.
import { useState } from "react";
import { IconStar } from "./Feedback";

export const RATING_WORDS = ["", "Not great", "It was okay", "Pretty good", "Really good", "Absolutely fire"];

export default function StarRating({ value, onChange, size = 38, label = "Rating" }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const onKey = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(5, value + 1)); }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(1, value - 1)); }
  };
  return (
    <div>
      <div role="radiogroup" aria-label={label} className="stars" onKeyDown={onKey} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
            tabIndex={value === n || (!value && n === 1) ? 0 : -1}
            className={`star ${n <= shown ? "is-lit" : ""}`} onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}>
            <IconStar filled={n <= shown} size={size} />
          </button>
        ))}
      </div>
      <p className="caption" style={{ marginTop: 6, minHeight: "1.5em" }} aria-live="polite">{RATING_WORDS[shown]}</p>
    </div>
  );
}
