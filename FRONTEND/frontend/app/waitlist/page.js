"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import API from "@/lib/api";

const sf = { fontFamily: "'Syncopate',sans-serif" };
const mono = { fontFamily: "'DM Mono',monospace" };
const A = "#f59e0b";
const T = {
  surface: "#0a0a0a",
  border: "rgba(255,255,255,0.08)",
  muted: "#71717a",
  dim: "#52525b",
};

function WaitlistContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-fill from query params (book page passes these when fully booked)
  const preBarber = searchParams.get("barber");
  const preDate = searchParams.get("date");
  const preService = searchParams.get("service");

  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [myEntries, setMyEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [barberId, setBarberId] = useState(preBarber || "");
  const [serviceId, setServiceId] = useState(preService || "");
  const [date, setDate] = useState(preDate || "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    Promise.all([
      API.get("barbers/"),
      API.get("services/"),
      API.get("waitlist/mine/").catch(() => ({ data: [] })),
    ])
      .then(([b, s, w]) => {
        setBarbers(Array.isArray(b.data) ? b.data : b.data.results || []);
        setServices(Array.isArray(s.data) ? s.data : s.data.results || []);
        setMyEntries(Array.isArray(w.data) ? w.data : []);
      })
      .catch(() => {
        setError("Could not load data. Please refresh.");
      })
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!barberId || !date) {
      setError("Please select a barber and date.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const r = await API.post("waitlist/join/", {
        barber_id: parseInt(barberId),
        service_id: serviceId ? parseInt(serviceId) : null,
        date,
        notes,
      });
      setSuccess(r.data.message);
      // Refresh my entries
      const w = await API.get("waitlist/mine/");
      setMyEntries(Array.isArray(w.data) ? w.data : []);
      setDate("");
      setNotes("");
    } catch (e) {
      setError(e.response?.data?.error || "Could not join waitlist.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (pk) => {
    setRemoving(pk);
    try {
      await API.delete(`waitlist/${pk}/`);
      setMyEntries((prev) => prev.filter((e) => e.id !== pk));
    } catch {
      setError("Could not remove entry.");
    } finally {
      setRemoving(null);
    }
  };

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#040404",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            border: "2px solid rgba(245,158,11,0.2)",
            borderTopColor: A,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );

  const selectedBarber = barbers.find((b) => String(b.id) === String(barberId));

  return (
    <div style={{ minHeight: "100vh", background: "#040404", color: "white" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#040404;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .wl-enter{animation:fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both;}
        select,input{color-scheme:dark;}
        select:focus,input:focus{outline:none;border-color:rgba(245,158,11,0.5)!important;}
        textarea:focus{outline:none;border-color:rgba(245,158,11,0.5)!important;}
      `}</style>

      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          height: 56,
          background: "rgba(4,4,4,0.96)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(16px,5vw,44px)",
        }}
      >
        <a
          href="/"
          style={{
            ...sf,
            fontSize: 16,
            fontWeight: 900,
            color: "white",
            textDecoration: "none",
            letterSpacing: "-0.05em",
          }}
        >
          HEADZ<span style={{ color: A, fontStyle: "italic" }}>UP</span>
        </a>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => router.push("/book")}
            style={{
              ...mono,
              fontSize: 10,
              color: A,
              background: "rgba(245,158,11,0.08)",
              border: `1px solid rgba(245,158,11,0.25)`,
              padding: "8px 16px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Try Booking →
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              ...mono,
              fontSize: 10,
              color: T.muted,
              background: "transparent",
              border: `1px solid ${T.border}`,
              padding: "8px 16px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Dashboard
          </button>
        </div>
      </nav>

      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "48px clamp(16px,5vw,40px)",
        }}
      >
        {/* Header */}
        <div className="wl-enter" style={{ marginBottom: 40 }}>
          <p
            style={{
              ...mono,
              fontSize: 8,
              color: "rgba(245,158,11,0.5)",
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            HEADZ UP · WAITLIST
          </p>
          <h1
            style={{
              ...sf,
              fontSize: "clamp(2rem,6vw,3.5rem)",
              fontWeight: 900,
              textTransform: "uppercase",
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              marginBottom: 16,
            }}
          >
            Get Notified
            <br />
            <span style={{ color: A, fontStyle: "italic" }}>When Open_</span>
          </h1>
          <p
            style={{
              ...mono,
              fontSize: 13,
              color: T.muted,
              lineHeight: 1.7,
              maxWidth: 460,
            }}
          >
            Can't find an open slot? Join the waitlist. The moment a
            cancellation comes in for your chosen date, you'll be the first to
            know.
          </p>
        </div>

        {/* How it works */}
        <div
          className="wl-enter"
          style={{
            marginBottom: 32,
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 8,
          }}
        >
          {[
            { icon: "📋", step: "1", label: "Pick a barber, date & service" },
            { icon: "🔔", step: "2", label: "We watch for cancellations" },
            { icon: "✂️", step: "3", label: "You get an email instantly" },
          ].map(({ icon, step, label }) => (
            <div
              key={step}
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                padding: "16px 14px",
                textAlign: "center",
                clipPath:
                  "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
              }}
            >
              <p style={{ fontSize: 22, marginBottom: 8 }}>{icon}</p>
              <p
                style={{
                  ...mono,
                  fontSize: 8,
                  color: T.dim,
                  letterSpacing: "0.3em",
                  marginBottom: 4,
                }}
              >
                STEP {step}
              </p>
              <p
                style={{
                  ...mono,
                  fontSize: 11,
                  color: "#a1a1aa",
                  lineHeight: 1.6,
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* JOIN FORM */}
        <div
          className="wl-enter"
          style={{
            background: T.surface,
            border: `1px solid rgba(245,158,11,0.15)`,
            overflow: "hidden",
            marginBottom: 32,
            clipPath:
              "polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,14px 100%,0 calc(100% - 14px))",
          }}
        >
          <div
            style={{
              background: "#000",
              padding: "16px 24px",
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <p
              style={{
                ...sf,
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Join Waitlist
            </p>
          </div>
          <div style={{ padding: "24px" }}>
            {success && (
              <div
                style={{
                  marginBottom: 20,
                  padding: "14px 16px",
                  background: "rgba(74,222,128,0.08)",
                  border: "1px solid rgba(74,222,128,0.2)",
                }}
              >
                <p
                  style={{
                    ...mono,
                    fontSize: 12,
                    color: "#4ade80",
                    lineHeight: 1.6,
                  }}
                >
                  ✓ {success}
                </p>
              </div>
            )}
            {error && (
              <div
                style={{
                  marginBottom: 20,
                  padding: "12px 16px",
                  background: "rgba(248,113,113,0.06)",
                  border: "1px solid rgba(248,113,113,0.2)",
                }}
              >
                <p style={{ ...mono, fontSize: 12, color: "#f87171" }}>
                  ⚠ {error}
                </p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Barber */}
              <div>
                <p
                  style={{
                    ...sf,
                    fontSize: 7,
                    color: T.dim,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Select Barber *
                </p>
                <select
                  value={barberId}
                  onChange={(e) => setBarberId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "#050505",
                    border: `1px solid ${T.border}`,
                    color: barberId ? "white" : T.muted,
                    ...mono,
                    fontSize: 13,
                    transition: "border-color 0.2s",
                  }}
                >
                  <option value="">Choose a barber...</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <p
                  style={{
                    ...sf,
                    fontSize: 7,
                    color: T.dim,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Date *
                </p>
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "#050505",
                    border: `1px solid ${T.border}`,
                    color: "white",
                    ...mono,
                    fontSize: 13,
                    transition: "border-color 0.2s",
                  }}
                />
              </div>

              {/* Service */}
              <div>
                <p
                  style={{
                    ...sf,
                    fontSize: 7,
                    color: T.dim,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Service <span style={{ color: "#3f3f46" }}>(optional)</span>
                </p>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "#050505",
                    border: `1px solid ${T.border}`,
                    color: "white",
                    ...mono,
                    fontSize: 13,
                    transition: "border-color 0.2s",
                  }}
                >
                  <option value="">Any service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — ${s.price}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <p
                  style={{
                    ...sf,
                    fontSize: 7,
                    color: T.dim,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Notes <span style={{ color: "#3f3f46" }}>(optional)</span>
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any specific time preferences or notes..."
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "#050505",
                    border: `1px solid ${T.border}`,
                    color: "white",
                    ...mono,
                    fontSize: 12,
                    resize: "none",
                    lineHeight: 1.7,
                    transition: "border-color 0.2s",
                  }}
                />
              </div>

              <button
                onClick={submit}
                disabled={submitting || !barberId || !date}
                style={{
                  padding: "15px",
                  background: submitting || !barberId || !date ? "#111" : A,
                  color: submitting || !barberId || !date ? "#3f3f46" : "black",
                  ...sf,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  border: "none",
                  cursor:
                    submitting || !barberId || !date
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.2s",
                  clipPath:
                    "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                }}
              >
                {submitting ? "Adding..." : "Join Waitlist →"}
              </button>
            </div>
          </div>
        </div>

        {/* MY WAITLIST ENTRIES */}
        {myEntries.length > 0 && (
          <div className="wl-enter">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ width: 3, height: 22, background: A }} />
              <p
                style={{
                  ...sf,
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Your Waitlist ({myEntries.length})
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {myEntries.map((e) => (
                <div
                  key={e.id}
                  style={{
                    background: T.surface,
                    border: `1px solid ${e.notified ? "rgba(74,222,128,0.25)" : T.border}`,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    clipPath:
                      "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <p
                        style={{
                          ...sf,
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        {e.barber_name}
                      </p>
                      {e.notified && (
                        <span
                          style={{
                            ...mono,
                            fontSize: 8,
                            color: "#4ade80",
                            padding: "2px 8px",
                            background: "rgba(74,222,128,0.08)",
                            border: "1px solid rgba(74,222,128,0.2)",
                          }}
                        >
                          ✓ Notified
                        </span>
                      )}
                    </div>
                    <p style={{ ...mono, fontSize: 11, color: T.muted }}>
                      {e.date} · {e.service_name}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(e.id)}
                    disabled={removing === e.id}
                    style={{
                      padding: "7px 14px",
                      background: "transparent",
                      border: "1px solid rgba(248,113,113,0.2)",
                      color: "#f87171",
                      ...mono,
                      fontSize: 10,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e2) => {
                      e2.currentTarget.style.background =
                        "rgba(248,113,113,0.08)";
                    }}
                    onMouseLeave={(e2) => {
                      e2.currentTarget.style.background = "transparent";
                    }}
                  >
                    {removing === e.id ? "..." : "Remove"}
                  </button>
                </div>
              ))}
            </div>
            <p
              style={{
                ...mono,
                fontSize: 10,
                color: T.dim,
                marginTop: 12,
                lineHeight: 1.7,
              }}
            >
              You'll get an email the moment a slot opens. First on the waitlist
              gets notified first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#040404",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              border: "2px solid rgba(245,158,11,0.2)",
              borderTopColor: "#f59e0b",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}body{background:#040404;}`}</style>
        </div>
      }
    >
      <WaitlistContent />
    </Suspense>
  );
}
