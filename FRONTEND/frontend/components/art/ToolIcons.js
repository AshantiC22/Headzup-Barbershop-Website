// The barber's tools, drawn like engravings: an outline, a solid fill so a
// tool laid across another hides what's under it, and thin hatching for
// shade. A service with two tools shows them crossed, crest-style.
//
// Fill comes from --tool-fill (set by the container), lines from currentColor.
// The fill has to go through style: SVG presentation attributes ignore var().

const hatch = { strokeWidth: 0.8, opacity: 0.55 };

const range = (from, to, step) => {
  const out = [];
  for (let v = from; v <= to + 1e-6; v += step) out.push(Math.round(v * 10) / 10);
  return out;
};

function Clippers() {
  return (
    <g>
      <path d="M20 13.5h24v7.5H20z" />
      <path
        d={range(21.5, 42.5, 3)
          .map((x) => `M${x} 13.5v-3.2`)
          .join("")}
        {...hatch}
        strokeWidth="1.1"
        opacity="0.9"
      />
      <path d="M21 21h22l-1.9 31.2c-.2 3-2.6 5.3-5.6 5.3h-7c-3 0-5.4-2.3-5.6-5.3z" />
      <rect x="28.8" y="27" width="6.4" height="9.5" rx="1.6" />
      <path d="M38.5 39.5l-.6 12.5M35.3 40.5l-.3 12M32 41.5V53" {...hatch} />
      <path d="M32 57.5c0 3.2-3.2 4.2-6.5 4" fill="none" />
    </g>
  );
}

function Razor() {
  return (
    <g>
      <path d="M6.5 30.2h26.8a2.8 2.8 0 0 1 0 5.6H6.5a2.8 2.8 0 0 1 0-5.6z" />
      <path d="M9 33h22" {...hatch} />
      <path d="M33.4 30.4 56 27.6c2.4-.2 3.4 1.4 2.8 3.6l-2 6.6c-10.8 2.6-16 1.6-23.4-.8z" />
      <path d="M37.5 31.4 55 29.4M38 33.5l15.8-1.6" {...hatch} />
      <circle cx="33.6" cy="33" r="1.9" />
    </g>
  );
}

function Shears() {
  return (
    <g>
      <path d="M30.3 31.5 43.6 6.6c.6-1.1 2.3-.8 2.2.6L35.4 34z" />
      <path d="M33.7 31.5 20.4 6.6c-.6-1.1-2.3-.8-2.2.6L28.6 34z" />
      <path d="M41 12.5 34.5 27M23 12.5 29.5 27" {...hatch} />
      <path d="M29.4 33.6 24.2 44.6M34.6 33.6l5.2 11" fill="none" strokeWidth="2.6" />
      <circle cx="21.3" cy="50.2" r="6.4" />
      <circle cx="21.3" cy="50.2" r="3.3" />
      <circle cx="42.7" cy="50.2" r="6.4" />
      <circle cx="42.7" cy="50.2" r="3.3" />
      <path d="M15.4 54.6c-2 2.6-4.4 3.4-6.6 2.6" fill="none" />
      <circle cx="32" cy="31.6" r="2.2" />
    </g>
  );
}

function Trimmer() {
  return (
    <g>
      <path d="M13 12.5h38v6H13z" />
      <path
        d={range(14.5, 49.5, 2.5)
          .map((x) => `M${x} 12.5v-3`)
          .join("")}
        {...hatch}
        strokeWidth="1"
        opacity="0.9"
      />
      <path d="M26.5 18.5h11v4h-11z" />
      <path d="M25 22.5h14l-1.5 30c-.2 3.1-2.6 5.3-5.5 5.3s-5.3-2.2-5.5-5.3z" />
      <circle cx="32" cy="30.5" r="2.6" />
      <path d="M35.6 37.5 35 52M32 38v15" {...hatch} />
    </g>
  );
}

function Comb() {
  return (
    <g>
      <path d="M10 20.5h44a2.2 2.2 0 0 1 2.2 2.2v7.3H7.8v-7.3a2.2 2.2 0 0 1 2.2-2.2z" />
      <path d="M11 24.5h42" {...hatch} />
      <path
        d={[...range(10, 30, 2.5).map((x) => `M${x} 30v12.5`), ...range(34, 54, 4).map((x) => `M${x} 30v16`)].join("")}
        fill="none"
        strokeWidth="1.5"
      />
    </g>
  );
}

function Brush() {
  return (
    <g>
      <path d="M20.2 34.2C18 21.8 24.4 11.6 32 9.6c7.6 2 14 12.2 11.8 24.6z" />
      <path d="M26 32.5c-1.2-7.6.8-13.6 4-17.6M32 33V12.4M38 32.5c1.2-7.6-.8-13.6-4-17.6" {...hatch} />
      <path d="M21 34.2h22v4.3H21z" />
      <path d="M23 38.5h18c-.9 5-3.2 7.2-3.2 10.2 0 3 3.2 4.2 3.2 8.3H23c0-4.1 3.2-5.3 3.2-8.3 0-3-2.3-5.2-3.2-10.2z" />
      <path d="M26.5 44.5h11M25 54h14" {...hatch} />
    </g>
  );
}

// How each drawing sits on its own (solo), and how to turn it to stand
// upright so two tools can be crossed at the same angle.
const TOOLS = {
  clippers: { Draw: Clippers, solo: "", upright: "" },
  razor: { Draw: Razor, solo: "rotate(-38 32 32)", upright: "rotate(-90 32 32)" },
  shears: { Draw: Shears, solo: "", upright: "" },
  trimmer: { Draw: Trimmer, solo: "", upright: "" },
  comb: { Draw: Comb, solo: "rotate(-8 32 32)", upright: "rotate(-90 32 32)" },
  brush: { Draw: Brush, solo: "", upright: "" },
};

/** Which tools a service uses, from its name. */
export function toolsForService(name = "") {
  const n = name.toLowerCase();
  const shave = /shave/.test(n);
  if (/kid/.test(n)) return /line/.test(n) ? ["trimmer", "comb"] : ["clippers", "comb"];
  if (/beard/.test(n)) return ["shears", "comb"];
  if (/line/.test(n)) return shave ? ["trimmer", "razor"] : ["trimmer"];
  if (/senior/.test(n)) return shave ? ["shears", "razor"] : ["shears"];
  if (/cut/.test(n)) return shave ? ["clippers", "razor"] : ["clippers"];
  if (shave) return ["razor", "brush"];
  return ["clippers"];
}

export function ToolIcon({ tools = ["clippers"], size = 64, className = "", title }) {
  const [first, second] = tools.map((t) => TOOLS[t]).filter(Boolean);
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ fill: "var(--tool-fill, none)" }}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {second ? (
        <>
          <g transform="translate(32 32) rotate(-34) scale(0.88) translate(-32 -32)">
            <g transform={second.upright}>
              <second.Draw />
            </g>
          </g>
          <g transform="translate(32 32) rotate(34) scale(0.88) translate(-32 -32)">
            <g transform={first.upright}>
              <first.Draw />
            </g>
          </g>
        </>
      ) : (
        <g transform={first.solo}>
          <first.Draw />
        </g>
      )}
    </svg>
  );
}
