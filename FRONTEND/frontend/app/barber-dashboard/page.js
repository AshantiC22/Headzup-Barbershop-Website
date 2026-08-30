"use client";
export const dynamic = "force-dynamic";
import { useNotifications } from "@/components/NotificationSystem";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";
import { ScheduleSkeleton } from "@/components/Skeleton";
import { useTheme, ThemeToggle, GLOBAL_THEME_CSS } from "@/components/ThemeProvider";

// ── Design System ──────────────────────────────────────────────────────────────
let C = {
  bg:"var(--bg)", bgDeep:"#050507",
  glass:"var(--surface)", glassB:"var(--surface-b)", glassC:"rgba(255,255,255,0.11)",
  border:"var(--border)", borderB:"rgba(255,255,255,0.15)",
  amber:"var(--amber)", amberL:"var(--amber-l)", amberD:"var(--amber-d)",
  amberDim:"rgba(245,158,11,0.10)", amberGlow:"rgba(245,158,11,0.20)", amberBorder:"rgba(245,158,11,0.35)",
  red:"var(--red)", redDim:"rgba(239,68,68,0.10)",
  green:"var(--green)", greenDim:"rgba(34,197,94,0.10)",
  blue:"var(--blue)", blueDim:"rgba(96,165,250,0.10)",
  purple:"#a78bfa", text:"var(--text)", sub:"var(--text-sub)", muted:"var(--text-muted)",
};
const SF   = { fontFamily:"'Syncopate',sans-serif" };
const MONO = { fontFamily:"'DM Mono',monospace" };

const glassCard = (x={}) => ({ background:C.cardBg||C.surface, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderRadius:16, border:`1px solid ${C.cardBorder||C.border}`, boxShadow:C.cardShadow||"0 4px 24px rgba(0,0,0,0.4)", ...x });
const inputSt   = (x={}) => ({ width:"100%", padding:"11px 14px", background:C.inputBg||C.surface, backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)", border:`1px solid ${C.border}`, borderRadius:10, color:C.text, ...MONO, fontSize:13, outline:"none", transition:"all 0.2s", ...x });

const STATUS_CFG = {
  confirmed:    { label:"Confirmed", color:C.green,  bg:C.greenDim },
  pending_shop: { label:"Pending",   color:C.amber,  bg:C.amberDim },
  completed:    { label:"Completed", color:C.blue,   bg:C.blueDim  },
  cancelled:    { label:"Cancelled", color:C.muted,  bg:"rgba(75,85,99,0.15)" },
  no_show:      { label:"No Show",   color:C.red,    bg:C.redDim   },
};

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}
function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
}
function todayStr() { return new Date().toISOString().split("T")[0]; }

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color = C.amber }) {
  return (
    <div style={{ ...glassCard(), padding:"18px 20px", flex:1, minWidth:120, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(to right, ${color}, transparent)` }}/>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <p style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.3em", textTransform:"uppercase" }}>{label}</p>
        {icon && <span style={{ fontSize:18, opacity:0.6 }}>{icon}</span>}
      </div>
      <p style={{ ...SF, fontSize:24, fontWeight:700, color, lineHeight:1 }}>{value}</p>
    </div>
  );
}

// ── Appointment Card ───────────────────────────────────────────────────────────
function ApptCard({ appt, onStatus, onCancel, onStrike, onRemind }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(appt.barber_notes || "");
  const [saving, setSaving] = useState(false);
  const st = STATUS_CFG[appt.status] || STATUS_CFG.confirmed;
  const isCancelled = ["cancelled","no_show"].includes(appt.status);
  const isCompleted = appt.status === "completed";
  const isPast = new Date(`${appt.date}T${appt.time}`) < new Date();

  return (
    <div className="card-hover" style={{ ...glassCard(), overflow:"hidden", opacity:isCancelled?0.6:1, transition:"all 0.25s", cursor:"pointer" }}>
      {/* Top accent bar */}
      <div style={{ height:3, background:`linear-gradient(to right, ${st.color}80, transparent)` }}/>

      {/* Header */}
      <div onClick={() => setOpen(o=>!o)} style={{ padding:"16px 18px", display:"flex", alignItems:"center", gap:14, justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, flex:1, minWidth:0 }}>
          {/* Time pill */}
          <div style={{ background:C.amberDim, border:`1px solid ${C.amberBorder}`, borderRadius:10, padding:"8px 12px", textAlign:"center", flexShrink:0 }}>
            <p style={{ ...SF, fontSize:13, fontWeight:700, color:C.amber, lineHeight:1 }}>{fmtTime(appt.time).split(" ")[0]}</p>
            <p style={{ ...MONO, fontSize:8, color:C.amberD, marginTop:2 }}>{fmtTime(appt.time).split(" ")[1]}</p>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ ...MONO, fontSize:14, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:3 }}>
              {appt.client}
            </p>
            <p style={{ ...MONO, fontSize:11, color:C.sub }}>{appt.service} · {appt.service_duration}min</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <span style={{ ...MONO, fontSize:10, padding:"4px 10px", borderRadius:20, background:st.bg, color:st.color, border:`1px solid ${st.color}30`, whiteSpace:"nowrap" }}>
            {st.label}
          </span>
          <span style={{ color:C.muted, fontSize:11, transition:"transform 0.2s", display:"inline-block", transform:open?"rotate(180deg)":"none" }}>▾</span>
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:"16px 18px", background:"rgba(0,0,0,0.2)" }}>
          {isCancelled ? (
            <div style={{ padding:"12px 14px", borderRadius:10, background:C.redDim, border:`1px solid ${C.red}25`, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:18 }}>❌</span>
              <p style={{ ...MONO, fontSize:11, color:C.red }}>
                {appt.status === "no_show" ? "Client did not appear." : "This appointment was cancelled."}
              </p>
            </div>
          ) : isCompleted ? (
            <div style={{ padding:"12px 14px", borderRadius:10, background:C.blueDim, border:`1px solid ${C.blue}25` }}>
              <p style={{ ...MONO, fontSize:11, color:C.blue }}>✓ Appointment completed</p>
            </div>
          ) : (
            <>
              {/* Action buttons */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
                {appt.status === "pending_shop" && (
                  <button onClick={() => onStatus(appt.id,"confirmed")}
                    style={{ padding:"9px 16px", background:C.greenDim, border:`1px solid ${C.green}40`, borderRadius:10, color:C.green, ...MONO, fontSize:10, cursor:"pointer", transition:"all 0.2s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(34,197,94,0.18)"}
                    onMouseLeave={e=>e.currentTarget.style.background=C.greenDim}>
                    ✓ Confirm Arrival
                  </button>
                )}
                {appt.status === "confirmed" && (
                  <button onClick={() => onStatus(appt.id,"completed")}
                    style={{ padding:"9px 16px", background:C.blueDim, border:`1px solid ${C.blue}40`, borderRadius:10, color:C.blue, ...MONO, fontSize:10, cursor:"pointer", transition:"all 0.2s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(96,165,250,0.18)"}
                    onMouseLeave={e=>e.currentTarget.style.background=C.blueDim}>
                    ✓ Mark Complete
                  </button>
                )}
                <button onClick={() => onRemind(appt.id)}
                  style={{ padding:"9px 16px", background:C.amberDim, border:`1px solid ${C.amberBorder}`, borderRadius:10, color:C.amber, ...MONO, fontSize:10, cursor:"pointer", transition:"all 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.amberGlow}
                  onMouseLeave={e=>e.currentTarget.style.background=C.amberDim}>
                  🔔 Remind
                </button>
                <button onClick={() => onCancel(appt.id)}
                  style={{ padding:"9px 16px", background:C.redDim, border:`1px solid ${C.red}30`, borderRadius:10, color:C.red, ...MONO, fontSize:10, cursor:"pointer", transition:"all 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.18)"}
                  onMouseLeave={e=>e.currentTarget.style.background=C.redDim}>
                  ✕ Cancel
                </button>
                {isPast && !["no_show","cancelled","completed"].includes(appt.status) && (
                  <button onClick={() => onStrike(appt.id,"no_show")}
                    style={{ padding:"9px 16px", background:C.redDim, border:`1px solid ${C.red}30`, borderRadius:10, color:C.red, ...MONO, fontSize:10, cursor:"pointer" }}>
                    ⚡ No Show
                  </button>
                )}
              </div>

              {/* Details grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
                {[["Price",`$${appt.service_price}`],["Duration",`${appt.service_duration}m`],["Payment",appt.payment_method==="online"
                    ?(appt.deposit_paid?`💳 $${appt.deposit_amount||"10.00"} Deposited`:"💳 Online")
                    :"🏪 Pay in Shop"]].map(([k,v])=>(
                  <div key={k} style={{ padding:"10px", background:"var(--surface)", borderRadius:10, border:`1px solid ${C.border}`, textAlign:"center" }}>
                    <p style={{ ...MONO, fontSize:8, color:C.muted, letterSpacing:"0.25em", textTransform:"uppercase", marginBottom:4 }}>{k}</p>
                    <p style={{ ...MONO, fontSize:12, color:C.text }}>{v}</p>
                  </div>
                ))}
              </div>

              {/* Barber notes */}
              <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2}
                placeholder="Add a note about this client..."
                style={{ ...inputSt({ borderRadius:10, resize:"none", marginBottom:8 }) }}
                onFocus={e=>{e.target.style.borderColor=C.amberBorder;e.target.style.boxShadow="0 0 0 3px rgba(245,158,11,0.08)";}}
                onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow="none";}}/>
              <button disabled={saving} onClick={async()=>{
                setSaving(true);
                try{await API.patch(`barber/appointments/${appt.id}/`,{barber_notes:note});}catch(e){}
                finally{setSaving(false);}
              }} style={{ padding:"7px 16px", background:C.amberDim, border:`1px solid ${C.amberBorder}`, borderRadius:8, color:C.amber, ...MONO, fontSize:9, cursor:"pointer" }}>
                {saving?"Saving...":"Save Note"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function BarberDashboard() {
  const router = useRouter();
  const { addNotif, showPermitPrompt } = useNotifications() || {};
  const { theme: T, isDark } = useTheme();
  C = T; // All C.xxx refs now use current theme
  useEffect(() => { showPermitPrompt?.(); }, [showPermitPrompt]);

  // Listen for new review push notifications to increment badge
  useEffect(() => {
    const handlePush = (e) => {
      if (e.detail?.type === "review" || e.detail?.notif_type === "haircut_review") {
        setReviewBadge(p => {
          const next = p + 1;
          localStorage.setItem("headzup_review_badge", String(next));
          return next;
        });
      }
    };
    window.addEventListener("headzup:push", handlePush);
    return () => window.removeEventListener("headzup:push", handlePush);
  }, []);

  const [barber,       setBarber]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState("schedule");
  const [isMobile,     setIsMobile]     = useState(false);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [toast,        setToast]        = useState(null);
  const [reviewBadge,  setReviewBadge]  = useState(0);

  // Schedule
  const [schedule,     setSchedule]     = useState([]);
  const [schedDate,    setSchedDate]    = useState(todayStr());
  const [schedLoading, setSchedLoading] = useState(false);
  const [summary,      setSummary]      = useState({ total:0, confirmed:0, online_revenue:"0.00", pay_in_shop:0 });
  const [clearingDay,  setClearingDay]  = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Availability
  const [availability, setAvailability] = useState([]);
  const [timeOff,      setTimeOff]      = useState([]);
  const [newTimeOff,   setNewTimeOff]   = useState({ date:"", reason:"" });

  // Clients
  const [clients,      setClients]      = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selClient,    setSelClient]    = useState(null);
  const [blastOpen,    setBlastOpen]    = useState(false);
  const [blastForm,    setBlastForm]    = useState({ subject:"HEADZ UP Barbershop — Hattiesburg MS", message:"", send_sms:true, send_email:true });
  const [blastSel,     setBlastSel]     = useState([]);
  const [blastBusy,    setBlastBusy]    = useState(false);
  const [extContacts,  setExtContacts]  = useState([]);
  const [extName,      setExtName]      = useState("");
  const [extPhone,     setExtPhone]     = useState("");
  const [extEmail,     setExtEmail]     = useState("");
  const [showExtForm,  setShowExtForm]  = useState(false);

  // Walk-in
  const [walkIn,       setWalkIn]       = useState({ client_name:"", service_id:"", date:todayStr(), time:"", payment_method:"shop", phone:"", email:"", notes:"" });
  const [walkInBusy,   setWalkInBusy]   = useState(false);
  const [services,     setServices]     = useState([]);

  // Reviews
  const [reviews,      setReviews]      = useState([]);
  const [reviewReply,  setReviewReply]  = useState({});

  // Reschedules
  const [reschedules,  setReschedules]  = useState([]);

  // Reports
  const [reports,      setReports]      = useState(null);
  const [reportPeriod, setReportPeriod] = useState("month");

  // Newsletter
  const [posts,        setPosts]        = useState([]);
  const [postForm,     setPostForm]     = useState({ title:"", body:"", emoji:"✂️", pinned:false });
  const [postBusy,     setPostBusy]     = useState(false);

  // Stripe
  const [stripeStatus, setStripeStatus] = useState(null);
  const [stripeLoad,   setStripeLoad]   = useState(false);
  const [payments,     setPayments]     = useState([]);
  const [payPeriod,    setPayPeriod]    = useState("month");
  const [payStats,     setPayStats]     = useState({ total_deposits:0, count:0, stripe_balance:{available:0,pending:0} });
  const [payLoading,   setPayLoading]   = useState(false);

  // Profile
  const [profileSaving,setProfileSaving]= useState(false);
  const [profileForm,  setProfileForm]  = useState({ bio:"", cashapp_tag:"" });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [prices,       setPrices]       = useState([]);

  const showToast = useCallback((msg, type="success") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),3500);
  },[]);

  // Mobile
  useEffect(()=>{
    const check = ()=>setIsMobile(window.innerWidth<768);
    check(); window.addEventListener("resize",check);
    return ()=>window.removeEventListener("resize",check);
  },[]);

  // Auth + init
  useEffect(()=>{
    const init = async()=>{
      try{
        const [dash,me] = await Promise.all([API.get("dashboard/"),API.get("barber/me/")]);
        if(!dash.data.is_staff){router.replace("/dashboard");return;}
        setBarber(me.data);
        const svc = await API.get("services/");
        setServices(svc.data||[]);
        // Check unread reviews — count from localStorage to persist across renders
        const cachedBadge = parseInt(localStorage.getItem("headzup_review_badge")||"0");
        if (cachedBadge > 0) setReviewBadge(cachedBadge);
        // Also fetch fresh count
        try {
          const rev = await API.get("barber/reviews/", { _noCache: true });
          const unread = (rev.data.reviews||[]).filter(r=>!r.barber_seen).length;
          setReviewBadge(unread);
          localStorage.setItem("headzup_review_badge", String(unread));
        } catch(e) {}
      }catch(e){
        if(e?.response?.status===401)router.replace("/barber-login");
      }finally{setLoading(false);}
    };
    init();
  },[router]);

  // Load schedule
  const loadSchedule = useCallback(async(date)=>{
    setSchedLoading(true);
    try{
      const r = await API.get(`barber/schedule/?date=${date}`);
      setSchedule(r.data.appointments||[]);
      setSummary(r.data.summary||{});
    }catch(e){}
    finally{setSchedLoading(false);}
  },[]);

  useEffect(()=>{ if(activeTab==="schedule") loadSchedule(schedDate); },[schedDate,activeTab,loadSchedule]);

  // Auto-refresh every 60s
  useEffect(()=>{
    if(activeTab!=="schedule")return;
    const id = setInterval(()=>loadSchedule(schedDate),60000);
    return()=>clearInterval(id);
  },[activeTab,schedDate,loadSchedule]);

  // Load tab data
  useEffect(()=>{
    if(!barber)return;
    const load = async()=>{
      try{
        if(activeTab==="availability"){
          const [a,t] = await Promise.all([API.get("barber/availability/"),API.get("barber/time-off/")]);
          setAvailability(a.data||[]); setTimeOff(t.data||[]);
        }
        if(activeTab==="clients"){const r=await API.get("barber/clients/");setClients(r.data||[]);}
        if(activeTab==="reviews"){
          const r=await API.get("barber/reviews/", { _noCache:true });
          setReviews(r.data.reviews||[]);
          setReviewBadge(0);
          localStorage.setItem("headzup_review_badge","0");
        }
        if(activeTab==="reschedules"){const r=await API.get("barber/reschedules/");setReschedules(r.data||[]);}
        if(activeTab==="reports"){const r=await API.get(`barber/reports/?period=${reportPeriod}`);setReports(r.data);}
        if(activeTab==="newsletter"){const r=await API.get("newsletter/manage/");setPosts(r.data||[]);}
        if(activeTab==="stripe"){const r=await API.get("barber/stripe/status/");setStripeStatus(r.data);}
        if(activeTab==="payments"){
          setPayLoading(true);
          try{
            const r=await API.get(`barber/payments/?period=${payPeriod}`);
            setPayments(r.data.payments||[]);
            setPayStats({
              total_deposits: r.data.total_deposits||0,
              count: r.data.count||0,
              stripe_balance: r.data.stripe_balance||{available:0,pending:0},
            });
          }finally{setPayLoading(false);}
        }
        if(activeTab==="walkin"){const r=await API.get("barber/service-prices/");setPrices(r.data||[]);}
      }catch(e){}
    };
    load();
  },[activeTab,barber,reportPeriod]);

  // Handlers
  const handleStatusChange = async(id,status)=>{
    try{
      await API.patch(`barber/appointments/${id}/`,{status});
      setSchedule(p=>p.map(a=>a.id===id?{...a,status}:a));
      showToast(status==="completed"?"Appointment complete ✓":"Status updated");
    }catch(e){showToast("Could not update","error");}
  };
  const handleCancel = async(id)=>{
    if(!window.confirm("Cancel this appointment? Client will be notified."))return;
    try{
      await API.delete(`barber/appointments/${id}/`);
      setSchedule(p=>p.map(a=>a.id===id?{...a,status:"cancelled"}:a));
      showToast("Cancelled — client notified");
    }catch(e){showToast("Could not cancel","error");}
  };
  const handleStrike = async(id,reason)=>{
    if(!window.confirm(`Issue a ${reason==="no_show"?"no-show":"late cancel"} strike?`))return;
    try{
      const r = await API.post(`barber/appointments/${id}/strike/`,{reason});
      setSchedule(p=>p.map(a=>a.id===id?{...a,status:reason==="no_show"?"no_show":"cancelled"}:a));
      showToast(`Strike issued — next deposit $${r.data.next_deposit}`);
    }catch(e){showToast("Could not issue strike","error");}
  };
  const handleRemind = async(id)=>{
    try{await API.post(`barber/appointments/${id}/remind/`);showToast("Reminder sent 🔔");}
    catch(e){showToast("Could not send reminder","error");}
  };
  const handleWalkIn = async()=>{
    if(!walkIn.client_name||!walkIn.service_id||!walkIn.time){showToast("Fill in name, service, and time","error");return;}
    setWalkInBusy(true);
    try{
      await API.post("barber/walk-in/",walkIn);
      showToast("Walk-in booked ✓");
      setWalkIn({client_name:"",service_id:"",date:todayStr(),time:"",payment_method:"shop",phone:"",email:"",notes:""});
      if(schedDate===walkIn.date)loadSchedule(schedDate);
    }catch(e){showToast(e.response?.data?.error||"Could not book","error");}
    finally{setWalkInBusy(false);}
  };
  const handleReschedule = async(id,action)=>{
    try{
      await API.post(`barber/reschedules/${id}/`,{action});
      setReschedules(p=>p.map(r=>r.id===id?{...r,status:action==="accept"?"accepted":"rejected"}:r));
      showToast(action==="accept"?"Reschedule approved ✓":"Declined");
    }catch(e){showToast("Could not process","error");}
  };
  const handleBlast = async()=>{
    if(!blastForm.message.trim()){showToast("Write a message first","error");return;}
    const recipients = clients.filter(c=>blastSel.includes(c.id)).map(c=>({name:c.name,phone:c.phone||"",email:c.email||""}));
    if(!recipients.length){showToast("Select at least one client","error");return;}
    setBlastBusy(true);
    try{
      const r = await API.post("barber/blast/",{...blastForm,recipients});
      showToast(`Sent! ${r.data.sms_sent||0} SMS · ${r.data.email_sent||0} emails`);
      setBlastOpen(false);
    }catch(e){showToast("Blast failed","error");}
    finally{setBlastBusy(false);}
  };
  const handlePost = async()=>{
    if(!postForm.title||!postForm.body){showToast("Title and body required","error");return;}
    setPostBusy(true);
    try{
      await API.post("newsletter/manage/",postForm);
      showToast("Published! Clients notified 📣");
      setPostForm({title:"",body:"",emoji:"✂️",pinned:false});
      const r=await API.get("newsletter/manage/");setPosts(r.data||[]);
    }catch(e){showToast("Could not publish","error");}
    finally{setPostBusy(false);}
  };
  const handleStripeConnect = async()=>{
    setStripeLoad(true);
    try{const r=await API.post("barber/stripe/connect/");window.location.href=r.data.url;}
    catch(e){showToast("Stripe connect failed","error");setStripeLoad(false);}
  };
  const handleLogout = ()=>{
    localStorage.removeItem("access");localStorage.removeItem("refresh");
    router.replace("/barber-login");
  };

  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  const TABS = [
    {id:"schedule",    label:"Schedule",    icon:"📅"},
    {id:"walkin",      label:"Walk-In",     icon:"🚶"},
    {id:"reschedules", label:"Reschedules", icon:"↻", count:reschedules.filter(r=>r.status==="pending").length},
    {id:"clients",     label:"Clients",     icon:"👥"},
    {id:"reviews",     label:"Reviews",     icon:"⭐", count:reviewBadge},
    {id:"availability",label:"Hours",       icon:"🕐"},
    {id:"newsletter",  label:"News",        icon:"📣"},
    {id:"reports",     label:"Reports",     icon:"📊"},
    {id:"stripe",      label:"Stripe",      icon:"💳"},
    {id:"profile",     label:"Profile",     icon:"👤"},
  ];

  // ── Clear entire day ─────────────────────────────────────────────────────────
  const handleClearDay = async () => {
    setClearingDay(true);
    setConfirmClear(false);
    const active = schedule.filter(a => !["completed","cancelled","no_show"].includes(a.status));
    let cleared = 0;
    for (const appt of active) {
      try {
        await API.delete(`barber/appointments/${appt.id}/`);
        cleared++;
      } catch(e) {}
    }
    setSchedule(p => p.map(a =>
      !["completed","cancelled","no_show"].includes(a.status)
        ? { ...a, status:"cancelled" }
        : a
    ));
    setClearingDay(false);
    showToast(`${cleared} appointment${cleared!==1?"s":""} cancelled — clients notified`);
  };

  if(loading) return (
    <div style={{background:C.bg,minHeight:"100vh"}}>
      <header style={{height:58,background:"rgba(7,7,9,0.85)",borderBottom:"1px solid rgba(255,255,255,0.08)",
        display:"flex",alignItems:"center",padding:"0 20px",gap:12}}>
        <div style={{width:90,height:30,borderRadius:8,
          background:"linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)",
          backgroundSize:"200% 100%",animation:"shimmer 1.4s ease-in-out infinite"}}/>
        <style>{`@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>
      </header>
      <div style={{display:"flex",height:"calc(100vh - 58px)"}}>
        <aside style={{width:210,background:"var(--sidebar-bg)",borderRight:"1px solid rgba(255,255,255,0.08)"}}/>
        <main style={{flex:1,padding:28}}><ScheduleSkeleton/></main>
      </div>
    </div>
  );

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text}}>
      <style jsx global>{`
        :root { color-scheme: ${isDark?"dark":"light"}; }
        body { background:${T.bg} !important; color:${T.text} !important; }
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${T.bg};color:${T.text};overflow-x:hidden;}
        ::selection{background:rgba(245,158,11,0.3);}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(245,158,11,0.2);border-radius:4px;}
        input,textarea,select,button{font-family:inherit;}
        input:focus,textarea:focus,select:focus{
          border-color:${T.amberBorder}!important;
          box-shadow:0 0 0 3px ${T.amberDim}!important;
          outline:none;
        }
        select{background:${T.inputBg||T.surface};color:${T.text};}
        input,textarea{background:${T.inputBg||T.surface}!important;color:${T.text}!important;}
        input::placeholder,textarea::placeholder{color:${T.placeholder||T.muted}!important;opacity:1!important;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(0.96)}to{opacity:1;transform:none}}
        .fade-up{animation:fadeUp 0.28s ease both;}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        .card-hover{transition:all 0.22s cubic-bezier(0.4,0,0.2,1);}
        * { -webkit-tap-highlight-color: transparent; }
        a, button { touch-action: manipulation; }
        .card-hover:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,0.5)!important;border-color:rgba(255,255,255,0.14)!important;}
        .nav-btn{transition:all 0.15s;}
        .nav-btn:hover{color:#f59e0b!important;background:rgba(245,158,11,0.08)!important;}
        select{background:#070709;color:#f1f0ee;}
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator{filter:invert(0.5);cursor:pointer;}
      `}</style>

      {/* ── Header ── */}
      <header style={{position:"sticky",top:0,zIndex:100,background:"rgba(7,7,9,0.85)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:`1px solid ${C.border}`,padding:"0 20px",height:58,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {isMobile&&(
            <button onClick={()=>setSidebarOpen(o=>!o)}
              style={{background:"none",border:"none",color:C.text,fontSize:20,cursor:"pointer",padding:6,borderRadius:8}}>
              {sidebarOpen?"✕":"☰"}
            </button>
          )}
          <a href="/" style={{display:"flex",alignItems:"center",gap:6,
            padding:"6px 10px",background:C.surface,backdropFilter:"blur(10px)",
            WebkitBackdropFilter:"blur(10px)",border:`1px solid ${C.border}`,
            borderRadius:8,color:C.muted,textDecoration:"none",
            ...MONO,fontSize:9,letterSpacing:"0.1em",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.amberBorder;e.currentTarget.style.color=C.amber;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
            ← Home
          </a>
          <img src="/logo1.jpg" alt="HEADZ UP" style={{height:28,objectFit:"contain"}}/>
          {!isMobile&&<>
            <div style={{width:1,height:18,background:C.border}}/>
            <p style={{...MONO,fontSize:9,color:C.muted,letterSpacing:"0.3em"}}>BARBER PORTAL</p>
          </>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {barber&&!isMobile&&(
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"6px 12px",background:C.amberDim,border:`1px solid ${C.amberBorder}`,borderRadius:10}}>
              {barber.photo_url
                ?<img src={barber.photo_url} alt={barber.name} style={{width:26,height:26,borderRadius:"50%",objectFit:"cover",border:`1px solid ${C.amberBorder}`}}/>
                :<div style={{width:26,height:26,borderRadius:"50%",background:C.amberGlow,border:`1px solid ${C.amberBorder}`,display:"flex",alignItems:"center",justifyContent:"center",...SF,fontSize:11,color:C.amber,fontWeight:700}}>{barber.name?.charAt(0)}</div>
              }
              <div>
                <p style={{...SF,fontSize:8,color:C.amber,textTransform:"uppercase",letterSpacing:"0.05em"}}>{barber.name}</p>
                <p style={{...MONO,fontSize:9,color:C.amberD}}>{summary.total||0} today</p>
              </div>
            </div>
          )}
          <button onClick={handleLogout}
            style={{padding:"7px 14px",background:C.glass,backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",border:`1px solid ${C.border}`,borderRadius:10,color:C.muted,...MONO,fontSize:9,letterSpacing:"0.15em",cursor:"pointer",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.red;e.currentTarget.style.color=C.red;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
            LOGOUT
          </button>
        </div>
      </header>

      <div style={{display:"flex",height:"calc(100vh - 58px)"}}>

        {/* ── Sidebar ── */}
        {(!isMobile||sidebarOpen)&&(
          <aside style={{width:isMobile?"100%":210,flexShrink:0,background:T.sidebarBg,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderRight:`1px solid ${T.border}`,overflowY:"auto",padding:"20px 0",position:isMobile?"fixed":"relative",top:isMobile?58:0,left:0,bottom:0,zIndex:isMobile?90:"auto"}}>

            {/* Stats */}
            <div style={{padding:"0 16px 16px",borderBottom:`1px solid ${C.border}`,marginBottom:8}}>
              <p style={{...MONO,fontSize:8,color:C.muted,letterSpacing:"0.4em",textTransform:"uppercase",marginBottom:12}}>Today</p>
              {[
                ["Appointments", summary.total||0, C.amber],
                ["Revenue",      `$${summary.online_revenue||"0.00"}`, C.green],
                ["Pending",      summary.pay_in_shop||0, C.sub],
              ].map(([label,value,color])=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{...MONO,fontSize:10,color:C.muted}}>{label}</span>
                  <span style={{...SF,fontSize:12,color,fontWeight:700}}>{value}</span>
                </div>
              ))}
            </div>

            {/* Nav */}
            <nav style={{padding:"4px 8px"}}>
              {TABS.map(tab=>(
                <button key={tab.id} className="nav-btn"
                  onClick={()=>{setActiveTab(tab.id);if(isMobile)setSidebarOpen(false);}}
                  style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 10px",background:activeTab===tab.id?C.amberDim:"transparent",border:"none",borderRadius:10,borderLeft:activeTab===tab.id?`2px solid ${C.amber}`:"2px solid transparent",color:activeTab===tab.id?C.amber:C.sub,...MONO,fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",textAlign:"left",transition:"all 0.15s",marginBottom:2}}>
                  <span style={{fontSize:14,width:20,textAlign:"center"}}>{tab.icon}</span>
                  {tab.label}
                  {tab.count>0&&(
                    <span style={{marginLeft:"auto",background:C.amber,color:"#000",borderRadius:10,padding:"1px 7px",...SF,fontSize:7,fontWeight:700}}>{tab.count}</span>
                  )}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* ── Main ── */}
        <main style={{flex:1,overflowY:"auto",padding:isMobile?"16px":"28px"}}>
          <div className="fade-up" key={activeTab}>

            {/* ════ SCHEDULE ════ */}
            {activeTab==="schedule"&&(
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
                  <div>
                    <h1 style={{...SF,fontSize:18,fontWeight:700,textTransform:"uppercase",letterSpacing:"-0.02em",marginBottom:3}}>Schedule</h1>
                    <p style={{...MONO,fontSize:11,color:C.sub}}>{fmtDate(schedDate)}</p>
                  </div>
                  <div style={{display:"flex",gap:0,alignItems:"center",
                    background:C.glass,backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",
                    border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                    {/* Prev day */}
                    <button onClick={()=>{
                      const d=new Date(schedDate+"T00:00:00");
                      d.setDate(d.getDate()-1);
                      setSchedDate(d.toISOString().split("T")[0]);
                    }} style={{width:38,height:38,background:"transparent",border:"none",
                      borderRight:`1px solid ${C.border}`,color:C.sub,cursor:"pointer",
                      fontSize:16,transition:"all 0.2s",flexShrink:0}}
                      onMouseEnter={e=>{e.currentTarget.style.background=C.amberDim;e.currentTarget.style.color=C.amber;}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.sub;}}>‹</button>
                    {/* Date input */}
                    <input type="date" value={schedDate}
                      onChange={e=>setSchedDate(e.target.value)}
                      style={{padding:"0 12px",height:38,background:"transparent",
                        border:"none",color:C.text,...MONO,fontSize:11,outline:"none",
                        cursor:"pointer",minWidth:130}}/>
                    {/* Next day */}
                    <button onClick={()=>{
                      const d=new Date(schedDate+"T00:00:00");
                      d.setDate(d.getDate()+1);
                      setSchedDate(d.toISOString().split("T")[0]);
                    }} style={{width:38,height:38,background:"transparent",border:"none",
                      borderLeft:`1px solid ${C.border}`,color:C.sub,cursor:"pointer",
                      fontSize:16,transition:"all 0.2s",flexShrink:0}}
                      onMouseEnter={e=>{e.currentTarget.style.background=C.amberDim;e.currentTarget.style.color=C.amber;}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.sub;}}>›</button>
                  </div>
                  {/* Today + Refresh + Clear */}
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {schedDate!==todayStr()&&(
                      <button onClick={()=>setSchedDate(todayStr())}
                        style={{padding:"8px 14px",background:C.amberDim,border:`1px solid ${C.amberBorder}`,
                          borderRadius:10,color:C.amber,...MONO,fontSize:9,cursor:"pointer",
                          transition:"all 0.2s",whiteSpace:"nowrap"}}
                        onMouseEnter={e=>e.currentTarget.style.background=C.amberGlow}
                        onMouseLeave={e=>e.currentTarget.style.background=C.amberDim}>
                        Today
                      </button>
                    )}
                    <button onClick={()=>loadSchedule(schedDate)}
                      style={{width:36,height:36,background:C.glass,backdropFilter:"blur(10px)",
                        WebkitBackdropFilter:"blur(10px)",border:`1px solid ${C.border}`,
                        borderRadius:10,color:C.sub,cursor:"pointer",fontSize:14,transition:"all 0.2s"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=C.amberBorder;e.currentTarget.style.color=C.amber;}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.sub;}}>↻</button>
                    {schedule.some(a=>["completed","cancelled","no_show"].includes(a.status))&&(
                      <button onClick={()=>setSchedule(p=>p.filter(a=>!["completed","cancelled","no_show"].includes(a.status)))}
                        style={{padding:"8px 12px",background:C.redDim,border:`1px solid ${C.red}30`,
                          borderRadius:10,color:C.red,...MONO,fontSize:9,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.2s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.18)"}
                        onMouseLeave={e=>e.currentTarget.style.background=C.redDim}>
                        ✕ Done
                      </button>
                    )}
                    {/* Clear Day — cancel ALL active appointments */}
                    {schedule.some(a=>!["completed","cancelled","no_show"].includes(a.status))&&(
                      <button onClick={()=>setConfirmClear(true)}
                        style={{padding:"8px 12px",background:"rgba(239,68,68,0.06)",
                          border:`1px solid rgba(239,68,68,0.20)`,
                          borderRadius:10,color:"rgba(239,68,68,0.6)",...MONO,fontSize:9,
                          cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.2s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background=C.redDim;e.currentTarget.style.color=C.red;e.currentTarget.style.borderColor=`${C.red}40`;}}
                        onMouseLeave={e=>{e.currentTarget.style.background="rgba(239,68,68,0.06)";e.currentTarget.style.color="rgba(239,68,68,0.6)";e.currentTarget.style.borderColor="rgba(239,68,68,0.20)";}}>
                        🗑 Clear Day
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div style={{display:"flex",gap:10,marginBottom:24,flexWrap:"wrap"}}>
                  <StatCard label="Total" value={summary.total||0} icon="📅" color={C.amber}/>
                  <StatCard label="Revenue" value={`$${summary.online_revenue||"0.00"}`} icon="💰" color={C.green}/>
                  <StatCard label="In Shop" value={summary.pay_in_shop||0} icon="✂️" color={C.sub}/>
                </div>

                {schedLoading?(
                  <div style={{textAlign:"center",padding:60}}>
                    <p style={{...MONO,fontSize:11,color:C.muted,letterSpacing:"0.3em"}}>LOADING...</p>
                  </div>
                ):schedule.length===0?(
                  <div style={{textAlign:"center",padding:60,...glassCard(),borderStyle:"dashed"}}>
                    <p style={{fontSize:40,marginBottom:12}}>📅</p>
                    <p style={{...SF,fontSize:12,color:C.muted,textTransform:"uppercase"}}>Nothing scheduled</p>
                    <p style={{...MONO,fontSize:11,color:C.muted,marginTop:6}}>{fmtDate(schedDate)}</p>
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {schedule.map(a=>(
                      <ApptCard key={a.id} appt={a}
                        onStatus={handleStatusChange} onCancel={handleCancel}
                        onStrike={handleStrike} onRemind={handleRemind}/>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ════ WALK-IN ════ */}
            {activeTab==="walkin"&&(
              <div>
                <h1 style={{...SF,fontSize:18,fontWeight:700,textTransform:"uppercase",letterSpacing:"-0.02em",marginBottom:4}}>Walk-In</h1>
                <p style={{...MONO,fontSize:11,color:C.sub,marginBottom:24}}>Book a client on the spot</p>
                <div style={{maxWidth:560}}>
                  <div style={{...glassCard({padding:24})}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                      {[{label:"Client Name *",key:"client_name",placeholder:"John Doe",full:true},{label:"Phone",key:"phone",placeholder:"(601) 555-0100"},{label:"Email",key:"email",placeholder:"client@email.com",type:"email"}].map(f=>(
                        <div key={f.key} style={{gridColumn:f.full?"1 / -1":"auto"}}>
                          <label style={{...MONO,fontSize:9,color:C.muted,letterSpacing:"0.25em",textTransform:"uppercase",display:"block",marginBottom:6}}>{f.label}</label>
                          <input type={f.type||"text"} value={walkIn[f.key]}
                            onChange={e=>setWalkIn(p=>({...p,[f.key]:e.target.value}))}
                            placeholder={f.placeholder}
                            style={{...inputSt()}}
                            onFocus={e=>{e.target.style.borderColor=C.amberBorder;}}
                            onBlur={e=>{e.target.style.borderColor=C.border;}}/>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                      <div>
                        <label style={{...MONO,fontSize:9,color:C.muted,letterSpacing:"0.25em",textTransform:"uppercase",display:"block",marginBottom:6}}>Service *</label>
                        <select value={walkIn.service_id} onChange={e=>setWalkIn(p=>({...p,service_id:e.target.value}))}
                          style={{...inputSt()}}>
                          <option value="">Select...</option>
                          {(prices.length?prices:services).map(s=>(
                            <option key={s.id} value={s.id}>{s.name} — ${s.effective_price||s.price}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{...MONO,fontSize:9,color:C.muted,letterSpacing:"0.25em",textTransform:"uppercase",display:"block",marginBottom:6}}>Time *</label>
                        <input type="time" value={walkIn.time} onChange={e=>setWalkIn(p=>({...p,time:e.target.value}))} style={{...inputSt()}}/>
                      </div>
                      <div>
                        <label style={{...MONO,fontSize:9,color:C.muted,letterSpacing:"0.25em",textTransform:"uppercase",display:"block",marginBottom:6}}>Date</label>
                        <input type="date" value={walkIn.date} onChange={e=>setWalkIn(p=>({...p,date:e.target.value}))} style={{...inputSt()}}/>
                      </div>
                      <div>
                        <label style={{...MONO,fontSize:9,color:C.muted,letterSpacing:"0.25em",textTransform:"uppercase",display:"block",marginBottom:6}}>Payment</label>
                        <select value={walkIn.payment_method} onChange={e=>setWalkIn(p=>({...p,payment_method:e.target.value}))} style={{...inputSt()}}>
                          <option value="shop">Pay in Shop</option>
                          <option value="online">Online</option>
                        </select>
                      </div>
                    </div>
                    <textarea value={walkIn.notes} rows={2} onChange={e=>setWalkIn(p=>({...p,notes:e.target.value}))}
                      placeholder="Notes..." style={{...inputSt({resize:"none",marginBottom:16})}}/>
                    <button disabled={walkInBusy} onClick={handleWalkIn}
                      style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:12,color:"#000",...SF,fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em",cursor:"pointer",boxShadow:"0 4px 20px rgba(245,158,11,0.35)",transition:"all 0.2s",opacity:walkInBusy?0.7:1}}>
                      {walkInBusy?"Booking...":"✓ Book Walk-In"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ════ RESCHEDULES ════ */}
            {activeTab==="reschedules"&&(
              <div>
                <h1 style={{...SF,fontSize:18,fontWeight:700,textTransform:"uppercase",letterSpacing:"-0.02em",marginBottom:4}}>Reschedules</h1>
                <p style={{...MONO,fontSize:11,color:C.sub,marginBottom:24}}>{reschedules.filter(r=>r.status==="pending").length} pending</p>
                {reschedules.length===0?(
                  <div style={{textAlign:"center",padding:60,...glassCard({borderStyle:"dashed"})}}>
                    <p style={{fontSize:32,marginBottom:10}}>↻</p>
                    <p style={{...MONO,fontSize:12,color:C.muted}}>No reschedule requests</p>
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {reschedules.map(rr=>(
                      <div key={rr.id} style={{...glassCard({padding:20,borderColor:rr.status==="pending"?C.amberBorder:C.border})}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:10}}>
                          <div>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                              <p style={{...MONO,fontSize:14,fontWeight:700,color:C.text}}>{rr.client_name}</p>
                              <span style={{...MONO,fontSize:10,padding:"3px 10px",borderRadius:20,background:rr.status==="pending"?C.amberDim:rr.status==="accepted"?C.greenDim:C.redDim,color:rr.status==="pending"?C.amber:rr.status==="accepted"?C.green:C.red,border:`1px solid ${rr.status==="pending"?C.amberBorder:rr.status==="accepted"?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`}}>{rr.status}</span>
                            </div>
                            <p style={{...MONO,fontSize:11,color:C.sub}}>{rr.service_name}</p>
                          </div>
                          {rr.status==="pending"&&(
                            <div style={{display:"flex",gap:8}}>
                              <button onClick={()=>handleReschedule(rr.id,"accept")}
                                style={{padding:"8px 16px",background:C.greenDim,border:`1px solid ${C.green}40`,borderRadius:10,color:C.green,...MONO,fontSize:10,cursor:"pointer",transition:"all 0.2s"}}
                                onMouseEnter={e=>e.currentTarget.style.background="rgba(34,197,94,0.18)"}
                                onMouseLeave={e=>e.currentTarget.style.background=C.greenDim}>✓ Approve</button>
                              <button onClick={()=>handleReschedule(rr.id,"reject")}
                                style={{padding:"8px 16px",background:C.redDim,border:`1px solid ${C.red}30`,borderRadius:10,color:C.red,...MONO,fontSize:10,cursor:"pointer",transition:"all 0.2s"}}
                                onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.18)"}
                                onMouseLeave={e=>e.currentTarget.style.background=C.redDim}>✕ Decline</button>
                            </div>
                          )}
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          {[["Original Date",rr.original_date],["Original Time",rr.original_time],["New Date",rr.requested_date],["New Time",rr.requested_time]].map(([k,v])=>(
                            <div key={k} style={{padding:"10px 12px",background:"var(--surface)",borderRadius:10,border:`1px solid ${C.border}`}}>
                              <p style={{...MONO,fontSize:8,color:C.muted,letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:3}}>{k}</p>
                              <p style={{...MONO,fontSize:12,color:k.includes("New")?C.amber:C.text}}>{v}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ════ CLIENTS ════ */}
            {activeTab==="clients"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12}}>
                  <div>
                    <h1 style={{...SF,fontSize:18,fontWeight:700,textTransform:"uppercase",letterSpacing:"-0.02em",marginBottom:3}}>Clients</h1>
                    <p style={{...MONO,fontSize:11,color:C.sub}}>{clients.length} total</p>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <input value={clientSearch} onChange={e=>setClientSearch(e.target.value)}
                      placeholder="Search clients..."
                      style={{...inputSt({width:180,padding:"9px 14px"})}}
                      onFocus={e=>e.target.style.borderColor=C.amberBorder}
                      onBlur={e=>e.target.style.borderColor=C.border}/>
                    <button onClick={()=>{setBlastOpen(o=>!o);setBlastSel(clients.map(c=>c.id));}}
                      style={{padding:"9px 18px",background:blastOpen?"linear-gradient(135deg,#f59e0b,#d97706)":C.amberDim,border:`1px solid ${C.amberBorder}`,borderRadius:10,color:blastOpen?"#000":C.amber,...MONO,fontSize:10,cursor:"pointer",transition:"all 0.2s",boxShadow:blastOpen?"0 4px 20px rgba(245,158,11,0.3)":"none"}}>
                      📣 Blast
                    </button>
                  </div>
                </div>

                {blastOpen&&(
                  <div style={{...glassCard({padding:24,marginBottom:20,borderColor:C.amberBorder})}}>
                    <p style={{...SF,fontSize:10,color:C.amber,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>📣 Send Blast</p>
                    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                      {[
                        {
                          label:"🚀 Intro",
                          subject:"HEADZ UP Barbershop — Now Booking Online",
                          msg:"✂️ HEADZ UP Barbershop\n\nHey {name}, this is AfroSamurai from HEADZ UP Barbershop in Hattiesburg, MS. We're now booking online — pick your time, lock in your spot, and come get a fresh cut.\n\n👉 headzupp.com\n\n📍 2509 W 4th St, Hattiesburg MS 39401\n📞 Reply STOP to opt out"
                        },
                        {
                          label:"💈 Come Back",
                          subject:"We miss you at HEADZ UP Barbershop!",
                          msg:"✂️ HEADZ UP Barbershop\n\nHey {name}! AfroSamurai here — it's been a minute. Time for a fresh cut?\n\nBook online anytime:\n👉 headzupp.com\n\n📍 2509 W 4th St, Hattiesburg MS\n📞 Reply STOP to opt out"
                        },
                        {
                          label:"🎯 Special",
                          subject:"Special offer from HEADZ UP Barbershop",
                          msg:"✂️ HEADZ UP Barbershop\n\nHey {name}! AfroSamurai here — we've got something special this week. Come see what's good.\n\nBook your spot online:\n👉 headzupp.com\n\n📍 2509 W 4th St, Hattiesburg MS\n📞 Reply STOP to opt out"
                        },
                        {
                          label:"📣 New Hours",
                          subject:"HEADZ UP Barbershop — Updated Hours",
                          msg:"✂️ HEADZ UP Barbershop\n\nHey {name}! Just a heads up — we've updated our hours. Check the latest availability and book your cut online:\n\n👉 headzupp.com\n\n📍 2509 W 4th St, Hattiesburg MS\n📞 Reply STOP to opt out"
                        },
                        {
                          label:"🌐 Link Only",
                          subject:"Book Your Cut Online — HEADZ UP Barbershop",
                          msg:"✂️ HEADZ UP Barbershop\n\n{name}, book your next cut online anytime — 24/7:\n\n👉 headzupp.com\n\n📍 2509 W 4th St, Hattiesburg MS · Reply STOP to opt out"
                        },
                      ].map(t=>(
                        <button key={t.label} onClick={()=>setBlastForm(p=>({...p,subject:t.subject,message:t.msg}))}
                          style={{padding:"7px 14px",background:C.amberDim,border:`1px solid ${C.amberBorder}`,borderRadius:8,color:C.amber,...MONO,fontSize:9,cursor:"pointer"}}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <input value={blastForm.subject} onChange={e=>setBlastForm(p=>({...p,subject:e.target.value}))}
                      placeholder="Subject..." style={{...inputSt({marginBottom:10})}}/>
                    <textarea value={blastForm.message} rows={4} onChange={e=>setBlastForm(p=>({...p,message:e.target.value}))}
                      placeholder="Your message... use {name} to personalize. The link headzupp.com is clickable in SMS."
                      style={{...inputSt({resize:"vertical",marginBottom:8})}}/>
                    {/* URL copy helper */}
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,
                      padding:"8px 12px",background:C.amberDim,border:`1px solid ${C.amberBorder}`,
                      borderRadius:10}}>
                      <span style={{...MONO,fontSize:10,color:C.amber,flex:1}}>
                        👉 headzupp.com
                      </span>
                      <button onClick={()=>{
                        navigator.clipboard.writeText("headzupp.com").then(()=>showToast("Link copied ✓")).catch(()=>{});
                      }} style={{padding:"4px 12px",background:C.amber,border:"none",
                        borderRadius:6,color:"#000",...MONO,fontSize:9,cursor:"pointer",fontWeight:700}}>
                        Copy Link
                      </button>
                      <button onClick={()=>{
                        const msg = blastForm.message;
                        const url = "👉 headzupp.com";
                        if(!msg.includes("headzupp.com")){
                          setBlastForm(p=>({...p,message:msg+(msg?"\n\n":"")+url}));
                          showToast("Link added to message ✓");
                        } else {
                          showToast("Link already in message","error");
                        }
                      }} style={{padding:"4px 12px",background:C.amberDim,
                        border:`1px solid ${C.amberBorder}`,borderRadius:6,
                        color:C.amber,...MONO,fontSize:9,cursor:"pointer"}}>
                        + Add to Message
                      </button>
                    </div>
                    {/* ── External contacts ── */}
                    <div style={{marginBottom:14,padding:"14px 16px",background:"rgba(255,255,255,0.03)",borderRadius:12,border:`1px solid ${C.border}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:extContacts.length>0||showExtForm?12:0}}>
                        <p style={{...MONO,fontSize:10,color:C.amber,letterSpacing:"0.15em",textTransform:"uppercase"}}>
                          📱 External Contacts {extContacts.length>0&&`(${extContacts.length})`}
                        </p>
                        <button onClick={()=>setShowExtForm(o=>!o)}
                          style={{padding:"5px 12px",background:C.amberDim,border:`1px solid ${C.amberBorder}`,borderRadius:8,color:C.amber,...MONO,fontSize:9,cursor:"pointer"}}>
                          {showExtForm?"✕ Close":"+ Add"}
                        </button>
                      </div>
                      <p style={{...MONO,fontSize:9,color:C.muted,marginBottom:showExtForm||extContacts.length>0?10:0}}>
                        {!showExtForm&&extContacts.length===0?"Add phone numbers or emails for non-registered clients":""}
                      </p>

                      {showExtForm&&(
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:8,marginBottom:10,alignItems:"end"}}>
                          <div>
                            <p style={{...MONO,fontSize:8,color:C.muted,letterSpacing:"0.2em",marginBottom:4}}>NAME</p>
                            <input value={extName} onChange={e=>setExtName(e.target.value)}
                              placeholder="John Doe"
                              style={{width:"100%",padding:"9px 12px",background:C.glass,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,...MONO,fontSize:12,outline:"none"}}/>
                          </div>
                          <div>
                            <p style={{...MONO,fontSize:8,color:C.muted,letterSpacing:"0.2em",marginBottom:4}}>PHONE</p>
                            <input value={extPhone} onChange={e=>setExtPhone(e.target.value)}
                              placeholder="(601) 555-0100" type="tel"
                              style={{width:"100%",padding:"9px 12px",background:C.glass,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,...MONO,fontSize:12,outline:"none"}}/>
                          </div>
                          <div>
                            <p style={{...MONO,fontSize:8,color:C.muted,letterSpacing:"0.2em",marginBottom:4}}>EMAIL</p>
                            <input value={extEmail} onChange={e=>setExtEmail(e.target.value)}
                              placeholder="email@gmail.com" type="email"
                              style={{width:"100%",padding:"9px 12px",background:C.glass,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,...MONO,fontSize:12,outline:"none"}}/>
                          </div>
                          <button onClick={()=>{
                            if(!extPhone.trim()&&!extEmail.trim()){showToast("Add a phone or email","error");return;}
                            setExtContacts(p=>[...p,{
                              id:`ext_${Date.now()}`,
                              name:extName.trim()||"Friend",
                              phone:extPhone.trim(),
                              email:extEmail.trim(),
                              external:true,
                            }]);
                            setExtName("");setExtPhone("");setExtEmail("");
                            showToast("Contact added ✓");
                          }} style={{padding:"9px 16px",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:10,color:"#000",...SF,fontSize:8,fontWeight:700,textTransform:"uppercase",cursor:"pointer",whiteSpace:"nowrap"}}>
                            + Add
                          </button>
                        </div>
                      )}

                      {/* Added contacts list */}
                      {extContacts.length>0&&(
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {extContacts.map(ec=>(
                            <div key={ec.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",background:C.amberDim,border:`1px solid ${C.amberBorder}`,borderRadius:20}}>
                              <span style={{...MONO,fontSize:10,color:C.amber}}>{ec.name}</span>
                              {ec.phone&&<span style={{...MONO,fontSize:9,color:C.muted}}>{ec.phone}</span>}
                              {ec.email&&<span style={{...MONO,fontSize:9,color:C.muted}}>{ec.email}</span>}
                              <button onClick={()=>setExtContacts(p=>p.filter(x=>x.id!==ec.id))}
                                style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12,padding:0,lineHeight:1}}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{display:"flex",gap:10,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap"}}>
                      <div style={{display:"flex",gap:14}}>
                        {[["send_sms","SMS"],["send_email","Email"]].map(([key,label])=>(
                          <label key={key} style={{display:"flex",alignItems:"center",gap:6,...MONO,fontSize:11,color:C.sub,cursor:"pointer"}}>
                            <input type="checkbox" checked={blastForm[key]} onChange={e=>setBlastForm(p=>({...p,[key]:e.target.checked}))} style={{accentColor:C.amber}}/>
                            {label}
                          </label>
                        ))}
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>{setBlastOpen(false);setExtContacts([]);}}
                          style={{padding:"9px 16px",background:C.glass,border:`1px solid ${C.border}`,borderRadius:10,color:C.muted,...MONO,fontSize:10,cursor:"pointer"}}>Cancel</button>
                        <button disabled={blastBusy} onClick={async()=>{
                          // Combine registered + external contacts
                          const regRecipients = clients.filter(c=>blastSel.includes(c.id)).map(c=>({name:c.name,phone:c.phone||"",email:c.email||""}));
                          const allRecipients = [...regRecipients, ...extContacts.map(ec=>({name:ec.name,phone:ec.phone,email:ec.email}))];
                          if(!blastForm.message.trim()){showToast("Write a message first","error");return;}
                          if(!allRecipients.length){showToast("Add at least one recipient","error");return;}
                          setBlastBusy(true);
                          try{
                            const r = await API.post("barber/blast/",{...blastForm,recipients:allRecipients});
                            showToast(`Sent! ${r.data.sms_sent||0} SMS · ${r.data.email_sent||0} emails`);
                            setBlastOpen(false);setExtContacts([]);setBlastSel([]);
                          }catch(e){showToast("Blast failed","error");}
                          finally{setBlastBusy(false);}
                        }}
                          style={{padding:"9px 20px",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:10,color:"#000",...SF,fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em",cursor:"pointer",opacity:blastBusy?0.7:1,boxShadow:"0 4px 16px rgba(245,158,11,0.3)"}}>
                          {blastBusy?"Sending...":`Send to ${blastSel.length + extContacts.length}`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {clients.filter(cl=>!clientSearch||cl.name?.toLowerCase().includes(clientSearch.toLowerCase())||cl.email?.toLowerCase().includes(clientSearch.toLowerCase())).map(cl=>(
                    <div key={cl.id} className="card-hover"
                      onClick={()=>setSelClient(selClient?.id===cl.id?null:cl)}
                      style={{...glassCard({padding:"14px 18px",cursor:"pointer",borderColor:selClient?.id===cl.id?C.amberBorder:C.border})}}>
                      <div style={{display:"flex",alignItems:"center",gap:12,justifyContent:"space-between"}}>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                          <div style={{width:40,height:40,borderRadius:"50%",background:cl.is_vip?C.amberGlow:C.amberDim,border:`2px solid ${cl.is_vip?C.amber:C.amberBorder}`,display:"flex",alignItems:"center",justifyContent:"center",...SF,fontSize:14,color:C.amber,fontWeight:700,flexShrink:0}}>
                            {cl.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <p style={{...MONO,fontSize:13,fontWeight:700,color:C.text}}>{cl.name}</p>
                              {cl.is_vip&&<span style={{...MONO,fontSize:9,color:C.amber,padding:"2px 8px",background:C.amberDim,borderRadius:20}}>⭐ VIP</span>}
                            </div>
                            <p style={{...MONO,fontSize:10,color:C.muted}}>{cl.email}</p>
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <p style={{...SF,fontSize:14,color:C.amber,fontWeight:700}}>{cl.total_visits}</p>
                          <p style={{...MONO,fontSize:9,color:C.muted}}>visits</p>
                        </div>
                      </div>

                      {selClient?.id===cl.id&&(
                        <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
                            {[["Visits",cl.total_visits],["No Shows",cl.no_shows],["Last Visit",cl.last_visit||"—"]].map(([k,v])=>(
                              <div key={k} style={{padding:"10px",background:"var(--surface)",borderRadius:10,textAlign:"center"}}>
                                <p style={{...MONO,fontSize:8,color:C.muted,marginBottom:3}}>{k}</p>
                                <p style={{...MONO,fontSize:12,color:C.text}}>{v}</p>
                              </div>
                            ))}
                          </div>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                            <button onClick={async e=>{
                              e.stopPropagation();
                              try{await API.patch(`barber/clients/${cl.id}/`,{is_vip:!cl.is_vip});const r=await API.get("barber/clients/");setClients(r.data||[]);}catch(e){}
                            }} style={{padding:"6px 14px",background:cl.is_vip?C.amberDim:"transparent",border:`1px solid ${C.amberBorder}`,borderRadius:8,color:C.amber,...MONO,fontSize:9,cursor:"pointer"}}>
                              {cl.is_vip?"★ VIP":"☆ Mark VIP"}
                            </button>
                            <button onClick={e=>{e.stopPropagation();setBlastOpen(true);setBlastSel([cl.id]);}}
                              style={{padding:"6px 14px",background:C.glass,border:`1px solid ${C.border}`,borderRadius:8,color:C.sub,...MONO,fontSize:9,cursor:"pointer"}}>
                              📣 Message
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ════ REVIEWS ════ */}
            {activeTab==="reviews"&&(
              <div>
                <h1 style={{...SF,fontSize:18,fontWeight:700,textTransform:"uppercase",letterSpacing:"-0.02em",marginBottom:4}}>Reviews</h1>
                <p style={{...MONO,fontSize:11,color:C.sub,marginBottom:24}}>
                  {reviews.length} total · avg {(reviews.reduce((s,r)=>s+r.rating,0)/Math.max(reviews.length,1)).toFixed(1)} ★
                </p>
                {reviews.length===0?(
                  <div style={{textAlign:"center",padding:60,...glassCard({borderStyle:"dashed"})}}>
                    <p style={{fontSize:32,marginBottom:10}}>⭐</p>
                    <p style={{...MONO,fontSize:12,color:C.muted}}>No reviews yet</p>
                    <p style={{...MONO,fontSize:10,color:C.muted,marginTop:6}}>Mark appointments complete to trigger review requests</p>
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {reviews.map(r=>(
                      <div key={r.id} style={{...glassCard({padding:20})}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
                          <div>
                            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:3}}>
                              <p style={{...MONO,fontSize:13,fontWeight:700,color:C.text}}>{r.client}</p>
                              <span style={{color:C.amber,fontSize:14,letterSpacing:2}}>
                                {"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}
                              </span>
                            </div>
                            <p style={{...MONO,fontSize:10,color:C.muted}}>{r.created_at}</p>
                          </div>
                        </div>
                        <p style={{...MONO,fontSize:12,color:C.sub,lineHeight:1.8,marginBottom:12}}>{r.comment}</p>
                        {r.barber_reply?(
                          <div style={{padding:"12px 14px",background:C.amberDim,border:`1px solid ${C.amberBorder}`,borderRadius:10}}>
                            <p style={{...MONO,fontSize:9,color:C.amber,marginBottom:4,letterSpacing:"0.2em"}}>YOUR REPLY</p>
                            <p style={{...MONO,fontSize:12,color:C.text}}>{r.barber_reply}</p>
                          </div>
                        ):(
                          <div>
                            <textarea value={reviewReply[r.id]||""} rows={2}
                              onChange={e=>setReviewReply(p=>({...p,[r.id]:e.target.value}))}
                              placeholder="Reply to this review..."
                              style={{...inputSt({resize:"none",marginBottom:8})}}/>
                            <button onClick={async()=>{
                              if(!reviewReply[r.id]?.trim())return;
                              try{
                                await API.patch(`barber/reviews/${r.id}/`,{barber_reply:reviewReply[r.id]});
                                const res=await API.get("barber/reviews/");setReviews(res.data.reviews||[]);
                                showToast("Reply posted ✓");
                              }catch(e){showToast("Could not post reply","error");}
                            }} style={{padding:"7px 16px",background:C.amberDim,border:`1px solid ${C.amberBorder}`,borderRadius:8,color:C.amber,...MONO,fontSize:9,cursor:"pointer"}}>
                              Post Reply
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ════ HOURS ════ */}
            {activeTab==="availability"&&(
              <div>
                <h1 style={{...SF,fontSize:18,fontWeight:700,textTransform:"uppercase",letterSpacing:"-0.02em",marginBottom:4}}>Hours & Availability</h1>
                <p style={{...MONO,fontSize:11,color:C.sub,marginBottom:24}}>Set your working hours and time off</p>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:24}}>
                  <div style={{...glassCard({padding:20})}}>
                    <p style={{...SF,fontSize:10,color:C.amber,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Working Hours</p>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {DAYS.map((day,i)=>{
                        const a=availability.find(x=>x.day_of_week===i);
                        return(
                          <div key={day} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"var(--surface)",borderRadius:10,border:`1px solid ${C.border}`}}>
                            <span style={{...MONO,fontSize:10,color:a?.is_working?C.text:C.muted,width:32,flexShrink:0}}>{day}</span>
                            <div style={{flex:1}}>
                              {a?.is_working?(
                                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                                  <input type="time" defaultValue={a.start_time?.slice(0,5)}
                                    onChange={async e=>{try{await API.post("barber/availability/",{day_of_week:i,start_time:e.target.value,end_time:a.end_time,is_working:true});const r=await API.get("barber/availability/");setAvailability(r.data||[]);}catch(e){}}}
                                    style={{padding:"4px 8px",background:"var(--surface-b)",border:`1px solid ${C.border}`,borderRadius:6,color:C.text,...MONO,fontSize:11,outline:"none"}}/>
                                  <span style={{color:C.muted}}>→</span>
                                  <input type="time" defaultValue={a.end_time?.slice(0,5)}
                                    onChange={async e=>{try{await API.post("barber/availability/",{day_of_week:i,start_time:a.start_time,end_time:e.target.value,is_working:true});const r=await API.get("barber/availability/");setAvailability(r.data||[]);}catch(e){}}}
                                    style={{padding:"4px 8px",background:"var(--surface-b)",border:`1px solid ${C.border}`,borderRadius:6,color:C.text,...MONO,fontSize:11,outline:"none"}}/>
                                </div>
                              ):<span style={{...MONO,fontSize:11,color:C.muted}}>Off</span>}
                            </div>
                            <button onClick={async()=>{
                              const on=!a?.is_working;
                              try{await API.post("barber/availability/",{day_of_week:i,is_working:on,start_time:a?.start_time||"09:00",end_time:a?.end_time||"18:00"});const r=await API.get("barber/availability/");setAvailability(r.data||[]);}catch(e){}
                            }} style={{padding:"4px 10px",background:a?.is_working?"rgba(239,68,68,0.08)":C.greenDim,border:`1px solid ${a?.is_working?"rgba(239,68,68,0.25)":"rgba(34,197,94,0.25)"}`,borderRadius:6,color:a?.is_working?C.red:C.green,...MONO,fontSize:9,cursor:"pointer"}}>
                              {a?.is_working?"Off":"On"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{...glassCard({padding:20})}}>
                    <p style={{...SF,fontSize:10,color:C.amber,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Time Off</p>
                    <div style={{display:"flex",gap:8,marginBottom:10}}>
                      <input type="date" value={newTimeOff.date} onChange={e=>setNewTimeOff(p=>({...p,date:e.target.value}))}
                        style={{...inputSt({flex:1})}}/>
                      <button onClick={async()=>{
                        if(!newTimeOff.date)return;
                        try{await API.post("barber/time-off/",newTimeOff);const r=await API.get("barber/time-off/");setTimeOff(r.data||[]);setNewTimeOff({date:"",reason:""});showToast("Time off added ✓");}catch(e){}
                      }} style={{padding:"11px 18px",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:10,color:"#000",...MONO,fontSize:10,cursor:"pointer",fontWeight:700}}>
                        + Add
                      </button>
                    </div>
                    <input value={newTimeOff.reason} onChange={e=>setNewTimeOff(p=>({...p,reason:e.target.value}))}
                      placeholder="Reason (optional)" style={{...inputSt({marginBottom:12})}}/>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {timeOff.length===0?(
                        <p style={{...MONO,fontSize:11,color:C.muted,textAlign:"center",padding:16}}>No time off scheduled</p>
                      ):timeOff.map(t=>(
                        <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"var(--surface)",borderRadius:10,border:`1px solid ${C.border}`}}>
                          <div>
                            <p style={{...MONO,fontSize:12,color:C.text}}>{fmtDate(t.date)}</p>
                            {t.reason&&<p style={{...MONO,fontSize:10,color:C.muted}}>{t.reason}</p>}
                          </div>
                          <button onClick={async()=>{try{await API.delete(`barber/time-off/${t.id}/`);const r=await API.get("barber/time-off/");setTimeOff(r.data||[]);}catch(e){}}}
                            style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:18,padding:4,borderRadius:6}}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════ NEWSLETTER ════ */}
            {activeTab==="newsletter"&&(
              <div>
                <h1 style={{...SF,fontSize:18,fontWeight:700,textTransform:"uppercase",letterSpacing:"-0.02em",marginBottom:4}}>News Feed</h1>
                <p style={{...MONO,fontSize:11,color:C.sub,marginBottom:24}}>Post updates — clients get push notifications instantly</p>
                <div style={{...glassCard({padding:24,marginBottom:20,borderColor:C.amberBorder})}}>
                  <p style={{...SF,fontSize:10,color:C.amber,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16}}>New Post</p>
                  <div style={{display:"grid",gridTemplateColumns:"60px 1fr",gap:10,marginBottom:12}}>
                    <input value={postForm.emoji} onChange={e=>setPostForm(p=>({...p,emoji:e.target.value}))} maxLength={2}
                      style={{...inputSt({fontSize:22,textAlign:"center",padding:"9px"})}}/>
                    <input value={postForm.title} onChange={e=>setPostForm(p=>({...p,title:e.target.value}))}
                      placeholder="Post title..." style={{...inputSt()}}/>
                  </div>
                  <textarea value={postForm.body} rows={4} onChange={e=>setPostForm(p=>({...p,body:e.target.value}))}
                    placeholder="What do you want to tell your clients?" style={{...inputSt({resize:"none",marginBottom:12})}}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <label style={{display:"flex",alignItems:"center",gap:6,...MONO,fontSize:11,color:C.sub,cursor:"pointer"}}>
                      <input type="checkbox" checked={postForm.pinned} onChange={e=>setPostForm(p=>({...p,pinned:e.target.checked}))} style={{accentColor:C.amber}}/>
                      Pin to top
                    </label>
                    <button disabled={postBusy} onClick={handlePost}
                      style={{padding:"10px 24px",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:10,color:"#000",...SF,fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em",cursor:"pointer",opacity:postBusy?0.7:1,boxShadow:"0 4px 16px rgba(245,158,11,0.3)"}}>
                      {postBusy?"Publishing...":"📣 Publish"}
                    </button>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {posts.map(p=>(
                    <div key={p.id} style={{...glassCard({padding:18,borderColor:p.pinned?C.amberBorder:C.border})}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:22}}>{p.emoji}</span>
                          <div>
                            <p style={{...MONO,fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>{p.title}</p>
                            <p style={{...MONO,fontSize:10,color:C.muted}}>{p.created_at}{p.pinned&&" · 📌 Pinned"}</p>
                          </div>
                        </div>
                        <button onClick={async()=>{try{await API.delete(`newsletter/manage/${p.id}/`);const r=await API.get("newsletter/manage/");setPosts(r.data||[]);}catch(e){}}}
                          style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:16,padding:4,borderRadius:6}}>✕</button>
                      </div>
                      <p style={{...MONO,fontSize:12,color:C.sub,lineHeight:1.7}}>{p.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

                        {/* ════ REPORTS ════ */}
            {activeTab==="payments"&&(
              <div style={{animation:"fadeUp 0.25s ease both"}}>
                {/* Header */}
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
                  <div>
                    <p style={{...MONO,fontSize:9,color:C.amber,letterSpacing:"0.4em",
                      textTransform:"uppercase",marginBottom:4}}>💰 Payment History</p>
                    <p style={{...SF,fontSize:16,fontWeight:700,color:C.text,
                      textTransform:"uppercase",letterSpacing:"-0.02em"}}>
                      Deposits Received
                    </p>
                  </div>
                  {/* Period selector */}
                  <div style={{display:"flex",gap:6}}>
                    {[["week","7 Days"],["month","30 Days"],["year","Year"],["all","All Time"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setPayPeriod(v)}
                        style={{padding:"7px 14px",borderRadius:20,
                          background:payPeriod===v?"linear-gradient(135deg,#f59e0b,#d97706)":C.surface,
                          border:`1px solid ${payPeriod===v?"transparent":C.border}`,
                          color:payPeriod===v?"#000":C.muted,
                          ...MONO,fontSize:9,cursor:"pointer",fontWeight:payPeriod===v?700:400,
                          transition:"all 0.2s"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stats cards */}
                <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
                  {[
                    {label:"Total Earned",   value:`$${payStats.total_deposits.toFixed(2)}`, icon:"💰", color:C.green},
                    {label:"Deposits",        value:payStats.count,                           icon:"🧾", color:C.amber},
                    {label:"Stripe Available",value:`$${(payStats.stripe_balance.available||0).toFixed(2)}`, icon:"✅", color:C.blue},
                    {label:"Stripe Pending",  value:`$${(payStats.stripe_balance.pending||0).toFixed(2)}`,   icon:"⏳", color:C.muted},
                  ].map(s=>(
                    <div key={s.label} style={{...glassCard({padding:"16px 14px",
                      position:"relative",overflow:"hidden",flex:1,minWidth:130})}}>
                      <div style={{position:"absolute",top:0,left:0,right:0,height:2,
                        background:`linear-gradient(to right,${s.color}60,transparent)`}}/>
                      <div style={{display:"flex",justifyContent:"space-between",
                        alignItems:"center",marginBottom:8}}>
                        <p style={{...MONO,fontSize:8,color:C.muted,letterSpacing:"0.25em",
                          textTransform:"uppercase"}}>{s.label}</p>
                        <span style={{fontSize:14,opacity:0.5}}>{s.icon}</span>
                      </div>
                      <p style={{...SF,fontSize:20,fontWeight:700,color:s.color,lineHeight:1}}>
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Stripe note */}
                <div style={{...glassCard({padding:"12px 16px",marginBottom:20,
                  borderColor:"rgba(96,165,250,0.25)"})}}>
                  <p style={{...MONO,fontSize:11,color:C.blue,lineHeight:1.7}}>
                    ℹ️ <strong>Available</strong> = ready to pay out to your bank.{" "}
                    <strong>Pending</strong> = processing (usually 2 business days).{" "}
                    In test mode all amounts show as $0 — live mode shows real money.
                  </p>
                </div>

                {/* Payment list */}
                {payLoading?(
                  <div style={{...glassCard({padding:40,textAlign:"center"})}}>
                    <p style={{...MONO,fontSize:11,color:C.muted}}>Loading payments...</p>
                  </div>
                ):payments.length===0?(
                  <div style={{...glassCard({padding:48,textAlign:"center",
                    borderStyle:"dashed"})}}>
                    <p style={{fontSize:36,marginBottom:12}}>💳</p>
                    <p style={{...SF,fontSize:12,color:C.muted,textTransform:"uppercase",
                      marginBottom:8}}>No deposits yet</p>
                    <p style={{...MONO,fontSize:11,color:C.muted}}>
                      Deposits will appear here when clients pay online
                    </p>
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {payments.map(p=>{
                      const apptDate = new Date(p.date+"T00:00:00");
                      const fmtD = apptDate.toLocaleDateString("en-US",{
                        weekday:"short",month:"short",day:"numeric"});
                      const [h,m] = p.time.split(":");
                      const hr = parseInt(h,10);
                      const fmtT = `${hr%12||12}:${m} ${hr>=12?"PM":"AM"}`;
                      const net = (parseFloat(p.deposit_amount)-0.59).toFixed(2);
                      return(
                        <div key={p.id} style={{...glassCard({padding:"14px 18px"}),
                          display:"flex",alignItems:"center",
                          justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                          <div style={{display:"flex",alignItems:"center",gap:14}}>
                            <div style={{width:40,height:40,borderRadius:10,
                              background:C.greenDim,border:`1px solid ${C.green}30`,
                              display:"flex",alignItems:"center",justifyContent:"center",
                              fontSize:18,flexShrink:0}}>
                              💰
                            </div>
                            <div>
                              <p style={{...SF,fontSize:11,fontWeight:700,
                                color:C.text,marginBottom:3,textTransform:"uppercase",
                                letterSpacing:"-0.01em"}}>
                                {p.client}
                              </p>
                              <p style={{...MONO,fontSize:10,color:C.muted}}>
                                {p.service} · {fmtD} at {fmtT}
                              </p>
                            </div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <p style={{...SF,fontSize:16,fontWeight:700,
                              color:C.green,lineHeight:1,marginBottom:3}}>
                              ${p.deposit_amount}
                            </p>
                            <p style={{...MONO,fontSize:9,color:C.muted}}>
                              ≈${net} after fees
                            </p>
                            <span style={{...MONO,fontSize:9,padding:"2px 8px",
                              borderRadius:20,
                              background:p.status==="confirmed"?C.greenDim:C.amberDim,
                              color:p.status==="confirmed"?C.green:C.amber,
                              border:`1px solid ${p.status==="confirmed"?C.green:C.amber}30`}}>
                              {p.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Connect Stripe CTA if not connected */}
                {!payStats.stripe_balance&&(
                  <div style={{...glassCard({padding:24,marginTop:20,
                    textAlign:"center",borderColor:C.amberBorder})}}>
                    <p style={{...MONO,fontSize:12,color:C.muted,marginBottom:16}}>
                      Connect Stripe to receive deposits directly to your bank
                    </p>
                    <button onClick={handleStripeConnect}
                      style={{padding:"12px 28px",
                        background:"linear-gradient(135deg,#f59e0b,#d97706)",
                        border:"none",borderRadius:10,color:"#000",
                        ...SF,fontSize:8,fontWeight:700,textTransform:"uppercase",
                        letterSpacing:"0.15em",cursor:"pointer"}}>
                      Connect Stripe →
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab==="reports"&&(
              <div>
                {/* Header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12}}>
                  <div>
                    <h1 style={{...SF,fontSize:18,fontWeight:700,textTransform:"uppercase",letterSpacing:"-0.02em",marginBottom:3}}>Analytics</h1>
                    <p style={{...MONO,fontSize:11,color:C.sub}}>
                      {reports ? `${fmtDate(reports.start==="all"?"2020-01-01":reports.start)} → Today` : "Loading..."}
                    </p>
                  </div>
                  {/* Period selector */}
                  <div style={{display:"flex",gap:6,background:"var(--surface)",padding:4,borderRadius:12,border:`1px solid ${C.border}`}}>
                    {["week","month","year","all"].map(p=>(
                      <button key={p} onClick={()=>setReportPeriod(p)}
                        style={{padding:"7px 14px",borderRadius:9,
                          background:reportPeriod===p?"linear-gradient(135deg,rgba(245,158,11,0.18),rgba(245,158,11,0.08))":"transparent",
                          border:reportPeriod===p?`1px solid ${C.amberBorder}`:"1px solid transparent",
                          color:reportPeriod===p?C.amber:C.muted,...MONO,fontSize:9,
                          textTransform:"uppercase",cursor:"pointer",transition:"all 0.2s",
                          boxShadow:reportPeriod===p?"0 2px 10px rgba(245,158,11,0.12)":"none"}}>
                        {p==="all"?"All Time":p.charAt(0).toUpperCase()+p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {!reports ? (
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {[1,2,3].map(i=>(
                      <div key={i} style={{height:120,...glassCard(),background:"linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.04) 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.4s ease-in-out infinite"}}/>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* ── Revenue hero ── */}
                    <div style={{...glassCard({padding:24,marginBottom:16,borderColor:C.amberBorder,position:"relative",overflow:"hidden"})}}>
                      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(to right,#ef4444,#f59e0b,#fbbf24)"}}/>
                      <div style={{position:"absolute",top:"-30%",right:"-5%",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,158,11,0.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
                      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
                        <div>
                          <p style={{...MONO,fontSize:9,color:C.amberD,letterSpacing:"0.4em",textTransform:"uppercase",marginBottom:6}}>Total Revenue</p>
                          <p style={{...SF,fontSize:42,fontWeight:700,color:C.amber,lineHeight:1,marginBottom:4}}>
                            ${parseFloat(reports.summary.total_revenue).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
                          </p>
                          <p style={{...MONO,fontSize:11,color:C.sub}}>
                            ${reports.summary.online_revenue} online · ${reports.summary.shop_revenue} shop
                          </p>
                        </div>
                        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                          {[
                            ["Completion",`${reports.summary.completion_rate}%`,C.green],
                            ["No Show Rate",`${reports.summary.no_show_rate}%`,C.red],
                            ["Walk-Ins",reports.summary.walk_ins,C.blue],
                            ["Reschedules",reports.summary.reschedules,C.purple],
                          ].map(([label,val,color])=>(
                            <div key={label} style={{textAlign:"center",padding:"12px 16px",background:"var(--surface)",borderRadius:12,border:`1px solid rgba(255,255,255,0.08)`}}>
                              <p style={{...SF,fontSize:18,fontWeight:700,color,marginBottom:3}}>{val}</p>
                              <p style={{...MONO,fontSize:9,color:C.muted,letterSpacing:"0.15em",textTransform:"uppercase"}}>{label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── Stat grid ── */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:16}}>
                      {[
                        {label:"Total Bookings",  value:reports.summary.total,       icon:"📅", color:C.amber},
                        {label:"Completed",        value:reports.summary.completed,   icon:"✓",  color:C.green},
                        {label:"Cancelled",        value:reports.summary.cancelled,   icon:"✕",  color:C.muted},
                        {label:"No Shows",         value:reports.summary.no_shows,    icon:"⚡", color:C.red},
                        {label:"Online Payments",  value:reports.summary.online_count,icon:"💳", color:C.blue},
                        {label:"Shop Payments",    value:reports.summary.shop_count,  icon:"✂️", color:C.amber},
                        {label:"Clients on Strike",value:reports.summary.clients_on_strike,icon:"⚠️",color:C.red},
                        {label:"Confirmed",        value:reports.summary.confirmed,   icon:"📌", color:C.purple},
                      ].map(s=>(
                        <div key={s.label} style={{...glassCard({padding:"16px 14px",position:"relative",overflow:"hidden"})}}>
                          <div style={{position:"absolute",top:0,left:0,width:"100%",height:2,background:`linear-gradient(to right,${s.color}60,transparent)`}}/>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                            <p style={{...MONO,fontSize:8,color:C.muted,letterSpacing:"0.25em",textTransform:"uppercase",lineHeight:1.4}}>{s.label}</p>
                            <span style={{fontSize:14,opacity:0.5}}>{s.icon}</span>
                          </div>
                          <p style={{...SF,fontSize:22,fontWeight:700,color:s.color,lineHeight:1}}>{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* ── Revenue bar chart (last 30 days) ── */}
                    {reports.daily?.length>0&&(()=>{
                      const maxRev = Math.max(...reports.daily.map(d=>d.revenue), 1);
                      const maxBook = Math.max(...reports.daily.map(d=>d.bookings), 1);
                      // Show last 14 days for readability
                      const visible = reports.daily.slice(-14);
                      return (
                        <div style={{...glassCard({padding:20,marginBottom:16})}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                            <p style={{...SF,fontSize:10,color:C.amber,textTransform:"uppercase",letterSpacing:"0.1em"}}>Revenue · Last 14 Days</p>
                            <div style={{display:"flex",gap:12}}>
                              <div style={{display:"flex",alignItems:"center",gap:5}}>
                                <div style={{width:10,height:10,borderRadius:2,background:"linear-gradient(135deg,#f59e0b,#d97706)"}}/>
                                <span style={{...MONO,fontSize:9,color:C.muted}}>Revenue</span>
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:5}}>
                                <div style={{width:10,height:10,borderRadius:2,background:C.blue+"80"}}/>
                                <span style={{...MONO,fontSize:9,color:C.muted}}>Bookings</span>
                              </div>
                            </div>
                          </div>
                          <div style={{display:"flex",gap:4,alignItems:"flex-end",height:120}}>
                            {visible.map((d,i)=>(
                              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,height:"100%",justifyContent:"flex-end"}}>
                                <div style={{position:"relative",width:"100%",display:"flex",flexDirection:"column",gap:2,justifyContent:"flex-end"}}>
                                  {/* Revenue bar */}
                                  <div title={`$${d.revenue}`}
                                    style={{width:"100%",height:`${Math.max(4,(d.revenue/maxRev)*100)}px`,
                                      background:"linear-gradient(to top,#d97706,#f59e0b,#fbbf24)",
                                      borderRadius:"3px 3px 0 0",transition:"height 0.5s ease",
                                      minHeight:d.revenue>0?4:0}}/>
                                  {/* Bookings overlay */}
                                  <div title={`${d.bookings} bookings`}
                                    style={{position:"absolute",bottom:0,left:0,right:0,
                                      height:`${Math.max(2,(d.bookings/maxBook)*30)}px`,
                                      background:`${C.blue}50`,borderRadius:"3px 3px 0 0"}}/>
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* X-axis labels */}
                          <div style={{display:"flex",gap:4,marginTop:6}}>
                            {visible.map((d,i)=>(
                              <div key={i} style={{flex:1,textAlign:"center"}}>
                                <p style={{...MONO,fontSize:7,color:C.muted,
                                  transform:"rotate(-35deg)",transformOrigin:"center",
                                  display:"inline-block",whiteSpace:"nowrap"}}>
                                  {d.label.split(" ")[1]}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:16}}>

                      {/* ── Service breakdown ── */}
                      {reports.services?.length>0&&(
                        <div style={{...glassCard({padding:20})}}>
                          <p style={{...SF,fontSize:10,color:C.amber,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16}}>Services</p>
                          <div style={{display:"flex",flexDirection:"column",gap:8}}>
                            {reports.services.map((s,i)=>{
                              const maxBook = Math.max(...reports.services.map(x=>x.bookings),1);
                              const pct = (s.bookings/maxBook)*100;
                              return (
                                <div key={s.name} style={{padding:"10px 12px",background:"var(--surface)",borderRadius:10}}>
                                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                                    <div>
                                      <p style={{...MONO,fontSize:12,color:C.text,marginBottom:2}}>{s.name}</p>
                                      <p style={{...MONO,fontSize:9,color:C.muted}}>{s.bookings} bookings · {s.completed} done</p>
                                    </div>
                                    <div style={{textAlign:"right"}}>
                                      <p style={{...SF,fontSize:13,color:C.amber,fontWeight:700}}>${s.revenue}</p>
                                      <p style={{...MONO,fontSize:9,color:C.muted}}>${s.price} ea</p>
                                    </div>
                                  </div>
                                  <div style={{height:4,background:"var(--surface-b)",borderRadius:4}}>
                                    <div style={{height:"100%",borderRadius:4,width:`${pct}%`,
                                      background:`linear-gradient(to right,#f59e0b,#fbbf24)`,
                                      transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)"}}/>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ── Top clients ── */}
                      {reports.top_clients?.length>0&&(
                        <div style={{...glassCard({padding:20})}}>
                          <p style={{...SF,fontSize:10,color:C.amber,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16}}>Top Clients</p>
                          <div style={{display:"flex",flexDirection:"column",gap:8}}>
                            {reports.top_clients.map((cl,i)=>(
                              <div key={cl.id} style={{display:"flex",alignItems:"center",gap:12,
                                padding:"10px 12px",background:"var(--surface)",borderRadius:10}}>
                                <div style={{width:32,height:32,borderRadius:"50%",
                                  background:i===0?"linear-gradient(135deg,#f59e0b,#d97706)":C.amberDim,
                                  border:`1px solid ${i===0?C.amber:C.amberBorder}`,
                                  display:"flex",alignItems:"center",justifyContent:"center",
                                  ...SF,fontSize:12,color:i===0?"#000":C.amber,fontWeight:700,flexShrink:0}}>
                                  {i===0?"👑":i+1}
                                </div>
                                <div style={{flex:1,minWidth:0}}>
                                  <p style={{...MONO,fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cl.name}</p>
                                  <p style={{...MONO,fontSize:9,color:C.muted}}>{cl.email}</p>
                                </div>
                                <div style={{textAlign:"right",flexShrink:0}}>
                                  <p style={{...SF,fontSize:14,color:C.amber,fontWeight:700}}>{cl.visits}</p>
                                  <p style={{...MONO,fontSize:8,color:C.muted}}>visits</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>

                      {/* ── Busiest days ── */}
                      {reports.busiest_days?.length>0&&(
                        <div style={{...glassCard({padding:20})}}>
                          <p style={{...SF,fontSize:10,color:C.amber,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16}}>Busiest Days</p>
                          {(()=>{
                            const maxD = Math.max(...reports.busiest_days.map(d=>d.bookings),1);
                            return (
                              <div style={{display:"flex",gap:6,alignItems:"flex-end",height:80}}>
                                {reports.busiest_days.map(d=>(
                                  <div key={d.day} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                                    <div style={{width:"100%",
                                      height:`${Math.max(4,(d.bookings/maxD)*70)}px`,
                                      background:d.bookings===maxD?"linear-gradient(to top,#d97706,#f59e0b)":"var(--border)",
                                      borderRadius:"4px 4px 0 0",transition:"height 0.6s ease"}}/>
                                    <p style={{...MONO,fontSize:8,color:d.bookings===maxD?C.amber:C.muted}}>{d.day}</p>
                                    <p style={{...SF,fontSize:10,color:d.bookings===maxD?C.amber:C.sub,fontWeight:700}}>{d.bookings}</p>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* ── Busiest hours ── */}
                      {reports.busiest_hours?.length>0&&(
                        <div style={{...glassCard({padding:20})}}>
                          <p style={{...SF,fontSize:10,color:C.amber,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16}}>Busiest Hours</p>
                          {(()=>{
                            const maxH = Math.max(...reports.busiest_hours.map(h=>h.bookings),1);
                            return (
                              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                                {[...reports.busiest_hours].sort((a,b)=>b.bookings-a.bookings).slice(0,5).map(h=>(
                                  <div key={h.hour} style={{display:"flex",alignItems:"center",gap:10}}>
                                    <p style={{...MONO,fontSize:10,color:C.text,width:48,flexShrink:0}}>{h.label}</p>
                                    <div style={{flex:1,height:8,background:"var(--surface-b)",borderRadius:4}}>
                                      <div style={{height:"100%",borderRadius:4,width:`${(h.bookings/maxH)*100}%`,
                                        background:`linear-gradient(to right,#f59e0b,#fbbf24)`,transition:"width 0.6s ease"}}/>
                                    </div>
                                    <p style={{...SF,fontSize:11,color:C.amber,width:20,flexShrink:0,textAlign:"right"}}>{h.bookings}</p>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* ── Weekly trend ── */}
                    {reports.weekly?.length>0&&(()=>{
                      const maxW = Math.max(...reports.weekly.map(w=>w.revenue),1);
                      return (
                        <div style={{...glassCard({padding:20,marginTop:16})}}>
                          <p style={{...SF,fontSize:10,color:C.amber,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:16}}>Weekly Revenue Trend</p>
                          <div style={{display:"flex",gap:6,alignItems:"flex-end",height:100}}>
                            {reports.weekly.map((w,i)=>(
                              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                                <p style={{...MONO,fontSize:8,color:C.amber}}>{w.revenue>0?`$${w.revenue}`:""}</p>
                                <div style={{width:"100%",
                                  height:`${Math.max(4,(w.revenue/maxW)*80)}px`,
                                  background:i===reports.weekly.length-1?"linear-gradient(to top,#ef4444,#f59e0b)":"linear-gradient(to top,#d97706,#f59e0b)",
                                  borderRadius:"4px 4px 0 0",
                                  opacity:0.4+(i/reports.weekly.length)*0.6,
                                  transition:"height 0.6s ease",
                                  border:i===reports.weekly.length-1?`1px solid ${C.amberBorder}`:"none"}}/>
                                <p style={{...MONO,fontSize:7,color:C.muted,textAlign:"center",lineHeight:1.3}}>{w.week.replace("Wk ","")}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

{/* ════ STRIPE ════ */}
            {activeTab==="stripe"&&(
              <div>
                <h1 style={{...SF,fontSize:18,fontWeight:700,textTransform:"uppercase",letterSpacing:"-0.02em",marginBottom:4}}>Stripe Payments</h1>
                <p style={{...MONO,fontSize:11,color:C.sub,marginBottom:24}}>Connect your bank to receive deposits</p>
                <div style={{maxWidth:480}}>
                  {stripeStatus?.connected?(
                    <div>
                      <div style={{...glassCard({padding:20,marginBottom:16,borderColor:"rgba(34,197,94,0.3)"})}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                          <div style={{width:36,height:36,borderRadius:"50%",background:C.greenDim,border:`1px solid rgba(34,197,94,0.3)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <span style={{color:C.green,fontSize:18}}>✓</span>
                          </div>
                          <div>
                            <p style={{...SF,fontSize:10,color:C.green,textTransform:"uppercase",letterSpacing:"0.05em"}}>Stripe Connected</p>
                            <p style={{...MONO,fontSize:10,color:C.muted,marginTop:2}}>Charges: {stripeStatus.charges_enabled?"✓ Enabled":"⏳ Pending"} · Payouts: {stripeStatus.payouts_enabled?"✓ Enabled":"⏳ Pending"}</p>
                          </div>
                        </div>
                      </div>
                      <button onClick={async()=>{try{const r=await API.get("barber/stripe/dashboard/");window.open(r.data.url,"_blank");}catch(e){showToast("Could not open dashboard","error");}}}
                        style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))",border:`1px solid ${C.amberBorder}`,borderRadius:12,color:C.amber,...MONO,fontSize:11,cursor:"pointer",letterSpacing:"0.1em",textTransform:"uppercase",transition:"all 0.2s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(245,158,11,0.2)"}
                        onMouseLeave={e=>e.currentTarget.style.background="linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))"}>
                        Open Stripe Dashboard →
                      </button>
                    </div>
                  ):(
                    <div>
                      <div style={{...glassCard({padding:20,marginBottom:16})}}>
                        <p style={{...MONO,fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>Connect Your Bank</p>
                        <p style={{...MONO,fontSize:12,color:C.sub,lineHeight:1.8}}>
                          Receive deposit payments directly to your bank. HEADZ UP takes a $1.50 platform fee per booking.
                        </p>
                      </div>
                      <button disabled={stripeLoad} onClick={handleStripeConnect}
                        style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:12,color:"#000",...SF,fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.2em",cursor:"pointer",boxShadow:"0 4px 20px rgba(245,158,11,0.35)",transition:"all 0.2s",opacity:stripeLoad?0.7:1}}>
                        {stripeLoad?"Connecting...":"Connect Stripe →"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════ PROFILE ════ */}
            {activeTab==="profile"&&(
              <div>
                <h1 style={{...SF,fontSize:18,fontWeight:700,textTransform:"uppercase",letterSpacing:"-0.02em",marginBottom:4}}>Profile</h1>
                <p style={{...MONO,fontSize:11,color:C.sub,marginBottom:24}}>Update your photo, bio, and payment info</p>
                <div style={{maxWidth:520,display:"flex",flexDirection:"column",gap:16}}>

                  {/* Photo */}
                  <div style={{...glassCard({padding:24})}}>
                    <p style={{...MONO,fontSize:10,color:C.amber,textTransform:"uppercase",letterSpacing:"0.2em",marginBottom:16}}>Profile Photo</p>
                    <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:16}}>
                      <div style={{width:80,height:80,borderRadius:"50%",flexShrink:0,border:`3px solid ${C.amberBorder}`,overflow:"hidden",background:C.amberDim,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 0 4px rgba(245,158,11,0.08)"}}>
                        {photoPreview||barber?.photo_url
                          ?<img src={photoPreview||barber?.photo_url} alt={barber?.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          :<span style={{...SF,fontSize:28,color:C.amber,fontWeight:700}}>{barber?.name?.charAt(0)}</span>
                        }
                      </div>
                      <div>
                        <p style={{...MONO,fontSize:12,color:C.text,marginBottom:4}}>{barber?.photo_url?"Change your photo":"Upload a photo"}</p>
                        <p style={{...MONO,fontSize:10,color:C.muted,marginBottom:12}}>JPG or PNG · Max 5MB · Square works best</p>
                        <label style={{padding:"8px 16px",background:C.amberDim,border:`1px solid ${C.amberBorder}`,borderRadius:8,color:C.amber,...MONO,fontSize:9,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",display:"inline-block",transition:"all 0.2s"}}
                          onMouseEnter={e=>e.currentTarget.style.background=C.amberGlow}
                          onMouseLeave={e=>e.currentTarget.style.background=C.amberDim}>
                          📷 Choose Photo
                          <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{
                            const file=e.target.files?.[0];
                            if(!file)return;
                            if(file.size>5*1024*1024){showToast("Photo must be under 5MB","error");return;}
                            const reader=new FileReader();
                            reader.onload=ev=>setPhotoPreview(ev.target.result);
                            reader.readAsDataURL(file);
                          }}/>
                        </label>
                      </div>
                    </div>
                    {photoPreview&&(
                      <div style={{display:"flex",gap:8}}>
                        <button disabled={profileSaving} onClick={async()=>{
                          setProfileSaving(true);
                          try{await API.patch("barber/me/update/",{photo:photoPreview});const r=await API.get("barber/me/");setBarber(r.data);setPhotoPreview(null);showToast("Photo updated ✓");}
                          catch(e){showToast("Could not upload","error");}
                          finally{setProfileSaving(false);}
                        }} style={{padding:"8px 20px",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:8,color:"#000",...SF,fontSize:7,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em",cursor:"pointer",opacity:profileSaving?0.7:1}}>
                          {profileSaving?"Uploading...":"Save Photo →"}
                        </button>
                        <button onClick={()=>setPhotoPreview(null)}
                          style={{padding:"8px 14px",background:C.glass,border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,...MONO,fontSize:10,cursor:"pointer"}}>Cancel</button>
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  <div style={{...glassCard({padding:24})}}>
                    <p style={{...MONO,fontSize:10,color:C.amber,textTransform:"uppercase",letterSpacing:"0.2em",marginBottom:12}}>Bio</p>
                    <textarea defaultValue={barber?.bio||""} onChange={e=>setProfileForm(p=>({...p,bio:e.target.value}))}
                      placeholder="Tell clients about yourself..." rows={3}
                      style={{...inputSt({resize:"none",marginBottom:12})}}/>
                    <button disabled={profileSaving} onClick={async()=>{
                      setProfileSaving(true);
                      try{await API.patch("barber/me/update/",{bio:profileForm.bio||barber?.bio});const r=await API.get("barber/me/");setBarber(r.data);showToast("Bio updated ✓");}
                      catch(e){showToast("Could not update","error");}
                      finally{setProfileSaving(false);}
                    }} style={{padding:"8px 18px",background:C.amberDim,border:`1px solid ${C.amberBorder}`,borderRadius:8,color:C.amber,...MONO,fontSize:9,cursor:"pointer"}}>
                      {profileSaving?"Saving...":"Save Bio"}
                    </button>
                  </div>

                  {/* Cash App */}
                  <div style={{...glassCard({padding:24})}}>
                    <p style={{...MONO,fontSize:10,color:C.amber,textTransform:"uppercase",letterSpacing:"0.2em",marginBottom:12}}>Cash App Tag</p>
                    <div style={{display:"flex",gap:8}}>
                      <div style={{position:"relative",flex:1}}>
                        <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",...MONO,fontSize:14,color:C.green}}>$</span>
                        <input defaultValue={(barber?.cashapp_tag||"").replace("$","")}
                          onChange={e=>setProfileForm(p=>({...p,cashapp_tag:e.target.value}))}
                          placeholder="yourcashtag"
                          style={{...inputSt({paddingLeft:28})}}/>
                      </div>
                      <button disabled={profileSaving} onClick={async()=>{
                        setProfileSaving(true);
                        try{await API.patch("barber/me/update/",{cashapp_tag:profileForm.cashapp_tag||barber?.cashapp_tag});const r=await API.get("barber/me/");setBarber(r.data);showToast("Cash App updated ✓");}
                        catch(e){showToast("Could not update","error");}
                        finally{setProfileSaving(false);}
                      }} style={{padding:"11px 18px",background:C.amberDim,border:`1px solid ${C.amberBorder}`,borderRadius:10,color:C.amber,...MONO,fontSize:9,cursor:"pointer"}}>
                        {profileSaving?"...":"Save"}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ── Clear Day Confirmation Modal ── */}
      {confirmClear&&(
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.85)",
          backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
          onClick={()=>setConfirmClear(false)}>
          <div onClick={e=>e.stopPropagation()}
            style={{...glassCard({borderColor:"rgba(239,68,68,0.4)",padding:0,overflow:"hidden",maxWidth:400,width:"100%"})}}>
            <div style={{height:3,background:C.red}}/>
            <div style={{padding:24}}>
              <p style={{...SF,fontSize:13,fontWeight:700,textTransform:"uppercase",
                letterSpacing:"-0.02em",color:C.text,marginBottom:8}}>
                ⚠️ Clear Entire Day?
              </p>
              <p style={{...MONO,fontSize:12,color:C.sub,lineHeight:1.8,marginBottom:20}}>
                This will cancel <strong style={{color:C.red}}>
                  {schedule.filter(a=>!["completed","cancelled","no_show"].includes(a.status)).length} active appointment{schedule.filter(a=>!["completed","cancelled","no_show"].includes(a.status)).length!==1?"s":""}
                </strong> on <strong style={{color:C.text}}>{fmtDate(schedDate)}</strong>.
                Every client will be notified.
              </p>
              <div style={{display:"flex",gap:8}}>
                <button disabled={clearingDay} onClick={handleClearDay}
                  style={{flex:1,padding:"12px",background:C.red,border:"none",
                    borderRadius:10,color:"white",...SF,fontSize:7,fontWeight:700,
                    textTransform:"uppercase",letterSpacing:"0.15em",cursor:"pointer",
                    opacity:clearingDay?0.7:1}}>
                  {clearingDay?"Cancelling...":"Yes, Clear Day"}
                </button>
                <button onClick={()=>setConfirmClear(false)}
                  style={{flex:1,padding:"12px",background:C.glass,
                    border:`1px solid ${C.border}`,borderRadius:10,color:C.muted,
                    ...SF,fontSize:7,fontWeight:700,textTransform:"uppercase",
                    letterSpacing:"0.15em",cursor:"pointer"}}>
                  Keep Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast&&(
        <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:toast.type==="error"?C.red:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#000",padding:"12px 20px",borderRadius:12,...MONO,fontSize:11,letterSpacing:"0.08em",boxShadow:"0 8px 32px rgba(0,0,0,0.5)",animation:"toastIn 0.3s cubic-bezier(0.4,0,0.2,1) both",maxWidth:320,fontWeight:700}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
