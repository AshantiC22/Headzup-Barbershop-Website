"use client";
// Leaving animations. React drops an element the moment its condition goes
// false, so anything that should animate out has to stay mounted a little
// longer. CSS does the animating, keyed off [data-state="closing"].
import { useEffect, useState } from "react";

/** Matches --dur-2 in globals.css. */
export const EXIT_MS = 200;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * "open" while open, "closing" for EXIT_MS after it closes, then null.
 *   const state = usePresence(open);
 *   if (!state) return null;
 *   return <div data-state={state} inert={state === "closing"}>…</div>;
 */
export function usePresence(open, exitMs = EXIT_MS) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open || !mounted) return;
    const t = setTimeout(() => setMounted(false), reducedMotion() ? 0 : exitMs);
    return () => clearTimeout(t);
  }, [open, mounted, exitMs]);

  if (!mounted) return null;
  return open ? "open" : "closing";
}

/**
 * The last value seen while `open`, so a closing dialog can keep showing
 * what it showed instead of going blank under its own exit animation.
 */
export function useHeld(value, open) {
  const [held, setHeld] = useState(value);
  if (open && held !== value) setHeld(value);
  return open ? value : held;
}

/**
 * For dialogs that mount when a value is set and unmount when it clears:
 *   <Present value={editing}>{(item, open) => <EditDialog item={item} open={open} />}</Present>
 * The child gets the last value and open=false for EXIT_MS before it goes.
 */
export function Present({ value, children }) {
  const isSet = value != null && value !== false;
  const state = usePresence(isSet);
  const held = useHeld(value, isSet);
  if (!state) return null;
  return children(held, state === "open");
}

/**
 * A region that opens and closes by animating its height. Its contents are
 * mounted the first time it opens and stay mounted (inert) after that, so
 * closing can animate.
 */
export function Collapse({ open, id, children }) {
  const [seen, setSeen] = useState(open);
  if (open && !seen) setSeen(true);
  return (
    <div id={id} className={`collapse ${open ? "is-open" : ""}`} inert={!open}>
      <div className="collapse-inner">{seen ? children : null}</div>
    </div>
  );
}
