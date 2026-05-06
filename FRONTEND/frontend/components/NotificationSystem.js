"use client";
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";

// ── Style constants ───────────────────────────────────────────────────────────
var SF   = { fontFamily:"'Syncopate',sans-serif" };
var MONO = { fontFamily:"'DM Mono',monospace" };

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(date) {
  var diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5)    return "just now";
  if (diff < 60)   return diff + "s ago";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  return date.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}

function isMobile() {
  return typeof window !== "undefined" && window.innerWidth < 768;
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
    booking_confirmed:   { icon:"✅", color:"#4ade80", label:"Booking Confirmed"   },
    booking_cancelled:   { icon:"❌", color:"#f87171", label:"Cancelled"           },
    booking_reminder:    { icon:"📅", color:"#f59e0b", label:"Reminder"            },
    reschedule_request:  { icon:"↻",  color:"#f59e0b", label:"Reschedule Request"  },
    reschedule_response: { icon:"📅", color:"#4ade80", label:"Reschedule Update"   },
    walk_in:             { icon:"✂️", color:"#f59e0b", label:"Walk-In"             },
    strike:              { icon:"⚠️", color:"#ef4444", label:"Strike Notice"       },
    haircut_review:      { icon:"⭐", color:"#f59e0b", label:"Review Request"      },
    new_booking:         { icon:"📅", color:"#4ade80", label:"New Booking"         },
    signup_client:       { icon:"✂️", color:"#f59e0b", label:"Welcome"             },
    signup_barber:       { icon:"✂️", color:"#f59e0b", label:"Welcome"             },
    blast:               { icon:"📣", color:"#a78bfa", label:"Message"             },
  };
  return configs[type] || { icon:"🔔", color:"#f59e0b", label:"HEADZ UP" };
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
        addNotif("Not Supported", "Use Chrome on Android or add to home screen on iPhone.", "general");
        return;
      }
      var perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setShowPermit(false);
        localStorage.setItem("headzup_push_dismissed", "1");
        addNotif("Notifications Blocked", "You can enable them in your browser settings.", "general");
        return;
      }
      var reg    = await navigator.serviceWorker.ready;
      var keyRes = await API.get("push/vapid-key/");
      var sub    = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: keyRes.data.public_key,
      });
      await API.post("push/subscribe/", {
        endpoint: sub.endpoint,
        p256dh:   btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")))),
        auth:     btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")))),
      });
      setPushEnabled(true);
      setShowPermit(false);
      addNotif("Notifications Enabled 🔔", "You will get booking alerts and reminders.", "general");
    } catch(e) {
      setShowPermit(false);
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
        setPushEnabled(!!sub);
      } catch(e) {}
    };
    checkPush();

    var handler = function() { showPermitPrompt(); };
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

  return (
    <NotifContext.Provider value={{ addNotif, dismissNotif, showPermitPrompt, pushEnabled, setPushEnabled }}>
      {children}

      {/* Permission prompt */}
      {showPermit && (
        <div style={{
          position:"fixed", bottom:isMobile()?80:24, left:"50%",
          transform:"translateX(-50%)", zIndex:99999,
          width:"min(400px,calc(100vw - 32px))",
          animation:"npSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both"
        }}>
          <style>{`@keyframes npSlideUp{from{opacity:0;transform:translate(-50%,24px)}to{opacity:1;transform:translate(-50%,0)}}@keyframes npSlideIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}`}</style>
          <div style={{ background:"#0a0a0a", border:"1px solid rgba(245,158,11,0.3)",
            boxShadow:"0 8px 40px rgba(0,0,0,0.7)",
            clipPath:"polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))",
            overflow:"hidden" }}>
            <div style={{ height:2, background:"linear-gradient(to right,#ef4444,#f59e0b)" }}/>
            <div style={{ padding:"16px 18px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
                <div style={{ width:36, height:36, background:"rgba(245,158,11,0.1)",
                  border:"1px solid rgba(245,158,11,0.3)", display:"flex",
                  alignItems:"center", justifyContent:"center", flexShrink:0,
                  clipPath:"polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px))" }}>
                  <span style={{ fontSize:16 }}>🔔</span>
                </div>
                <div>
                  <p style={{ ...SF, fontSize:8, fontWeight:700, textTransform:"uppercase",
                    letterSpacing:"0.15em", color:"white", marginBottom:4 }}>Allow Notifications</p>
                  <p style={{ ...MONO, fontSize:11, color:"#71717a", lineHeight:1.7 }}>
                    {isIOS() && !isStandalone()
                      ? "Install the app on your home screen to enable push notifications."
                      : "Stay updated on bookings, reminders, and messages from HEADZ UP."
                    }
                  </p>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={enablePush} style={{ flex:1, padding:"10px 14px",
                  background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.4)",
                  color:"#f59e0b", ...SF, fontSize:6.5, fontWeight:700, letterSpacing:"0.2em",
                  textTransform:"uppercase", cursor:"pointer", transition:"all 0.2s",
                  clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))" }}>
                  {isIOS() && !isStandalone() ? "How to Install →" : "Allow →"}
                </button>
                <button onClick={dismissPermit} style={{ padding:"10px 14px",
                  background:"transparent", border:"1px solid rgba(255,255,255,0.08)",
                  color:"#52525b", ...MONO, fontSize:10, cursor:"pointer" }}>
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS install prompt */}
      {showIOSInstall && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:99999,
          background:"#0a0a0a", borderTop:"2px solid #f59e0b",
          padding:"20px 18px", animation:"npSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:22 }}>📲</span>
              <div>
                <p style={{ ...SF, fontSize:8, fontWeight:700, color:"#f59e0b",
                  textTransform:"uppercase", letterSpacing:"0.15em", marginBottom:3 }}>
                  Add to Home Screen
                </p>
                <p style={{ ...MONO, fontSize:11, color:"#71717a", lineHeight:1.7 }}>
                  To enable notifications on iPhone, install the app first.
                </p>
              </div>
            </div>
            <button onClick={function(){ setShowIOSInstall(false); localStorage.setItem("headzup_push_dismissed","1"); }}
              style={{ background:"none", border:"none", color:"#52525b", fontSize:18, cursor:"pointer", padding:0 }}>✕</button>
          </div>
          <div style={{ background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.15)",
            padding:"12px 14px", borderRadius:4 }}>
            <p style={{ ...MONO, fontSize:11, color:"#a1a1aa", lineHeight:1.9 }}>
              1. Tap the <strong style={{color:"#f59e0b"}}>Share button</strong> at the bottom of Safari<br/>
              2. Scroll down and tap <strong style={{color:"#f59e0b"}}>"Add to Home Screen"</strong><br/>
              3. Open the app from your home screen<br/>
              4. Log in and allow notifications when prompted
            </p>
          </div>
        </div>
      )}

      {/* In-app toasts */}
      <div style={{ position:"fixed", top:72, right:16, zIndex:99998,
        display:"flex", flexDirection:"column", gap:8,
        width:"min(360px,calc(100vw - 32px))", pointerEvents:"none" }}>
        {notifs.map(function(n) {
          var cfg = getConfig(n.type);
          return (
            <div key={n.id} style={{ pointerEvents:"auto",
              animation:"npSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) both",
              cursor: n.url ? "pointer" : "default" }}
              onClick={function() { dismissNotif(n.id); if(n.url) router.push(n.url); }}>
              <div style={{ background:"#0a0a0a",
                border:"1px solid " + cfg.color + "33",
                boxShadow:"0 4px 24px rgba(0,0,0,0.6)",
                clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                overflow:"hidden" }}>
                <div style={{ height:2, background:"linear-gradient(to right," + cfg.color + ",transparent)" }}/>
                <div style={{ padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-start" }}>
                  <div style={{ width:30, height:30, background:cfg.color + "15",
                    border:"1px solid " + cfg.color + "30",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0, fontSize:13,
                    clipPath:"polygon(0 0,calc(100% - 4px) 0,100% 4px,100% 100%,4px 100%,0 calc(100% - 4px))" }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                      <p style={{ ...SF, fontSize:6.5, fontWeight:700, textTransform:"uppercase",
                        letterSpacing:"0.15em", color:cfg.color }}>{cfg.label}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <p style={{ ...MONO, fontSize:9, color:"#3f3f46" }}>{fmtTime(n.time)}</p>
                        <button onClick={function(e){ e.stopPropagation(); dismissNotif(n.id); }}
                          style={{ background:"none", border:"none", color:"#3f3f46",
                            cursor:"pointer", fontSize:12, padding:0, lineHeight:1 }}>✕</button>
                      </div>
                    </div>
                    <p style={{ ...MONO, fontSize:11, color:"white", fontWeight:500,
                      marginBottom:2, lineHeight:1.4 }}>{n.title}</p>
                    <p style={{ ...MONO, fontSize:10, color:"#71717a", lineHeight:1.6 }}>{n.body}</p>
                    <div style={{ display:"flex", justifyContent:"flex-end", marginTop:4 }}>
                      <span style={{ ...MONO, fontSize:9, color:cfg.color, opacity:0.6 }}>✓✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </NotifContext.Provider>
  );
}
