"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import API from "@/lib/api";
import AuthGuard from "@/lib/AuthGuard";
import useBreakpoint from "@/lib/useBreakpoint";

const sf   = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

const STATUS = {
  confirmed: { label: "Confirmed", color: "#4ade80",  bg: "rgba(74,222,128,0.08)",   border: "rgba(74,222,128,0.2)"   },
  completed: { label: "Completed", color: "#a1a1aa",  bg: "rgba(161,161,170,0.06)",  border: "rgba(161,161,170,0.12)" },
  no_show:   { label: "No Show",   color: "#f87171",  bg: "rgba(248,113,113,0.08)",  border: "rgba(248,113,113,0.2)"  },
  cancelled: { label: "Cancelled", color: "#52525b",  bg: "rgba(82,82,91,0.06)",     border: "rgba(82,82,91,0.12)"    },
};

function fmtDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric", year:"numeric" });
}
function fmtTime(t) {
  if (!t) return "";
  const [h,m] = t.split(":");
  const hr = parseInt(h);
  return `${hr%12||12}:${m} ${hr>=12?"PM":"AM"}`;
}

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
  const [time,         setTime]         = useState("");

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  // Live clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true}));
    tick(); const t = setInterval(tick,1000); return ()=>clearInterval(t);
  }, []);

  // Params
  useEffect(() => {
    if (searchParams.get("booked")==="true")   { showToast("🎉 Booking confirmed! See you soon."); window.history.replaceState({},"","/dashboard"); }
    if (searchParams.get("canceled")==="true") { showToast("Payment cancelled.","error");          window.history.replaceState({},"","/dashboard"); }
  }, [searchParams]);

  // Load
  useEffect(() => {
    const load = async () => {
      try {
        const [d, a] = await Promise.all([API.get("dashboard/"), API.get("appointments/")]);
        setUser(d.data);
        const appts = Array.isArray(a.data) ? a.data : a.data.results || [];
        setAppointments(appts.sort((x,y) => new Date(y.date)-new Date(x.date)));
      } catch { showToast("Could not load data.","error"); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleLogout = () => { localStorage.removeItem("access"); localStorage.removeItem("refresh"); router.push("/login"); };

  const handleCancel = async (appt) => {
    if (!confirm(`Cancel ${appt.service_name||"appointment"} on ${fmtDate(appt.date)}?`)) return;
    setCancelling(appt.id);
    try { await API.delete(`appointments/${appt.id}/`); setAppointments(p=>p.filter(a=>a.id!==appt.id)); showToast("Cancelled."); }
    catch { showToast("Could not cancel.","error"); }
    finally { setCancelling(null); }
  };

  const now      = new Date(); now.setHours(0,0,0,0);
  const upcoming = appointments.filter(a => new Date(a.date+"T00:00:00")>=now && a.status!=="cancelled");
  const past     = appointments.filter(a => new Date(a.date+"T00:00:00")<now  || a.status==="cancelled");
  const shown    = activeTab==="upcoming" ? upcoming : past;
  const nextAppt = upcoming[0] || null;
  const completed = appointments.filter(a=>a.status==="completed").length;

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        html,body{background:#040404;color:white;font-family:'DM Mono',monospace;overflow-x:hidden;-webkit-text-size-adjust:100%;}
        @keyframes spin    {to{transform:rotate(360deg)}}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes toastIn {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes scandown{from{top:-1px}to{top:100%}}
        @keyframes glow    {0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)}50%{box-shadow:0 0 0 8px rgba(34,197,94,0)}}
        .dc{animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both;}
        .dc:nth-child(1){animation-delay:0.05s}.dc:nth-child(2){animation-delay:0.12s}
        .dc:nth-child(3){animation-delay:0.18s}.dc:nth-child(4){animation-delay:0.24s}
        .dc:nth-child(5){animation-delay:0.3s} .dc:nth-child(6){animation-delay:0.36s}
        .appt-row{transition:border-color 0.2s,background 0.2s;}
        .appt-row:hover{border-color:rgba(245,158,11,0.3)!important;background:rgba(245,158,11,0.03)!important;}
      `}</style>

      {/* Grid */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",backgroundImage:"linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)",backgroundSize:"72px 72px"}}/>
      {/* Grain */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",opacity:0.035,backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")"}}/>
      {/* Glows */}
      <div style={{position:"fixed",top:"-10%",right:"-5%",width:600,height:600,background:"radial-gradient(circle,rgba(245,158,11,0.055) 0%,transparent 65%)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:"10%",left:"-8%",width:400,height:400,background:"radial-gradient(circle,rgba(245,158,11,0.03) 0%,transparent 60%)",pointerEvents:"none",zIndex:0}}/>
      {/* Scanline */}
      <div style={{position:"fixed",inset:0,zIndex:1,pointerEvents:"none",overflow:"hidden"}}>
        <div style={{position:"absolute",left:0,right:0,height:1,background:"linear-gradient(to right,transparent,rgba(245,158,11,0.2),transparent)",animation:"scandown 10s linear infinite"}}/>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",bottom:isMobile?20:32,left:"50%",transform:"translateX(-50%)",zIndex:9999,padding:"12px 20px",background:toast.type==="success"?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.1)",border:`1px solid ${toast.type==="success"?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.3)"}`,backdropFilter:"blur(20px)",display:"flex",alignItems:"center",gap:10,animation:"toastIn 0.3s ease",whiteSpace:"nowrap"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:toast.type==="success"?"#4ade80":"#f87171",flexShrink:0}}/>
          <span style={{...sf,fontSize:7,letterSpacing:"0.2em",textTransform:"uppercase",color:toast.type==="success"?"#4ade80":"#f87171"}}>{toast.msg}</span>
        </div>
      )}

      <div style={{position:"relative",zIndex:10,minHeight:"100vh",minHeight:"100dvh"}}>

        {/* ── NAV ── */}
        <nav style={{position:"sticky",top:0,zIndex:100,background:"rgba(4,4,4,0.95)",backdropFilter:"blur(24px)",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{maxWidth:1200,margin:"0 auto",padding:isMobile?"0 16px":"0 40px",height:60,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <a href="/" style={{...sf,fontWeight:700,fontSize:17,letterSpacing:"-0.06em",textDecoration:"none",color:"white"}}>
              HEADZ<span style={{color:"#f59e0b",fontStyle:"italic"}}>UP</span>
            </a>
            {/* Live clock — desktop */}
            {!isMobile && <span style={{...mono,fontSize:11,color:"#27272a",letterSpacing:"0.3em"}}>{time}</span>}
            <div style={{display:"flex",alignItems:"center",gap:isMobile?8:12}}>
              {user && !isMobile && (
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:28,height:28,background:"#f59e0b",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{...sf,fontSize:10,fontWeight:900,color:"black"}}>{(user.user||"?").charAt(0).toUpperCase()}</span>
                  </div>
                  <span style={{...mono,fontSize:11,color:"#52525b"}}>{user.user}</span>
                </div>
              )}
              <button onClick={()=>router.push("/book")}
                style={{padding:isMobile?"8px 14px":"10px 20px",background:"#f59e0b",color:"black",...sf,fontSize:7,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",border:"none",cursor:"pointer",transition:"background 0.2s",whiteSpace:"nowrap"}}
                onMouseEnter={e=>e.currentTarget.style.background="white"}
                onMouseLeave={e=>e.currentTarget.style.background="#f59e0b"}>
                + Book
              </button>
              <button onClick={handleLogout}
                style={{padding:isMobile?"8px 10px":"10px 16px",background:"transparent",color:"#52525b",...sf,fontSize:7,letterSpacing:"0.15em",textTransform:"uppercase",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",transition:"all 0.2s",whiteSpace:"nowrap"}}
                onMouseEnter={e=>{e.currentTarget.style.color="white";e.currentTarget.style.borderColor="rgba(255,255,255,0.2)";}}
                onMouseLeave={e=>{e.currentTarget.style.color="#52525b";e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";}}>
                {isMobile?"Out":"Sign Out"}
              </button>
            </div>
          </div>
        </nav>

        {/* ── CONTENT ── */}
        <div style={{maxWidth:1200,margin:"0 auto",padding:isMobile?"28px 16px max(48px,env(safe-area-inset-bottom))":"52px 40px 80px"}}>

          {loading ? (
            <div style={{paddingTop:100,display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
              <p style={{...sf,fontSize:20,fontWeight:900,textTransform:"uppercase",letterSpacing:"-0.06em"}}>HEADZ<span style={{color:"#f59e0b",fontStyle:"italic"}}>UP</span></p>
              <div style={{width:1,height:32,background:"linear-gradient(to bottom,#f59e0b,transparent)"}}/>
              <div style={{width:18,height:18,border:"1.5px solid rgba(245,158,11,0.2)",borderTopColor:"#f59e0b",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
            </div>
          ) : (
            <>
              {/* ── HERO GREETING ── */}
              <div className="dc" style={{marginBottom:isMobile?32:48,paddingBottom:isMobile?32:48,borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
                <p style={{...mono,fontSize:9,color:"#f59e0b",letterSpacing:"0.5em",textTransform:"uppercase",marginBottom:12}}>Client Dashboard</p>
                <h1 style={{...sf,fontSize:"clamp(2rem,6vw,4rem)",fontWeight:900,textTransform:"uppercase",lineHeight:0.88,letterSpacing:"-0.04em",marginBottom:16}}>
                  Hey,<br/>
                  <span style={{color:"#f59e0b",fontStyle:"italic"}}>{user?.user||"Client"}_</span>
                </h1>
                <p style={{...mono,fontSize:13,color:"#52525b",maxWidth:400,lineHeight:1.7}}>
                  {upcoming.length > 0
                    ? `You have ${upcoming.length} upcoming appointment${upcoming.length!==1?"s":""}. We'll see you soon.`
                    : "No upcoming appointments. Ready to book your next cut?"
                  }
                </p>
              </div>

              {/* ── STATS ROW ── */}
              <div className="dc" style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:8,marginBottom:isMobile?32:48}}>
                {[
                  {label:"Total Visits",   value:appointments.filter(a=>a.status!=="cancelled").length, accent:false},
                  {label:"Upcoming",       value:upcoming.length,  accent:true},
                  {label:"Completed",      value:completed,        accent:false},
                  {label:"Member Since",   value:appointments.length>0?new Date(appointments[appointments.length-1].date+"T00:00:00").getFullYear():new Date().getFullYear(), accent:false},
                ].map(({label,value,accent})=>(
                  <div key={label} style={{padding:isMobile?"16px 14px":"24px 20px",background:accent?"rgba(245,158,11,0.07)":"rgba(255,255,255,0.02)",border:`1px solid ${accent?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.07)"}`,position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,right:0,width:40,height:40,background:accent?"linear-gradient(225deg,rgba(245,158,11,0.2),transparent)":"linear-gradient(225deg,rgba(255,255,255,0.03),transparent)"}}/>
                    <p style={{...sf,fontSize:5,letterSpacing:"0.3em",color:accent?"#f59e0b":"#52525b",textTransform:"uppercase",marginBottom:10}}>{label}</p>
                    <p style={{...sf,fontSize:isMobile?22:30,fontWeight:900,color:accent?"#f59e0b":"white",lineHeight:1}}>{value}</p>
                  </div>
                ))}
              </div>

              {/* ── NEXT APPOINTMENT BANNER ── */}
              {nextAppt && (
                <div className="dc" style={{marginBottom:isMobile?32:48,padding:isMobile?"20px 18px":"28px 32px",background:"linear-gradient(135deg,rgba(245,158,11,0.07),rgba(245,158,11,0.02))",border:"1px solid rgba(245,158,11,0.25)",display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"center",gap:16}}>
                  <div>
                    <p style={{...mono,fontSize:8,color:"#f59e0b",letterSpacing:"0.5em",textTransform:"uppercase",marginBottom:8}}>Next Appointment</p>
                    <h2 style={{...sf,fontSize:"clamp(1rem,2.5vw,1.5rem)",fontWeight:900,textTransform:"uppercase",marginBottom:8,letterSpacing:"-0.03em"}}>
                      {nextAppt.service_name||"Appointment"}
                    </h2>
                    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                      <span style={{...mono,fontSize:12,color:"#a1a1aa"}}>{fmtDate(nextAppt.date)}</span>
                      {nextAppt.time && <span style={{...mono,fontSize:12,color:"#f59e0b"}}>{fmtTime(nextAppt.time)}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,background:"#22c55e",borderRadius:"50%",animation:"glow 2s infinite"}}/>
                    <span style={{...sf,fontSize:7,color:"#4ade80",textTransform:"uppercase",letterSpacing:"0.2em"}}>Confirmed</span>
                  </div>
                </div>
              )}

              {/* ── APPOINTMENTS ── */}
              <div className="dc">
                {/* Section header */}
                <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:20,flexWrap:"wrap",gap:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:14,flex:1,minWidth:200}}>
                    <div style={{width:32,height:1,background:"rgba(245,158,11,0.5)"}}/>
                    <h2 style={{...sf,fontSize:"clamp(0.75rem,1.5vw,0.9rem)",fontWeight:900,textTransform:"uppercase",letterSpacing:"-0.02em"}}>
                      Your_<span style={{color:"#f59e0b",fontStyle:"italic"}}>Appointments</span>
                    </h2>
                  </div>
                  {/* Tab toggle */}
                  <div style={{display:"flex",border:"1px solid rgba(255,255,255,0.08)"}}>
                    {["upcoming","past"].map(tab=>(
                      <button key={tab} onClick={()=>setActiveTab(tab)}
                        style={{padding:isMobile?"8px 12px":"9px 18px",...sf,fontSize:6,letterSpacing:"0.15em",textTransform:"uppercase",background:activeTab===tab?"#f59e0b":"transparent",color:activeTab===tab?"black":"#52525b",border:"none",cursor:"pointer",transition:"all 0.2s",whiteSpace:"nowrap"}}>
                        {tab} ({tab==="upcoming"?upcoming.length:past.length})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Appointment list */}
                {shown.length===0 ? (
                  <div style={{padding:isMobile?"48px 16px":"80px 24px",textAlign:"center",border:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.01)",position:"relative",overflow:"hidden"}}>
                    <p style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",...sf,fontSize:"clamp(4rem,12vw,8rem)",fontWeight:900,color:"rgba(255,255,255,0.025)",textTransform:"uppercase",letterSpacing:"-0.06em",userSelect:"none"}}>
                      {activeTab==="upcoming"?"FRESH":"DONE"}
                    </p>
                    <div style={{position:"relative",zIndex:1}}>
                      <p style={{...sf,fontSize:9,color:"rgba(255,255,255,0.08)",textTransform:"uppercase",marginBottom:12}}>
                        {activeTab==="upcoming"?"No upcoming cuts":"No past appointments"}
                      </p>
                      {activeTab==="upcoming" && (
                        <button onClick={()=>router.push("/book")}
                          style={{padding:"14px 28px",background:"#f59e0b",color:"black",...sf,fontSize:8,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",border:"none",cursor:"pointer",transition:"background 0.2s"}}
                          onMouseEnter={e=>e.currentTarget.style.background="white"}
                          onMouseLeave={e=>e.currentTarget.style.background="#f59e0b"}>
                          Book Now →
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {shown.map(appt=>{
                      const s = STATUS[appt.status]||STATUS.confirmed;
                      return (
                        <div key={appt.id} className="appt-row"
                          style={{display:"flex",alignItems:"center",gap:isMobile?10:16,padding:isMobile?"14px 12px":"16px 20px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)"}}>
                          {/* Left accent */}
                          <div style={{width:2,height:40,background:s.color,flexShrink:0,opacity:0.8}}/>
                          {/* Date block */}
                          <div style={{width:isMobile?44:52,flexShrink:0,textAlign:"center"}}>
                            <p style={{...sf,fontSize:isMobile?18:24,fontWeight:900,color:appt.status==="confirmed"?"#f59e0b":"#52525b",lineHeight:1}}>
                              {new Date(appt.date+"T00:00:00").getDate()}
                            </p>
                            <p style={{...sf,fontSize:6,color:"#3f3f46",textTransform:"uppercase",letterSpacing:"0.1em"}}>
                              {new Date(appt.date+"T00:00:00").toLocaleDateString("en-US",{month:"short"})}
                            </p>
                          </div>
                          <div style={{width:1,height:32,background:"rgba(255,255,255,0.07)",flexShrink:0}}/>
                          {/* Info */}
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{...sf,fontSize:isMobile?8:10,fontWeight:700,textTransform:"uppercase",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {appt.service_name||"Appointment"}
                            </p>
                            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                              <span style={{...mono,fontSize:10,color:"#52525b"}}>{fmtDate(appt.date)}</span>
                              {appt.time && <span style={{...mono,fontSize:10,color:"#f59e0b"}}>{fmtTime(appt.time)}</span>}
                            </div>
                          </div>
                          {/* Status */}
                          <span style={{...sf,fontSize:5,letterSpacing:"0.1em",textTransform:"uppercase",padding:"4px 10px",background:s.bg,color:s.color,border:`1px solid ${s.border}`,flexShrink:0}}>
                            {s.label}
                          </span>
                          {/* Cancel */}
                          {appt.status==="confirmed" && activeTab==="upcoming" && (
                            <button onClick={()=>handleCancel(appt)} disabled={cancelling===appt.id}
                              style={{width:isMobile?34:28,height:isMobile?34:28,background:"transparent",border:"1px solid rgba(248,113,113,0.2)",color:"#52525b",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,transition:"all 0.2s",flexShrink:0}}
                              onMouseEnter={e=>{e.currentTarget.style.borderColor="#f87171";e.currentTarget.style.color="#f87171";e.currentTarget.style.background="rgba(248,113,113,0.08)";}}
                              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(248,113,113,0.2)";e.currentTarget.style.color="#52525b";e.currentTarget.style.background="transparent";}}>
                              {cancelling===appt.id?"·":"✕"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── QUICK ACTIONS ── */}
              <div className="dc" style={{marginTop:isMobile?32:48,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
                <button onClick={()=>router.push("/book")}
                  style={{padding:"18px 24px",background:"#f59e0b",color:"black",...sf,fontSize:8,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",border:"none",cursor:"pointer",transition:"background 0.2s",textAlign:"center"}}
                  onMouseEnter={e=>e.currentTarget.style.background="white"}
                  onMouseLeave={e=>e.currentTarget.style.background="#f59e0b"}>
                  Book New Appointment →
                </button>
                <button onClick={()=>router.push("/")}
                  style={{padding:"18px 24px",background:"transparent",color:"#52525b",...sf,fontSize:8,letterSpacing:"0.2em",textTransform:"uppercase",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.color="white";e.currentTarget.style.borderColor="rgba(255,255,255,0.2)";}}
                  onMouseLeave={e=>{e.currentTarget.style.color="#52525b";e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";}}>
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