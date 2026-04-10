"use client";
export const dynamic = "force-dynamic";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import API from "@/lib/api";

const sf = { fontFamily: "'Syncopate',sans-serif" };
const mono = { fontFamily: "'DM Mono',monospace" };
const A = "#f59e0b";

function StarRating({ value, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const lit = (hovered || value) >= star;
        return (
          <button
            key={star}
            onClick={() => !readonly && onChange && onChange(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            style={{
              background: "none",
              border: "none",
              cursor: readonly ? "default" : "pointer",
              padding: 2,
              transition: "transform 0.15s",
              transform:
                !readonly && hovered >= star ? "scale(1.2)" : "scale(1)",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24">
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={lit ? A : "none"}
                stroke={lit ? A : "#3f3f46"}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

function ReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apptId = searchParams.get("appt");

  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    if (!apptId) {
      setLoading(false);
      return;
    }
    API.get("appointments/")
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data.results || [];
        const found = list.find((a) => String(a.id) === String(apptId));
        if (found) {
          setAppt(found);
          if (found.reviewed) setAlreadyDone(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apptId]);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await API.post("review/submit/", {
        appointment_id: apptId,
        completed: true,
        rating,
        comment,
      });
      setSubmitted(true);
    } catch (e) {
      setError(
        e.response?.data?.error || "Could not submit review. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#040404",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#040404;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .review-card{animation:fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both;}
        textarea:focus{outline:none;border-color:rgba(245,158,11,0.5)!important;}
      `}</style>

      <div className="review-card" style={{ width: "100%", maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a
            href="/"
            style={{
              ...sf,
              fontSize: 22,
              fontWeight: 900,
              textTransform: "uppercase",
              color: "white",
              textDecoration: "none",
              letterSpacing: "-0.05em",
            }}
          >
            HEADZ<span style={{ color: A, fontStyle: "italic" }}>UP</span>
          </a>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div
              style={{
                width: 20,
                height: 20,
                border: "2px solid rgba(245,158,11,0.2)",
                borderTopColor: A,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto",
              }}
            />
          </div>
        ) : submitted ? (
          /* ── THANK YOU ── */
          <div
            style={{
              background: "#0a0a0a",
              border: "1px solid rgba(74,222,128,0.2)",
              padding: 40,
              textAlign: "center",
              clipPath:
                "polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,14px 100%,0 calc(100% - 14px))",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                background: "rgba(74,222,128,0.12)",
                border: "1px solid rgba(74,222,128,0.3)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <span style={{ fontSize: 28 }}>✓</span>
            </div>
            <h1
              style={{
                ...sf,
                fontSize: 18,
                fontWeight: 900,
                textTransform: "uppercase",
                marginBottom: 12,
                color: "#4ade80",
              }}
            >
              Thank You!
            </h1>
            <p
              style={{
                ...mono,
                fontSize: 13,
                color: "#a1a1aa",
                lineHeight: 1.7,
                marginBottom: 24,
              }}
            >
              Your {rating}-star review has been saved. We really appreciate you
              taking the time.
            </p>
            <StarRating value={rating} readonly />
            <div
              style={{
                marginTop: 28,
                display: "flex",
                gap: 10,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => router.push("/book")}
                style={{
                  padding: "12px 24px",
                  background: A,
                  color: "black",
                  ...sf,
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Book Again →
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  padding: "12px 20px",
                  background: "transparent",
                  color: "#a1a1aa",
                  ...sf,
                  fontSize: 8,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                }}
              >
                Dashboard
              </button>
            </div>
          </div>
        ) : alreadyDone ? (
          /* ── ALREADY REVIEWED ── */
          <div
            style={{
              background: "#0a0a0a",
              border: `1px solid rgba(245,158,11,0.15)`,
              padding: 40,
              textAlign: "center",
              clipPath:
                "polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,14px 100%,0 calc(100% - 14px))",
            }}
          >
            <p
              style={{
                ...sf,
                fontSize: 14,
                fontWeight: 900,
                textTransform: "uppercase",
                color: A,
                marginBottom: 12,
              }}
            >
              Already Reviewed
            </p>
            <p
              style={{
                ...mono,
                fontSize: 13,
                color: "#71717a",
                marginBottom: 24,
              }}
            >
              You've already left a review for this appointment.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                padding: "12px 24px",
                background: A,
                color: "black",
                ...sf,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
              }}
            >
              Back to Dashboard →
            </button>
          </div>
        ) : (
          /* ── REVIEW FORM ── */
          <div
            style={{
              background: "#0a0a0a",
              border: `1px solid rgba(245,158,11,0.15)`,
              overflow: "hidden",
              clipPath:
                "polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,14px 100%,0 calc(100% - 14px))",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "#000",
                padding: "20px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <p
                style={{
                  ...mono,
                  fontSize: 8,
                  color: "rgba(245,158,11,0.5)",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                HEADZ UP · POST-VISIT
              </p>
              <h1
                style={{
                  ...sf,
                  fontSize: 18,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  lineHeight: 1.1,
                }}
              >
                How Was
                <br />
                <span style={{ color: A, fontStyle: "italic" }}>Your Cut_</span>
              </h1>
            </div>

            <div style={{ padding: "28px 24px" }}>
              {/* Appointment info */}
              {appt && (
                <div
                  style={{
                    marginBottom: 24,
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <p
                    style={{
                      ...mono,
                      fontSize: 9,
                      color: "#52525b",
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Your Appointment
                  </p>
                  <p
                    style={{
                      ...sf,
                      fontSize: 11,
                      color: "white",
                      fontWeight: 700,
                    }}
                  >
                    {appt.service_name || "Appointment"}
                  </p>
                  <p
                    style={{
                      ...mono,
                      fontSize: 11,
                      color: "#a1a1aa",
                      marginTop: 4,
                    }}
                  >
                    with {appt.barber_name} ·{" "}
                    {new Date(appt.date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      { weekday: "short", month: "short", day: "numeric" },
                    )}
                  </p>
                </div>
              )}

              {/* Stars */}
              <div style={{ marginBottom: 24 }}>
                <p
                  style={{
                    ...sf,
                    fontSize: 7,
                    color: "#52525b",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    marginBottom: 14,
                  }}
                >
                  Your Rating
                </p>
                <StarRating value={rating} onChange={setRating} />
                <p style={{ ...mono, fontSize: 10, color: A, marginTop: 10 }}>
                  {
                    [
                      "",
                      "😕 Not great",
                      "😐 It was okay",
                      "👍 Pretty good",
                      "😊 Really good",
                      "🔥 Absolutely fire",
                    ][rating]
                  }
                </p>
              </div>

              {/* Comment */}
              <div style={{ marginBottom: 24 }}>
                <p
                  style={{
                    ...sf,
                    fontSize: 7,
                    color: "#52525b",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  Leave a Comment{" "}
                  <span style={{ color: "#3f3f46" }}>(optional)</span>
                </p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us about your experience..."
                  rows={4}
                  style={{
                    width: "100%",
                    background: "#050505",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    padding: "12px 14px",
                    ...mono,
                    fontSize: 12,
                    resize: "vertical",
                    lineHeight: 1.7,
                    transition: "border-color 0.2s",
                  }}
                />
              </div>

              {error && (
                <p
                  style={{
                    ...mono,
                    fontSize: 11,
                    color: "#f87171",
                    marginBottom: 14,
                  }}
                >
                  ⚠ {error}
                </p>
              )}

              {/* Submit */}
              <button
                onClick={submit}
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: submitting ? "#111" : A,
                  color: submitting ? "#3f3f46" : "black",
                  ...sf,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  border: "none",
                  cursor: submitting ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  clipPath:
                    "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                }}
              >
                {submitting
                  ? "Submitting..."
                  : `Submit ${rating}-Star Review →`}
              </button>

              <p
                style={{
                  ...mono,
                  fontSize: 9,
                  color: "#3f3f46",
                  textAlign: "center",
                  marginTop: 14,
                }}
              >
                Reviews help your barber grow. Thank you.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReviewPage() {
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
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
