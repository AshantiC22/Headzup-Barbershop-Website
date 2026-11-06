"use client";
// News from the shop: deals, hours changes, events. Posted from the barber dashboard.
import { useEffect, useMemo, useState } from "react";
import API from "@/lib/api";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { Notice, Skeleton } from "@/components/ui/Feedback";

const CATS = {
  deal: { label: "Deals", chip: "chip-ok" },
  promo: { label: "Promos", chip: "chip-warn" },
  update: { label: "Updates", chip: "chip-info" },
  event: { label: "Events", chip: "chip-info" },
  general: { label: "General", chip: "chip-quiet" },
};
const single = { deal: "Deal", promo: "Promo", update: "Update", event: "Event", general: "General" };

export default function NewsletterPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    API.get("newsletter/")
      .then((r) => setPosts(Array.isArray(r.data) ? r.data : r.data?.results || []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const present = useMemo(() => Object.keys(CATS).filter((c) => posts.some((p) => (p.category || "general") === c)), [posts]);
  const shown = posts
    .filter((p) => filter === "all" || (p.category || "general") === filter)
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));

  return (
    <>
      <SiteNav />
      <main id="main" className="wrap page-pad">
        <div className="w-l">
          <h1 className="h1">News from the shop</h1>
          <p className="lede mt-3">
            Deals, hours changes and anything else worth knowing before you sit down.
          </p>
        </div>

        {present.length > 1 && (
          <div className="pills mt-6" role="group" aria-label="Filter news">
            <button className="pill" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Everything</button>
            {present.map((c) => (
              <button key={c} className="pill" aria-pressed={filter === c} onClick={() => setFilter(c)}>{CATS[c].label}</button>
            ))}
          </div>
        )}

        <div className="news-board">
          {loading && [0, 1, 2].map((i) => <Skeleton key={i} h={180} />)}
          {!loading && failed && <Notice tone="bad">News didn&apos;t load. Refresh to try again.</Notice>}
          {!loading && !failed && shown.length === 0 && (
            <div className="panel panel-pad">
              <p className="h4">Nothing posted yet.</p>
              <p className="muted mt-2">Deals and hours changes show up here first.</p>
            </div>
          )}
          {shown.map((p, i) => {
            const cat = p.category || "general";
            return (
              <article key={p.id} className={`news-post ${p.pinned ? "is-pinned" : ""}`}
                style={{ transform: `rotate(${[-0.5, 0.4, -0.2, 0.6][i % 4]}deg)` }}>
                <div className="row-wrap mb-3" style={{ gap: 8 }}>
                  {p.pinned && <span className="chip chip-warn">Pinned</span>}
                  <span className={`chip ${CATS[cat]?.chip || "chip-quiet"} chip-plain`}>{single[cat] || "News"}</span>
                </div>
                <h2 className="h3">{p.emoji && <span aria-hidden="true">{p.emoji} </span>}{p.title}</h2>
                <p className="mt-3 pre-line">{p.body}</p>
                <p className="small faint mt-4">
                  {p.barber_name ? `Posted by ${p.barber_name}` : "Posted by the shop"}{p.created_at ? `, ${p.created_at}` : ""}
                </p>
              </article>
            );
          })}
        </div>

        <div className="panel panel-pad spread mt-8" style={{ flexWrap: "wrap" }}>
          <div>
            <h2 className="h4">Want these as texts?</h2>
            <p className="muted small mt-1">Clients with a phone on file get big announcements by text.</p>
          </div>
          <a href="/sms-optin" className="btn btn-ghost">Text message settings</a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
