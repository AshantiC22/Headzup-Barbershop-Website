"use client";
// In-app alerts, and the card that offers push notifications.
//
// The card only appears when a signed-in page asks for it (offerPush), at most
// once per session, and never again after three "Not now"s. The account page
// can open it on demand (askForPush).
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { currentSubscription, permission, pushSupport, saveSubscription, turnOnPush } from "@/lib/push";
import { IconBell, IconClose } from "@/components/ui/Feedback";

const KIND = {
  booking_confirmed:   { tone: "ok",   label: "Booking confirmed" },
  booking_cancelled:   { tone: "bad",  label: "Cancelled" },
  booking_reminder:    { tone: "warn", label: "Reminder" },
  reschedule_request:  { tone: "warn", label: "Reschedule request" },
  reschedule_response: { tone: "ok",   label: "Reschedule update" },
  walk_in:             { tone: "info", label: "Walk-in" },
  strike:              { tone: "bad",  label: "Strike" },
  haircut_review:      { tone: "warn", label: "Review" },
  new_booking:         { tone: "ok",   label: "New booking" },
  blast:               { tone: "info", label: "From your barber" },
};
const kindOf = (type) => KIND[type] || { tone: "info", label: "Headz Up" };

const DISMISSALS = "headzup_push_dismissals";
const ASKED_THIS_SESSION = "headzup_permit_shown";
const GIVE_UP_AFTER = 3;
const TOAST_MS = 6000;

const store = {
  get: (area, key) => { try { return window[area].getItem(key); } catch { return null; } },
  set: (area, key, value) => { try { window[area].setItem(key, value); } catch {} },
};
const signedIn = () => !!store.get("localStorage", "access");

function ago(date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const AlertsContext = createContext({ notify: () => {}, offerPush: () => {}, askForPush: () => {}, pushOn: false });
export const useAlerts = () => useContext(AlertsContext);

export function AlertsProvider({ children }) {
  const router = useRouter();
  const [toasts, setToasts] = useState([]);
  const [card, setCard] = useState(null);       // null | "offer" | "ios"
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((title, body, type = "general", url = null) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((list) => [{ id, title, body, type, url, at: new Date() }, ...list].slice(0, 4));
    timers.current.set(id, setTimeout(() => dismiss(id), TOAST_MS));
  }, [dismiss]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  // Is this device already subscribed? If so, make sure the API knows it.
  useEffect(() => {
    let live = true;
    currentSubscription().then((sub) => {
      if (!live || !sub) return;
      setPushOn(true);
      if (signedIn()) saveSubscription(sub).catch(() => {});
    });
    return () => { live = false; };
  }, []);

  // Messages from the service worker: a tapped notification, or a push that
  // arrived while a tab is open (the barber dashboard listens for those).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e) => {
      if (e.data?.type === "PUSH_NOTIFICATION_CLICK" && e.data.url) router.push(e.data.url);
      if (e.data?.type === "PUSH_RECEIVED") window.dispatchEvent(new CustomEvent("headzup:push", { detail: e.data.data || {} }));
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  const offerPush = useCallback(() => {
    if (!signedIn() || permission() !== "default") return;
    if (store.get("sessionStorage", ASKED_THIS_SESSION)) return;
    if (Number(store.get("localStorage", DISMISSALS) || 0) >= GIVE_UP_AFTER) return;
    if (store.get("localStorage", "headzup_push_dismissed")) return; // set by earlier versions of the site
    const support = pushSupport();
    if (support === "unsupported") return;
    store.set("sessionStorage", ASKED_THIS_SESSION, "1");
    // Let the page settle before sliding a card over it.
    const t = setTimeout(() => setCard("offer"), 2500);
    return () => clearTimeout(t);
  }, []);

  const askForPush = useCallback(() => setCard("offer"), []);

  const notNow = () => {
    setCard(null);
    store.set("localStorage", DISMISSALS, String(Number(store.get("localStorage", DISMISSALS) || 0) + 1));
  };

  const turnOn = async () => {
    if (pushSupport() === "ios-install") { setCard("ios"); return; }
    setBusy(true);
    try {
      const result = await turnOnPush();
      setCard(null);
      if (result === "on") { setPushOn(true); notify("Alerts are on", "Confirmations, reminders and reschedule answers will show up here."); }
      else if (result === "blocked") notify("Alerts are blocked", "Allow notifications for headzupp.com in your browser settings, then try again.");
      else if (result === "not-configured") notify("Alerts aren't set up yet", "The shop is still finishing this. Texts and email still work.");
      else notify("Alerts aren't available here", "Use Chrome on Android, or add Headz Up to your iPhone home screen.");
    } catch {
      setCard(null);
      notify("Alerts didn't turn on", "Something went wrong on our side. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  };

  const iosInstall = card === "offer" && pushSupport() === "ios-install";

  return (
    <AlertsContext.Provider value={{ notify, offerPush, askForPush, pushOn }}>
      {children}

      {card === "offer" && (
        <div className="np-sheet" role="dialog" aria-labelledby="np-title" aria-describedby="np-body">
          <div className="np-card">
            <div className="row np-head">
              <span className="np-icon" aria-hidden="true"><IconBell size={22} /></span>
              <div className="grow">
                <p id="np-title" className="h4">{iosInstall ? "Add Headz Up to your home screen" : "Get alerts on this device?"}</p>
                <p id="np-body" className="small muted">
                  {iosInstall
                    ? "iPhones only show alerts from apps on the home screen. It takes three taps."
                    : "Booking confirmations, reminders and reschedule answers. Nothing else, and you can turn it off any time."}
                </p>
              </div>
            </div>
            <div className="row np-actions">
              <button type="button" className="btn btn-primary grow" onClick={turnOn} disabled={busy}>
                {iosInstall ? "Show me how" : busy ? "Turning on…" : "Turn on alerts"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={notNow}>Not now</button>
            </div>
          </div>
        </div>
      )}

      {card === "ios" && (
        <div className="np-sheet" role="dialog" aria-labelledby="np-ios-title">
          <div className="np-card">
            <div className="spread np-head">
              <p id="np-ios-title" className="h4">Add to your home screen</p>
              <button type="button" className="icon-btn" aria-label="Close" onClick={notNow}><IconClose size={18} /></button>
            </div>
            <ol className="np-steps">
              <li>Tap the <strong>Share</strong> button in Safari&apos;s toolbar.</li>
              <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
              <li>Open Headz Up from your home screen.</li>
              <li>Sign in and tap <strong>Turn on alerts</strong>.</li>
            </ol>
          </div>
        </div>
      )}

      <div className="np-stack" role="status" aria-live="polite">
        {toasts.map((t) => {
          const kind = kindOf(t.type);
          const body = (
            <>
              <span className="np-label">{kind.label}<span className="faint"> · {ago(t.at)}</span></span>
              <span className="np-title">{t.title}</span>
              {t.body && <span className="small muted">{t.body}</span>}
            </>
          );
          return (
            <div key={t.id} className={`np-toast np-${kind.tone}`}>
              {t.url ? (
                <button type="button" className="np-text" onClick={() => { dismiss(t.id); router.push(t.url); }}>{body}</button>
              ) : (
                <div className="np-text">{body}</div>
              )}
              <button type="button" className="icon-btn np-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
                <IconClose size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </AlertsContext.Provider>
  );
}
