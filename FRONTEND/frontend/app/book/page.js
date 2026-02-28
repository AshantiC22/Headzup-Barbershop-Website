"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { gsap } from "gsap";
import API from "@/lib/api";
import useBreakpoint from "@/lib/useBreakpoint";
import AuthGuard from "@/lib/AuthGuard";
import LoadingScreen from "@/lib/LoadingScreen";

// ── Date validation helpers ───────────────────────────────────────────────────
function isSunday(dateStr) {
  return new Date(dateStr + "T00:00:00").getDay() === 0;
}

function isPastDate(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T00:00:00") < today;
}

function isTimeSlotPast(dateStr, timeSlot) {
  // If the date is today, grey out slots that are in the past (+ 1hr buffer)
  const today = new Date().toISOString().split("T")[0];
  if (dateStr !== today) return false;
  const [time, mod] = timeSlot.split(" ");
  let [h, m] = time.split(":");
  if (h === "12") h = "00";
  if (mod === "PM") h = String(parseInt(h) + 12);
  const slotTime = new Date();
  slotTime.setHours(parseInt(h), parseInt(m), 0, 0);
  const now = new Date();
  now.setHours(now.getHours() + 1); // 1-hour buffer
  return slotTime <= now;
}

// Min selectable date = today  Max = 60 days out
function getMinDate() {
  return new Date().toISOString().split("T")[0];
}
function getMaxDate() {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString().split("T")[0];
}

const TIME_SLOTS = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
];

function to24Hour(t) {
  const [time, mod] = t.split(" ");
  let [h, m] = time.split(":");
  if (h === "12") h = "00";
  if (mod === "PM") h = String(parseInt(h) + 12);
  return `${h.padStart(2, "0")}:${m}:00`;
}

function BookContent() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const [pageReady, setPageReady] = useState(false);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(""); // "online" | "shop"
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Particles
  useEffect(() => {
    if (!pageReady) return;
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
    const vertices = [];
    for (let i = 0; i < 1800; i++) {
      vertices.push(THREE.MathUtils.randFloatSpread(10));
      vertices.push(THREE.MathUtils.randFloatSpread(10));
      vertices.push(THREE.MathUtils.randFloatSpread(10));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.007,
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.2,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    camera.position.z = 3;
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      points.rotation.y += 0.0006;
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
  }, [pageReady]);

  useEffect(() => {
    if (pageReady)
      gsap.from(".book-enter", {
        y: 50,
        opacity: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: "expo.out",
      });
  }, [pageReady]);

  useEffect(() => {
    if (pageReady)
      gsap.from(".step-content > *", {
        x: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.07,
        ease: "expo.out",
      });
  }, [step, pageReady]);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, b] = await Promise.all([
          API.get("services/"),
          API.get("barbers/"),
        ]);
        setServices(s.data);
        setBarbers(b.data);
      } catch {
        setDataError("Could not load booking data. Please try again.");
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  // Fetch already-booked slots whenever barber or date changes
  useEffect(() => {
    if (!selectedBarber || !selectedDate) {
      setBookedSlots([]);
      return;
    }
    const fetch_slots = async () => {
      try {
        const res = await API.get(
          `available-slots/?barber=${selectedBarber.id}&date=${selectedDate}`,
        );
        setBookedSlots(res.data.booked || []);
      } catch {
        setBookedSlots([]);
      }
    };
    fetch_slots();
  }, [selectedBarber, selectedDate]);

  // Pay in shop — creates appointment directly, no Stripe
  const handlePayInShop = async () => {
    if (isSunday(selectedDate)) {
      setError("We're closed on Sundays.");
      return;
    }
    if (isPastDate(selectedDate)) {
      setError("You can't book a date in the past.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await API.post("appointments/", {
        service: selectedService.id,
        barber: selectedBarber.id,
        date: selectedDate,
        time: to24Hour(selectedTime),
      });
      // Pass data in URL so confirmation page renders instantly — no re-fetch needed
      const params = new URLSearchParams({
        service: selectedService.name,
        barber: selectedBarber.name,
        date: selectedDate,
        time: selectedTime,
      });
      router.push(`/booking-confirmed?${params.toString()}`);
    } catch (e) {
      const msg =
        e.response?.data?.detail ||
        e.response?.data?.non_field_errors?.[0] ||
        "Could not confirm booking. Please try again.";
      setError(msg);
      setSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    if (isSunday(selectedDate)) {
      setError("We're closed on Sundays.");
      return;
    }
    if (isPastDate(selectedDate)) {
      setError("You can't book a date in the past.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await API.post("create-checkout-session/", {
        service: selectedService.id,
        barber: selectedBarber.id,
        date: selectedDate,
        time: to24Hour(selectedTime),
      });
      window.location.href = res.data.url;
    } catch (e) {
      setError(
        e.response?.data?.error || "Payment setup failed. Please try again.",
      );
      setSubmitting(false);
    }
  };

  const sf = { fontFamily: "'Syncopate', sans-serif" };
  const { isMobile, isTablet } = useBreakpoint();
  const STEPS = ["Service", "Barber", "Schedule", "Confirm"];

  // Step heading text — bright white, never dim
  const stepHeadings = [
    { pre: "Choose Your", highlight: "Service_" },
    { pre: "Pick Your", highlight: "Barber_" },
    { pre: "Set The", highlight: "Schedule_" },
    { pre: "Confirm &", highlight: "Pay_" },
  ];

  return (
    <>
      <LoadingScreen onComplete={() => setPageReady(true)} />

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Inter:wght@400;900&display=swap");
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          background: #050505;
          color: white;
          font-family: "Inter", sans-serif;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.4;
          cursor: pointer;
        }
        input[type="date"] {
          color-scheme: dark;
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

      {pageReady && (
        <>
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
                "url('https://grainy-gradients.vercel.app/noise.svg')",
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
              background: `radial-gradient(ellipse at ${step * 25}% 40%, rgba(245,158,11,0.05) 0%, transparent 60%)`,
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
              className="hidden lg:flex"
              style={{
                width: 280,
                flexShrink: 0,
                borderRight: "1px solid rgba(255,255,255,0.06)",
                padding: "48px 32px",
                flexDirection: "column",
                justifyContent: "space-between",
                background: "rgba(0,0,0,0.4)",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginBottom: 48,
                  }}
                >
                  <a
                    href="/"
                    style={{
                      ...sf,
                      fontSize: 9,
                      letterSpacing: "0.2em",
                      color: "#71717a",
                      textDecoration: "none",
                      textTransform: "uppercase",
                      transition: "color 0.2s",
                      display: "block",
                    }}
                    onMouseEnter={(e) => (e.target.style.color = "#f59e0b")}
                    onMouseLeave={(e) => (e.target.style.color = "#71717a")}
                  >
                    ← Home
                  </a>
                  <a
                    href="/dashboard"
                    style={{
                      ...sf,
                      fontSize: 9,
                      letterSpacing: "0.2em",
                      color: "#71717a",
                      textDecoration: "none",
                      textTransform: "uppercase",
                      transition: "color 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#f59e0b")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#71717a")
                    }
                  >
                    ↗ My Dashboard
                  </a>
                </div>
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
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    UP
                  </span>
                </div>
                <p
                  style={{
                    ...sf,
                    fontSize: 8,
                    letterSpacing: "0.3em",
                    color: "#52525b",
                    textTransform: "uppercase",
                    marginBottom: 64,
                  }}
                >
                  Book Appointment
                </p>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  {STEPS.map((label, i) => {
                    const n = i + 1;
                    const done = step > n;
                    const active = step === n;
                    return (
                      <div
                        key={label}
                        onClick={() => done && setStep(n)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          padding: "16px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          cursor: done ? "pointer" : "default",
                          opacity: !active && !done ? 0.4 : 1,
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
                            <span
                              style={{
                                color: "black",
                                fontSize: 12,
                                fontWeight: 900,
                              }}
                            >
                              ✓
                            </span>
                          ) : (
                            <span
                              style={{
                                ...sf,
                                fontSize: 9,
                                color: active ? "#f59e0b" : "#a1a1aa",
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
                            color: active
                              ? "white"
                              : done
                                ? "#f59e0b"
                                : "#a1a1aa",
                          }}
                        >
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(selectedService || selectedBarber) && (
                <div
                  style={{
                    padding: 20,
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.15)",
                  }}
                >
                  <p
                    style={{
                      ...sf,
                      fontSize: 8,
                      letterSpacing: "0.3em",
                      color: "#71717a",
                      textTransform: "uppercase",
                      marginBottom: 12,
                    }}
                  >
                    Your Selection
                  </p>
                  {selectedService && (
                    <p
                      style={{
                        ...sf,
                        fontSize: 10,
                        textTransform: "uppercase",
                        marginBottom: 6,
                        color: "white",
                      }}
                    >
                      {selectedService.name}
                    </p>
                  )}
                  {selectedBarber && (
                    <p
                      style={{
                        ...sf,
                        fontSize: 9,
                        color: "#a1a1aa",
                        textTransform: "uppercase",
                      }}
                    >
                      with {selectedBarber.name}
                    </p>
                  )}
                  {selectedDate && (
                    <p
                      style={{
                        ...sf,
                        fontSize: 9,
                        color: "#f59e0b",
                        marginTop: 8,
                      }}
                    >
                      {selectedDate} · {selectedTime}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── MAIN CONTENT ── */}
            <div
              style={{
                flex: 1,
                padding: isMobile
                  ? "80px 16px 32px"
                  : isTablet
                    ? "48px 20px"
                    : "48px 32px",
                maxWidth: 720,
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
                  marginBottom: 40,
                }}
              >
                <a
                  href="/"
                  style={{
                    ...sf,
                    fontSize: 9,
                    color: "#a1a1aa",
                    textDecoration: "none",
                    textTransform: "uppercase",
                  }}
                >
                  ← Home
                </a>
                <div style={{ ...sf, fontWeight: 700, fontSize: 16 }}>
                  HEADZ
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    UP
                  </span>
                </div>
                <a
                  href="/dashboard"
                  style={{
                    ...sf,
                    fontSize: 9,
                    color: "#a1a1aa",
                    textDecoration: "none",
                    textTransform: "uppercase",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#f59e0b")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#a1a1aa")
                  }
                >
                  Dashboard ↗
                </a>
              </div>

              {/* Mobile step bar */}
              <div
                className="book-enter"
                style={{ display: "flex", gap: 4, marginBottom: 32 }}
              >
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    style={{
                      flex: 1,
                      height: 2,
                      background:
                        s <= step ? "#f59e0b" : "rgba(255,255,255,0.1)",
                      transition: "background 0.4s",
                    }}
                  />
                ))}
              </div>

              {/* ── STEP HEADING — fully bright, never dim ── */}
              <div className="book-enter" style={{ marginBottom: 40 }}>
                <p
                  style={{
                    ...sf,
                    fontSize: 9,
                    letterSpacing: "0.4em",
                    color: "#a1a1aa",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Step 0{step} of 04
                </p>
                <h1
                  style={{
                    ...sf,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    lineHeight: 1.05,
                    fontSize: "clamp(1.8rem, 4.5vw, 3rem)",
                    color: "white",
                  }}
                >
                  {stepHeadings[step - 1].pre}{" "}
                  <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                    {stepHeadings[step - 1].highlight}
                  </span>
                </h1>
              </div>

              {/* Error loading data */}
              {dataError && !loadingData && (
                <div
                  style={{
                    padding: 24,
                    border: "1px solid rgba(248,113,113,0.3)",
                    background: "rgba(248,113,113,0.05)",
                    marginBottom: 24,
                  }}
                >
                  <p
                    style={{
                      ...sf,
                      fontSize: 9,
                      color: "#f87171",
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                    }}
                  >
                    {dataError}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    style={{
                      marginTop: 12,
                      ...sf,
                      fontSize: 8,
                      color: "#f59e0b",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      textDecoration: "underline",
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {loadingData ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: 72,
                        background:
                          "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.5s infinite",
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="step-content">
                  {/* ══ STEP 1 — Service ══ */}
                  {step === 1 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {services.length === 0 ? (
                        <div
                          style={{
                            padding: 32,
                            border: "1px solid rgba(255,255,255,0.06)",
                            textAlign: "center",
                          }}
                        >
                          <p
                            style={{
                              ...sf,
                              fontSize: 10,
                              color: "#71717a",
                              textTransform: "uppercase",
                            }}
                          >
                            No services found.
                          </p>
                          <p
                            style={{
                              ...sf,
                              fontSize: 8,
                              color: "#52525b",
                              textTransform: "uppercase",
                              marginTop: 8,
                            }}
                          >
                            Add services in the Django admin panel.
                          </p>
                        </div>
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
                              padding: "20px 28px",
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              cursor: "pointer",
                              transition: "all 0.25s",
                              textAlign: "left",
                              width: "100%",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#f59e0b";
                              e.currentTarget.style.background =
                                "rgba(245,158,11,0.06)";
                              e.currentTarget.style.transform =
                                "translateX(4px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor =
                                "rgba(255,255,255,0.08)";
                              e.currentTarget.style.background =
                                "rgba(255,255,255,0.03)";
                              e.currentTarget.style.transform = "translateX(0)";
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 20,
                              }}
                            >
                              <span
                                style={{
                                  ...sf,
                                  fontSize: 10,
                                  color: "rgba(245,158,11,0.4)",
                                  fontWeight: 700,
                                  minWidth: 24,
                                }}
                              >
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <div>
                                <span
                                  style={{
                                    ...sf,
                                    fontSize: 12,
                                    textTransform: "uppercase",
                                    color: "white",
                                    fontWeight: 700,
                                    letterSpacing: "0.05em",
                                    display: "block",
                                  }}
                                >
                                  {svc.name}
                                </span>
                                {svc.duration && (
                                  <span
                                    style={{
                                      ...sf,
                                      fontSize: 8,
                                      color: "#52525b",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.1em",
                                      marginTop: 3,
                                      display: "block",
                                    }}
                                  >
                                    {svc.duration}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span
                              style={{
                                ...sf,
                                fontSize: 16,
                                color: "#f59e0b",
                                fontWeight: 900,
                                flexShrink: 0,
                                marginLeft: 16,
                              }}
                            >
                              ${parseFloat(svc.price).toFixed(2)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* ══ STEP 2 — Barber ══ */}
                  {step === 2 && (
                    <div>
                      <div
                        style={{
                          marginBottom: 24,
                          padding: "14px 20px",
                          background: "rgba(245,158,11,0.06)",
                          border: "1px solid rgba(245,158,11,0.2)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            ...sf,
                            fontSize: 11,
                            textTransform: "uppercase",
                            color: "#f59e0b",
                            fontWeight: 700,
                          }}
                        >
                          {selectedService?.name}
                        </span>
                        <button
                          onClick={() => setStep(1)}
                          style={{
                            ...sf,
                            fontSize: 8,
                            color: "#a1a1aa",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            transition: "color 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.target.style.color = "#f59e0b")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.color = "#a1a1aa")
                          }
                        >
                          Change ↩
                        </button>
                      </div>
                      {barbers.length === 0 ? (
                        <p
                          style={{
                            ...sf,
                            fontSize: 10,
                            color: "#71717a",
                            textTransform: "uppercase",
                          }}
                        >
                          No barbers found. Add them in Django admin.
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
                              gap: 24,
                              padding: "24px 28px",
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              cursor: "pointer",
                              transition: "all 0.25s",
                              textAlign: "left",
                              marginBottom: 10,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#f59e0b";
                              e.currentTarget.style.background =
                                "rgba(245,158,11,0.06)";
                              e.currentTarget.style.transform =
                                "translateX(4px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor =
                                "rgba(255,255,255,0.08)";
                              e.currentTarget.style.background =
                                "rgba(255,255,255,0.03)";
                              e.currentTarget.style.transform = "translateX(0)";
                            }}
                          >
                            <div
                              style={{
                                width: 56,
                                height: 56,
                                background: "#18181b",
                                border: "1px solid rgba(245,158,11,0.4)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <span
                                style={{
                                  ...sf,
                                  fontSize: 22,
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
                                  fontSize: 15,
                                  textTransform: "uppercase",
                                  fontWeight: 700,
                                  color: "white",
                                  marginBottom: 6,
                                  letterSpacing: "0.05em",
                                }}
                              >
                                {b.name}
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <div
                                  style={{
                                    width: 6,
                                    height: 6,
                                    background: "#22c55e",
                                    borderRadius: "50%",
                                    boxShadow: "0 0 6px rgba(34,197,94,0.8)",
                                  }}
                                />
                                <span
                                  style={{
                                    ...sf,
                                    fontSize: 8,
                                    color: "#4ade80",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.2em",
                                  }}
                                >
                                  Available Now
                                </span>
                              </div>
                            </div>
                            <span
                              style={{
                                ...sf,
                                fontSize: 9,
                                color: "#52525b",
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                              }}
                            >
                              Select →
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* ══ STEP 3 — Date & Time ══ */}
                  {step === 3 && (
                    <div>
                      <div
                        style={{
                          marginBottom: 24,
                          padding: "14px 20px",
                          background: "rgba(245,158,11,0.06)",
                          border: "1px solid rgba(245,158,11,0.2)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 16,
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              ...sf,
                              fontSize: 10,
                              textTransform: "uppercase",
                              color: "#f59e0b",
                              fontWeight: 700,
                            }}
                          >
                            {selectedService?.name}
                          </span>
                          <span
                            style={{
                              color: "rgba(255,255,255,0.2)",
                              fontSize: 12,
                            }}
                          >
                            |
                          </span>
                          <span
                            style={{
                              ...sf,
                              fontSize: 10,
                              textTransform: "uppercase",
                              color: "#a1a1aa",
                            }}
                          >
                            w/ {selectedBarber?.name}
                          </span>
                        </div>
                        <button
                          onClick={() => setStep(2)}
                          style={{
                            ...sf,
                            fontSize: 8,
                            color: "#a1a1aa",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            transition: "color 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.target.style.color = "#f59e0b")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.color = "#a1a1aa")
                          }
                        >
                          Change ↩
                        </button>
                      </div>

                      {/* ── CALENDAR ── */}
                      <CalendarPicker
                        selectedDate={selectedDate}
                        onSelect={(d) => {
                          setError("");
                          setSelectedDate(d);
                          setSelectedTime("");
                        }}
                        onError={setError}
                        sf={sf}
                      />

                      <div style={{ marginBottom: 32 }}>
                        <label
                          style={{
                            ...sf,
                            fontSize: 8,
                            letterSpacing: "0.3em",
                            color: "#a1a1aa",
                            textTransform: "uppercase",
                            display: "block",
                            marginBottom: 12,
                          }}
                        >
                          Available Times
                        </label>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile
                              ? "repeat(3, 1fr)"
                              : "repeat(4, 1fr)",
                            gap: isMobile ? 6 : 8,
                          }}
                        >
                          {TIME_SLOTS.map((slot) => {
                            // Convert "9:00 AM" → "09:00" for comparison
                            const [time, mod] = slot.split(" ");
                            let [h, m] = time.split(":");
                            if (h === "12") h = "00";
                            if (mod === "PM") h = String(parseInt(h) + 12);
                            const slotKey = `${h.padStart(2, "0")}:${m}`;
                            const isBooked = bookedSlots.includes(slotKey);
                            const isSelected = selectedTime === slot;
                            return (
                              <button
                                key={slot}
                                onClick={() =>
                                  !isBooked && setSelectedTime(slot)
                                }
                                disabled={isBooked}
                                title={isBooked ? "Already booked" : ""}
                                style={{
                                  padding: "12px 4px",
                                  ...sf,
                                  fontSize: 9,
                                  letterSpacing: "0.05em",
                                  textTransform: "uppercase",
                                  border: `1px solid ${isSelected ? "#f59e0b" : isBooked ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.08)"}`,
                                  background: isSelected
                                    ? "rgba(245,158,11,0.12)"
                                    : "transparent",
                                  color: isSelected
                                    ? "#f59e0b"
                                    : isBooked
                                      ? "#3f3f46"
                                      : "#d4d4d8",
                                  cursor: isBooked ? "not-allowed" : "pointer",
                                  textDecoration: isBooked
                                    ? "line-through"
                                    : "none",
                                  transition: "all 0.2s",
                                  position: "relative",
                                }}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => setStep(4)}
                        disabled={!selectedDate || !selectedTime}
                        style={{
                          width: "100%",
                          padding: "20px",
                          background: "white",
                          color: "black",
                          ...sf,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          border: "none",
                          cursor:
                            !selectedDate || !selectedTime
                              ? "not-allowed"
                              : "pointer",
                          opacity: !selectedDate || !selectedTime ? 0.3 : 1,
                          transition: "all 0.3s",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedDate && selectedTime)
                            e.target.style.background = "#f59e0b";
                        }}
                        onMouseLeave={(e) => {
                          if (selectedDate && selectedTime)
                            e.target.style.background = "white";
                        }}
                      >
                        Review Booking →
                      </button>
                    </div>
                  )}

                  {/* ══ STEP 4 — Confirm ══ */}
                  {step === 4 && (
                    <div>
                      {/* Booking summary */}
                      <div
                        style={{
                          border: "1px solid rgba(255,255,255,0.08)",
                          marginBottom: 28,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            background: "rgba(245,158,11,0.08)",
                            padding: "14px 24px",
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <span
                            style={{
                              ...sf,
                              fontSize: 9,
                              color: "#f59e0b",
                              textTransform: "uppercase",
                              letterSpacing: "0.3em",
                              fontWeight: 700,
                            }}
                          >
                            Booking Summary
                          </span>
                        </div>
                        {[
                          ["Service", selectedService?.name],
                          [
                            "Price",
                            `$${parseFloat(selectedService?.price || 0).toFixed(2)}`,
                          ],
                          ["Barber", selectedBarber?.name],
                          ["Date", selectedDate],
                          ["Time", selectedTime],
                        ].map(([label, val]) => (
                          <div
                            key={label}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "16px 24px",
                              borderBottom: "1px solid rgba(255,255,255,0.04)",
                            }}
                          >
                            <span
                              style={{
                                ...sf,
                                fontSize: 9,
                                textTransform: "uppercase",
                                letterSpacing: "0.2em",
                                color: "#a1a1aa",
                              }}
                            >
                              {label}
                            </span>
                            <span
                              style={{
                                ...sf,
                                fontSize: 12,
                                fontWeight: 700,
                                color: "white",
                              }}
                            >
                              {val}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* ── Payment method choice ── */}
                      <div style={{ marginBottom: 28 }}>
                        <p
                          style={{
                            ...sf,
                            fontSize: 8,
                            letterSpacing: "0.4em",
                            color: "#a1a1aa",
                            textTransform: "uppercase",
                            marginBottom: 16,
                          }}
                        >
                          How Would You Like To Pay?
                        </p>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                          }}
                        >
                          {[
                            {
                              key: "online",
                              icon: "💳",
                              title: "Pay Now Online",
                              sub: "Secure checkout via Stripe — card required",
                              badge: null,
                            },
                            {
                              key: "shop",
                              icon: "✂️",
                              title: "Pay In The Shop",
                              sub: "Cash or card when you arrive — no charge today",
                              badge: "Most Popular",
                            },
                          ].map((opt) => {
                            const active = paymentMethod === opt.key;
                            return (
                              <button
                                key={opt.key}
                                onClick={() => setPaymentMethod(opt.key)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 20,
                                  padding: "20px 24px",
                                  textAlign: "left",
                                  width: "100%",
                                  background: active
                                    ? "rgba(245,158,11,0.08)"
                                    : "rgba(255,255,255,0.02)",
                                  border: `1px solid ${active ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                  position: "relative",
                                }}
                                onMouseEnter={(e) => {
                                  if (!active) {
                                    e.currentTarget.style.borderColor =
                                      "rgba(245,158,11,0.4)";
                                    e.currentTarget.style.background =
                                      "rgba(245,158,11,0.04)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!active) {
                                    e.currentTarget.style.borderColor =
                                      "rgba(255,255,255,0.08)";
                                    e.currentTarget.style.background =
                                      "rgba(255,255,255,0.02)";
                                  }
                                }}
                              >
                                {/* Radio dot */}
                                <div
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: "50%",
                                    flexShrink: 0,
                                    border: `2px solid ${active ? "#f59e0b" : "rgba(255,255,255,0.2)"}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "all 0.2s",
                                  }}
                                >
                                  {active && (
                                    <div
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: "#f59e0b",
                                      }}
                                    />
                                  )}
                                </div>

                                {/* Icon */}
                                <span style={{ fontSize: 22, flexShrink: 0 }}>
                                  {opt.icon}
                                </span>

                                {/* Text */}
                                <div style={{ flex: 1 }}>
                                  <p
                                    style={{
                                      ...sf,
                                      fontSize: 11,
                                      textTransform: "uppercase",
                                      fontWeight: 700,
                                      color: active ? "#f59e0b" : "white",
                                      margin: 0,
                                      letterSpacing: "0.05em",
                                    }}
                                  >
                                    {opt.title}
                                  </p>
                                  <p
                                    style={{
                                      fontSize: 11,
                                      color: "#71717a",
                                      margin: "4px 0 0",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {opt.sub}
                                  </p>
                                </div>

                                {/* Badge */}
                                {opt.badge && (
                                  <span
                                    style={{
                                      ...sf,
                                      fontSize: 7,
                                      letterSpacing: "0.15em",
                                      textTransform: "uppercase",
                                      background: "rgba(34,197,94,0.15)",
                                      color: "#4ade80",
                                      border: "1px solid rgba(34,197,94,0.3)",
                                      padding: "4px 8px",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {opt.badge}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pay in shop note */}
                      {paymentMethod === "shop" && (
                        <div
                          style={{
                            marginBottom: 20,
                            padding: "14px 18px",
                            background: "rgba(34,197,94,0.06)",
                            border: "1px solid rgba(34,197,94,0.2)",
                            display: "flex",
                            gap: 12,
                            alignItems: "flex-start",
                          }}
                        >
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              background: "#4ade80",
                              borderRadius: "50%",
                              marginTop: 4,
                              flexShrink: 0,
                              boxShadow: "0 0 6px rgba(74,222,128,0.6)",
                            }}
                          />
                          <p
                            style={{
                              fontSize: 11,
                              color: "#a1a1aa",
                              margin: 0,
                              lineHeight: 1.6,
                            }}
                          >
                            Your slot will be{" "}
                            <span style={{ color: "white" }}>
                              reserved immediately
                            </span>
                            . Please arrive on time — slots held for{" "}
                            <span style={{ color: "white" }}>15 minutes</span>{" "}
                            past your appointment time.
                          </p>
                        </div>
                      )}

                      {/* Pay online note */}
                      {paymentMethod === "online" && (
                        <div
                          style={{
                            marginBottom: 20,
                            padding: "14px 18px",
                            background: "rgba(245,158,11,0.05)",
                            border: "1px solid rgba(245,158,11,0.15)",
                            display: "flex",
                            gap: 12,
                            alignItems: "flex-start",
                          }}
                        >
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              background: "#f59e0b",
                              borderRadius: "50%",
                              marginTop: 4,
                              flexShrink: 0,
                            }}
                          />
                          <p
                            style={{
                              fontSize: 11,
                              color: "#a1a1aa",
                              margin: 0,
                              lineHeight: 1.6,
                            }}
                          >
                            You'll be redirected to{" "}
                            <span style={{ color: "white" }}>
                              Stripe's secure checkout
                            </span>
                            . Your appointment is confirmed once payment is
                            complete.
                          </p>
                        </div>
                      )}

                      {error && (
                        <div
                          style={{
                            marginBottom: 16,
                            padding: "12px 16px",
                            background: "rgba(248,113,113,0.08)",
                            border: "1px solid rgba(248,113,113,0.25)",
                          }}
                        >
                          <p
                            style={{
                              color: "#f87171",
                              ...sf,
                              fontSize: 8,
                              textTransform: "uppercase",
                              letterSpacing: "0.15em",
                              margin: 0,
                            }}
                          >
                            {error}
                          </p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: isMobile ? "column" : "row",
                          gap: 12,
                        }}
                      >
                        <button
                          onClick={() => {
                            setStep(3);
                            setPaymentMethod("");
                          }}
                          style={{
                            flex: 1,
                            padding: "18px",
                            background: "transparent",
                            border: "1px solid rgba(255,255,255,0.15)",
                            color: "#d4d4d8",
                            ...sf,
                            fontSize: 9,
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor =
                              "rgba(255,255,255,0.5)";
                            e.currentTarget.style.color = "white";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor =
                              "rgba(255,255,255,0.15)";
                            e.currentTarget.style.color = "#d4d4d8";
                          }}
                        >
                          ← Edit
                        </button>

                        {/* Confirm button — changes based on selection */}
                        <button
                          onClick={
                            paymentMethod === "online"
                              ? handleCheckout
                              : handlePayInShop
                          }
                          disabled={!paymentMethod || submitting}
                          style={{
                            flex: 2,
                            padding: "18px",
                            background: !paymentMethod
                              ? "#27272a"
                              : submitting
                                ? "#52525b"
                                : paymentMethod === "online"
                                  ? "#f59e0b"
                                  : "white",
                            color:
                              !paymentMethod || submitting
                                ? "#71717a"
                                : "black",
                            ...sf,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            border: "none",
                            cursor:
                              !paymentMethod || submitting
                                ? "not-allowed"
                                : "pointer",
                            transition: "all 0.3s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 10,
                          }}
                          onMouseEnter={(e) => {
                            if (paymentMethod && !submitting)
                              e.currentTarget.style.background = "#f59e0b";
                          }}
                          onMouseLeave={(e) => {
                            if (paymentMethod && !submitting)
                              e.currentTarget.style.background =
                                paymentMethod === "online"
                                  ? "#f59e0b"
                                  : "white";
                          }}
                        >
                          {submitting ? (
                            <>
                              <span
                                style={{
                                  width: 14,
                                  height: 14,
                                  border: "2px solid #71717a",
                                  borderTopColor: "transparent",
                                  borderRadius: "50%",
                                  display: "inline-block",
                                  animation: "spin 0.7s linear infinite",
                                }}
                              />
                              {paymentMethod === "online"
                                ? "Redirecting..."
                                : "Confirming..."}
                            </>
                          ) : !paymentMethod ? (
                            "Select Payment Method"
                          ) : paymentMethod === "online" ? (
                            "Pay Now via Stripe →"
                          ) : (
                            "Confirm & Reserve Slot →"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── CalendarPicker ─────────────────────────────────────────────────────────────
function CalendarPicker({ selectedDate, onSelect, onError, sf }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 60);

  // Calendar view state — month/year shown
  const [viewYear, setViewYear] = React.useState(today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(today.getMonth()); // 0-indexed

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

  // Build calendar grid for viewMonth/viewYear
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  const getStatus = (day) => {
    if (!day) return "empty";
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    if (d < today) return "past";
    if (d > maxDate) return "far";
    if (d.getDay() === 0) return "sunday";
    return "available";
  };

  const toISO = (day) => {
    const m = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${viewYear}-${m}-${dd}`;
  };

  const handleClick = (day) => {
    const status = getStatus(day);
    if (status === "past") {
      onError("You can\'t book a past date.");
      return;
    }
    if (status === "far") {
      onError("Bookings open up to 60 days in advance.");
      return;
    }
    if (status === "sunday") {
      onError("We\'re closed on Sundays. Please pick another day.");
      return;
    }
    if (status === "available") {
      onError("");
      onSelect(toISO(day));
    }
  };

  // Check if month nav should be disabled
  const canGoPrev = !(
    viewYear === today.getFullYear() && viewMonth === today.getMonth()
  );
  const canGoNext = new Date(viewYear, viewMonth + 1, 1) <= maxDate;

  return (
    <div style={{ marginBottom: 28 }}>
      <label
        style={{
          ...sf,
          fontSize: 8,
          letterSpacing: "0.3em",
          color: "#a1a1aa",
          textTransform: "uppercase",
          display: "block",
          marginBottom: 14,
        }}
      >
        Preferred Date
      </label>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.1)",
          background: "#0a0a0a",
          overflow: "hidden",
        }}
      >
        {/* Month nav header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            style={{
              width: 32,
              height: 32,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: canGoPrev ? "#a1a1aa" : "#2a2a2a",
              cursor: canGoPrev ? "pointer" : "default",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (canGoPrev) {
                e.currentTarget.style.borderColor = "#f59e0b";
                e.currentTarget.style.color = "#f59e0b";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = canGoPrev ? "#a1a1aa" : "#2a2a2a";
            }}
          >
            ‹
          </button>

          <p
            style={{
              ...sf,
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              margin: 0,
            }}
          >
            {MONTHS[viewMonth]}{" "}
            <span style={{ color: "#f59e0b" }}>{viewYear}</span>
          </p>

          <button
            onClick={nextMonth}
            disabled={!canGoNext}
            style={{
              width: 32,
              height: 32,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: canGoNext ? "#a1a1aa" : "#2a2a2a",
              cursor: canGoNext ? "pointer" : "default",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (canGoNext) {
                e.currentTarget.style.borderColor = "#f59e0b";
                e.currentTarget.style.color = "#f59e0b";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = canGoNext ? "#a1a1aa" : "#2a2a2a";
            }}
          >
            ›
          </button>
        </div>

        {/* Day-of-week labels */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            padding: "10px 12px 4px",
          }}
        >
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div
              key={d}
              style={{
                textAlign: "center",
                ...sf,
                fontSize: 7,
                letterSpacing: "0.2em",
                color: d === "Su" ? "#3f3f46" : "#52525b",
                padding: "4px 0",
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Date grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 2,
            padding: "4px 12px 14px",
          }}
        >
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const status = getStatus(day);
            const iso = toISO(day);
            const isSelected = selectedDate === iso;
            const isToday = iso === new Date().toISOString().split("T")[0];

            const bg = isSelected ? "#f59e0b" : "transparent";
            const color = isSelected
              ? "black"
              : status === "past" || status === "sunday" || status === "far"
                ? "#2d2d2d"
                : isToday
                  ? "#f59e0b"
                  : "#d4d4d8";
            const border = isSelected
              ? "1px solid #f59e0b"
              : isToday && !isSelected
                ? "1px solid rgba(245,158,11,0.35)"
                : "1px solid transparent";
            const cursor = status === "available" ? "pointer" : "default";

            return (
              <button
                key={iso}
                onClick={() => handleClick(day)}
                style={{
                  aspectRatio: "1/1",
                  background: bg,
                  border,
                  color,
                  cursor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontFamily: "'DM Mono',monospace",
                  fontWeight: isToday || isSelected ? 700 : 400,
                  transition: "all 0.15s",
                  borderRadius: 0,
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (status === "available" && !isSelected) {
                    e.currentTarget.style.background = "rgba(245,158,11,0.08)";
                    e.currentTarget.style.borderColor = "rgba(245,158,11,0.25)";
                    e.currentTarget.style.color = "#f59e0b";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = isToday
                      ? "rgba(245,158,11,0.35)"
                      : "transparent";
                    e.currentTarget.style.color = color;
                  }
                }}
              >
                {day}
                {isToday && !isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 3,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 3,
                      height: 3,
                      borderRadius: "50%",
                      background: "#f59e0b",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected date display */}
        {selectedDate && (
          <div
            style={{
              padding: "10px 18px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(245,158,11,0.04)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <p
              style={{
                ...sf,
                fontSize: 8,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#f59e0b",
                margin: 0,
              }}
            >
              {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                "en-US",
                { weekday: "long", month: "long", day: "numeric" },
              )}
            </p>
            <button
              onClick={() => {
                onSelect("");
                onError("");
              }}
              style={{
                ...sf,
                fontSize: 7,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#52525b",
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{ display: "flex", gap: 20, marginTop: 10, flexWrap: "wrap" }}
      >
        {[
          { color: "#f59e0b", label: "Today" },
          { color: "#d4d4d8", label: "Available" },
          { color: "#2d2d2d", label: "Unavailable" },
        ].map(({ color, label }) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
              }}
            />
            <span
              style={{
                ...sf,
                fontSize: 7,
                letterSpacing: "0.2em",
                color: "#52525b",
                textTransform: "uppercase",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <AuthGuard>
      <BookContent />
    </AuthGuard>
  );
}
