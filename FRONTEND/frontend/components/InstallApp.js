"use client";
// "Put HEADZ UP on your home screen", for clients (dashboard Account tab) and
// barbers (Profile tab). Hidden where it can't work or already has.
import { useSyncExternalStore } from "react";
import { installState, promptInstall, subscribeInstall } from "@/lib/install";

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" className="install-share">
    <path
      d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5v10h14V11h-1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="square"
    />
  </svg>
);

export default function InstallApp({ who = "client", className = "" }) {
  const state = useSyncExternalStore(subscribeInstall, installState, () => "none");
  if (state === "installed" || state === "none") return null;

  const why =
    who === "barber"
      ? "Your schedule opens full screen in one tap, like any other app, and alerts can reach your phone."
      : "Book and check your appointments in one tap, full screen, and get alerts about your booking.";

  return (
    <section className={`panel panel-pad install-card ${className}`} aria-labelledby={`install-${who}`}>
      <h2 id={`install-${who}`} className="h4">
        Put HEADZ UP on your home screen
      </h2>
      <p className="small muted mt-1">{why}</p>
      {state === "prompt" ? (
        <button type="button" className="btn btn-primary mt-4" onClick={() => promptInstall()}>
          Install the app
        </button>
      ) : (
        <ol className="install-steps mt-3">
          <li>
            In Safari, tap Share <ShareIcon />
          </li>
          <li>Scroll down and tap Add to Home Screen</li>
          <li>Tap Add</li>
        </ol>
      )}
    </section>
  );
}
