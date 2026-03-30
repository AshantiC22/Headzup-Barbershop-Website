"use client";
// v3 — visual calendar, creative redesign

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { gsap } from "gsap";
import API from "@/lib/api";
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
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        cursor: done ? "pointer" : "default",
        opacity: !active && !done ? 0.3 : 1,
        transition: "opacity 0.3s",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          border: `1px solid ${active ? "#f59e0b" : done ? "#f59e0b" : "rgba(255,255,255,0.2)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: done ? "#f59e0b" : "transparent",
          flexShrink: 0,
          transition: "all 0.3s",
        }}
      >
        {done ? (
          <span style={{ color: "black", fontSize: 12, fontWeight: 900 }}>
            ✓
          </span>
        ) : (
          <span
            style={{
              ...sf,
              fontSize: 9,
              color: active ? "#f59e0b" : "#71717a",
            }}
          >
            0{n}
          </span>
        )}
      </div>
      <span
        style={{
          ...sf,
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: active ? "white" : done ? "#f59e0b" : "#71717a",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Time slot grid ────────────────────────────────────────────────────────────
function BookingCalendar({ selectedDate, onSelect }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const sf = { fontFamily: "'Syncopate', sans-serif" };
  const mono = { fontFamily: "'DM Mono', monospace" };

  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const toISO = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div
      style={{
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.1)",
        padding: "16px",
      }}
    >
      {/* Month nav */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <button
          onClick={prevMonth}
          style={{
            width: 32,
            height: 32,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#71717a",
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ‹
        </button>
        <p
          style={{
            ...sf,
            fontSize: 8,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "white",
            margin: 0,
          }}
        >
          {MONTHS[viewMonth]} {viewYear}
        </p>
        <button
          onClick={nextMonth}
          style={{
            width: 32,
            height: 32,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#71717a",
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 2,
          marginBottom: 4,
        }}
      >
        {DAYS.map((d) => (
          <div
            key={d}
            style={{
              ...mono,
              fontSize: 9,
              color: "#3f3f46",
              textAlign: "center",
              padding: "4px 0",
              textTransform: "uppercase",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 2,
        }}
      >
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const iso = toISO(viewYear, viewMonth, day);
          const date = new Date(viewYear, viewMonth, day);
          const isPast = date < today;
          const isSunday = date.getDay() === 0;
          const disabled = isPast || isSunday;
          const isToday =
            iso ===
            toISO(today.getFullYear(), today.getMonth(), today.getDate());
          const selected = iso === selectedDate;

          return (
            <button
              key={iso}
              onClick={() => !disabled && onSelect(iso)}
              disabled={disabled}
              style={{
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...mono,
                fontSize: 12,
                fontWeight: selected ? 700 : 400,
                background: selected
                  ? "#f59e0b"
                  : isToday
                    ? "rgba(245,158,11,0.1)"
                    : "transparent",
                color: selected
                  ? "black"
                  : disabled
                    ? "#27272a"
                    : isToday
                      ? "#f59e0b"
                      : "white",
                border: selected
                  ? "1px solid #f59e0b"
                  : isToday
                    ? "1px solid rgba(245,158,11,0.3)"
                    : "1px solid transparent",
                cursor: disabled ? "not-allowed" : "pointer",
                borderRadius: 0,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!disabled && !selected) {
                  e.currentTarget.style.background = "rgba(245,158,11,0.15)";
                  e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !selected) {
                  e.currentTarget.style.background = isToday
                    ? "rgba(245,158,11,0.1)"
                    : "transparent";
                  e.currentTarget.style.borderColor = isToday
                    ? "rgba(245,158,11,0.3)"
                    : "transparent";
                }
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Closed notice */}
      <p
        style={{
          ...mono,
          fontSize: 9,
          color: "#27272a",
          marginTop: 10,
          textAlign: "center",
        }}
      >
        Sundays — Closed
      </p>
    </div>
  );
}

function TimeSlotGrid({
  slots,
  bookedSlots,
  selectedTime,
  onSelect,
  loading,
  timeOff,
  message,
}) {
  if (loading) {
    return (
      <div
        style={{
          padding: "32px 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: "2px solid rgba(245,158,11,0.3)",
            borderTopColor: "#f59e0b",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p
          style={{
            ...sf,
            fontSize: 7,
            color: "#3f3f46",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          Checking availability...
        </p>
      </div>
    );
  }

  if (timeOff) {
    return (
      <div
        style={{
          padding: "20px",
          background: "rgba(248,113,113,0.05)",
          border: "1px solid rgba(248,113,113,0.15)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            ...sf,
            fontSize: 8,
            color: "#f87171",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Not Available
        </p>
        <p style={{ fontSize: 12, color: "#52525b" }}>
          {message || "The barber is not available on this day."}
        </p>
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <div
        style={{
          padding: "20px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            ...sf,
            fontSize: 8,
            color: "#52525b",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Fully Booked
        </p>
        <p style={{ fontSize: 12, color: "#3f3f46" }}>
          No available slots for this day. Try another date.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}
    >
      {slots.map((slot) => {
        const display = fmtTime(slot);
        const isSelected = selectedTime === display;
        const isBooked = bookedSlots.includes(slot);

        return (
          <button
            key={slot}
            onClick={() => !isBooked && onSelect(display)}
            disabled={isBooked}
            style={{
              padding: "12px 4px",
              ...sf,
              fontSize: 8,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              border: `1px solid ${isSelected ? "#f59e0b" : isBooked ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)"}`,
              background: isSelected
                ? "rgba(245,158,11,0.12)"
                : isBooked
                  ? "rgba(255,255,255,0.02)"
                  : "transparent",
              color: isSelected ? "#f59e0b" : isBooked ? "#27272a" : "#71717a",
              cursor: isBooked ? "not-allowed" : "pointer",
              transition: "all 0.18s",
              textDecoration: isBooked ? "line-through" : "none",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              if (!isBooked && !isSelected) {
                e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)";
                e.currentTarget.style.color = "#f59e0b";
              }
            }}
            onMouseLeave={(e) => {
              if (!isBooked && !isSelected) {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "#71717a";
              }
            }}
          >
            {display}
          </button>
        );
      })}
    </div>
  );
}

// ── Main booking content ──────────────────────────────────────────────────────
function BookContent() {
  const router = useRouter();
  const { isMobile } = useBreakpoint();
  const canvasRef = useRef(null);

  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("online"); // "online" | "shop"
  const [clientNotes, setClientNotes] = useState(""); // client's style request

  // Available slots state
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [timeOff, setTimeOff] = useState(false);
  const [timeOffMessage, setTimeOffMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Three.js ──
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
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
    const mat = new THREE.PointsMaterial({
      size: 0.006,
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.18,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    camera.position.z = 3;
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      points.rotation.y += 0.0005;
      renderer.render(scene, camera);
    };
    animate();
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
    };
  }, []);

  // ── Entry animations ──
  useEffect(() => {
    try {
      gsap.from(".book-enter", {
        y: 50,
        opacity: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: "expo.out",
      });
    } catch {}
  }, []);

  useEffect(() => {
    try {
      gsap.from(".step-content > *", {
        x: 16,
        opacity: 0,
        duration: 0.45,
        stagger: 0.06,
        ease: "expo.out",
      });
    } catch {}
  }, [step]);

  // ── Load services + barbers ──
  useEffect(() => {
    const load = async () => {
      try {
        const [s, b] = await Promise.all([
          API.get("services/"),
          API.get("barbers/"),
        ]);
        setServices(Array.isArray(s.data) ? s.data : s.data.results || []);
        setBarbers(Array.isArray(b.data) ? b.data : b.data.results || []);
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
        `available-slots/?barber=${selectedBarber.id}&date=${selectedDate}&service=${selectedService.id}`,
      );
      const data = res.data;
      if (data.time_off) {
        setTimeOff(true);
        setTimeOffMessage(data.message || "Barber not available this day.");
      } else {
        setAvailableSlots(data.available_slots || []);
        setBookedSlots(data.booked_slots || []);
      }
    } catch {
      setTimeOff(true);
      setTimeOffMessage("Could not load availability. Try again.");
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
        barber: selectedBarber.name,
        date: selectedDate,
        time: selectedTime,
        payment: "shop",
      });
      router.push(`/booking-confirmed?${params.toString()}`);
    } catch (e) {
      const msg =
        e.response?.data?.detail ||
        e.response?.data?.non_field_errors?.[0] ||
        "Booking failed. That slot may already be taken.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Book (pay online via Stripe) ──
  const handleCheckout = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await API.post("create-checkout-session/", {
        service: selectedService.id,
        barber: selectedBarber.id,
        date: selectedDate,
        time: to24Hour(selectedTime),
        client_notes: clientNotes,
      });
      window.location.href = res.data.url;
    } catch (e) {
      setError(
        e.response?.data?.error || "Payment setup failed. Please try again.",
      );
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
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@400;500&display=swap");
        *,
        *::before,
        *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          background: #050505;
          color: white;
          font-family: "DM Mono", monospace;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1) opacity(0.4);
          cursor: pointer;
        }
        input[type="date"] {
          color-scheme: dark;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
      `}</style>

      <div
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          opacity: 0.04,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          pointerEvents: "none",
          background: `radial-gradient(ellipse at ${step * 25}% 40%, rgba(245,158,11,0.04) 0%, transparent 60%)`,
          transition: "background 1s ease",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          display: "flex",
        }}
      >
        {/* ── LEFT SIDEBAR (desktop) ── */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            borderRight: "1px solid rgba(255,255,255,0.05)",
            padding: "48px 28px",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "rgba(0,0,0,0.35)",
            display: "none",
          }}
          className="sidebar-desktop"
        >
          <div>
            <a
              href="/"
              style={{
                ...sf,
                fontSize: 8,
                letterSpacing: "0.2em",
                color: "#3f3f46",
                textDecoration: "none",
                textTransform: "uppercase",
                transition: "color 0.2s",
                display: "block",
                marginBottom: 48,
              }}
              onMouseEnter={(e) => (e.target.style.color = "#f59e0b")}
              onMouseLeave={(e) => (e.target.style.color = "#3f3f46")}
            >
              ← Home
            </a>
            <div
              style={{
                ...sf,
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: "-0.05em",
                marginBottom: 4,
              }}
            >
              HEADZ
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </div>
            <p
              style={{
                ...sf,
                fontSize: 7,
                letterSpacing: "0.3em",
                color: "#27272a",
                textTransform: "uppercase",
                marginBottom: 56,
              }}
            >
              Book Appointment
            </p>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {STEPS.map((label, i) => (
                <StepItem
                  key={label}
                  n={i + 1}
                  label={label}
                  active={step === i + 1}
                  done={step > i + 1}
                  onClick={setStep}
                />
              ))}
            </div>
          </div>

          {/* Selection preview */}
          {(selectedService || selectedBarber) && (
            <div
              style={{
                padding: 18,
                background: "rgba(245,158,11,0.05)",
                border: "1px solid rgba(245,158,11,0.12)",
                marginTop: 32,
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 7,
                  letterSpacing: "0.3em",
                  color: "#52525b",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Your Pick
              </p>
              {selectedService && (
                <p
                  style={{
                    ...sf,
                    fontSize: 10,
                    textTransform: "uppercase",
                    marginBottom: 4,
                    color: "white",
                  }}
                >
                  {selectedService.name}
                </p>
              )}
              {selectedService && (
                <p
                  style={{
                    ...mono,
                    fontSize: 13,
                    color: "#f59e0b",
                    marginBottom: 6,
                  }}
                >
                  ${parseFloat(selectedService.price).toFixed(2)}
                </p>
              )}
              {selectedBarber && (
                <p
                  style={{
                    ...sf,
                    fontSize: 8,
                    color: "#a1a1aa",
                    textTransform: "uppercase",
                  }}
                >
                  ✂ {selectedBarber.name}
                </p>
              )}
              {selectedDate && (
                <p
                  style={{ ...sf, fontSize: 8, color: "#f59e0b", marginTop: 8 }}
                >
                  {selectedDate}
                  {selectedTime ? ` · ${selectedTime}` : ""}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div
          style={{
            flex: 1,
            padding: isMobile ? "24px 16px 48px" : "48px 28px",
            maxWidth: 700,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {/* Mobile header */}
          <div
            className="book-enter"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 36,
            }}
          >
            <a
              href="/"
              style={{
                ...sf,
                fontSize: 8,
                color: "#3f3f46",
                textDecoration: "none",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
              }}
            >
              ← Home
            </a>
            <div style={{ ...sf, fontWeight: 700, fontSize: 16 }}>
              HEADZ
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
            </div>
          </div>

          {/* Progress bar */}
          <div
            className="book-enter"
            style={{ display: "flex", gap: 4, marginBottom: 36 }}
          >
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: 2,
                  background: s <= step ? "#f59e0b" : "rgba(255,255,255,0.08)",
                  transition: "background 0.4s",
                  borderRadius: 1,
                }}
              />
            ))}
          </div>

          {/* Step heading */}
          <div className="book-enter" style={{ marginBottom: 36 }}>
            <p
              style={{
                ...sf,
                fontSize: 7,
                letterSpacing: "0.5em",
                color: "#3f3f46",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Step 0{step} of 04
            </p>
            <h1
              style={{
                ...sf,
                fontSize: "clamp(1.5rem, 4vw, 2.4rem)",
                fontWeight: 900,
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              {["Choose", "Pick Your", "Set The", "Confirm &"][step - 1]}{" "}
              <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                {["Service_", "Barber_", "Schedule_", "Pay_"][step - 1]}
              </span>
            </h1>
          </div>

          {/* Data error */}
          {dataError && (
            <div
              style={{
                padding: "16px 20px",
                border: "1px solid rgba(248,113,113,0.2)",
                background: "rgba(248,113,113,0.04)",
                marginBottom: 24,
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 8,
                  color: "#f87171",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                }}
              >
                {dataError}
              </p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  marginTop: 10,
                  ...sf,
                  fontSize: 7,
                  color: "#f59e0b",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  textDecoration: "underline",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {loadingData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 76,
                    background:
                      "linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 75%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s infinite",
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="step-content">
              {/* ── STEP 1: Service ── */}
              {step === 1 && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {services.length === 0 ? (
                    <p
                      style={{
                        ...sf,
                        fontSize: 10,
                        color: "#52525b",
                        textTransform: "uppercase",
                      }}
                    >
                      No services available.
                    </p>
                  ) : (
                    services.map((svc, i) => (
                      <button
                        key={svc.id}
                        onClick={() => {
                          setSelectedService(svc);
                          setStep(2);
                        }}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "24px 28px",
                          background: "rgba(255,255,255,0.025)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          cursor: "pointer",
                          transition: "all 0.25s",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#f59e0b";
                          e.currentTarget.style.background =
                            "rgba(245,158,11,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor =
                            "rgba(255,255,255,0.07)";
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.025)";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 18,
                          }}
                        >
                          <span
                            style={{
                              ...sf,
                              fontSize: 10,
                              color: "rgba(245,158,11,0.35)",
                              fontWeight: 700,
                            }}
                          >
                            0{i + 1}
                          </span>
                          <div>
                            <p
                              style={{
                                ...sf,
                                fontSize: 12,
                                textTransform: "uppercase",
                                color: "white",
                                fontWeight: 700,
                                margin: 0,
                              }}
                            >
                              {svc.name}
                            </p>
                            {svc.duration_minutes && (
                              <p
                                style={{
                                  ...mono,
                                  fontSize: 10,
                                  color: "#3f3f46",
                                  marginTop: 3,
                                }}
                              >
                                {svc.duration_minutes} min
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          style={{
                            ...sf,
                            fontSize: 18,
                            color: "#f59e0b",
                            fontWeight: 900,
                          }}
                        >
                          ${parseFloat(svc.price).toFixed(2)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* ── STEP 2: Barber ── */}
              {step === 2 && (
                <div>
                  {/* Service recap */}
                  <div
                    style={{
                      marginBottom: 24,
                      padding: "14px 20px",
                      background: "rgba(245,158,11,0.05)",
                      border: "1px solid rgba(245,158,11,0.12)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        ...sf,
                        fontSize: 10,
                        textTransform: "uppercase",
                        color: "#f59e0b",
                      }}
                    >
                      {selectedService?.name}
                    </span>
                    <button
                      onClick={() => setStep(1)}
                      style={{
                        ...sf,
                        fontSize: 7,
                        color: "#52525b",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textTransform: "uppercase",
                        letterSpacing: "0.15em",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#f59e0b")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "#52525b")
                      }
                    >
                      Change
                    </button>
                  </div>

                  {barbers.length === 0 ? (
                    <p
                      style={{
                        ...sf,
                        fontSize: 10,
                        color: "#52525b",
                        textTransform: "uppercase",
                      }}
                    >
                      No barbers available.
                    </p>
                  ) : (
                    barbers.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setSelectedBarber(b);
                          setStep(3);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 20,
                          padding: "24px 28px",
                          background: "rgba(255,255,255,0.025)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          cursor: "pointer",
                          transition: "all 0.25s",
                          textAlign: "left",
                          marginBottom: 10,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#f59e0b";
                          e.currentTarget.style.background =
                            "rgba(245,158,11,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor =
                            "rgba(255,255,255,0.07)";
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.025)";
                        }}
                      >
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            background: "#111",
                            border: "1px solid rgba(245,158,11,0.25)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              ...sf,
                              fontSize: 20,
                              color: "#f59e0b",
                              fontWeight: 900,
                            }}
                          >
                            {b.name.charAt(0)}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              ...sf,
                              fontSize: 13,
                              textTransform: "uppercase",
                              fontWeight: 700,
                              color: "white",
                              margin: "0 0 5px",
                            }}
                          >
                            {b.name}
                          </p>
                          {b.bio && (
                            <p
                              style={{
                                fontSize: 11,
                                color: "#52525b",
                                margin: 0,
                                lineHeight: 1.5,
                              }}
                            >
                              {b.bio}
                            </p>
                          )}
                        </div>
                        <span
                          style={{
                            ...sf,
                            fontSize: 8,
                            color: "#3f3f46",
                            textTransform: "uppercase",
                          }}
                        >
                          Select →
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* ── STEP 3: Schedule ── */}
              {step === 3 && (
                <div>
                  {/* Service + barber recap */}
                  <div
                    style={{
                      marginBottom: 24,
                      padding: "14px 20px",
                      background: "rgba(245,158,11,0.05)",
                      border: "1px solid rgba(245,158,11,0.12)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <span
                        style={{
                          ...sf,
                          fontSize: 9,
                          textTransform: "uppercase",
                          color: "#f59e0b",
                        }}
                      >
                        {selectedService?.name}
                      </span>
                      <span
                        style={{
                          ...sf,
                          fontSize: 9,
                          textTransform: "uppercase",
                          color: "#52525b",
                        }}
                      >
                        ✂ {selectedBarber?.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      style={{
                        ...sf,
                        fontSize: 7,
                        color: "#52525b",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textTransform: "uppercase",
                        letterSpacing: "0.15em",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#f59e0b")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "#52525b")
                      }
                    >
                      Change
                    </button>
                  </div>

                  {/* Date picker — visual calendar */}
                  <div style={{ marginBottom: 28 }}>
                    <label
                      style={{
                        ...sf,
                        fontSize: 7,
                        letterSpacing: "0.3em",
                        color: "#52525b",
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: 10,
                      }}
                    >
                      Select Date
                    </label>
                    {/* v2 — visual calendar */}
                    <BookingCalendar
                      selectedDate={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setSelectedTime("");
                      }}
                    />
                  </div>

                  {/* Available time slots */}
                  {selectedDate && (
                    <div style={{ marginBottom: 28 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 12,
                        }}
                      >
                        <label
                          style={{
                            ...sf,
                            fontSize: 7,
                            letterSpacing: "0.3em",
                            color: "#52525b",
                            textTransform: "uppercase",
                          }}
                        >
                          Available Times
                        </label>
                        {selectedDate &&
                          !loadingSlots &&
                          !timeOff &&
                          availableSlots.length > 0 && (
                            <span
                              style={{
                                ...mono,
                                fontSize: 10,
                                color: "#3f3f46",
                              }}
                            >
                              {availableSlots.length} slot
                              {availableSlots.length !== 1 ? "s" : ""} open
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
                      />
                    </div>
                  )}

                  {!selectedDate && (
                    <div
                      style={{
                        padding: "20px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          ...sf,
                          fontSize: 7,
                          color: "#27272a",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                        }}
                      >
                        Pick a date to see available times
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setStep(4)}
                    disabled={!selectedDate || !selectedTime}
                    style={{
                      width: "100%",
                      padding: "18px",
                      background:
                        !selectedDate || !selectedTime ? "#111" : "white",
                      color:
                        !selectedDate || !selectedTime ? "#27272a" : "black",
                      ...sf,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      border:
                        !selectedDate || !selectedTime
                          ? "1px solid rgba(255,255,255,0.05)"
                          : "none",
                      cursor:
                        !selectedDate || !selectedTime
                          ? "not-allowed"
                          : "pointer",
                      transition: "all 0.25s",
                      marginTop: 8,
                    }}
                    onMouseEnter={(e) => {
                      if (selectedDate && selectedTime)
                        e.currentTarget.style.background = "#f59e0b";
                    }}
                    onMouseLeave={(e) => {
                      if (selectedDate && selectedTime)
                        e.currentTarget.style.background = "white";
                    }}
                  >
                    Review Booking →
                  </button>
                </div>
              )}

              {/* ── STEP 4: Confirm & Pay ── */}
              {step === 4 && (
                <div>
                  {/* Summary card */}
                  <div
                    style={{
                      border: "1px solid rgba(255,255,255,0.07)",
                      marginBottom: 24,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        background: "rgba(245,158,11,0.06)",
                        padding: "14px 20px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <span
                        style={{
                          ...sf,
                          fontSize: 8,
                          color: "#f59e0b",
                          textTransform: "uppercase",
                          letterSpacing: "0.3em",
                        }}
                      >
                        Booking Summary
                      </span>
                    </div>
                    {[
                      ["Service", selectedService?.name],
                      [
                        "Duration",
                        selectedService?.duration_minutes
                          ? `${selectedService.duration_minutes} min`
                          : "—",
                      ],
                      [
                        "Price",
                        `$${parseFloat(selectedService?.price || 0).toFixed(2)}`,
                      ],
                      ["Barber", selectedBarber?.name],
                      ["Date", fmtDateLong(selectedDate)],
                      ["Time", selectedTime],
                    ].map(([label, val]) => (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "14px 20px",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <span
                          style={{
                            ...sf,
                            fontSize: 8,
                            textTransform: "uppercase",
                            letterSpacing: "0.15em",
                            color: "#52525b",
                          }}
                        >
                          {label}
                        </span>
                        <span style={{ ...mono, fontSize: 12, color: "white" }}>
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Client notes / style request */}
                  <div style={{ marginBottom: 20 }}>
                    <p
                      style={{
                        ...sf,
                        fontSize: 7,
                        letterSpacing: "0.3em",
                        color: "#52525b",
                        textTransform: "uppercase",
                        marginBottom: 10,
                      }}
                    >
                      Style Request (optional)
                    </p>
                    <textarea
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      placeholder="e.g. Low fade, leave length on top, lineup..."
                      rows={3}
                      style={{
                        width: "100%",
                        background: "#0a0a0a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        padding: "12px 14px",
                        color: "white",
                        fontSize: 14,
                        outline: "none",
                        fontFamily: "'DM Mono', monospace",
                        resize: "none",
                        lineHeight: 1.6,
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                      onBlur={(e) =>
                        (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                      }
                    />
                    <p
                      style={{
                        fontSize: 10,
                        color: "#27272a",
                        marginTop: 6,
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      Your barber will see this before your appointment
                    </p>
                  </div>

                  {/* Payment method selector */}
                  <div style={{ marginBottom: 24 }}>
                    <p
                      style={{
                        ...sf,
                        fontSize: 7,
                        letterSpacing: "0.3em",
                        color: "#52525b",
                        textTransform: "uppercase",
                        marginBottom: 12,
                      }}
                    >
                      Payment Method
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      {[
                        {
                          key: "online",
                          label: "Pay Online",
                          sub: "Stripe · Secure",
                          icon: "💳",
                        },
                        {
                          key: "shop",
                          label: "Pay In Shop",
                          sub: "Cash or card",
                          icon: "✂️",
                        },
                      ].map(({ key, label, sub, icon }) => {
                        const active = paymentMethod === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setPaymentMethod(key)}
                            style={{
                              padding: "16px 14px",
                              background: active
                                ? "rgba(245,158,11,0.08)"
                                : "rgba(255,255,255,0.02)",
                              border: `1px solid ${active ? "#f59e0b" : "rgba(255,255,255,0.07)"}`,
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              if (!active)
                                e.currentTarget.style.borderColor =
                                  "rgba(245,158,11,0.3)";
                            }}
                            onMouseLeave={(e) => {
                              if (!active)
                                e.currentTarget.style.borderColor =
                                  "rgba(255,255,255,0.07)";
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 4,
                              }}
                            >
                              <span style={{ fontSize: 14 }}>{icon}</span>
                              {active && (
                                <span
                                  style={{
                                    ...sf,
                                    fontSize: 6,
                                    color: "#f59e0b",
                                    letterSpacing: "0.15em",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Selected
                                </span>
                              )}
                            </div>
                            <p
                              style={{
                                ...sf,
                                fontSize: 9,
                                textTransform: "uppercase",
                                color: active ? "#f59e0b" : "white",
                                margin: "0 0 3px",
                              }}
                            >
                              {label}
                            </p>
                            <p
                              style={{
                                fontSize: 10,
                                color: "#3f3f46",
                                margin: 0,
                              }}
                            >
                              {sub}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p
                    style={{
                      ...sf,
                      fontSize: 7,
                      letterSpacing: "0.15em",
                      color: "#27272a",
                      textTransform: "uppercase",
                      textAlign: "center",
                      marginBottom: 18,
                    }}
                  >
                    {paymentMethod === "online"
                      ? "Redirecting to Stripe — secure checkout"
                      : "Appointment confirmed · Pay at the shop"}
                  </p>

                  {error && (
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "rgba(248,113,113,0.06)",
                        border: "1px solid rgba(248,113,113,0.2)",
                        marginBottom: 16,
                      }}
                    >
                      <p
                        style={{
                          ...sf,
                          fontSize: 8,
                          color: "#f87171",
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                          margin: 0,
                        }}
                      >
                        ⚠ {error}
                      </p>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => {
                        setStep(3);
                        setError("");
                      }}
                      style={{
                        flex: 1,
                        padding: "16px",
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#71717a",
                        ...sf,
                        fontSize: 8,
                        textTransform: "uppercase",
                        letterSpacing: "0.15em",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.3)";
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.1)";
                        e.currentTarget.style.color = "#71717a";
                      }}
                    >
                      ← Edit
                    </button>
                    <button
                      onClick={handlePay}
                      disabled={submitting}
                      style={{
                        flex: 2,
                        padding: "16px",
                        background: submitting ? "#111" : "#f59e0b",
                        color: submitting ? "#27272a" : "black",
                        ...sf,
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                        border: "none",
                        cursor: submitting ? "not-allowed" : "pointer",
                        transition: "all 0.25s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                      }}
                      onMouseEnter={(e) => {
                        if (!submitting)
                          e.currentTarget.style.background = "white";
                      }}
                      onMouseLeave={(e) => {
                        if (!submitting)
                          e.currentTarget.style.background = "#f59e0b";
                      }}
                    >
                      {submitting ? (
                        <>
                          <span
                            style={{
                              width: 13,
                              height: 13,
                              border: "2px solid #27272a",
                              borderTopColor: "#52525b",
                              borderRadius: "50%",
                              display: "inline-block",
                              animation: "spin 0.7s linear infinite",
                            }}
                          />
                          Processing...
                        </>
                      ) : paymentMethod === "shop" ? (
                        "Book It →"
                      ) : (
                        "Pay & Lock It In →"
                      )}
                    </button>
                  </div>
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
  return (
    <AuthGuard>
      <BookContent />
    </AuthGuard>
  );
}
