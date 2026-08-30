"use client";
export const dynamic = "force-dynamic";
import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNotifications } from "@/components/NotificationSystem";
import API from "@/lib/api";
import { useTheme, ThemeToggle } from "@/components/ThemeProvider";

// ── Design tokens ──────────────────────────────────────────────────────────────
// C is set dynamically per component from useTheme() — see DashboardContent
const C_DARK = {
  bg:"#070709", surface:"rgba(255,255,255,0.04)", surfaceB:"rgba(255,255,255,0.07)",
  border:"rgba(255,255,255,0.08)", borderB:"rgba(255,255,255,0.15)",
  amber:"#f59e0b", amberL:"#fbbf24", amberD:"#d97706",
  amberDim:"rgba(245,158,11,0.10)", amberGlow:"rgba(245,158,11,0.18)", amberBorder:"rgba(245,158,11,0.35)",
  red:"#ef4444", redDim:"rgba(239,68,68,0.10)",
  green:"#22c55e", greenDim:"rgba(34,197,94,0.10)",
  blue:"#60a5fa", blueDim:"rgba(96,165,250,0.10)",
  purple:"#a78bfa", text:"#f1f0ee", sub:"#9ca3af", muted:"#4b5563",
};
let C = C_DARK; // overridden per-render inside component
const SF   = { fontFamily:"'Syncopate',sans-serif" };
const MONO = { fontFamily:"'DM Mono',monospace" };

const glassCard = (x={}) => ({
  background:C.cardBg||C.surface, backdropFilter:"blur(20px)",
  WebkitBackdropFilter:"blur(20px)", borderRadius:16,
  border:`1px solid ${C.cardBorder||C.border}`,
  boxShadow:C.cardShadow||"0 4px 24px rgba(0,0,0,0.3)",
  ...x,
});

const STATUS_CFG = {
  confirmed:    { label:"Confirmed",  color:"var(--green)",  bg:C.greenDim  },
  pending_shop: { label:"Pending",    color:"var(--amber)",  bg:C.amberDim  },
  completed:    { label:"Completed",  color:"var(--blue)",   bg:C.blueDim   },
  cancelled:    { label:"Cancelled",  color:"var(--text-tertiary)",  bg:"rgba(75,85,99,0.15)" },
  no_show:      { label:"No Show",    color:"var(--red)",    bg:C.redDim    },
};

function fmtDate(d) {
  if (!d) return "";
  return new Date(d+"T00:00:00").toLocaleDateString("en-US",
    { weekday:"short", month:"short", day:"numeric" });
}
function fmtDateFull(d) {
  if (!d) return "";
  return new Date(d+"T00:00:00").toLocaleDateString("en-US",
    { weekday:"long", month:"long", day:"numeric", year:"numeric" });
}
function fmtTime(t) {
  if (!t) return "";
  const [h,m] = t.split(":");
  const hr = parseInt(h);
  return `${hr%12||12}:${m} ${hr>=12?"PM":"AM"}`;
}
function daysUntil(dateStr, timeStr) {
  const appt = new Date(`${dateStr}T${timeStr}`);
  const now  = new Date();
  const diff = appt - now;
  if (diff < 0) return null;
  const hrs  = Math.floor(diff / 3600000);
  if (hrs < 1) return "< 1 hour";
  if (hrs < 24) return `${hrs} hour${hrs>1?"s":""}`;
  const days = Math.floor(hrs/24);
  return `${days} day${days>1?"s":""}`;
}

// ── Appointment Card ───────────────────────────────────────────────────────────
function ApptCard({ appt, onCancel, onReschedule, cancelling }) {
  const [open, setOpen] = useState(false);
  const st = STATUS_CFG[appt.status] || STATUS_CFG.confirmed;
  const isCancelled = ["cancelled","no_show"].includes(appt.status);
  const isCompleted = appt.status === "completed";
  const apptDT  = new Date(`${appt.date}T${appt.time}`);
  const isPast  = apptDT < new Date();
  const isToday = appt.date === new Date().toISOString().split("T")[0];
  const diffHrs = (apptDT - new Date()) / 3600000;
  const isUrgent = diffHrs >= 0 && diffHrs < 2;

  return (
    <div className="card-hover" style={{ ...glassCard(),
      overflow:"hidden", opacity:isCancelled?0.6:1, transition:"all 0.22s" }}>
      <div style={{ height:3, background:`linear-gradient(to right,${st.color}70,transparent)` }}/>

      <div onClick={()=>setOpen(o=>!o)}
        style={{ padding:"16px 18px", cursor:"pointer", display:"flex",
          alignItems:"center", gap:14, justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, flex:1, minWidth:0 }}>
          {/* Time pill */}
          <div style={{ background:isUrgent?"rgba(239,68,68,0.12)":C.amberDim,
            border:`1px solid ${isUrgent?"rgba(239,68,68,0.35)":C.amberBorder}`,
            borderRadius:10, padding:"8px 10px", textAlign:"center", flexShrink:0,
            minWidth:58 }}>
            <p style={{ ...SF, fontSize:12, fontWeight:700,
              color:isUrgent?C.red:C.amber, lineHeight:1 }}>
              {fmtTime(appt.time).split(" ")[0]}
            </p>
            <p style={{ ...MONO, fontSize:8, color:isUrgent?C.red:C.amberD, marginTop:2 }}>
              {fmtTime(appt.time).split(" ")[1]}
            </p>
            {isToday && !isPast && (
              <p style={{ ...MONO, fontSize:7, color:isUrgent?C.red:C.amber,
                marginTop:2, letterSpacing:"0.1em" }}>TODAY</p>
            )}
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
              <p style={{ ...MONO, fontSize:14, fontWeight:700, color:"var(--text-primary)",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {appt.service_name || appt.service}
              </p>
              {isUrgent && (
                <span style={{ ...MONO, fontSize:8, color:"var(--red)", padding:"2px 6px",
                  background:C.redDim, borderRadius:6, flexShrink:0 }}>SOON</span>
              )}
            </div>
            <p style={{ ...MONO, fontSize:11, color:C.sub }}>
              {appt.barber_name} · {fmtDate(appt.date)}
            </p>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10,
            padding:"3px 10px", borderRadius:9999,
            background:st.bg, color:st.color,
            border:`1px solid ${st.color}25`,
            whiteSpace:"nowrap", letterSpacing:"0.04em",
            display:"inline-flex", alignItems:"center", gap:5 }}>
            <span style={{
              width:5, height:5, borderRadius:"50%",
              background:st.color,
              boxShadow:`0 0 6px ${st.color}`,
              flexShrink:0,
            }}/>
            {st.label}
          </span>
          <span style={{ color:"var(--text-tertiary)", fontSize:11, transition:"transform 0.2s",
            display:"inline-block", transform:open?"rotate(180deg)":"none" }}>▾</span>
        </div>
      </div>

      {open && (
        <div style={{ borderTop:`1px solid ${C.border}`,
          padding:"16px 18px", background:"rgba(0,0,0,0.15)" }}>

          {/* Details grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
            gap:8, marginBottom:14 }}>
            {[
              ["Service",  appt.service_name],
              ["Barber",   appt.barber_name],
              ["Date",     fmtDate(appt.date)],
              ["Time",     fmtTime(appt.time)],
              ["Duration", `${appt.service_duration} min`],
              ["Price",    `$${appt.service_price}`],
              ["Payment",  appt.payment_method==="online"?"💳 Online":"🏪 Shop"],
              ["Status",   st.label],
            ].map(([k,v])=>(
              <div key={k} style={{ padding:"8px 10px",
                background:"rgba(255,255,255,0.03)", borderRadius:10,
                border:`1px solid ${C.border}` }}>
                <p style={{ ...MONO, fontSize:8, color:"var(--text-tertiary)",
                  letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:3 }}>{k}</p>
                <p style={{ ...MONO, fontSize:11, color:C.text }}>{v}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          {!isCancelled && !isCompleted && !isPast && (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={()=>onReschedule(appt)}
                style={{ padding:"9px 16px", background:C.amberDim,
                  border:`1px solid ${C.amberBorder}`, borderRadius:10,
                  color:"var(--amber)", ...MONO, fontSize:10, cursor:"pointer",
                  transition:"all 0.2s" }}
                onMouseEnter={e=>e.currentTarget.style.background=C.amberGlow}
                onMouseLeave={e=>e.currentTarget.style.background=C.amberDim}>
                ↻ Reschedule
              </button>
              <button disabled={cancelling===appt.id} onClick={()=>onCancel(appt)}
                style={{ padding:"9px 16px",
                  background:isUrgent?"rgba(239,68,68,0.12)":C.surface,
                  border:`1px solid ${isUrgent?"rgba(239,68,68,0.3)":C.border}`,
                  borderRadius:10, color:isUrgent?C.red:C.muted,
                  ...MONO, fontSize:10, cursor:"pointer", transition:"all 0.2s" }}>
                {cancelling===appt.id?"Cancelling...":isUrgent?"⚠️ Late Cancel":"✕ Cancel"}
              </button>
            </div>
          )}

          {isCancelled && (
            <div style={{ padding:"10px 12px", borderRadius:10,
              background:C.redDim, border:`1px solid ${C.red}25` }}>
              <p style={{ ...MONO, fontSize:11, color:C.red }}>
                {appt.status==="no_show"?"Marked as no-show.":"This appointment was cancelled."}
              </p>
            </div>
          )}
          {isCompleted && (
            <div style={{ padding:"10px 12px", borderRadius:10,
              background:C.blueDim, border:`1px solid ${C.blue}25` }}>
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
  const [newDate,  setNewDate]  = useState("");
  const [newTime,  setNewTime]  = useState("");
  const [slots,    setSlots]    = useState([]);
  const [allDays,  setAllDays]  = useState([]);
  const [timeOff,  setTimeOff]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState("");
  const bid = appt?.barber_id || appt?.barber;
  const sid = appt?.service_id || appt?.service;

  useEffect(()=>{
    if(!bid)return;
    API.get(`barbers/${bid}/working-days/`).then(r=>{
      setAllDays(r.data.all_days||[]);
      setTimeOff(r.data.time_off_dates||[]);
    }).catch(()=>{});
  },[bid]);

  useEffect(()=>{
    if(!newDate||!bid)return;
    setLoading(true); setSlots([]); setNewTime("");
    API.get(`available-slots/?barber=${bid}&date=${newDate}&service=${sid||""}`)
      .then(r=>setSlots(r.data.available_slots||[]))
      .catch(()=>setSlots([]))
      .finally(()=>setLoading(false));
  },[newDate,bid,sid]);

  const isDisabled = (dateStr)=>{
    const d = new Date(dateStr+"T00:00:00");
    // Past dates
    const today = new Date(); today.setHours(0,0,0,0);
    if(d < today) return true;
    // Sunday always closed
    if(d.getDay()===0) return true;
    // Time off
    if(timeOff.includes(dateStr)) return true;
    // No barber days loaded yet — disable everything until loaded
    if(allDays.length===0) return true;
    // Check barber working days (Mon=0 ... Sat=5)
    const dow = (d.getDay()+6)%7;
    const di = allDays.find(x=>x.day_of_week===dow);
    // If no record for this day OR barber not working → disabled
    if(!di || !di.is_working) return true;
    return false;
  };

  function fmtSlot(t){
    const[h,m]=t.split(":");
    const hr=parseInt(h);
    return `${hr%12||12}:${m} ${hr>=12?"PM":"AM"}`;
  }

  const submit = async()=>{
    if(!newDate||!newTime){setErr("Select a date and time");return;}
    setBusy(true); setErr("");
    try{
      await API.post(`appointments/${appt.id}/reschedule/`,{
        new_date:newDate,
        new_time:newTime.includes("M")?
          (()=>{const p=newTime.split(" ");const mod=p[1];const[h,m]=p[0].split(":");let hr=parseInt(h);if(mod==="PM"&&hr!==12)hr+=12;if(mod==="AM"&&hr===12)hr=0;return `${String(hr).padStart(2,"0")}:${m}:00`;})()
          :newTime
      });
      onDone();
    }catch(e){setErr(e?.response?.data?.error||"Could not reschedule");}
    finally{setBusy(false);}
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.85)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{...glassCard({borderColor:C.amberBorder}),width:"100%",maxWidth:480,overflow:"hidden"}}>
        <div style={{height:3,background:"linear-gradient(to right,#ef4444,#f59e0b)"}}/>
        <div style={{padding:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div>
              <p style={{...SF,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"-0.02em",marginBottom:2}}>Reschedule</p>
              <p style={{...MONO,fontSize:11,color:C.sub}}>{appt?.service_name} w/ {appt?.barber_name}</p>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",color:"var(--text-tertiary)",fontSize:20,cursor:"pointer",padding:4}}>✕</button>
          </div>
          <div style={{marginBottom:14}}>
            <p style={{...MONO,fontSize:9,color:"var(--text-tertiary)",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:8}}>New Date</p>
            <input type="date" value={newDate} min={new Date().toISOString().split("T")[0]}
              onChange={e=>setNewDate(e.target.value)}
              style={{width:"100%",padding:"11px 14px",background:C.inputBg,
                backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",
                border:`1px solid ${C.border}`,borderRadius:10,color:"var(--text-primary)",...MONO,fontSize:13,outline:"none"}}/>
          </div>
          {newDate&&(
            <div style={{marginBottom:14}}>
              <p style={{...MONO,fontSize:9,color:"var(--text-tertiary)",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:8}}>
                {loading?"Loading...":isDisabled(newDate)?(allDays.length>0?"✕ Barber not available this day":"Loading schedule..."):(slots.length>0?`${slots.length} times available`:"No open slots — try another day")}
              </p>
              {!isDisabled(newDate)&&slots.length===0&&!loading&&(
                <p style={{...MONO,fontSize:11,color:C.muted}}>No open slots — try another day</p>
              )}
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {slots.map(s=>{
                  const display=fmtSlot(s);
                  const sel=newTime===display;
                  return(
                    <button key={s} onClick={()=>setNewTime(display)}
                      style={{padding:"9px 14px",background:sel?C.amber:C.surface,
                        border:`1px solid ${sel?C.amber:C.border}`,borderRadius:10,
                        color:sel?"#000":C.text,...MONO,fontSize:12,cursor:"pointer",
                        transition:"all 0.15s",fontWeight:sel?700:400}}>
                      {display}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {err&&<p style={{...MONO,fontSize:11,color:"var(--red)",marginBottom:12,padding:"8px 12px",background:C.redDim,borderRadius:8}}>{err}</p>}
          <div style={{display:"flex",gap:8}}>
            <button disabled={busy||!newDate||!newTime} onClick={submit}
              style={{flex:1,padding:"12px",
                background:newDate&&newTime?"linear-gradient(135deg,#f59e0b,#d97706)":"rgba(245,158,11,0.1)",
                border:"none",borderRadius:12,color:newDate&&newTime?"#000":C.sub,
                ...SF,fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.2em",
                cursor:newDate&&newTime?"pointer":"not-allowed",
                boxShadow:newDate&&newTime?"0 4px 20px rgba(245,158,11,0.3)":"none",
                opacity:busy?0.7:1,transition:"all 0.2s"}}>
              {busy?"Sending...":"Request Reschedule →"}
            </button>
            <button onClick={onClose}
              style={{padding:"12px 16px",background:"var(--surface)",border:`1px solid ${C.border}`,
                borderRadius:12,color:"var(--text-tertiary)",...MONO,fontSize:10,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cancel Modal ───────────────────────────────────────────────────────────────
function CancelModal({ appt, onConfirm, onClose }) {
  const diffHrs = (new Date(`${appt.date}T${appt.time}`) - new Date()) / 3600000;
  const isLate  = diffHrs >= 0 && diffHrs < 2;
  const isPaid  = appt.payment_method === "online" && appt.deposit_paid;

  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.85)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{...glassCard({borderColor:isLate?"rgba(239,68,68,0.4)":C.border}),
        width:"100%",maxWidth:400,overflow:"hidden"}}>
        <div style={{height:3,background:isLate?C.red:C.amber}}/>
        <div style={{padding:24}}>
          <p style={{...SF,fontSize:12,fontWeight:700,textTransform:"uppercase",
            letterSpacing:"-0.02em",marginBottom:12}}>
            {isLate?"⚠️ Late Cancellation":"Cancel Appointment"}
          </p>
          <p style={{...MONO,fontSize:12,color:"var(--text-secondary)",lineHeight:1.8,marginBottom:16}}>
            {isLate
              ? "Cancelling within 2 hours will issue a strike and increase your deposit fee."
              : `Cancel ${appt.service_name} on ${fmtDate(appt.date)} with ${appt.barber_name}?`}
          </p>
          {isPaid&&!isLate&&(
            <div style={{padding:"8px 12px",background:C.amberDim,
              border:`1px solid ${C.amberBorder}`,borderRadius:10,marginBottom:16}}>
              <p style={{...MONO,fontSize:11,color:C.amber}}>⚠️ Deposit is non-refundable</p>
            </div>
          )}
          {isLate&&(
            <div style={{padding:"8px 12px",background:C.redDim,
              border:`1px solid ${C.red}30`,borderRadius:10,marginBottom:16}}>
              <p style={{...MONO,fontSize:11,color:C.red}}>⚡ A strike will be added to your account</p>
            </div>
          )}
          <div style={{display:"flex",gap:8}}>
            <button onClick={onConfirm}
              style={{flex:1,padding:"12px",
                background:isLate?"rgba(239,68,68,0.12)":C.amberDim,
                border:`1px solid ${isLate?"rgba(239,68,68,0.3)":C.amberBorder}`,
                borderRadius:12,color:isLate?C.red:C.amber,
                ...SF,fontSize:7,fontWeight:700,textTransform:"uppercase",
                letterSpacing:"0.15em",cursor:"pointer"}}>
              {isLate?"Cancel Anyway":"Yes, Cancel"}
            </button>
            <button onClick={onClose}
              style={{flex:1,padding:"12px",background:"var(--surface)",
                border:`1px solid ${C.border}`,borderRadius:12,color:"var(--text-tertiary)",
                ...SF,fontSize:7,fontWeight:700,textTransform:"uppercase",
                letterSpacing:"0.15em",cursor:"pointer"}}>
              Keep It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
function DashboardContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { addNotif, showPermitPrompt } = useNotifications() || {};
  const { theme: T, isDark } = useTheme();
  // Override module-level C with theme tokens so ALL C.xxx refs use current theme
  C = T;
  useEffect(()=>{ showPermitPrompt?.(); },[showPermitPrompt]);

  const [user,         setUser]         = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState("upcoming");
  const [toast,        setToast]        = useState(null);
  const [cancelling,   setCancelling]   = useState(null);
  const [strikeInfo,   setStrikeInfo]   = useState(null);
  const [cancelAppt,   setCancelAppt]   = useState(null);
  const [reschedAppt,  setReschedAppt]  = useState(null);

  // Phone prompt
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [phoneInput,      setPhoneInput]      = useState("");
  const [phoneSaving,     setPhoneSaving]     = useState(false);

  // Review
  const [showReview,   setShowReview]   = useState(false);
  const [reviewAppt,   setReviewAppt]   = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText,   setReviewText]   = useState("");
  const [reviewBusy,   setReviewBusy]   = useState(false);

  // Password
  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ old_password:"", new_password:"" });
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdErr,  setPwdErr]  = useState("");
  const [pwdOk,   setPwdOk]   = useState(false);

  // Push
  const [pushEnabled, setPushEnabled] = useState(false);

  const showToast = useCallback((msg,type="success")=>{
    setToast({msg,type});
    setTimeout(()=>setToast(null),3500);
  },[]);

  // Load data
  useEffect(()=>{
    const load = async()=>{
      try{
        const [dash,appts] = await Promise.all([
          API.get("dashboard/"),
          API.get("appointments/"),
        ]);
        if(dash.data.is_staff){router.replace("/barber-dashboard");return;}
        setUser(dash.data);
        setAppointments(appts.data||[]);
        API.get("client/strike-status/").then(r=>{
          setStrikeInfo(r.data);
          if(!r.data.phone) setShowPhonePrompt(true);
        }).catch(()=>{});
        if("serviceWorker" in navigator&&"PushManager" in window){
          navigator.serviceWorker.ready.then(async reg=>{
            const sub = await reg.pushManager.getSubscription();
            setPushEnabled(!!sub);
          }).catch(()=>{});
        }
      }catch(e){
        if(e?.response?.status===401)router.replace("/login");
      }finally{setLoading(false);}
    };
    load();
  },[router]);

  // URL params
  useEffect(()=>{
    if(searchParams.get("booked")==="true"){
      showToast("🎉 Booking confirmed! See you soon.");
      window.history.replaceState({},"","/dashboard");
    }
    if(searchParams.get("review")==="true"){
      setTimeout(()=>{
        const last = appointments.filter(a=>a.status==="completed"&&!a.has_review)
          .sort((a,b)=>new Date(`${b.date}T${b.time}`)-new Date(`${a.date}T${a.time}`))[0];
        if(last){setReviewAppt(last);setShowReview(true);}
        window.history.replaceState({},"","/dashboard");
      },800);
    }
  },[searchParams,appointments,showToast]);

  // Derived data
  const now       = new Date();
  const upcoming  = appointments.filter(a=>
    !["cancelled","no_show"].includes(a.status)&&
    new Date(`${a.date}T${a.time}`)>=new Date(now-86400000)
  ).sort((a,b)=>new Date(`${a.date}T${a.time}`)-new Date(`${b.date}T${b.time}`));

  const past = appointments.filter(a=>
    a.status==="completed"||a.status==="no_show"||
    (!["cancelled"].includes(a.status)&&new Date(`${a.date}T${a.time}`)<new Date(now-86400000))
  ).sort((a,b)=>new Date(`${b.date}T${b.time}`)-new Date(`${a.date}T${a.time}`));

  const cancelled = appointments.filter(a=>a.status==="cancelled");

  const completedAppts = appointments
    .filter(a=>a.status==="completed"&&!a.has_review)
    .sort((a,b)=>new Date(`${b.date}T${b.time}`)-new Date(`${a.date}T${a.time}`));

  const nextAppt = upcoming.find(a=>new Date(`${a.date}T${a.time}`)>new Date());

  // Stats
  const totalVisits    = appointments.filter(a=>a.status==="completed").length;
  const totalSpent     = appointments
    .filter(a=>a.status==="completed")
    .reduce((s,a)=>s+parseFloat(a.service_price||0),0);
  const cancelRate     = appointments.length>0
    ? Math.round((cancelled.length/appointments.length)*100) : 0;
  const favoriteService = (() => {
    const counts = {};
    appointments.filter(a=>a.status==="completed").forEach(a=>{
      const n = a.service_name||a.service||"Unknown";
      counts[n]=(counts[n]||0)+1;
    });
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    return top?top[0]:null;
  })();

  // Cancel handler
  const handleCancel = async(appt)=>setCancelAppt(appt);
  const confirmCancel = async()=>{
    if(!cancelAppt)return;
    const appt = cancelAppt;
    setCancelAppt(null);
    setCancelling(appt.id);
    try{
      await API.patch(`appointments/${appt.id}/`,{status:"cancelled"});
      setAppointments(p=>p.map(a=>a.id===appt.id?{...a,status:"cancelled"}:a));
      showToast("Appointment cancelled.");
    }catch(err){
      showToast(err?.response?.data?.detail||"Could not cancel.","error");
    }finally{setCancelling(null);}
  };

  const handleLogout = ()=>{
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    router.replace("/login");
  };

  if(loading) return (
    <div style={{background:"var(--bg)",minHeight:"100vh"}}>
      <header style={{height:52,background:"rgba(7,7,9,0.85)",backdropFilter:"blur(20px)",
        WebkitBackdropFilter:"blur(20px)",borderBottom:`1px solid ${C.border}`,
        display:"flex",alignItems:"center",padding:"0 20px"}}>
        <div style={{width:80,height:28,borderRadius:8,
          background:"linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)",
          backgroundSize:"200% 100%",animation:"shimmer 1.4s ease-in-out infinite"}}/>
        <style>{`@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>
      </header>
      <div style={{maxWidth:720,margin:"0 auto",padding:"24px 20px"}}>
        {[1,2,3,4].map(i=>(
          <div key={i} style={{height:80,marginBottom:10,borderRadius:16,
            background:"linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.04) 75%)",
            backgroundSize:"200% 100%",animation:"shimmer 1.4s ease-in-out infinite"}}/>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{background:"var(--bg)",minHeight:"100vh",color:C.text}}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.bg}!important;color:${T.text}!important;}
        ::selection{background:rgba(245,158,11,0.3);}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(245,158,11,0.2);border-radius:4px;}
        input,textarea,select,button{font-family:inherit;}
        input:focus,textarea:focus,select:focus{border-color:${T.amberBorder}!important;box-shadow:0 0 0 3px ${T.amberDim}!important;outline:none;}
        select{background:${T.surface};color:${T.text};}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        input::placeholder,textarea::placeholder{color:${C.placeholder||C.muted}!important;opacity:1!important;}
        input,textarea,select{color:${C.text}!important;background:${C.inputBg}!important;}
        @keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(0.96)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .fade-up{animation:fadeUp 0.28s ease both;}
        .card-hover{transition:all 0.22s cubic-bezier(0.4,0,0.2,1);}
        .card-hover:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,0.5)!important;}
        *{-webkit-tap-highlight-color:transparent;}
        button,a{touch-action:manipulation;}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.5);}
      `}</style>

      {/* ── Header ── */}
      <header style={{position:"sticky",top:0,zIndex:100,
        background:T.headerBg,backdropFilter:"blur(20px)",
        WebkitBackdropFilter:"blur(20px)",borderBottom:`1px solid ${T.border}`,
        padding:"0 20px",height:56,display:"flex",alignItems:"center",
        justifyContent:"space-between",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <a href="/" style={{display:"flex",alignItems:"center",gap:6,
            padding:"6px 10px",background:"var(--surface)",backdropFilter:"blur(10px)",
            WebkitBackdropFilter:"blur(10px)",border:`1px solid ${C.border}`,
            borderRadius:8,color:"var(--text-tertiary)",textDecoration:"none",
            ...MONO,fontSize:9,letterSpacing:"0.1em",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.amberBorder;e.currentTarget.style.color=C.amber;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
            ← Home
          </a>
          <img src="/logo1.jpg" alt="HEADZ UP" style={{height:28,objectFit:"contain"}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <a href="/book"
            style={{padding:"7px 16px",background:"linear-gradient(135deg,#f59e0b,#d97706)",
              border:"none",borderRadius:10,color:"#000",...SF,fontSize:7,fontWeight:700,
              textTransform:"uppercase",letterSpacing:"0.15em",textDecoration:"none",
              boxShadow:"0 3px 14px rgba(245,158,11,0.3)",display:"inline-block"}}>
            + Book
          </a>
          <ThemeToggle/>
          <button onClick={handleLogout}
            style={{padding:"7px 12px",background:T.surface,backdropFilter:"blur(10px)",
              WebkitBackdropFilter:"blur(10px)",border:`1px solid ${T.border}`,
              borderRadius:10,color:T.muted,...MONO,fontSize:9,letterSpacing:"0.15em",
              cursor:"pointer",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.red;e.currentTarget.style.color=C.red;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.muted;}}>
            Out
          </button>
        </div>
      </header>

      <div style={{maxWidth:760,margin:"0 auto",padding:"24px 20px"}}>

        {/* ── Next appointment hero ── */}
        {nextAppt && (
          <div style={{...glassCard({padding:0,marginBottom:16,overflow:"hidden",
            borderColor:C.amberBorder,position:"relative"})}} className="fade-up">
            <div style={{height:3,background:"linear-gradient(to right,#ef4444,#f59e0b,#fbbf24)"}}/>
            <div style={{position:"absolute",top:0,right:0,width:200,height:"100%",
              background:"radial-gradient(ellipse at right,rgba(245,158,11,0.06),transparent)",
              pointerEvents:"none"}}/>
            <div style={{padding:"20px 24px",display:"flex",alignItems:"center",
              justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <div style={{width:56,height:56,borderRadius:"50%",flexShrink:0,
                  background:"linear-gradient(135deg,#f59e0b,#d97706)",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,
                  boxShadow:"0 0 0 4px rgba(245,158,11,0.15)"}}>
                  ✂️
                </div>
                <div>
                  <p style={{...MONO,fontSize:9,color:C.amberD,letterSpacing:"0.35em",
                    textTransform:"uppercase",marginBottom:4}}>Next Appointment</p>
                  <p style={{...SF,fontSize:14,fontWeight:700,color:"var(--text-primary)",
                    textTransform:"uppercase",letterSpacing:"-0.02em",marginBottom:4}}>
                    {nextAppt.service_name}
                  </p>
                  <p style={{...MONO,fontSize:11,color:C.sub}}>
                    {nextAppt.barber_name} · {fmtDateFull(nextAppt.date)} at {fmtTime(nextAppt.time)}
                  </p>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{...SF,fontSize:28,fontWeight:700,color:"var(--amber)",lineHeight:1,marginBottom:4}}>
                  {daysUntil(nextAppt.date,nextAppt.time)}
                </p>
                <p style={{...MONO,fontSize:9,color:"var(--text-tertiary)",letterSpacing:"0.2em"}}>AWAY</p>
                <div style={{display:"flex",gap:6,marginTop:10,justifyContent:"flex-end"}}>
                  <button onClick={()=>setReschedAppt(nextAppt)}
                    style={{padding:"6px 12px",background:C.amberDim,
                      border:`1px solid ${C.amberBorder}`,borderRadius:8,
                      color:"var(--amber)",...MONO,fontSize:9,cursor:"pointer"}}>
                    ↻
                  </button>
                  <button onClick={()=>setCancelAppt(nextAppt)}
                    style={{padding:"6px 12px",background:"var(--surface)",
                      border:`1px solid ${C.border}`,borderRadius:8,
                      color:"var(--text-tertiary)",...MONO,fontSize:9,cursor:"pointer"}}>
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Stats row ── */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",
          gap:10,marginBottom:16}}>
          {[
            {label:"Total Visits",  value:totalVisits,                    icon:"✂️", color:C.amber},
            {label:"Total Spent",   value:`$${totalSpent.toFixed(0)}`,    icon:"💰", color:C.green},
            {label:"Upcoming",      value:upcoming.length,                icon:"📅", color:C.blue},
            {label:"Cancel Rate",   value:`${cancelRate}%`,               icon:"📊", color:cancelRate>20?C.red:C.muted},
          ].map(s=>(
            <div key={s.label} className="card-hover"
              style={{...glassCard({padding:"16px 14px",position:"relative",overflow:"hidden"})}}>
              <div style={{position:"absolute",top:0,left:0,width:"100%",height:2,
                background:`linear-gradient(to right,${s.color}60,transparent)`}}/>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"flex-start",marginBottom:8}}>
                <p style={{...MONO,fontSize:8,color:"var(--text-tertiary)",letterSpacing:"0.25em",
                  textTransform:"uppercase",lineHeight:1.4}}>{s.label}</p>
                <span style={{fontSize:14,opacity:0.5}}>{s.icon}</span>
              </div>
              <p style={{...SF,fontSize:22,fontWeight:700,color:s.color,lineHeight:1}}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Loyalty card ── */}
        {totalVisits > 0 && (
          <div style={{...glassCard({padding:20,marginBottom:16})}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              flexWrap:"wrap",gap:12}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:44,height:44,borderRadius:12,
                  background:totalVisits>=10?"linear-gradient(135deg,#f59e0b,#d97706)":C.amberDim,
                  border:`1px solid ${C.amberBorder}`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                  {totalVisits>=20?"👑":totalVisits>=10?"⭐":"💈"}
                </div>
                <div>
                  <p style={{...SF,fontSize:9,fontWeight:700,color:"var(--amber)",
                    textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>
                    {totalVisits>=20?"VIP Client":totalVisits>=10?"Regular":totalVisits>=5?"Rising":"New Client"}
                  </p>
                  <p style={{...MONO,fontSize:11,color:C.sub}}>
                    {totalVisits} visits · ${totalSpent.toFixed(2)} total
                    {favoriteService&&` · Favorite: ${favoriteService}`}
                  </p>
                </div>
              </div>
              {/* Progress to next level */}
              {totalVisits < 20 && (
                <div style={{minWidth:180}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <p style={{...MONO,fontSize:9,color:C.muted}}>
                      {totalVisits<5?`${5-totalVisits} to Regular`:totalVisits<10?`${10-totalVisits} to Regular`:totalVisits<20?`${20-totalVisits} to VIP`:""}
                    </p>
                    <p style={{...MONO,fontSize:9,color:C.amber}}>
                      {totalVisits<5?`${totalVisits}/5`:totalVisits<10?`${totalVisits}/10`:`${totalVisits}/20`}
                    </p>
                  </div>
                  <div style={{height:6,background:C.border,borderRadius:4}}>
                    <div style={{height:"100%",borderRadius:4,
                      background:"linear-gradient(to right,#f59e0b,#fbbf24)",
                      width:`${Math.min(100,totalVisits<5?(totalVisits/5*100):totalVisits<10?((totalVisits-5)/5*100):(totalVisits-10)/10*100)}%`,
                      transition:"width 0.8s ease"}}/>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Phone prompt ── */}
        {showPhonePrompt && (
          <div style={{...glassCard({padding:"14px 18px",marginBottom:16,
            borderColor:C.amberBorder})}}>
            <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <span style={{fontSize:18}}>📱</span>
              <div style={{flex:1}}>
                <p style={{...MONO,fontSize:12,fontWeight:700,color:"var(--text-primary)",marginBottom:2}}>
                  Add your phone number
                </p>
                <p style={{...MONO,fontSize:10,color:C.muted}}>
                  Get SMS reminders before your cut
                </p>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input value={phoneInput} onChange={e=>setPhoneInput(e.target.value)}
                  placeholder="(601) 555-0100" type="tel"
                  style={{padding:"9px 12px",background:"rgba(255,255,255,0.05)",
                    border:`1px solid ${C.border}`,borderRadius:10,color:"var(--text-primary)",
                    ...MONO,fontSize:12,outline:"none",width:160}}/>
                <button disabled={phoneSaving}
                  onClick={async()=>{
                    if(!phoneInput.trim())return;
                    setPhoneSaving(true);
                    try{
                      await API.patch("client/update-phone/",{phone:phoneInput.trim()});
                      setShowPhonePrompt(false);
                      showToast("Phone saved! You'll get SMS reminders.");
                    }catch(e){showToast("Could not save phone","error");}
                    finally{setPhoneSaving(false);}
                  }}
                  style={{padding:"9px 16px",background:"linear-gradient(135deg,#f59e0b,#d97706)",
                    border:"none",borderRadius:10,color:"#000",...SF,fontSize:6,fontWeight:700,
                    textTransform:"uppercase",cursor:"pointer",opacity:phoneSaving?0.7:1}}>
                  {phoneSaving?"...":"Save"}
                </button>
                <button onClick={()=>setShowPhonePrompt(false)}
                  style={{background:"none",border:"none",color:"var(--text-tertiary)",
                    cursor:"pointer",fontSize:18,padding:4}}>✕</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Strike warning ── */}
        {strikeInfo?.strike_count>0 && (
          <div style={{...glassCard({padding:"14px 18px",marginBottom:16,
            borderColor:"rgba(239,68,68,0.3)"})}}>
            <div style={{display:"flex",alignItems:"center",
              justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>⚡</span>
                <div>
                  <p style={{...SF,fontSize:8,color:"var(--red)",textTransform:"uppercase",
                    letterSpacing:"0.1em",marginBottom:2}}>
                    {strikeInfo.strike_count} Strike{strikeInfo.strike_count>1?"s":""} on Account
                  </p>
                  <p style={{...MONO,fontSize:11,color:C.muted}}>
                    Next deposit: <strong style={{color:C.amber}}>${strikeInfo.deposit_fee}</strong> · Please arrive on time
                  </p>
                </div>
              </div>
              <a href="/terms" style={{...MONO,fontSize:9,color:"var(--amber)",
                textDecoration:"none",letterSpacing:"0.1em"}}>Policy →</a>
            </div>
          </div>
        )}

        {/* ── Review prompt ── */}
        {completedAppts.length>0 && (
          <div style={{...glassCard({padding:20,marginBottom:16,
            borderColor:C.amberBorder})}}>
            <div style={{display:"flex",alignItems:"center",
              justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:showReview?16:0}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:42,height:42,borderRadius:12,
                  background:"linear-gradient(135deg,#f59e0b,#d97706)",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                  ⭐
                </div>
                <div>
                  <p style={{...MONO,fontSize:13,fontWeight:700,color:"var(--text-primary)",marginBottom:2}}>
                    How was your cut?
                  </p>
                  <p style={{...MONO,fontSize:11,color:C.sub}}>
                    {completedAppts[0].service_name} w/{" "}
                    <span style={{color:C.amber}}>{completedAppts[0].barber_name}</span>
                    {" "}· {fmtDate(completedAppts[0].date)} at {fmtTime(completedAppts[0].time)}
                  </p>
                </div>
              </div>
              <button onClick={()=>{
                setReviewAppt(completedAppts[0]);
                setShowReview(s=>!s);
                setReviewRating(5); setReviewText("");
              }} style={{padding:"8px 16px",
                background:showReview?"linear-gradient(135deg,#f59e0b,#d97706)":C.amberDim,
                border:`1px solid ${C.amberBorder}`,borderRadius:10,
                color:showReview?"#000":C.amber,...MONO,fontSize:10,cursor:"pointer",
                transition:"all 0.2s"}}>
                {showReview?"✕ Close":"✦ Review"}
              </button>
            </div>

            {showReview && (
              <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16}}>
                {/* Appointment detail */}
                <div style={{display:"flex",gap:12,padding:"10px 14px",
                  background:C.amberDim,border:`1px solid ${C.amberBorder}`,
                  borderRadius:10,marginBottom:14,flexWrap:"wrap"}}>
                  {[["Service",reviewAppt?.service_name],["Barber",reviewAppt?.barber_name],
                    ["Date",fmtDate(reviewAppt?.date)],["Time",fmtTime(reviewAppt?.time)]].map(([k,v])=>(
                    <div key={k} style={{minWidth:80}}>
                      <p style={{...MONO,fontSize:8,color:"var(--text-tertiary)",marginBottom:2}}>{k}</p>
                      <p style={{...MONO,fontSize:11,color:k==="Barber"?C.amber:C.text}}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* Stars */}
                <div style={{marginBottom:12}}>
                  <p style={{...MONO,fontSize:9,color:"var(--text-tertiary)",letterSpacing:"0.25em",
                    textTransform:"uppercase",marginBottom:8}}>Rating</p>
                  <div style={{display:"flex",gap:4,alignItems:"center"}}>
                    {[1,2,3,4,5].map(s=>(
                      <button key={s} onClick={()=>setReviewRating(s)}
                        style={{background:"none",border:"none",cursor:"pointer",
                          fontSize:30,color:s<=reviewRating?C.amber:"rgba(255,255,255,0.1)",
                          transition:"all 0.15s",padding:"0 2px",lineHeight:1}}
                        onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.2)";e.currentTarget.style.color=C.amber;}}
                        onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.color=s<=reviewRating?C.amber:"rgba(255,255,255,0.1)";}}>
                        ★
                      </button>
                    ))}
                    <span style={{...MONO,fontSize:13,color:"var(--amber)",marginLeft:8}}>
                      {["","😤","😕","😐","😊","🔥"][reviewRating]}
                    </span>
                  </div>
                </div>

                <textarea value={reviewText} onChange={e=>setReviewText(e.target.value)}
                  placeholder="How was the cut? The fade? The vibe?" rows={3}
                  style={{width:"100%",padding:"10px 14px",
                    background:C.inputBg,backdropFilter:"blur(10px)",
                    WebkitBackdropFilter:"blur(10px)",border:`1px solid ${C.border}`,
                    borderRadius:10,color:"var(--text-primary)",...MONO,fontSize:13,
                    outline:"none",resize:"none",marginBottom:6}}/>
                <p style={{...MONO,fontSize:9,color:"var(--text-tertiary)",marginBottom:12}}>
                  {reviewText.length}/500 characters
                </p>

                <div style={{display:"flex",gap:8}}>
                  <button disabled={reviewBusy} onClick={async()=>{
                    if(!reviewText.trim()||reviewText.trim().length<10){
                      showToast("Write at least 10 characters","error");return;
                    }
                    setReviewBusy(true);
                    try{
                      await API.post("review/submit/",{
                        appointment_id:reviewAppt?.id,
                        completed:true,rating:reviewRating,
                        comment:reviewText.trim(),
                      });
                      setAppointments(p=>p.map(a=>a.id===reviewAppt?.id?{...a,has_review:true}:a));
                      setShowReview(false);
                      showToast("⭐ Review submitted — thank you!");
                      addNotif?.("Review Submitted ⭐","Thanks for your feedback!","haircut_review");
                    }catch(e){showToast(e.response?.data?.error||"Could not submit","error");}
                    finally{setReviewBusy(false);}
                  }} style={{padding:"11px 24px",
                    background:"linear-gradient(135deg,#f59e0b,#d97706)",
                    border:"none",borderRadius:12,color:"#000",...SF,fontSize:7,
                    fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em",
                    cursor:"pointer",boxShadow:"0 4px 20px rgba(245,158,11,0.3)",
                    opacity:reviewBusy?0.7:1}}>
                    {reviewBusy?"Submitting...":"Submit →"}
                  </button>
                  <button onClick={()=>setShowReview(false)}
                    style={{padding:"11px 16px",background:"var(--surface)",
                      border:`1px solid ${C.border}`,borderRadius:12,
                      color:"var(--text-tertiary)",...MONO,fontSize:10,cursor:"pointer"}}>Later</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{display:"flex",gap:0,marginBottom:20,
          borderBottom:`1px solid ${C.border}`,overflowX:"auto",
          WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
          {[
            {id:"upcoming",  label:"Upcoming",  count:upcoming.length},
            {id:"past",      label:"Past",       count:past.length},
            {id:"cancelled", label:"Cancelled",  count:cancelled.length},
            {id:"account",   label:"Account",    count:0},
          ].map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              style={{padding:"12px 18px",background:"transparent",border:"none",
                borderBottom:`2px solid ${activeTab===tab.id?C.amber:"transparent"}`,
                color:activeTab===tab.id?C.amber:C.muted,...MONO,fontSize:10,
                letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",
                transition:"all 0.15s",marginBottom:-1,whiteSpace:"nowrap",
                display:"flex",alignItems:"center",gap:6}}>
              {tab.label}
              {tab.count>0&&(
                <span style={{background:activeTab===tab.id?C.amber:"rgba(255,255,255,0.08)",
                  color:activeTab===tab.id?"black":C.muted,borderRadius:10,
                  padding:"1px 7px",fontSize:9,fontWeight:700}}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="fade-up" key={activeTab}>

          {/* Upcoming */}
          {activeTab==="upcoming"&&(
            upcoming.length===0?(
              <div style={{textAlign:"center",padding:60,...glassCard({borderStyle:"dashed"})}}>
                <p style={{fontSize:40,marginBottom:12}}>✂️</p>
                <p style={{...SF,fontSize:12,color:"var(--text-tertiary)",textTransform:"uppercase",marginBottom:8}}>
                  No upcoming appointments
                </p>
                <p style={{...MONO,fontSize:12,color:"var(--text-tertiary)",marginBottom:20}}>Ready for a fresh cut?</p>
                <a href="/book" style={{display:"inline-block",padding:"12px 28px",
                  background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#000",
                  ...SF,fontSize:8,fontWeight:700,textTransform:"uppercase",
                  letterSpacing:"0.2em",textDecoration:"none",borderRadius:12,
                  boxShadow:"0 4px 20px rgba(245,158,11,0.3)"}}>
                  Book Now →
                </a>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {upcoming.map(a=>(
                  <ApptCard key={a.id} appt={a}
                    onCancel={handleCancel} onReschedule={setReschedAppt}
                    cancelling={cancelling}/>
                ))}
              </div>
            )
          )}

          {/* Past */}
          {activeTab==="past"&&(
            past.length===0?(
              <div style={{textAlign:"center",padding:60,...glassCard({borderStyle:"dashed"})}}>
                <p style={{...MONO,fontSize:12,color:C.muted}}>No past appointments yet</p>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {past.map(a=>(
                  <ApptCard key={a.id} appt={a}
                    onCancel={()=>{}} onReschedule={()=>{}} cancelling={null}/>
                ))}
              </div>
            )
          )}

          {/* Cancelled */}
          {activeTab==="cancelled"&&(
            cancelled.length===0?(
              <div style={{textAlign:"center",padding:60,...glassCard({borderStyle:"dashed"})}}>
                <p style={{...MONO,fontSize:12,color:C.muted}}>No cancelled appointments</p>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {cancelled.map(a=>(
                  <ApptCard key={a.id} appt={a}
                    onCancel={()=>{}} onReschedule={()=>{}} cancelling={null}/>
                ))}
              </div>
            )
          )}

          {/* Account */}
          {activeTab==="account"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:480}}>

              {/* Profile */}
              <div style={{...glassCard({padding:20})}}>
                <p style={{...MONO,fontSize:10,color:"var(--amber)",textTransform:"uppercase",
                  letterSpacing:"0.2em",marginBottom:14}}>Profile</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[
                    ["Username",    user?.username],
                    ["Email",       user?.email||"—"],
                    ["Strikes",     strikeInfo?.strike_count??0],
                    ["Next Deposit",`$${strikeInfo?.deposit_fee||"10.00"}`],
                    ["Total Visits",totalVisits],
                    ["Total Spent", `$${totalSpent.toFixed(2)}`],
                  ].map(([k,v])=>(
                    <div key={k} style={{padding:"10px 12px",background:"rgba(255,255,255,0.03)",
                      borderRadius:10,border:`1px solid ${C.border}`}}>
                      <p style={{...MONO,fontSize:8,color:"var(--text-tertiary)",letterSpacing:"0.25em",
                        textTransform:"uppercase",marginBottom:4}}>{k}</p>
                      <p style={{...MONO,fontSize:13,color:C.text}}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phone */}
              <div style={{...glassCard({padding:20})}}>
                <p style={{...MONO,fontSize:10,color:"var(--amber)",textTransform:"uppercase",
                  letterSpacing:"0.2em",marginBottom:12}}>Phone Number</p>
                <div style={{display:"flex",gap:8}}>
                  <input value={phoneInput||strikeInfo?.phone||""}
                    onChange={e=>setPhoneInput(e.target.value)}
                    placeholder="(601) 555-0100" type="tel"
                    style={{flex:1,padding:"11px 14px",background:C.inputBg,
                      backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",
                      border:`1px solid ${C.border}`,borderRadius:10,color:"var(--text-primary)",
                      ...MONO,fontSize:12,outline:"none"}}/>
                  <button disabled={phoneSaving}
                    onClick={async()=>{
                      setPhoneSaving(true);
                      try{
                        await API.patch("client/update-phone/",{phone:phoneInput.trim()});
                        showToast("Phone saved ✓");
                      }catch(e){showToast("Could not save","error");}
                      finally{setPhoneSaving(false);}
                    }} style={{padding:"11px 18px",
                      background:"linear-gradient(135deg,#f59e0b,#d97706)",
                      border:"none",borderRadius:10,color:"#000",...MONO,fontSize:10,
                      cursor:"pointer",fontWeight:700,opacity:phoneSaving?0.7:1}}>
                    {phoneSaving?"...":"Save"}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div style={{...glassCard({padding:20})}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:showPwd?14:0}}>
                  <p style={{...MONO,fontSize:10,color:"var(--amber)",textTransform:"uppercase",
                    letterSpacing:"0.2em"}}>Change Password</p>
                  <button onClick={()=>setShowPwd(o=>!o)}
                    style={{...MONO,fontSize:10,color:"var(--text-tertiary)",background:"none",
                      border:"none",cursor:"pointer"}}>
                    {showPwd?"Cancel":"Update →"}
                  </button>
                </div>
                {showPwd&&(
                  <div>
                    {[{key:"old_password",label:"Current Password",ph:"••••••••"},
                      {key:"new_password",label:"New Password",ph:"Min 8 characters"}].map(f=>(
                      <div key={f.key} style={{marginBottom:10}}>
                        <label style={{...MONO,fontSize:9,color:"var(--text-tertiary)",letterSpacing:"0.25em",
                          textTransform:"uppercase",display:"block",marginBottom:6}}>{f.label}</label>
                        <input type="password" placeholder={f.ph}
                          value={pwdForm[f.key]}
                          onChange={e=>setPwdForm(p=>({...p,[f.key]:e.target.value}))}
                          style={{width:"100%",padding:"11px 14px",
                            background:C.inputBg,backdropFilter:"blur(10px)",
                            WebkitBackdropFilter:"blur(10px)",border:`1px solid ${C.border}`,
                            borderRadius:10,color:"var(--text-primary)",...MONO,fontSize:12,outline:"none"}}/>
                      </div>
                    ))}
                    {pwdErr&&<p style={{...MONO,fontSize:11,color:"var(--red)",marginBottom:8}}>{pwdErr}</p>}
                    {pwdOk &&<p style={{...MONO,fontSize:11,color:"var(--green)",marginBottom:8}}>✓ Password updated</p>}
                    <button disabled={pwdBusy} onClick={async()=>{
                      setPwdErr("");setPwdOk(false);setPwdBusy(true);
                      try{
                        await API.post("change-password/",pwdForm);
                        setPwdOk(true);
                        setPwdForm({old_password:"",new_password:""});
                        setShowPwd(false);showToast("Password updated ✓");
                      }catch(e){setPwdErr(e?.response?.data?.error||"Could not update");}
                      finally{setPwdBusy(false);}
                    }} style={{padding:"11px 20px",
                      background:"linear-gradient(135deg,#f59e0b,#d97706)",
                      border:"none",borderRadius:10,color:"#000",...SF,fontSize:7,
                      fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em",
                      cursor:"pointer",opacity:pwdBusy?0.7:1}}>
                      {pwdBusy?"Saving...":"Update →"}
                    </button>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div style={{...glassCard({padding:20})}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <p style={{...MONO,fontSize:10,color:"var(--amber)",textTransform:"uppercase",
                      letterSpacing:"0.2em",marginBottom:4}}>Push Notifications</p>
                    <p style={{...MONO,fontSize:11,color:C.muted}}>
                      {pushEnabled?"✓ Enabled on this device":"Not enabled on this device"}
                    </p>
                  </div>
                  {!pushEnabled&&(
                    <button onClick={()=>window.dispatchEvent(new CustomEvent("headzup:trigger-permit"))}
                      style={{padding:"9px 16px",background:C.amberDim,
                        border:`1px solid ${C.amberBorder}`,borderRadius:10,
                        color:"var(--amber)",...MONO,fontSize:9,cursor:"pointer"}}>
                      Enable →
                    </button>
                  )}
                </div>
              </div>

              {/* Links */}
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <a href="/book" style={{flex:1,padding:"13px",textAlign:"center",
                  background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#000",
                  ...SF,fontSize:7,fontWeight:700,textTransform:"uppercase",
                  letterSpacing:"0.15em",textDecoration:"none",borderRadius:12,
                  boxShadow:"0 4px 20px rgba(245,158,11,0.3)"}}>
                  Book a Cut →
                </a>
                <a href="/sms-optin" style={{flex:1,padding:"13px",textAlign:"center",
                  background:"var(--surface)",backdropFilter:"blur(10px)",
                  WebkitBackdropFilter:"blur(10px)",color:"var(--text-tertiary)",
                  border:`1px solid ${C.border}`,borderRadius:12,...MONO,
                  fontSize:10,letterSpacing:"0.1em",textDecoration:"none"}}>
                  SMS Settings
                </a>
                <a href="/terms" style={{flex:1,padding:"13px",textAlign:"center",
                  background:"var(--surface)",backdropFilter:"blur(10px)",
                  WebkitBackdropFilter:"blur(10px)",color:"var(--text-tertiary)",
                  border:`1px solid ${C.border}`,borderRadius:12,...MONO,
                  fontSize:10,letterSpacing:"0.1em",textDecoration:"none"}}>
                  Terms
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {cancelAppt&&<CancelModal appt={cancelAppt} onConfirm={confirmCancel} onClose={()=>setCancelAppt(null)}/>}
      {reschedAppt&&<RescheduleModal appt={reschedAppt} onClose={()=>setReschedAppt(null)}
        onDone={()=>{setReschedAppt(null);showToast("Reschedule request sent ✓");}}/>}

      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,
          background:toast.type==="error"?C.red:"linear-gradient(135deg,#f59e0b,#d97706)",
          color:"#000",padding:"12px 20px",borderRadius:12,...MONO,fontSize:11,
          letterSpacing:"0.08em",fontWeight:700,
          boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
          animation:"toastIn 0.3s cubic-bezier(0.4,0,0.2,1) both",maxWidth:320}}>
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
