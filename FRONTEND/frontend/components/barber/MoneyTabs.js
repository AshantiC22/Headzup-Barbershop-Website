"use client";
// Payments (deposits), reports, and the Stripe connection.
import { useEffect, useState } from "react";
import API from "@/lib/api";
import { IconExternal, Notice, Skeleton, Spinner } from "@/components/ui/Feedback";
import { fmtDate, fmtTime } from "@/lib/time";

const money = (n, cents = true) => {
  const v = parseFloat(n || 0);
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 })}`;
};
const PERIODS = [["week", "7 days"], ["month", "30 days"], ["year", "Year"], ["all", "All time"]];

function PeriodPills({ value, onChange }) {
  return (
    <div className="pills" role="group" aria-label="Time period">
      {PERIODS.map(([v, l]) => <button key={v} className="pill" aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

// Stripe's US card fee: 2.9% + 30¢. Shown as an estimate.
const net = (amt) => Math.max(0, parseFloat(amt || 0) - (parseFloat(amt || 0) * 0.029 + 0.3));

export function PaymentsTab({ goStripe }) {
  const [period, setPeriod] = useState("month");
  // Results are tagged with the period they're for, so switching periods shows
  // the skeleton without having to clear anything first.
  const [res, setRes] = useState({ period: null });
  useEffect(() => {
    API.get(`barber/payments/?period=${period}`, { _noCache: true })
      .then((r) => setRes({ period, data: r.data }))
      .catch(() => setRes({ period, failed: true }));
  }, [period]);
  const current = res.period === period;
  const data = current ? res.data : null;
  const failed = current && !!res.failed;
  const list = data?.payments || [];
  const bal = data?.stripe_balance || { available: 0, pending: 0 };

  return (
    <div>
      <div className="tab-head">
        <div><h1 className="h2">Deposits</h1><p className="muted">Money clients paid online to hold their time.</p></div>
        <PeriodPills value={period} onChange={setPeriod} />
      </div>
      {failed && <Notice tone="bad" className="mb-4">Deposits didn&apos;t load. If Stripe isn&apos;t connected yet, <button className="link" onClick={goStripe}>connect it</button>.</Notice>}
      <div className="stat-row mb-5">
        <div className="stat"><span className="stat-n">{data ? money(data.total_deposits) : "–"}</span><span className="stat-l">Collected</span></div>
        <div className="stat"><span className="stat-n">{data ? data.count || 0 : "–"}</span><span className="stat-l">Deposits</span></div>
        <div className="stat"><span className="stat-n">{data ? money(bal.available) : "–"}</span><span className="stat-l">Ready to pay out</span></div>
        <div className="stat"><span className="stat-n">{data ? money(bal.pending) : "–"}</span><span className="stat-l">On the way</span></div>
      </div>
      <p className="small muted mb-5">
        &ldquo;On the way&rdquo; usually reaches your bank in about two business days. Stripe keeps about 2.9% plus 30¢ per deposit.
      </p>
      {!data && !failed ? <Skeleton h={160} /> : list.length === 0 ? (
        <div className="empty"><p className="h4">No deposits in this period.</p></div>
      ) : (
        <ul className="stack" style={{ "--stack": "8px" }}>
          {list.map((p) => (
            <li key={p.id} className="panel pay-row">
              <div className="grow">
                <p className="h4">{p.client}</p>
                <p className="small muted">{p.service}, {fmtDate(p.date)} at {fmtTime(p.time)}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p className="price" style={{ fontSize: "1.3rem" }}>{money(p.deposit_amount)}</p>
                <p className="small faint">about {money(net(p.deposit_amount))} after fees</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Bars({ items, valueKey, labelKey, format = (v) => v, highlightMax = true }) {
  const max = Math.max(1, ...items.map((d) => d[valueKey] || 0));
  return (
    <div className="bars" role="list">
      {items.map((d, i) => {
        const v = d[valueKey] || 0;
        return (
          <div key={i} className={`bar ${highlightMax && v === max && v > 0 ? "is-top" : ""}`} role="listitem"
            aria-label={`${d[labelKey]}: ${format(v)}`} title={`${d[labelKey]}: ${format(v)}`}>
            <span className="bar-v">{v > 0 ? format(v) : ""}</span>
            <span className="bar-fill" style={{ height: `${Math.max(3, (v / max) * 100)}%` }} />
            <span className="bar-l">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ReportsTab() {
  const [period, setPeriod] = useState("month");
  const [res, setRes] = useState({ period: null });
  useEffect(() => {
    API.get(`barber/reports/?period=${period}`, { _noCache: true })
      .then((x) => setRes({ period, data: x.data }))
      .catch(() => setRes({ period, data: { failed: true } }));
  }, [period]);
  const r = res.period === period ? res.data : null;
  const s = r?.summary || {};

  return (
    <div>
      <div className="tab-head">
        <div><h1 className="h2">Reports</h1><p className="muted">How the chair has been doing.</p></div>
        <PeriodPills value={period} onChange={setPeriod} />
      </div>
      {!r ? <div className="stack" style={{ "--stack": "12px" }}><Skeleton h={130} /><Skeleton h={200} /></div> : r.failed ? (
        <Notice tone="bad">Reports didn&apos;t load. Try another period or refresh.</Notice>
      ) : (
        <div className="stack" style={{ "--stack": "18px" }}>
          <section className="panel panel-pad report-hero">
            <div>
              <p className="muted">Revenue</p>
              <p className="price" style={{ fontSize: "clamp(2.4rem, 6vw, 3.4rem)", lineHeight: 1.05 }}>{money(s.total_revenue)}</p>
              <p className="small muted">{money(s.online_revenue)} online, {money(s.shop_revenue)} at the shop</p>
            </div>
            <dl className="report-mini">
              <div><dt>Finished</dt><dd>{s.completion_rate ?? 0}%</dd></div>
              <div><dt>No-shows</dt><dd>{s.no_show_rate ?? 0}%</dd></div>
              <div><dt>Walk-ins</dt><dd>{s.walk_ins ?? 0}</dd></div>
              <div><dt>Reschedules</dt><dd>{s.reschedules ?? 0}</dd></div>
            </dl>
          </section>

          <div className="stat-row">
            {[["Bookings", s.total], ["Done", s.completed], ["Cancelled", s.cancelled], ["No-shows", s.no_shows],
              ["Paid online", s.online_count], ["Paid at shop", s.shop_count], ["Clients with strikes", s.clients_on_strike]]
              .map(([l, v]) => <div key={l} className="stat"><span className="stat-n">{v ?? 0}</span><span className="stat-l">{l}</span></div>)}
          </div>

          {r.daily?.length > 0 && (
            <section className="panel panel-pad">
              <h2 className="h4">Revenue, last 14 days</h2>
              <Bars items={r.daily.slice(-14).map((d) => ({ ...d, short: (d.label || "").split(" ")[1] || d.label }))}
                valueKey="revenue" labelKey="short" format={(v) => `$${Math.round(v)}`} />
            </section>
          )}

          <div className="setup-grid">
            {r.busiest_days?.length > 0 && (
              <section className="panel panel-pad">
                <h2 className="h4">Busiest days</h2>
                <Bars items={r.busiest_days} valueKey="bookings" labelKey="day" />
              </section>
            )}
            {r.busiest_hours?.length > 0 && (
              <section className="panel panel-pad">
                <h2 className="h4">Busiest hours</h2>
                <ul className="stack mt-4" style={{ "--stack": "8px" }}>
                  {[...r.busiest_hours].sort((a, b) => b.bookings - a.bookings).slice(0, 5).map((h) => {
                    const max = Math.max(1, ...r.busiest_hours.map((x) => x.bookings));
                    return (
                      <li key={h.hour} className="hbar">
                        <span className="num" style={{ width: 64 }}>{h.label}</span>
                        <span className="meter grow"><span style={{ width: `${(h.bookings / max) * 100}%` }} /></span>
                        <span className="num" style={{ width: 28, textAlign: "right", fontWeight: 700 }}>{h.bookings}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            {r.services?.length > 0 && (
              <section className="panel panel-pad">
                <h2 className="h4">By service</h2>
                <ul className="stack mt-4" style={{ "--stack": "10px" }}>
                  {r.services.map((x) => (
                    <li key={x.name} className="spread">
                      <span><strong>{x.name}</strong><span className="small muted"> {x.bookings} booked, {x.completed} done</span></span>
                      <span className="price">{money(x.revenue, false)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {r.top_clients?.length > 0 && (
              <section className="panel panel-pad">
                <h2 className="h4">Regulars</h2>
                <ol className="stack mt-4" style={{ "--stack": "10px", paddingLeft: "1.3em" }}>
                  {r.top_clients.map((c) => (
                    <li key={c.id}><span className="spread"><span>{c.name}</span><span className="small muted">{c.visits} visits</span></span></li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          {r.weekly?.length > 0 && (
            <section className="panel panel-pad">
              <h2 className="h4">Week by week</h2>
              <Bars items={r.weekly.map((w) => ({ ...w, short: String(w.week || "").replace("Wk ", "") }))} valueKey="revenue" labelKey="short"
                format={(v) => `$${Math.round(v)}`} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export function StripeTab({ toast }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    API.get("barber/stripe/status/", { _noCache: true }).then((r) => setStatus(r.data)).catch(() => setStatus({ connected: false }));
  }, []);
  const connect = async () => {
    setBusy(true);
    try { const r = await API.post("barber/stripe/connect/"); window.location.href = r.data.url; }
    catch { toast("Stripe didn't open. Try again.", "bad"); setBusy(false); }
  };
  const open = async () => {
    try { const r = await API.get("barber/stripe/dashboard/", { _noCache: true }); window.open(r.data.url, "_blank", "noopener"); }
    catch { toast("Stripe's dashboard didn't open.", "bad"); }
  };

  return (
    <div>
      <div className="tab-head"><div><h1 className="h2">Getting paid</h1><p className="muted">Online deposits go straight to your bank through Stripe.</p></div></div>
      <section className="panel panel-pad w-m">
        {!status ? <Skeleton h={120} /> : status.connected ? (
          <>
            <span className="chip chip-ok">Stripe connected</span>
            <dl className="kv">
              <div><dt>Taking card payments</dt><dd>{status.charges_enabled ? "Yes" : "Waiting on Stripe"}</dd></div>
              <div><dt>Paying out to your bank</dt><dd>{status.payouts_enabled ? "Yes" : "Waiting on Stripe"}</dd></div>
            </dl>
            {(!status.charges_enabled || !status.payouts_enabled) && (
              <Notice tone="warn" className="mb-4">Stripe still needs something from you, usually ID verification. Open Stripe to finish.</Notice>
            )}
            <button className="btn btn-primary" onClick={open}><IconExternal size={16} /> Open Stripe</button>
          </>
        ) : (
          <>
            <h2 className="h4">Connect your bank</h2>
            <p className="muted mt-2">
              Until you connect, clients can only pay at the shop. The shop takes nothing from deposits; Stripe keeps about 2.9% plus 30¢ each.
            </p>
            <button className="btn btn-primary btn-lg mt-5" onClick={connect} disabled={busy}>
              {busy ? <Spinner label="Opening Stripe" /> : "Connect with Stripe"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
