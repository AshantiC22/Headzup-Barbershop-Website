"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";
import useBreakpoint from "@/lib/useBreakpoint";

const D = { fontFamily: "'Syncopate',sans-serif" };
const M = { fontFamily: "'DM Mono',monospace" };

const CATEGORY_COLORS = {
  deal: {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.25)",
    label: "Deal",
  },
  promo: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    label: "Promo",
  },
  update: {
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.08)",
    border: "rgba(167,139,250,0.25)",
    label: "Update",
  },
  event: {
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.08)",
    border: "rgba(56,189,248,0.25)",
    label: "Event",
  },
  general: {
    color: "#a1a1aa",
    bg: "rgba(161,161,170,0.06)",
    border: "rgba(161,161,170,0.15)",
    label: "General",
  },
};

const CATEGORIES = ["all", "deal", "promo", "update", "event", "general"];

export default function NewsletterPage() {
  const router = useRouter();
  const { isMobile } = useBreakpoint();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    API.get("newsletter/")
      .then((r) => setPosts(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all" ? posts : posts.filter((p) => p.category === filter);
  const pinned = filtered.filter((p) => p.pinned);
  const regular = filtered.filter((p) => !p.pinned);

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap");
        *,
        *::before,
        *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html,
        body {
          background: #000;
          color: white;
          font-family: "DM Mono", monospace;
          overflow-x: hidden;
        }
        ::-webkit-scrollbar {
          display: none;
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @keyframes scandown {
          from {
            top: -1px;
          }
          to {
            top: 101%;
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
        .nl-card {
          transition:
            border-color 0.2s,
            transform 0.2s;
        }
        .nl-card:hover {
          border-color: rgba(245, 158, 11, 0.4) !important;
          transform: translateY(-2px);
        }
      `}</style>

      {/* BG grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 1,
            background:
              "linear-gradient(to right,transparent,rgba(245,158,11,0.2),transparent)",
            animation: "scandown 9s linear infinite",
          }}
        />
      </div>

      {/* NAV */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          height: 58,
          background: scrollY > 40 ? "rgba(0,0,0,0.97)" : "transparent",
          backdropFilter: scrollY > 40 ? "blur(20px)" : "none",
          borderBottom:
            scrollY > 40 ? "1px solid rgba(255,255,255,0.06)" : "none",
          transition: "all 0.3s",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 clamp(16px,5vw,40px)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <a
            href="/"
            style={{
              ...D,
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: "-0.06em",
              color: "white",
              textDecoration: "none",
            }}
          >
            HEADZ
            <span style={{ color: "#f59e0b", fontStyle: "italic" }}>UP</span>
          </a>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <a
              href="/"
              style={{
                ...M,
                fontSize: 10,
                color: "#71717a",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#71717a")}
            >
              ← Home
            </a>
            <a
              href="/book"
              style={{
                ...D,
                fontSize: 7.5,
                fontWeight: 700,
                color: "black",
                background: "#f59e0b",
                padding: "9px 18px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                textDecoration: "none",
                clipPath:
                  "polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "white")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#f59e0b")
              }
            >
              Book →
            </a>
          </div>
        </div>
      </nav>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: 1200,
          margin: "0 auto",
          padding: `${isMobile ? "80px 16px 48px" : "100px 40px 80px"}`,
        }}
      >
        {/* Hero header */}
        <div
          style={{
            marginBottom: isMobile ? 32 : 52,
            animation: "fadeUp 0.7s ease both",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#f59e0b",
                animation: "pulse 2s ease infinite",
              }}
            />
            <span
              style={{
                ...M,
                fontSize: 9,
                color: "rgba(245,158,11,0.6)",
                letterSpacing: "0.6em",
                textTransform: "uppercase",
              }}
            >
              HEADZ UP · NEWS FEED
            </span>
          </div>
          <h1
            style={{
              ...D,
              fontSize: "clamp(2rem,6vw,4.5rem)",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "-0.04em",
              lineHeight: 0.9,
              marginBottom: 16,
            }}
          >
            Latest
            <br />
            <span style={{ color: "#f59e0b", fontStyle: "italic" }}>
              Updates_
            </span>
          </h1>
          <p
            style={{
              ...M,
              fontSize: "clamp(12px,1.4vw,14px)",
              color: "#71717a",
              lineHeight: 1.85,
              maxWidth: 480,
            }}
          >
            Deals, promotions, shop news, and everything happening at HEADZ UP
            Barbershop — straight from your barbers.
          </p>
        </div>

        {/* Category filter */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 32,
            animation: "fadeUp 0.7s ease 0.1s both",
          }}
        >
          {CATEGORIES.map((cat) => {
            const cfg = CATEGORY_COLORS[cat] || {};
            const isActive = filter === cat;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  padding: "8px 16px",
                  ...D,
                  fontSize: 6.5,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: isActive
                    ? cat === "all"
                      ? "#f59e0b"
                      : cfg.bg
                    : "transparent",
                  color: isActive
                    ? cat === "all"
                      ? "black"
                      : cfg.color
                    : "#71717a",
                  border: `1px solid ${isActive ? (cat === "all" ? "#f59e0b" : cfg.border) : "rgba(255,255,255,0.08)"}`,
                  clipPath:
                    "polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,5px 100%,0 calc(100% - 5px))",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "white";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "#71717a";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.08)";
                  }
                }}
              >
                {cat === "all" ? "All Posts" : `${CATEGORY_COLORS[cat]?.label}`}
              </button>
            );
          })}
          <span
            style={{
              ...M,
              fontSize: 10,
              color: "#3f3f46",
              display: "flex",
              alignItems: "center",
              marginLeft: 4,
            }}
          >
            {filtered.length} post{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: "64px", textAlign: "center" }}>
            <div
              style={{
                width: 20,
                height: 20,
                border: "2px solid rgba(245,158,11,0.2)",
                borderTopColor: "#f59e0b",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 12px",
              }}
            />
            <p style={{ ...M, fontSize: 11, color: "#52525b" }}>
              Loading posts...
            </p>
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div
            style={{
              padding: "80px 20px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.01)",
              clipPath:
                "polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,20px 100%,0 calc(100% - 20px))",
            }}
          >
            <p style={{ fontSize: 40, marginBottom: 12 }}>📣</p>
            <p
              style={{
                ...D,
                fontSize: 9,
                color: "rgba(255,255,255,0.06)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              Nothing here yet
            </p>
            <p style={{ ...M, fontSize: 12, color: "#52525b" }}>
              Check back soon for deals and updates
            </p>
          </div>
        )}

        {/* Pinned posts */}
        {!loading && pinned.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  ...M,
                  fontSize: 8,
                  color: "#f59e0b",
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                }}
              >
                📌 Pinned
              </span>
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background:
                    "linear-gradient(to right,rgba(245,158,11,0.3),transparent)",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pinned.map((post, i) => (
                <PostCard key={post.id} post={post} i={i} isMobile={isMobile} />
              ))}
            </div>
          </div>
        )}

        {/* Regular posts */}
        {!loading && regular.length > 0 && (
          <div>
            {pinned.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    ...M,
                    fontSize: 8,
                    color: "#71717a",
                    letterSpacing: "0.5em",
                    textTransform: "uppercase",
                  }}
                >
                  Latest
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: "rgba(255,255,255,0.06)",
                  }}
                />
              </div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)",
                gap: 12,
              }}
            >
              {regular.map((post, i) => (
                <PostCard key={post.id} post={post} i={i} isMobile={isMobile} />
              ))}
            </div>
          </div>
        )}

        {/* Footer CTA */}
        {!loading && (
          <div
            style={{
              marginTop: isMobile ? 48 : 72,
              padding: isMobile ? "32px 20px" : "48px 40px",
              background: "#f59e0b",
              position: "relative",
              overflow: "hidden",
              clipPath:
                "polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,20px 100%,0 calc(100% - 20px))",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(rgba(0,0,0,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.06) 1px,transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div
              style={{
                position: "relative",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 20,
              }}
            >
              <div>
                <h2
                  style={{
                    ...D,
                    fontSize: "clamp(1.4rem,3vw,2rem)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "-0.04em",
                    color: "black",
                    lineHeight: 1,
                    marginBottom: 6,
                  }}
                >
                  Ready to Book?
                </h2>
                <p style={{ ...M, fontSize: 12, color: "rgba(0,0,0,0.55)" }}>
                  Lock in your spot today
                </p>
              </div>
              <a
                href="/book"
                style={{
                  ...D,
                  fontSize: 8.5,
                  fontWeight: 700,
                  color: "white",
                  background: "black",
                  padding: "16px 32px",
                  textDecoration: "none",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  clipPath:
                    "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                  transition: "all 0.25s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#111";
                  e.currentTarget.style.color = "#f59e0b";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "black";
                  e.currentTarget.style.color = "white";
                }}
              >
                Book Now →
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function PostCard({ post, i, isMobile }) {
  const D = { fontFamily: "'Syncopate',sans-serif" };
  const M = { fontFamily: "'DM Mono',monospace" };
  const cfg = CATEGORY_COLORS[post.category] || CATEGORY_COLORS.general;

  return (
    <div
      className="nl-card"
      style={{
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
        clipPath:
          "polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))",
        animation: `fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s both`,
      }}
    >
      {/* Top color bar */}
      <div
        style={{
          height: 2,
          background: post.pinned
            ? "linear-gradient(to right,#ef4444,#f59e0b)"
            : cfg.color,
          opacity: 0.7,
        }}
      />

      <div style={{ padding: isMobile ? "18px 16px" : "22px 22px" }}>
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: isMobile ? 22 : 26, flexShrink: 0 }}>
              {post.emoji}
            </span>
            <div>
              <h3
                style={{
                  ...D,
                  fontSize: isMobile ? 9 : 10,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "-0.01em",
                  marginBottom: 4,
                  lineHeight: 1.2,
                }}
              >
                {post.title}
              </h3>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    ...M,
                    fontSize: 9,
                    color: cfg.color,
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    padding: "1px 8px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}
                >
                  {cfg.label}
                </span>
                {post.pinned && (
                  <span style={{ ...M, fontSize: 8, color: "#f59e0b" }}>
                    📌
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <p
          style={{
            ...M,
            fontSize: isMobile ? 12 : 13,
            color: "#a1a1aa",
            lineHeight: 1.85,
            whiteSpace: "pre-wrap",
            marginBottom: 14,
          }}
        >
          {post.body}
        </p>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 20,
                height: 20,
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{ ...D, fontSize: 8, fontWeight: 900, color: "#f59e0b" }}
              >
                ✂
              </span>
            </div>
            <span style={{ ...M, fontSize: 9, color: "#52525b" }}>
              {post.barber_name}
            </span>
          </div>
          <span style={{ ...M, fontSize: 9, color: "#3f3f46" }}>
            {post.created_at}
          </span>
        </div>
      </div>
    </div>
  );
}
