// HEADZ UP, faded. Each letter steps down in weight and out in width, the way
// a skin fade runs from full hair to bare skin: the H is the heaviest, the P
// the lightest, and no single step is big enough to point at.
//
// `sweep` plays the one entrance on the site: a clipper's yellow edge passes
// left to right and the letters are there behind it. It's clip-path and
// transform only, so nothing on the page moves while it runs.
const WORD = "HEADZ UP";

// heaviest, narrowest → lightest, widest
const FROM = { wght: 900, wdth: 56 };
const TO = { wght: 220, wdth: 124 };

export function fadeAxes(i, n) {
  const t = n > 1 ? i / (n - 1) : 0;
  return {
    wght: Math.round(FROM.wght + (TO.wght - FROM.wght) * t),
    wdth: Math.round(FROM.wdth + (TO.wdth - FROM.wdth) * t),
  };
}

export default function Wordmark({
  as: Tag = "p",
  id,
  text = WORD,
  label = "Headz Up",
  sweep = false,
  className = "",
}) {
  const n = text.replace(/\s/g, "").length;
  let i = 0;
  return (
    <Tag id={id} className={`wordmark ${sweep ? "wordmark-sweep" : ""} ${className}`}>
      <span className="sr-only">{label}</span>
      <span className="wordmark-letters" aria-hidden="true">
        {text.split("").map((ch, k) => {
          if (ch === " ") return <span key={k} className="wordmark-gap" />;
          const { wght, wdth } = fadeAxes(i++, n);
          return (
            <span key={k} style={{ fontWeight: wght, fontStretch: `${wdth}%` }}>
              {ch}
            </span>
          );
        })}
      </span>
      {sweep && <span className="wordmark-clipper" aria-hidden="true" />}
    </Tag>
  );
}
