"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";
import { BookingSkeleton } from "@/components/Skeleton";


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

function to24Hour(t) {
  if (!t) return "00:00:00";
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
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}
function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US",
    { weekday:"long", month:"long", day:"numeric" });
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function Steps({ current, steps }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:32 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display:"flex", alignItems:"center", flex:1 }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
            <div style={{ width:28, height:28, borderRadius:"50%",
              background: i < current ? C.amber : i === current ? C.amberDim : C.surface,
              border:`1px solid ${i <= current ? C.amber : C.border}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              marginBottom:4, transition:"all 0.3s" }}>
              {i < current ? (
                <span style={{ color:"black", fontSize:12, fontWeight:700 }}>✓</span>
              ) : (
                <span style={{ ...MONO, fontSize:9, color: i === current ? C.amber : C.muted }}>
                  {i + 1}
                </span>
              )}
            </div>
            <span style={{ ...MONO, fontSize:8, letterSpacing:"0.2em", textTransform:"uppercase",
              color: i === current ? C.amber : i < current ? C.sub : C.muted }}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex:1, height:1, background: i < current ? C.amber : C.border,
              margin:"0 4px", marginBottom:16, transition:"background 0.3s" }}/>
          )}
        </div>
      ))}
    </div>
  );
}

export default function BookPage() {
  const router = useRouter();

  const [step,         setStep]         = useState(1);
  const [services,     setServices]     = useState([]);
  const [barbers,      setBarbers]      = useState([]);
  const [allDays,      setAllDays]      = useState([]);
  const [timeOffDates, setTimeOffDates] = useState([]);
  const [slots,        setSlots]        = useState([]);
  const [bookedSlots,  setBookedSlots]  = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [viewYear,     setViewYear]     = useState(new Date().getFullYear());
  const [viewMonth,    setViewMonth]    = useState(new Date().getMonth());
  const [strikeInfo,   setStrikeInfo]   = useState(null);

  const [selectedService,  setSelectedService]  = useState(null);
  const [selectedBarber,   setSelectedBarber]   = useState(null);
  const [selectedDate,     setSelectedDate]     = useState("");
  const [selectedTime,     setSelectedTime]     = useState("");
  const [clientNotes,      setClientNotes]      = useState("");
  const [paymentMethod,    setPaymentMethod]    = useState("shop");
  const [termsAccepted,    setTermsAccepted]    = useState(false);

  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");
  const [initLoading,  setInitLoading]  = useState(true);

  // Load initial data
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) { router.replace("/login"); return; }
    Promise.all([
      API.get("services/"),
      API.get("barbers/"),
      API.get("client/strike-status/").catch(() => null),
    ]).then(([svc, bar, strike]) => {
      setServices(svc.data || []);
      setBarbers(bar.data || []);
      if (strike) setStrikeInfo(strike.data);
    }).catch(() => {}).finally(() => setInitLoading(false));
  }, [router]);

  // Load barber working days when barber selected
  useEffect(() => {
    if (!selectedBarber) return;
    API.get(`barbers/${selectedBarber.id}/working-days/`).then(r => {
      setAllDays(r.data.all_days || []);
      setTimeOffDates(r.data.time_off_dates || []);
    }).catch(() => {});
    // Also get service prices for this barber
    if (selectedService) {
      API.get(`services/?barber=${selectedBarber.id}`).then(r => {
        const updated = r.data.find(s => s.id === selectedService.id);
        if (updated) setSelectedService(updated);
      }).catch(() => {});
    }
  }, [selectedBarber]);

  // Load slots when date selected
  useEffect(() => {
    if (!selectedDate || !selectedBarber || !selectedService) return;
    setSlotsLoading(true);
    setSlots([]); setBookedSlots([]); setSelectedTime("");
    API.get(`available-slots/?barber=${selectedBarber.id}&date=${selectedDate}&service=${selectedService.id}`)
      .then(r => {
        setSlots(r.data.available_slots || []);
        setBookedSlots(r.data.booked_slots || []);
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, selectedBarber, selectedService]);

  // Calendar helpers
  const isDisabled = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    // Past dates
    const today = new Date(); today.setHours(0,0,0,0);
    if (d < today) return true;
    // Sunday always closed
    if (d.getDay() === 0) return true;
    // Time off
    if (timeOffDates.includes(dateStr)) return true;
    // Must have a selected barber to check their schedule
    if (!selectedBarber) return true;
    // Check barber working days (Mon=0...Sat=5)
    const dow = (d.getDay() + 6) % 7;
    const dayInfo = allDays.find(x => x.day_of_week === dow);
    // If no availability record OR barber is not working that day → disabled
    if (!dayInfo || !dayInfo.is_working) return true;
    return false;
  };

  const renderCalendar = () => {
    const first  = new Date(viewYear, viewMonth, 1);
    const days   = new Date(viewYear, viewMonth + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const cells  = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);

    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const WDAYS  = ["M","T","W","T","F","S","S"];

    return (
      <div>
        {/* Nav */}
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:12 }}>
          <button onClick={() => {
            if (viewMonth === 0) { setViewMonth(11); setViewYear(y=>y-1); }
            else setViewMonth(m=>m-1);
          }} style={{ background:"none", border:`1px solid ${C.border}`,
            color:C.muted, width:32, height:32, cursor:"pointer", fontSize:14 }}>‹</button>
          <p style={{ ...SF, fontSize:9, fontWeight:700, textTransform:"uppercase",
            letterSpacing:"0.15em" }}>{MONTHS[viewMonth]} {viewYear}</p>
          <button onClick={() => {
            if (viewMonth === 11) { setViewMonth(0); setViewYear(y=>y+1); }
            else setViewMonth(m=>m+1);
          }} style={{ background:"none", border:`1px solid ${C.border}`,
            color:C.muted, width:32, height:32, cursor:"pointer", fontSize:14 }}>›</button>
        </div>

        {/* Day headers */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)",
          gap:4, marginBottom:4 }}>
          {WDAYS.map((d,i) => (
            <div key={i} style={{ textAlign:"center", ...MONO, fontSize:8,
              color:C.muted, letterSpacing:"0.1em", padding:"4px 0" }}>{d}</div>
          ))}
        </div>

        {/* Days */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i}/>;
            const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const disabled = !selectedBarber || isDisabled(dateStr);
            const selected = selectedDate === dateStr;
            const isToday  = dateStr === new Date().toISOString().split("T")[0];
            return (
              <button key={i} disabled={disabled}
                onClick={() => { if (!disabled) { setSelectedDate(dateStr); setSelectedTime(""); } }}
                style={{ padding:"8px 0", textAlign:"center",
                  background: selected ? C.amber : isToday ? C.amberDim : "transparent",
                  border:`1px solid ${selected ? C.amber : isToday ? C.amberBorder : C.border}`,
                  color: selected ? "black" : disabled ? C.muted : C.text,
                  ...MONO, fontSize:11, cursor:disabled ? "not-allowed" : "pointer",
                  opacity:disabled ? 0.25 : 1, transition:"all 0.15s",
                  fontWeight: selected ? 700 : 400,
                  textDecoration: disabled && !selected ? "line-through" : "none" }}>
                {d}
              </button>
            );
          })}
        </div>
        {selectedBarber && allDays.length > 0 && (
          <div style={{ marginTop:10, padding:"8px 0",
            borderTop:`1px solid ${C.border}`, display:"flex",
            gap:12, flexWrap:"wrap" }}>
            {["Mon","Tue","Wed","Thu","Fri","Sat"].map((day,i) => {
              const di = allDays.find(x => x.day_of_week === i);
              const working = di && di.is_working;
              return (
                <div key={day} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%",
                    background: working ? C.amber : C.muted, opacity: working ? 1 : 0.4 }}/>
                  <span style={{ ...MONO, fontSize:9,
                    color: working ? C.text : C.muted }}>{day}</span>
                  {working && di.start_time && (
                    <span style={{ ...MONO, fontSize:8, color:C.muted }}>
                      {di.start_time.slice(0,5)}–{di.end_time.slice(0,5)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Submit
  const handleBookInShop = async () => {
    setSubmitting(true); setError("");
    try {
      await API.post("appointments/", {
        service:        selectedService.id,
        barber:         selectedBarber.id,
        date:           selectedDate,
        time:           to24Hour(selectedTime),
        payment_method: "shop",
        client_notes:   clientNotes,
      });
      router.replace(`/booking-confirmed?service=${encodeURIComponent(selectedService.name)}&barber=${encodeURIComponent(selectedBarber.name)}&date=${selectedDate}&time=${selectedTime}&payment=shop`);
    } catch(e) {
      setError(e?.response?.data?.non_field_errors?.[0] || e?.response?.data?.detail || "Could not book. Please try again.");
    } finally { setSubmitting(false); }
  };

  const handleDeposit = async () => {
    if (!termsAccepted) {
      await API.post("client/accept-terms/").catch(() => {});
    }
    setSubmitting(true); setError("");
    try {
      const r = await API.post("deposit/checkout/", {
        service:      selectedService.id,
        barber:       selectedBarber.id,
        date:         selectedDate,
        time:         to24Hour(selectedTime),
        client_notes: clientNotes,
      });
      if (r.data.url) window.location.href = r.data.url;
      else setError(r.data.error || "Could not start checkout");
    } catch(e) {
      setError(e?.response?.data?.error || "Could not start checkout");
    } finally { setSubmitting(false); }
  };

  const STEPS = ["Service", "Barber", "Date & Time", "Confirm"];

  if (initLoading) return <BookingSkeleton/>;

  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${C.bg};color:${C.text};}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(245,158,11,0.3);}
        input,textarea,select,button{font-family:inherit;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        * { -webkit-tap-highlight-color: transparent; }
        button { touch-action: manipulation; }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom:`1px solid ${C.border}`, padding:"0 20px",
        height:56, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <img src="/logo1.jpg" alt="HEADZ UP" style={{ height:32, objectFit:"contain" }}/>
          <div style={{ width:1, height:20, background:C.border }}/>
          <p style={{ ...MONO, fontSize:10, color:C.muted, letterSpacing:"0.2em" }}>BOOK A CUT</p>
        </div>
        <a href="/dashboard" style={{ ...MONO, fontSize:10, color:C.muted,
          textDecoration:"none" }}>← My Dashboard</a>
      </header>

      <div style={{ maxWidth:640, margin:"0 auto", padding:"32px 20px" }}>

        <Steps current={step - 1} steps={STEPS}/>

        {/* ── STEP 1: Service ── */}
        {step === 1 && (
          <div style={{ animation:"fadeIn 0.25s ease" }}>
            <h2 style={{ ...SF, fontSize:14, fontWeight:700, textTransform:"uppercase",
              letterSpacing:"-0.02em", marginBottom:4 }}>Choose Your Service</h2>
            <p style={{ ...MONO, fontSize:11, color:C.muted, marginBottom:20 }}>
              What are you getting done today?
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {services.map(svc => {
                const sel = selectedService?.id === svc.id;
                return (
                  <button key={svc.id}
                    onClick={() => { setSelectedService(svc); setStep(2); }}
                    style={{ padding:"16px 18px", background: sel ? C.amberDim : C.surface,
                      border:`1px solid ${sel ? C.amber : C.border}`,
                      cursor:"pointer", textAlign:"left", transition:"all 0.2s",
                      display:"flex", alignItems:"center", justifyContent:"space-between" }}
                    onMouseEnter={e => { if(!sel){ e.currentTarget.style.borderColor = C.amberBorder; } }}
                    onMouseLeave={e => { if(!sel){ e.currentTarget.style.borderColor = C.border; } }}>
                    <div>
                      <p style={{ ...SF, fontSize:9, fontWeight:700, textTransform:"uppercase",
                        letterSpacing:"0.05em", color: sel ? C.amber : C.text, marginBottom:4 }}>
                        {svc.name}
                      </p>
                      <p style={{ ...MONO, fontSize:11, color:C.muted }}>
                        {svc.duration_minutes} min
                      </p>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <p style={{ ...SF, fontSize:14, fontWeight:700,
                        color: sel ? C.amber : C.text }}>${svc.price}</p>
                      {sel && <p style={{ ...MONO, fontSize:9, color:C.amber }}>✓ Selected</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 2: Barber ── */}
        {step === 2 && (
          <div style={{ animation:"fadeIn 0.25s ease" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <button onClick={() => setStep(1)}
                style={{ background:"none", border:"none", color:C.muted,
                  cursor:"pointer", ...MONO, fontSize:12 }}>←</button>
              <div>
                <h2 style={{ ...SF, fontSize:14, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:"-0.02em", marginBottom:2 }}>Choose Your Barber</h2>
                <p style={{ ...MONO, fontSize:11, color:C.muted }}>
                  {selectedService?.name} · ${selectedService?.price}
                </p>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {barbers.map(barber => {
                const sel = selectedBarber?.id === barber.id;
                return (
                  <button key={barber.id}
                    onClick={() => { setSelectedBarber(barber); setSelectedDate(""); setSelectedTime(""); setStep(3); }}
                    style={{ padding:"16px 18px", background: sel ? C.amberDim : C.surface,
                      border:`1px solid ${sel ? C.amber : C.border}`,
                      cursor:"pointer", textAlign:"left", transition:"all 0.2s",
                      display:"flex", alignItems:"center", gap:14 }}
                    onMouseEnter={e => { if(!sel){ e.currentTarget.style.borderColor = C.amberBorder; } }}
                    onMouseLeave={e => { if(!sel){ e.currentTarget.style.borderColor = C.border; } }}>
                    {/* Photo */}
                    {barber.photo_url ? (
                      <img src={barber.photo_url} alt={barber.name}
                        style={{ width:52, height:52, borderRadius:"50%", objectFit:"cover",
                          border:`2px solid ${sel ? C.amber : C.border}`, flexShrink:0 }}/>
                    ) : (
                      <div style={{ width:52, height:52, borderRadius:"50%",
                        background:C.amberDim, border:`2px solid ${sel ? C.amber : C.amberBorder}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        ...SF, fontSize:18, color:C.amber, flexShrink:0, fontWeight:700 }}>
                        {barber.name?.charAt(0)}
                      </div>
                    )}
                    <div style={{ flex:1 }}>
                      <p style={{ ...SF, fontSize:10, fontWeight:700, textTransform:"uppercase",
                        letterSpacing:"0.05em", color: sel ? C.amber : C.text, marginBottom:4 }}>
                        {barber.name}
                      </p>
                      {barber.bio && (
                        <p style={{ ...MONO, fontSize:11, color:C.muted, lineHeight:1.6 }}>
                          {barber.bio}
                        </p>
                      )}
                    </div>
                    {sel && <span style={{ color:C.amber, fontSize:18 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 3: Date & Time ── */}
        {step === 3 && (
          <div style={{ animation:"fadeIn 0.25s ease" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <button onClick={() => setStep(2)}
                style={{ background:"none", border:"none", color:C.muted,
                  cursor:"pointer", ...MONO, fontSize:12 }}>←</button>
              <div>
                <h2 style={{ ...SF, fontSize:14, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:"-0.02em", marginBottom:2 }}>Pick a Date & Time</h2>
                <p style={{ ...MONO, fontSize:11, color:C.muted }}>
                  {selectedService?.name} w/ {selectedBarber?.name}
                </p>
              </div>
            </div>

            {/* Calendar always full width */}
            <div style={{ background:C.surface, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:`1px solid ${C.border}`, borderRadius:16,
              padding:20, marginBottom:16 }}>
              {renderCalendar()}
            </div>

            {/* Time slots below calendar once date selected */}
            {selectedDate && (
              <div style={{ background:C.surface, border:`1px solid ${selectedTime ? C.amberBorder : C.border}`,
                padding:20, marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:14 }}>
                  <div>
                    <p style={{ ...SF, fontSize:9, fontWeight:700, textTransform:"uppercase",
                      letterSpacing:"0.1em", color:C.amber, marginBottom:2 }}>
                      {fmtDate(selectedDate)}
                    </p>
                    <p style={{ ...MONO, fontSize:10, color:C.muted }}>
                      {slotsLoading ? "Loading available times..." : `${slots.length} time${slots.length !== 1 ? "s" : ""} available`}
                    </p>
                  </div>
                  {selectedTime && (
                    <span style={{ ...MONO, fontSize:10, color:C.amber,
                      padding:"4px 12px", background:C.amberDim,
                      border:`1px solid ${C.amberBorder}` }}>
                      ✓ {selectedTime}
                    </span>
                  )}
                </div>

                {slotsLoading ? (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {[1,2,3,4,5,6].map(i => (
                      <div key={i} style={{ padding:"10px 18px", background:C.surfaceB,
                        border:`1px solid ${C.border}`, opacity:0.4, width:90 }}/>
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div style={{ padding:"16px 0", textAlign:"center" }}>
                    <p style={{ ...MONO, fontSize:12, color:C.muted }}>No available times on this date</p>
                    <p style={{ ...MONO, fontSize:10, color:C.muted, marginTop:4 }}>Try another date</p>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {slots.map(s => {
                      const display = fmtSlot(s);
                      const sel = selectedTime === display;
                      return (
                        <button key={s} onClick={() => setSelectedTime(display)}
                          style={{ padding:"10px 16px",
                            background: sel ? C.amber : C.surfaceB,
                            border:`1px solid ${sel ? C.amber : C.border}`,
                            color: sel ? "black" : C.text,
                            ...MONO, fontSize:12, cursor:"pointer",
                            transition:"all 0.15s", fontWeight: sel ? 700 : 400,
                            minWidth:90, textAlign:"center" }}>
                          {display}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {selectedDate && selectedTime && (
              <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
                <button onClick={() => setStep(4)}
                  style={{ padding:"12px 28px", background:C.amber, border:"none",
                    color:"black", ...SF, fontSize:8, fontWeight:700,
                    textTransform:"uppercase", letterSpacing:"0.2em", cursor:"pointer" }}>
                  Continue →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Confirm ── */}
        {step === 4 && (
          <div style={{ animation:"fadeIn 0.25s ease" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <button onClick={() => setStep(3)}
                style={{ background:"none", border:"none", color:C.muted,
                  cursor:"pointer", ...MONO, fontSize:12 }}>←</button>
              <div>
                <h2 style={{ ...SF, fontSize:14, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:"-0.02em", marginBottom:2 }}>Confirm Booking</h2>
                <p style={{ ...MONO, fontSize:11, color:C.muted }}>Review your appointment details</p>
              </div>
            </div>

            {/* Summary card */}
            <div style={{ background:C.surface, border:`1px solid ${C.amberBorder}`,
              overflow:"hidden", marginBottom:20 }}>
              <div style={{ height:3, background:`linear-gradient(to right,${C.red},${C.amber})` }}/>
              <div style={{ padding:20 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {[
                    ["Service",  selectedService?.name],
                    ["Barber",   selectedBarber?.name],
                    ["Date",     fmtDate(selectedDate)],
                    ["Time",     selectedTime],
                    ["Duration", `${selectedService?.duration_minutes} min`],
                    ["Price",    `$${selectedService?.price}`],
                  ].map(([k,v]) => (
                    <div key={k} style={{ padding:"10px 12px", background:C.surfaceB,
                      border:`1px solid ${C.border}` }}>
                      <p style={{ ...MONO, fontSize:8, color:C.muted,
                        letterSpacing:"0.25em", textTransform:"uppercase", marginBottom:4 }}>{k}</p>
                      <p style={{ ...MONO, fontSize:12, color:C.text }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom:20 }}>
              <label style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.25em",
                textTransform:"uppercase", display:"block", marginBottom:8 }}>
                Notes for your barber (optional)
              </label>
              <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)}
                placeholder="Any special requests or notes..."
                rows={2}
                style={{ width:"100%", padding:"10px 12px", background:C.surface,
                  border:`1px solid ${C.border}`, color:C.text, ...MONO,
                  fontSize:12, outline:"none", resize:"none" }}
                onFocus={e => e.target.style.borderColor = C.amberBorder}
                onBlur={e => e.target.style.borderColor = C.border}/>
            </div>

            {/* Payment method */}
            <div style={{ marginBottom:20 }}>
              <p style={{ ...MONO, fontSize:9, color:C.muted, letterSpacing:"0.25em",
                textTransform:"uppercase", marginBottom:12 }}>Payment Method</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>

                {/* Pay in Shop */}
                <button onClick={() => setPaymentMethod("shop")}
                  style={{ padding:"16px 18px",
                    background: paymentMethod === "shop" ? C.amberDim : C.surface,
                    border:`2px solid ${paymentMethod === "shop" ? C.amber : C.border}`,
                    cursor:"pointer", textAlign:"left", transition:"all 0.2s",
                    display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:44, height:44, background:C.surfaceB,
                      border:`1px solid ${C.border}`, borderRadius:8,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                      ✂️
                    </div>
                    <div>
                      <p style={{ ...SF, fontSize:9, textTransform:"uppercase",
                        color: paymentMethod === "shop" ? C.amber : C.text, marginBottom:4 }}>
                        Pay in Shop
                      </p>
                      <p style={{ ...MONO, fontSize:11, color:C.muted }}>
                        Full ${selectedService?.price} due at the chair
                      </p>
                    </div>
                  </div>
                  <div style={{ width:20, height:20, borderRadius:"50%",
                    border:`2px solid ${paymentMethod === "shop" ? C.amber : C.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {paymentMethod === "shop" && (
                      <div style={{ width:10, height:10, borderRadius:"50%", background:C.amber }}/>
                    )}
                  </div>
                </button>

                {/* Pay Deposit Online — Stripe */}
                <button onClick={() => setPaymentMethod("online")}
                  style={{ padding:"16px 18px", width:"100%", textAlign:"left",
                    background: paymentMethod === "online"
                      ? "rgba(99,91,255,0.06)"
                      : C.surface,
                    backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
                    border:`2px solid ${paymentMethod === "online" ? "#635bff" : C.border}`,
                    borderRadius:12, cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    transition:"all 0.2s" }}
                  onMouseEnter={e=>{ if(paymentMethod!=="online") e.currentTarget.style.borderColor="#635bff44"; }}
                  onMouseLeave={e=>{ if(paymentMethod!=="online") e.currentTarget.style.borderColor=C.border; }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:44, height:44, borderRadius:10,
                      background: paymentMethod==="online" ? "rgba(99,91,255,0.12)" : C.amberDim,
                      border:`1px solid ${paymentMethod==="online" ? "#635bff40" : C.amberBorder}`,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                      💳
                    </div>
                    <div>
                      <p style={{ ...SF, fontSize:9, textTransform:"uppercase",
                        color: paymentMethod==="online" ? "#a78bfa" : C.text,
                        marginBottom:4 }}>
                        Pay ${strikeInfo?.deposit_fee || "10.00"} Deposit Online
                      </p>
                      <p style={{ ...MONO, fontSize:11, color:C.muted }}>
                        Locks in your spot · rest paid at the chair · powered by Stripe
                      </p>
                    </div>
                  </div>
                  <div style={{ width:20, height:20, borderRadius:"50%", flexShrink:0,
                    border:`2px solid ${paymentMethod==="online" ? "#635bff" : C.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {paymentMethod==="online" && (
                      <div style={{ width:10, height:10, borderRadius:"50%", background:"#635bff" }}/>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Strike deposit warning */}
            {strikeInfo && strikeInfo.strike_count > 0 && (
              <div style={{ padding:"12px 14px", background:"rgba(239,68,68,0.06)",
                border:"1px solid rgba(239,68,68,0.2)", marginBottom:16 }}>
                <p style={{ ...MONO, fontSize:11, color:C.red }}>
                  ⚡ You have {strikeInfo.strike_count} strike{strikeInfo.strike_count > 1 ? "s" : ""}.
                  Please arrive on time to avoid further strikes.
                </p>
              </div>
            )}

            {error && (
              <div style={{ padding:"12px 14px", background:"rgba(239,68,68,0.06)",
                border:"1px solid rgba(239,68,68,0.2)", marginBottom:16 }}>
                <p style={{ ...MONO, fontSize:11, color:C.red }}>{error}</p>
              </div>
            )}

            <button disabled={submitting}
              onClick={() => paymentMethod === "online" ? handleDeposit() : handleBookInShop()}
              style={{ width:"100%", padding:"14px",
                background: submitting ? C.amberDim : C.amber,
                border:"none", color: submitting ? C.amber : "black",
                ...SF, fontSize:9, fontWeight:700, textTransform:"uppercase",
                letterSpacing:"0.2em", cursor:submitting ? "not-allowed" : "pointer",
                transition:"all 0.2s" }}>
              {submitting
                ? (paymentMethod==="online" ? "Redirecting to Stripe..." : "Booking...")
                : paymentMethod==="online"
                  ? `Secure Your Spot — $${strikeInfo?.deposit_fee||"10.00"} Deposit`
                  : "Book It — Pay in Shop"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
