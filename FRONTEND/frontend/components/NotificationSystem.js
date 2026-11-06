"use client";
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(date) {
  var diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5)    return "just now";
  if (diff < 60)   return diff + "s ago";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  return date.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid() {
  if (typeof window === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

function supportsPush() {
  if (typeof window === "undefined") return false;
  // iOS needs to be in standalone mode (home screen) for push to work
  if (isIOS()) return isStandalone() && "PushManager" in window;
  return "serviceWorker" in navigator && "PushManager" in window;
}

// ── Notification config ───────────────────────────────────────────────────────
function getConfig(type) {
  var configs = {
    booking_confirmed:   { tone: "ok",   label: "Booking confirmed" },
    booking_cancelled:   { tone: "bad",  label: "Cancelled" },
    booking_reminder:    { tone: "warn", label: "Reminder" },
    reschedule_request:  { tone: "warn", label: "Reschedule request" },
    reschedule_response: { tone: "ok",   label: "Reschedule update" },
    walk_in:             { tone: "info", label: "Walk-in" },
    strike:              { tone: "bad",  label: "Strike" },
    haircut_review:      { tone: "warn", label: "Review" },
    new_booking:         { tone: "ok",   label: "New booking" },
    signup_client:       { tone: "info", label: "Welcome" },
    signup_barber:       { tone: "info", label: "Welcome" },
    blast:               { tone: "info", label: "From your barber" },
  };
  return configs[type] || { tone: "info", label: "Headz Up" };
}

// ── Context ───────────────────────────────────────────────────────────────────
var NotifContext = createContext(null);
export function useNotifications() { return useContext(NotifContext); }

// ── Provider ──────────────────────────────────────────────────────────────────
export default function NotificationProvider({ children }) {
  var router = useRouter();
  var [notifs,      setNotifs]      = useState([]);
  var [showPermit,  setShowPermit]  = useState(false);
  var [pushEnabled,   setPushEnabled]   = useState(false);
  var [showIOSInstall, setShowIOSInstall] = useState(false);
  var timers = useRef({});

  // Add in-app notification
  var addNotif = useCallback(function(title, body, type, url) {
    var id = Date.now() + "-" + Math.random();
    setNotifs(function(p) {
      return [{ id:id, title:title, body:body, type:type||"general", url:url||null, time:new Date() }, ...p].slice(0,5);
    });
    timers.current[id] = setTimeout(function() {
      setNotifs(function(p) { return p.filter(function(n) { return n.id !== id; }); });
      delete timers.current[id];
    }, 6000);
  }, []);

  var dismissNotif = useCallback(function(id) {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setNotifs(function(p) { return p.filter(function(n) { return n.id !== id; }); });
  }, []);

  // Show permit prompt
  var showPermitPrompt = useCallback(function() {
    if (typeof window === "undefined") return;
    // Only show if user is logged in — prevents redirect to login on permit click
    if (!localStorage.getItem("access")) return;
    // Never show again if already granted
    var perm = typeof Notification !== "undefined" ? Notification.permission : "default";
    if (perm === "granted") { setPushEnabled(true); return; }
    // Never show again if permanently dismissed
    if (perm === "denied") return;
    // Never show again if user clicked Not Now
    var dismissed = localStorage.getItem("headzup_push_dismissed");
    if (dismissed) return;
    // Don't show if device can't support push
    if (!supportsPush() && !isIOS()) return;
    // Only show once per session
    var shownThisSession = sessionStorage.getItem("headzup_permit_shown");
    if (shownThisSession) return;
    sessionStorage.setItem("headzup_permit_shown", "1");
    setTimeout(function() { setShowPermit(true); }, 2500);
  }, [setPushEnabled]);

  // Enable push
  var enablePush = useCallback(async function() {
    try {
      // iOS not installed as home screen app yet
      if (isIOS() && !isStandalone()) {
        setShowPermit(false);
        setShowIOSInstall(true);
        return;
      }
      if (!supportsPush()) {
        setShowPermit(false);
        addNotif("Alerts aren't available here", "Use Chrome on Android, or add Headz Up to your iPhone home screen.", "general");
        return;
      }
      var perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setShowPermit(false);
        localStorage.setItem("headzup_push_dismissed", "1");
        addNotif("Alerts are blocked", "Turn them on for headzupp.com in your browser settings.", "general");
        return;
      }
      var reg    = await navigator.serviceWorker.ready;
      // Use env var first (faster), fall back to API
      var vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        var keyRes = await API.get("push/vapid-key/");
        vapidKey = keyRes.data.public_key;
      }
      if (!vapidKey) {
        addNotif("Alerts aren't set up yet", "The shop hasn't finished setting up alerts.", "general");
        setShowPermit(false);
        return;
      }
      // Convert VAPID public key from base64url to Uint8Array
      var padding = "=".repeat((4 - vapidKey.length % 4) % 4);
      var base64   = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
      var rawData  = window.atob(base64);
      var keyArray = new Uint8Array(rawData.length);
      for (var i = 0; i < rawData.length; i++) {
        keyArray[i] = rawData.charCodeAt(i);
      }
      var sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: keyArray,
      });
      var p256dh = btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh"))));
      var auth   = btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth"))));

      // Only save to server if logged in
      var token = localStorage.getItem("access");
      if (token) {
        try {
          await API.post("push/subscribe/", {
            endpoint: sub.endpoint,
            p256dh:   p256dh,
            auth:     auth,
          }, { _noAuth: true }); // prevent 401 redirect
        } catch(saveErr) {
          // If save fails (e.g. not logged in), still enable locally
          console.warn("[Push] Could not save subscription to server:", saveErr?.response?.status);
        }
      } else {
        // Store subscription locally — will save on next login
        try {
          localStorage.setItem("headzup_pending_push", JSON.stringify({
            endpoint: sub.endpoint, p256dh, auth
          }));
        } catch(e) {}
      }

      setPushEnabled(true);
      setShowPermit(false);
      addNotif("Alerts are on", "You'll get booking confirmations and reminders here.", "general", null);
    } catch(e) {
      console.error("[Push] enablePush error:", e);
      setShowPermit(false);
      addNotif("Alerts didn't turn on", "Try again in a moment.", "general", null);
    }
  }, [addNotif]);

  var dismissPermit = useCallback(function() {
    setShowPermit(false);
    // Remember for this session - will ask again next login session
    sessionStorage.setItem("headzup_permit_shown", "1");
    // If they click Not Now 3 times total, stop asking permanently
    var count = parseInt(localStorage.getItem("headzup_push_dismissals") || "0") + 1;
    localStorage.setItem("headzup_push_dismissals", String(count));
    if (count >= 3) {
      localStorage.setItem("headzup_push_dismissed", "1");
    }
  }, []);

  // Check push on mount + listen for login event
  useEffect(function() {
    var checkPush = async function() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      try {
        var reg = await navigator.serviceWorker.ready;
        var sub = await reg.pushManager.getSubscription();
        if (sub) {
          setPushEnabled(true);
        } else {
          // No subscription yet — show prompt if permission not denied
          showPermitPrompt();
        }
      } catch(e) {}
    };
    // Delay slightly so page loads first
    var t = setTimeout(checkPush, 3000);

    var handler = function(e) {
      // "Turn on" in account settings always opens the card.
      if (e && e.detail && e.detail.force) { setShowPermit(true); return; }
      showPermitPrompt();
    };
    window.addEventListener("headzup:trigger-permit", handler);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", function(e) {
        if (e.data && e.data.type === "PUSH_NOTIFICATION_CLICK" && e.data.url) {
          router.push(e.data.url);
        }
      });
    }

    return function() { window.removeEventListener("headzup:trigger-permit", handler); };
  }, [router, showPermitPrompt]);

  // Save pending push subscription after login
  useEffect(function() {
    var token = localStorage.getItem("access");
    var pending = localStorage.getItem("headzup_pending_push");
    if (!token || !pending) return;
    try {
      var sub = JSON.parse(pending);
      API.post("push/subscribe/", sub).then(function() {
        localStorage.removeItem("headzup_pending_push");
        console.log("[Push] Saved pending subscription after login");
      }).catch(function() {});
    } catch(e) {}
  }, []);

  // Direct mount check - show prompt if not yet subscribed
  useEffect(function() {
    var timer = setTimeout(async function() {
      if (typeof window === "undefined") return;
      if (typeof Notification === "undefined") return;
      if (!localStorage.getItem("access")) return; // don't ask visitors who aren't signed in
      if (Notification.permission === "denied") return;
      if (localStorage.getItem("headzup_push_dismissed")) return;

      // Check if already subscribed on THIS device
      try {
        if ("serviceWorker" in navigator && "PushManager" in window) {
          var reg = await navigator.serviceWorker.ready;
          var sub = await reg.pushManager.getSubscription();
          if (sub) {
            // Already subscribed — save to backend silently in case it was lost
            setPushEnabled(true);
            return;
          }
        }
      } catch(e) {}

      // Not subscribed — show prompt regardless of session
      // Only skip if dismissed 3+ times
      var dismissals = parseInt(localStorage.getItem("headzup_push_dismissals") || "0");
      if (dismissals >= 3) return;

      setShowPermit(true);
    }, 3000);
    return function() { clearTimeout(timer); };
  }, [setPushEnabled]); // empty deps - runs once on mount

  return (
    <NotifContext.Provider value={{ addNotif, dismissNotif, showPermitPrompt, pushEnabled, setPushEnabled }}>
      {children}

      {/* Permission request: a plain card, sentence case, one clear action */}
      {showPermit && (
        <div className="np-sheet" role="dialog" aria-modal="false" aria-labelledby="np-title">
          <div className="np-card">
            <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
              <span className="np-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></svg>
              </span>
              <div className="grow">
                <p id="np-title" className="h4">
                  {isIOS() && !isStandalone() ? "Add Headz Up to your home screen" : "Get alerts on this device?"}
                </p>
                <p className="small muted" style={{ marginTop: 4 }}>
                  {isIOS() && !isStandalone()
                    ? "iPhones only show alerts from apps on the home screen. It takes three taps."
                    : "Booking confirmations, reminders and reschedule answers. Nothing else, and you can turn it off any time."}
                </p>
              </div>
            </div>
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn btn-primary grow" onClick={function (e) { e.preventDefault(); e.stopPropagation(); enablePush(); }}>
                {isIOS() && !isStandalone() ? "Show me how" : "Turn on alerts"}
              </button>
              <button className="btn btn-ghost" onClick={dismissPermit}>Not now</button>
            </div>
          </div>
        </div>
      )}

      {showIOSInstall && (
        <div className="np-sheet" role="dialog" aria-modal="false" aria-labelledby="np-ios-title">
          <div className="np-card">
            <div className="spread" style={{ alignItems: "flex-start" }}>
              <p id="np-ios-title" className="h4">Add to your home screen</p>
              <button className="icon-btn" aria-label="Close" onClick={function () { setShowIOSInstall(false); localStorage.setItem("headzup_push_dismissed", "1"); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
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

      {/* In-app alerts */}
      <div className="np-stack" aria-live="polite">
        {notifs.map(function (n) {
          var cfg = getConfig(n.type);
          var go = function () { dismissNotif(n.id); if (n.url) router.push(n.url); };
          return (
            <div key={n.id} className={"np-toast np-" + cfg.tone} role={n.url ? "button" : undefined} tabIndex={n.url ? 0 : undefined}
              onClick={go} onKeyDown={function (e) { if (n.url && (e.key === "Enter" || e.key === " ")) go(); }}>
              <div className="grow">
                <p className="np-label">{cfg.label}<span className="faint"> {fmtTime(n.time)}</span></p>
                <p className="np-title">{n.title}</p>
                {n.body && <p className="small muted">{n.body}</p>}
              </div>
              <button className="icon-btn" aria-label="Dismiss" style={{ width: 32, height: 32 }}
                onClick={function (e) { e.stopPropagation(); dismissNotif(n.id); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          );
        })}
      </div>
    </NotifContext.Provider>
  );
}
