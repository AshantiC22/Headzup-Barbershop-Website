"use client";
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import API from "../utils/api";

const sf   = { fontFamily:"'Syncopate',sans-serif" };
const mono = { fontFamily:"'DM Mono',monospace" };

// ── Notification type config ──────────────────────────────────────────────────
const NOTIF_CONFIG = {
  booking_confirmed:   { icon:"✅", color:"#4ade80", label:"Booking Confirmed"  },
  booking_cancelled:   { icon:"❌", color:"#f87171", label:"Cancelled"          },
  booking_reminder:    { icon:"📅", color:"#f59e0b", label:"Reminder"           },
  reschedule_request:  { icon:"↻",  color:"#f59e0b", label:"Reschedule Request" },
  reschedule_response: { icon:"📅", color:"#4ade80", label:"Reschedule Update"  },
  walk_in:             { icon:"✂️", color:"#f59e0b", label:"Walk-In"            },
  strike:              { icon:"⚠️", color:"#ef4444", label:"Strike Notice"      },
  haircut_review:      { icon:"⭐", color:"#f59e0b", label:"Review Request"     },
  new_booking:         { icon:"📅", color:"#4ade80", label:"New Booking"        },
  signup_client:       { icon:"✂️", color:"#f59e0b", label:"Welcome"            },
  signup_barber:       { icon:"✂️", color:"#f59e0b", label:"Welcome"            },
  blast:               { icon:"📣", color:"#a78bfa", label:"Message"            },
  general:             { icon:"🔔", color:"#f59e0b", label:"HEADZ UP"           },
};

// ── Context ───────────────────────────────────────────────────────────────────
const NotifContext = createContext(null);
export const useNotifications = () => useContext(NotifContext);

// ── Provider ──────────────────────────────────────────────────────────────────
export default function NotificationProvider({ children }) {
  const router = useRouter();
  const [notifs,       setNotifs]       = useState([]);
  const [showPermit,   setShowPermit]   = useState(false);
  const [pushEnabled,  setPushEnabled]  = useState(false);
  const [permitDone,   setPermitDone]   = useState(false);
  const timers = useRef({});

  // ── Add in-app notification ─────────────────────────────────────────────────
  const addNotif = useCallback((title, body, type = "general", url = null) => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifs(p => [{ id, title, body, type, url, time: new Date() }, ...p].slice(0, 5));
    // Auto-dismiss after 6 seconds
    timers.current[id] = setTimeout(() => {
      setNotifs(p => p.filter(n => n.id !== id));
      delete timers.current[id];
    }, 6000);
    return id;
  }, []);

  const dismissNotif = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setNotifs(p => p.filter(n => n.id !== id));
  }, []);

  // ── Listen for login event to show permit prompt ─────────────────────────────
  useEffect(() => {
    const handler = () => showPermitPrompt();
    window.addEventListener("headzup:trigger-permit", handler);
    return () => window.removeEventListener("headzup:trigger-permit", handler);
  }, [showPermitPrompt]);

  // ── Check push subscription on mount ─────────────────────────────────────
  useEffect(() => {
    const checkPush = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushEnabled(!!sub);
      } catch {}
    };
    checkPush();

    // Listen for push notification clicks from service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (e) => {
        if (e.data?.type === "PUSH_NOTIFICATION_CLICK" && e.data.url) {
          router.push(e.data.url);
        }
      });
    }
  }, [router]);

  // ── Show permission prompt after login (check localStorage) ────────────────
  const showPermitPrompt = useCallback(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem("headzup_push_dismissed");
    const permission = Notification?.permission;
    if (permission === "granted" || dismissed) return;
    setTimeout(() => setShowPermit(true), 2000);
  }, []);

  // ── Subscribe to push ───────────────────────────────────────────────────────
  const enablePush = useCallback(async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setShowPermit(false);
        localStorage.setItem("headzup_push_dismissed", "1");
        return;
      }
      const reg    = await navigator.serviceWorker.ready;
      const keyRes = await API.get("push/vapid-key/");
      const sub    = await reg.pushManager.subscribe({
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
      addNotif("Notifications Enabled 🔔", "You'll get booking alerts and reminders.", "general");
    } catch (e) {
      setShowPermit(false);
    }
  }, [addNotif]);

  const dismissPermit = useCallback(() => {
    setShowPermit(false);
    localStorage.setItem("headzup_push_dismissed", "1");
  }, []);

  return (
    <NotifContext.Provider value={{ addNotif, dismissNotif, showPermitPrompt, pushEnabled, setPushEnabled }}>
      {children}

      {/* ── Permission prompt ─────────────────────────────────────────────── */}
      {showPermit && (
        <div style={{
          position:"fixed", bottom:isMobileCheck()?80:24, left:"50%", transform:"translateX(-50%)",
          zIndex:99999, width:"min(400px, calc(100vw - 32px))",
          animation:"notif-slide-up 0.4s cubic-bezier(0.16,1,0.3,1) both"
        }}>
          <style>{`
            @keyframes notif-slide-up { from{opacity:0;transform:translate(-50%,24px)} to{opacity:1;transform:translate(-50%,0)} }
            @keyframes notif-slide-in { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
            @keyframes notif-fade-out { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(24px)} }
          `}</style>
          <div style={{
            background:"#0a0a0a", border:"1px solid rgba(245,158,11,0.3)",
            boxShadow:"0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,158,11,0.1)",
            clipPath:"polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))",
            overflow:"hidden"
          }}>
            <div style={{ height:2, background:"linear-gradient(to right,#ef4444,#f59e0b)" }}/>
            <div style={{ padding:"16px 18px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
                <div style={{
                  width:36, height:36, background:"rgba(245,158,11,0.1)",
                  border:"1px solid rgba(245,158,11,0.3)", display:"flex",
                  alignItems:"center", justifyContent:"center", flexShrink:0,
                  clipPath:"polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px))"
                }}>
                  <span style={{ fontSize:16 }}>🔔</span>
                </div>
                <div>
                  <p style={{ ...sf, fontSize:8, fontWeight:700, textTransform:"uppercase",
                    letterSpacing:"0.15em", color:"white", marginBottom:4 }}>
                    Allow Notifications
                  </p>
                  <p style={{ ...mono, fontSize:11, color:"#71717a", lineHeight:1.7 }}>
                    Stay updated on bookings, reminders, and messages from HEADZ UP.
                  </p>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={enablePush} style={{
                  flex:1, padding:"10px 14px", background:"rgba(245,158,11,0.15)",
                  border:"1px solid rgba(245,158,11,0.4)", color:"#f59e0b",
                  ...sf, fontSize:6.5, fontWeight:700, letterSpacing:"0.2em",
                  textTransform:"uppercase", cursor:"pointer", transition:"all 0.2s",
                  clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))"
                }}>
                  Allow →
                </button>
                <button onClick={dismissPermit} style={{
                  padding:"10px 14px", background:"transparent",
                  border:"1px solid rgba(255,255,255,0.08)", color:"#52525b",
                  ...mono, fontSize:10, cursor:"pointer", transition:"all 0.2s"
                }}>
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── In-app notification toasts ────────────────────────────────────── */}
      <div style={{
        position:"fixed", top:72, right:16, zIndex:99998,
        display:"flex", flexDirection:"column", gap:8,
        width:"min(360px, calc(100vw - 32px))", pointerEvents:"none"
      }}>
        {notifs.map((n, i) => {
          const cfg = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.general;
          return (
            <div key={n.id} style={{
              pointerEvents:"auto",
              animation:"notif-slide-in 0.35s cubic-bezier(0.16,1,0.3,1) both",
              cursor: n.url ? "pointer" : "default",
            }}
              onClick={() => {
                dismissNotif(n.id);
                if (n.url) router.push(n.url);
              }}
            >
              <div style={{
                background:"#0a0a0a",
                border:`1px solid ${cfg.color}33`,
                boxShadow:`0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px ${cfg.color}11`,
                clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                overflow:"hidden",
              }}>
                <div style={{ height:2, background:`linear-gradient(to right,${cfg.color},transparent)` }}/>
                <div style={{ padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-start" }}>
                  {/* Icon */}
                  <div style={{
                    width:30, height:30, background:`${cfg.color}15`,
                    border:`1px solid ${cfg.color}30`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    flexShrink:0, fontSize:13,
                    clipPath:"polygon(0 0,calc(100% - 4px) 0,100% 4px,100% 100%,4px 100%,0 calc(100% - 4px))"
                  }}>
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                      <p style={{ ...sf, fontSize:6.5, fontWeight:700, textTransform:"uppercase",
                        letterSpacing:"0.15em", color:cfg.color }}>{cfg.label}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <p style={{ ...mono, fontSize:9, color:"#3f3f46" }}>
                          {formatTime(n.time)}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissNotif(n.id); }}
                          style={{ background:"none", border:"none", color:"#3f3f46",
                            cursor:"pointer", fontSize:12, padding:0, lineHeight:1 }}>
                          ✕
                        </button>
                      </div>
                    </div>
                    <p style={{ ...mono, fontSize:11, color:"white", fontWeight:500,
                      marginBottom:2, lineHeight:1.4 }}>{n.title}</p>
                    <p style={{ ...mono, fontSize:10, color:"#71717a", lineHeight:1.6 }}>{n.body}</p>
                    {/* Read receipt ticks */}
                    <div style={{ display:"flex", justifyContent:"flex-end", marginTop:4 }}>
                      <span style={{ ...mono, fontSize:9, color:cfg.color, opacity:0.6 }}>✓✓</span>
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5)  return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return date.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}

function isMobileCheck() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}
