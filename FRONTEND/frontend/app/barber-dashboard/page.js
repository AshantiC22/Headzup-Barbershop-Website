"use client";

import MiniCalendar from "@/lib/MiniCalendar";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import API from "@/lib/api";
import useBreakpoint from "@/lib/useBreakpoint";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}
function fmtDate(d) {
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
function addDays(d, n) {
  const dt = new Date(d + "T00:00:00");
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split("T")[0];
}
function to24Hour(t) {
  const [time, mod] = t.split(" ");
  let [h, m] = time.split(":");
  if (h === "12") h = "00";
  if (mod === "PM") h = String(parseInt(h) + 12);
  return `${h.padStart(2, "0")}:${m}:00`;
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const HOURS = Array.from({ length: 19 }, (_, i) => {
  const h = Math.floor(i / 2) + 9;
  const m = i % 2 === 0 ? "00" : "30";
  return `${h.toString().padStart(2, "0")}:${m}`;
}).filter((t) => t <= "18:00");

const STATUS_CFG = {
  confirmed: {
    label: "Confirmed",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.1)",
    border: "rgba(74,222,128,0.25)",
  },
  completed: {
    label: "Completed",
    color: "#a1a1aa",
    bg: "rgba(161,161,170,0.08)",
    border: "rgba(161,161,170,0.2)",
  },
  no_show: {
    label: "No Show",
    color: "#f87171",
    bg: "rgba(248,113,113,0.08)",
    border: "rgba(248,113,113,0.2)",
  },
  cancelled: {
    label: "Cancelled",
    color: "#52525b",
    bg: "rgba(82,82,91,0.08)",
    border: "rgba(82,82,91,0.2)",
  },
};
const PAY_CFG = {
  online: {
    label: "Paid",
    color: "#fbbf24",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
  },
  shop: {
    label: "Pay In Shop",
    color: "#a1a1aa",
    bg: "rgba(161,161,170,0.06)",
    border: "rgba(161,161,170,0.15)",
  },
};

function Badge({ cfg }) {
  return (
    <span
      style={{
        fontFamily: "'Syncopate',sans-serif",
        fontSize: 7,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding: "4px 10px",
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

const sf = { fontFamily: "'Syncopate',sans-serif" };

// ── Reschedule modal ──────────────────────────────────────────────────────────
function RescheduleModal({ appt, onClose, onDone }) {
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const handle = async () => {
    if (!newDate || !newTime) {
      setErr("Pick both a date and time.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await API.patch(`barber/appointments/${appt.id}/`, {
        date: newDate,
        time: to24Hour(newTime),
      });
      setDone(true);
      setTimeout(() => {
        onDone(appt.id, newDate, to24Hour(newTime));
        onClose();
      }, 1600);
    } catch (e) {
      setErr(e.response?.data?.error || "That slot may already be booked.");
    } finally {
      setSaving(false);
    }
  };

  const slots = HOURS.map((h) => {
    const [hr, mn] = h.split(":");
    const hour = parseInt(hr);
    return `${hour % 12 || 12}:${mn} ${hour >= 12 ? "PM" : "AM"}`;
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#0a0a0a",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "32px 28px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {done ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#22c55e,#16a34a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="black"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p
              style={{
                ...sf,
                fontSize: 10,
                color: "#4ade80",
                textTransform: "uppercase",
                letterSpacing: "0.3em",
              }}
            >
              Rescheduled!
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  ...sf,
                  fontSize: 18,
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                Reschedule<span style={{ color: "#f59e0b" }}>_</span>
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  color: "#52525b",
                  cursor: "pointer",
                  ...sf,
                  fontSize: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
              >
                ✕ Close
              </button>
            </div>
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(245,158,11,0.05)",
                border: "1px solid rgba(245,158,11,0.15)",
                marginBottom: 24,
              }}
            >
              <p style={{ fontSize: 12, color: "#a1a1aa" }}>
                <span style={{ color: "white", fontWeight: 700 }}>
                  {appt.client}
                </span>{" "}
                · {appt.service}
                <br />
                <span style={{ color: "#f59e0b" }}>
                  {fmtTime(appt.time)} on {appt.date}
                </span>
              </p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  ...sf,
                  fontSize: 8,
                  letterSpacing: "0.3em",
                  color: "#a1a1aa",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: 10,
                }}
              >
                New Date
              </label>
              <input
                type="date"
                value={newDate}
                min={todayISO()}
                onChange={(e) => setNewDate(e.target.value)}
                style={{
                  width: "100%",
                  background: "#050505",
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "13px 16px",
                  color: "white",
                  fontSize: 14,
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                }
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  ...sf,
                  fontSize: 8,
                  letterSpacing: "0.3em",
                  color: "#a1a1aa",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: 10,
                }}
              >
                New Time
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,1fr)",
                  gap: 6,
                }}
              >
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setNewTime(slot)}
                    style={{
                      padding: "9px 4px",
                      ...sf,
                      fontSize: 7,
                      textTransform: "uppercase",
                      border: `1px solid ${newTime === slot ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                      background:
                        newTime === slot
                          ? "rgba(245,158,11,0.12)"
                          : "transparent",
                      color: newTime === slot ? "#f59e0b" : "#a1a1aa",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
            {err && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.25)",
                  marginBottom: 16,
                }}
              >
                <p
                  style={{
                    ...sf,
                    fontSize: 8,
                    color: "#f87171",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    margin: 0,
                  }}
                >
                  {err}
                </p>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#a1a1aa",
                  ...sf,
                  fontSize: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = "#a1a1aa";
                }}
              >
                Cancel
              </button>
              <button
                onClick={handle}
                disabled={!newDate || !newTime || saving}
                style={{
                  flex: 2,
                  padding: "14px",
                  background:
                    !newDate || !newTime || saving ? "#27272a" : "#f59e0b",
                  color: !newDate || !newTime || saving ? "#52525b" : "black",
                  ...sf,
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  border: "none",
                  cursor:
                    !newDate || !newTime || saving ? "not-allowed" : "pointer",
                  transition: "all 0.3s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {saving ? (
                  <>
                    <span
                      style={{
                        width: 11,
                        height: 11,
                        border: "2px solid #52525b",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Saving...
                  </>
                ) : (
                  "Confirm New Time →"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BarberDashboard() {
  const router = useRouter();
  const { isMobile } = useBreakpoint();

  const [barber, setBarber] = useState(null);
  const [activeTab, setActiveTab] = useState("schedule");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [schedule, setSchedule] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    paid_online: 0,
    pay_in_shop: 0,
    online_revenue: "0.00",
  });
  const [availability, setAvailability] = useState([]);
  const [timeOff, setTimeOff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [statusMenuId, setStatusMenuId] = useState(null);
  const [statusOverrides, setStatusOverrides] = useState({});
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Availability editor state
  const [editingDay, setEditingDay] = useState(null);
  const [editStart, setEditStart] = useState("09:00");
  const [editEnd, setEditEnd] = useState("18:00");
  const [editWorking, setEditWorking] = useState(true);
  const [savingAvail, setSavingAvail] = useState(false);

  // Time off state
  const [newTimeOffDate, setNewTimeOffDate] = useState("");
  const [newTimeOffReason, setNewTimeOffReason] = useState("");
  const [addingTimeOff, setAddingTimeOff] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Auth + load barber identity ─────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const res = await API.get("barber/me/");
        setBarber(res.data);
      } catch (e) {
        if (e.response?.status === 403 || e.response?.status === 401) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ── Load schedule ───────────────────────────────────────────────────────────
  const loadSchedule = useCallback(async () => {
    if (!barber) return;
    try {
      const res = await API.get(`barber/schedule/?date=${selectedDate}`);
      setSchedule(res.data.appointments);
      setSummary(res.data.summary);
      setStatusOverrides({});
    } catch {
      showToast("Could not load schedule.", "error");
    }
  }, [barber, selectedDate]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // ── Load availability ───────────────────────────────────────────────────────
  const loadAvailability = useCallback(async () => {
    if (!barber) return;
    try {
      const res = await API.get("barber/availability/");
      setAvailability(res.data);
    } catch {}
  }, [barber]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  // ── Load time off ───────────────────────────────────────────────────────────
  const loadTimeOff = useCallback(async () => {
    if (!barber) return;
    try {
      const res = await API.get("barber/time-off/");
      setTimeOff(res.data);
    } catch {}
  }, [barber]);

  useEffect(() => {
    if (activeTab === "timeoff") loadTimeOff();
  }, [activeTab, loadTimeOff]);

  // ── Entrance animation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && barber) {
      gsap.from(".bd-enter", {
        y: 30,
        opacity: 0,
        duration: 1,
        stagger: 0.08,
        ease: "expo.out",
      });
    }
  }, [loading, barber]);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    router.push("/login");
  };

  // ── Status change ───────────────────────────────────────────────────────────
  const handleStatusChange = async (apptId, newStatus) => {
    setStatusMenuId(null);
    setStatusOverrides((prev) => ({ ...prev, [apptId]: newStatus }));
    try {
      await API.patch(`barber/appointments/${apptId}/`, { status: newStatus });
      showToast(`Marked as ${STATUS_CFG[newStatus].label}`);
    } catch {
      setStatusOverrides((prev) => {
        const n = { ...prev };
        delete n[apptId];
        return n;
      });
      showToast("Could not update status.", "error");
    }
  };

  // ── Cancel appointment ──────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await API.delete(`barber/appointments/${cancelTarget.id}/`);
      setSchedule((prev) => prev.filter((a) => a.id !== cancelTarget.id));
      setSummary((prev) => ({ ...prev, total: prev.total - 1 }));
      setCancelTarget(null);
      showToast("Appointment cancelled.");
    } catch {
      showToast("Could not cancel.", "error");
    } finally {
      setCancelling(false);
    }
  };

  // ── Reschedule done ─────────────────────────────────────────────────────────
  const handleRescheduleDone = (apptId, newDate, newTime) => {
    if (newDate === selectedDate) {
      setSchedule((prev) =>
        prev.map((a) =>
          a.id === apptId ? { ...a, date: newDate, time: newTime } : a,
        ),
      );
    } else {
      setSchedule((prev) => prev.filter((a) => a.id !== apptId));
    }
    showToast("Appointment rescheduled.");
  };

  // ── Save availability for a day ─────────────────────────────────────────────
  const saveAvailability = async () => {
    if (editingDay === null) return;
    setSavingAvail(true);
    try {
      await API.post("barber/availability/", {
        day_of_week: editingDay,
        start_time: editWorking ? editStart : "09:00",
        end_time: editWorking ? editEnd : "18:00",
        is_working: editWorking,
      });
      await loadAvailability();
      setEditingDay(null);
      showToast("Availability saved.");
    } catch {
      showToast("Could not save.", "error");
    } finally {
      setSavingAvail(false);
    }
  };

  // ── Add time off ────────────────────────────────────────────────────────────
  const addTimeOff = async () => {
    if (!newTimeOffDate) return;
    setAddingTimeOff(true);
    try {
      await API.post("barber/time-off/", {
        date: newTimeOffDate,
        reason: newTimeOffReason,
      });
      setNewTimeOffDate("");
      setNewTimeOffReason("");
      await loadTimeOff();
      showToast("Day blocked off.");
    } catch {
      showToast("Could not add time off.", "error");
    } finally {
      setAddingTimeOff(false);
    }
  };

  const removeTimeOff = async (id) => {
    try {
      await API.delete(`barber/time-off/${id}/`);
      setTimeOff((prev) => prev.filter((t) => t.id !== id));
      showToast("Time off removed.");
    } catch {
      showToast("Could not remove.", "error");
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(todayISO(), i - 1),
  );

  if (loading)
    return (
      <div
        style={{
          background: "#050505",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <style jsx global>{`
          @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Inter:wght@400;700;900&display=swap");
          body {
            background: #050505;
            margin: 0;
          }
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
        <div
          style={{
            width: 32,
            height: 32,
            border: "2px solid rgba(245,158,11,0.3)",
            borderTopColor: "#f59e0b",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );

  if (!barber) return null;

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@400;500&family=Inter:wght@300;400;700;900&display=swap");
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
          font-family: "Inter", sans-serif;
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .appt-row {
          transition:
            border-color 0.2s,
            background 0.2s;
        }
        .appt-row:hover {
          border-color: rgba(245, 158, 11, 0.2) !important;
          background: rgba(245, 158, 11, 0.025) !important;
        }
        .tab-btn {
          transition: all 0.2s;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1) opacity(0.4);
          cursor: pointer;
        }
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1) opacity(0.4);
          cursor: pointer;
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.03,
          backgroundImage:
            "url('https://grainy-gradients.vercel.app/noise.svg')",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "30%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 700,
          height: 700,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 65%)",
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            padding: "13px 24px",
            background:
              toast.type === "success"
                ? "rgba(34,197,94,0.1)"
                : "rgba(248,113,113,0.1)",
            border: `1px solid ${toast.type === "success" ? "rgba(34,197,94,0.35)" : "rgba(248,113,113,0.35)"}`,
            backdropFilter: "blur(10px)",
            animation: "fadeUp 0.3s ease",
            whiteSpace: "nowrap",
          }}
        >
          <p
            style={{
              ...sf,
              fontSize: 8,
              color: toast.type === "success" ? "#4ade80" : "#f87171",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {toast.msg}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: isMobile ? "14px 16px" : "18px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(5,5,5,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              ...sf,
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: "-0.05em",
            }}
          >
            HEADZ
            <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
          </div>
          <div
            style={{
              width: 1,
              height: 16,
              background: "rgba(255,255,255,0.1)",
            }}
          />
          <span
            style={{
              ...sf,
              fontSize: 7,
              letterSpacing: "0.3em",
              color: "#f59e0b",
              textTransform: "uppercase",
            }}
          >
            {barber.name}
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            ...sf,
            fontSize: 8,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#52525b",
            background: "none",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "7px 14px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#f87171";
            e.currentTarget.style.color = "#f87171";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "#52525b";
          }}
        >
          Sign Out
        </button>
      </nav>

      {/* Main */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          padding: isMobile ? "72px 14px 48px" : "88px 28px 60px",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div className="bd-enter" style={{ marginBottom: 32 }}>
          <p
            style={{
              ...sf,
              fontSize: 8,
              letterSpacing: "0.5em",
              color: "#71717a",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Barber Portal
          </p>
          <h1
            style={{
              ...sf,
              fontSize: "clamp(1.8rem,4vw,2.8rem)",
              fontWeight: 900,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            Hey,{" "}
            <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
              {barber.name}_
            </span>
          </h1>
        </div>

        {/* Stats */}
        <div
          className="bd-enter"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",
            gap: 10,
            marginBottom: 32,
          }}
        >
          {[
            {
              label: "Today's Bookings",
              value: barber.today_count,
              accent: true,
            },
            {
              label: "Total All-Time",
              value: barber.total_count,
              accent: false,
            },
            {
              label: "Online Revenue",
              value: `$${summary.online_revenue}`,
              accent: false,
            },
            { label: "Pay In Shop", value: summary.pay_in_shop, accent: false },
          ].map(({ label, value, accent }) => (
            <div
              key={label}
              style={{
                padding: "20px 18px",
                background: accent
                  ? "rgba(245,158,11,0.08)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${accent ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"}`,
                transition: "all 0.25s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#f59e0b";
                e.currentTarget.style.background = "rgba(245,158,11,0.07)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = accent
                  ? "rgba(245,158,11,0.3)"
                  : "rgba(255,255,255,0.07)";
                e.currentTarget.style.background = accent
                  ? "rgba(245,158,11,0.08)"
                  : "rgba(255,255,255,0.03)";
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 7,
                  letterSpacing: "0.3em",
                  color: "#71717a",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                {label}
              </p>
              <p
                style={{
                  ...sf,
                  fontSize: 28,
                  fontWeight: 900,
                  color: accent ? "#f59e0b" : "white",
                  lineHeight: 1,
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div
          className="bd-enter"
          style={{
            display: "flex",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            marginBottom: 32,
          }}
        >
          {[
            { key: "schedule", label: "Schedule" },
            { key: "availability", label: "My Hours" },
            { key: "timeoff", label: "Time Off" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="tab-btn"
              style={{
                padding: "14px 24px",
                ...sf,
                fontSize: 8,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${activeTab === key ? "#f59e0b" : "transparent"}`,
                color: activeTab === key ? "#f59e0b" : "#52525b",
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── SCHEDULE TAB ── */}
        {activeTab === "schedule" && (
          <>
            {/* Week strip */}
            <div
              className="bd-enter"
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 24,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setSelectedDate((d) => addDays(d, -7))}
                style={{
                  width: 34,
                  height: 34,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#71717a",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#f59e0b";
                  e.currentTarget.style.color = "#f59e0b";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = "#71717a";
                }}
              >
                ←
              </button>

              {(isMobile ? weekDays.slice(0, 5) : weekDays).map((day) => {
                const isToday = day === todayISO();
                const isSelected = day === selectedDate;
                const d = new Date(day + "T00:00:00");
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(day)}
                    style={{
                      flex: 1,
                      minWidth: 44,
                      padding: "9px 4px",
                      background: isSelected
                        ? "#f59e0b"
                        : isToday
                          ? "rgba(245,158,11,0.08)"
                          : "transparent",
                      border: `1px solid ${isSelected ? "#f59e0b" : isToday ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)"}`,
                      color: isSelected
                        ? "black"
                        : isToday
                          ? "#f59e0b"
                          : "#71717a",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.2s",
                    }}
                  >
                    <div
                      style={{
                        ...sf,
                        fontSize: 7,
                        textTransform: "uppercase",
                        marginBottom: 3,
                      }}
                    >
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div style={{ ...sf, fontSize: 15, fontWeight: 900 }}>
                      {d.getDate()}
                    </div>
                  </button>
                );
              })}

              <button
                onClick={() => setSelectedDate((d) => addDays(d, 7))}
                style={{
                  width: 34,
                  height: 34,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#71717a",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#f59e0b";
                  e.currentTarget.style.color = "#f59e0b";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = "#71717a";
                }}
              >
                →
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "8px 12px",
                  color: "white",
                  fontSize: 12,
                  outline: "none",
                  cursor: "pointer",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                }
              />

              {selectedDate !== todayISO() && (
                <button
                  onClick={() => setSelectedDate(todayISO())}
                  style={{
                    padding: "8px 14px",
                    ...sf,
                    fontSize: 7,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    background: "transparent",
                    border: "1px solid rgba(245,158,11,0.3)",
                    color: "#f59e0b",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(245,158,11,0.1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  Today
                </button>
              )}
            </div>

            {/* Date heading */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 10,
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                {fmtDate(selectedDate)}
                <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
                  {" "}
                  — {summary.total}{" "}
                  {summary.total === 1 ? "booking" : "bookings"}
                </span>
              </p>
              <button
                onClick={loadSchedule}
                style={{
                  ...sf,
                  fontSize: 7,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#52525b",
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.07)",
                  padding: "7px 13px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#f59e0b";
                  e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#52525b";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                }}
              >
                ↻ Refresh
              </button>
            </div>

            {/* Appointment rows */}
            {schedule.length === 0 ? (
              <div
                style={{
                  padding: "64px 0",
                  textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <p
                  style={{
                    ...sf,
                    fontSize: 26,
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.04)",
                    textTransform: "uppercase",
                    marginBottom: 14,
                  }}
                >
                  No Bookings
                </p>
                <p style={{ color: "#3f3f46", fontSize: 13 }}>
                  Nothing scheduled for this day.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {schedule.map((appt, i) => {
                  const currentStatus =
                    statusOverrides[appt.id] || appt.status || "confirmed";
                  const sCfg =
                    STATUS_CFG[currentStatus] || STATUS_CFG.confirmed;
                  const pCfg = PAY_CFG[appt.payment_method] || PAY_CFG.shop;
                  return (
                    <div
                      key={appt.id}
                      className="appt-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: isMobile ? 10 : 16,
                        padding: isMobile ? "13px 14px" : "18px 22px",
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        animation: "fadeUp 0.35s ease forwards",
                        animationDelay: `${i * 0.05}s`,
                        opacity: 0,
                        flexWrap: "wrap",
                        position: "relative",
                      }}
                    >
                      {/* Time */}
                      <div style={{ width: 58, flexShrink: 0 }}>
                        <p
                          style={{
                            fontFamily: "'DM Mono',monospace",
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#f59e0b",
                          }}
                        >
                          {fmtTime(appt.time)}
                        </p>
                        {appt.service_duration && (
                          <p
                            style={{
                              fontFamily: "'DM Mono',monospace",
                              fontSize: 9,
                              color: "#52525b",
                            }}
                          >
                            {appt.service_duration}min
                          </p>
                        )}
                      </div>
                      <div
                        style={{
                          width: 1,
                          height: 38,
                          background: "rgba(255,255,255,0.07)",
                          flexShrink: 0,
                        }}
                      />

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <p
                          style={{
                            ...sf,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            marginBottom: 4,
                          }}
                        >
                          {appt.client}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "2px 12px",
                          }}
                        >
                          <span style={{ fontSize: 11, color: "#a1a1aa" }}>
                            {appt.service}
                          </span>
                          {appt.service_price && (
                            <span
                              style={{
                                fontFamily: "'DM Mono',monospace",
                                fontSize: 11,
                                color: "#52525b",
                              }}
                            >
                              ${appt.service_price}
                            </span>
                          )}
                        </div>
                        {!isMobile && appt.client_email && (
                          <p
                            style={{
                              fontSize: 10,
                              color: "#3f3f46",
                              marginTop: 2,
                            }}
                          >
                            {appt.client_email}
                          </p>
                        )}
                      </div>

                      <Badge cfg={pCfg} />

                      {/* Status dropdown */}
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={() =>
                            setStatusMenuId(
                              statusMenuId === appt.id ? null : appt.id,
                            )
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            ...sf,
                            fontSize: 7,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            padding: "5px 10px",
                            background: sCfg.bg,
                            color: sCfg.color,
                            border: `1px solid ${sCfg.border}`,
                            cursor: "pointer",
                          }}
                        >
                          {sCfg.label}{" "}
                          <span style={{ fontSize: 8, opacity: 0.7 }}>▾</span>
                        </button>
                        {statusMenuId === appt.id && (
                          <div
                            style={{
                              position: "absolute",
                              top: "calc(100% + 4px)",
                              right: 0,
                              zIndex: 100,
                              background: "#0f0f0f",
                              border: "1px solid rgba(255,255,255,0.12)",
                              minWidth: 140,
                              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                            }}
                          >
                            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                              <button
                                key={key}
                                onClick={() => handleStatusChange(appt.id, key)}
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: "11px 14px",
                                  background:
                                    currentStatus === key
                                      ? "rgba(245,158,11,0.06)"
                                      : "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  transition: "background 0.15s",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background =
                                    "rgba(255,255,255,0.04)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background =
                                    currentStatus === key
                                      ? "rgba(245,158,11,0.06)"
                                      : "transparent")
                                }
                              >
                                <div
                                  style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: "50%",
                                    background: cfg.color,
                                    flexShrink: 0,
                                  }}
                                />
                                <span
                                  style={{
                                    ...sf,
                                    fontSize: 7,
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    color:
                                      currentStatus === key
                                        ? "#f59e0b"
                                        : "#a1a1aa",
                                  }}
                                >
                                  {cfg.label}
                                </span>
                                {currentStatus === key && (
                                  <span
                                    style={{
                                      marginLeft: "auto",
                                      fontSize: 10,
                                      color: "#f59e0b",
                                    }}
                                  >
                                    ✓
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => setRescheduleAppt(appt)}
                          style={{
                            width: 32,
                            height: 32,
                            background: "transparent",
                            border: "1px solid rgba(245,158,11,0.3)",
                            color: "#f59e0b",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(245,158,11,0.1)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                          title="Reschedule"
                        >
                          ↻
                        </button>
                        <button
                          onClick={() => setCancelTarget(appt)}
                          style={{
                            width: 32,
                            height: 32,
                            background: "transparent",
                            border: "1px solid rgba(248,113,113,0.25)",
                            color: "#52525b",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#f87171";
                            e.currentTarget.style.color = "#f87171";
                            e.currentTarget.style.background =
                              "rgba(248,113,113,0.08)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor =
                              "rgba(248,113,113,0.25)";
                            e.currentTarget.style.color = "#52525b";
                            e.currentTarget.style.background = "transparent";
                          }}
                          title="Cancel appointment"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── AVAILABILITY TAB ── */}
        {activeTab === "availability" && (
          <div className="bd-enter">
            <p
              style={{
                color: "#71717a",
                fontSize: 13,
                marginBottom: 28,
                lineHeight: 1.7,
              }}
            >
              Set which days you work and your start/end times. Clients can only
              book during these hours.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DAYS.map((dayName, dayIdx) => {
                const saved = availability.find(
                  (a) => a.day_of_week === dayIdx,
                );
                const isEditing = editingDay === dayIdx;
                const isWorking = saved?.is_working ?? dayIdx < 6;
                const isSunday = dayIdx === 6;

                return (
                  <div
                    key={dayIdx}
                    style={{
                      padding: "18px 22px",
                      background: "rgba(255,255,255,0.025)",
                      border: `1px solid ${isEditing ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.07)"}`,
                      transition: "all 0.2s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                        }}
                      >
                        <p
                          style={{
                            ...sf,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            minWidth: 100,
                          }}
                        >
                          {dayName}
                        </p>
                        {isSunday ? (
                          <span
                            style={{
                              ...sf,
                              fontSize: 7,
                              letterSpacing: "0.15em",
                              textTransform: "uppercase",
                              color: "#52525b",
                            }}
                          >
                            Closed (Shop Policy)
                          </span>
                        ) : saved ? (
                          <span
                            style={{
                              fontSize: 12,
                              color: isWorking ? "#a1a1aa" : "#52525b",
                            }}
                          >
                            {isWorking
                              ? `${fmtTime(saved.start_time)} — ${fmtTime(saved.end_time)}`
                              : "Day Off"}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "#52525b" }}>
                            Not set — defaults to 9AM–6PM
                          </span>
                        )}
                      </div>

                      {!isSunday && (
                        <button
                          onClick={() => {
                            if (isEditing) {
                              setEditingDay(null);
                              return;
                            }
                            setEditingDay(dayIdx);
                            setEditWorking(
                              saved ? saved.is_working : dayIdx < 6,
                            );
                            setEditStart(
                              saved?.start_time?.slice(0, 5) || "09:00",
                            );
                            setEditEnd(saved?.end_time?.slice(0, 5) || "18:00");
                          }}
                          style={{
                            ...sf,
                            fontSize: 8,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            padding: "7px 14px",
                            background: isEditing
                              ? "rgba(245,158,11,0.1)"
                              : "transparent",
                            border: `1px solid ${isEditing ? "#f59e0b" : "rgba(255,255,255,0.12)"}`,
                            color: isEditing ? "#f59e0b" : "#71717a",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          {isEditing ? "✕ Cancel" : "Edit"}
                        </button>
                      )}
                    </div>

                    {/* Edit panel */}
                    {isEditing && (
                      <div
                        style={{
                          marginTop: 20,
                          paddingTop: 20,
                          borderTop: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        {/* Working toggle */}
                        <div
                          style={{ display: "flex", gap: 8, marginBottom: 20 }}
                        >
                          {[
                            { val: true, label: "Working" },
                            { val: false, label: "Day Off" },
                          ].map(({ val, label }) => (
                            <button
                              key={label}
                              onClick={() => setEditWorking(val)}
                              style={{
                                flex: 1,
                                padding: "10px",
                                ...sf,
                                fontSize: 8,
                                textTransform: "uppercase",
                                letterSpacing: "0.15em",
                                background:
                                  editWorking === val
                                    ? "#f59e0b"
                                    : "transparent",
                                color:
                                  editWorking === val ? "black" : "#71717a",
                                border: `1px solid ${editWorking === val ? "#f59e0b" : "rgba(255,255,255,0.1)"}`,
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        {editWorking && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 16,
                              marginBottom: 20,
                            }}
                          >
                            {[
                              {
                                label: "Start Time",
                                val: editStart,
                                set: setEditStart,
                              },
                              {
                                label: "End Time",
                                val: editEnd,
                                set: setEditEnd,
                              },
                            ].map(({ label, val, set }) => (
                              <div key={label}>
                                <label
                                  style={{
                                    ...sf,
                                    fontSize: 7,
                                    letterSpacing: "0.3em",
                                    color: "#a1a1aa",
                                    textTransform: "uppercase",
                                    display: "block",
                                    marginBottom: 8,
                                  }}
                                >
                                  {label}
                                </label>
                                <input
                                  type="time"
                                  value={val}
                                  onChange={(e) => set(e.target.value)}
                                  style={{
                                    width: "100%",
                                    background: "#050505",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    padding: "11px 14px",
                                    color: "white",
                                    fontSize: 14,
                                    outline: "none",
                                  }}
                                  onFocus={(e) =>
                                    (e.target.style.borderColor = "#f59e0b")
                                  }
                                  onBlur={(e) =>
                                    (e.target.style.borderColor =
                                      "rgba(255,255,255,0.1)")
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={saveAvailability}
                          disabled={savingAvail}
                          style={{
                            padding: "14px 28px",
                            background: savingAvail ? "#27272a" : "#f59e0b",
                            color: savingAvail ? "#52525b" : "black",
                            ...sf,
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.2em",
                            border: "none",
                            cursor: savingAvail ? "not-allowed" : "pointer",
                            transition: "all 0.3s",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {savingAvail ? (
                            <>
                              <span
                                style={{
                                  width: 11,
                                  height: 11,
                                  border: "2px solid #52525b",
                                  borderTopColor: "transparent",
                                  borderRadius: "50%",
                                  display: "inline-block",
                                  animation: "spin 0.7s linear infinite",
                                }}
                              />
                              Saving...
                            </>
                          ) : (
                            "Save Hours →"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TIME OFF TAB ── */}
        {activeTab === "timeoff" && (
          <div className="bd-enter">
            <p
              style={{
                color: "#71717a",
                fontSize: 13,
                marginBottom: 28,
                lineHeight: 1.7,
              }}
            >
              Block off specific dates — vacation, sick days, personal time.
              Clients won't be able to book you on these days.
            </p>

            {/* Add time off */}
            <div
              style={{
                padding: "24px",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                marginBottom: 32,
              }}
            >
              <p
                style={{
                  ...sf,
                  fontSize: 8,
                  letterSpacing: "0.3em",
                  color: "#a1a1aa",
                  textTransform: "uppercase",
                  marginBottom: 20,
                }}
              >
                Block a Date
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr",
                  gap: 14,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      ...sf,
                      fontSize: 7,
                      letterSpacing: "0.3em",
                      color: "#71717a",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Date
                  </label>
                  <MiniCalendar
                    selected={newTimeOffDate}
                    onSelect={setNewTimeOffDate}
                    sf={sf}
                    blockSundays={false}
                  />
                </div>
                <div>
                  <label
                    style={{
                      ...sf,
                      fontSize: 7,
                      letterSpacing: "0.3em",
                      color: "#71717a",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Reason (optional)
                  </label>
                  <input
                    type="text"
                    value={newTimeOffReason}
                    onChange={(e) => setNewTimeOffReason(e.target.value)}
                    placeholder="Vacation, appointment, etc."
                    style={{
                      width: "100%",
                      background: "#050505",
                      border: "1px solid rgba(255,255,255,0.1)",
                      padding: "12px 14px",
                      color: "white",
                      fontSize: 14,
                      outline: "none",
                      fontFamily: "Inter,sans-serif",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                    }
                  />
                </div>
              </div>
              <button
                onClick={addTimeOff}
                disabled={!newTimeOffDate || addingTimeOff}
                style={{
                  padding: "13px 28px",
                  background:
                    !newTimeOffDate || addingTimeOff ? "#27272a" : "#f59e0b",
                  color: !newTimeOffDate || addingTimeOff ? "#52525b" : "black",
                  ...sf,
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  border: "none",
                  cursor:
                    !newTimeOffDate || addingTimeOff
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.3s",
                }}
              >
                {addingTimeOff ? "Adding..." : "Block This Date →"}
              </button>
            </div>

            {/* Upcoming time off list */}
            <p
              style={{
                ...sf,
                fontSize: 8,
                letterSpacing: "0.4em",
                color: "#52525b",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Upcoming Time Off
            </p>
            {timeOff.length === 0 ? (
              <div
                style={{
                  padding: "48px 0",
                  textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p
                  style={{
                    ...sf,
                    fontSize: 20,
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.04)",
                    textTransform: "uppercase",
                  }}
                >
                  None Scheduled
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {timeOff.map((off) => (
                  <div
                    key={off.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 20px",
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          ...sf,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          marginBottom: 4,
                        }}
                      >
                        {new Date(off.date + "T00:00:00").toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                      {off.reason && (
                        <p style={{ fontSize: 12, color: "#71717a" }}>
                          {off.reason}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeTimeOff(off.id)}
                      style={{
                        ...sf,
                        fontSize: 7,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        padding: "7px 14px",
                        background: "transparent",
                        border: "1px solid rgba(248,113,113,0.3)",
                        color: "#f87171",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(248,113,113,0.1)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside status menu */}
      {statusMenuId && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={() => setStatusMenuId(null)}
        />
      )}

      {/* Reschedule modal */}
      {rescheduleAppt && (
        <RescheduleModal
          appt={rescheduleAppt}
          onClose={() => setRescheduleAppt(null)}
          onDone={handleRescheduleDone}
        />
      )}

      {/* Cancel confirm modal */}
      {cancelTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,0.88)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              background: "#0a0a0a",
              border: "1px solid rgba(248,113,113,0.2)",
              padding: "32px 28px",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f87171"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <p
              style={{
                ...sf,
                fontSize: 7,
                color: "#52525b",
                letterSpacing: "0.4em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Cancel Appointment
            </p>
            <h2
              style={{
                ...sf,
                fontSize: 18,
                fontWeight: 900,
                textTransform: "uppercase",
                color: "white",
                marginBottom: 16,
              }}
            >
              Confirm<span style={{ color: "#f87171" }}>?</span>
            </h2>
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(248,113,113,0.05)",
                border: "1px solid rgba(248,113,113,0.15)",
                marginBottom: 20,
              }}
            >
              <p style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.7 }}>
                <span style={{ color: "white", fontWeight: 700 }}>
                  {cancelTarget.client}
                </span>
                <br />
                {cancelTarget.service} ·{" "}
                <span style={{ color: "#f87171" }}>
                  {fmtTime(cancelTarget.time)}
                </span>
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setCancelTarget(null)}
                style={{
                  flex: 1,
                  padding: "13px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#a1a1aa",
                  ...sf,
                  fontSize: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = "#a1a1aa";
                }}
              >
                Keep It
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  flex: 2,
                  padding: "13px",
                  background: cancelling ? "#27272a" : "#f87171",
                  color: cancelling ? "#52525b" : "black",
                  ...sf,
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  border: "none",
                  cursor: cancelling ? "not-allowed" : "pointer",
                  transition: "all 0.3s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {cancelling ? (
                  <>
                    <span
                      style={{
                        width: 11,
                        height: 11,
                        border: "2px solid #52525b",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Cancelling...
                  </>
                ) : (
                  "Yes, Cancel It"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
