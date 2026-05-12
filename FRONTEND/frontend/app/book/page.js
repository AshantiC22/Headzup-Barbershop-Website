"use client";

const validPhoto = (url) => { if(!url)return null; if(url.startsWith('data:'))return url; if(url.startsWith('https://'))return url; return null; };
// v3 — visual calendar, creative redesign

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { gsap } from "gsap";
import API from "@/lib/api";

// Pre-warm Railway backend on page load
if (typeof window !== "undefined") {
  fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.headzupp.com"}/api/barbers/`, {
    method: "HEAD",
    signal: AbortSignal.timeout?.(8000),
  }).catch(() => {});
}
import AuthGuard from "@/lib/AuthGuard";
import useBreakpoint from "@/lib/useBreakpoint";

// ── Helpers ───────────────────────────────────────────────────────────────────
function to24Hour(t) {
  const [time, mod] = t.split(" ");
  let [h, m] = time.split(":");
  if (h === "12") h = "00";
  if (mod === "PM") h = String(parseInt(h) + 12);
  return `${h.padStart(2, "0")}:${m}:00`;
}

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

function fmtDateLong(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

const sf = { fontFamily: "'Syncopate', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

// ── Step indicator (sidebar) ──────────────────────────────────────────────────
function StepItem({ n, label, active, done, onClick }) {
  return (
    <div
      onClick={() => done && onClick(n)}
      style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: done ? "pointer" : "default", opacity: !active && !done ? 0.3 : 1, transition: "opacity 0.3s" }}
    >
      <div style={{ width: 28, height: 28, border: `1px solid ${active ? "#f59e0b" : done ? "#f59e0b" : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", background: done ? "#f59e0b" : "transparent", flexShrink: 0, transition: "all 0.3s" }}>
        {done
          ? <span style={{ color: "black", fontSize: 12, fontWeight: 900 }}>✓</span>
          : <span style={{ ...sf, fontSize: 9, color: active ? "#f59e0b" : "#71717a" }}>0{n}</span>}
      </div>
      <span style={{ ...sf, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: active ? "white" : done ? "#f59e0b" : "#71717a" }}>{label}</span>
    </div>
  );
}

// ── Time slot grid ────────────────────────────────────────────────────────────
function BookingCalendar({ selectedDate, onSelect, workingDays = [], timeOffDates = [] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const sf   = { fontFamily: "'Syncopate', sans-serif" };
  const mono = { fontFamily: "'DM Mono', monospace" };

  const DAYS   = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  // JS day names for legend
  const DOW_NAMES_JS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const toISO = (y, m, d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  // workingDays = all_days array from API: [{day_of_week: 0(Mon)..6(Sun), is_working: bool}]
  // Convert Python DOW (0=Mon) to JS DOW (0=Sun): jsDay = (pythonDay + 1) % 7
  // Build a map: jsDay → is_working
  const hasSchedule = workingDays.length > 0;
  const dowWorkMap  = {};  // jsDay -> is_working
  workingDays.forEach(d => {
    const jsDay = (d.day_of_week + 1) % 7;
    dowWorkMap[jsDay] = d.is_working;
  });

  const timeOffSet = new Set(timeOffDates);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Build open days label for legend
  const openDays = workingDays
    .filter(d => d.is_working)
    .map(d => DOW_NAMES_JS[(d.day_of_week + 1) % 7]);

  return (
    <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", overflow:"hidden",
      clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))"
    }}>
      {/* Month nav */}
      <div style={{ background:"#000", padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={prevMonth}
          style={{ width: 32, height: 32, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#71717a", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition:"all 0.2s" }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.style.color="#f59e0b";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="#71717a";}}>‹</button>
        <p style={{ ...sf, fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "white", margin: 0 }}>
          {MONTHS[viewMonth]} {viewYear}
        </p>
        <button onClick={nextMonth}
          style={{ width: 32, height: 32, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#71717a", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition:"all 0.2s" }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.style.color="#f59e0b";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="#71717a";}}>›</button>
      </div>

      <div style={{ padding:"12px 12px 14px" }}>
        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
          {DAYS.map(d => (
            <div key={d} style={{ ...mono, fontSize: 9, color: "#52525b", textAlign: "center", padding: "4px 0", textTransform: "uppercase" }}>{d}</div>
          ))}
        </div>

        {/* Date cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const iso    = toISO(viewYear, viewMonth, day);
            const date   = new Date(viewYear, viewMonth, day);
            const jsDow  = date.getDay();  // 0=Sun, 1=Mon ... 6=Sat
            const isPast = date < today;

            // Is this day unavailable?
            let isUnavailable = false;
            if (hasSchedule) {
              // Barber has schedule saved — use it
              // If no entry for this JS day, treat as off
              const isWorking = dowWorkMap.hasOwnProperty(jsDow) ? dowWorkMap[jsDow] : false;
              isUnavailable = !isWorking;
            } else {
              // No schedule at all — only block Sunday by default
              isUnavailable = jsDow === 0;
            }

            const isTimeOff = timeOffSet.has(iso);
            const disabled  = isPast || isUnavailable || isTimeOff;
            const isToday   = iso === toISO(today.getFullYear(), today.getMonth(), today.getDate());
            const selected  = iso === selectedDate;
            // Show slash on future unavailable/timeoff days (not on past — they're already greyed)
            const showSlash = !isPast && (isUnavailable || isTimeOff);

            return (
              <button key={iso} onClick={() => !disabled && onSelect(iso)} disabled={disabled}
                style={{
                  aspectRatio: "1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", overflow: "hidden",
                  ...mono, fontSize: 11, fontWeight: selected ? 700 : 400,
                  background:  selected ? "#f59e0b" : isToday ? "rgba(245,158,11,0.1)" : "transparent",
                  color:       selected ? "black" : isPast ? "#252525" : isUnavailable || isTimeOff ? "#3a3a3a" : isToday ? "#f59e0b" : "#d4d4d4",
                  border:      selected ? "1px solid #f59e0b" : isToday ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent",
                  cursor:      disabled ? "not-allowed" : "pointer",
                  borderRadius: 0, transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!disabled && !selected) { e.currentTarget.style.background = "rgba(245,158,11,0.15)"; e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)"; e.currentTarget.style.color = "#f59e0b"; }}}
                onMouseLeave={e => { if (!disabled && !selected) { e.currentTarget.style.background = isToday ? "rgba(245,158,11,0.1)" : "transparent"; e.currentTarget.style.borderColor = isToday ? "rgba(245,158,11,0.3)" : "transparent"; e.currentTarget.style.color = isToday ? "#f59e0b" : "#d4d4d4"; }}}>

                {/* Glowing red diagonal slash on unavailable future days */}
                {showSlash && (
                  <svg
                    className="slash-glow"
                    style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none" }}
                    viewBox="0 0 40 40" preserveAspectRatio="none">
                    <line x1="4" y1="36" x2="36" y2="4"
                      stroke="rgba(239,68,68,0.7)" strokeWidth="1.8"
                      strokeLinecap="round"/>
                  </svg>
                )}

                <span style={{ position:"relative", zIndex:1 }}>{day}</span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display:"flex", gap:10, marginTop:12, paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.05)", flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:14, height:14, background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)" }}/>
            <span style={{ ...mono, fontSize:8, color:"#52525b" }}>Today</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:14, height:14, background:"transparent", border:"1px solid rgba(255,255,255,0.08)", position:"relative", overflow:"hidden" }}>
              <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} viewBox="0 0 14 14" preserveAspectRatio="none">
                <line x1="2" y1="12" x2="12" y2="2" stroke="rgba(239,68,68,0.5)" strokeWidth="1.5"/>
              </svg>
            </div>
            <span style={{ ...mono, fontSize:8, color:"#52525b" }}>Unavailable</span>
          </div>
          {openDays.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:14, height:14, background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.25)" }}/>
              <span style={{ ...mono, fontSize:8, color:"#52525b" }}>Open: {openDays.join(", ")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function TimeSlotGrid({ slots, bookedSlots, selectedTime, onSelect, loading, timeOff, message, onRetry }) {
  const sf   = { fontFamily: "'Syncopate', sans-serif" };
  const mono = { fontFamily: "'DM Mono', monospace" };

  if (loading) {
    return (
      <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ width: 24, height: 24, border: "2px solid rgba(245,158,11,0.3)", borderTopColor: "#f59e0b", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ ...sf, fontSize: 7, color: "#3f3f46", letterSpacing: "0.3em", textTransform: "uppercase" }}>Checking availability...</p>
      </div>
    );
  }

  if (timeOff) {
    return (
      <div style={{ padding: "20px", background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)", textAlign: "center" }}>
        <p style={{ ...sf, fontSize: 8, color: "#f87171", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>Not Available</p>
        <p style={{ ...mono, fontSize: 12, color: "#52525b" }}>{message || "The barber is not available on this day."}</p>
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    const isRetry = message && message.includes("retry");
    return (
      <div style={{ padding: "20px", background: isRetry ? "rgba(245,158,11,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${isRetry ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)"}`, textAlign: "center" }}>
        <p style={{ ...sf, fontSize: 8, color: isRetry ? "#f59e0b" : "#52525b", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>
          {isRetry ? "Connection Error" : "Fully Booked"}
        </p>
        <p style={{ ...mono, fontSize: 12, color: "#3f3f46", marginBottom: 14 }}>
          {isRetry ? "Could not load time slots." : "No available slots for this day. Try another date."}
        </p>
        {isRetry && onRetry ? (
          <button onClick={onRetry} style={{ display:"inline-block", padding:"10px 20px", background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", color:"#f59e0b", fontFamily:"'Syncopate',sans-serif", fontSize:7, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", cursor:"pointer" }}>
            ↺ Retry
          </button>
        ) : (<a href="/waitlist" style={{ display:"inline-block", padding:"10px 20px", background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", color:"#f59e0b", fontFamily:"'Syncopate',sans-serif", fontSize:7, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", textDecoration:"none" }}>
            Join Waitlist →
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes slotPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
          50%      { box-shadow: 0 0 8px 2px rgba(245,158,11,0.18); }
        }
        @keyframes slashGlow {
          0%,100% { filter: drop-shadow(0 0 0px rgba(239,68,68,0)); }
          50%      { filter: drop-shadow(0 0 4px rgba(239,68,68,0.7)); }
        }
        .slot-avail { animation: slotPulse 2.8s ease-in-out infinite; }
        .slot-avail:hover { animation: none !important; }
        .slash-glow { animation: slashGlow 2s ease-in-out infinite; }
      `}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 6 }}>
        {slots.map(slot => {
          const display    = fmtTime(slot);
          const isSelected = selectedTime === display;
          const isBooked   = bookedSlots.includes(slot);

          return (
            <button
              key={slot}
              onClick={() => !isBooked && onSelect(display)}
              disabled={isBooked}
              className={!isBooked && !isSelected ? "slot-avail" : ""}
              style={{
                padding: "13px 4px",
                ...sf,
                fontSize: 8,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                border: isSelected
                  ? "1px solid #f59e0b"
                  : isBooked
                  ? "1px solid rgba(239,68,68,0.12)"
                  : "1px solid rgba(245,158,11,0.2)",
                background: isSelected
                  ? "rgba(245,158,11,0.15)"
                  : isBooked
                  ? "rgba(239,68,68,0.03)"
                  : "rgba(245,158,11,0.04)",
                color: isSelected ? "#f59e0b" : isBooked ? "#2d1515" : "#a1a1aa",
                cursor: isBooked ? "not-allowed" : "pointer",
                transition: "all 0.18s",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={e => {
                if (!isBooked && !isSelected) {
                  e.currentTarget.style.borderColor = "#f59e0b";
                  e.currentTarget.style.color = "#f59e0b";
                  e.currentTarget.style.background = "rgba(245,158,11,0.12)";
                  e.currentTarget.style.boxShadow = "0 0 12px 2px rgba(245,158,11,0.25)";
                }
              }}
              onMouseLeave={e => {
                if (!isBooked && !isSelected) {
                  e.currentTarget.style.borderColor = "rgba(245,158,11,0.2)";
                  e.currentTarget.style.color = "#a1a1aa";
                  e.currentTarget.style.background = "rgba(245,158,11,0.04)";
                  e.currentTarget.style.boxShadow = "";
                }
              }}
            >
              {/* Glowing red slash on booked slots */}
              {isBooked && (
                <svg
                  className="slash-glow"
                  style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}
                  viewBox="0 0 88 42" preserveAspectRatio="none">
                  <line x1="4" y1="38" x2="84" y2="4"
                    stroke="rgba(239,68,68,0.6)" strokeWidth="1.5"
                    strokeLinecap="round"/>
                </svg>
              )}
              {/* Selected checkmark */}
              {isSelected && (
                <span style={{ position:"absolute", top:3, right:4, fontSize:8, color:"#f59e0b" }}>✓</span>
              )}
              <span style={{ position:"relative", zIndex:1 }}>{display}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ── Main booking content ──────────────────────────────────────────────────────
function BookContent() {
  const router = useRouter();
  const { isMobile } = useBreakpoint();
  const canvasRef = useRef(null);

  const [services, setServices]     = useState([]);
  const [barbers, setBarbers]       = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError]   = useState("");

  const [step, setStep]                   = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBarber, setSelectedBarber]   = useState(null);
  const [workingDays,    setWorkingDays]       = useState([]);
  const [timeOffDates,   setTimeOffDates]      = useState([]);
  const [selectedDate, setSelectedDate]       = useState("");
  const [selectedTime, setSelectedTime]       = useState("");
  const [paymentMethod, setPaymentMethod]     = useState("online"); // "online" only for now
  const [clientNotes, setClientNotes]         = useState("");

  // Strike & deposit
  const [strikeInfo,    setStrikeInfo]    = useState(null);   // { strike_count, deposit_fee, terms_accepted }
  const [showTerms,     setShowTerms]     = useState(false);  // show T&C modal
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Available slots state
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots]       = useState([]);
  const [loadingSlots, setLoadingSlots]     = useState(false);
  const [timeOff, setTimeOff]               = useState(false);
  const [timeOffMessage, setTimeOffMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  // ── Three.js ──
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    const verts = [];
    for (let i = 0; i < 1600; i++) {
      verts.push(THREE.MathUtils.randFloatSpread(10));
      verts.push(THREE.MathUtils.randFloatSpread(10));
      verts.push(THREE.MathUtils.randFloatSpread(10));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.PointsMaterial({ size: 0.006, color: 0xf59e0b, transparent: true, opacity: 0.18 });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    camera.position.z = 3;
    let raf;
    const animate = () => { raf = requestAnimationFrame(animate); points.rotation.y += 0.0005; renderer.render(scene, camera); };
    animate();
    const onResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); renderer.dispose(); if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement); };
  }, []);

  // ── Entry animations ──
  useEffect(() => {
    try { gsap.from(".book-enter", { y: 50, opacity: 0, duration: 1.2, stagger: 0.15, ease: "expo.out" }); } catch {}
  }, []);

  useEffect(() => {
    try { gsap.from(".step-content > *", { x: 16, opacity: 0, duration: 0.45, stagger: 0.06, ease: "expo.out" }); } catch {}
  }, [step]);

  // ── Load services + barbers ──
  // Pre-fetched working days map: barberId → { all_days, time_off_dates }
  const [barberSchedules, setBarberSchedules] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const [s, b] = await Promise.all([API.get("services/"), API.get("barbers/")]);
        const barberList = Array.isArray(b.data) ? b.data : b.data.results || [];
        setServices(Array.isArray(s.data) ? s.data : s.data.results || []);
        setBarbers(barberList);

        // Pre-fetch working days for ALL barbers immediately — no delay on select
        const scheduleMap = {};
        await Promise.all(
          barberList.map(async barber => {
            try {
              const r = await API.get(`barbers/${barber.id}/working-days/`);
              scheduleMap[barber.id] = {
                all_days:       r.data.all_days       || [],
                time_off_dates: r.data.time_off_dates || [],
              };
            } catch { scheduleMap[barber.id] = { all_days: [], time_off_dates: [] }; }
          })
        );
        setBarberSchedules(scheduleMap);
      } catch {
        setDataError("Could not load booking data. Please refresh.");
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  // ── Fetch available slots when barber + date + service change ──
  const fetchSlots = useCallback(async () => {
    if (!selectedBarber || !selectedDate || !selectedService) return;
    setLoadingSlots(true);
    setAvailableSlots([]);
    setBookedSlots([]);
    setTimeOff(false);
    setSelectedTime("");
    try {
      const res = await API.get(
        `available-slots/?barber=${selectedBarber.id}&date=${selectedDate}&service=${selectedService.id}`
      );
      const data = res.data;
      if (data.time_off) {
        setTimeOff(true);
        setTimeOffMessage(data.message || "Barber not available this day.");
      } else {
        setAvailableSlots(data.available_slots || []);
        setBookedSlots(data.booked_slots || []);
      }
    } catch(err) {
      // Don't set timeOff=true on network errors — show a retry message instead
      setAvailableSlots([]);
      setBookedSlots([]);
      setTimeOff(false);
      setTimeOffMessage("Could not load slots — tap to retry.");
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedBarber, selectedDate, selectedService]);

  useEffect(() => {
    if (step === 3 && selectedBarber && selectedDate && selectedService) {
      const t = setTimeout(() => fetchSlots(), 300);
      return () => clearTimeout(t);
    }
  }, [step, selectedDate, fetchSlots]);

  // ── Fetch client's strike/deposit status when reaching payment step ──
  useEffect(() => {
    if (step === 4) {
      API.get("client/strike-status/")
        .then(r => { setStrikeInfo(r.data); setTermsAccepted(r.data.terms_accepted); })
        .catch(() => {});
    }
  }, [step]);

  // ── Book (pay in shop) ──
  const handleBookInShop = async () => {
    setSubmitting(true);
    setError("");
    try {
      await API.post("appointments/", {
        service: selectedService.id,
        barber: selectedBarber.id,
        date: selectedDate,
        time: to24Hour(selectedTime),
        payment_method: "shop",
        client_notes: clientNotes,
      });
      const params = new URLSearchParams({
        service: selectedService.name,
        barber:  selectedBarber.name,
        date:    selectedDate,
        time:    selectedTime,
        payment: "shop",
      });
      router.push(`/booking-confirmed?${params.toString()}`);
    } catch (e) {
      const msg = e.response?.data?.detail
        || e.response?.data?.non_field_errors?.[0]
        || "Booking failed. That slot may already be taken.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Pay online — deposit routes to barber directly ──
  const handleCheckout = async () => {
    setSubmitting(true);
    setError("");

    // Must accept terms before paying deposit
    if (!termsAccepted && !strikeInfo?.terms_accepted) {
      setShowTerms(true);
      setSubmitting(false);
      return;
    }

    try {
      const res = await API.post("deposit/checkout/", {
        service:      selectedService.id,
        barber:       selectedBarber.id,
        date:         selectedDate,
        time:         to24Hour(selectedTime),
        client_notes: clientNotes,
      });

      if (res.data.pay_in_shop) {
        setError(res.data.error);
        setSubmitting(false);
        return;
      }

      // Redirect to Stripe deposit checkout
      window.location.href = res.data.url;

    } catch (e) {
      setError(e.response?.data?.error || "Payment setup failed. Please try again.");
      setSubmitting(false);
    }
  };

  const handlePay = () => {
    if (paymentMethod === "shop") handleBookInShop();
    else handleCheckout();
  };

  const STEPS = ["Service", "Barber", "Schedule", "Confirm"];

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

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050505; color: white; font-family: 'DM Mono', monospace; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.4); cursor: pointer; }
        input[type="date"] { color-scheme: dark; }
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes slashGlow {
          0%,100% { filter: drop-shadow(0 0 0px rgba(239,68,68,0)); }
          50%      { filter: drop-shadow(0 0 5px rgba(239,68,68,0.9)); }
        }
        @keyframes slotPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
          50%      { box-shadow: 0 0 8px 2px rgba(245,158,11,0.2); }
        }
        .slash-glow { animation: slashGlow 2s ease-in-out infinite; }
        .slot-avail { animation: slotPulse 2.8s ease-in-out infinite; }
        .slot-avail:hover { animation: none !important; }
      `}</style>

      <div ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", opacity: 0.04, backgroundImage: "none" }} />
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none", background: `radial-gradient(ellipse at ${step * 25}% 40%, rgba(245,158,11,0.04) 0%, transparent 60%)`, transition: "background 1s ease" }} />

      <div style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex" }}>

        {/* ── LEFT SIDEBAR (desktop) ── */}
        <div style={{ width: 280, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.05)", padding: "48px 28px", flexDirection: "column", justifyContent: "space-between", background: "rgba(0,0,0,0.35)", display: "none" }} className="sidebar-desktop">
          <div>
            <a href="/"
              style={{ ...sf, fontSize: 8, letterSpacing: "0.2em", color: "#3f3f46", textDecoration: "none", textTransform: "uppercase", transition: "color 0.2s", display: "block", marginBottom: 48 }}
              onMouseEnter={e => e.target.style.color = "#f59e0b"}
              onMouseLeave={e => e.target.style.color = "#3f3f46"}>
              ← Home
            </a>
            <div style={{ ...sf, fontWeight: 700, fontSize: 20, letterSpacing: "-0.05em", marginBottom: 4 }}>
              HEADZ<span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </div>
            <p style={{ ...sf, fontSize: 7, letterSpacing: "0.3em", color: "#27272a", textTransform: "uppercase", marginBottom: 56 }}>Book Appointment</p>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {STEPS.map((label, i) => (
                <StepItem key={label} n={i + 1} label={label} active={step === i + 1} done={step > i + 1} onClick={setStep} />
              ))}
            </div>
          </div>

          {/* Selection preview */}
          {(selectedService || selectedBarber) && (
            <div style={{ padding: 18, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", marginTop: 32 }}>
              <p style={{ ...sf, fontSize: 7, letterSpacing: "0.3em", color: "#52525b", textTransform: "uppercase", marginBottom: 10 }}>Your Pick</p>
              {selectedService && <p style={{ ...sf, fontSize: 10, textTransform: "uppercase", marginBottom: 4, color: "white" }}>{selectedService.name}</p>}
              {selectedService && <p style={{ ...mono, fontSize: 13, color: "#f59e0b", marginBottom: 6 }}>${parseFloat(selectedService.price).toFixed(2)}</p>}
              {selectedBarber && <p style={{ ...sf, fontSize: 8, color: "#a1a1aa", textTransform: "uppercase" }}>✂ {selectedBarber.name}</p>}
              {selectedDate && <p style={{ ...sf, fontSize: 8, color: "#f59e0b", marginTop: 8 }}>{selectedDate}{selectedTime ? ` · ${selectedTime}` : ""}</p>}
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex: 1, padding: isMobile ? "24px 16px 48px" : "48px 28px", maxWidth: 700, margin: "0 auto", width: "100%" }}>

          {/* Mobile header */}
          <div className="book-enter" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
            <a href="/" style={{ ...sf, fontSize: 8, color: "#3f3f46", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.15em" }}>← Home</a>
            <div style={{ ...sf, fontWeight: 700, fontSize: 16 }}>HEADZ<span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span></div>
          </div>

          {/* Progress bar */}
          <div className="book-enter" style={{ display: "flex", gap: 4, marginBottom: 36 }}>
            {[1, 2, 3, 4].map(s => (
              <div key={s} style={{ flex: 1, height: 2, background: s <= step ? "#f59e0b" : "rgba(255,255,255,0.08)", transition: "background 0.4s", borderRadius: 1 }} />
            ))}
          </div>

          {/* Step heading */}
          <div className="book-enter" style={{ marginBottom: 36 }}>
            <p style={{ ...sf, fontSize: 7, letterSpacing: "0.5em", color: "#3f3f46", textTransform: "uppercase", marginBottom: 10 }}>Step 0{step} of 04</p>
            <h1 style={{ ...sf, fontSize: "clamp(1.4rem, 4vw, 2.4rem)", fontWeight: 900, textTransform: "uppercase", lineHeight: 1.1 }}>
              {["Choose", "Pick Your", "Set The", "Confirm &"][step - 1]}{" "}
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                {["Service_", "Barber_", "Schedule_", "Pay_"][step - 1]}
              </span>
            </h1>
          </div>

          {/* Data error */}
          {dataError && (
            <div style={{ padding: "16px 20px", border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.04)", marginBottom: 24 }}>
              <p style={{ ...sf, fontSize: 8, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.15em" }}>{dataError}</p>
              <button onClick={() => window.location.reload()} style={{ marginTop: 10, ...sf, fontSize: 7, color: "#f59e0b", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.15em", textDecoration: "underline" }}>
                Retry
              </button>
            </div>
          )}

          {loadingData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 76, background: "linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
              ))}
            </div>
          ) : (<div className="step-content">

              {/* ── STEP 1: Service ── */}
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {services.length === 0 ? (
                    <p style={{ ...sf, fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>No services available.</p>
                  ) : services.map((svc, i) => (
                    <button key={svc.id}
                      onClick={() => { setSelectedService(svc); setStep(2); }}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 16px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", transition: "all 0.25s", textAlign: "left" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.background = "rgba(245,158,11,0.04)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                        <span style={{ ...sf, fontSize: 10, color: "rgba(245,158,11,0.35)", fontWeight: 700 }}>0{i + 1}</span>
                        <div>
                          <p style={{ ...sf, fontSize: 12, textTransform: "uppercase", color: "white", fontWeight: 700, margin: 0 }}>{svc.name}</p>
                          {svc.duration_minutes && (
                            <p style={{ ...mono, fontSize: 10, color: "#3f3f46", marginTop: 3 }}>{svc.duration_minutes} min</p>
                          )}
                        </div>
                      </div>
                      <span style={{ ...sf, fontSize: 18, color: "#f59e0b", fontWeight: 900 }}>${parseFloat(svc.price).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* ── STEP 2: Barber ── */}
              {step === 2 && (
                <div>
                  {/* Service recap */}
                  <div style={{ marginBottom: 24, padding: "14px 20px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ ...sf, fontSize: 10, textTransform: "uppercase", color: "#f59e0b" }}>{selectedService?.name}</span>
                    <button onClick={() => setStep(1)} style={{ ...sf, fontSize: 7, color: "#52525b", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.15em", transition: "color 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#f59e0b"}
                      onMouseLeave={e => e.currentTarget.style.color = "#52525b"}>
                      Change
                    </button>
                  </div>

                  {barbers.length === 0 ? (
                    <p style={{ ...sf, fontSize: 10, color: "#52525b", textTransform: "uppercase" }}>No barbers available.</p>
                  ) : barbers.map(b => (
                    <button key={b.id}
                      onClick={() => {
                        setSelectedBarber(b);
                        setSelectedDate("");
                        setSelectedTime("");
                        // Use pre-fetched schedule — instant, no delay
                        const sched = barberSchedules[b.id] || { all_days: [], time_off_dates: [] };
                        setWorkingDays(sched.all_days);
                        setTimeOffDates(sched.time_off_dates);
                        // Re-fetch services with this barber's custom prices
                        API.get(`services/?barber=${b.id}`)
                          .then(r => setServices(Array.isArray(r.data) ? r.data : r.data.results || []))
                          .catch(() => {});
                        setStep(3);
                      }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 20, padding: "20px 16px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", transition: "all 0.25s", textAlign: "left", marginBottom: 10 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.background = "rgba(245,158,11,0.04)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                    >
                      {/* Barber photo */}
                      <div style={{ width: 68, height: 68, flexShrink: 0, border: "2px solid rgba(245,158,11,0.3)", overflow: "hidden", background: "#111", position: "relative" }}>
                        {validPhoto(b.photo_url || b.photo) ? (
                          <img
                            src={validPhoto(b.photo_url || b.photo)}
                            alt={b.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }}
                          />
                        ) : (<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#1a1a1a,#111)" }}>
                            <span style={{ ...sf, fontSize: 22, color: "#f59e0b", fontWeight: 900 }}>{b.name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        {/* Accepting dot */}
                        <div style={{ position: "absolute", bottom: 4, right: 4, width: 8, height: 8, background: "#22c55e", borderRadius: "50%", border: "1.5px solid #111" }} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ ...sf, fontSize: 13, textTransform: "uppercase", fontWeight: 700, color: "white", margin: "0 0 4px", letterSpacing: "-0.02em" }}>{b.name}</p>
                        <p style={{ ...mono, fontSize: 9, color: "#22c55e", letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 5px" }}>✦ Accepting Clients</p>
                        {b.bio && <p style={{ ...mono, fontSize: 11, color: "#52525b", margin: 0, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.bio}</p>}
                      </div>
                      <span style={{ ...sf, fontSize: 8, color: "#3f3f46", textTransform: "uppercase", flexShrink: 0 }}>Select →</span>
                    </button>
                  ))}
                </div>
              )}

              {/* ── STEP 3: Schedule ── */}
              {step === 3 && (
                <div>
                  {/* Service + barber recap */}
                  <div style={{ marginBottom: 24, padding: "14px 20px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <span style={{ ...sf, fontSize: 9, textTransform: "uppercase", color: "#f59e0b" }}>{selectedService?.name}</span>
                      <span style={{ ...sf, fontSize: 9, textTransform: "uppercase", color: "#52525b" }}>✂ {selectedBarber?.name}</span>
                    </div>
                    <button onClick={() => setStep(2)} style={{ ...sf, fontSize: 7, color: "#52525b", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.15em", transition: "color 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#f59e0b"}
                      onMouseLeave={e => e.currentTarget.style.color = "#52525b"}>
                      Change
                    </button>
                  </div>

                  {/* Date picker — visual calendar */}
                  <div style={{ marginBottom: 28 }}>
                    <label style={{ ...sf, fontSize: 7, letterSpacing: "0.3em", color: "#52525b", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                      Select Date
                    </label>
                    {/* v2 — visual calendar with barber availability */}
                    <BookingCalendar
                      selectedDate={selectedDate}
                      onSelect={(date) => { setSelectedDate(date); setSelectedTime(""); }}
                      workingDays={workingDays}
                      timeOffDates={timeOffDates}
                    />
                  </div>

                  {/* Available time slots */}
                  {selectedDate && (
                    <div style={{ marginBottom: 28 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <label style={{ ...sf, fontSize: 7, letterSpacing: "0.3em", color: "#52525b", textTransform: "uppercase" }}>
                          Available Times
                        </label>
                        {selectedDate && !loadingSlots && !timeOff && availableSlots.length > 0 && (
                          <span style={{ ...mono, fontSize: 10, color: "#3f3f46" }}>
                            {availableSlots.length} slot{availableSlots.length !== 1 ? "s" : ""} open
                          </span>
                        )}
                      </div>
                      <TimeSlotGrid
                        slots={availableSlots}
                        bookedSlots={bookedSlots}
                        selectedTime={selectedTime}
                        onSelect={setSelectedTime}
                        loading={loadingSlots}
                        timeOff={timeOff}
                        message={timeOffMessage}
                        onRetry={fetchSlots}
                      />
                    </div>
                  )}

                  {!selectedDate && (
                    <div style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
                      <p style={{ ...sf, fontSize: 7, color: "#27272a", letterSpacing: "0.2em", textTransform: "uppercase" }}>Pick a date to see available times</p>
                    </div>
                  )}

                  <button
                    onClick={() => setStep(4)}
                    disabled={!selectedDate || !selectedTime}
                    style={{ width: "100%", padding: "18px", background: !selectedDate || !selectedTime ? "#111" : "white", color: !selectedDate || !selectedTime ? "#27272a" : "black", ...sf, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", border: !selectedDate || !selectedTime ? "1px solid rgba(255,255,255,0.05)" : "none", cursor: !selectedDate || !selectedTime ? "not-allowed" : "pointer", transition: "all 0.25s", marginTop: 8 }}
                    onMouseEnter={e => { if (selectedDate && selectedTime) e.currentTarget.style.background = "#f59e0b"; }}
                    onMouseLeave={e => { if (selectedDate && selectedTime) e.currentTarget.style.background = "white"; }}
                  >
                    Review Booking →
                  </button>
                </div>
              )}

              {/* ── STEP 4: Confirm & Pay ── */}
              {step === 4 && (
                <div>
                  {/* Summary card */}
                  <div style={{ border: "1px solid rgba(255,255,255,0.07)", marginBottom: 24, overflow: "hidden" }}>
                    <div style={{ background: "rgba(245,158,11,0.06)", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ ...sf, fontSize: 8, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.3em" }}>Booking Summary</span>
                    </div>
                    {[
                      ["Service",  selectedService?.name],
                      ["Duration", selectedService?.duration_minutes ? `${selectedService.duration_minutes} min` : "—"],
                      ["Price",    `$${parseFloat(selectedService?.price || 0).toFixed(2)}`],
                      ["Barber",   selectedBarber?.name],
                      ["Date",     fmtDateLong(selectedDate)],
                      ["Time",     selectedTime],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ ...sf, fontSize: 8, textTransform: "uppercase", letterSpacing: "0.15em", color: "#52525b" }}>{label}</span>
                        <span style={{ ...mono, fontSize: 12, color: "white" }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Client notes */}
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ ...sf, fontSize: 7, letterSpacing: "0.3em", color: "#a1a1aa", textTransform: "uppercase", marginBottom: 10 }}>Style Request (optional)</p>
                    <textarea
                      value={clientNotes}
                      onChange={e => setClientNotes(e.target.value)}
                      placeholder="e.g. Low fade, leave length on top, lineup..."
                      rows={3}
                      style={{ width:"100%", background:"#0a0a0a", border:"1px solid rgba(255,255,255,0.1)", padding:"12px 14px", color:"white", fontSize:14, outline:"none", fontFamily:"'DM Mono',monospace", resize:"none", lineHeight:1.6, transition:"border-color 0.2s" }}
                      onFocus={e=>e.target.style.borderColor="#f59e0b"}
                      onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}
                    />
                  </div>

                  {/* ── DEPOSIT & PAYMENT ── */}
                  <div style={{ marginBottom:24 }}>
                    <p style={{ ...sf, fontSize:7, letterSpacing:"0.3em", color:"#a1a1aa", textTransform:"uppercase", marginBottom:14 }}>Payment Method</p>

                    {/* Service price breakdown */}
                    <div style={{ padding:"16px 18px", background:"rgba(245,158,11,0.05)", border:"1px solid rgba(245,158,11,0.2)", marginBottom:12,
                      clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))"
                    }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#a1a1aa" }}>{selectedService?.name}</span>
                        <span style={{ ...sf, fontSize:18, fontWeight:900, color:"white" }}>${selectedService?.price}</span>
                      </div>
                      <div style={{ height:1, background:"rgba(255,255,255,0.06)", marginBottom:8 }}/>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#f59e0b" }}>
                          Deposit due now
                          {strikeInfo?.strike_count > 0 && <span style={{ color:"#ef4444", marginLeft:8 }}>({strikeInfo.strike_count} strike{strikeInfo.strike_count > 1 ? "s" : ""} — fee increased)</span>}
                        </span>
                        <span style={{ ...sf, fontSize:18, fontWeight:900, color:"#f59e0b" }}>${strikeInfo?.deposit_fee || "10.00"}</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#52525b" }}>Remaining at appointment</span>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:"#71717a" }}>
                          ${Math.max(0, parseFloat(selectedService?.price || 0) - parseFloat(strikeInfo?.deposit_fee || 10)).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Strike warning */}
                    {strikeInfo?.strike_count > 0 && (
                      <div style={{ padding:"10px 14px", background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)", marginBottom:12,
                        clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))"
                      }}>
                        <p style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#f87171", lineHeight:1.6 }}>
                          ⚠ You have {strikeInfo.strike_count} strike{strikeInfo.strike_count > 1 ? "s" : ""} on your account due to previous no-shows or late cancellations.
                          Your deposit has been increased by ${(parseFloat(strikeInfo.deposit_fee) - 10).toFixed(2)}.
                        </p>
                      </div>
                    )}

                    {/* Pay deposit online */}
                    <button onClick={()=>setPaymentMethod("online")}
                      style={{ width:"100%", padding:"18px 16px", background:paymentMethod==="online"?"rgba(99,91,255,0.08)":"rgba(255,255,255,0.02)", border:`2px solid ${paymentMethod==="online"?"#635bff":"rgba(255,255,255,0.08)"}`, cursor:"pointer", textAlign:"left", transition:"all 0.2s", marginBottom:10,
                        clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))"
                      }}
                      onMouseEnter={e=>{if(paymentMethod!=="online"){e.currentTarget.style.borderColor="rgba(99,91,255,0.4)";e.currentTarget.style.background="rgba(99,91,255,0.04)";}}}
                      onMouseLeave={e=>{if(paymentMethod!=="online"){e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.background="rgba(255,255,255,0.02)";}}}
                    >
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                          <div style={{ width:44, height:44, background:"#635bff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                            boxShadow:paymentMethod==="online"?"0 0 20px rgba(99,91,255,0.4)":"none"
                          }}>
                            <span style={{ ...sf, fontSize:18, fontWeight:900, color:"white" }}>S</span>
                          </div>
                          <div>
                            <p style={{ ...sf, fontSize:10, textTransform:"uppercase", color:paymentMethod==="online"?"#a78bfa":"white", margin:"0 0 3px" }}>Pay Deposit Online</p>
                            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:paymentMethod==="online"?"rgba(167,139,250,0.7)":"#71717a", margin:0 }}>
                              ${strikeInfo?.deposit_fee || "10.00"} secures your chair — rest due at shop
                            </p>
                          </div>
                        </div>
                        <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${paymentMethod==="online"?"#635bff":"rgba(255,255,255,0.2)"}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {paymentMethod==="online" && <div style={{ width:10, height:10, borderRadius:"50%", background:"#635bff" }}/>}
                        </div>
                      </div>
                    </button>

                    {/* Pay in shop */}
                    {/* Pay in shop — coming soon */}
                    <div style={{ width:"100%", padding:"18px 16px",
                      background:"rgba(255,255,255,0.01)",
                      border:"2px solid rgba(255,255,255,0.04)",
                      cursor:"not-allowed", textAlign:"left",
                      opacity:0.45,
                      clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
                      position:"relative", overflow:"hidden"
                    }}>
                      {/* Coming soon badge */}
                      <div style={{ position:"absolute", top:10, right:12,
                        background:"rgba(245,158,11,0.12)", border:"1px solid rgba(245,158,11,0.25)",
                        padding:"3px 10px",
                        clipPath:"polygon(0 0,calc(100% - 4px) 0,100% 4px,100% 100%,4px 100%,0 calc(100% - 4px))"
                      }}>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#f59e0b", letterSpacing:"0.2em", textTransform:"uppercase" }}>Coming Soon</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <div style={{ width:44, height:44, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <span style={{ fontSize:20 }}>✂️</span>
                        </div>
                        <div>
                          <p style={{ ...sf, fontSize:10, textTransform:"uppercase", color:"#52525b", margin:"0 0 3px" }}>Pay In Shop</p>
                          <p style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#3f3f46", margin:0 }}>Available soon — use online deposit for now</p>
                        </div>
                      </div>
                    </div>

                    {/* Terms acceptance */}
                    <div style={{ marginTop:14, display:"flex", alignItems:"flex-start", gap:10 }}>
                      <button onClick={async()=>{
                        setTermsAccepted(!termsAccepted);
                        if(!termsAccepted) {
                          try { await API.post("client/accept-terms/"); } catch {}
                        }
                      }} style={{ width:20, height:20, flexShrink:0, marginTop:1, border:`2px solid ${termsAccepted?"#f59e0b":"rgba(255,255,255,0.2)"}`, background:termsAccepted?"rgba(245,158,11,0.1)":"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", minHeight:"auto", minWidth:"auto" }}>
                        {termsAccepted && <span style={{ color:"#f59e0b", fontSize:11, lineHeight:1 }}>✓</span>}
                      </button>
                      <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#71717a", lineHeight:1.6 }}>
                        I have read and agree to the{" "}
                        <button onClick={()=>setShowTerms(true)} style={{ background:"none", border:"none", color:"#f59e0b", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:10, padding:0, textDecoration:"underline" }}>
                          Deposit & Cancellation Policy
                        </button>
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div style={{ padding:"12px 16px", background:"rgba(248,113,113,0.06)", border:"1px solid rgba(248,113,113,0.2)", marginBottom:16,
                      clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))"
                    }}>
                      <p style={{ ...sf, fontSize:8, color:"#f87171", textTransform:"uppercase", letterSpacing:"0.12em", margin:0 }}>⚠ {error}</p>
                    </div>
                  )}

                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={()=>{setStep(3);setError("");}}
                      style={{ flex:1, padding:"16px", background:"transparent", border:"1px solid rgba(255,255,255,0.1)", color:"#a1a1aa", ...sf, fontSize:8, textTransform:"uppercase", letterSpacing:"0.15em", cursor:"pointer", transition:"all 0.2s",
                        clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))"
                      }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.3)";e.currentTarget.style.color="white";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="#a1a1aa";}}>
                      ← Edit
                    </button>
                    <button onClick={handlePay} disabled={submitting || (paymentMethod==="online" && !termsAccepted)}
                      style={{ flex:2, padding:"16px", border:"none", cursor:(submitting||(paymentMethod==="online"&&!termsAccepted))?"not-allowed":"pointer", transition:"all 0.25s", display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                        ...sf, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.2em",
                        background: submitting ? "#111" : (paymentMethod==="online"&&!termsAccepted) ? "#1a1a1a" : paymentMethod==="online" ? "#635bff" : "rgba(255,255,255,0.9)",
                        color: (submitting||(paymentMethod==="online"&&!termsAccepted)) ? "#3f3f46" : "black",
                        clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                        boxShadow: (!submitting&&paymentMethod==="online"&&termsAccepted) ? "0 0 28px rgba(99,91,255,0.35)" : "none",
                      }}
                      onMouseEnter={e=>{if(!submitting&&!(paymentMethod==="online"&&!termsAccepted))e.currentTarget.style.opacity="0.88";}}
                      onMouseLeave={e=>{e.currentTarget.style.opacity="1";}}>
                      {submitting
                        ? <><span style={{ width:13,height:13,border:"2px solid #27272a",borderTopColor:"#52525b",borderRadius:"50%",display:"inline-block",animation:"spin 0.7s linear infinite" }}/>Processing...</>
                        : paymentMethod==="online"
                          ? termsAccepted
                            ? `🔒 Pay $${strikeInfo?.deposit_fee || "10.00"} Deposit →`
                            : "Accept Terms to Continue"
                          : "Book It — Pay In Shop →"
                      }
                    </button>
                  </div>

                  {/* ── TERMS & CONDITIONS MODAL ── */}
                  {showTerms && (
                    <div style={{ position:"fixed", inset:0, zIndex:999, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
                      onClick={e=>{ if(e.target===e.currentTarget) setShowTerms(false); }}>
                      <div style={{ background:"#0a0a0a", border:"1px solid rgba(245,158,11,0.25)", maxWidth:540, width:"100%", maxHeight:"85vh", overflow:"hidden", display:"flex", flexDirection:"column",
                        clipPath:"polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))"
                      }}>
                        {/* Header */}
                        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
                          <div>
                            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                              <div style={{ width:3, height:20, background:"linear-gradient(to bottom,#ef4444,#f59e0b)" }}/>
                              <p style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:"rgba(245,158,11,0.6)", letterSpacing:"0.5em", textTransform:"uppercase" }}>HEADZ UP BARBERSHOP</p>
                            </div>
                            <h3 style={{ fontFamily:"'Syncopate',sans-serif", fontSize:13, fontWeight:900, textTransform:"uppercase", letterSpacing:"-0.02em", color:"white" }}>
                              Booking Terms
                            </h3>
                          </div>
                          <button onClick={()=>setShowTerms(false)} style={{ background:"none", border:"1px solid rgba(255,255,255,0.1)", color:"#52525b", width:32, height:32, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}
                            onMouseEnter={e=>{e.currentTarget.style.color="white";e.currentTarget.style.borderColor="rgba(255,255,255,0.3)";}}
                            onMouseLeave={e=>{e.currentTarget.style.color="#52525b";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}>✕</button>
                        </div>

                        {/* Body */}
                        <div style={{ padding:"20px 24px", overflowY:"auto", flex:1 }}>
                          <p style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"#71717a", lineHeight:1.9, marginBottom:20 }}>
                            By booking with HEADZ UP you are agreeing to the rules of this shop. These rules are not up for debate — they exist to protect the barber's time and livelihood. Read them, understand them, and respect them.
                          </p>
                          {[
                            {
                              icon:"💳",
                              title:"Deposit",
                              body:`Online bookings require a deposit to hold your spot. The deposit comes off your total at the chair — you are not paying extra. The deposit is non-refundable under any circumstance.`
                            },
                            {
                              icon:"🪑",
                              title:"Show Up",
                              body:`When you book a slot, that time belongs to you. The barber turns away other clients for it. If you do not show up, you have wasted their time and their income. No-shows receive a strike and forfeit their deposit — no exceptions.`
                            },
                            {
                              icon:"⏰",
                              title:"Cancellations",
                              body:`Need to cancel? Do it more than 2 hours before your appointment — no strike, no problem. Cancel within 2 hours or simply disappear and you will receive a strike. The deposit is gone either way.`
                            },
                            {
                              icon:"⚡",
                              title:"Strike System",
                              body:`Strikes are issued for no-shows and late cancellations. Strikes raise your deposit on future bookings. This system is final — the shop owner's decision on any strike matter is absolute and is not subject to dispute through this platform.`
                            },
                            {
                              icon:"🔄",
                              title:"Rescheduling",
                              body:`You can request a reschedule as long as it is more than 2 hours before your appointment. The barber approves or denies all reschedule requests. Their decision is final.`
                            },
                            {
                              icon:"📋",
                              title:"This Platform",
                              body:`This booking system — including the deposit requirement, strike tracking, scheduling, and all related features — is operated at the sole discretion of HEADZ UP Barbershop. Use of this platform constitutes full acceptance of these terms. These rules are not negotiable.`
                            },
                          ].map(({icon,title,body})=>(
                            <div key={title} style={{ marginBottom:18, paddingBottom:18, borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                              <p style={{ fontFamily:"'Syncopate',sans-serif", fontSize:8, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", color:"#f59e0b", marginBottom:8 }}>{icon} {title}</p>
                              <p style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"#a1a1aa", lineHeight:1.8 }}>{body}</p>
                            </div>
                          ))}
                          <div style={{ marginTop:16, padding:"14px 16px", background:"rgba(245,158,11,0.03)", border:"1px solid rgba(245,158,11,0.1)" }}>
                            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#52525b", lineHeight:1.8, marginBottom:8 }}>
                              Booking an appointment means you have read and accepted these terms in full.
                            </p>
                            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                              <a href="/terms" target="_blank" style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"rgba(245,158,11,0.5)", textDecoration:"none", transition:"color 0.2s" }}
                                onMouseEnter={e=>e.currentTarget.style.color="#f59e0b"}
                                onMouseLeave={e=>e.currentTarget.style.color="rgba(245,158,11,0.5)"}>
                                Terms of Service →
                              </a>
                              <a href="/terms#privacy" target="_blank" style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"rgba(245,158,11,0.5)", textDecoration:"none", transition:"color 0.2s" }}
                                onMouseEnter={e=>e.currentTarget.style.color="#f59e0b"}
                                onMouseLeave={e=>e.currentTarget.style.color="rgba(245,158,11,0.5)"}>
                                Privacy Policy →
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding:"16px 24px", borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex", gap:10, flexShrink:0 }}>
                          <button onClick={()=>setShowTerms(false)}
                            style={{ flex:1, padding:"13px", background:"transparent", border:"1px solid rgba(255,255,255,0.1)", color:"#71717a", fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:"0.15em", textTransform:"uppercase", cursor:"pointer", transition:"all 0.2s" }}
                            onMouseEnter={e=>e.currentTarget.style.color="white"}
                            onMouseLeave={e=>e.currentTarget.style.color="#71717a"}>
                            Close
                          </button>
                          <button onClick={async()=>{
                            setTermsAccepted(true);
                            setShowTerms(false);
                            try { await API.post("client/accept-terms/"); } catch {}
                          }}
                            style={{ flex:2, padding:"13px", background:"#f59e0b", color:"black", fontFamily:"'Syncopate',sans-serif", fontSize:8, fontWeight:700, letterSpacing:"0.22em", textTransform:"uppercase", border:"none", cursor:"pointer", transition:"opacity 0.2s",
                              clipPath:"polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px))"
                            }}
                            onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
                            onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                            I Accept & Agree ✓
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop sidebar CSS */}
      <style>{`
        @media (min-width: 1024px) {
          .sidebar-desktop { display: flex !important; }
        }
      `}</style>
    </>
  );
}

export default function BookPage() {
  return <AuthGuard><BookContent /></AuthGuard>;
}
