"use client";
import { useNotifications } from "@/components/NotificationSystem";
export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import API from "@/lib/api";
import AuthGuard from "@/lib/AuthGuard";
import useBreakpoint from "@/lib/useBreakpoint";

const sf   = { fontFamily:"'Syncopate', sans-serif" };
const mono = { fontFamily:"'DM Mono', monospace" };

const STATUS = {
  confirmed: { label:"Confirmed", color:"#4ade80",  bg:"rgba(74,222,128,0.08)",   border:"rgba(74,222,128,0.2)"   },
  completed: { label:"Completed", color:"#a1a1aa",  bg:"rgba(161,161,170,0.06)",  border:"rgba(161,161,170,0.12)" },
  no_show:   { label:"No Show",   color:"#f87171",  bg:"rgba(248,113,113,0.08)",  border:"rgba(248,113,113,0.2)"  },
  cancelled: { label:"Cancelled", color:"#a1a1aa",  bg:"rgba(82,82,91,0.06)",     border:"rgba(82,82,91,0.12)"    },
};

function fmtDate(d){ return new Date(d+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"}); }
function fmtTime(t){ if(!t)return""; const[h,m]=t.split(":"); const hr=parseInt(h); return `${hr%12||12}:${m} ${hr>=12?"PM":"AM"}`; }

/* ── Reschedule Modal ── */
function RescheduleModal({ appt, onClose, onDone }) {
  const [newDate,      setNewDate]      = useState("");
  const [newTime,      setNewTime]      = useState("");
  const [busy,         setBusy]         = useState(false);
  const [err,          setErr]          = useState("");

  // Barber schedule (same data as booking page)
  const [allDays,      setAllDays]      = useState([]);
  const [timeOffDates, setTimeOffDates] = useState([]);
  const [schedLoading, setSchedLoading] = useState(true);

  // Available time slots for selected date
  const [slots,        setSlots]        = useState([]);
  const [bookedSlots,  setBookedSlots]  = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [timeOff,      setTimeOff]      = useState(false);

  const today  = new Date(); today.setHours(0,0,0,0);
  const todayISO = today.toISOString().split("T")[0];

  // ── Fetch barber working days on mount ──────────────────────────────────
  useEffect(() => {
    const barberId = appt?.barber_id || appt?.barber;
    if (!barberId) { setSchedLoading(false); return; }
    API.get(`barbers/${barberId}/working-days/`)
      .then(r => {
        setAllDays(r.data.all_days || []);
        setTimeOffDates(r.data.time_off_dates || []);
      })
      .catch(() => {})
      .finally(() => setSchedLoading(false));
  }, [appt?.barber_id, appt?.barber]);

  // ── Fetch time slots when date changes ──────────────────────────────────
  useEffect(() => {
    const bid = appt?.barber_id || appt?.barber;
    if (!newDate || !bid) return;
    setSlotsLoading(true); setSlots([]); setBookedSlots([]); setTimeOff(false); setNewTime("");
    API.get(`available-slots/?barber=${appt.barber_id||appt.barber}&date=${newDate}&service=${appt.service_id||appt.service||""}`)
      .then(r => {
        if (r.data.time_off) { setTimeOff(true); return; }
        const avail  = r.data.available_slots || [];
        const booked = r.data.booked_slots    || [];
        const allSlots = [...new Set([...avail, ...booked])].sort();
        setSlots(allSlots);
        setBookedSlots(booked);
      })
      .catch(() => {
        setSlots([]);
        setBookedSlots([]);
      })
      .finally(() => setSlotsLoading(false));
  }, [newDate, appt?.barber_id, appt?.barber, appt?.service_id, appt?.service]);

  // ── DOW conversion: Python 0=Mon→JS 1, Python 6=Sun→JS 0 ────────────────
  const hasSchedule  = allDays.length > 0;
  const dowWorkMap   = {};
  allDays.forEach(d => { dowWorkMap[(d.day_of_week + 1) % 7] = d.is_working; });
  const timeOffSet   = new Set(timeOffDates);

  // Calendar state
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAY_LBLS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const toISO = (y,m,d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  // Open days label for legend
  const openDays = allDays.filter(d=>d.is_working).map(d=>{
    const js = (d.day_of_week+1)%7;
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][js];
  });

  function fmtSlot(t) {
    if (!t) return t;
    const [h,m] = t.split(":");
    const hr = parseInt(h); const ampm = hr >= 12 ? "PM" : "AM";
    return `${hr%12||12}:${m} ${ampm}`;
  }

  const submit = async () => {
    if (!newDate || !newTime) { setErr("Please pick a date and time."); return; }
    setBusy(true); setErr("");
    try {
      // Convert "9:30 AM" → "09:30:00"
      const [time, mod] = newTime.split(" ");
      let [h, m] = time.split(":");
      if (h === "12") h = "00";
      if (mod === "PM") h = String(parseInt(h) + 12);
      const time24 = `${h.padStart(2,"0")}:${m}:00`;
      await API.post(`appointments/${appt.id}/reschedule/`, { new_date: newDate, new_time: time24 });
      onDone("Reschedule request sent to your barber!");
      onClose();
    } catch(e) {
      setErr(e.response?.data?.error || "Could not send reschedule request.");
    } finally { setBusy(false); }
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:999,background:"rgba(4,4,4,0.96)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div style={{width:"100%",maxWidth:480,background:"#0a0a0a",border:"1px solid rgba(245,158,11,0.3)",
        clipPath:"polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))",
        maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden"
      }}>
        {/* Header */}
        <div style={{padding:"18px 22px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <p style={{...mono,fontSize:8,color:"#f59e0b",letterSpacing:"0.4em",textTransform:"uppercase",marginBottom:4}}>Request Reschedule</p>
            <p style={{...sf,fontSize:11,fontWeight:700,textTransform:"uppercase",margin:0}}>{appt.service_name||"Appointment"}</p>
            <p style={{...mono,fontSize:10,color:"#a1a1aa",marginTop:2}}>
              with {appt.barber_name} · {fmtDate(appt.date)}{appt.time ? ` · ${fmtTime(appt.time)}` : ""}
            </p>
          </div>
          <button onClick={onClose}
            style={{width:32,height:32,background:"transparent",border:"1px solid rgba(255,255,255,0.08)",color:"#a1a1aa",cursor:"pointer",fontSize:14,transition:"all 0.2s",flexShrink:0}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#f87171";e.currentTarget.style.color="#f87171";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.color="#a1a1aa";}}>✕</button>
        </div>

        <div style={{padding:"18px 22px",overflowY:"auto",flex:1}}>
          {err && <p style={{...mono,fontSize:11,color:"#f87171",marginBottom:14}}>⚠ {err}</p>}

          {/* Info + barber schedule */}
          <div style={{padding:"12px 14px",background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",marginBottom:20}}>
            <p style={{...mono,fontSize:10,color:"#f59e0b",lineHeight:1.6,marginBottom:allDays.filter(d=>d.is_working).length>0?10:0}}>
              Pick a date and time below. Only days {appt.barber_name || "your barber"} works are selectable. Your request needs their approval.
            </p>
            {/* Barber working hours per day */}
            {allDays.filter(d=>d.is_working).length>0&&(
              <div style={{borderTop:"1px solid rgba(245,158,11,0.15)",paddingTop:10}}>
                <p style={{...sf,fontSize:6,letterSpacing:"0.3em",color:"rgba(245,158,11,0.5)",textTransform:"uppercase",marginBottom:8}}>
                  {appt.barber_name}'s Schedule
                </p>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {allDays.filter(d=>d.is_working).map(d=>{
                    const dayName = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][d.day_of_week];
                    const fmtT = t => {
                      if(!t) return "";
                      const [h,m] = t.split(":");
                      const hr = parseInt(h);
                      return `${hr%12||12}:${m}${hr>=12?"PM":"AM"}`;
                    };
                    return(
                      <div key={d.day_of_week} style={{
                        padding:"4px 10px",
                        background:"rgba(245,158,11,0.08)",
                        border:"1px solid rgba(245,158,11,0.2)",
                        display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                      }}>
                        <span style={{...sf,fontSize:6,color:"#f59e0b",letterSpacing:"0.2em",textTransform:"uppercase"}}>{dayName}</span>
                        {d.start_time&&d.end_time&&(
                          <span style={{...mono,fontSize:8,color:"#a1a1aa"}}>{fmtT(d.start_time)}–{fmtT(d.end_time)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── CALENDAR ─────────────────────────────────────────── */}
          <p style={{...sf,fontSize:6,letterSpacing:"0.4em",color:"#a1a1aa",textTransform:"uppercase",marginBottom:10}}>Select New Date</p>

          {schedLoading ? (
            <div style={{padding:"24px",textAlign:"center"}}>
              <div style={{width:16,height:16,border:"2px solid rgba(245,158,11,0.2)",borderTopColor:"#f59e0b",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
            </div>
          ) : (<div style={{background:"#050505",border:"1px solid rgba(255,255,255,0.08)",marginBottom:16,overflow:"hidden",
              clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))"
            }}>
              {/* Month nav */}
              <div style={{background:"#000",padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <button onClick={()=>{ if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); }}
                  style={{width:28,height:28,background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:"#71717a",cursor:"pointer",fontSize:13,transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.style.color="#f59e0b";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="#71717a";}}>‹</button>
                <p style={{...sf,fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em",margin:0}}>{MONTHS[viewMonth]} {viewYear}</p>
                <button onClick={()=>{ if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); }}
                  style={{width:28,height:28,background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:"#71717a",cursor:"pointer",fontSize:13,transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.style.color="#f59e0b";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="#71717a";}}>›</button>
              </div>

              <div style={{padding:"10px 10px 12px"}}>
                {/* Day labels */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>
                  {DAY_LBLS.map(d=>(
                    <p key={d} style={{...mono,fontSize:8,textAlign:"center",color:"#52525b",textTransform:"uppercase",margin:0,padding:"3px 0"}}>{d}</p>
                  ))}
                </div>

                {/* Date cells */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                  {cells.map((day,i)=>{
                    if(!day) return <div key={i}/>;
                    const iso    = toISO(viewYear,viewMonth,day);
                    const date   = new Date(viewYear,viewMonth,day);
                    const jsDow  = date.getDay();
                    const isPast = date < today;
                    const isUnavail = hasSchedule
                      ? (dowWorkMap.hasOwnProperty(jsDow) ? !dowWorkMap[jsDow] : true)
                      : jsDow === 0;
                    const isTimeOff = timeOffSet.has(iso);
                    const disabled  = isPast || isUnavail || isTimeOff;
                    const isToday   = iso === todayISO;
                    const selected  = iso === newDate;
                    const showSlash = !isPast && (isUnavail || isTimeOff);

                    // Completely black out non-working days (not just slash)
                    if(!isPast && isUnavail && !isTimeOff) {
                      return (
                        <div key={iso} style={{aspectRatio:"1",background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
                          <span style={{...mono,fontSize:10,color:"#1a1a1a",userSelect:"none"}}>{day}</span>
                          <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}} viewBox="0 0 40 40" preserveAspectRatio="none">
                            <line x1="4" y1="36" x2="36" y2="4" stroke="rgba(239,68,68,0.25)" strokeWidth="1" strokeLinecap="round"/>
                          </svg>
                        </div>
                      );
                    }
                    return (
                      <button key={iso} onClick={()=>!disabled&&setNewDate(iso)} disabled={disabled}
                        style={{
                          aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",
                          position:"relative",overflow:"hidden",
                          ...mono,fontSize:10,fontWeight:selected?700:400,
                          background: selected?"#f59e0b":isToday?"rgba(245,158,11,0.1)":"transparent",
                          color:      selected?"black":isPast?"#1e1e1e":isTimeOff?"#2a2a2a":isToday?"#f59e0b":"#d4d4d4",
                          border:     selected?"1px solid #f59e0b":isToday?"1px solid rgba(245,158,11,0.3)":"1px solid transparent",
                          cursor:     disabled?"not-allowed":"pointer",transition:"all 0.15s",borderRadius:0,
                        }}
                        onMouseEnter={e=>{if(!disabled&&!selected){e.currentTarget.style.background="rgba(245,158,11,0.15)";e.currentTarget.style.color="#f59e0b";e.currentTarget.style.borderColor="rgba(245,158,11,0.3)";}}}
                        onMouseLeave={e=>{if(!disabled&&!selected){e.currentTarget.style.background=isToday?"rgba(245,158,11,0.1)":"transparent";e.currentTarget.style.color=isToday?"#f59e0b":"#d4d4d4";e.currentTarget.style.borderColor=isToday?"rgba(245,158,11,0.3)":"transparent";}}}>
                        {isTimeOff&&(
                          <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}} viewBox="0 0 40 40" preserveAspectRatio="none">
                            <line x1="4" y1="36" x2="36" y2="4" stroke="rgba(239,68,68,0.55)" strokeWidth="1.5" strokeLinecap="round"
                              style={{filter:"drop-shadow(0 0 3px rgba(239,68,68,0.6))"}}/>
                          </svg>
                        )}
                        <span style={{position:"relative",zIndex:1}}>{day}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{display:"flex",gap:10,marginTop:10,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.05)",flexWrap:"wrap"}}>
                  {openDays.length>0&&(
                    <p style={{...mono,fontSize:8,color:"#52525b",margin:0}}>
                      ✓ Open: <span style={{color:"#f59e0b"}}>{openDays.join(", ")}</span>
                    </p>
                  )}
                  <p style={{...mono,fontSize:8,color:"#52525b",margin:0}}>╱ = unavailable</p>
                </div>
              </div>
            </div>
          )}

          {/* ── TIME SLOTS ───────────────────────────────────────── */}
          {newDate && (
            <>
              <p style={{...sf,fontSize:6,letterSpacing:"0.4em",color:"#a1a1aa",textTransform:"uppercase",marginBottom:10}}>
                Available Times — {new Date(newDate+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
              </p>

              {slotsLoading ? (
                <div style={{padding:"20px",textAlign:"center"}}>
                  <div style={{width:16,height:16,border:"2px solid rgba(245,158,11,0.2)",borderTopColor:"#f59e0b",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
                  <p style={{...mono,fontSize:9,color:"#52525b",marginTop:10}}>Checking availability...</p>
                </div>
              ) : timeOff ? (
                <div style={{padding:"14px",background:"rgba(248,113,113,0.05)",border:"1px solid rgba(248,113,113,0.15)",textAlign:"center",marginBottom:16}}>
                  <p style={{...sf,fontSize:8,color:"#f87171",letterSpacing:"0.2em",textTransform:"uppercase"}}>Not Available This Day</p>
                </div>
              ) : slots.length===0 ? (
                <div style={{padding:"14px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",textAlign:"center",marginBottom:16}}>
                  <p style={{...sf,fontSize:8,color:"#52525b",letterSpacing:"0.2em",textTransform:"uppercase"}}>Fully Booked</p>
                  <p style={{...mono,fontSize:11,color:"#3f3f46",marginTop:4}}>No open slots this day — try another date.</p>
                  <button onClick={()=>{
                    setSlotsLoading(true); setSlots([]); setBookedSlots([]); setTimeOff(false);
                    API.get(`available-slots/?barber=${appt.barber_id||appt.barber}&date=${newDate}&service=${appt.service_id||appt.service||""}`)
                      .then(r=>{
                        if(r.data.time_off){setTimeOff(true);return;}
                        const avail=r.data.available_slots||[];
                        const booked=r.data.booked_slots||[];
                        setSlots([...new Set([...avail,...booked])].sort());
                        setBookedSlots(booked);
                      })
                      .catch(()=>{})
                      .finally(()=>setSlotsLoading(false));
                  }} style={{marginTop:10,padding:"6px 14px",background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",color:"#f59e0b",...mono,fontSize:9,cursor:"pointer",letterSpacing:"0.1em"}}>
                    ↺ Retry
                  </button>
                </div>
              ) : (<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:16}}>
                  {slots.map(s=>{
                    const display   = fmtSlot(s);
                    const isBooked  = bookedSlots.includes(s);
                    const isSelected= newTime===display;
                    return(
                      <button key={s} onClick={()=>!isBooked&&setNewTime(display)} disabled={isBooked}
                        style={{
                          padding:"10px 4px",position:"relative",overflow:"hidden",
                          ...sf,fontSize:5,letterSpacing:"0.05em",textTransform:"uppercase",
                          border:`1px solid ${isSelected?"#f59e0b":isBooked?"rgba(239,68,68,0.3)":"rgba(245,158,11,0.2)"}`,
                          background:isSelected?"rgba(245,158,11,0.15)":isBooked?"rgba(239,68,68,0.08)":"rgba(245,158,11,0.04)",
                          color:isSelected?"#f59e0b":isBooked?"rgba(239,68,68,0.5)":"#a1a1aa",
                          cursor:isBooked?"not-allowed":"pointer",transition:"all 0.15s",
                        }}
                        onMouseEnter={e=>{if(!isBooked&&!isSelected){e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.style.color="#f59e0b";e.currentTarget.style.background="rgba(245,158,11,0.12)";}}}
                        onMouseLeave={e=>{if(!isBooked&&!isSelected){e.currentTarget.style.borderColor="rgba(245,158,11,0.2)";e.currentTarget.style.color="#a1a1aa";e.currentTarget.style.background="rgba(245,158,11,0.04)";}}}
                      >
                        {/* Red diagonal slash for booked slots */}
                        {isBooked&&(
                          <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}} viewBox="0 0 80 36" preserveAspectRatio="none">
                            <line x1="4" y1="32" x2="76" y2="4" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5"
                              style={{filter:"drop-shadow(0 0 3px rgba(239,68,68,0.8))"}}/>
                          </svg>
                        )}
                        <span style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                          <span>{display}</span>
                          {isBooked&&<span style={{...mono,fontSize:5,color:"rgba(239,68,68,0.6)",letterSpacing:"0.1em"}}>TAKEN</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Submit */}
          <button onClick={submit} disabled={busy||!newDate||!newTime||timeOff}
            style={{width:"100%",padding:"15px",...sf,fontSize:8,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",
              background:busy||!newDate||!newTime||timeOff?"#111":"#f59e0b",
              color:busy||!newDate||!newTime||timeOff?"#3f3f46":"black",
              border:"none",cursor:busy||!newDate||!newTime||timeOff?"not-allowed":"pointer",
              transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:10,
              clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))"
            }}>
            {busy
              ? <><span style={{width:14,height:14,border:"2px solid #3f3f46",borderTopColor:"#a1a1aa",borderRadius:"50%",display:"inline-block",animation:"spin 0.7s linear infinite"}}/>Sending...</>
              : "Send Reschedule Request →"
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Confirmation Modal — replaces browser confirm() ── */
function ConfirmModal({ modal, onConfirm, onCancel }) {
  useEffect(() => {
    if (!modal) return;
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [modal, onCancel]);

  if (!modal) return null;

  const isDestructive = modal.type === "danger" || modal.type === "strike";
  const isWarning     = modal.type === "warning";
  const accentColor   = isDestructive ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e";
  const iconMap = { danger:"✕", strike:"⚠", warning:"⚠", confirm:"✓", approve:"✓", decline:"✕", payment:"$" };
  const icon = iconMap[modal.type] || "!";

  return (
    <div onClick={onCancel}
      style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(0,0,0,0.88)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"cmFadeIn 0.18s ease" }}>
      <style>{`
        @keyframes cmFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes cmSlideUp { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:none} }
      `}</style>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:"#0a0a0a", border:`1px solid ${accentColor}33`, maxWidth:400, width:"100%", position:"relative", animation:"cmSlideUp 0.22s cubic-bezier(0.16,1,0.3,1)", clipPath:"polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))" }}>
        <div style={{ height:3, background:`linear-gradient(to right,${accentColor},${accentColor}44,transparent)` }}/>
        <div style={{ padding:"20px 24px 16px", display:"flex", alignItems:"center", gap:14, borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ width:38, height:38, background:`${accentColor}18`, border:`1px solid ${accentColor}44`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))" }}>
            <span style={{ fontSize:16, color:accentColor, fontWeight:900 }}>{icon}</span>
          </div>
          <p style={{ fontFamily:"'Syncopate',sans-serif", fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:"0.1em", color:"white", margin:0, flex:1 }}>{modal.title}</p>
          <div style={{ position:"absolute", top:14, right:14, width:12, height:12, borderTop:`1.5px solid ${accentColor}55`, borderRight:`1.5px solid ${accentColor}55` }}/>
        </div>
        <div style={{ padding:"18px 24px 16px" }}>
          <p style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"#a1a1aa", lineHeight:1.75, margin:0 }}>{modal.message}</p>
          {modal.badge && (
            <div style={{ marginTop:14, display:"inline-flex", alignItems:"center", gap:8, background:`${accentColor}10`, border:`1px solid ${accentColor}30`, padding:"7px 14px", clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))" }}>
              <span style={{ fontSize:11 }}>⚠</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:accentColor, letterSpacing:"0.2em", textTransform:"uppercase" }}>{modal.badge}</span>
            </div>
          )}
        </div>
        <div style={{ padding:"4px 24px 24px", display:"flex", gap:10 }}>
          <button onClick={onCancel}
            style={{ flex:1, padding:"13px 16px", background:"transparent", border:"1px solid rgba(255,255,255,0.1)", color:"#71717a", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:"0.15em", textTransform:"uppercase", cursor:"pointer", transition:"all 0.18s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.25)";e.currentTarget.style.color="white";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="#71717a";}}>
            {modal.cancelLabel || "Go Back"}
          </button>
          <button onClick={onConfirm}
            style={{ flex:1, padding:"13px 16px", background:`${accentColor}15`, border:`1px solid ${accentColor}55`, color:accentColor, fontFamily:"'Syncopate',sans-serif", fontSize:8, fontWeight:900, letterSpacing:"0.15em", textTransform:"uppercase", cursor:"pointer", transition:"all 0.18s", clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))" }}
            onMouseEnter={e=>{e.currentTarget.style.background=`${accentColor}30`;e.currentTarget.style.borderColor=accentColor;}}
            onMouseLeave={e=>{e.currentTarget.style.background=`${accentColor}15`;e.currentTarget.style.borderColor=`${accentColor}55`;}}>
            {modal.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ── Main dashboard ── */
function DashboardContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isMobile } = useBreakpoint();

  const [user,         setUser]         = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState("upcoming");
  const [toast,        setToast]        = useState(null);
  const [cancelling,   setCancelling]   = useState(null);
  const [modal,        setModal]        = useState(null);
  const [modalCb,      setModalCb]      = useState(null);
  const [reschedAppt,  setReschedAppt]  = useState(null);
  const [time,         setTime]         = useState("");
  const [strikeInfo,   setStrikeInfo]   = useState(null);
  const [phoneNumber,  setPhoneNumber]  = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput,   setPhoneInput]   = useState("");
  const [phoneSaving,  setPhoneSaving]  = useState(false);
  // Review
  const [showReview,   setShowReview]   = useState(false);
  const [reviewAppt,   setReviewAppt]   = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText,   setReviewText]   = useState("");
  const [reviewBusy,   setReviewBusy]   = useState(false);
  const [reviewDone,   setReviewDone]   = useState(false);
  // Change password
  const [showPwd,      setShowPwd]      = useState(false);
  const [pwdForm,      setPwdForm]      = useState({current:"",next:"",confirm:""});
  const [pwdBusy,      setPwdBusy]      = useState(false);
  const [pwdErr,       setPwdErr]       = useState("");
  const [pwdOk,        setPwdOk]        = useState(false);
  // Push notifications
  const [pushEnabled,  setPushEnabled]  = useState(false);
  const [pushBusy,     setPushBusy]     = useState(false);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  // Live clock
  useEffect(()=>{
    const tick=()=>setTime(new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true}));
    tick(); const t=setInterval(tick,1000); return()=>clearInterval(t);
  },[]);

  // Params
  useEffect(()=>{
    if(searchParams.get("booked")==="true"){ showToast("🎉 Booking confirmed! See you soon."); window.history.replaceState({},"","/dashboard"); }
    if(searchParams.get("canceled")==="true"){ showToast("Payment cancelled.","error"); window.history.replaceState({},"","/dashboard"); }
    if(searchParams.get("reschedule")==="accepted"){ showToast("✓ Reschedule accepted! Your appointment is updated."); window.history.replaceState({},"","/dashboard"); }
    if(searchParams.get("reschedule")==="rejected"){ showToast("Reschedule request declined. Original time stands.","error"); window.history.replaceState({},"","/dashboard"); }
  },[searchParams]);

  // Load
  useEffect(()=>{
    const load=async()=>{
      try{
        const[d,a,s]=await Promise.all([
          API.get("dashboard/"),
          API.get("appointments/"),
          API.get("client/strike-status/").catch(()=>({data:null})),
        ]);
        // Barbers should never see the client dashboard
        if(d.data.is_staff){ router.replace("/barber-dashboard"); return; }
        setUser(d.data);
        const appts=Array.isArray(a.data)?a.data:a.data.results||[];
        setAppointments(appts.sort((x,y)=>new Date(y.date)-new Date(x.date)));
        if(s.data){
          setStrikeInfo(s.data);
          if(s.data.phone){ setPhoneNumber(s.data.phone); setPhoneInput(s.data.phone); }
        }
      }catch(e){
        const status = e?.response?.status;
        if(status===401){ router.replace("/login"); return; }
        showToast("Could not load data.","error");
      }
      finally{ setLoading(false); }
      // Check push subscription state
      if("serviceWorker" in navigator && "PushManager" in window){
        try{
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          setPushEnabled(!!sub);
        }catch{}
      }
    };
    load();
  },[]);

  const handleLogout=()=>{ localStorage.removeItem("access"); localStorage.removeItem("refresh"); router.replace("/login"); };

  const handleCancel=async(appt)=>{
    const apptDT = new Date(`${appt.date}T${appt.time}`);
    const now2   = new Date();
    const diffHrs= (apptDT - now2) / (1000 * 60 * 60);
    const isLate = diffHrs >= 0 && diffHrs < 2;

    await new Promise((resolve, reject) => {
      setModal({
        type:         isLate ? "strike" : "danger",
        title:        isLate ? "Late Cancellation" : "Cancel Appointment",
        message:      isLate
          ? `You are cancelling within 2 hours of your appointment. This will result in a STRIKE and your deposit will increase by $1.50 on your next booking.`
          : `Cancel your ${appt.service_name||"appointment"} on ${fmtDate(appt.date)}?`,
        badge:        isLate ? "Strike will be issued" : "Deposit is non-refundable",
        confirmLabel: isLate ? "Yes, Cancel" : "Cancel Appt",
        cancelLabel:  "Keep It",
      });
      setModalCb(() => ({ resolve, reject }));
    }).catch(() => { throw new Error("cancelled"); });
    setModal(null);
    setCancelling(appt.id);
    try{
      await API.patch(`appointments/${appt.id}/`, { status:"cancelled" });
      if(isLate){
        // Backend issues strike automatically via the late_cancel endpoint
        try{ await API.post(`barber/appointments/${appt.id}/strike/`, { reason:"late_cancel" }); }catch{}
      }
      setAppointments(p=>p.map(a=>a.id===appt.id?{...a,status:"cancelled"}:a));
      if(isLate){
        showToast("Appointment cancelled. A strike has been added to your account.","error");
        // Refresh strike info
        API.get("client/strike-status/").then(r=>setStrikeInfo(r.data)).catch(()=>{});
      } else {
        showToast("Appointment cancelled.");
        addNotif?.("Appointment Cancelled","Your appointment has been cancelled.","booking_cancelled","/dashboard");
      }
    }catch{ showToast("Could not cancel.","error"); }
    finally{ setCancelling(null); }
  };

  const now=new Date(); now.setHours(0,0,0,0);
  const upcoming=appointments.filter(a=>new Date(a.date+"T00:00:00")>=now&&a.status!=="cancelled");
  const past=appointments.filter(a=>new Date(a.date+"T00:00:00")<now||a.status==="cancelled");
  const shown=activeTab==="upcoming"?upcoming:past;
  const nextAppt=upcoming[0]||null;
  const completed=appointments.filter(a=>a.status==="completed").length;

  return (
    <>
      <style jsx global>{`
        /* Noise + barber pole from design system */
        body::before{content:"";position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");opacity:0.018;pointer-events:none;z-index:9999;mix-blend-mode:overlay;}
        body::after{content:"";position:fixed;left:0;top:0;bottom:0;width:5px;background:repeating-linear-gradient(-45deg,#ef4444 0px,#ef4444 6px,#ffffff 6px,#ffffff 12px,#f59e0b 12px,#f59e0b 18px,#000 18px,#000 24px);opacity:0.5;z-index:9998;pointer-events:none;}
        @media(max-width:768px){body::after{display:none;}}
        .btn-primary{position:relative;overflow:hidden;}
        .btn-primary::after{content:"";position:absolute;top:0;left:0;width:35%;height:100%;background:linear-gradient(to right,transparent,rgba(255,255,255,0.18),transparent);transform:translateX(-100%);}
        .btn-primary:hover::after{transform:translateX(280%);transition:transform 0.5s ease;}
        @media(hover:none){button:active,a:active{opacity:0.75;}}
        @keyframes shimmer{from{transform:translateX(-100%)}to{transform:translateX(280%)}}
        @keyframes floatUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:none}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        html,body{background:#040404;color:white;font-family:'DM Mono',monospace;overflow-x:hidden;-webkit-text-size-adjust:100%;}
        @keyframes spin    {to{transform:rotate(360deg)}}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes toastIn {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes scandown{from{top:-1px}to{top:100%}}
        @keyframes glow    {0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)}50%{box-shadow:0 0 0 8px rgba(34,197,94,0)}}
        .dc{animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both;}
        .dc:nth-child(1){animation-delay:0.05s}.dc:nth-child(2){animation-delay:0.1s}
        .dc:nth-child(3){animation-delay:0.15s}.dc:nth-child(4){animation-delay:0.2s}
        .dc:nth-child(5){animation-delay:0.25s}.dc:nth-child(6){animation-delay:0.3s}
        .appt-row{transition:border-color 0.2s,background 0.2s;}
        .appt-row:hover{border-color:rgba(245,158,11,0.3)!important;background:rgba(245,158,11,0.03)!important;}
      `}</style>

      {/* Backgrounds */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",backgroundImage:"linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)",backgroundSize:"72px 72px"}}/>
      <div style={{position:"fixed",top:"-10%",right:"-5%",width:600,height:600,background:"radial-gradient(circle,rgba(245,158,11,0.055) 0%,transparent 65%)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:"10%",left:"-8%",width:400,height:400,background:"radial-gradient(circle,rgba(245,158,11,0.03) 0%,transparent 60%)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",inset:0,zIndex:1,pointerEvents:"none",overflow:"hidden"}}>
        <div style={{position:"absolute",left:0,right:0,height:1,background:"linear-gradient(to right,transparent,rgba(245,158,11,0.2),transparent)",animation:"scandown 10s linear infinite"}}/>
      </div>

      {/* Reschedule modal */}
      {modal && (
        <ConfirmModal
          modal={modal}
          onConfirm={() => { if(modalCb) modalCb.resolve(); }}
          onCancel={() => { setModal(null); if(modalCb) modalCb.reject("cancelled"); }}
        />
      )}
      {reschedAppt && (
        <RescheduleModal
          appt={reschedAppt}
          onClose={()=>setReschedAppt(null)}
          onDone={(msg)=>{ showToast(msg); setReschedAppt(null); }}
        />
      )}

      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",bottom:isMobile?20:32,left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"12px 20px",background:toast.type==="success"?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.1)",border:`1px solid ${toast.type==="success"?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.3)"}`,backdropFilter:"blur(20px)",display:"flex",alignItems:"center",gap:10,animation:"toastIn 0.3s ease",whiteSpace:"nowrap",zIndex:8888}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:toast.type==="success"?"#4ade80":"#f87171",flexShrink:0}}/>
          <span style={{...sf,fontSize:7,letterSpacing:"0.2em",textTransform:"uppercase",color:toast.type==="success"?"#4ade80":"#f87171"}}>{toast.msg}</span>
        </div>
      )}

      <div style={{position:"relative",zIndex:10,minHeight:"100vh",minHeight:"100dvh"}}>

        {/* NAV */}
        <nav style={{position:"sticky",top:0,zIndex:100,background:"rgba(4,4,4,0.95)",backdropFilter:"blur(24px)",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{maxWidth:1200,margin:"0 auto",padding:isMobile?"0 16px":"0 40px",height:60,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <a href="/" style={{...sf,fontWeight:700,fontSize:17,letterSpacing:"-0.06em",textDecoration:"none",color:"white"}}>
              HEADZ<span style={{color:"#f59e0b",fontStyle:"italic"}}>UP</span>
            </a>
            {!isMobile&&<span style={{...mono,fontSize:11,color:"#a1a1aa",letterSpacing:"0.3em"}}>{time}</span>}
            <div style={{display:"flex",alignItems:"center",gap:isMobile?8:12}}>
              {user&&!isMobile&&(
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:28,height:28,background:"#f59e0b",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{...sf,fontSize:10,fontWeight:900,color:"black"}}>{(user.user||"?").charAt(0).toUpperCase()}</span>
                  </div>
                  <span style={{...mono,fontSize:11,color:"#a1a1aa"}}>{user.user}</span>
                </div>
              )}
              <button onClick={()=>router.push("/book")}
                style={{padding:isMobile?"8px 14px":"10px 20px",background:"#f59e0b",color:"black",...sf,fontSize:7,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",border:"none",cursor:"pointer",transition:"background 0.2s",whiteSpace:"nowrap"}}
                onMouseEnter={e=>e.currentTarget.style.background="white"}
                onMouseLeave={e=>e.currentTarget.style.background="#f59e0b"}>
                + Book
              </button>
              <button onClick={handleLogout}
                style={{padding:isMobile?"10px 14px":"10px 16px",background:"rgba(248,113,113,0.1)",color:"#f87171",...sf,fontSize:7,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",border:"1px solid rgba(248,113,113,0.35)",cursor:"pointer",transition:"all 0.2s",whiteSpace:"nowrap",
                  clipPath:"polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px))"
                }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(248,113,113,0.2)";e.currentTarget.style.borderColor="rgba(248,113,113,0.6)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(248,113,113,0.1)";e.currentTarget.style.borderColor="rgba(248,113,113,0.35)";}}>
                ⏻ Sign Out
              </button>
            </div>
          </div>
        </nav>

        {/* CONTENT */}
        <div style={{maxWidth:1200,margin:"0 auto",padding:isMobile?"28px 16px max(48px,env(safe-area-inset-bottom))":"52px 40px 80px"}}>

          {/* ── STRIKE BANNER ── */}
          {strikeInfo && strikeInfo.strike_count > 0 && (
            <div className="dc" style={{marginBottom:isMobile?20:28,padding:"14px 18px",background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",display:"flex",alignItems:isMobile?"flex-start":"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,
              clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))"
            }}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                <span style={{fontSize:18,flexShrink:0}}>⚡</span>
                <div>
                  <p style={{...sf,fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",color:"#f87171",marginBottom:4}}>
                    {strikeInfo.strike_count} Strike{strikeInfo.strike_count > 1 ? "s" : ""} on Your Account
                  </p>
                  <p style={{...mono,fontSize:11,color:"#a1a1aa",lineHeight:1.7}}>
                    Your next booking deposit is <strong style={{color:"#f59e0b"}}>${strikeInfo.deposit_fee}</strong> due to previous no-shows or late cancellations.
                    {strikeInfo.strike_count === 1 && " Each additional strike adds $1.50 to your deposit."}
                  </p>
                </div>
              </div>
              <div style={{padding:"6px 14px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",flexShrink:0}}>
                <span style={{...mono,fontSize:10,color:"#f87171"}}>{strikeInfo.strike_count} / ∞ strikes</span>
              </div>
            </div>
          )}

          {/* ── DEPOSIT INFO banner (if no strikes, show standard) ── */}
          {strikeInfo && strikeInfo.strike_count === 0 && (
            <div className="dc" style={{marginBottom:isMobile?20:28,padding:"12px 16px",background:"rgba(245,158,11,0.04)",border:"1px solid rgba(245,158,11,0.12)",display:"flex",alignItems:"center",gap:10,
              clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))"
            }}>
              <span style={{fontSize:14}}>💰</span>
              <p style={{...mono,fontSize:11,color:"#a1a1aa",lineHeight:1.6}}>
                Your current booking deposit is <strong style={{color:"#f59e0b"}}>${strikeInfo.deposit_fee}</strong>. 
                No-shows and late cancellations increase your deposit by $1.50 per strike.
              </p>
            </div>
          )}

          {/* ── PHONE NUMBER CARD ── */}
          <div className="dc" style={{marginBottom:isMobile?16:20,padding:"14px 18px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",
            clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))"
          }}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:16}}>📱</span>
                <div>
                  <p style={{...sf,fontSize:7,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:2}}>
                    Text Reminders
                  </p>
                  {phoneNumber
                    ? <p style={{...mono,fontSize:11,color:"#4ade80"}}>✓ {phoneNumber}</p>
                    : <p style={{...mono,fontSize:11,color:"#52525b"}}>No phone number — add one to get appointment texts</p>
                  }
                </div>
              </div>
              {!editingPhone && (
                <button onClick={()=>{setEditingPhone(true);setPhoneInput(phoneNumber||"");}}
                  style={{padding:"7px 14px",...sf,fontSize:6,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",
                    background:"transparent",border:"1px solid rgba(255,255,255,0.12)",color:"#a1a1aa",cursor:"pointer",transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.style.color="#f59e0b";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.12)";e.currentTarget.style.color="#a1a1aa";}}>
                  {phoneNumber?"Edit":"+ Add"}
                </button>
              )}
            </div>
            {editingPhone && (
              <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid rgba(255,255,255,0.07)"}}>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={e=>setPhoneInput(e.target.value)}
                    placeholder="(601) 555-0100"
                    style={{flex:1,minWidth:160,padding:"10px 14px",background:"#0a0a0a",border:"1px solid rgba(245,158,11,0.3)",color:"white",
                      fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none"}}
                  />
                  <button onClick={async()=>{
                    setPhoneSaving(true);
                    try{
                      const r=await API.patch("client/update-phone/",{phone:phoneInput.trim()});
                      setPhoneNumber(r.data.phone||"");
                      setEditingPhone(false);
                      showToast("✓ Phone number saved — you'll now get appointment texts!");
                    }catch(e){
                      showToast(e.response?.data?.error||"Please enter a valid 10-digit US number.","error");
                    }finally{setPhoneSaving(false);}
                  }} disabled={phoneSaving}
                    style={{padding:"10px 18px",background:"#f59e0b",color:"black",...sf,fontSize:7,fontWeight:700,
                      letterSpacing:"0.15em",textTransform:"uppercase",border:"none",cursor:phoneSaving?"not-allowed":"pointer",transition:"all 0.2s",
                      clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))"
                    }}>
                    {phoneSaving?"Saving...":"Save"}
                  </button>
                  <button onClick={()=>setEditingPhone(false)}
                    style={{padding:"10px 14px",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:"#71717a",
                      ...sf,fontSize:7,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer"}}>
                    Cancel
                  </button>
                </div>
                <p style={{...mono,fontSize:9,color:"#52525b",marginTop:8}}>
                  US numbers only. Standard messaging rates may apply. You'll get texts for confirmations, reminders, and reschedule updates.
                </p>
              </div>
            )}
          </div>

          {loading?(
            <div style={{paddingTop:100,display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
              <p style={{...sf,fontSize:20,fontWeight:900,textTransform:"uppercase",letterSpacing:"-0.06em"}}>HEADZ<span style={{color:"#f59e0b",fontStyle:"italic"}}>UP</span></p>
              <div style={{width:1,height:32,background:"linear-gradient(to bottom,#f59e0b,transparent)"}}/>
              <div style={{width:18,height:18,border:"1.5px solid rgba(245,158,11,0.2)",borderTopColor:"#f59e0b",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
            </div>
          ):(
            <>
              {/* GREETING */}
              <div className="dc" style={{marginBottom:isMobile?32:48,paddingBottom:isMobile?32:48,borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
                <p style={{...mono,fontSize:9,color:"#f59e0b",letterSpacing:"0.5em",textTransform:"uppercase",marginBottom:12}}>Client Dashboard</p>
                <h1 style={{...sf,fontSize:"clamp(1.8rem,6vw,4rem)",fontWeight:900,textTransform:"uppercase",lineHeight:isMobile?1.1:0.88,letterSpacing:"-0.03em",marginBottom:16}}>
                  Hey,<br/><span style={{color:"#f59e0b",fontStyle:"italic"}}>{user?.user||"Client"}_</span>
                </h1>
                <p style={{...mono,fontSize:13,color:"#a1a1aa",maxWidth:400,lineHeight:1.7}}>
                  {upcoming.length>0
                    ?`You have ${upcoming.length} upcoming appointment${upcoming.length!==1?"s":""}. We'll see you soon.`
                    :"No upcoming appointments. Ready to book your next cut?"}
                </p>
              </div>

              {/* STATS */}
              <div className="dc" style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:8,marginBottom:isMobile?32:48}}>
                {[
                  {label:"Total Visits",  value:appointments.filter(a=>a.status!=="cancelled").length, accent:false},
                  {label:"Upcoming",      value:upcoming.length,  accent:true},
                  {label:"Completed",     value:completed,        accent:false},
                  {label:"Member Since",  value:appointments.length>0?new Date(appointments[appointments.length-1].date+"T00:00:00").getFullYear():new Date().getFullYear(), accent:false},
                ].map(({label,value,accent})=>(
                  <div key={label} style={{padding:isMobile?"16px 14px":"22px 18px",background:accent?"rgba(245,158,11,0.07)":"rgba(255,255,255,0.02)",border:`1px solid ${accent?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.07)"}`,position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,right:0,width:40,height:40,background:accent?"linear-gradient(225deg,rgba(245,158,11,0.2),transparent)":"linear-gradient(225deg,rgba(255,255,255,0.03),transparent)"}}/>
                    <p style={{...sf,fontSize:5,letterSpacing:"0.3em",color:accent?"#f59e0b":"#a1a1aa",textTransform:"uppercase",marginBottom:10}}>{label}</p>
                    <p style={{...sf,fontSize:isMobile?22:30,fontWeight:900,color:accent?"#f59e0b":"white",lineHeight:1}}>{value}</p>
                  </div>
                ))}
              </div>

              {/* NEXT APPOINTMENT */}
              {nextAppt&&(
                <div className="dc" style={{marginBottom:isMobile?32:48,padding:isMobile?"18px 16px":"24px 28px",background:"linear-gradient(135deg,rgba(245,158,11,0.07),rgba(245,158,11,0.02))",border:"1px solid rgba(245,158,11,0.25)",display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"center",gap:16}}>
                  <div>
                    <p style={{...mono,fontSize:8,color:"#f59e0b",letterSpacing:"0.5em",textTransform:"uppercase",marginBottom:8}}>Next Appointment</p>
                    <h2 style={{...sf,fontSize:"clamp(1rem,2.5vw,1.5rem)",fontWeight:900,textTransform:"uppercase",marginBottom:8,letterSpacing:"-0.03em"}}>
                      {nextAppt.service_name||"Appointment"}
                    </h2>
                    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                      <span style={{...mono,fontSize:12,color:"#a1a1aa"}}>{fmtDate(nextAppt.date)}</span>
                      {nextAppt.time&&<span style={{...mono,fontSize:12,color:"#f59e0b"}}>{fmtTime(nextAppt.time)}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:8,height:8,background:"#22c55e",borderRadius:"50%",animation:"glow 2s infinite"}}/>
                      <span style={{...sf,fontSize:7,color:"#4ade80",textTransform:"uppercase",letterSpacing:"0.2em"}}>Confirmed</span>
                    </div>
                    <button onClick={()=>setReschedAppt(nextAppt)}
                      style={{padding:"8px 16px",...sf,fontSize:7,letterSpacing:"0.15em",textTransform:"uppercase",background:"transparent",border:"1px solid rgba(245,158,11,0.3)",color:"#f59e0b",cursor:"pointer",transition:"all 0.2s"}}
                      onMouseEnter={e=>{e.currentTarget.style.background="rgba(245,158,11,0.08)";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                      ↻ Reschedule
                    </button>
                  </div>
                </div>
              )}

              {/* APPOINTMENTS LIST */}
              <div className="dc">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:32,height:1,background:"rgba(245,158,11,0.5)"}}/>
                    <h2 style={{...sf,fontSize:"clamp(0.8rem,2vw,1rem)",fontWeight:900,textTransform:"uppercase",letterSpacing:"-0.02em"}}>
                      Your_<span style={{color:"#f59e0b",fontStyle:"italic"}}>Appointments</span>
                    </h2>
                  </div>
                  <div style={{display:"flex",border:"1px solid rgba(255,255,255,0.08)"}}>
                    {["upcoming","past"].map(tab=>(
                      <button key={tab} onClick={()=>setActiveTab(tab)}
                        style={{padding:isMobile?"8px 12px":"9px 16px",...sf,fontSize:6,letterSpacing:"0.15em",textTransform:"uppercase",background:activeTab===tab?"#f59e0b":"transparent",color:activeTab===tab?"black":"#a1a1aa",border:"none",cursor:"pointer",transition:"all 0.2s"}}>
                        {tab} ({tab==="upcoming"?upcoming.length:past.length})
                      </button>
                    ))}
                  </div>
                </div>

                {shown.length===0?(
                  <div style={{padding:isMobile?"48px 16px":"64px 24px",textAlign:"center",border:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.01)",position:"relative",overflow:"hidden"}}>
                    <p style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",...sf,fontSize:"clamp(4rem,12vw,8rem)",fontWeight:900,color:"rgba(255,255,255,0.025)",textTransform:"uppercase",letterSpacing:"-0.06em",userSelect:"none"}}>
                      {activeTab==="upcoming"?"FRESH":"DONE"}
                    </p>
                    <div style={{position:"relative",zIndex:1}}>
                      <p style={{...sf,fontSize:9,color:"rgba(255,255,255,0.08)",textTransform:"uppercase",marginBottom:12}}>
                        {activeTab==="upcoming"?"No upcoming cuts":"No past appointments"}
                      </p>
                      {activeTab==="upcoming"&&(
                        <button onClick={()=>router.push("/book")}
                          style={{padding:"14px 28px",background:"#f59e0b",color:"black",...sf,fontSize:8,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",border:"none",cursor:"pointer",transition:"background 0.2s"}}
                          onMouseEnter={e=>e.currentTarget.style.background="white"}
                          onMouseLeave={e=>e.currentTarget.style.background="#f59e0b"}>
                          Book Now →
                        </button>
                      )}
                    </div>
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {shown.map(appt=>{
                      const s=STATUS[appt.status]||STATUS.confirmed;
                      const isActive      = (appt.status==="confirmed" || appt.status==="pending_shop") && activeTab==="upcoming";
                      const canReschedule = isActive;
                      const canCancel     = isActive;
                      return(
                        <div key={appt.id} className="appt-row"
                          style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",overflow:"hidden",
                            borderLeft:`3px solid ${s.color}`}}>
                          {/* Top row: date + info + status */}
                          <div style={{display:"flex",alignItems:"center",gap:isMobile?10:16,padding:isMobile?"14px 12px":"16px 20px"}}>
                            {/* Date block */}
                            <div style={{width:isMobile?44:52,flexShrink:0,textAlign:"center"}}>
                              <p style={{...sf,fontSize:isMobile?16:22,fontWeight:900,color:appt.status==="confirmed"?"#f59e0b":"#a1a1aa",lineHeight:1}}>
                                {new Date(appt.date+"T00:00:00").getDate()}
                              </p>
                              <p style={{...sf,fontSize:6,color:"#a1a1aa",textTransform:"uppercase",letterSpacing:"0.1em"}}>
                                {new Date(appt.date+"T00:00:00").toLocaleDateString("en-US",{month:"short"})}
                              </p>
                            </div>
                            <div style={{width:1,height:32,background:"rgba(255,255,255,0.07)",flexShrink:0}}/>
                            {/* Info */}
                            <div style={{flex:1,minWidth:0}}>
                              <p style={{...sf,fontSize:isMobile?11:12,fontWeight:700,textTransform:"uppercase",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                {appt.service_name||"Appointment"}
                              </p>
                              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:3}}>
                                <span style={{...mono,fontSize:10,color:"#a1a1aa"}}>{fmtDate(appt.date)}</span>
                                {appt.time&&<span style={{...mono,fontSize:10,color:"#f59e0b"}}>{fmtTime(appt.time)}</span>}
                              </div>
                              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                                {appt.barber_name&&<span style={{...mono,fontSize:9,color:"#a1a1aa"}}>✂️ {appt.barber_name}</span>}
                                <span style={{...mono,fontSize:9,color:"#a1a1aa"}}>📍 2509 W 4th St</span>
                              </div>
                            </div>
                            {/* Status badge */}
                            <span style={{...sf,fontSize:5,letterSpacing:"0.1em",textTransform:"uppercase",padding:"4px 10px",background:s.bg,color:s.color,border:`1px solid ${s.border}`,flexShrink:0}}>
                              {s.label}
                            </span>
                          </div>

                          {/* Action buttons row — full width, clearly visible */}
                          {(canReschedule||canCancel)&&(
                            <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                              {canReschedule&&(
                                <button onClick={()=>setReschedAppt(appt)}
                                  style={{flex:1,padding:"12px 16px",background:"rgba(245,158,11,0.04)",
                                    border:"none",borderRight:canCancel?"1px solid rgba(255,255,255,0.05)":"none",
                                    color:"#f59e0b",cursor:"pointer",display:"flex",alignItems:"center",
                                    justifyContent:"center",gap:8,transition:"all 0.2s",
                                    fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.15em",
                                  }}
                                  onMouseEnter={e=>e.currentTarget.style.background="rgba(245,158,11,0.1)"}
                                  onMouseLeave={e=>e.currentTarget.style.background="rgba(245,158,11,0.04)"}>
                                  <span style={{fontSize:13}}>↻</span> Reschedule
                                </button>
                              )}
                              {canCancel&&(
                                <button onClick={()=>handleCancel(appt)} disabled={cancelling===appt.id}
                                  style={{flex:1,padding:"13px 16px",
                                    background:cancelling===appt.id?"rgba(239,68,68,0.15)":"rgba(239,68,68,0.1)",
                                    border:"none",borderTop:"2px solid rgba(239,68,68,0.4)",
                                    color:"#f87171",fontWeight:700,
                                    cursor:cancelling===appt.id?"not-allowed":"pointer",
                                    display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                                    transition:"all 0.2s",fontFamily:"'DM Mono',monospace",
                                    fontSize:11,letterSpacing:"0.12em",textTransform:"uppercase",
                                  }}
                                  onMouseEnter={e=>{if(cancelling!==appt.id){e.currentTarget.style.background="rgba(239,68,68,0.2)";e.currentTarget.style.color="white";}}}
                                  onMouseLeave={e=>{e.currentTarget.style.background=cancelling===appt.id?"rgba(239,68,68,0.15)":"rgba(239,68,68,0.1)";e.currentTarget.style.color="#f87171";}}>
                                  {cancelling===appt.id
                                    ? <><span style={{width:11,height:11,border:"2px solid rgba(239,68,68,0.3)",borderTopColor:"#f87171",borderRadius:"50%",display:"inline-block",animation:"spin 0.7s linear infinite"}}/> Cancelling...</>
                                    : <><span style={{fontSize:14,fontWeight:900}}>✕</span> Cancel Appointment</>
                                  }
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── ACCOUNT SETTINGS ─────────────────────────────────── */}
              <div className="dc" style={{marginTop:isMobile?32:48,borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:isMobile?32:48}}>
                <p style={{...mono,fontSize:7,color:"rgba(245,158,11,0.5)",letterSpacing:"0.5em",textTransform:"uppercase",marginBottom:20}}>Account Settings</p>

                <div style={{display:"flex",flexDirection:"column",gap:10}}>

                  {/* ── LEAVE A REVIEW ── */}
                  {appointments.filter(a=>a.status==="completed").length>0&&(
                    <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))"}}>
                      <div style={{padding:"16px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                          <span style={{fontSize:18}}>⭐</span>
                          <div>
                            <p style={{...sf,fontSize:7,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:2}}>Leave a Review</p>
                            <p style={{...mono,fontSize:11,color:"#52525b"}}>
                              {reviewDone?"✓ Review submitted — thank you!":"Share your experience with your barber"}
                            </p>
                          </div>
                        </div>
                        {!reviewDone&&(
                          <button onClick={()=>{
                            const last=appointments.find(a=>a.status==="completed");
                            setReviewAppt(last);
                            setReviewRating(5);setReviewText("");
                            setShowReview(s=>!s);
                          }}
                            style={{padding:"7px 14px",...sf,fontSize:6,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",
                              background:showReview?"rgba(245,158,11,0.15)":"transparent",
                              border:`1px solid ${showReview?"rgba(245,158,11,0.5)":"rgba(255,255,255,0.12)"}`,
                              color:showReview?"#f59e0b":"#a1a1aa",cursor:"pointer",transition:"all 0.2s"}}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.style.color="#f59e0b";}}
                            onMouseLeave={e=>{if(!showReview){e.currentTarget.style.borderColor="rgba(255,255,255,0.12)";e.currentTarget.style.color="#a1a1aa";}}}>
                            {showReview?"Close":"Write Review"}
                          </button>
                        )}
                      </div>

                      {showReview&&!reviewDone&&(
                        <div style={{padding:"0 18px 18px",borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:16}}>
                          {reviewAppt&&(
                            <p style={{...mono,fontSize:10,color:"#71717a",marginBottom:14}}>
                              Reviewing: <strong style={{color:"white"}}>{reviewAppt.service_name}</strong> with <strong style={{color:"#f59e0b"}}>{reviewAppt.barber_name}</strong>
                            </p>
                          )}
                          {/* Stars */}
                          <div style={{display:"flex",gap:6,marginBottom:14}}>
                            {[1,2,3,4,5].map(s=>(
                              <button key={s} onClick={()=>setReviewRating(s)}
                                style={{background:"none",border:"none",cursor:"pointer",fontSize:isMobile?26:28,color:s<=reviewRating?"#f59e0b":"rgba(255,255,255,0.12)",transition:"color 0.15s",padding:0,lineHeight:1}}
                                onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"}
                                onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                                ★
                              </button>
                            ))}
                            <span style={{...mono,fontSize:11,color:"#f59e0b",alignSelf:"center",marginLeft:6}}>{["","Awful","Poor","OK","Good","Amazing!"][reviewRating]}</span>
                          </div>
                          {/* Text */}
                          <textarea
                            value={reviewText}
                            onChange={e=>setReviewText(e.target.value)}
                            placeholder="Tell us about your experience — the cut, the vibe, the barber..."
                            rows={3}
                            style={{width:"100%",background:"#0a0a0a",border:"1px solid rgba(255,255,255,0.1)",padding:"11px 14px",color:"white",...mono,fontSize:13,outline:"none",resize:"vertical",marginBottom:12,transition:"border-color 0.2s"}}
                            onFocus={e=>e.target.style.borderColor="rgba(245,158,11,0.4)"}
                            onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}
                          />
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={async()=>{
                              if(!reviewText.trim()){showToast("Write something first","error");return;}
                              setReviewBusy(true);
                              try{
                                await API.post("review/submit/",{
                                  appointment: reviewAppt?.id,
                                  rating:      reviewRating,
                                  comment:     reviewText.trim(),
                                });
                                setReviewDone(true);
                                setShowReview(false);
                                showToast("⭐ Review submitted — thank you!");
                                addNotif?.("Review Submitted ⭐","Thanks for sharing your experience!","haircut_review");
                              }catch(e){showToast(e.response?.data?.error||"Could not submit review","error");}
                              finally{setReviewBusy(false);}
                            }} disabled={reviewBusy}
                              style={{padding:"10px 22px",background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.4)",color:"#f59e0b",...sf,fontSize:7,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",cursor:reviewBusy?"not-allowed":"pointer",transition:"all 0.2s",
                                clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))"}}>
                              {reviewBusy?"Submitting...":"Submit Review →"}
                            </button>
                            <button onClick={()=>setShowReview(false)}
                              style={{padding:"10px 14px",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",color:"#71717a",...mono,fontSize:10,cursor:"pointer"}}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── CHANGE PASSWORD ── */}
                  <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))"}}>
                    <div style={{padding:"16px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <span style={{fontSize:18}}>🔑</span>
                        <div>
                          <p style={{...sf,fontSize:7,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:2}}>Change Password</p>
                          <p style={{...mono,fontSize:11,color:"#52525b"}}>{pwdOk?"✓ Password updated successfully":"Update your account password"}</p>
                        </div>
                      </div>
                      <button onClick={()=>{setShowPwd(s=>!s);setPwdErr("");setPwdOk(false);setPwdForm({current:"",next:"",confirm:""}); }}
                        style={{padding:"7px 14px",...sf,fontSize:6,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",
                          background:showPwd?"rgba(245,158,11,0.15)":"transparent",
                          border:`1px solid ${showPwd?"rgba(245,158,11,0.5)":"rgba(255,255,255,0.12)"}`,
                          color:showPwd?"#f59e0b":"#a1a1aa",cursor:"pointer",transition:"all 0.2s"}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.style.color="#f59e0b";}}
                        onMouseLeave={e=>{if(!showPwd){e.currentTarget.style.borderColor="rgba(255,255,255,0.12)";e.currentTarget.style.color="#a1a1aa";}}}>
                        {showPwd?"Close":"Change"}
                      </button>
                    </div>

                    {showPwd&&(
                      <div style={{padding:"0 18px 18px",borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:16}}>
                        {pwdErr&&<p style={{...mono,fontSize:11,color:"#f87171",marginBottom:10}}>⚠ {pwdErr}</p>}
                        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
                          {[["current","Current Password"],["next","New Password"],["confirm","Confirm New Password"]].map(([field,label])=>(
                            <div key={field}>
                              <label style={{...sf,fontSize:6,letterSpacing:"0.3em",color:"#52525b",textTransform:"uppercase",display:"block",marginBottom:6}}>{label}</label>
                              <input
                                type="password"
                                value={pwdForm[field]}
                                onChange={e=>setPwdForm(p=>({...p,[field]:e.target.value}))}
                                placeholder="••••••••"
                                style={{width:"100%",background:"#0a0a0a",border:"1px solid rgba(255,255,255,0.1)",padding:"11px 14px",color:"white",...mono,fontSize:14,outline:"none",transition:"border-color 0.2s"}}
                                onFocus={e=>e.target.style.borderColor="rgba(245,158,11,0.4)"}
                                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}
                              />
                            </div>
                          ))}
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={async()=>{
                            setPwdErr("");
                            if(!pwdForm.current||!pwdForm.next||!pwdForm.confirm){setPwdErr("All fields required");return;}
                            if(pwdForm.next!==pwdForm.confirm){setPwdErr("New passwords don't match");return;}
                            if(pwdForm.next.length<8){setPwdErr("Password must be at least 8 characters");return;}
                            setPwdBusy(true);
                            try{
                              await API.post("change-password/",{
                                old_password: pwdForm.current,
                                new_password: pwdForm.next,
                              });
                              setPwdOk(true);
                              setShowPwd(false);
                              setPwdForm({current:"",next:"",confirm:""});
                              showToast("🔑 Password updated!");
                            }catch(e){
                              setPwdErr(e.response?.data?.error||e.response?.data?.detail||"Incorrect current password");
                            }finally{setPwdBusy(false);}
                          }} disabled={pwdBusy}
                            style={{padding:"10px 22px",background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.4)",color:"#f59e0b",...sf,fontSize:7,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",cursor:pwdBusy?"not-allowed":"pointer",transition:"all 0.2s",
                              clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))"}}>
                            {pwdBusy?"Saving...":"Update Password →"}
                          </button>
                          <button onClick={()=>{setShowPwd(false);setPwdErr("");}}
                            style={{padding:"10px 14px",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",color:"#71717a",...mono,fontSize:10,cursor:"pointer"}}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── PUSH NOTIFICATIONS ── */}
                  {"Notification" in window||true ? (
                    <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",padding:"16px 18px",
                      clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                          <span style={{fontSize:18}}>🔔</span>
                          <div>
                            <p style={{...sf,fontSize:7,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:2}}>Push Notifications</p>
                            <p style={{...mono,fontSize:11,color:pushEnabled?"#4ade80":"#52525b"}}>
                              {pushEnabled?"✓ Enabled — you'll get booking alerts":"Get notified about bookings & reminders"}
                            </p>
                          </div>
                        </div>
                        <button onClick={async()=>{
                          if(!("serviceWorker" in navigator)||!("PushManager" in window)){
                            showToast("Push notifications not supported on this browser","error");return;
                          }
                          setPushBusy(true);
                          try{
                            const reg = await navigator.serviceWorker.ready;
                            if(pushEnabled){
                              // Unsubscribe
                              const sub = await reg.pushManager.getSubscription();
                              if(sub) await sub.unsubscribe();
                              setPushEnabled(false);
                              showToast("🔕 Push notifications disabled");
                            } else {
                              // Subscribe
                              const perm = await Notification.requestPermission();
                              if(perm!=="granted"){showToast("Permission denied — enable in browser settings","error");return;}
                              const keyResp = await API.get("push/vapid-key/");
                              const vapidKey = keyResp.data.public_key;
                              const sub = await reg.pushManager.subscribe({
                                userVisibleOnly: true,
                                applicationServerKey: vapidKey,
                              });
                              await API.post("push/subscribe/",{
                                endpoint:  sub.endpoint,
                                p256dh:    btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")))),
                                auth:      btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")))),
                              });
                              setPushEnabled(true);
                              showToast("🔔 Push notifications enabled!");
                            }
                          }catch(e){showToast(e.message||"Could not update push settings","error");}
                          finally{setPushBusy(false);}
                        }} disabled={pushBusy}
                          style={{padding:"7px 14px",...sf,fontSize:6,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",
                            background:pushEnabled?"rgba(34,197,94,0.12)":"transparent",
                            border:`1px solid ${pushEnabled?"rgba(34,197,94,0.4)":"rgba(255,255,255,0.12)"}`,
                            color:pushEnabled?"#4ade80":"#a1a1aa",cursor:pushBusy?"not-allowed":"pointer",transition:"all 0.2s"}}
                          onMouseEnter={e=>{if(!pushBusy){e.currentTarget.style.borderColor=pushEnabled?"rgba(34,197,94,0.6)":"#f59e0b";e.currentTarget.style.color=pushEnabled?"#4ade80":"#f59e0b";}}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor=pushEnabled?"rgba(34,197,94,0.4)":"rgba(255,255,255,0.12)";e.currentTarget.style.color=pushEnabled?"#4ade80":"#a1a1aa";}}>
                          {pushBusy?"...":(pushEnabled?"Disable":"Enable")}
                        </button>
                      </div>
                    </div>
                  ) : null}

                </div>
              </div>

              {/* QUICK ACTIONS */}
              <div className="dc" style={{marginTop:isMobile?32:48,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
                <button onClick={()=>router.push("/book")}
                  style={{padding:"18px 24px",background:"#f59e0b",color:"black",...sf,fontSize:8,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",border:"none",cursor:"pointer",transition:"background 0.2s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="white"}
                  onMouseLeave={e=>e.currentTarget.style.background="#f59e0b"}>
                  Book New Appointment →
                </button>
                <button onClick={()=>router.push("/")}
                  style={{padding:"18px 24px",background:"transparent",color:"#a1a1aa",...sf,fontSize:8,letterSpacing:"0.2em",textTransform:"uppercase",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.color="white";e.currentTarget.style.borderColor="rgba(255,255,255,0.2)";}}
                  onMouseLeave={e=>{e.currentTarget.style.color="#a1a1aa";e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";}}>
                  Return to Home
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div style={{minHeight:"100vh",background:"#040404",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
          <p style={{fontFamily:"'Syncopate',sans-serif",fontSize:18,fontWeight:900,letterSpacing:"-0.06em"}}>HEADZ<span style={{color:"#f59e0b",fontStyle:"italic"}}>UP</span></p>
          <div style={{width:18,height:18,border:"1.5px solid rgba(245,158,11,0.2)",borderTopColor:"#f59e0b",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}} body{background:#040404;margin:0}`}</style>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </AuthGuard>
  );
}
