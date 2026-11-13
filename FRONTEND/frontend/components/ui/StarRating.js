"use client";
// Five painted stars. Arrow keys work; it's a real radio group.
import { useState } from "react";
import { IconStar } from "./Feedback";
import { arrowSelect, rovingIndex } from "./roving";

const STARS = [1, 2, 3, 4, 5];
export const RATING_WORDS = ["", "Not great", "It was okay", "Pretty good", "Really good", "Absolutely fire"];

export default function StarRating({ value, onChange, size = 38, label = "Rating" }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const onKey = (e) => arrowSelect(e, STARS, value, onChange);
  return (
    <div>
      <div role="radiogroup" aria-label={label} className="stars" onKeyDown={onKey} onMouseLeave={() => setHover(0)}>
        {STARS.map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
            tabIndex={rovingIndex(n, value, STARS)}
            className={`star ${n <= shown ? "is-lit" : ""}`} onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}>
            <IconStar filled={n <= shown} size={size} />
          </button>
        ))}
      </div>
      <p className="caption mt-2 star-words" aria-live="polite">{RATING_WORDS[shown]}</p>
    </div>
  );
}
