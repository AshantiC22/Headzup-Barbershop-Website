"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";

const sf = { fontFamily: "'Syncopate',sans-serif" };
const mono = { fontFamily: "'DM Mono',monospace" };
const A = "#f59e0b";
const T = {
  bg: "#040404",
  surface: "#0a0a0a",
  border: "rgba(255,255,255,0.08)",
  muted: "#71717a",
  dim: "#52525b",
};

function Stat({ label, value, sub, accent = false, icon }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${accent ? "rgba(245,158,11,0.2)" : T.border}`,
        padding: "18px 20px",
        clipPath:
          "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <p
          style={{
            ...mono,
            fontSize: 8,
            color: T.dim,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </p>
        {icon && <span style={{ fontSize: 16, opacity: 0.6 }}>{icon}</span>}
      </div>
      <p
        style={{
          ...sf,
          fontSize: 22,
          fontWeight: 900,
          color: accent ? A : "white",
          letterSpacing: "-0.03em",
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ ...mono, fontSize: 10, color: T.muted, marginTop: 4 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function MiniBar({ label, value, max, color = "#f59e0b" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span style={{ ...mono, fontSize: 10, color: "#a1a1aa" }}>{label}</span>
        <span style={{ ...mono, fontSize: 10, color }}>{value}</span>
      </div>
      <div
        style={{
          height: 4,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 2,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 2,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

function Section({ title, accent, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ width: 3, height: 24, background: accent || A }} />
        <p
          style={{
            ...sf,
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

export default function AdminStatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30d");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await API.get("admin/stats/");
      setStats(r.data);
    } catch (e) {
      if (e.response?.status === 403) {
        router.replace("/");
      } else {
        setError("Could not load stats.");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box;margin:0;padding:0;}body{background:#040404;}`}</style>
        <p style={{ ...sf, fontSize: 18, fontWeight: 900, color: "white" }}>
          HEADZ<span style={{ color: A, fontStyle: "italic" }}>UP</span>
        </p>
        <div
          style={{
            width: 18,
            height: 18,
            border: "2px solid rgba(245,158,11,0.2)",
            borderTopColor: A,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );

  if (error)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ ...mono, color: "#f87171" }}>{error}</p>
      </div>
    );

  const ov = stats?.overview || {};
  const maxMonthly = Math.max(
    ...(stats?.monthly_data || []).map((m) => m.count),
    1,
  );
  const maxDow = Math.max(
    ...(stats?.busiest_days || []).map((d) => d.count),
    1,
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: "white" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#040404;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .s-enter{animation:fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both;}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0a0a0a} ::-webkit-scrollbar-thumb{background:#27272a}
      `}</style>

      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(4,4,4,0.96)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${T.border}`,
          padding: "0 clamp(16px,4vw,40px)",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <p style={{ ...mono, fontSize: 9, color: T.muted }}>
            Admin Analytics
          </p>
          <button
            onClick={() => router.push("/barber-dashboard")}
            style={{
              ...mono,
              fontSize: 10,
              color: T.muted,
              background: "transparent",
              border: `1px solid ${T.border}`,
              padding: "6px 14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = A;
              e.currentTarget.style.borderColor = A;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = T.muted;
              e.currentTarget.style.borderColor = T.border;
            }}
          >
            Dashboard →
          </button>
        </div>
      </nav>

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "clamp(24px,4vw,48px) clamp(16px,4vw,40px)",
        }}
      >
        {/* Header */}
        <div
          className="s-enter"
          style={{
            marginBottom: 36,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <p
              style={{
                ...mono,
                fontSize: 8,
                color: "rgba(245,158,11,0.5)",
                letterSpacing: "0.5em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              HEADZ UP · OWNER VIEW
            </p>
            <h1
              style={{
                ...sf,
                fontSize: "clamp(1.8rem,4vw,3rem)",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "-0.04em",
                lineHeight: 0.9,
              }}
            >
              Platform
              <br />
              <span style={{ color: A, fontStyle: "italic" }}>Analytics_</span>
            </h1>
          </div>
          <button
            onClick={load}
            style={{
              ...mono,
              fontSize: 10,
              color: T.muted,
              background: T.surface,
              border: `1px solid ${T.border}`,
              padding: "10px 18px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = A;
              e.currentTarget.style.borderColor = A;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = T.muted;
              e.currentTarget.style.borderColor = T.border;
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Overview stats */}
        <Section title="Overview">
          <div
            className="s-enter"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
              gap: 8,
            }}
          >
            <Stat label="Total Bookings" value={ov.total_bookings} icon="📅" />
            <Stat
              label="This Month"
              value={ov.month_bookings}
              icon="🗓"
              accent
            />
            <Stat label="This Week" value={ov.week_bookings} icon="⚡" />
            <Stat label="Today" value={ov.today_bookings} icon="🪑" accent />
            <Stat
              label="Total Deposits"
              value={`$${ov.total_revenue?.toFixed(2) || "0.00"}`}
              icon="💰"
              accent
            />
            <Stat
              label="Month Deposits"
              value={`$${ov.month_revenue?.toFixed(2) || "0.00"}`}
              icon="💳"
            />
            <Stat
              label="Week Deposits"
              value={`$${ov.week_revenue?.toFixed(2) || "0.00"}`}
              icon="📈"
            />
            <Stat
              label="Cancellations"
              value={ov.cancelled_30d}
              sub="Last 30 days"
              icon="✕"
            />
            <Stat
              label="No-Shows"
              value={ov.no_shows_30d}
              sub="Last 30 days"
              icon="🚫"
            />
            <Stat
              label="Pending Shop"
              value={ov.pending_shop}
              sub="Awaiting arrival"
              icon="⏳"
            />
            <Stat
              label="Waitlist"
              value={ov.waitlist}
              sub="Unnotified"
              icon="📋"
            />
          </div>
        </Section>

        {/* Monthly chart (bar) */}
        <Section title="Monthly Bookings — Last 12 Months">
          <div
            className="s-enter"
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              padding: 24,
              overflowX: "auto",
            }}
          >
            {(stats?.monthly_data || []).length === 0 ? (
              <p style={{ ...mono, fontSize: 12, color: T.dim }}>
                No data yet.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "flex-end",
                  minWidth: Math.max(600, stats.monthly_data.length * 60),
                  height: 160,
                }}
              >
                {(stats?.monthly_data || []).map((m, i) => {
                  const pct = maxMonthly > 0 ? m.count / maxMonthly : 0;
                  const h = Math.max(4, Math.round(pct * 120));
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <p style={{ ...mono, fontSize: 8, color: A }}>
                        {m.count}
                      </p>
                      <div
                        style={{
                          width: "100%",
                          height: h,
                          background: `rgba(245,158,11,${0.3 + pct * 0.7})`,
                          transition: "height 0.5s ease",
                          position: "relative",
                        }}
                        title={`${m.month}: ${m.count} bookings · $${m.revenue.toFixed(2)}`}
                      />
                      <p
                        style={{
                          ...mono,
                          fontSize: 7,
                          color: T.dim,
                          textAlign: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.month}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            marginBottom: 32,
          }}
        >
          {/* Busiest days */}
          <Section title="Busiest Days">
            <div
              className="s-enter"
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                padding: 20,
              }}
            >
              {(stats?.busiest_days || []).map((d, i) => (
                <MiniBar
                  key={i}
                  label={d.day}
                  value={d.count}
                  max={maxDow}
                  color={A}
                />
              ))}
            </div>
          </Section>

          {/* Barber breakdown */}
          <Section title="Per Barber">
            <div
              className="s-enter"
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              {(stats?.barber_stats || []).map((b) => (
                <div
                  key={b.id}
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
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
                      {b.name}
                    </p>
                    <div style={{ display: "flex", gap: 4 }}>
                      {b.avg_rating > 0 && (
                        <span style={{ ...mono, fontSize: 10, color: A }}>
                          {"★".repeat(Math.round(b.avg_rating))} {b.avg_rating}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4,1fr)",
                      gap: 8,
                    }}
                  >
                    {[
                      ["Total", b.total],
                      ["Month", b.this_month],
                      ["Revenue", `$${b.revenue.toFixed(0)}`],
                      ["No-shows", b.no_shows],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <p
                          style={{
                            ...mono,
                            fontSize: 7,
                            color: T.dim,
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                          }}
                        >
                          {l}
                        </p>
                        <p
                          style={{
                            ...sf,
                            fontSize: 12,
                            fontWeight: 700,
                            color: "white",
                          }}
                        >
                          {v}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Top clients */}
        <Section title="Top Clients — All Time">
          <div
            className="s-enter"
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["#", "Client", "Email", "Visits", "Deposits Paid"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          ...mono,
                          fontSize: 8,
                          color: T.dim,
                          letterSpacing: "0.3em",
                          textTransform: "uppercase",
                          padding: "10px 16px",
                          textAlign: "left",
                          fontWeight: 400,
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {(stats?.top_clients || []).map((c, i) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: `1px solid rgba(255,255,255,0.04)`,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(245,158,11,0.03)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td
                      style={{
                        ...mono,
                        fontSize: 11,
                        color: T.dim,
                        padding: "12px 16px",
                      }}
                    >
                      {i + 1}
                    </td>
                    <td
                      style={{
                        ...sf,
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "12px 16px",
                      }}
                    >
                      {c.name}
                    </td>
                    <td
                      style={{
                        ...mono,
                        fontSize: 11,
                        color: T.muted,
                        padding: "12px 16px",
                      }}
                    >
                      {c.email}
                    </td>
                    <td
                      style={{
                        ...mono,
                        fontSize: 13,
                        color: A,
                        padding: "12px 16px",
                        fontWeight: 700,
                      }}
                    >
                      {c.visits}
                    </td>
                    <td
                      style={{
                        ...mono,
                        fontSize: 13,
                        color: "#4ade80",
                        padding: "12px 16px",
                      }}
                    >
                      ${c.spent.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Recent reviews */}
        <Section title="Recent Reviews">
          <div
            className="s-enter"
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            {(stats?.recent_reviews || []).length === 0 ? (
              <p style={{ ...mono, fontSize: 12, color: T.dim }}>
                No reviews yet.
              </p>
            ) : (
              (stats?.recent_reviews || []).map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    padding: "16px 18px",
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    <p
                      style={{
                        ...mono,
                        fontSize: 14,
                        color: A,
                        letterSpacing: 2,
                      }}
                    >
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <p
                        style={{
                          ...sf,
                          fontSize: 8,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: "white",
                        }}
                      >
                        {r.client}
                      </p>
                      <p style={{ ...mono, fontSize: 9, color: T.dim }}>
                        {r.barber} · {r.created_at}
                      </p>
                    </div>
                    {r.comment && (
                      <p
                        style={{
                          ...mono,
                          fontSize: 12,
                          color: "#a1a1aa",
                          lineHeight: 1.7,
                        }}
                      >
                        "{r.comment}"
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
