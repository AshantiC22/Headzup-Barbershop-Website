"use client";
// Shop overview (admin/stats/): the whole shop at a glance, every barber together.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";
import AppHeader from "@/components/site/AppHeader";
import { IconStar, Notice, Skeleton } from "@/components/ui/Feedback";

const money = (n) => `$${parseFloat(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function Bars({ items, valueKey, labelKey }) {
  const max = Math.max(1, ...items.map((d) => d[valueKey] || 0));
  return (
    <div className="bars" role="list">
      {items.map((d, i) => (
        <div key={i} className={`bar ${d[valueKey] === max ? "is-top" : ""}`} role="listitem" aria-label={`${d[labelKey]}: ${d[valueKey]}`}>
          <span className="bar-v">{d[valueKey] || ""}</span>
          <span className="bar-fill" style={{ height: `${Math.max(3, ((d[valueKey] || 0) / max) * 100)}%` }} />
          <span className="bar-l">{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminStatsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let token = null;
    try { token = localStorage.getItem("access"); } catch {}
    if (!token) { router.replace("/barber-login"); return; }
    API.get("admin/stats/", { _noCache: true })
      .then((r) => setData(r.data))
      .catch((e) => {
        if (e?.response?.status === 403) router.replace("/dashboard");
        else setError("The overview didn't load. Refresh to try again.");
      });
  }, [router]);

  const o = data?.overview || {};
  return (
    <>
      <AppHeader title="Shop overview" signOutTo="/barber-login">
        <Link href="/barber-dashboard" className="btn btn-ghost btn-sm">My dashboard</Link>
      </AppHeader>
      <main id="main" className="wrap dash" style={{ maxWidth: 1180 }}>
        <h1 className="h1">The whole shop</h1>
        <p className="lede mt-2">Every barber&apos;s book, added up. Revenue here counts online deposits only.</p>
        {error && <Notice tone="bad" className="mt-5">{error}</Notice>}
        {!data && !error ? (
          <div className="stack mt-6" style={{ "--stack": "14px" }}><Skeleton h={100} /><Skeleton h={220} /><Skeleton h={220} /></div>
        ) : data && (
          <div className="stack mt-6" style={{ "--stack": "20px" }}>
            <div className="stat-row">
              {[["Today", o.today_bookings], ["This week", o.week_bookings], ["Last 30 days", o.month_bookings], ["All time", o.total_bookings],
                ["Waiting to check in", o.pending_shop], ["On waitlists", o.waitlist], ["Cancelled, 30 days", o.cancelled_30d], ["No-shows, 30 days", o.no_shows_30d]]
                .map(([l, v]) => <div key={l} className="stat"><span className="stat-n">{v ?? 0}</span><span className="stat-l">{l}</span></div>)}
            </div>
            <div className="stat-row is-3">
              {[["Deposits this week", o.week_revenue], ["Deposits, 30 days", o.month_revenue], ["Deposits all time", o.total_revenue]]
                .map(([l, v]) => <div key={l} className="stat"><span className="stat-n">{money(v)}</span><span className="stat-l">{l}</span></div>)}
            </div>

            {data.barber_stats?.length > 0 && (
              <section className="panel panel-pad">
                <h2 className="h3">Barbers</h2>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th scope="col">Barber</th><th scope="col">30 days</th><th scope="col">All time</th><th scope="col">Deposits</th><th scope="col">Rating</th><th scope="col">No-shows</th></tr></thead>
                    <tbody>
                      {data.barber_stats.map((b) => (
                        <tr key={b.id}>
                          <th scope="row">{b.name}</th>
                          <td>{b.this_month}</td><td>{b.total}</td><td>{money(b.revenue)}</td>
                          <td>{b.reviews ? <span className="row" style={{ gap: 4 }}><IconStar filled size={14} />{b.avg_rating} <span className="faint">({b.reviews})</span></span> : <span className="faint">None yet</span>}</td>
                          <td>{b.no_shows}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <div className="setup-grid">
              {data.monthly_data?.length > 0 && (
                <section className="panel panel-pad">
                  <h2 className="h4">Bookings by month</h2>
                  <Bars items={data.monthly_data.map((m) => ({ ...m, short: m.month.split(" ")[0] }))} valueKey="count" labelKey="short" />
                </section>
              )}
              {data.busiest_days?.length > 0 && (
                <section className="panel panel-pad">
                  <h2 className="h4">Busiest days, past year</h2>
                  <Bars items={data.busiest_days} valueKey="count" labelKey="day" />
                </section>
              )}
              {data.top_clients?.length > 0 && (
                <section className="panel panel-pad">
                  <h2 className="h4">Regulars</h2>
                  <ol className="stack mt-3" style={{ "--stack": "8px", paddingLeft: "1.3em" }}>
                    {data.top_clients.map((c) => <li key={c.id}><span className="spread"><span>{c.name}</span><span className="small muted">{c.visits} visits</span></span></li>)}
                  </ol>
                </section>
              )}
              {data.recent_reviews?.length > 0 && (
                <section className="panel panel-pad">
                  <h2 className="h4">Latest reviews</h2>
                  <ul className="stack mt-3" style={{ "--stack": "14px" }}>
                    {data.recent_reviews.slice(0, 8).map((r) => (
                      <li key={r.id}>
                        <p className="small"><strong>{r.client}</strong> for {r.barber}, {r.rating} star{r.rating === 1 ? "" : "s"} <span className="faint">{r.created_at}</span></p>
                        {r.comment && <p className="placard-medium">&ldquo;{r.comment}&rdquo;</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
