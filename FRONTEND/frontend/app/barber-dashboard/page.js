"use client";
export const dynamic = "force-dynamic";
import { useNotifications } from "@/components/NotificationSystem";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:       "#080808",
  surface:  "#101010",
  surfaceB: "#161616",
  border:   "rgba(255,255,255,0.07)",
  borderB:  "rgba(255,255,255,0.12)",
  amber:    "#f59e0b",
  amberDim: "rgba(245,158,11,0.08)",
  amberBorder: "rgba(245,158,11,0.25)",
  red:      "#ef4444",
  green:    "#22c55e",
  blue:     "#3b82f6",
  purple:   "#a78bfa",
  muted:    "#52525b",
  sub:      "#71717a",
  text:     "#e4e4e7",
};
const SF   = { fontFamily:"'Syncopate',sans-serif" };
const MONO = { fontFamily:"'DM Mono',monospace" };

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  confirmed:    { label:"Confirmed",   color:C.green,  bg:"rgba(34,197,94,0.1)",   dot:"#22c55e" },
  pending_shop: { label:"Pending",     color:C.amber,  bg:"rgba(245,158,11,0.1)",  dot:"#f59e0b" },
  completed:    { label:"Completed",   color:C.blue,   bg:"rgba(59,130,246,0.1)",  dot:"#3b82f6" },
  cancelled:    { label:"Cancelled",   color:C.muted,  bg:"rgba(82,82,91,0.08)",   dot:"#52525b" },
  no_show:      { label:"No Show",     color:C.red,    bg:"rgba(239,68,68,0.08)",  dot:"#ef4444" },
};

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}
function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
}
function today() {
  return new Date().toISOString().split("T")[0];
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = C.amber, icon }) {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, padding:"18px 20px",
      position:"relative", overflow:"hidden", flex:1, minWidth:140 }}>
      <div style={{ position:"absolute", top:0, left:0, width:3, height:"100%",
        background:`linear-gradient(to bottom, ${color}, transparent)` }}/>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <p style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.35em", textTransform:"uppercase" }}>{label}</p>
        {icon && <span style={{ fontSize:16, opacity:0.5 }}>{icon}</span>}
      </div>
      <p style={{ ...SF, fontSize:22, fontWeight:700, color, lineHeight:1, marginBottom:4 }}>{value}</p>
      {sub && <p style={{ ...MONO, fontSize:10, color:C.muted }}>{sub}</p>}
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
function TabBtn({ id, label, icon, active, count, onClick }) {
  return (
    <button onClick={() => onClick(id)}
      style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 14px",
        background: active ? C.amberDim : "transparent",
        border: active ? `1px solid ${C.amberBorder}` : "1px solid transparent",
        color: active ? C.amber : C.sub,
        ...MONO, fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase",
        cursor:"pointer", transition:"all 0.2s", whiteSpace:"nowrap", position:"relative" }}>
      <span style={{ fontSize:14 }}>{icon}</span>
      {label}
      {count > 0 && (
        <span style={{ background:C.amber, color:"black", borderRadius:"50%",
          width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center",
          ...SF, fontSize:7, fontWeight:700, marginLeft:2 }}>{count}</span>
      )}
    </button>
  );
}

// ── Appointment ticket ────────────────────────────────────────────────────────
function ApptCard({ appt, onStatus, onCancel, onStrike, onRemind, isMobile }) {
  const [open, setOpen]   = useState(false);
  const [note, setNote]   = useState(appt.barber_notes || "");
  const [saving, setSaving] = useState(false);
  const st    = STATUS[appt.status] || STATUS.confirmed;
  const isCancelled = appt.status === "cancelled" || appt.status === "no_show";
  const apptTime = new Date(`${appt.date}T${appt.time}`);
  const isPast = apptTime < new Date();

  return (
    <div style={{ border:`1px solid ${isCancelled ? "rgba(82,82,91,0.15)" : C.border}`,
      background:C.surface, overflow:"hidden", opacity: isCancelled ? 0.55 : 1,
      transition:"all 0.2s" }}>

      {/* Status bar */}
      <div style={{ height:2, background:st.dot, opacity: isCancelled ? 0.3 : 0.8 }}/>

      {/* Header row */}
      <div onClick={() => setOpen(o => !o)}
        style={{ padding:"14px 16px", cursor:"pointer", display:"flex",
          alignItems:"center", gap:12, justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:0 }}>
          {/* Time */}
          <div style={{ textAlign:"center", minWidth:52, flexShrink:0 }}>
            <p style={{ ...SF, fontSize:12, fontWeight:700, color:C.amber, lineHeight:1 }}>
              {fmtTime(appt.time).split(" ")[0]}
            </p>
            <p style={{ ...MONO, fontSize:8, color:C.muted }}>
              {fmtTime(appt.time).split(" ")[1]}
            </p>
          </div>

          {/* Divider */}
          <div style={{ width:1, height:32, background:C.border, flexShrink:0 }}/>

          {/* Client + service */}
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ ...SF, fontSize:10, fontWeight:700, color:C.text,
              textTransform:"uppercase", letterSpacing:"0.05em",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {appt.client}
            </p>
            <p style={{ ...MONO, fontSize:11, color:C.sub, marginTop:2 }}>
              {appt.service} · {appt.service_duration}min
            </p>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          {/* Payment badge */}
          <span style={{ ...MONO, fontSize:8, letterSpacing:"0.1em",
            padding:"3px 8px", background: appt.payment_method === "online" ? "rgba(34,197,94,0.1)" : C.amberDim,
            color: appt.payment_method === "online" ? C.green : C.amber,
            border: `1px solid ${appt.payment_method === "online" ? "rgba(34,197,94,0.2)" : C.amberBorder}` }}>
            {appt.payment_method === "online" ? "💳 Online" : "🏪 Shop"}
          </span>

          {/* Status badge */}
          <span style={{ ...MONO, fontSize:8, letterSpacing:"0.1em", padding:"3px 8px",
            background:st.bg, color:st.color, border:`1px solid ${st.color}30` }}>
            {st.label}
          </span>

          {/* Chevron */}
          <span style={{ color:C.muted, fontSize:12, transition:"transform 0.2s",
            transform: open ? "rotate(180deg)" : "none" }}>▾</span>
        </div>
      </div>

      {/* Expanded panel */}
      {open && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:"16px",
          background:C.surfaceB }}>

          {isCancelled ? (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px",
              background:`${st.color}08`, border:`1px solid ${st.color}20` }}>
              <span style={{ fontSize:18 }}>{appt.status === "cancelled" ? "❌" : "⚡"}</span>
              <div>
                <p style={{ ...SF, fontSize:8, color:st.color, textTransform:"uppercase", letterSpacing:"0.1em" }}>
                  {appt.status === "no_show" ? "No Show" : "Cancelled"}
                </p>
                <p style={{ ...MONO, fontSize:10, color:C.muted, marginTop:2 }}>
                  {appt.status === "cancelled" ? "This appointment was cancelled." : "Client did not appear."}
                </p>
              </div>
              {appt.status === "no_show" && (
                <button onClick={() => onStrike(appt.id, "no_show")}
                  style={{ marginLeft:"auto", padding:"6px 12px", background:"rgba(239,68,68,0.1)",
                    border:"1px solid rgba(239,68,68,0.3)", color:C.red,
                    ...MONO, fontSize:9, cursor:"pointer" }}>
                  ⚡ Strike
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Quick actions */}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
                {appt.status !== "completed" && (
                  <>
                    {appt.status === "pending_shop" && (
                      <button onClick={() => onStatus(appt.id, "confirmed")}
                        style={{ padding:"7px 14px", background:"rgba(34,197,94,0.1)",
                          border:"1px solid rgba(34,197,94,0.3)", color:C.green,
                          ...MONO, fontSize:9, cursor:"pointer", transition:"all 0.2s" }}>
                        ✓ Confirm Arrival
                      </button>
                    )}
                    {appt.status === "confirmed" && (
                      <button onClick={() => onStatus(appt.id, "completed")}
                        style={{ padding:"7px 14px", background:"rgba(59,130,246,0.1)",
                          border:"1px solid rgba(59,130,246,0.3)", color:C.blue,
                          ...MONO, fontSize:9, cursor:"pointer", transition:"all 0.2s" }}>
                        ✓ Mark Complete
                      </button>
                    )}
                    <button onClick={() => onRemind(appt.id)}
                      style={{ padding:"7px 14px", background:C.amberDim,
                        border:`1px solid ${C.amberBorder}`, color:C.amber,
                        ...MONO, fontSize:9, cursor:"pointer" }}>
                      🔔 Remind
                    </button>
                    <button onClick={() => onCancel(appt.id)}
                      style={{ padding:"7px 14px", background:"rgba(239,68,68,0.06)",
                        border:"1px solid rgba(239,68,68,0.2)", color:C.red,
                        ...MONO, fontSize:9, cursor:"pointer" }}>
                      ✕ Cancel
                    </button>
                    {isPast && appt.status !== "no_show" && (
                      <button onClick={() => onStrike(appt.id, "no_show")}
                        style={{ padding:"7px 14px", background:"rgba(239,68,68,0.06)",
                          border:"1px solid rgba(239,68,68,0.2)", color:C.red,
                          ...MONO, fontSize:9, cursor:"pointer" }}>
                        ⚡ No Show
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Details grid */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                {[
                  ["Client", appt.client],
                  ["Service", appt.service],
                  ["Duration", `${appt.service_duration} min`],
                  ["Price", `$${appt.service_price}`],
                  ["Payment", appt.payment_method === "online" ? "Online" : "Pay in Shop"],
                  ["Date", fmtDate(appt.date)],
                ].map(([k, v]) => (
                  <div key={k} style={{ padding:"8px 10px", background:C.surface,
                    border:`1px solid ${C.border}` }}>
                    <p style={{ ...MONO, fontSize:8, color:C.muted, letterSpacing:"0.25em",
                      textTransform:"uppercase", marginBottom:3 }}>{k}</p>
                    <p style={{ ...MONO, fontSize:12, color:C.text }}>{v}</p>
                  </div>
                ))}
              </div>

              {/* Barber notes */}
              <div>
                <p style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.25em",
                  textTransform:"uppercase", marginBottom:6 }}>Barber Notes</p>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                  placeholder="Add notes about this client or cut..."
                  style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`,
                    color:C.text, ...MONO, fontSize:12, padding:"8px 10px",
                    outline:"none", resize:"none", transition:"border-color 0.2s" }}
                  onFocus={e => e.target.style.borderColor = C.amberBorder}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
                <button disabled={saving} onClick={async () => {
                  setSaving(true);
                  try { await API.patch(`barber/appointments/${appt.id}/`, { barber_notes: note }); }
                  catch(e) {}
                  finally { setSaving(false); }
                }}
                  style={{ marginTop:6, padding:"6px 14px", background:C.amberDim,
                    border:`1px solid ${C.amberBorder}`, color:C.amber,
                    ...MONO, fontSize:9, cursor:"pointer" }}>
                  {saving ? "Saving..." : "Save Note"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BarberDashboard() {
  const router = useRouter();
  const { addNotif, showPermitPrompt } = useNotifications() || {};
  useEffect(() => { showPermitPrompt?.(); }, [showPermitPrompt]);

  const [barber,      setBarber]      = useState(null);
  const [user,        setUser]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState("schedule");
  const [isMobile,    setIsMobile]    = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast,       setToast]       = useState(null);

  // Schedule
  const [schedule,      setSchedule]      = useState([]);
  const [schedDate,     setSchedDate]     = useState(today());
  const [schedLoading,  setSchedLoading]  = useState(false);
  const [calDates,      setCalDates]      = useState([]);
  const [summary,       setSummary]       = useState({ total:0, confirmed:0, online_revenue:"0.00" });

  // Availability
  const [availability, setAvailability] = useState([]);
  const [timeOff,      setTimeOff]      = useState([]);
  const [newTimeOff,   setNewTimeOff]   = useState({ date:"", reason:"" });

  // Clients
  const [clients,     setClients]     = useState([]);
  const [clientSearch,setClientSearch]= useState("");
  const [selClient,   setSelClient]   = useState(null);
  const [blastOpen,   setBlastOpen]   = useState(false);
  const [blastForm,   setBlastForm]   = useState({ subject:"Message from HEADZ UP Barbershop", message:"", send_sms:true, send_email:true });
  const [blastSel,    setBlastSel]    = useState([]);
  const [blastBusy,   setBlastBusy]   = useState(false);

  // Walk-in
  const [walkIn, setWalkIn] = useState({ client_name:"", service_id:"", date:today(), time:"", payment_method:"shop", phone:"", email:"", notes:"" });
  const [walkInBusy, setWalkInBusy] = useState(false);
  const [services, setServices] = useState([]);

  // Reviews
  const [reviews,    setReviews]    = useState([]);
  const [reviewReply,setReviewReply]= useState({});

  // Reschedules
  const [reschedules, setReschedules] = useState([]);

  // Reports
  const [reports,        setReports]        = useState(null);
  const [reportsPeriod,  setReportsPeriod]  = useState("month");

  // Newsletter
  const [posts,       setPosts]       = useState([]);
  const [postForm,    setPostForm]    = useState({ title:"", body:"", category:"general", emoji:"✂️", pinned:false });
  const [postBusy,    setPostBusy]    = useState(false);

  // Stripe
  const [stripeStatus,  setStripeStatus]  = useState(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  // Profile
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm,   setProfileForm]   = useState({ bio:"", cashapp_tag:"" });
  const [photoPreview,  setPhotoPreview]  = useState(null);
  const photoInputRef = { current: null };

  // Service prices
  const [prices, setPrices] = useState([]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auth check + initial load
  useEffect(() => {
    const init = async () => {
      try {
        const [dash, barberMe] = await Promise.all([
          API.get("dashboard/"),
          API.get("barber/me/"),
        ]);
        if (!dash.data.is_staff) { router.replace("/dashboard"); return; }
        setUser(dash.data);
        setBarber(barberMe.data);
        const svc = await API.get("services/");
        setServices(svc.data || []);
      } catch(e) {
        if (e?.response?.status === 401) router.replace("/barber-login");
      } finally { setLoading(false); }
    };
    init();
  }, [router]);

  // Load schedule
  const loadSchedule = useCallback(async (date) => {
    setSchedLoading(true);
    try {
      const r = await API.get(`barber/schedule/?date=${date}`);
      setSchedule(r.data.appointments || []);
      setSummary(r.data.summary || {});
    } catch(e) {}
    finally { setSchedLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === "schedule") loadSchedule(schedDate);
  }, [schedDate, activeTab, loadSchedule]);

  // Auto-refresh schedule every 60s
  useEffect(() => {
    if (activeTab !== "schedule") return;
    const id = setInterval(() => loadSchedule(schedDate), 60000);
    return () => clearInterval(id);
  }, [activeTab, schedDate, loadSchedule]);

  // Load tab data
  useEffect(() => {
    if (!barber) return;
    const load = async () => {
      try {
        if (activeTab === "availability") {
          const [a, t] = await Promise.all([API.get("barber/availability/"), API.get("barber/time-off/")]);
          setAvailability(a.data || []);
          setTimeOff(t.data || []);
        }
        if (activeTab === "clients") {
          const r = await API.get("barber/clients/");
          setClients(r.data || []);
        }
        if (activeTab === "reviews") {
          const r = await API.get("barber/reviews/");
          setReviews(r.data.reviews || []);
        }
        if (activeTab === "reschedules") {
          const r = await API.get("barber/reschedules/");
          setReschedules(r.data || []);
        }
        if (activeTab === "reports") {
          const r = await API.get(`barber/reports/?period=${reportsPeriod}`);
          setReports(r.data);
        }
        if (activeTab === "newsletter") {
          const r = await API.get("newsletter/manage/");
          setPosts(r.data || []);
        }
        if (activeTab === "stripe") {
          const r = await API.get("barber/stripe/status/");
          setStripeStatus(r.data);
        }
        if (activeTab === "walkin") {
          const r = await API.get("barber/service-prices/");
          setPrices(r.data || []);
        }
      } catch(e) {}
    };
    load();
  }, [activeTab, barber, reportsPeriod]);

  // Handlers
  const handleStatusChange = async (id, status) => {
    try {
      await API.patch(`barber/appointments/${id}/`, { status });
      setSchedule(p => p.map(a => a.id === id ? { ...a, status } : a));
      showToast(status === "completed" ? "Appointment marked complete ✓" : "Status updated");
    } catch(e) { showToast("Could not update status", "error"); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this appointment? The client will be notified.")) return;
    try {
      await API.delete(`barber/appointments/${id}/`);
      setSchedule(p => p.map(a => a.id === id ? { ...a, status:"cancelled" } : a));
      showToast("Appointment cancelled — client notified");
    } catch(e) { showToast("Could not cancel", "error"); }
  };

  const handleStrike = async (id, reason) => {
    if (!window.confirm(`Issue a ${reason === "no_show" ? "no-show" : "late cancel"} strike?`)) return;
    try {
      const r = await API.post(`barber/appointments/${id}/strike/`, { reason });
      setSchedule(p => p.map(a => a.id === id ? { ...a, status: reason === "no_show" ? "no_show" : "cancelled" } : a));
      showToast(`Strike issued — deposit now $${r.data.next_deposit}`);
    } catch(e) { showToast("Could not issue strike", "error"); }
  };

  const handleRemind = async (id) => {
    try {
      await API.post(`barber/appointments/${id}/remind/`);
      showToast("Reminder sent to client 🔔");
    } catch(e) { showToast("Could not send reminder", "error"); }
  };

  const handleWalkIn = async () => {
    if (!walkIn.client_name || !walkIn.service_id || !walkIn.time) {
      showToast("Fill in client name, service, and time", "error"); return;
    }
    setWalkInBusy(true);
    try {
      await API.post("barber/walk-in/", walkIn);
      showToast("Walk-in booked! ✓");
      setWalkIn({ client_name:"", service_id:"", date:today(), time:"", payment_method:"shop", phone:"", email:"", notes:"" });
      if (schedDate === walkIn.date) loadSchedule(schedDate);
    } catch(e) { showToast(e.response?.data?.error || "Could not book walk-in", "error"); }
    finally { setWalkInBusy(false); }
  };

  const handleReschedule = async (id, action) => {
    try {
      await API.post(`barber/reschedules/${id}/`, { action });
      setReschedules(p => p.map(r => r.id === id ? { ...r, status: action === "accept" ? "accepted" : "rejected" } : r));
      showToast(action === "accept" ? "Reschedule approved ✓" : "Reschedule declined");
    } catch(e) { showToast("Could not process reschedule", "error"); }
  };

  const handleBlast = async () => {
    if (!blastForm.message.trim()) { showToast("Write a message first", "error"); return; }
    const recipients = clients.filter(c => blastSel.includes(c.id)).map(c => ({
      name: c.name, phone: c.phone || "", email: c.email || ""
    }));
    if (!recipients.length) { showToast("Select at least one client", "error"); return; }
    setBlastBusy(true);
    try {
      const r = await API.post("barber/blast/", { ...blastForm, recipients });
      showToast(`Sent! ${r.data.sms_sent} SMS · ${r.data.email_sent} emails`);
      setBlastOpen(false);
    } catch(e) { showToast("Blast failed", "error"); }
    finally { setBlastBusy(false); }
  };

  const handlePost = async () => {
    if (!postForm.title || !postForm.body) { showToast("Title and body required", "error"); return; }
    setPostBusy(true);
    try {
      await API.post("newsletter/manage/", postForm);
      showToast("Post published! Clients notified 📣");
      setPostForm({ title:"", body:"", category:"general", emoji:"✂️", pinned:false });
      const r = await API.get("newsletter/manage/");
      setPosts(r.data || []);
    } catch(e) { showToast("Could not publish", "error"); }
    finally { setPostBusy(false); }
  };

  const handleStripeConnect = async () => {
    setStripeLoading(true);
    try {
      const r = await API.post("barber/stripe/connect/");
      window.location.href = r.data.url;
    } catch(e) { showToast("Stripe connect failed", "error"); setStripeLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    router.replace("/barber-login");
  };

  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  const TABS = [
    { id:"schedule",     label:"Schedule",    icon:"📅" },
    { id:"walkin",       label:"Walk-In",     icon:"🚶" },
    { id:"reschedules",  label:"Reschedules", icon:"↻",  count: reschedules.filter(r=>r.status==="pending").length },
    { id:"clients",      label:"Clients",     icon:"👥" },
    { id:"reviews",      label:"Reviews",     icon:"⭐" },
    { id:"availability", label:"Hours",       icon:"🕐" },
    { id:"newsletter",   label:"News",        icon:"📣" },
    { id:"reports",      label:"Reports",     icon:"📊" },
    { id:"stripe",       label:"Stripe",      icon:"💳" },
    { id:"profile",      label:"Profile",     icon:"👤" },
  ];

  if (loading) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <p style={{ ...SF, fontSize:24, fontWeight:700, color:C.amber, marginBottom:8 }}>HEADZ UP</p>
        <p style={{ ...MONO, fontSize:11, color:C.muted, letterSpacing:"0.3em" }}>LOADING...</p>
      </div>
    </div>
  );

  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${C.bg};color:${C.text};overflow-x:hidden;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:${C.bg};}
        ::-webkit-scrollbar-thumb{background:rgba(245,158,11,0.3);border-radius:2px;}
        input,textarea,select{font-family:inherit;}
        button{font-family:inherit;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .tab-content{animation:fadeIn 0.25s ease both;}
        @keyframes toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
      `}</style>

      {/* ── Top bar ── */}
      <header style={{ position:"sticky", top:0, zIndex:100, background:C.bg,
        borderBottom:`1px solid ${C.border}`, padding:"0 20px", height:56,
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>

        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(o=>!o)}
              style={{ background:"none", border:"none", color:C.text, fontSize:20, cursor:"pointer", padding:4 }}>
              {sidebarOpen ? "✕" : "☰"}
            </button>
          )}
          <img src="/logo1.jpg" alt="HEADZ UP" style={{ height:32, objectFit:"contain" }}/>
          <div style={{ width:1, height:20, background:C.border }}/>
          <p style={{ ...MONO, fontSize:10, color:C.muted, letterSpacing:"0.2em" }}>BARBER PORTAL</p>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {barber && (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {barber.photo_url ? (
                <img src={barber.photo_url} alt={barber.name}
                  style={{ width:30, height:30, borderRadius:"50%", objectFit:"cover",
                    border:`1px solid ${C.amberBorder}` }}/>
              ) : (
                <div style={{ width:30, height:30, borderRadius:"50%",
                  background:C.amberDim, border:`1px solid ${C.amberBorder}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  ...SF, fontSize:11, color:C.amber }}>
                  {barber.name?.charAt(0)}
                </div>
              )}
              {!isMobile && (
                <div>
                  <p style={{ ...SF, fontSize:8, color:C.text, fontWeight:700,
                    textTransform:"uppercase", letterSpacing:"0.05em" }}>{barber.name}</p>
                  <p style={{ ...MONO, fontSize:9, color:C.muted }}>
                    {summary.total || 0} appts today
                  </p>
                </div>
              )}
            </div>
          )}
          <button onClick={handleLogout}
            style={{ padding:"6px 12px", background:"transparent",
              border:`1px solid ${C.border}`, color:C.muted,
              ...MONO, fontSize:9, letterSpacing:"0.2em", cursor:"pointer",
              transition:"all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
            LOGOUT
          </button>
        </div>
      </header>

      <div style={{ display:"flex", height:"calc(100vh - 56px)" }}>

        {/* ── Sidebar ── */}
        {(!isMobile || sidebarOpen) && (
          <aside style={{ width:isMobile ? "100%" : 200, flexShrink:0,
            background:C.surface, borderRight:`1px solid ${C.border}`,
            overflowY:"auto", padding:"16px 0",
            position: isMobile ? "fixed" : "relative",
            top: isMobile ? 56 : 0, left:0, bottom:0, zIndex: isMobile ? 90 : "auto" }}>

            {/* Today stats */}
            <div style={{ padding:"0 12px 16px", borderBottom:`1px solid ${C.border}` }}>
              <p style={{ ...MONO, fontSize:8, color:C.muted, letterSpacing:"0.35em",
                textTransform:"uppercase", marginBottom:10 }}>Today</p>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {[
                  ["Appointments", summary.total || 0, C.amber],
                  ["Online Revenue", `$${summary.online_revenue || "0.00"}`, C.green],
                  ["Pending", summary.pay_in_shop || 0, C.sub],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ ...MONO, fontSize:10, color:C.muted }}>{label}</span>
                    <span style={{ ...SF, fontSize:11, fontWeight:700, color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <nav style={{ padding:"12px 0" }}>
              {TABS.map(tab => (
                <button key={tab.id}
                  onClick={() => { setActiveTab(tab.id); if(isMobile) setSidebarOpen(false); }}
                  style={{ display:"flex", alignItems:"center", gap:10, width:"100%",
                    padding:"10px 16px", background: activeTab === tab.id ? C.amberDim : "transparent",
                    border:"none", borderLeft: activeTab === tab.id ? `2px solid ${C.amber}` : "2px solid transparent",
                    color: activeTab === tab.id ? C.amber : C.sub,
                    ...MONO, fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase",
                    cursor:"pointer", transition:"all 0.15s", textAlign:"left" }}>
                  <span style={{ fontSize:14, width:20, textAlign:"center" }}>{tab.icon}</span>
                  {tab.label}
                  {tab.count > 0 && (
                    <span style={{ marginLeft:"auto", background:C.amber, color:"black",
                      borderRadius:"50%", width:16, height:16, display:"flex",
                      alignItems:"center", justifyContent:"center",
                      ...SF, fontSize:7, fontWeight:700 }}>{tab.count}</span>
                  )}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* ── Main content ── */}
        <main style={{ flex:1, overflowY:"auto", padding: isMobile ? "16px" : "24px" }}>
          <div className="tab-content" key={activeTab}>

            {/* ════ SCHEDULE ════ */}
            {activeTab === "schedule" && (
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  marginBottom:20, flexWrap:"wrap", gap:12 }}>
                  <div>
                    <h1 style={{ ...SF, fontSize:16, fontWeight:700, textTransform:"uppercase",
                      letterSpacing:"-0.02em", marginBottom:2 }}>Schedule</h1>
                    <p style={{ ...MONO, fontSize:11, color:C.muted }}>{fmtDate(schedDate)}</p>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                    <input type="date" value={schedDate}
                      onChange={e => setSchedDate(e.target.value)}
                      style={{ padding:"7px 12px", background:C.surface,
                        border:`1px solid ${C.border}`, color:C.text,
                        ...MONO, fontSize:11, outline:"none", cursor:"pointer" }}/>
                    {schedDate !== today() && (
                      <button onClick={() => setSchedDate(today())}
                        style={{ padding:"7px 14px", background:C.amberDim,
                          border:`1px solid ${C.amberBorder}`, color:C.amber,
                          ...MONO, fontSize:9, cursor:"pointer" }}>
                        → Today
                      </button>
                    )}
                    <button onClick={() => loadSchedule(schedDate)}
                      style={{ padding:"7px 14px", background:"transparent",
                        border:`1px solid ${C.border}`, color:C.muted,
                        ...MONO, fontSize:9, cursor:"pointer" }}>
                      ↻ Refresh
                    </button>
                    {schedule.some(a => a.status === "completed" || a.status === "cancelled") && (
                      <button onClick={() => setSchedule(p => p.filter(a => a.status !== "completed" && a.status !== "cancelled" && a.status !== "no_show"))}
                        style={{ padding:"7px 14px", background:"rgba(239,68,68,0.06)",
                          border:"1px solid rgba(239,68,68,0.2)", color:C.red,
                          ...MONO, fontSize:9, cursor:"pointer" }}>
                        ✕ Clear Done
                      </button>
                    )}
                  </div>
                </div>

                {/* Summary row */}
                <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
                  <StatCard label="Total" value={summary.total || 0} icon="📅" color={C.amber}/>
                  <StatCard label="Confirmed" value={summary.paid_online || 0} icon="✓" color={C.green}/>
                  <StatCard label="Revenue" value={`$${summary.online_revenue || "0.00"}`} icon="💰" color={C.blue}/>
                  <StatCard label="In Shop" value={summary.pay_in_shop || 0} icon="🏪" color={C.sub}/>
                </div>

                {schedLoading ? (
                  <div style={{ textAlign:"center", padding:40 }}>
                    <p style={{ ...MONO, fontSize:11, color:C.muted, letterSpacing:"0.3em" }}>LOADING...</p>
                  </div>
                ) : schedule.length === 0 ? (
                  <div style={{ textAlign:"center", padding:60, border:`1px dashed ${C.border}` }}>
                    <p style={{ fontSize:32, marginBottom:12 }}>📅</p>
                    <p style={{ ...SF, fontSize:12, color:C.muted, textTransform:"uppercase" }}>No appointments</p>
                    <p style={{ ...MONO, fontSize:11, color:C.muted, marginTop:6 }}>Nothing scheduled for {fmtDate(schedDate)}</p>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {schedule.map(appt => (
                      <ApptCard key={appt.id} appt={appt} isMobile={isMobile}
                        onStatus={handleStatusChange}
                        onCancel={handleCancel}
                        onStrike={handleStrike}
                        onRemind={handleRemind}/>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ════ WALK-IN ════ */}
            {activeTab === "walkin" && (
              <div>
                <h1 style={{ ...SF, fontSize:16, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:"-0.02em", marginBottom:4 }}>Walk-In</h1>
                <p style={{ ...MONO, fontSize:11, color:C.muted, marginBottom:20 }}>Book a client who's here right now</p>

                <div style={{ maxWidth:560 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                    {[
                      { label:"Client Name *", key:"client_name", placeholder:"John Doe" },
                      { label:"Phone", key:"phone", placeholder:"(601) 555-0100" },
                      { label:"Email", key:"email", placeholder:"client@email.com", type:"email" },
                    ].map(f => (
                      <div key={f.key} style={{ gridColumn: f.key === "client_name" ? "1 / -1" : "auto" }}>
                        <label style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.25em",
                          textTransform:"uppercase", display:"block", marginBottom:6 }}>{f.label}</label>
                        <input type={f.type || "text"} value={walkIn[f.key]}
                          onChange={e => setWalkIn(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          style={{ width:"100%", padding:"10px 12px", background:C.surface,
                            border:`1px solid ${C.border}`, color:C.text, ...MONO, fontSize:12, outline:"none" }}
                          onFocus={e => e.target.style.borderColor = C.amberBorder}
                          onBlur={e => e.target.style.borderColor = C.border}/>
                      </div>
                    ))}
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                    <div>
                      <label style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.25em",
                        textTransform:"uppercase", display:"block", marginBottom:6 }}>Service *</label>
                      <select value={walkIn.service_id}
                        onChange={e => setWalkIn(p => ({ ...p, service_id: e.target.value }))}
                        style={{ width:"100%", padding:"10px 12px", background:C.surface,
                          border:`1px solid ${C.border}`, color:C.text, ...MONO, fontSize:12, outline:"none" }}>
                        <option value="">Select service</option>
                        {(prices.length ? prices : services).map(s => (
                          <option key={s.id} value={s.id}>{s.name} — ${s.effective_price || s.price}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.25em",
                        textTransform:"uppercase", display:"block", marginBottom:6 }}>Time *</label>
                      <input type="time" value={walkIn.time}
                        onChange={e => setWalkIn(p => ({ ...p, time: e.target.value }))}
                        style={{ width:"100%", padding:"10px 12px", background:C.surface,
                          border:`1px solid ${C.border}`, color:C.text, ...MONO, fontSize:12, outline:"none" }}/>
                    </div>
                    <div>
                      <label style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.25em",
                        textTransform:"uppercase", display:"block", marginBottom:6 }}>Date</label>
                      <input type="date" value={walkIn.date}
                        onChange={e => setWalkIn(p => ({ ...p, date: e.target.value }))}
                        style={{ width:"100%", padding:"10px 12px", background:C.surface,
                          border:`1px solid ${C.border}`, color:C.text, ...MONO, fontSize:12, outline:"none" }}/>
                    </div>
                    <div>
                      <label style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.25em",
                        textTransform:"uppercase", display:"block", marginBottom:6 }}>Payment</label>
                      <select value={walkIn.payment_method}
                        onChange={e => setWalkIn(p => ({ ...p, payment_method: e.target.value }))}
                        style={{ width:"100%", padding:"10px 12px", background:C.surface,
                          border:`1px solid ${C.border}`, color:C.text, ...MONO, fontSize:12, outline:"none" }}>
                        <option value="shop">Pay in Shop</option>
                        <option value="online">Online</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom:16 }}>
                    <label style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.25em",
                      textTransform:"uppercase", display:"block", marginBottom:6 }}>Notes</label>
                    <textarea value={walkIn.notes} rows={2}
                      onChange={e => setWalkIn(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Any notes about this client or service..."
                      style={{ width:"100%", padding:"10px 12px", background:C.surface,
                        border:`1px solid ${C.border}`, color:C.text, ...MONO, fontSize:12,
                        outline:"none", resize:"none" }}/>
                  </div>

                  <button disabled={walkInBusy} onClick={handleWalkIn}
                    style={{ width:"100%", padding:"13px", background:C.amber, border:"none",
                      color:"black", ...SF, fontSize:9, fontWeight:700, textTransform:"uppercase",
                      letterSpacing:"0.2em", cursor:walkInBusy ? "not-allowed" : "pointer",
                      opacity:walkInBusy ? 0.7 : 1, transition:"all 0.2s" }}>
                    {walkInBusy ? "Booking..." : "✓ Book Walk-In"}
                  </button>
                </div>
              </div>
            )}

            {/* ════ RESCHEDULES ════ */}
            {activeTab === "reschedules" && (
              <div>
                <h1 style={{ ...SF, fontSize:16, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:"-0.02em", marginBottom:4 }}>Reschedules</h1>
                <p style={{ ...MONO, fontSize:11, color:C.muted, marginBottom:20 }}>
                  {reschedules.filter(r=>r.status==="pending").length} pending requests
                </p>

                {reschedules.length === 0 ? (
                  <div style={{ textAlign:"center", padding:60, border:`1px dashed ${C.border}` }}>
                    <p style={{ fontSize:32, marginBottom:12 }}>↻</p>
                    <p style={{ ...SF, fontSize:12, color:C.muted, textTransform:"uppercase" }}>No reschedule requests</p>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {reschedules.map(rr => (
                      <div key={rr.id} style={{ background:C.surface,
                        border:`1px solid ${rr.status === "pending" ? C.amberBorder : C.border}`,
                        padding:16 }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"flex-start", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                          <div>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                              <p style={{ ...SF, fontSize:10, fontWeight:700, color:C.text,
                                textTransform:"uppercase" }}>{rr.client_name}</p>
                              <span style={{ ...MONO, fontSize:9, padding:"2px 8px",
                                background: rr.status === "pending" ? C.amberDim : rr.status === "accepted" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                                color: rr.status === "pending" ? C.amber : rr.status === "accepted" ? C.green : C.red,
                                border: `1px solid ${rr.status === "pending" ? C.amberBorder : rr.status === "accepted" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                                {rr.status}
                              </span>
                            </div>
                            <p style={{ ...MONO, fontSize:11, color:C.sub }}>{rr.service_name}</p>
                          </div>
                          {rr.status === "pending" && (
                            <div style={{ display:"flex", gap:8 }}>
                              <button onClick={() => handleReschedule(rr.id, "accept")}
                                style={{ padding:"7px 16px", background:"rgba(34,197,94,0.1)",
                                  border:"1px solid rgba(34,197,94,0.3)", color:C.green,
                                  ...MONO, fontSize:9, cursor:"pointer" }}>
                                ✓ Approve
                              </button>
                              <button onClick={() => handleReschedule(rr.id, "reject")}
                                style={{ padding:"7px 16px", background:"rgba(239,68,68,0.08)",
                                  border:"1px solid rgba(239,68,68,0.25)", color:C.red,
                                  ...MONO, fontSize:9, cursor:"pointer" }}>
                                ✕ Decline
                              </button>
                            </div>
                          )}
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                          {[
                            ["Original Date", rr.original_date],
                            ["Original Time", rr.original_time],
                            ["Requested Date", rr.requested_date],
                            ["Requested Time", rr.requested_time],
                          ].map(([k,v]) => (
                            <div key={k} style={{ padding:"8px 10px", background:C.surfaceB,
                              border:`1px solid ${C.border}` }}>
                              <p style={{ ...MONO, fontSize:8, color:C.muted,
                                letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:2 }}>{k}</p>
                              <p style={{ ...MONO, fontSize:12, color:k.includes("Requested") ? C.amber : C.text }}>{v}</p>
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
            {activeTab === "clients" && (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  marginBottom:20, flexWrap:"wrap", gap:12 }}>
                  <div>
                    <h1 style={{ ...SF, fontSize:16, fontWeight:700, textTransform:"uppercase",
                      letterSpacing:"-0.02em", marginBottom:2 }}>Clients</h1>
                    <p style={{ ...MONO, fontSize:11, color:C.muted }}>{clients.length} clients</p>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                      placeholder="Search clients..."
                      style={{ padding:"8px 12px", background:C.surface,
                        border:`1px solid ${C.border}`, color:C.text,
                        ...MONO, fontSize:11, outline:"none", width:180 }}
                      onFocus={e => e.target.style.borderColor = C.amberBorder}
                      onBlur={e => e.target.style.borderColor = C.border}/>
                    <button onClick={() => { setBlastOpen(o=>!o); setBlastSel(clients.map(c=>c.id)); }}
                      style={{ padding:"8px 16px", background:C.amberDim,
                        border:`1px solid ${C.amberBorder}`, color:C.amber,
                        ...MONO, fontSize:9, letterSpacing:"0.15em", cursor:"pointer" }}>
                      📣 Blast
                    </button>
                  </div>
                </div>

                {/* Blast panel */}
                {blastOpen && (
                  <div style={{ background:C.surface, border:`1px solid ${C.amberBorder}`,
                    padding:20, marginBottom:20 }}>
                    <p style={{ ...SF, fontSize:10, color:C.amber, textTransform:"uppercase",
                      letterSpacing:"0.1em", marginBottom:14 }}>📣 Send Blast Message</p>

                    {/* Templates */}
                    <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
                      {[
                        { label:"🚀 Website Launch", subject:"HEADZ UP is now booking online!",
                          msg:"✂️ HEADZ UP is now booking online!\n\nBook your next cut at headzupp.com — pick your barber, choose your time, and lock in your spot in under a minute.\n\n→ headzupp.com\n\n2509 W 4th St, Hattiesburg MS" },
                        { label:"💈 We Miss You", subject:"We miss you at HEADZ UP!",
                          msg:"✂️ Hey {name}! It's been a while — your next cut is overdue!\n\nBook online anytime at headzupp.com\n\n2509 W 4th St, Hattiesburg MS" },
                        { label:"🎯 Promo", subject:"Special offer from HEADZ UP",
                          msg:"✂️ Hey {name}! Special offer this week at HEADZ UP.\n\nBook your cut online:\nheadzupp.com\n\n2509 W 4th St, Hattiesburg MS" },
                      ].map(t => (
                        <button key={t.label}
                          onClick={() => setBlastForm(p => ({...p, subject:t.subject, message:t.msg}))}
                          style={{ padding:"6px 12px", background:C.amberDim,
                            border:`1px solid ${C.amberBorder}`, color:C.amber,
                            ...MONO, fontSize:9, cursor:"pointer" }}>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <input value={blastForm.subject}
                      onChange={e => setBlastForm(p=>({...p,subject:e.target.value}))}
                      placeholder="Subject line..."
                      style={{ width:"100%", padding:"9px 12px", background:C.surfaceB,
                        border:`1px solid ${C.border}`, color:C.text,
                        ...MONO, fontSize:12, outline:"none", marginBottom:10 }}/>

                    <textarea value={blastForm.message} rows={4}
                      onChange={e => setBlastForm(p=>({...p,message:e.target.value}))}
                      placeholder="Type your message... Use {name} to personalize"
                      style={{ width:"100%", padding:"9px 12px", background:C.surfaceB,
                        border:`1px solid ${C.border}`, color:C.text,
                        ...MONO, fontSize:12, outline:"none", resize:"vertical", marginBottom:10 }}/>

                    <div style={{ display:"flex", gap:8, justifyContent:"space-between",
                      alignItems:"center", flexWrap:"wrap" }}>
                      <div style={{ display:"flex", gap:12 }}>
                        {[["send_sms","SMS"],["send_email","Email"]].map(([key,label]) => (
                          <label key={key} style={{ display:"flex", alignItems:"center", gap:6,
                            ...MONO, fontSize:11, color:C.sub, cursor:"pointer" }}>
                            <input type="checkbox" checked={blastForm[key]}
                              onChange={e => setBlastForm(p=>({...p,[key]:e.target.checked}))}
                              style={{ accentColor:C.amber }}/>
                            {label}
                          </label>
                        ))}
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => setBlastOpen(false)}
                          style={{ padding:"8px 16px", background:"transparent",
                            border:`1px solid ${C.border}`, color:C.muted,
                            ...MONO, fontSize:9, cursor:"pointer" }}>Cancel</button>
                        <button disabled={blastBusy} onClick={handleBlast}
                          style={{ padding:"8px 16px", background:C.amber, border:"none",
                            color:"black", ...SF, fontSize:8, fontWeight:700,
                            textTransform:"uppercase", cursor:"pointer", opacity:blastBusy?0.7:1 }}>
                          {blastBusy ? "Sending..." : `Send to ${blastSel.length}`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Client list */}
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {clients
                    .filter(c => !clientSearch || c.name?.toLowerCase().includes(clientSearch.toLowerCase()) || c.email?.toLowerCase().includes(clientSearch.toLowerCase()))
                    .map(cl => (
                      <div key={cl.id}
                        onClick={() => setSelClient(selClient?.id === cl.id ? null : cl)}
                        style={{ background:C.surface, border:`1px solid ${selClient?.id === cl.id ? C.amberBorder : C.border}`,
                          padding:"12px 16px", cursor:"pointer", transition:"all 0.15s" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                            <div style={{ width:36, height:36, borderRadius:"50%",
                              background:cl.is_vip ? "rgba(245,158,11,0.15)" : C.amberDim,
                              border:`1px solid ${cl.is_vip ? C.amber : C.amberBorder}`,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              ...SF, fontSize:12, color:C.amber, fontWeight:700 }}>
                              {cl.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <p style={{ ...SF, fontSize:9, fontWeight:700, color:C.text,
                                  textTransform:"uppercase" }}>{cl.name}</p>
                                {cl.is_vip && <span style={{ ...MONO, fontSize:8, color:C.amber }}>⭐ VIP</span>}
                                {cl.is_walk_in && <span style={{ ...MONO, fontSize:8, color:C.muted }}>walk-in</span>}
                              </div>
                              <p style={{ ...MONO, fontSize:10, color:C.muted }}>{cl.email}</p>
                            </div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <p style={{ ...SF, fontSize:11, color:C.amber, fontWeight:700 }}>{cl.total_visits}</p>
                            <p style={{ ...MONO, fontSize:9, color:C.muted }}>visits</p>
                          </div>
                        </div>

                        {selClient?.id === cl.id && (
                          <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
                            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
                              {[["Visits",cl.total_visits],["No Shows",cl.no_shows],["Last Visit",cl.last_visit||"—"]].map(([k,v]) => (
                                <div key={k} style={{ padding:"8px", background:C.surfaceB, textAlign:"center" }}>
                                  <p style={{ ...MONO, fontSize:8, color:C.muted, marginBottom:2 }}>{k}</p>
                                  <p style={{ ...MONO, fontSize:12, color:C.text }}>{v}</p>
                                </div>
                              ))}
                            </div>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              <button onClick={async e => {
                                e.stopPropagation();
                                try { await API.patch(`barber/clients/${cl.id}/`,{is_vip:!cl.is_vip}); const r=await API.get("barber/clients/"); setClients(r.data||[]); } catch(e){}
                              }} style={{ padding:"5px 12px", background: cl.is_vip ? C.amberDim : "transparent",
                                border:`1px solid ${C.amberBorder}`, color:C.amber,
                                ...MONO, fontSize:9, cursor:"pointer" }}>
                                {cl.is_vip ? "★ VIP" : "☆ Mark VIP"}
                              </button>
                              <button onClick={e => { e.stopPropagation(); setBlastOpen(true); setBlastSel([cl.id]); }}
                                style={{ padding:"5px 12px", background:"transparent",
                                  border:`1px solid ${C.border}`, color:C.sub,
                                  ...MONO, fontSize:9, cursor:"pointer" }}>
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
            {activeTab === "reviews" && (
              <div>
                <h1 style={{ ...SF, fontSize:16, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:"-0.02em", marginBottom:4 }}>Reviews</h1>
                <p style={{ ...MONO, fontSize:11, color:C.muted, marginBottom:20 }}>
                  {reviews.length} total · avg {(reviews.reduce((s,r)=>s+r.rating,0)/Math.max(reviews.length,1)).toFixed(1)} ★
                </p>

                {reviews.length === 0 ? (
                  <div style={{ textAlign:"center", padding:60, border:`1px dashed ${C.border}` }}>
                    <p style={{ fontSize:32, marginBottom:12 }}>⭐</p>
                    <p style={{ ...SF, fontSize:12, color:C.muted, textTransform:"uppercase" }}>No reviews yet</p>
                    <p style={{ ...MONO, fontSize:11, color:C.muted, marginTop:6 }}>Mark appointments complete to trigger review requests</p>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {reviews.map(r => (
                      <div key={r.id} style={{ background:C.surface,
                        border:`1px solid ${C.border}`, padding:16 }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"flex-start", marginBottom:10 }}>
                          <div>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                              <p style={{ ...SF, fontSize:9, fontWeight:700, color:C.text,
                                textTransform:"uppercase" }}>{r.client}</p>
                              <span style={{ color:C.amber, fontSize:13, letterSpacing:2 }}>
                                {"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}
                              </span>
                            </div>
                            <p style={{ ...MONO, fontSize:10, color:C.muted }}>{r.created_at}</p>
                          </div>
                        </div>
                        <p style={{ ...MONO, fontSize:12, color:C.text, lineHeight:1.7, marginBottom:10 }}>{r.comment}</p>
                        {r.barber_reply ? (
                          <div style={{ background:C.amberDim, border:`1px solid ${C.amberBorder}`,
                            padding:"10px 12px" }}>
                            <p style={{ ...MONO, fontSize:9, color:C.amber, marginBottom:4, letterSpacing:"0.2em" }}>YOUR REPLY</p>
                            <p style={{ ...MONO, fontSize:12, color:C.text }}>{r.barber_reply}</p>
                          </div>
                        ) : (
                          <div>
                            <textarea value={reviewReply[r.id] || ""}
                              onChange={e => setReviewReply(p => ({...p,[r.id]:e.target.value}))}
                              placeholder="Reply to this review..."
                              rows={2}
                              style={{ width:"100%", padding:"8px 10px", background:C.surfaceB,
                                border:`1px solid ${C.border}`, color:C.text,
                                ...MONO, fontSize:12, outline:"none", resize:"none", marginBottom:6 }}/>
                            <button onClick={async () => {
                              if(!reviewReply[r.id]?.trim()) return;
                              try {
                                await API.patch(`barber/reviews/${r.id}/`,{barber_reply:reviewReply[r.id]});
                                const res = await API.get("barber/reviews/");
                                setReviews(res.data.reviews || []);
                                showToast("Reply posted ✓");
                              } catch(e) { showToast("Could not post reply","error"); }
                            }} style={{ padding:"6px 14px", background:C.amberDim,
                              border:`1px solid ${C.amberBorder}`, color:C.amber,
                              ...MONO, fontSize:9, cursor:"pointer" }}>
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

            {/* ════ HOURS / AVAILABILITY ════ */}
            {activeTab === "availability" && (
              <div>
                <h1 style={{ ...SF, fontSize:16, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:"-0.02em", marginBottom:4 }}>Hours & Availability</h1>
                <p style={{ ...MONO, fontSize:11, color:C.muted, marginBottom:20 }}>Set your working hours and time off</p>

                <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:24 }}>
                  {/* Working hours */}
                  <div>
                    <p style={{ ...SF, fontSize:10, color:C.amber, textTransform:"uppercase",
                      letterSpacing:"0.1em", marginBottom:12 }}>Working Hours</p>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {DAYS.map((day, i) => {
                        const a = availability.find(x => x.day_of_week === i);
                        return (
                          <div key={day} style={{ display:"flex", alignItems:"center", gap:10,
                            padding:"10px 14px", background:C.surface, border:`1px solid ${C.border}` }}>
                            <span style={{ ...SF, fontSize:9, color: a?.is_working ? C.text : C.muted,
                              textTransform:"uppercase", letterSpacing:"0.1em", width:32, flexShrink:0 }}>
                              {day}
                            </span>
                            <div style={{ flex:1 }}>
                              {a?.is_working ? (
                                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                                  <input type="time" defaultValue={a.start_time?.slice(0,5)}
                                    onChange={async e => {
                                      try { await API.post("barber/availability/",{day_of_week:i,start_time:e.target.value,end_time:a.end_time,is_working:true});
                                        const r=await API.get("barber/availability/"); setAvailability(r.data||[]); } catch(e){}
                                    }}
                                    style={{ padding:"4px 8px", background:C.surfaceB,
                                      border:`1px solid ${C.border}`, color:C.text,
                                      ...MONO, fontSize:11, outline:"none" }}/>
                                  <span style={{ color:C.muted }}>→</span>
                                  <input type="time" defaultValue={a.end_time?.slice(0,5)}
                                    onChange={async e => {
                                      try { await API.post("barber/availability/",{day_of_week:i,start_time:a.start_time,end_time:e.target.value,is_working:true});
                                        const r=await API.get("barber/availability/"); setAvailability(r.data||[]); } catch(e){}
                                    }}
                                    style={{ padding:"4px 8px", background:C.surfaceB,
                                      border:`1px solid ${C.border}`, color:C.text,
                                      ...MONO, fontSize:11, outline:"none" }}/>
                                </div>
                              ) : (
                                <span style={{ ...MONO, fontSize:11, color:C.muted }}>Off</span>
                              )}
                            </div>
                            <button onClick={async () => {
                              const isWorking = !a?.is_working;
                              try {
                                await API.post("barber/availability/",{
                                  day_of_week:i, is_working:isWorking,
                                  start_time: a?.start_time || "09:00", end_time: a?.end_time || "18:00"
                                });
                                const r=await API.get("barber/availability/"); setAvailability(r.data||[]);
                              } catch(e){}
                            }} style={{ padding:"4px 10px", background: a?.is_working ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                              border:`1px solid ${a?.is_working ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
                              color: a?.is_working ? C.red : C.green,
                              ...MONO, fontSize:9, cursor:"pointer" }}>
                              {a?.is_working ? "Off" : "On"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time off */}
                  <div>
                    <p style={{ ...SF, fontSize:10, color:C.amber, textTransform:"uppercase",
                      letterSpacing:"0.1em", marginBottom:12 }}>Time Off</p>
                    <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                      <input type="date" value={newTimeOff.date}
                        onChange={e => setNewTimeOff(p=>({...p,date:e.target.value}))}
                        style={{ flex:1, padding:"9px 12px", background:C.surface,
                          border:`1px solid ${C.border}`, color:C.text,
                          ...MONO, fontSize:11, outline:"none" }}/>
                      <button onClick={async () => {
                        if(!newTimeOff.date) return;
                        try {
                          await API.post("barber/time-off/",newTimeOff);
                          const r=await API.get("barber/time-off/"); setTimeOff(r.data||[]);
                          setNewTimeOff({date:"",reason:""});
                          showToast("Time off added ✓");
                        } catch(e){}
                      }} style={{ padding:"9px 16px", background:C.amberDim,
                        border:`1px solid ${C.amberBorder}`, color:C.amber,
                        ...MONO, fontSize:9, cursor:"pointer" }}>
                        + Add
                      </button>
                    </div>
                    <input value={newTimeOff.reason}
                      onChange={e => setNewTimeOff(p=>({...p,reason:e.target.value}))}
                      placeholder="Reason (optional)"
                      style={{ width:"100%", padding:"9px 12px", background:C.surface,
                        border:`1px solid ${C.border}`, color:C.text,
                        ...MONO, fontSize:11, outline:"none", marginBottom:12 }}/>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {timeOff.length === 0 ? (
                        <p style={{ ...MONO, fontSize:11, color:C.muted, padding:16, textAlign:"center" }}>No time off scheduled</p>
                      ) : timeOff.map(t => (
                        <div key={t.id} style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"center", padding:"10px 14px", background:C.surface,
                          border:`1px solid ${C.border}` }}>
                          <div>
                            <p style={{ ...MONO, fontSize:12, color:C.text }}>{fmtDate(t.date)}</p>
                            {t.reason && <p style={{ ...MONO, fontSize:10, color:C.muted }}>{t.reason}</p>}
                          </div>
                          <button onClick={async () => {
                            try { await API.delete(`barber/time-off/${t.id}/`);
                              const r=await API.get("barber/time-off/"); setTimeOff(r.data||[]); } catch(e){}
                          }} style={{ background:"transparent", border:"none", color:C.red,
                            cursor:"pointer", fontSize:16, padding:4 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════ NEWSLETTER ════ */}
            {activeTab === "newsletter" && (
              <div>
                <h1 style={{ ...SF, fontSize:16, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:"-0.02em", marginBottom:4 }}>News Feed</h1>
                <p style={{ ...MONO, fontSize:11, color:C.muted, marginBottom:20 }}>Post updates — clients get push notifications</p>

                {/* New post form */}
                <div style={{ background:C.surface, border:`1px solid ${C.amberBorder}`,
                  padding:20, marginBottom:20 }}>
                  <p style={{ ...SF, fontSize:10, color:C.amber, textTransform:"uppercase",
                    letterSpacing:"0.1em", marginBottom:14 }}>New Post</p>

                  <div style={{ display:"grid", gridTemplateColumns:"60px 1fr", gap:10, marginBottom:10 }}>
                    <input value={postForm.emoji} onChange={e=>setPostForm(p=>({...p,emoji:e.target.value}))}
                      maxLength={2} style={{ padding:"9px", background:C.surfaceB,
                        border:`1px solid ${C.border}`, color:C.text, ...MONO,
                        fontSize:20, textAlign:"center", outline:"none" }}/>
                    <input value={postForm.title} onChange={e=>setPostForm(p=>({...p,title:e.target.value}))}
                      placeholder="Post title..." style={{ padding:"9px 12px", background:C.surfaceB,
                        border:`1px solid ${C.border}`, color:C.text, ...MONO, fontSize:12, outline:"none" }}
                      onFocus={e=>e.target.style.borderColor=C.amberBorder}
                      onBlur={e=>e.target.style.borderColor=C.border}/>
                  </div>

                  <textarea value={postForm.body} onChange={e=>setPostForm(p=>({...p,body:e.target.value}))}
                    placeholder="What do you want to tell your clients?"
                    rows={4} style={{ width:"100%", padding:"9px 12px", background:C.surfaceB,
                      border:`1px solid ${C.border}`, color:C.text, ...MONO, fontSize:12,
                      outline:"none", resize:"none", marginBottom:10 }}/>

                  <div style={{ display:"flex", gap:10, justifyContent:"space-between",
                    alignItems:"center", flexWrap:"wrap" }}>
                    <label style={{ display:"flex", alignItems:"center", gap:6,
                      ...MONO, fontSize:11, color:C.sub, cursor:"pointer" }}>
                      <input type="checkbox" checked={postForm.pinned}
                        onChange={e=>setPostForm(p=>({...p,pinned:e.target.checked}))}
                        style={{ accentColor:C.amber }}/>
                      Pin to top
                    </label>
                    <button disabled={postBusy} onClick={handlePost}
                      style={{ padding:"9px 24px", background:C.amber, border:"none",
                        color:"black", ...SF, fontSize:8, fontWeight:700, textTransform:"uppercase",
                        letterSpacing:"0.2em", cursor:"pointer", opacity:postBusy?0.7:1 }}>
                      {postBusy ? "Publishing..." : "📣 Publish"}
                    </button>
                  </div>
                </div>

                {/* Posts list */}
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {posts.map(p => (
                    <div key={p.id} style={{ background:C.surface,
                      border:`1px solid ${p.pinned ? C.amberBorder : C.border}`, padding:16 }}>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"flex-start", marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:20 }}>{p.emoji}</span>
                          <div>
                            <p style={{ ...SF, fontSize:10, fontWeight:700, color:C.text,
                              textTransform:"uppercase" }}>{p.title}</p>
                            <p style={{ ...MONO, fontSize:10, color:C.muted }}>{p.created_at}</p>
                          </div>
                          {p.pinned && <span style={{ ...MONO, fontSize:8, color:C.amber }}>📌 Pinned</span>}
                        </div>
                        <button onClick={async() => {
                          try { await API.delete(`newsletter/manage/${p.id}/`);
                            const r=await API.get("newsletter/manage/"); setPosts(r.data||[]); } catch(e){}
                        }} style={{ background:"transparent", border:"none", color:C.muted,
                          cursor:"pointer", fontSize:14, padding:4 }}>✕</button>
                      </div>
                      <p style={{ ...MONO, fontSize:12, color:C.sub, lineHeight:1.7 }}>{p.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ════ REPORTS ════ */}
            {activeTab === "reports" && (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
                  <div>
                    <h1 style={{ ...SF, fontSize:16, fontWeight:700, textTransform:"uppercase",
                      letterSpacing:"-0.02em", marginBottom:2 }}>Reports</h1>
                    <p style={{ ...MONO, fontSize:11, color:C.muted }}>Business analytics</p>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    {["week","month","year","all"].map(p => (
                      <button key={p} onClick={() => setReportsPeriod(p)}
                        style={{ padding:"6px 14px", background: reportsPeriod===p ? C.amberDim : "transparent",
                          border:`1px solid ${reportsPeriod===p ? C.amberBorder : C.border}`,
                          color: reportsPeriod===p ? C.amber : C.muted,
                          ...MONO, fontSize:9, textTransform:"uppercase", cursor:"pointer" }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {!reports ? (
                  <p style={{ ...MONO, fontSize:11, color:C.muted, textAlign:"center", padding:40 }}>Loading...</p>
                ) : (
                  <>
                    {/* Summary stats */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10, marginBottom:24 }}>
                      <StatCard label="Total Bookings" value={reports.summary.total} icon="📅" color={C.amber}/>
                      <StatCard label="Completed" value={reports.summary.completed} icon="✓" color={C.green}/>
                      <StatCard label="Revenue" value={`$${reports.summary.total_revenue}`} icon="💰" color={C.blue}/>
                      <StatCard label="No Shows" value={reports.summary.no_shows} icon="⚡" color={C.red}/>
                      <StatCard label="Cancelled" value={reports.summary.cancelled} icon="✕" color={C.sub}/>
                      <StatCard label="Completion" value={`${reports.summary.completion_rate}%`} icon="📈" color={C.purple}/>
                    </div>

                    {/* Service breakdown */}
                    {reports.services?.length > 0 && (
                      <div style={{ marginBottom:24 }}>
                        <p style={{ ...SF, fontSize:10, color:C.amber, textTransform:"uppercase",
                          letterSpacing:"0.1em", marginBottom:12 }}>By Service</p>
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          {reports.services.map(s => (
                            <div key={s.name} style={{ display:"flex", alignItems:"center", gap:12,
                              padding:"10px 14px", background:C.surface,
                              border:`1px solid ${C.border}` }}>
                              <div style={{ flex:1 }}>
                                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                                  <p style={{ ...MONO, fontSize:12, color:C.text }}>{s.name}</p>
                                  <p style={{ ...SF, fontSize:11, color:C.amber }}>${s.revenue}</p>
                                </div>
                                <div style={{ height:4, background:C.border, borderRadius:2 }}>
                                  <div style={{ height:"100%", background:C.amber, borderRadius:2,
                                    width:`${Math.min(100, (s.bookings / (reports.summary.total||1)) * 100)}%`,
                                    transition:"width 0.5s" }}/>
                                </div>
                              </div>
                              <p style={{ ...MONO, fontSize:11, color:C.muted, flexShrink:0 }}>{s.bookings} bookings</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Busiest days */}
                    {reports.busiest_days?.length > 0 && (
                      <div>
                        <p style={{ ...SF, fontSize:10, color:C.amber, textTransform:"uppercase",
                          letterSpacing:"0.1em", marginBottom:12 }}>Busiest Days</p>
                        <div style={{ display:"flex", gap:6 }}>
                          {reports.busiest_days.map(d => (
                            <div key={d.day} style={{ flex:1, padding:"10px 6px", background:C.surface,
                              border:`1px solid ${d.bookings > 0 ? C.amberBorder : C.border}`, textAlign:"center" }}>
                              <p style={{ ...MONO, fontSize:9, color:C.muted, marginBottom:4 }}>{d.day}</p>
                              <p style={{ ...SF, fontSize:14, color: d.bookings > 0 ? C.amber : C.sub }}>{d.bookings}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ════ STRIPE ════ */}
            {activeTab === "stripe" && (
              <div>
                <h1 style={{ ...SF, fontSize:16, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:"-0.02em", marginBottom:4 }}>Stripe Payments</h1>
                <p style={{ ...MONO, fontSize:11, color:C.muted, marginBottom:20 }}>Connect your bank to receive deposits</p>

                <div style={{ maxWidth:480 }}>
                  {stripeStatus?.connected ? (
                    <div>
                      <div style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)",
                        padding:20, marginBottom:16 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                          <span style={{ color:C.green, fontSize:20 }}>✓</span>
                          <p style={{ ...SF, fontSize:11, color:C.green, textTransform:"uppercase",
                            fontWeight:700, letterSpacing:"0.05em" }}>Stripe Connected</p>
                        </div>
                        <p style={{ ...MONO, fontSize:11, color:C.sub }}>
                          Charges: {stripeStatus.charges_enabled ? "✓ Enabled" : "⏳ Pending"} ·
                          Payouts: {stripeStatus.payouts_enabled ? "✓ Enabled" : "⏳ Pending"}
                        </p>
                      </div>
                      <button onClick={async () => {
                        try { const r=await API.get("barber/stripe/dashboard/"); window.open(r.data.url,"_blank"); }
                        catch(e){showToast("Could not open Stripe dashboard","error");}
                      }} style={{ width:"100%", padding:"12px", background:C.amberDim,
                        border:`1px solid ${C.amberBorder}`, color:C.amber,
                        ...MONO, fontSize:11, cursor:"pointer", transition:"all 0.2s",
                        letterSpacing:"0.15em", textTransform:"uppercase" }}>
                        Open Stripe Dashboard →
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ background:C.surface, border:`1px solid ${C.border}`,
                        padding:20, marginBottom:16 }}>
                        <p style={{ ...SF, fontSize:10, color:C.text, textTransform:"uppercase",
                          fontWeight:700, marginBottom:8 }}>Connect Your Bank</p>
                        <p style={{ ...MONO, fontSize:12, color:C.sub, lineHeight:1.7, marginBottom:0 }}>
                          Connect Stripe to receive deposit payments directly to your bank account.
                          HEADZ UP takes a $1.50 platform fee per booking.
                        </p>
                      </div>
                      <button disabled={stripeLoading} onClick={handleStripeConnect}
                        style={{ width:"100%", padding:"13px", background:C.amber, border:"none",
                          color:"black", ...SF, fontSize:9, fontWeight:700, textTransform:"uppercase",
                          letterSpacing:"0.2em", cursor:"pointer", opacity:stripeLoading?0.7:1 }}>
                        {stripeLoading ? "Connecting..." : "Connect Stripe →"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════ PROFILE ════ */}
            {activeTab === "profile" && (
              <div>
                <h1 style={{ ...SF, fontSize:16, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:"-0.02em", marginBottom:4 }}>Profile</h1>
                <p style={{ ...MONO, fontSize:11, color:C.muted, marginBottom:24 }}>
                  Update your photo, bio, and payment info
                </p>

                <div style={{ maxWidth:520, display:"flex", flexDirection:"column", gap:16 }}>

                  {/* Photo upload */}
                  <div style={{ background:C.surface, border:`1px solid ${C.border}`, padding:20 }}>
                    <p style={{ ...MONO, fontSize:10, color:C.amber, textTransform:"uppercase",
                      letterSpacing:"0.2em", marginBottom:16 }}>Profile Photo</p>

                    <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:16 }}>
                      {/* Current / preview photo */}
                      <div style={{ width:80, height:80, borderRadius:"50%", flexShrink:0,
                        border:`2px solid ${C.amberBorder}`, overflow:"hidden",
                        background:C.amberDim, display:"flex", alignItems:"center",
                        justifyContent:"center" }}>
                        {photoPreview || barber?.photo_url ? (
                          <img src={photoPreview || barber?.photo_url}
                            alt={barber?.name}
                            style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                        ) : (
                          <span style={{ ...SF, fontSize:28, color:C.amber, fontWeight:700 }}>
                            {barber?.name?.charAt(0)}
                          </span>
                        )}
                      </div>

                      <div>
                        <p style={{ ...MONO, fontSize:12, color:C.text, marginBottom:6 }}>
                          {barber?.photo_url ? "Change your photo" : "Upload a photo"}
                        </p>
                        <p style={{ ...MONO, fontSize:10, color:C.muted, marginBottom:12 }}>
                          JPG or PNG · Max 5MB · Square works best
                        </p>
                        <label style={{ padding:"8px 16px", background:C.amberDim,
                          border:`1px solid ${C.amberBorder}`, color:C.amber,
                          ...MONO, fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase",
                          cursor:"pointer", display:"inline-block" }}>
                          📷 Choose Photo
                          <input type="file" accept="image/*"
                            style={{ display:"none" }}
                            onChange={async e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 5 * 1024 * 1024) {
                                showToast("Photo must be under 5MB", "error"); return;
                              }
                              const reader = new FileReader();
                              reader.onload = ev => setPhotoPreview(ev.target.result);
                              reader.readAsDataURL(file);
                            }}/>
                        </label>
                      </div>
                    </div>

                    {photoPreview && (
                      <div style={{ display:"flex", gap:8 }}>
                        <button disabled={profileSaving}
                          onClick={async () => {
                            setProfileSaving(true);
                            try {
                              await API.patch("barber/me/update/", { photo: photoPreview });
                              const r = await API.get("barber/me/");
                              setBarber(r.data);
                              setPhotoPreview(null);
                              showToast("Photo updated ✓");
                            } catch(e) {
                              showToast("Could not upload photo", "error");
                            } finally { setProfileSaving(false); }
                          }}
                          style={{ padding:"8px 20px", background:C.amber, border:"none",
                            color:"black", ...SF, fontSize:7, fontWeight:700,
                            textTransform:"uppercase", letterSpacing:"0.15em",
                            cursor:"pointer", opacity:profileSaving?0.7:1 }}>
                          {profileSaving ? "Uploading..." : "Save Photo →"}
                        </button>
                        <button onClick={() => setPhotoPreview(null)}
                          style={{ padding:"8px 14px", background:"transparent",
                            border:`1px solid ${C.border}`, color:C.muted,
                            ...MONO, fontSize:10, cursor:"pointer" }}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  <div style={{ background:C.surface, border:`1px solid ${C.border}`, padding:20 }}>
                    <p style={{ ...MONO, fontSize:10, color:C.amber, textTransform:"uppercase",
                      letterSpacing:"0.2em", marginBottom:12 }}>Bio</p>
                    <textarea
                      defaultValue={barber?.bio || ""}
                      onChange={e => setProfileForm(p => ({...p, bio:e.target.value}))}
                      placeholder="Tell clients about yourself — your specialties, style, experience..."
                      rows={3}
                      style={{ width:"100%", padding:"10px 12px", background:C.surfaceB,
                        border:`1px solid ${C.border}`, color:C.text,
                        ...MONO, fontSize:12, outline:"none", resize:"none", marginBottom:10 }}
                      onFocus={e => e.target.style.borderColor = C.amberBorder}
                      onBlur={e => e.target.style.borderColor = C.border}/>
                    <button disabled={profileSaving}
                      onClick={async () => {
                        setProfileSaving(true);
                        try {
                          await API.patch("barber/me/update/", { bio: profileForm.bio || barber?.bio });
                          const r = await API.get("barber/me/");
                          setBarber(r.data);
                          showToast("Bio updated ✓");
                        } catch(e) { showToast("Could not update bio","error"); }
                        finally { setProfileSaving(false); }
                      }}
                      style={{ padding:"8px 18px", background:C.amberDim,
                        border:`1px solid ${C.amberBorder}`, color:C.amber,
                        ...MONO, fontSize:9, cursor:"pointer", letterSpacing:"0.1em" }}>
                      {profileSaving ? "Saving..." : "Save Bio"}
                    </button>
                  </div>

                  {/* Cash App tag */}
                  <div style={{ background:C.surface, border:`1px solid ${C.border}`, padding:20 }}>
                    <p style={{ ...MONO, fontSize:10, color:C.amber, textTransform:"uppercase",
                      letterSpacing:"0.2em", marginBottom:12 }}>Cash App Tag</p>
                    <div style={{ display:"flex", gap:8 }}>
                      <div style={{ position:"relative", flex:1 }}>
                        <span style={{ position:"absolute", left:12, top:"50%",
                          transform:"translateY(-50%)", ...MONO, fontSize:13, color:C.green }}>$</span>
                        <input
                          defaultValue={(barber?.cashapp_tag || "").replace("$","")}
                          onChange={e => setProfileForm(p => ({...p, cashapp_tag:e.target.value}))}
                          placeholder="yourcashtag"
                          style={{ width:"100%", paddingLeft:28, paddingRight:12,
                            paddingTop:10, paddingBottom:10,
                            background:C.surfaceB, border:`1px solid ${C.border}`,
                            color:C.text, ...MONO, fontSize:12, outline:"none" }}
                          onFocus={e => e.target.style.borderColor = C.amberBorder}
                          onBlur={e => e.target.style.borderColor = C.border}/>
                      </div>
                      <button disabled={profileSaving}
                        onClick={async () => {
                          setProfileSaving(true);
                          try {
                            await API.patch("barber/me/update/", { cashapp_tag: profileForm.cashapp_tag || barber?.cashapp_tag });
                            const r = await API.get("barber/me/");
                            setBarber(r.data);
                            showToast("Cash App tag updated ✓");
                          } catch(e) { showToast("Could not update","error"); }
                          finally { setProfileSaving(false); }
                        }}
                        style={{ padding:"10px 18px", background:C.amberDim,
                          border:`1px solid ${C.amberBorder}`, color:C.amber,
                          ...MONO, fontSize:9, cursor:"pointer" }}>
                        {profileSaving ? "..." : "Save"}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}


          </div>
        </main>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999,
          background: toast.type === "error" ? C.red : C.amber,
          color: "black", padding:"12px 20px",
          ...MONO, fontSize:11, letterSpacing:"0.1em",
          boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
          animation:"toastIn 0.3s ease both",
          maxWidth:320 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
