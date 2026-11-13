"use client";
// The barber's day: who's in the chair and when, with every action one tap away.
import { useCallback, useEffect, useState } from "react";
import API from "@/lib/api";
import {
  IconChevronDown, IconChevronLeft, IconChevronRight, IconRefresh, Modal, Notice, Skeleton, Spinner,
} from "@/components/ui/Feedback";
import { addDays, apptDate, fmtDate, fmtTime, todayStr } from "@/lib/time";
import { Collapse } from "@/components/ui/motion";

export const B_STATUS = {
  confirmed:    { label: "Confirmed", chip: "chip-ok" },
  pending_shop: { label: "Not checked in", chip: "chip-warn" },
  completed:    { label: "Done", chip: "chip-info" },
  cancelled:    { label: "Cancelled", chip: "chip-quiet" },
  no_show:      { label: "No-show", chip: "chip-bad" },
};
const CLOSED = ["completed", "cancelled", "no_show"];
const money = (n) => { const v = parseFloat(n || 0); return `$${v.toFixed(v % 1 ? 2 : 0)}`; };

function payText(a) {
  if (a.payment_method === "online" && a.deposit_paid) return `${money(a.deposit_amount || 10)} deposit paid online`;
  if (a.payment_method === "online") return "Online, deposit not confirmed";
  return "Pays at the shop";
}

function Row({ a, onStatus, onAsk, onRemind }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(a.barber_notes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const st = B_STATUS[a.status] || B_STATUS.confirmed;
  const closed = CLOSED.includes(a.status);
  const past = apptDate(a.date, a.time) < new Date();
  const [t, ampm] = fmtTime(a.time).split(" ");

  const saveNote = async () => {
    setSaving(true);
    try { await API.patch(`barber/appointments/${a.id}/`, { barber_notes: note }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch {} finally { setSaving(false); }
  };

  return (
    <li className={`sched-row ${closed ? "is-closed" : ""}`}>
      <div className="sched-time" aria-hidden="true"><span>{t}</span><small>{ampm}</small></div>
      <div className="appt grow">
        <button className="appt-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span className="grow">
            <span className="h4">
              <span className="sr-only">{fmtTime(a.time)}, </span>{a.client}
              {a.is_walk_in && <span className="chip chip-plain chip-quiet chip-after">Walk-in</span>}
            </span>
            <span className="muted small">{a.service}, {a.service_duration || 30} min, {money(a.service_price)}</span>
            <span className={`chip ${st.chip} mt-2`}>{st.label}</span>
          </span>
          <IconChevronDown />
        </button>
        <Collapse open={open}>
          <div className="appt-body">
            <dl className="kv">
              <div><dt>Payment</dt><dd>{payText(a)}</dd></div>
              {a.client_email && <div className="kv-wide"><dt>Email</dt><dd className="break-anywhere">{a.client_email}</dd></div>}
            </dl>
            {a.client_notes && (
              <p className="placard-medium mb-4">&ldquo;{a.client_notes}&rdquo;</p>
            )}
            {!closed && (
              <div className="row-wrap mb-4">
                {a.status === "pending_shop" && <button className="btn btn-ok btn-sm" onClick={() => onStatus(a.id, "confirmed")}>Check in</button>}
                {a.status === "confirmed" && <button className="btn btn-primary btn-sm" onClick={() => onAsk("complete", a)}>Mark done</button>}
                <button className="btn btn-ghost btn-sm" onClick={() => onRemind(a.id)}>Send reminder</button>
                {past && <button className="btn btn-danger btn-sm" onClick={() => onAsk("noshow", a)}>No-show</button>}
                <button className="btn btn-quiet btn-sm" onClick={() => onAsk("cancel", a)}>Cancel</button>
              </div>
            )}
            <div className="field">
              <label className="label" htmlFor={`note-${a.id}`}>Your notes on {a.client} <span className="label-note">(only you see these)</span></label>
              <textarea id={`note-${a.id}`} className="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="#2 on the sides, likes the beard squared off" />
            </div>
            <button className="btn btn-ghost btn-sm mt-3" onClick={saveNote} disabled={saving}>
              {saving ? <Spinner label="Saving" /> : saved ? "Saved" : "Save note"}
            </button>
          </div>
        </Collapse>
      </div>
    </li>
  );
}

export default function ScheduleTab({ toast, onSummary }) {
  const [date, setDate] = useState(todayStr());
  const [list, setList] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [ask, setAsk] = useState(null); // { kind, appt }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (d, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const r = await API.get(`barber/schedule/?date=${d}`, { _noCache: true });
      setList(r.data.appointments || []);
      setSummary(r.data.summary || {});
      if (d === todayStr()) onSummary?.(r.data.summary || {});
    } catch {} finally { setLoading(false); }
  }, [onSummary]);

  useEffect(() => { load(date); }, [date, load]);
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) load(date, true); }, 60000);
    return () => clearInterval(id);
  }, [date, load]);

  const setStatus = async (id, status) => {
    try {
      await API.patch(`barber/appointments/${id}/`, { status });
      setList((p) => p.map((a) => (a.id === id ? { ...a, status } : a)));
      toast(status === "completed" ? "Marked done. The review request is on its way." : "Checked in");
    } catch { toast("That didn't update. Try again.", "bad"); }
  };
  const remind = async (id) => {
    try { await API.post(`barber/appointments/${id}/remind/`); toast("Reminder sent"); }
    catch { toast("The reminder didn't send.", "bad"); }
  };

  const doAsk = async () => {
    const { kind, appt } = ask;
    setBusy(true);
    try {
      if (kind === "complete") await setStatus(appt.id, "completed");
      if (kind === "cancel") {
        await API.delete(`barber/appointments/${appt.id}/`);
        setList((p) => p.map((a) => (a.id === appt.id ? { ...a, status: "cancelled" } : a)));
        toast(`Cancelled. ${appt.client} has been told.`);
      }
      if (kind === "noshow") {
        const r = await API.post(`barber/appointments/${appt.id}/strike/`, { reason: "no_show" });
        setList((p) => p.map((a) => (a.id === appt.id ? { ...a, status: "no_show" } : a)));
        toast(`Strike added.${r.data?.next_deposit ? ` Their next deposit is $${r.data.next_deposit}.` : ""}`);
      }
      if (kind === "clear") {
        const active = list.filter((a) => !CLOSED.includes(a.status));
        let n = 0;
        for (const a of active) {
          try { await API.delete(`barber/appointments/${a.id}/`); n++; } catch {}
        }
        setList((p) => p.map((a) => (CLOSED.includes(a.status) ? a : { ...a, status: "cancelled" })));
        toast(`${n} appointment${n === 1 ? "" : "s"} cancelled. Everyone has been told.`);
      }
      setAsk(null);
    } catch { toast("That didn't go through. Try again.", "bad"); }
    finally { setBusy(false); }
  };

  const active = list.filter((a) => !CLOSED.includes(a.status));
  const isToday = date === todayStr();
  const a = ask?.appt;
  const collect = a ? (a.deposit_paid ? parseFloat(a.service_price || 0) - parseFloat(a.deposit_amount || 0) : parseFloat(a.service_price || 0)) : 0;

  return (
    <div>
      <div className="tab-head">
        <div>
          <h1 className="h2">{isToday ? "Today" : fmtDate(date, "long")}</h1>
          <p className="muted">{isToday ? fmtDate(date, "long") : date < todayStr() ? "Looking back" : "Coming up"}</p>
        </div>
        <div className="row-wrap">
          <div className="date-nav">
            <button className="icon-btn" aria-label="Previous day" onClick={() => setDate((d) => addDays(d, -1))}><IconChevronLeft /></button>
            <input type="date" className="input" aria-label="Pick a day" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
            <button className="icon-btn" aria-label="Next day" onClick={() => setDate((d) => addDays(d, 1))}><IconChevronRight /></button>
          </div>
          {!isToday && <button className="btn btn-ghost btn-sm" onClick={() => setDate(todayStr())}>Today</button>}
          <button className="icon-btn" aria-label="Refresh" onClick={() => load(date)}><IconRefresh /></button>
        </div>
      </div>

      <div className="stat-row is-3 mb-6">
        <div className="stat"><span className="stat-n">{summary.total || 0}</span><span className="stat-l">Booked</span></div>
        <div className="stat"><span className="stat-n">{summary.paid_online || 0}</span><span className="stat-l">Paid online</span></div>
        <div className="stat"><span className="stat-n">{summary.pay_in_shop || 0}</span><span className="stat-l">Paying at the shop</span></div>
      </div>

      {loading ? (
        <div className="stack" style={{ "--stack": "10px" }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={78} />)}</div>
      ) : list.length === 0 ? (
        <div className="empty">
          <p className="h4">Nothing booked {isToday ? "today" : "this day"}.</p>
          <p className="muted small mt-2">Walk-ins can be added from the Walk-in tab.</p>
        </div>
      ) : (
        <ul className="stack" style={{ "--stack": "10px" }}>
          {list.map((x) => <Row key={x.id} a={x} onStatus={setStatus} onRemind={remind} onAsk={(kind, appt) => setAsk({ kind, appt })} />)}
        </ul>
      )}

      {active.length > 0 && (
        <div className="mt-7" style={{ paddingTop: 18, borderTop: "1px dashed var(--line-2)" }}>
          <button className="btn btn-danger btn-sm" onClick={() => setAsk({ kind: "clear" })}>Cancel the whole day</button>
          <p className="small faint mt-2">For sick days and emergencies. Every client gets told.</p>
        </div>
      )}

      <Modal open={!!ask} onClose={() => setAsk(null)}
        title={ask?.kind === "complete" ? "Mark this cut done" : ask?.kind === "cancel" ? "Cancel this appointment?" : ask?.kind === "noshow" ? "Mark as a no-show?" : "Cancel the whole day?"}>
        {ask?.kind === "complete" && a && (
          <>
            <dl className="sum-rows">
              <div className="sum-row"><dt>Client</dt><dd>{a.client}</dd></div>
              <div className="sum-row"><dt>Service</dt><dd>{a.service}</dd></div>
              <div className="sum-row"><dt>Price</dt><dd>{money(a.service_price)}</dd></div>
              {a.deposit_paid && <div className="sum-row"><dt>Deposit already paid</dt><dd>{money(a.deposit_amount)}</dd></div>}
              <div className="sum-row sum-total"><dt><strong>Collect now</strong></dt><dd className="price" style={{ fontSize: "1.6rem" }}>{money(collect)}</dd></div>
            </dl>
            <p className="small muted mt-3">{a.client} gets a thank-you and a review request.</p>
          </>
        )}
        {ask?.kind === "cancel" && a && <p className="muted">{a.client}, {a.service} at {fmtTime(a.time)}. They&apos;ll get a text and email.</p>}
        {ask?.kind === "noshow" && a && <Notice tone="warn">{a.client} gets a strike, which raises their next online deposit.</Notice>}
        {ask?.kind === "clear" && (
          <Notice tone="bad">This cancels {active.length} appointment{active.length === 1 ? "" : "s"} on {fmtDate(date, "long")}. Every client is told.</Notice>
        )}
        <div className="row-wrap mt-5">
          <button className={`btn grow ${ask?.kind === "complete" ? "btn-primary" : "btn-danger"}`} disabled={busy} onClick={doAsk}>
            {busy ? <Spinner label="Working" /> : ask?.kind === "complete" ? "Done, money collected" : ask?.kind === "cancel" ? "Cancel appointment" : ask?.kind === "noshow" ? "Add strike" : "Cancel the day"}
          </button>
          <button className="btn btn-ghost grow" onClick={() => setAsk(null)}>{ask?.kind === "complete" ? "Not yet" : "Keep it"}</button>
        </div>
      </Modal>
    </div>
  );
}
