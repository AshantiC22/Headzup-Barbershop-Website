"use client";
export const dynamic = "force-dynamic";
import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNotifications } from "@/components/NotificationSystem";
import API from "@/lib/api";
import { DashboardSkeleton } from "@/components/Skeleton";


// ── Design tokens — Rounded Glass System ─────────────────────────────────────
const C = {
  bg:          "#070709",
  surface:     "rgba(255,255,255,0.04)",
  surfaceB:    "rgba(255,255,255,0.06)",
  surfaceC:    "rgba(255,255,255,0.09)",
  border:      "rgba(255,255,255,0.08)",
  borderB:     "rgba(255,255,255,0.14)",
  amber:       "#f59e0b",
  amberDim:    "rgba(245,158,11,0.10)",
  amberBorder: "rgba(245,158,11,0.30)",
  amberGlow:   "rgba(245,158,11,0.15)",
  red:         "#ef4444",
  redDim:      "rgba(239,68,68,0.10)",
  green:       "#22c55e",
  greenDim:    "rgba(34,197,94,0.10)",
  blue:        "#3b82f6",
  blueDim:     "rgba(59,130,246,0.10)",
  purple:      "#a78bfa",
  purpleDim:   "rgba(167,139,250,0.10)",
  muted:       "#52525b",
  sub:         "#71717a",
  text:        "#f4f4f5",
  textSub:     "#a1a1aa",
};
const SF   = { fontFamily:"'Syncopate',sans-serif" };
const MONO = { fontFamily:"'DM Mono',monospace" };

// Glass card style helper
const glass = (extra = {}) => ({
  background:   C.surface,
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border:       `1px solid ${C.border}`,
  borderRadius: 16,
  ...extra,
});

// Pill badge style
const pill = (color = C.amber, bg = C.amberDim) => ({
  background:   bg,
  color:        color,
  border:       `1px solid ${color}30`,
  borderRadius: 999,
  padding:      "3px 10px",
  ...MONO,
  fontSize:     10,
  letterSpacing: "0.05em",
  whiteSpace:   "nowrap",
});

// Button styles
const btnPrimary = {
  background:   C.amber,
  color:        "#000",
  border:       "none",
  borderRadius: 12,
  padding:      "11px 22px",
  ...SF,
  fontSize:     8,
  fontWeight:   700,
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  cursor:       "pointer",
  transition:   "all 0.2s",
  boxShadow:    `0 4px 24px ${C.amberGlow}`,
};
const btnGhost = {
  background:   "transparent",
  color:        C.textSub,
  border:       `1px solid ${C.border}`,
  borderRadius: 12,
  padding:      "10px 18px",
  ...MONO,
  fontSize:     10,
  cursor:       "pointer",
  transition:   "all 0.2s",
};
const btnDanger = {
  background:   C.redDim,
  color:        C.red,
  border:       `1px solid rgba(239,68,68,0.25)`,
  borderRadius: 12,
  padding:      "10px 18px",
  ...MONO,
  fontSize:     10,
  cursor:       "pointer",
  transition:   "all 0.2s",
};
const btnSuccess = {
  background:   C.greenDim,
  color:        C.green,
  border:       `1px solid rgba(34,197,94,0.25)`,
  borderRadius: 12,
  padding:      "10px 18px",
  ...MONO,
  fontSize:     10,
  cursor:       "pointer",
  transition:   "all 0.2s",
};

const STATUS_CFG = {
  confirmed:    { label:"Confirmed",  color:"#22c55e", bg:"rgba(34,197,94,0.10)"  },
  pending_shop: { label:"Pending",    color:"#f59e0b", bg:"rgba(245,158,11,0.10)" },
  completed:    { label:"Completed",  color:"#60a5fa", bg:"rgba(96,165,250,0.10)" },
  cancelled:    { label:"Cancelled",  color:"#4b5563", bg:"rgba(75,85,99,0.15)"   },
  no_show:      { label:"No Show",    color:"#ef4444", bg:"rgba(239,68,68,0.10)"  },
};

function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US",
    { weekday:"short", month:"short", day:"numeric", year:"numeric" });
}
function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

// ── Appointment card ───────────────────────────────────────────────────────────
function ApptCard({ appt, onCancel, onReschedule, cancelling }) {
  const [open, setOpen] = useState(false);
  const st = STATUS_CFG[appt.status] || STATUS_CFG.confirmed;
  const isCancelled = appt.status === "cancelled" || appt.status === "no_show";
  const isCompleted = appt.status === "completed";
  const apptDT  = new Date(`${appt.date}T${appt.time}`);
  const diffHrs = (apptDT - new Date()) / (1000 * 60 * 60);
  const isLate  = diffHrs >= 0 && diffHrs < 2;

  return (
    <div style={{ border:`1px solid ${open ? C.amberBorder : C.border}`,
      background:C.surface, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
      overflow:"hidden", borderRadius:16,
      boxShadow: open ? `0 8px 32px ${C.amberGlow}` : "0 2px 12px rgba(0,0,0,0.3)", opacity: isCancelled ? 0.6 : 1,
      transition:"all 0.2s" }}>
      <div style={{ height:2, background:st.color, opacity: isCancelled ? 0.3 : 0.7 }}/>

      {/* Header */}
      <div onClick={() => setOpen(o=>!o)}
        style={{ padding:"14px 16px", cursor:"pointer", display:"flex",
          alignItems:"center", gap:12, justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:0 }}>
          <div style={{ textAlign:"center", minWidth:52, flexShrink:0 }}>
            <p style={{ ...SF, fontSize:12, fontWeight:700, color:C.amber, lineHeight:1 }}>
              {fmtTime(appt.time).split(" ")[0]}
            </p>
            <p style={{ ...MONO, fontSize:8, color:C.muted }}>
              {fmtTime(appt.time).split(" ")[1]}
            </p>
          </div>
          <div style={{ width:1, height:32, background:C.border, flexShrink:0 }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ ...MONO, fontSize:13, fontWeight:700, color:C.text,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              letterSpacing:"0.03em" }}>
              {appt.service_name || appt.service}
            </p>
            <p style={{ ...MONO, fontSize:11, color:C.sub, marginTop:3 }}>
              {appt.barber_name || appt.barber} · {fmtDate(appt.date)}
            </p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <span style={{ ...MONO, fontSize:10, padding:"4px 10px",
            background:st.bg, color:st.color, border:`1px solid ${st.color}30`, borderRadius:999,
            whiteSpace:"nowrap" }}>
            {st.label}
          </span>
          <span style={{ color:C.muted, fontSize:12, transition:"transform 0.2s",
            transform: open ? "rotate(180deg)" : "none" }}>▾</span>
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:16, background:C.surfaceB }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
            {[
              ["Service",  appt.service_name || appt.service],
              ["Barber",   appt.barber_name  || appt.barber],
              ["Date",     fmtDate(appt.date)],
              ["Time",     fmtTime(appt.time)],
              ["Payment",  appt.payment_method === "online" ? "Online Deposit" : "Pay in Shop"],
              ["Status",   st.label],
            ].map(([k,v]) => (
              <div key={k} style={{ padding:"8px 12px", background:C.surface,
                border:`1px solid ${C.border}`, borderRadius:10 }}>
                <p style={{ ...MONO, fontSize:8, color:C.muted, letterSpacing:"0.25em",
                  textTransform:"uppercase", marginBottom:3 }}>{k}</p>
                <p style={{ ...MONO, fontSize:12, color:C.text }}>{v}</p>
              </div>
            ))}
          </div>

          {!isCancelled && !isCompleted && (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={() => onReschedule(appt)}
                style={{ padding:"8px 16px", background:C.amberDim,
                  border:`1px solid ${C.amberBorder}`, color:C.amber,
                  ...MONO, fontSize:9, letterSpacing:"0.1em", cursor:"pointer" }}>
                ↻ Reschedule
              </button>
              <button disabled={cancelling === appt.id}
                onClick={() => onCancel(appt)}
                style={{ padding:"8px 16px",
                  background: isLate ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.03)",
                  border:`1px solid ${isLate ? "rgba(239,68,68,0.3)" : C.border}`,
                  color: isLate ? C.red : C.muted,
                  ...MONO, fontSize:9, letterSpacing:"0.1em", cursor:"pointer" }}>
                {cancelling === appt.id ? "Cancelling..." : isLate ? "⚠️ Late Cancel" : "✕ Cancel"}
              </button>
            </div>
          )}

          {isCancelled && (
            <div style={{ padding:"10px 12px", background:`${st.color}08`,
              border:`1px solid ${st.color}20` }}>
              <p style={{ ...MONO, fontSize:11, color:st.color }}>
                {appt.status === "cancelled" ? "This appointment was cancelled." : "Marked as no-show."}
              </p>
            </div>
          )}

          {isCompleted && (
            <div style={{ padding:"10px 12px", background:"rgba(59,130,246,0.06)",
              border:"1px solid rgba(59,130,246,0.2)" }}>
              <p style={{ ...MONO, fontSize:11, color:C.blue }}>✓ Appointment completed</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reschedule Modal ───────────────────────────────────────────────────────────
function RescheduleModal({ appt, onClose, onDone }) {
  const [newDate,    setNewDate]    = useState("");
  const [newTime,    setNewTime]    = useState("");
  const [slots,      setSlots]      = useState([]);
  const [allDays,    setAllDays]    = useState([]);
  const [timeOff,    setTimeOff]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [busy,       setBusy]       = useState(false);
  const [err,        setErr]        = useState("");

  const bid = appt?.barber_id || appt?.barber;
  const sid = appt?.service_id || appt?.service;

  useEffect(() => {
    if (!bid) return;
    API.get(`barbers/${bid}/working-days/`).then(r => {
      setAllDays(r.data.all_days || []);
      setTimeOff(r.data.time_off_dates || []);
    }).catch(() => {});
  }, [bid]);

  useEffect(() => {
    if (!newDate || !bid) return;
    setLoading(true); setSlots([]); setNewTime("");
    API.get(`available-slots/?barber=${bid}&date=${newDate}&service=${sid || ""}`)
      .then(r => setSlots(r.data.available_slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [newDate, bid, sid]);

  const isDisabled = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    const dow = (d.getDay() + 6) % 7;
    if (timeOff.includes(dateStr)) return true;
    const dayInfo = allDays.find(x => x.day_of_week === dow);
    return dayInfo && !dayInfo.is_working;
  };

  function to24(t) {
    if (!t) return "";
    if (t.match(/^\d{2}:\d{2}:\d{2}$/)) return t;
    if (t.match(/^\d{2}:\d{2}$/)) return t + ":00";
    const parts = t.split(" ");
    const mod = parts[1] || "";
    const [hStr, mStr] = parts[0].split(":");
    let hr = parseInt(hStr);
    if (mod === "PM" && hr !== 12) hr += 12;
    if (mod === "AM" && hr === 12) hr = 0;
    return `${String(hr).padStart(2,"0")}:${mStr}:00`;
  }

  function fmtSlot(t) {
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  }

  const submit = async () => {
    if (!newDate || !newTime) { setErr("Select a date and time"); return; }
    if (isDisabled(newDate)) { setErr("That date is not available"); return; }
    setBusy(true); setErr("");
    try {
      await API.post(`appointments/${appt.id}/reschedule/`, {
        new_date: newDate,
        new_time: to24(newTime),
      });
      onDone();
    } catch(e) {
      setErr(e?.response?.data?.error || e?.response?.data?.detail || "Could not reschedule. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.85)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:C.surface, border:`1px solid ${C.amberBorder}`,
        width:"100%", maxWidth:480, overflow:"hidden",
        clipPath:"polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))" }}>
        <div style={{ height:3, background:`linear-gradient(to right,${C.red},${C.amber})` }}/>
        <div style={{ padding:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:20 }}>
            <div>
              <p style={{ ...SF, fontSize:12, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.05em", marginBottom:2 }}>Reschedule</p>
              <p style={{ ...MONO, fontSize:11, color:C.muted }}>
                {appt?.service_name} w/ {appt?.barber_name}
              </p>
            </div>
            <button onClick={onClose}
              style={{ background:"none", border:"none", color:C.muted,
                fontSize:20, cursor:"pointer", padding:4 }}>✕</button>
          </div>

          {/* Date picker */}
          <div style={{ marginBottom:16 }}>
            <p style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.3em",
              textTransform:"uppercase", marginBottom:8 }}>New Date</p>
            <input type="date" value={newDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={e => setNewDate(e.target.value)}
              style={{ width:"100%", padding:"11px 14px", background:C.surfaceB,
                border:`1px solid ${C.border}`, color:C.text,
                ...MONO, fontSize:13, outline:"none" }}
              onFocus={e => e.target.style.borderColor = C.amberBorder}
              onBlur={e => e.target.style.borderColor = C.border}/>
          </div>

          {/* Time slots */}
          {newDate && (
            <div style={{ marginBottom:16 }}>
              <p style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.3em",
                textTransform:"uppercase", marginBottom:8 }}>
                {loading ? "Loading slots..." : `Available Times (${slots.length})`}
              </p>
              {isDisabled(newDate) ? (
                <p style={{ ...MONO, fontSize:11, color:C.red, padding:"10px 0" }}>
                  Not available on this date
                </p>
              ) : slots.length === 0 && !loading ? (
                <p style={{ ...MONO, fontSize:11, color:C.muted, padding:"10px 0" }}>
                  No available slots on this date
                </p>
              ) : (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {slots.map(s => {
                    const display = fmtSlot(s);
                    const sel = newTime === display;
                    return (
                      <button key={s} onClick={() => setNewTime(display)}
                        style={{ padding:"7px 12px",
                          background: sel ? C.amberDim : C.surfaceB,
                          border:`1px solid ${sel ? C.amber : C.border}`,
                          color: sel ? C.amber : C.text,
                          ...MONO, fontSize:11, cursor:"pointer", transition:"all 0.15s" }}>
                        {display}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {err && (
            <p style={{ ...MONO, fontSize:11, color:C.red, padding:"8px 12px",
              background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)",
              marginBottom:12 }}>{err}</p>
          )}

          <div style={{ display:"flex", gap:8 }}>
            <button disabled={busy || !newDate || !newTime} onClick={submit}
              style={{ flex:1, padding:"12px",
                background: newDate && newTime ? C.amber : "rgba(245,158,11,0.1)",
                border:"none", color: newDate && newTime ? "black" : C.sub,
                ...SF, fontSize:8, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.2em", cursor: newDate && newTime ? "pointer" : "not-allowed",
                transition:"all 0.2s", opacity:busy?0.7:1 }}>
              {busy ? "Sending..." : "Request Reschedule →"}
            </button>
            <button onClick={onClose}
              style={{ padding:"12px 16px", background:"transparent",
                border:`1px solid ${C.border}`, color:C.muted,
                ...MONO, fontSize:10, cursor:"pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cancel Modal ───────────────────────────────────────────────────────────────
function CancelModal({ appt, onConfirm, onClose }) {
  const apptDT  = new Date(`${appt.date}T${appt.time}`);
  const diffHrs = (apptDT - new Date()) / (1000 * 60 * 60);
  const isLate  = diffHrs >= 0 && diffHrs < 2;
  const isPaid  = appt.payment_method === "online" && appt.deposit_paid;
  const isShop  = appt.payment_method === "shop" || appt.payment_method === "pending_shop";

  const msg = isLate
    ? "You are cancelling within 2 hours. A strike will be issued and your deposit fee increases by $1.50."
    : isPaid
    ? `Cancel your ${appt.service_name} on ${fmtDate(appt.date)}?`
    : `Cancel your ${appt.service_name} on ${fmtDate(appt.date)} with ${appt.barber_name}?`;

  const badge = isLate ? { text:"Strike will be issued", color:C.red }
    : isPaid  ? { text:"Deposit is non-refundable", color:C.amber }
    : null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.85)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:C.surface, border:`1px solid ${isLate ? "rgba(239,68,68,0.4)" : C.border}`,
        width:"100%", maxWidth:400, overflow:"hidden",
        clipPath:"polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))" }}>
        <div style={{ height:3, background:isLate ? C.red : C.amber }}/>
        <div style={{ padding:24 }}>
          <p style={{ ...SF, fontSize:11, fontWeight:700, textTransform:"uppercase",
            letterSpacing:"0.05em", marginBottom:12 }}>
            {isLate ? "⚠️ Late Cancellation" : "Cancel Appointment"}
          </p>
          <p style={{ ...MONO, fontSize:12, color:C.sub, lineHeight:1.8, marginBottom:16 }}>{msg}</p>
          {badge && (
            <div style={{ padding:"8px 12px", background:`${badge.color}10`,
              border:`1px solid ${badge.color}30`, marginBottom:16 }}>
              <p style={{ ...MONO, fontSize:11, color:badge.color }}>{badge.text}</p>
            </div>
          )}
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={onConfirm}
              style={{ flex:1, padding:"11px",
                background: isLate ? "rgba(239,68,68,0.1)" : C.amberDim,
                border:`1px solid ${isLate ? "rgba(239,68,68,0.3)" : C.amberBorder}`,
                color: isLate ? C.red : C.amber,
                ...SF, fontSize:7, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.15em", cursor:"pointer" }}>
              {isLate ? "Yes, Cancel Anyway" : "Yes, Cancel"}
            </button>
            <button onClick={onClose}
              style={{ flex:1, padding:"11px", background:"transparent",
                border:`1px solid ${C.border}`, color:C.muted,
                ...SF, fontSize:7, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.15em", cursor:"pointer" }}>
              Keep It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard content ─────────────────────────────────────────────────────────
function DashboardContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { addNotif, showPermitPrompt } = useNotifications() || {};
  useEffect(() => { showPermitPrompt?.(); }, [showPermitPrompt]);

  const [user,         setUser]         = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState("upcoming");
  const [toast,        setToast]        = useState(null);
  const [cancelling,   setCancelling]   = useState(null);
  const [strikeInfo,   setStrikeInfo]   = useState(null);

  // Phone prompt
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [phoneInput,      setPhoneInput]      = useState("");
  const [phoneSaving,     setPhoneSaving]     = useState(false);

  // Cancel modal
  const [cancelAppt,   setCancelAppt]   = useState(null);

  // Reschedule modal
  const [reschedAppt,  setReschedAppt]  = useState(null);

  // Review
  const [showReview,   setShowReview]   = useState(false);
  const [reviewAppt,   setReviewAppt]   = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText,   setReviewText]   = useState("");
  const [reviewBusy,   setReviewBusy]   = useState(false);
  const [reviewDone,   setReviewDone]   = useState(false);

  // Password
  const [showPwd,  setShowPwd]  = useState(false);
  const [pwdForm,  setPwdForm]  = useState({ old_password:"", new_password:"" });
  const [pwdBusy,  setPwdBusy]  = useState(false);
  const [pwdErr,   setPwdErr]   = useState("");
  const [pwdOk,    setPwdOk]    = useState(false);

  // Push
  const [pushEnabled, setPushEnabled] = useState(false);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Load data
  useEffect(() => {
    const load = async () => {
      try {
        const [dash, appts] = await Promise.all([
          API.get("dashboard/"),
          API.get("appointments/"),
        ]);
        if (dash.data.is_staff) { router.replace("/barber-dashboard"); return; }
        setUser(dash.data);
        setAppointments(appts.data || []);

        API.get("client/strike-status/").then(r => {
          setStrikeInfo(r.data);
          if (!r.data.phone) setShowPhonePrompt(true);
        }).catch(() => {});

        // Check push subscription
        if ("serviceWorker" in navigator && "PushManager" in window) {
          navigator.serviceWorker.ready.then(async reg => {
            const sub = await reg.pushManager.getSubscription();
            setPushEnabled(!!sub);
          }).catch(() => {});
        }
      } catch(e) {
        if (e?.response?.status === 401) router.replace("/login");
      } finally { setLoading(false); }
    };
    load();
  }, [router]);

  // URL params
  useEffect(() => {
    if (searchParams.get("booked") === "true") {
      showToast("🎉 Booking confirmed! See you soon.");
      window.history.replaceState({}, "", "/dashboard");
    }
    if (searchParams.get("review") === "true") {
      setTimeout(() => {
        const last = appointments.filter(a => a.status === "completed")
          .sort((a,b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`))[0];
        if (last) { setReviewAppt(last); setShowReview(true); }
        window.history.replaceState({}, "", "/dashboard");
      }, 800);
    }
  }, [searchParams, appointments, showToast]);

  // Cancel
  const handleCancel = async (appt) => {
    setCancelAppt(appt);
  };

  const confirmCancel = async () => {
    if (!cancelAppt) return;
    const appt = cancelAppt;
    setCancelAppt(null);
    setCancelling(appt.id);
    try {
      await API.patch(`appointments/${appt.id}/`, { status:"cancelled" });
      setAppointments(p => p.map(a => a.id === appt.id ? { ...a, status:"cancelled" } : a));
      showToast("Appointment cancelled.");
      addNotif?.("Appointment Cancelled", "Your appointment has been cancelled.", "booking_cancelled", null);
    } catch(err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || "Could not cancel.";
      showToast(msg, "error");
    } finally { setCancelling(null); }
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    router.replace("/login");
  };

  // Tabs
  const upcoming  = appointments.filter(a => a.status !== "cancelled" && a.status !== "no_show" && new Date(`${a.date}T${a.time}`) >= new Date() - 86400000).sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  const past      = appointments.filter(a => a.status === "completed" || a.status === "no_show" || (a.status !== "cancelled" && new Date(`${a.date}T${a.time}`) < new Date() - 86400000)).sort((a,b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));
  const cancelled = appointments.filter(a => a.status === "cancelled");

  // Only show review prompt for completed appointments that haven't been reviewed yet
  const completedAppts = appointments
    .filter(a => a.status === "completed" && !a.has_review)
    .sort((a,b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));

  if (loading) return (
    <div style={{ background:C.bg, minHeight:"100vh" }}>
      <header style={{ height:52, background:"rgba(7,7,9,0.85)", borderBottom:"1px solid rgba(255,255,255,0.08)", 
        display:"flex", alignItems:"center", padding:"0 16px" }}>
        <div style={{ width:80, height:28, borderRadius:6,
          background:"linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)",
          backgroundSize:"200% 100%", animation:"shimmer 1.4s ease-in-out infinite" }}/>
        <style>{`@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>
      </header>
      <DashboardSkeleton/>
    </div>
  );

  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${C.bg};color:${C.text};}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:${C.bg};}
        ::-webkit-scrollbar-thumb{background:rgba(245,158,11,0.3);}
        input,textarea,select{font-family:inherit;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
      `}</style>

      {/* Header */}
      <header style={{ position:"sticky", top:0, zIndex:100, background:C.bg,
        borderBottom:`1px solid ${C.border}`, padding:"0 16px", height:52,
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>

        {/* Left — logo only */}
        <img src="/logo1.jpg" alt="HEADZ UP"
          style={{ height:28, objectFit:"contain", flexShrink:0 }}/>

        {/* Right — actions */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <a href="/book"
            style={{ padding:"7px 14px", background:C.amberDim,
              border:`1px solid ${C.amberBorder}`, color:C.amber,
              ...MONO, fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase",
              textDecoration:"none", whiteSpace:"nowrap" }}>
            + Book
          </a>
          <button onClick={handleLogout}
            style={{ padding:"7px 12px", background:"transparent",
              border:`1px solid ${C.border}`, color:C.muted,
              ...MONO, fontSize:10, letterSpacing:"0.1em", cursor:"pointer",
              whiteSpace:"nowrap" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
            Out
          </button>
        </div>
      </header>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"24px 20px" }}>

        {/* Phone prompt */}
        {showPhonePrompt && (
          <div style={{ background:"rgba(245,158,11,0.05)", border:`1px solid ${C.amberBorder}`,
            padding:"14px 16px", marginBottom:16, display:"flex",
            alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <span style={{ fontSize:18 }}>📱</span>
            <div style={{ flex:1 }}>
              <p style={{ ...SF, fontSize:8, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.1em", marginBottom:2 }}>Add your phone number</p>
              <p style={{ ...MONO, fontSize:11, color:C.muted }}>Get SMS reminders before your cut</p>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={phoneInput} onChange={e => setPhoneInput(e.target.value)}
                placeholder="(601) 555-0100" type="tel"
                style={{ padding:"8px 12px", background:C.surface,
                  border:`1px solid ${C.border}`, color:C.text,
                  ...MONO, fontSize:12, outline:"none", width:160 }}
                onFocus={e => e.target.style.borderColor = C.amberBorder}
                onBlur={e => e.target.style.borderColor = C.border}/>
              <button disabled={phoneSaving}
                onClick={async () => {
                  if (!phoneInput.trim()) return;
                  setPhoneSaving(true);
                  try {
                    await API.patch("client/update-phone/", { phone:phoneInput.trim() });
                    setShowPhonePrompt(false);
                    showToast("Phone saved! You'll get SMS reminders.");
                  } catch(e) { showToast("Could not save phone","error"); }
                  finally { setPhoneSaving(false); }
                }}
                style={{ padding:"8px 16px", background:C.amber, border:"none",
                  color:"black", ...SF, fontSize:6, fontWeight:700,
                  textTransform:"uppercase", cursor:"pointer" }}>
                {phoneSaving ? "..." : "Save"}
              </button>
              <button onClick={() => setShowPhonePrompt(false)}
                style={{ background:"none", border:"none", color:C.muted,
                  cursor:"pointer", fontSize:16 }}>✕</button>
            </div>
          </div>
        )}

        {/* Strike info */}
        {strikeInfo && strikeInfo.strike_count > 0 && (
          <div style={{ background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.2)",
            padding:"12px 16px", marginBottom:16, display:"flex",
            alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:16 }}>⚡</span>
              <div>
                <p style={{ ...SF, fontSize:8, color:C.red, textTransform:"uppercase",
                  letterSpacing:"0.1em", fontWeight:700 }}>
                  {strikeInfo.strike_count} Strike{strikeInfo.strike_count > 1 ? "s" : ""}
                </p>
                <p style={{ ...MONO, fontSize:11, color:C.muted }}>
                  Next deposit: ${strikeInfo.deposit_fee}
                </p>
              </div>
            </div>
            <a href="/terms" style={{ ...MONO, fontSize:9, color:C.amber,
              textDecoration:"none", letterSpacing:"0.1em" }}>View policy →</a>
          </div>
        )}

        {/* Review prompt */}
        {completedAppts.length > 0 && (
          <div style={{ background:C.surface, border:`1px solid ${C.amberBorder}`,
            padding:"14px 16px", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:20 }}>⭐</span>
                <div>
                  <p style={{ ...SF, fontSize:8, fontWeight:700, textTransform:"uppercase",
                    letterSpacing:"0.1em", marginBottom:2 }}>How was your cut?</p>
                  <p style={{ ...MONO, fontSize:11, color:C.muted }}>
                    {completedAppts[0].service_name} w/ <span style={{ color:C.amber }}>
                      {completedAppts[0].barber_name}</span> · {fmtDate(completedAppts[0].date)} at {fmtTime(completedAppts[0].time)}
                  </p>
                </div>
              </div>
              <button onClick={() => { setReviewAppt(completedAppts[0]); setShowReview(s=>!s); setReviewRating(5); setReviewText(""); }}
                style={{ padding:"7px 14px", background: showReview ? C.amberDim : "transparent",
                  border:`1px solid ${showReview ? C.amber : C.border}`,
                  color: showReview ? C.amber : C.muted,
                  ...MONO, fontSize:9, cursor:"pointer" }}>
                {showReview ? "✕ Close" : "✦ Write Review"}
              </button>
            </div>

            {showReview && (
              <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
                {/* Appointment card */}
                <div style={{ background:C.amberDim, border:`1px solid ${C.amberBorder}`,
                  padding:"10px 14px", marginBottom:14, display:"flex", gap:16, flexWrap:"wrap" }}>
                  {[
                    ["Service", reviewAppt?.service_name],
                    ["Barber",  reviewAppt?.barber_name],
                    ["Date",    fmtDate(reviewAppt?.date)],
                    ["Time",    fmtTime(reviewAppt?.time)],
                  ].map(([k,v]) => (
                    <div key={k}>
                      <p style={{ ...MONO, fontSize:8, color:C.muted, marginBottom:2 }}>{k}</p>
                      <p style={{ ...MONO, fontSize:11, color: k === "Barber" ? C.amber : C.text }}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* Stars */}
                <div style={{ marginBottom:12 }}>
                  <p style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.25em",
                    textTransform:"uppercase", marginBottom:8 }}>Your Rating</p>
                  <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setReviewRating(s)}
                        style={{ background:"none", border:"none", cursor:"pointer",
                          fontSize:28, color: s <= reviewRating ? C.amber : "rgba(255,255,255,0.1)",
                          transition:"all 0.15s", padding:"0 2px", lineHeight:1 }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.2)"; e.currentTarget.style.color = C.amber; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.color = s <= reviewRating ? C.amber : "rgba(255,255,255,0.1)"; }}>
                        ★
                      </button>
                    ))}
                    <span style={{ ...MONO, fontSize:12, color:C.amber, marginLeft:8 }}>
                      {["","😤","😕","😐","😊","🔥 Amazing!"][reviewRating]}
                    </span>
                  </div>
                </div>

                {/* Comment */}
                <textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
                  placeholder="How was the cut? The fade? The vibe?" rows={3}
                  style={{ width:"100%", padding:"10px 12px", background:C.surfaceB,
                    border:`1px solid ${C.border}`, color:C.text, ...MONO,
                    fontSize:13, outline:"none", resize:"none", marginBottom:8 }}
                  onFocus={e => e.target.style.borderColor = C.amberBorder}
                  onBlur={e => e.target.style.borderColor = C.border}/>
                <p style={{ ...MONO, fontSize:9, color:C.muted, marginBottom:12 }}>
                  {reviewText.length}/500
                </p>

                <div style={{ display:"flex", gap:8 }}>
                  <button disabled={reviewBusy}
                    onClick={async () => {
                      if (!reviewText.trim() || reviewText.trim().length < 10) {
                        showToast("Please write at least 10 characters", "error"); return;
                      }
                      setReviewBusy(true);
                      try {
                        await API.post("review/submit/", {
                          appointment_id: reviewAppt?.id,
                          completed: true,
                          rating: reviewRating,
                          comment: reviewText.trim(),
                        });
                        setReviewDone(true);
                        setShowReview(false);
                        showToast("⭐ Review submitted — thank you!");
                        addNotif?.("Review Submitted ⭐", "Thanks!", "haircut_review");
                        // Mark appointment as reviewed in state so prompt disappears
                        setAppointments(prev => prev.map(a =>
                          a.id === reviewAppt?.id ? {...a, has_review:true} : a
                        ));
                      } catch(e) {
                        showToast(e.response?.data?.error || "Could not submit", "error");
                      } finally { setReviewBusy(false); }
                    }}
                    style={{ padding:"10px 24px", background:C.amber, border:"none",
                      color:"black", ...SF, fontSize:7, fontWeight:700,
                      textTransform:"uppercase", letterSpacing:"0.15em",
                      cursor:"pointer", opacity:reviewBusy?0.7:1 }}>
                    {reviewBusy ? "Submitting..." : "Submit Review →"}
                  </button>
                  <button onClick={() => setShowReview(false)}
                    style={{ padding:"10px 16px", background:"transparent",
                      border:`1px solid ${C.border}`, color:C.muted,
                      ...MONO, fontSize:10, cursor:"pointer" }}>
                    Later
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:"flex", gap:0, marginBottom:20,
          borderBottom:`1px solid ${C.border}`, overflowX:"auto",
          WebkitOverflowScrolling:"touch",
          scrollbarWidth:"none", msOverflowStyle:"none" }}>
          {[
            { id:"upcoming",  label:"Upcoming", count:upcoming.length },
            { id:"past",      label:"Past",     count:past.length },
            { id:"cancelled", label:"Cancelled",count:cancelled.length },
            { id:"account",   label:"Account",  count:0 },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding:"10px 14px", background:"transparent",
                border:"none", borderBottom:"none",
                background: activeTab === tab.id ? C.amberDim : "transparent",
                borderRadius: 10,
                outline: activeTab === tab.id ? `1px solid ${C.amberBorder}` : "none",
                color: activeTab === tab.id ? C.amber : C.muted,
                ...MONO, fontSize:10, letterSpacing:"0.05em", textTransform:"uppercase",
                cursor:"pointer", transition:"all 0.15s", marginBottom:-1,
                whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:5 }}>
              {tab.label}
              {tab.count > 0 && (
                <span style={{ background: activeTab === tab.id ? C.amber : "rgba(255,255,255,0.08)",
                  color: activeTab === tab.id ? "black" : C.muted,
                  borderRadius:10, padding:"1px 7px", fontSize:9, fontWeight:700 }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Upcoming tab */}
        {activeTab === "upcoming" && (
          <div style={{ animation:"fadeIn 0.25s ease both" }}>
            {upcoming.length === 0 ? (
              <div style={{ textAlign:"center", padding:60,
                border:`1px dashed ${C.border}` }}>
                <p style={{ fontSize:40, marginBottom:12 }}>✂️</p>
                <p style={{ ...SF, fontSize:12, color:C.muted,
                  textTransform:"uppercase", marginBottom:8 }}>No upcoming appointments</p>
                <p style={{ ...MONO, fontSize:12, color:C.muted, marginBottom:20 }}>
                  Ready for a fresh cut?
                </p>
                <a href="/book"
                  style={{ display:"inline-block", padding:"12px 28px",
                    background:C.amber, color:"black", ...SF, fontSize:8,
                    fontWeight:700, textTransform:"uppercase", letterSpacing:"0.2em",
                    textDecoration:"none" }}>
                  Book Now →
                </a>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {upcoming.map(appt => (
                  <ApptCard key={appt.id} appt={appt}
                    onCancel={handleCancel}
                    onReschedule={setReschedAppt}
                    cancelling={cancelling}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Past tab */}
        {activeTab === "past" && (
          <div style={{ animation:"fadeIn 0.25s ease both" }}>
            {past.length === 0 ? (
              <div style={{ textAlign:"center", padding:60, border:`1px dashed ${C.border}` }}>
                <p style={{ ...MONO, fontSize:12, color:C.muted }}>No past appointments</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {past.map(appt => (
                  <ApptCard key={appt.id} appt={appt}
                    onCancel={() => {}} onReschedule={() => {}} cancelling={null}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cancelled tab */}
        {activeTab === "cancelled" && (
          <div style={{ animation:"fadeIn 0.25s ease both" }}>
            {cancelled.length === 0 ? (
              <div style={{ textAlign:"center", padding:60, border:`1px dashed ${C.border}` }}>
                <p style={{ ...MONO, fontSize:12, color:C.muted }}>No cancelled appointments</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {cancelled.map(appt => (
                  <ApptCard key={appt.id} appt={appt}
                    onCancel={() => {}} onReschedule={() => {}} cancelling={null}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Account tab */}
        {activeTab === "account" && (
          <div style={{ animation:"fadeIn 0.25s ease both", display:"flex",
            flexDirection:"column", gap:12, maxWidth:480 }}>

            {/* Profile card */}
            <div style={{ background:C.surface, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:`1px solid ${C.border}`, borderRadius:16, padding:20 }}>
              <p style={{ ...SF, fontSize:9, color:C.amber, textTransform:"uppercase",
                letterSpacing:"0.15em", marginBottom:14 }}>Profile</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  ["Username", user?.username],
                  ["Email",    user?.email || "—"],
                  ["Strikes",  strikeInfo?.strike_count ?? 0],
                  ["Next Deposit", `$${strikeInfo?.deposit_fee || "10.00"}`],
                ].map(([k,v]) => (
                  <div key={k} style={{ padding:"10px 12px", background:C.surfaceB,
                    border:`1px solid ${C.border}` }}>
                    <p style={{ ...MONO, fontSize:8, color:C.muted,
                      letterSpacing:"0.25em", textTransform:"uppercase", marginBottom:4 }}>{k}</p>
                    <p style={{ ...MONO, fontSize:13, color:C.text }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Update phone */}
            <div style={{ background:C.surface, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:`1px solid ${C.border}`, borderRadius:16, padding:20 }}>
              <p style={{ ...SF, fontSize:9, color:C.amber, textTransform:"uppercase",
                letterSpacing:"0.15em", marginBottom:14 }}>Phone Number</p>
              <div style={{ display:"flex", gap:8 }}>
                <input value={phoneInput || strikeInfo?.phone || ""}
                  onChange={e => setPhoneInput(e.target.value)}
                  placeholder="(601) 555-0100" type="tel"
                  style={{ flex:1, padding:"10px 12px", background:C.surfaceB,
                    border:`1px solid ${C.border}`, color:C.text,
                    ...MONO, fontSize:12, outline:"none" }}
                  onFocus={e => e.target.style.borderColor = C.amberBorder}
                  onBlur={e => e.target.style.borderColor = C.border}/>
                <button disabled={phoneSaving}
                  onClick={async () => {
                    setPhoneSaving(true);
                    try {
                      await API.patch("client/update-phone/", { phone:phoneInput.trim() });
                      showToast("Phone saved ✓");
                    } catch(e) { showToast("Could not save","error"); }
                    finally { setPhoneSaving(false); }
                  }}
                  style={{ padding:"10px 16px", background:C.amberDim,
                    border:`1px solid ${C.amberBorder}`, color:C.amber,
                    ...MONO, fontSize:9, cursor:"pointer" }}>
                  {phoneSaving ? "..." : "Save"}
                </button>
              </div>
            </div>

            {/* Change password */}
            <div style={{ background:C.surface, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:`1px solid ${C.border}`, borderRadius:16, padding:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom: showPwd ? 14 : 0 }}>
                <p style={{ ...MONO, fontSize:10, color:C.amber, textTransform:"uppercase",
                  letterSpacing:"0.2em" }}>Change Password</p>
                <button onClick={() => setShowPwd(o=>!o)}
                  style={{ ...MONO, fontSize:10, color:C.muted, background:"none",
                    border:"none", cursor:"pointer" }}>
                  {showPwd ? "Cancel" : "Update →"}
                </button>
              </div>
              {showPwd && (
                <div>
                  {[
                    { key:"old_password",  label:"Current Password", placeholder:"••••••••" },
                    { key:"new_password",  label:"New Password",     placeholder:"Min 8 characters" },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom:10 }}>
                      <label style={{ ...MONO, fontSize:9, color:C.muted,
                        letterSpacing:"0.25em", textTransform:"uppercase",
                        display:"block", marginBottom:6 }}>{f.label}</label>
                      <input type="password" placeholder={f.placeholder}
                        value={pwdForm[f.key]}
                        onChange={e => setPwdForm(p => ({...p, [f.key]:e.target.value}))}
                        style={{ width:"100%", padding:"10px 12px", background:C.surfaceB,
                          border:`1px solid ${C.border}`, color:C.text,
                          ...MONO, fontSize:12, outline:"none" }}/>
                    </div>
                  ))}
                  {pwdErr && <p style={{ ...MONO, fontSize:11, color:C.red, marginBottom:8 }}>{pwdErr}</p>}
                  {pwdOk  && <p style={{ ...MONO, fontSize:11, color:C.green, marginBottom:8 }}>Password updated ✓</p>}
                  <button disabled={pwdBusy}
                    onClick={async () => {
                      setPwdErr(""); setPwdOk(false); setPwdBusy(true);
                      try {
                        await API.post("change-password/", pwdForm);
                        setPwdOk(true);
                        setPwdForm({ old_password:"", new_password:"" });
                        setShowPwd(false);
                        showToast("Password updated ✓");
                      } catch(e) {
                        setPwdErr(e?.response?.data?.error || "Could not update password");
                      } finally { setPwdBusy(false); }
                    }}
                    style={{ padding:"10px 20px", background:C.amber, border:"none",
                      color:"black", ...SF, fontSize:7, fontWeight:700,
                      textTransform:"uppercase", letterSpacing:"0.15em",
                      cursor:"pointer", opacity:pwdBusy?0.7:1 }}>
                    {pwdBusy ? "Saving..." : "Update Password →"}
                  </button>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div style={{ background:C.surface, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:`1px solid ${C.border}`, borderRadius:16, padding:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <p style={{ ...SF, fontSize:9, color:C.amber, textTransform:"uppercase",
                    letterSpacing:"0.15em", marginBottom:4 }}>Push Notifications</p>
                  <p style={{ ...MONO, fontSize:11, color:C.muted }}>
                    {pushEnabled ? "✓ Enabled — you'll get booking alerts" : "Not enabled on this device"}
                  </p>
                </div>
                {!pushEnabled && (
                  <button onClick={() => window.dispatchEvent(new CustomEvent("headzup:trigger-permit"))}
                    style={{ padding:"8px 14px", background:C.amberDim,
                      border:`1px solid ${C.amberBorder}`, color:C.amber,
                      ...MONO, fontSize:9, cursor:"pointer" }}>
                    Enable →
                  </button>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <a href="/book" style={{ flex:1, padding:"12px", textAlign:"center",
                background:C.amber, color:"black", ...SF, fontSize:7, fontWeight:700,
                textTransform:"uppercase", letterSpacing:"0.15em", textDecoration:"none" }}>
                Book a Cut →
              </a>
              <a href="/terms" style={{ flex:1, padding:"12px", textAlign:"center",
                background:"transparent", color:C.muted, border:`1px solid ${C.border}`,
                ...MONO, fontSize:10, letterSpacing:"0.1em", textDecoration:"none" }}>
                Terms & Privacy
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {cancelAppt && (
        <CancelModal appt={cancelAppt} onConfirm={confirmCancel} onClose={() => setCancelAppt(null)}/>
      )}
      {reschedAppt && (
        <RescheduleModal appt={reschedAppt} onClose={() => setReschedAppt(null)}
          onDone={() => {
            setReschedAppt(null);
            showToast("Reschedule request sent to your barber ✓");
          }}/>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999,
          background: toast.type === "error" ? C.red : C.amber,
          color:"black", padding:"12px 20px", ...MONO, fontSize:11,
          borderRadius:14, letterSpacing:"0.1em",
          boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
          animation:"toastIn 0.3s ease both", maxWidth:320 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense>
      <DashboardContent/>
    </Suspense>
  );
}
