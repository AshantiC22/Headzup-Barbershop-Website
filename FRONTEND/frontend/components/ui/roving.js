// Keyboard behavior for radio groups and tab lists, per the WAI-ARIA patterns:
// the group is one Tab stop (the selected item), and the arrow keys move both
// focus and selection. Home and End jump to the ends.
//
//   <div role="radiogroup" onKeyDown={(e) => arrowSelect(e, ids, value, setValue)}>
//     {ids.map((id) => <button role="radio" tabIndex={rovingIndex(id, value, ids)} … />)}

const STEP = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export function arrowSelect(e, options, current, select) {
  let next;
  if (e.key in STEP) {
    const i = Math.max(0, options.indexOf(current));
    next = (i + STEP[e.key] + options.length) % options.length;
  } else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = options.length - 1;
  else return;
  e.preventDefault();
  select(options[next]);
  e.currentTarget.querySelectorAll('[role="radio"], [role="tab"]')[next]?.focus();
}

/** 0 for the item that should take Tab focus, -1 for the rest. */
export const rovingIndex = (option, current, options) =>
  option === current || (!options.includes(current) && option === options[0]) ? 0 : -1;
