"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";

const TERMS = [
  {
    id: "appointments",
    title: "Appointments",
    items: [
      "All appointments must be booked through the HEADZ UP platform. Walk-ins are welcome but subject to availability.",
      "Booked time slots are held for 15 minutes past the scheduled time. After 15 minutes the slot may be released.",
      "You must be a registered user to book online. You are responsible for keeping your login credentials secure.",
    ],
  },
  {
    id: "cancellations",
    title: "Cancellations & Rescheduling",
    items: [
      "You may cancel or reschedule an appointment up to 2 hours before the scheduled time through your dashboard.",
      "Cancellations made within 2 hours of the appointment time must be handled by calling the shop directly.",
      "HEADZ UP reserves the right to cancel appointments in cases of emergency or circumstances beyond our control.",
    ],
  },
  {
    id: "payments",
    title: "Payments",
    items: [
      "Online payments are processed securely through Stripe. HEADZ UP does not store your card information.",
      "Pay-in-shop appointments are paid at the time of service. Cash and card are accepted.",
      "All prices are in USD and subject to change. The price shown at booking is the price charged.",
      "Refunds for online payments are handled on a case-by-case basis. Contact the shop directly.",
    ],
  },
  {
    id: "conduct",
    title: "Code of Conduct",
    items: [
      "HEADZ UP reserves the right to refuse service to anyone consistent with applicable law.",
      "All clients are expected to treat staff with respect. Disruptive behavior may result in removal and account suspension.",
      "Children under 12 must be accompanied by an adult during their appointment.",
    ],
  },
  {
    id: "accounts",
    title: "Your Account",
    items: [
      "You are responsible for all activity under your account. If you suspect unauthorized use, contact us immediately.",
      "You may delete your account by contacting HEADZ UP directly. Appointment history will be retained for business records.",
      "We reserve the right to suspend or terminate accounts that violate these terms.",
    ],
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    items: [
      "HEADZ UP is not liable for any indirect, incidental, or consequential damages arising from use of our services.",
      "Our total liability for any claim shall not exceed the amount paid for the specific service in question.",
    ],
  },
  {
    id: "changes",
    title: "Changes to These Terms",
    items: [
      "We may update these terms at any time. Continued use constitutes acceptance of the new terms.",
      "Material changes will be communicated via the email address on your account.",
      "These terms were last updated February 2026.",
    ],
  },
];

const PRIVACY = [
  {
    id: "collect",
    title: "What We Collect",
    items: [
      "Name, username, and email address when you register.",
      "Appointment details including service, barber, date, and time.",
      "Payment method preference (online vs. in-shop). We do not store card numbers — payments are handled by Stripe.",
    ],
  },
  {
    id: "use",
    title: "How We Use It",
    items: [
      "To manage your appointments and send confirmation communications.",
      "To improve our booking platform and services.",
      "We do not sell your personal information to third parties. We do not use your data for advertising.",
    ],
  },
  {
    id: "sharing",
    title: "Data Sharing",
    items: [
      "Your appointment details are visible to HEADZ UP staff for scheduling purposes.",
      "Payment data is processed by Stripe under their privacy policy.",
      "We may disclose data if required by law.",
    ],
  },
  {
    id: "security",
    title: "Security",
    items: [
      "Passwords are hashed and never stored in plain text.",
      "API communication is secured over HTTPS in production.",
      "We use industry-standard practices but cannot guarantee absolute security.",
    ],
  },
  {
    id: "rights",
    title: "Your Rights",
    items: [
      "You may request a copy of your personal data at any time by contacting us.",
      "You may request deletion of your account and associated data.",
      "You may opt out of non-essential communications by contacting the shop directly.",
    ],
  },
];

function AccordionSection({ sec, active, onToggle, accent }) {
  const sf = { fontFamily: "'Syncopate',sans-serif" };
  return (
    <div
      onClick={() => onToggle(sec.id)}
      style={{
        border: `1px solid ${active ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"}`,
        background: active ? "rgba(245,158,11,0.03)" : "rgba(255,255,255,0.02)",
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.25s, background 0.25s",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "rgba(245,158,11,0.15)";
          e.currentTarget.style.background = "rgba(245,158,11,0.015)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
          e.currentTarget.style.background = "rgba(255,255,255,0.02)";
        }
      }}
    >
      <div
        style={{
          padding: "18px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p
          style={{
            ...sf,
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: 0,
            color: active ? "white" : "#a1a1aa",
          }}
        >
          {sec.title}
        </p>
        <span
          style={{
            color: "#f59e0b",
            fontSize: 18,
            lineHeight: 1,
            transition: "transform 0.3s",
            transform: active ? "rotate(45deg)" : "none",
            display: "block",
            flexShrink: 0,
            marginLeft: 16,
          }}
        >
          +
        </span>
      </div>

      {active && (
        <div
          style={{
            padding: "0 22px 20px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {sec.items.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
                marginTop: 16,
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 3,
                  background: "#f59e0b",
                  borderRadius: "50%",
                  flexShrink: 0,
                  marginTop: 8,
                }}
              />
              <p
                style={{
                  fontFamily: "'DM Serif Display',serif",
                  fontStyle: "italic",
                  fontSize: 14,
                  color: "#a1a1aa",
                  lineHeight: 1.85,
                  margin: 0,
                }}
              >
                {line}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TermsPage() {
  const router = useRouter();
  const sf = { fontFamily: "'Syncopate',sans-serif" };
  const [active, setActive] = useState(null);

  const toggle = (id) => setActive((prev) => (prev === id ? null : id));

  useEffect(() => {
    gsap
      .timeline({ defaults: { ease: "expo.out" } })
      .from(".terms-header", { y: 40, opacity: 0, duration: 1 })
      .from(".terms-body", { y: 30, opacity: 0, duration: 0.9 }, "-=0.5");
  }, []);

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Serif+Display:ital,wght@0,400;1,400&family=DM+Mono:wght@400&display=swap");
        html,
        body {
          background: #040404 !important;
          margin: 0;
          padding: 0;
          color: white;
        }
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }
        ::selection {
          background: rgba(245, 158, 11, 0.3);
          color: white;
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

      {/* Nav */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: 60,
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(4,4,4,0.88)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <a
          href="/"
          style={{
            ...sf,
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: "-0.05em",
            color: "white",
            textDecoration: "none",
          }}
        >
          HEADZ<span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
        </a>
        <button
          onClick={() => router.back()}
          style={{
            ...sf,
            fontSize: 8,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#52525b",
            background: "none",
            border: "none",
            cursor: "pointer",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
        >
          ← Back
        </button>
      </nav>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 780,
          margin: "0 auto",
          padding: "88px 24px 80px",
        }}
      >
        {/* Header */}
        <div className="terms-header" style={{ marginBottom: 64 }}>
          <p
            style={{
              ...sf,
              fontSize: 8,
              letterSpacing: "0.5em",
              color: "#f59e0b",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            — Legal
          </p>
          <h1 style={{ margin: "0 0 20px" }}>
            <span
              style={{
                ...sf,
                fontSize: "clamp(2rem,7vw,4rem)",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "-0.04em",
                lineHeight: 0.9,
              }}
            >
              Terms &amp;{" "}
            </span>
            <span
              style={{
                fontFamily: "'DM Serif Display',serif",
                fontStyle: "italic",
                fontSize: "clamp(2.2rem,7.5vw,4.4rem)",
                color: "#f59e0b",
                lineHeight: 0.9,
              }}
            >
              Privacy
            </span>
          </h1>
          <p
            style={{
              fontFamily: "'DM Serif Display',serif",
              fontStyle: "italic",
              fontSize: 15,
              color: "#52525b",
              maxWidth: 520,
              lineHeight: 1.85,
            }}
          >
            By using the HEADZ UP booking platform you agree to these terms.
            Written in plain English — no legalese.
          </p>
        </div>

        <div
          className="terms-body"
          style={{ display: "flex", flexDirection: "column", gap: 64 }}
        >
          {/* Terms of Service */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  height: 1,
                  flex: 1,
                  background: "rgba(255,255,255,0.06)",
                }}
              />
              <p
                style={{
                  ...sf,
                  fontSize: 7,
                  letterSpacing: "0.5em",
                  color: "#f59e0b",
                  textTransform: "uppercase",
                  margin: 0,
                  flexShrink: 0,
                }}
              >
                Terms of Service
              </p>
              <div
                style={{
                  height: 1,
                  flex: 1,
                  background: "rgba(255,255,255,0.06)",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {TERMS.map((sec) => (
                <AccordionSection
                  key={sec.id}
                  sec={sec}
                  active={active === sec.id}
                  onToggle={toggle}
                />
              ))}
            </div>
          </div>

          {/* Privacy Policy */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  height: 1,
                  flex: 1,
                  background: "rgba(255,255,255,0.06)",
                }}
              />
              <p
                style={{
                  ...sf,
                  fontSize: 7,
                  letterSpacing: "0.5em",
                  color: "#f59e0b",
                  textTransform: "uppercase",
                  margin: 0,
                  flexShrink: 0,
                }}
              >
                Privacy Policy
              </p>
              <div
                style={{
                  height: 1,
                  flex: 1,
                  background: "rgba(255,255,255,0.06)",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {PRIVACY.map((sec) => (
                <AccordionSection
                  key={`p-${sec.id}`}
                  sec={{ ...sec, id: `p-${sec.id}` }}
                  active={active === `p-${sec.id}`}
                  onToggle={toggle}
                />
              ))}
            </div>
          </div>

          {/* Contact */}
          <div
            style={{
              padding: "28px 28px 28px",
              background: "rgba(245,158,11,0.04)",
              border: "1px solid rgba(245,158,11,0.15)",
            }}
          >
            <p
              style={{
                ...sf,
                fontSize: 7,
                letterSpacing: "0.5em",
                color: "#f59e0b",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Questions?
            </p>
            <p
              style={{
                fontFamily: "'DM Serif Display',serif",
                fontStyle: "italic",
                fontSize: 15,
                color: "#71717a",
                lineHeight: 1.85,
                marginBottom: 20,
              }}
            >
              If you have any questions about these terms or how we handle your
              data, reach out directly.
            </p>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[
                ["Instagram", "https://www.instagram.com/headz_up_inthe_burg"],
                [
                  "Facebook",
                  "https://www.facebook.com/p/Headz-Up-Barber-Shop-100054366606015/",
                ],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...sf,
                    fontSize: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.22em",
                    color: "#52525b",
                    textDecoration: "none",
                    borderBottom: "1px solid #3f3f46",
                    paddingBottom: 2,
                    transition: "color 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#f59e0b";
                    e.currentTarget.style.borderColor = "#f59e0b";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#52525b";
                    e.currentTarget.style.borderColor = "#3f3f46";
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          <p
            style={{
              ...sf,
              fontSize: 7,
              color: "#1c1c1e",
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            © 2026 HEADZ UP BARBERSHOP · HATTIESBURG, MS
          </p>
        </div>
      </div>
    </>
  );
}
