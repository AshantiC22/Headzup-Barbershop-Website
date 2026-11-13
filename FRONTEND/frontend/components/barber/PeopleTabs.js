"use client";
// Walk-ins, reschedule requests, clients (with the message blast) and reviews.
import { useEffect, useMemo, useState } from "react";
import API from "@/lib/api";
import { IconArrowRight, IconPlus, IconStar, Modal, Skeleton, Spinner } from "@/components/ui/Feedback";
import { Collapse, Present } from "@/components/ui/motion";
import { fmtTime, todayStr } from "@/lib/time";

// Walk-in
const EMPTY_WALKIN = () => ({ client_name: "", service_id: "", date: todayStr(), time: "", payment_method: "shop", phone: "", email: "", notes: "" });

export function WalkInTab({ services, toast }) {
  const [prices, setPrices] = useState([]);
  const [f, setF] = useState(EMPTY_WALKIN);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState({});
  useEffect(() => { API.get("barber/service-prices/").then((r) => setPrices(r.data || [])).catch(() => {}); }, []);
  const opts = prices.length ? prices : services;
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const fe = {};
    if (!f.client_name.trim()) fe.client_name = "Who's in the chair?";
    if (!f.service_id) fe.service_id = "Pick the service.";
    if (!f.time) fe.time = "Pick a time.";
    setErrs(fe);
    if (Object.keys(fe).length) return;
    setBusy(true);
    try {
      await API.post("barber/walk-in/", f);
      toast(`${f.client_name.trim()} is on the books`);
      setF(EMPTY_WALKIN());
    } catch (err) { toast(err?.response?.data?.error || "The walk-in wasn't added.", "bad"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="tab-head"><div><h1 className="h2">Walk-in</h1><p className="muted">Put someone on the books on the spot.</p></div></div>
      <form className="panel panel-pad form-grid w-l" onSubmit={submit} noValidate>
        <div className="field span-2">
          <label className="label" htmlFor="wi-name">Client name</label>
          <input id="wi-name" className="input" value={f.client_name} onChange={set("client_name")} aria-invalid={!!errs.client_name} autoComplete="off" />
          {errs.client_name && <p className="field-error">{errs.client_name}</p>}
        </div>
        <div className="field">
          <label className="label" htmlFor="wi-phone">Phone <span className="label-note">(optional)</span></label>
          <input id="wi-phone" className="input" type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} />
        </div>
        <div className="field">
          <label className="label" htmlFor="wi-email">Email <span className="label-note">(optional)</span></label>
          <input id="wi-email" className="input" type="email" value={f.email} onChange={set("email")} />
        </div>
        <div className="field span-2">
          <label className="label" htmlFor="wi-svc">Service</label>
          <select id="wi-svc" className="select" value={f.service_id} onChange={set("service_id")} aria-invalid={!!errs.service_id}>
            <option value="">Choose a service</option>
            {opts.map((s) => <option key={s.id} value={s.id}>{s.name}, ${s.effective_price ?? s.price}</option>)}
          </select>
          {errs.service_id && <p className="field-error">{errs.service_id}</p>}
        </div>
        <div className="field">
          <label className="label" htmlFor="wi-date">Day</label>
          <input id="wi-date" className="input" type="date" value={f.date} onChange={set("date")} />
        </div>
        <div className="field">
          <label className="label" htmlFor="wi-time">Time</label>
          <input id="wi-time" className="input" type="time" value={f.time} onChange={set("time")} aria-invalid={!!errs.time} />
          {errs.time && <p className="field-error">{errs.time}</p>}
        </div>
        <div className="field span-2">
          <label className="label" htmlFor="wi-pay">Payment</label>
          <select id="wi-pay" className="select" value={f.payment_method} onChange={set("payment_method")}>
            <option value="shop">Paying at the shop</option>
            <option value="online">Paid online</option>
          </select>
        </div>
        <div className="field span-2">
          <label className="label" htmlFor="wi-notes">Notes <span className="label-note">(optional)</span></label>
          <textarea id="wi-notes" className="textarea" rows={2} value={f.notes} onChange={set("notes")} />
        </div>
        <button className="btn btn-primary btn-lg span-2" disabled={busy}>{busy ? <Spinner label="Adding" /> : "Add walk-in"}</button>
      </form>
    </div>
  );
}

export function ReschedulesTab({ toast, onCount }) {
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    API.get("barber/reschedules/", { _noCache: true }).then((r) => setList(r.data || [])).catch(() => setList([]));
  }, []);
  useEffect(() => { if (list) onCount?.(list.filter((r) => r.status === "pending").length); }, [list, onCount]);

  const act = async (id, action) => {
    setBusy(id);
    try {
      await API.post(`barber/reschedules/${id}/`, { action });
      setList((p) => p.map((r) => (r.id === id ? { ...r, status: action === "accept" ? "accepted" : "rejected" } : r)));
      toast(action === "accept" ? "Approved. The client has the new time." : "Declined. They keep their original time.");
    } catch { toast("That didn't go through.", "bad"); }
    finally { setBusy(null); }
  };

  const pending = (list || []).filter((r) => r.status === "pending");
  return (
    <div>
      <div className="tab-head"><div><h1 className="h2">Reschedule requests</h1><p className="muted">{pending.length ? `${pending.length} waiting on you` : "You're all caught up."}</p></div></div>
      {!list ? <Skeleton h={140} /> : list.length === 0 ? (
        <div className="empty"><p className="h4">No requests.</p><p className="small muted mt-2">When a client asks for a new time, it shows up here.</p></div>
      ) : (
        <ul className="stack" style={{ "--stack": "12px" }}>
          {list.map((r) => (
            <li key={r.id} className="panel panel-pad">
              <div className="spread" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <p className="h4">{r.client_name}</p>
                  <p className="small muted">{r.service_name}</p>
                </div>
                <span className={`chip ${r.status === "pending" ? "chip-warn" : r.status === "accepted" ? "chip-ok" : "chip-quiet"}`}>
                  {r.status === "pending" ? "Waiting on you" : r.status === "accepted" ? "Approved" : "Declined"}
                </span>
              </div>
              <div className="swap">
                <div><p className="small faint">Booked for</p><p style={{ fontWeight: 650 }}>{r.original_date}, {fmtTime(r.original_time)}</p></div>
                <IconArrowRight size={20} className="swap-arrow" />
                <div><p className="small faint">Wants</p><p style={{ fontWeight: 650, color: "var(--accent-ink)" }}>{r.requested_date}, {fmtTime(r.requested_time)}</p></div>
              </div>
              {r.status === "pending" && (
                <div className="row-wrap mt-4">
                  <button className="btn btn-primary btn-sm" disabled={busy === r.id} onClick={() => act(r.id, "accept")}>Approve new time</button>
                  <button className="btn btn-ghost btn-sm" disabled={busy === r.id} onClick={() => act(r.id, "reject")}>Keep original</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Clients + blast
const TEMPLATES = [
  { label: "Now booking online", subject: "HEADZ UP Barbershop is booking online",
    msg: "Hey {name}, it's HEADZ UP Barbershop on West 4th. You can book your next cut online now: pick your barber and a time at headzupp.com\n\n2509 W 4th St, Hattiesburg\nReply STOP to opt out" },
  { label: "Come back", subject: "Time for a fresh cut?",
    msg: "Hey {name}, it's been a minute. Ready for a fresh cut? Book any time at headzupp.com\n\nHEADZ UP Barbershop, 2509 W 4th St\nReply STOP to opt out" },
  { label: "This week's deal", subject: "This week at HEADZ UP",
    msg: "Hey {name}, we've got something special this week at HEADZ UP. Details and booking at headzupp.com\n\nReply STOP to opt out" },
  { label: "Hours changed", subject: "Updated hours at HEADZ UP",
    msg: "Hey {name}, heads up: our hours changed. See the new times and book at headzupp.com\n\nReply STOP to opt out" },
];

function Blast({ clients, preselect, open, onClose, toast }) {
  const [form, setForm] = useState({ subject: TEMPLATES[0].subject, message: "", send_sms: true, send_email: true });
  const [sel, setSel] = useState(preselect);
  const [ext, setExt] = useState([]);
  const [extForm, setExtForm] = useState({ name: "", phone: "", email: "" });
  const [busy, setBusy] = useState(false);
  const toggle = (id) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const total = sel.length + ext.length;

  const addExt = () => {
    if (!extForm.phone.trim() && !extForm.email.trim()) return toast("Add a phone number or email.", "bad");
    setExt((p) => [...p, { id: `x${Date.now()}`, name: extForm.name.trim() || "Friend", phone: extForm.phone.trim(), email: extForm.email.trim() }]);
    setExtForm({ name: "", phone: "", email: "" });
  };

  const send = async () => {
    if (!form.message.trim()) return toast("Write the message first.", "bad");
    if (!total) return toast("Choose at least one person.", "bad");
    if (!form.send_sms && !form.send_email) return toast("Choose text, email, or both.", "bad");
    const recipients = [
      ...clients.filter((c) => sel.includes(c.id)).map((c) => ({ id: c.id, name: c.name, phone: c.phone || "", email: c.email || "" })),
      ...ext.map(({ name, phone, email }) => ({ name, phone, email })),
    ];
    setBusy(true);
    try {
      const r = await API.post("barber/blast/", { ...form, recipients });
      toast(`Sent: ${r.data?.sms_sent || 0} texts, ${r.data?.email_sent || 0} emails`);
      onClose();
    } catch { toast("The message didn't send.", "bad"); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} wide title="Message clients">
      <p className="label mb-2">Start from</p>
      <div className="pills mb-4">
        {TEMPLATES.map((t) => (
          <button key={t.label} type="button" className="pill" onClick={() => setForm((p) => ({ ...p, subject: t.subject, message: t.msg }))}>{t.label}</button>
        ))}
      </div>
      <div className="field">
        <label className="label" htmlFor="bl-subj">Email subject</label>
        <input id="bl-subj" className="input" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
      </div>
      <div className="field">
        <label className="label" htmlFor="bl-msg">Message</label>
        <textarea id="bl-msg" className="textarea" rows={5} value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
          placeholder="Use {name} and it becomes each person's first name." />
        <p className="field-hint">
          {form.message.length} characters. {form.message.includes("headzupp.com") ? "Includes the booking link." : (
            <button type="button" className="link" onClick={() => setForm((p) => ({ ...p, message: `${p.message}${p.message ? "\n\n" : ""}Book at headzupp.com` }))}>Add the booking link</button>
          )}
        </p>
      </div>
      <div className="row-wrap mt-4 mb-4">
        <label className="check"><input type="checkbox" checked={form.send_sms} onChange={(e) => setForm((p) => ({ ...p, send_sms: e.target.checked }))} /> Text</label>
        <label className="check"><input type="checkbox" checked={form.send_email} onChange={(e) => setForm((p) => ({ ...p, send_email: e.target.checked }))} /> Email</label>
      </div>

      <div className="spread mt-2">
        <p className="label">Send to {total}</p>
        <div className="row">
          <button type="button" className="btn btn-quiet btn-xs" onClick={() => setSel(clients.map((c) => c.id))}>Everyone</button>
          <button type="button" className="btn btn-quiet btn-xs" onClick={() => setSel([])}>No one</button>
        </div>
      </div>
      <div className="pick-list">
        {clients.map((c) => (
          <label key={c.id} className="check pick">
            <input type="checkbox" checked={sel.includes(c.id)} onChange={() => toggle(c.id)} />
            <span>{c.name}{c.is_vip && " (VIP)"}</span>
          </label>
        ))}
        {ext.map((x) => (
          <span key={x.id} className="chip chip-plain">{x.name}
            <button type="button" aria-label={`Remove ${x.name}`} onClick={() => setExt((p) => p.filter((y) => y.id !== x.id))}>×</button>
          </span>
        ))}
      </div>
      <details className="ext-add">
        <summary>Add someone who isn&apos;t a client yet</summary>
        <div className="form-grid mt-3">
          <input className="input" placeholder="Name" aria-label="Name" value={extForm.name} onChange={(e) => setExtForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="input" placeholder="Phone" aria-label="Phone" type="tel" value={extForm.phone} onChange={(e) => setExtForm((p) => ({ ...p, phone: e.target.value }))} />
          <input className="input span-2" placeholder="Email" aria-label="Email" type="email" value={extForm.email} onChange={(e) => setExtForm((p) => ({ ...p, email: e.target.value }))} />
          <button type="button" className="btn btn-ghost span-2" onClick={addExt}><IconPlus size={16} /> Add to this message</button>
        </div>
      </details>
      <button className="btn btn-primary btn-lg btn-block mt-5" disabled={busy} onClick={send}>
        {busy ? <Spinner label="Sending" /> : `Send to ${total} ${total === 1 ? "person" : "people"}`}
      </button>
    </Modal>
  );
}

export function ClientsTab({ toast }) {
  const [clients, setClients] = useState(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [blast, setBlast] = useState(null);
  const load = () => API.get("barber/clients/", { _noCache: true }).then((r) => setClients(r.data || [])).catch(() => setClients([]));
  useEffect(() => { load(); }, []);
  const shown = useMemo(() => (clients || []).filter((c) => !q || `${c.name} ${c.email}`.toLowerCase().includes(q.toLowerCase())), [clients, q]);

  const vip = async (c) => {
    try { await API.patch(`barber/clients/${c.id}/`, { is_vip: !c.is_vip }); setClients((p) => p.map((x) => (x.id === c.id ? { ...x, is_vip: !c.is_vip } : x))); }
    catch { toast("That didn't save.", "bad"); }
  };

  return (
    <div>
      <div className="tab-head">
        <div><h1 className="h2">Clients</h1><p className="muted">{clients ? `${clients.length} people have sat in your chair` : "Loading"}</p></div>
        <button className="btn btn-primary btn-sm" disabled={!clients?.length} onClick={() => setBlast(clients.map((c) => c.id))}>Message clients</button>
      </div>
      <input className="input mb-5 w-s" type="search" placeholder="Search by name or email" aria-label="Search clients" value={q} onChange={(e) => setQ(e.target.value)} />
      {!clients ? <Skeleton h={200} /> : shown.length === 0 ? (
        <div className="empty"><p className="h4">{q ? "No one by that name." : "No clients yet."}</p></div>
      ) : (
        <ul className="stack" style={{ "--stack": "8px" }}>
          {shown.map((c) => (
            <li key={c.id} className="appt">
              <button className="appt-head" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>
                <span className="avatar" aria-hidden="true">{(c.name || "?").charAt(0).toUpperCase()}</span>
                <span className="grow">
                  <span className="h4">{c.name}{c.is_vip && <span className="chip chip-warn chip-plain chip-after">VIP</span>}</span>
                  <span className="small muted">{c.total_visits} visit{c.total_visits === 1 ? "" : "s"}{c.last_visit ? `, last ${c.last_visit}` : ""}</span>
                </span>
              </button>
              <Collapse open={open === c.id}>
                <div className="appt-body">
                  <dl className="kv">
                    <div className="kv-wide"><dt>Email</dt><dd className="break-anywhere">{c.email || "None"}</dd></div>
                    <div><dt>Finished cuts</dt><dd>{c.completed ?? c.total_visits}</dd></div>
                    <div><dt>No-shows</dt><dd>{c.no_shows || 0}</dd></div>
                    {c.last_service && <div><dt>Last service</dt><dd>{c.last_service}</dd></div>}
                  </dl>
                  <div className="row-wrap">
                    <button className="btn btn-ghost btn-sm" onClick={() => vip(c)}>{c.is_vip ? "Remove VIP" : "Mark as VIP"}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setBlast([c.id])}>Message {c.name.split(" ")[0]}</button>
                  </div>
                </div>
              </Collapse>
            </li>
          ))}
        </ul>
      )}
      <Present value={blast}>
        {(ids, open) => <Blast clients={clients || []} preselect={ids} open={open} onClose={() => setBlast(null)} toast={toast} />}
      </Present>
    </div>
  );
}

export function ReviewsTab({ toast, onSeen }) {
  const [data, setData] = useState(null);
  const [reply, setReply] = useState({});
  const [busy, setBusy] = useState(null);
  const load = () => API.get("barber/reviews/", { _noCache: true }).then((r) => setData(r.data)).catch(() => setData({ reviews: [] }));
  useEffect(() => { load(); onSeen?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const post = async (id) => {
    if (!reply[id]?.trim()) return;
    setBusy(id);
    try { await API.patch(`barber/reviews/${id}/`, { barber_reply: reply[id].trim() }); await load(); toast("Reply posted"); }
    catch { toast("The reply didn't post.", "bad"); }
    finally { setBusy(null); }
  };

  const list = data?.reviews || [];
  const avg = data?.average_rating ?? (list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0);
  return (
    <div>
      <div className="tab-head">
        <div>
          <h1 className="h2">Reviews</h1>
          <p className="muted">{list.length ? `${Number(avg).toFixed(1)} average from ${list.length} review${list.length === 1 ? "" : "s"}` : "None yet"}</p>
        </div>
      </div>
      {!data ? <Skeleton h={180} /> : list.length === 0 ? (
        <div className="empty"><p className="h4">No reviews yet.</p><p className="small muted mt-2">Marking a cut done sends the client a review request.</p></div>
      ) : (
        <ul className="stack" style={{ "--stack": "12px" }}>
          {list.map((r) => (
            <li key={r.id} className="panel panel-pad">
              <div className="spread" style={{ flexWrap: "wrap" }}>
                <p className="h4">{r.client}</p>
                <span className="row" style={{ gap: 2, color: "var(--accent)" }} aria-label={`${r.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((n) => <IconStar key={n} filled={n <= r.rating} size={18} />)}
                </span>
              </div>
              <p className="small faint">{r.created_at}</p>
              {r.comment && <p className="placard-medium mt-3" style={{ fontSize: "1.05rem" }}>&ldquo;{r.comment}&rdquo;</p>}
              {r.barber_reply ? (
                <div className="notice mt-4"><div><strong>Your reply</strong><p>{r.barber_reply}</p></div></div>
              ) : (
                <div className="mt-4">
                  <label className="sr-only" htmlFor={`rp-${r.id}`}>Reply to {r.client}</label>
                  <textarea id={`rp-${r.id}`} className="textarea" rows={2} placeholder={`Say thanks to ${r.client}`}
                    value={reply[r.id] || ""} onChange={(e) => setReply((p) => ({ ...p, [r.id]: e.target.value }))} />
                  <button className="btn btn-ghost btn-sm mt-2" disabled={busy === r.id || !reply[r.id]?.trim()} onClick={() => post(r.id)}>
                    {busy === r.id ? <Spinner label="Posting" /> : "Post reply"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
