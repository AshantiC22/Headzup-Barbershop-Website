"use client";
// My appointments (client). Same API as before: dashboard/, appointments/,
// client/strike-status/, appointments/:id/ (cancel), appointments/:id/reschedule/,
// review/submit/, client/update-phone/, change-password/.
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import API from "@/lib/api";
import { arrowSelect } from "@/components/ui/roving";
import { useAlerts } from "@/components/Alerts";
import { ThemeToggle } from "@/components/ThemeProvider";
import AppHeader from "@/components/site/AppHeader";
import { Calendar, SlotPicker, WorkWeek, makeDayRule } from "@/components/booking/Calendar";
import StarRating from "@/components/ui/StarRating";
import {
  IconBell,
  IconCalendar,
  IconChevronDown,
  IconPin,
  Modal,
  Notice,
  Skeleton,
  Spinner,
  useToasts,
} from "@/components/ui/Feedback";
import { normalizePhone } from "@/components/auth/AuthParts";
import { Collapse, Present } from "@/components/ui/motion";
import { SHOP } from "@/lib/shop";
import { apptDate, fmtDate, fmtTime, parseDate, timeUntil, to24Hour } from "@/lib/time";

const STATUS = {
  confirmed: { label: "Confirmed", chip: "chip-ok" },
  pending_shop: { label: "Booked, pay at shop", chip: "chip-warn" },
  completed: { label: "Done", chip: "chip-info" },
  cancelled: { label: "Cancelled", chip: "chip-quiet" },
  no_show: { label: "Missed", chip: "chip-bad" },
};
const money = (n) => {
  const v = parseFloat(n || 0);
  return `$${v.toFixed(v % 1 ? 2 : 0)}`;
};
const TIERS = [
  [0, "New client"],
  [5, "Rising"],
  [10, "Regular"],
  [20, "VIP"],
];

function Leaf({ date }) {
  const d = parseDate(date);
  return (
    <span className="leaf" aria-hidden="true">
      <span className="leaf-m">{d.toLocaleDateString("en-US", { month: "short" })}</span>
      <span className="leaf-d">{d.getDate()}</span>
      <span className="leaf-w">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
    </span>
  );
}

function payLine(a) {
  if (a.payment_method === "online" && a.deposit_paid) {
    const rest = parseFloat(a.service_price || 0) - parseFloat(a.deposit_amount || 0);
    return `${money(a.deposit_amount || 10)} deposit paid${rest > 0 ? `, ${money(rest)} due in the chair` : ""}`;
  }
  if (a.payment_method === "online") return "Deposit not paid yet";
  return `${money(a.service_price)} at the shop`;
}

function ApptRow({ a, onCancel, onReschedule, onReview }) {
  const [open, setOpen] = useState(false);
  const st = STATUS[a.status] || STATUS.confirmed;
  const when = apptDate(a.date, a.time);
  const upcoming = when > new Date() && !["cancelled", "no_show", "completed"].includes(a.status);
  const faded = ["cancelled", "no_show"].includes(a.status);
  const id = `appt-${a.id}`;
  return (
    <li className={`appt ${faded ? "is-faded" : ""}`}>
      <button className="appt-head" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        <Leaf date={a.date} />
        <span className="grow">
          <span className="h4">{a.service_name || "Appointment"}</span>
          <span className="muted small">
            {fmtTime(a.time)} with {a.barber_name}
          </span>
          <span className={`chip ${st.chip} mt-2`}>{st.label}</span>
        </span>
        <IconChevronDown />
      </button>
      <Collapse open={open} id={id}>
        <div className="appt-body">
          <dl className="kv">
            <div>
              <dt>When</dt>
              <dd>
                {fmtDate(a.date, "long")}, {fmtTime(a.time)}
              </dd>
            </div>
            <div>
              <dt>Length</dt>
              <dd>{a.service_duration || 30} min</dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd>{money(a.service_price)}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>{payLine(a)}</dd>
            </div>
          </dl>
          {upcoming && (
            <div className="row-wrap">
              <button className="btn btn-ghost btn-sm" onClick={() => onReschedule(a)}>
                Reschedule
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => onCancel(a)}>
                Cancel
              </button>
            </div>
          )}
          {a.status === "completed" && !a.has_review && (
            <button className="btn btn-primary btn-sm" onClick={() => onReview(a)}>
              Review this cut
            </button>
          )}
          {a.status === "no_show" && <p className="small muted">This one was marked as missed.</p>}
        </div>
      </Collapse>
    </li>
  );
}

function CancelDialog({ appt, open, onClose, onConfirm, busy }) {
  const hrs = (apptDate(appt.date, appt.time) - new Date()) / 3600e3;
  const late = hrs >= 0 && hrs < 2;
  const paid = appt.payment_method === "online" && appt.deposit_paid;
  return (
    <Modal open={open} onClose={onClose} title={late ? "Cancel this late?" : "Cancel this appointment?"}>
      <p className="muted">
        {appt.service_name} with {appt.barber_name}, {fmtDate(appt.date, "long")} at {fmtTime(appt.time)}.
      </p>
      {late ? (
        <Notice tone="warn" className="mt-4">
          It&apos;s less than 2 hours away. Cancelling now can add a strike, which raises future deposits. Calling the
          shop at{" "}
          <a className="link" href={`tel:${SHOP.phone}`}>
            {SHOP.phoneDisplay}
          </a>{" "}
          is the kinder move.
        </Notice>
      ) : paid ? (
        <Notice tone="warn" className="mt-4">
          Your {money(appt.deposit_amount || 10)} deposit isn&apos;t refunded when you cancel.
        </Notice>
      ) : null}
      <div className="row-wrap mt-5">
        <button className="btn btn-danger grow" disabled={busy} onClick={onConfirm}>
          {busy ? <Spinner label="Cancelling" /> : "Cancel appointment"}
        </button>
        <button className="btn btn-ghost grow" onClick={onClose}>
          Keep it
        </button>
      </div>
    </Modal>
  );
}

function RescheduleDialog({ appt, open, onClose, onDone }) {
  const bid = appt?.barber_id || appt?.barber;
  const sid = appt?.service_id || appt?.service;
  const [days, setDays] = useState({ all: [], off: [], loading: true });
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState({ list: [], loading: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!bid) return;
    API.get(`barbers/${bid}/working-days/`)
      .then((r) => setDays({ all: r.data.all_days || [], off: r.data.time_off_dates || [], loading: false }))
      .catch(() => setDays({ all: [], off: [], loading: false }));
  }, [bid]);
  useEffect(() => {
    if (!date || !bid) return;
    setSlots({ list: [], loading: true });
    setTime("");
    API.get(`available-slots/?barber=${bid}&date=${date}&service=${sid || ""}`)
      .then((r) => setSlots({ list: r.data.available_slots || [], loading: false }))
      .catch(() => setSlots({ list: [], loading: false }));
  }, [date, bid, sid]);
  const rule = useMemo(() => makeDayRule(days.all, days.off), [days]);

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      await API.post(`appointments/${appt.id}/reschedule/`, { new_date: date, new_time: to24Hour(time) });
      onDone();
    } catch (e) {
      setErr(e?.response?.data?.error || "The request didn't send. Try another time.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} wide title="Ask for a new time">
      <p className="muted mb-4">
        {appt.barber_name} gets your request and approves it. Until then you keep {fmtDate(appt.date)} at{" "}
        {fmtTime(appt.time)}.
      </p>
      {days.loading ? (
        <Skeleton h={280} />
      ) : (
        <>
          <Calendar value={date} onChange={setDate} isDisabled={rule} label={`Days ${appt.barber_name} is working`} />
          <WorkWeek allDays={days.all} />
        </>
      )}
      {date && (
        <div className="mt-5">
          <p className="label mb-3">{fmtDate(date, "long")}</p>
          {!slots.loading && slots.list.length === 0 ? (
            <p className="muted small">No open times that day. Try another.</p>
          ) : (
            <SlotPicker slots={slots.list} value={time} onChange={setTime} loading={slots.loading} />
          )}
        </div>
      )}
      {err && (
        <Notice tone="bad" className="mt-4">
          {err}
        </Notice>
      )}
      <button className="btn btn-primary btn-lg btn-block mt-5" disabled={!date || !time || busy} onClick={submit}>
        {busy ? (
          <Spinner label="Sending" />
        ) : time ? (
          `Request ${fmtDate(date)} at ${fmtTime(time)}`
        ) : (
          "Pick a day and time"
        )}
      </button>
    </Modal>
  );
}

function ReviewDialog({ appt, open, onClose, onDone }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      await API.post("review/submit/", { appointment_id: appt.id, completed: true, rating, comment: text.trim() });
      onDone(rating);
    } catch (e) {
      setErr(e?.response?.data?.error || "The review didn't send. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="How was the cut?">
      <p className="muted mb-4">
        {appt.service_name} with {appt.barber_name}, {fmtDate(appt.date, "long")}.
      </p>
      <StarRating value={rating} onChange={setRating} />
      <div className="field mt-3">
        <label className="label" htmlFor="rv">
          Say a little more <span className="label-note">(optional)</span>
        </label>
        <textarea
          id="rv"
          className="textarea"
          rows={3}
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="The fade, the lineup, the vibe…"
        />
      </div>
      {err && (
        <Notice tone="bad" className="mt-3">
          {err}
        </Notice>
      )}
      <button className="btn btn-primary btn-lg btn-block mt-5" disabled={busy} onClick={submit}>
        {busy ? <Spinner label="Sending" /> : `Send ${rating}-star review`}
      </button>
    </Modal>
  );
}

function AccountTab({ user, strike, visits, spent, toast }) {
  const { pushOn, askForPush } = useAlerts();
  const [phone, setPhone] = useState(strike?.phone || "");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [pw, setPw] = useState({ old_password: "", new_password: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const tier = [...TIERS].reverse().find(([n]) => visits >= n);
  const nextTier = TIERS.find(([n]) => n > visits);

  const savePhone = async (e) => {
    e.preventDefault();
    const norm = normalizePhone(phone);
    if (!norm) return toast("Enter a 10-digit US number.", "bad");
    setPhoneBusy(true);
    try {
      await API.patch("client/update-phone/", { phone: norm });
      toast("Phone number saved");
    } catch {
      toast("The number didn't save.", "bad");
    } finally {
      setPhoneBusy(false);
    }
  };
  const savePw = async (e) => {
    e.preventDefault();
    if (pw.new_password.length < 8) return setPwErr("Use at least 8 characters.");
    setPwBusy(true);
    setPwErr("");
    try {
      await API.post("change-password/", pw);
      setPw({ old_password: "", new_password: "" });
      toast("Password changed");
    } catch (err) {
      setPwErr(err?.response?.data?.error || "That didn't work. Check your current password.");
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="account-grid">
      <section className="panel panel-pad">
        <h2 className="h3">{tier?.[1] || "New client"}</h2>
        <p className="muted mt-1">
          {visits} visit{visits === 1 ? "" : "s"}, {money(spent)} all told.
          {nextTier ? ` ${nextTier[0] - visits} more to ${nextTier[1]}.` : " Top of the list."}
        </p>
        {nextTier && (
          <div
            className="meter mt-4"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={nextTier[0]}
            aria-valuenow={visits}
          >
            <span style={{ width: `${Math.min(100, (visits / nextTier[0]) * 100)}%` }} />
          </div>
        )}
        <dl className="kv mb-0">
          <div>
            <dt>Username</dt>
            <dd>{user?.user || user?.username}</dd>
          </div>
          <div className="kv-wide">
            <dt>Email</dt>
            <dd className="break-anywhere">{user?.email || "None on file"}</dd>
          </div>
          <div>
            <dt>Strikes</dt>
            <dd>{strike?.strike_count ?? 0}</dd>
          </div>
          <div>
            <dt>Next deposit</dt>
            <dd>{money(strike?.deposit_fee || 10)}</dd>
          </div>
        </dl>
      </section>

      <form className="panel panel-pad" onSubmit={savePhone}>
        <h2 className="h4">Mobile number</h2>
        <p className="small muted mt-1">Booking texts and reminders go here.</p>
        <div className="row mt-3">
          <input
            className="input"
            type="tel"
            inputMode="tel"
            aria-label="Mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(601) 555-0100"
            autoComplete="tel"
          />
          <button className="btn btn-primary" disabled={phoneBusy}>
            {phoneBusy ? <Spinner /> : "Save"}
          </button>
        </div>
      </form>

      <form className="panel panel-pad" onSubmit={savePw}>
        <h2 className="h4">Change password</h2>
        <div className="field mt-3">
          <label className="label" htmlFor="pw-old">
            Current password
          </label>
          <input
            id="pw-old"
            className="input"
            type="password"
            autoComplete="current-password"
            value={pw.old_password}
            onChange={(e) => setPw((p) => ({ ...p, old_password: e.target.value }))}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="pw-new">
            New password
          </label>
          <input
            id="pw-new"
            className="input"
            type="password"
            autoComplete="new-password"
            value={pw.new_password}
            onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))}
          />
          <p className="field-hint">At least 8 characters.</p>
        </div>
        {pwErr && <p className="field-error mt-2">{pwErr}</p>}
        <button className="btn btn-ghost mt-4" disabled={pwBusy || !pw.old_password || !pw.new_password}>
          {pwBusy ? <Spinner label="Saving" /> : "Change password"}
        </button>
      </form>

      <section className="panel panel-pad">
        <h2 className="h4">Notifications and look</h2>
        <div className="spread mt-3">
          <span className="row small">
            <IconBell /> {pushOn ? "Alerts are on for this device" : "Alerts are off on this device"}
          </span>
          {!pushOn && (
            <button className="btn btn-ghost btn-sm" onClick={askForPush}>
              Turn on
            </button>
          )}
        </div>
        <div className="mt-4">
          <ThemeToggle />
        </div>
        <div className="row-wrap small mt-5">
          <Link className="link" href="/sms-optin">
            Text message settings
          </Link>
          <Link className="link" href="/waitlist">
            Waitlist
          </Link>
          <Link className="link" href="/terms">
            Terms
          </Link>
        </div>
      </section>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { notify, offerPush } = useAlerts();
  const [toastHost, toast] = useToasts();
  const [user, setUser] = useState(null);
  const [appts, setAppts] = useState([]);
  const [strike, setStrike] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");
  const [cancelling, setCancelling] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [resched, setResched] = useState(null);
  const [review, setReview] = useState(null);
  const [phone, setPhone] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [hidePhone, setHidePhone] = useState(false);

  useEffect(() => offerPush(), [offerPush]);

  useEffect(() => {
    let token = null;
    try {
      token = localStorage.getItem("access");
    } catch {}
    if (!token) {
      router.replace("/login?next=/dashboard");
      return;
    }
    (async () => {
      try {
        const [dash, list] = await Promise.all([API.get("dashboard/"), API.get("appointments/", { _noCache: true })]);
        if (dash.data.is_staff) {
          router.replace("/barber-dashboard");
          return;
        }
        setUser(dash.data);
        setAppts(Array.isArray(list.data) ? list.data : list.data?.results || []);
        API.get("client/strike-status/")
          .then((r) => setStrike(r.data))
          .catch(() => {});
      } catch (e) {
        if (e?.response?.status === 401) router.replace("/login?next=/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // Still "coming up" until an hour after the start time.
  const upcoming = useMemo(() => {
    const cutoff = new Date(Date.now() - 3600e3);
    return appts
      .filter((a) => !["cancelled", "no_show", "completed"].includes(a.status) && apptDate(a.date, a.time) >= cutoff)
      .sort((a, b) => apptDate(a.date, a.time) - apptDate(b.date, b.time));
  }, [appts]);
  const past = useMemo(
    () =>
      appts
        .filter((a) => a.status !== "cancelled" && !upcoming.includes(a))
        .sort((a, b) => apptDate(b.date, b.time) - apptDate(a.date, a.time)),
    [appts, upcoming],
  );
  const cancelled = appts.filter((a) => a.status === "cancelled");
  const toReview = past.find((a) => a.status === "completed" && !a.has_review);
  const visits = appts.filter((a) => a.status === "completed").length;
  const spent = appts.filter((a) => a.status === "completed").reduce((s, a) => s + parseFloat(a.service_price || 0), 0);
  const next = upcoming[0];

  // ?review=true opens the latest unreviewed cut; ?booked=true says so.
  useEffect(() => {
    if (loading) return;
    if (params.get("review") === "true" && toReview) setReview(toReview);
    if (params.get("booked") === "true") toast("You're booked. See you soon.");
    if (params.get("review") || params.get("booked")) window.history.replaceState({}, "", "/dashboard");
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmCancel = async () => {
    setCancelBusy(true);
    try {
      await API.patch(`appointments/${cancelling.id}/`, { status: "cancelled" });
      setAppts((p) => p.map((a) => (a.id === cancelling.id ? { ...a, status: "cancelled" } : a)));
      toast("Appointment cancelled. The barber has been told.");
      setCancelling(null);
    } catch (e) {
      toast(
        e?.response?.data?.detail || e?.response?.data?.error || "It didn't cancel. Call the shop if it's close.",
        "bad",
      );
    } finally {
      setCancelBusy(false);
    }
  };

  const savePhone = async (e) => {
    e.preventDefault();
    const norm = normalizePhone(phone);
    if (!norm) return toast("Enter a 10-digit US number.", "bad");
    setPhoneBusy(true);
    try {
      await API.patch("client/update-phone/", { phone: norm });
      setStrike((s) => ({ ...(s || {}), phone: norm }));
      toast("Phone saved. Reminders will text you.");
    } catch {
      toast("The number didn't save.", "bad");
    } finally {
      setPhoneBusy(false);
    }
  };

  const addToCal = useCallback((a) => {
    const params = new URLSearchParams({ service: a.service_name, barber: a.barber_name, date: a.date, time: a.time });
    window.open(
      `/booking-confirmed?${params}&payment=${a.payment_method === "online" ? "deposit" : "shop"}&price=${a.service_price}`,
      "_self",
    );
  }, []);

  if (loading) {
    return (
      <>
        <AppHeader title="My appointments" />
        <main className="wrap dash" style={{ maxWidth: 960 }} aria-busy="true">
          <Skeleton h={44} w="50%" />
          <Skeleton h={150} className="mt-6" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h={76} className="mt-3" />
          ))}
        </main>
      </>
    );
  }

  const name = user?.user || user?.username || "there";
  const tabs = [
    ["upcoming", "Coming up", upcoming.length],
    ["past", "Past", past.length],
    ["cancelled", "Cancelled", cancelled.length],
    ["account", "Account", 0],
  ];
  const listFor = { upcoming, past, cancelled }[tab];

  return (
    <>
      <AppHeader title="My appointments">
        <Link href="/book" className="btn btn-primary btn-sm">
          Book a cut
        </Link>
      </AppHeader>
      <main id="main" className="wrap dash" style={{ maxWidth: 960 }}>
        <h1 className="h1">Hey, {name}.</h1>

        {next ? (
          <section className="next-card" aria-labelledby="next-title">
            <Leaf date={next.date} />
            <div className="grow">
              <p className="small muted">Next up, {timeUntil(next.date, next.time) || "now"}</p>
              <h2 id="next-title" className="h2 mt-1">
                {next.service_name}
              </h2>
              <p className="lede mt-2">
                {fmtDate(next.date, "long")} at {fmtTime(next.time)} with {next.barber_name}.
              </p>
              <p className="small muted mt-2">{payLine(next)}</p>
              <div className="row-wrap mt-4">
                <button className="btn btn-ghost btn-sm" onClick={() => setResched(next)}>
                  Reschedule
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => addToCal(next)}>
                  <IconCalendar size={16} /> Calendar
                </button>
                <a className="btn btn-ghost btn-sm" href={SHOP.mapsLink} target="_blank" rel="noopener noreferrer">
                  <IconPin size={16} /> Directions
                </a>
                <button className="btn btn-quiet btn-sm" onClick={() => setCancelling(next)}>
                  Cancel
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="next-card is-empty">
            <div className="grow">
              <h2 className="h3">Nothing on the books.</h2>
              <p className="muted mt-1">Pick a barber and a time; it takes about a minute.</p>
            </div>
            <Link href="/book" className="btn btn-primary btn-lg">
              Book a cut
            </Link>
          </section>
        )}

        <div className="stack mt-5" style={{ "--stack": "12px" }}>
          {strike && !strike.phone && !hidePhone && (
            <form
              className="notice notice-info"
              onSubmit={savePhone}
              style={{ flexWrap: "wrap", alignItems: "center" }}
            >
              <div className="grow" style={{ minWidth: 200 }}>
                <strong>Add your mobile number</strong>
                <p className="small">So reminders can text you before your cut.</p>
              </div>
              <div className="row" style={{ flex: "1 1 260px" }}>
                <input
                  className="input"
                  type="tel"
                  inputMode="tel"
                  aria-label="Mobile number"
                  placeholder="(601) 555-0100"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <button className="btn btn-primary" disabled={phoneBusy}>
                  {phoneBusy ? <Spinner /> : "Save"}
                </button>
              </div>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setHidePhone(true)}>
                Not now
              </button>
            </form>
          )}
          {strike?.strike_count > 0 && (
            <Notice tone="warn">
              <strong>
                {strike.strike_count} strike{strike.strike_count === 1 ? "" : "s"} on your account.
              </strong>{" "}
              Your next online deposit is {money(strike.deposit_fee)}. Showing up on time keeps it from climbing.{" "}
              <Link className="link" href="/terms#payments">
                How strikes work
              </Link>
            </Notice>
          )}
          {toReview && (
            <div className="notice notice-ok spread" style={{ flexWrap: "wrap" }}>
              <div className="grow" style={{ minWidth: 200 }}>
                <strong>
                  How was your {toReview.service_name.toLowerCase()} with {toReview.barber_name}?
                </strong>
                <p className="small">{fmtDate(toReview.date, "long")}. A quick rating helps their book fill up.</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setReview(toReview)}>
                Leave a review
              </button>
            </div>
          )}
        </div>

        <div
          className="tabs mt-7"
          role="tablist"
          aria-label="Appointments"
          onKeyDown={(e) =>
            arrowSelect(
              e,
              tabs.map(([id]) => id),
              tab,
              setTab,
            )
          }
        >
          {tabs.map(([id, label, n]) => (
            <button
              key={id}
              role="tab"
              className="tab"
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              id={`tab-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
            >
              {label}
              {n > 0 && <span className="count">{n}</span>}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="fade-in" key={tab}>
          {tab === "account" ? (
            <AccountTab user={user} strike={strike} visits={visits} spent={spent} toast={toast} />
          ) : listFor.length === 0 ? (
            <div className="empty">
              <p className="h4">
                {tab === "upcoming"
                  ? "No appointments coming up."
                  : tab === "past"
                    ? "No past cuts yet."
                    : "Nothing cancelled."}
              </p>
              {tab === "upcoming" && (
                <Link href="/book" className="btn btn-primary mt-4">
                  Book a cut
                </Link>
              )}
            </div>
          ) : (
            <ul className="stack" style={{ "--stack": "10px" }}>
              {listFor.map((a) => (
                <ApptRow key={a.id} a={a} onCancel={setCancelling} onReschedule={setResched} onReview={setReview} />
              ))}
            </ul>
          )}
        </div>
      </main>

      <Present value={cancelling}>
        {(appt, open) => (
          <CancelDialog
            appt={appt}
            open={open}
            busy={cancelBusy}
            onClose={() => setCancelling(null)}
            onConfirm={confirmCancel}
          />
        )}
      </Present>
      <Present value={resched}>
        {(appt, open) => (
          <RescheduleDialog
            appt={appt}
            open={open}
            onClose={() => setResched(null)}
            onDone={() => {
              setResched(null);
              toast(`Request sent. ${appt.barber_name.split(" ")[0]} will confirm.`);
            }}
          />
        )}
      </Present>
      <Present value={review}>
        {(appt, open) => (
          <ReviewDialog
            appt={appt}
            open={open}
            onClose={() => setReview(null)}
            onDone={(r) => {
              setAppts((p) => p.map((a) => (a.id === appt.id ? { ...a, has_review: true } : a)));
              setReview(null);
              toast(`Thanks. Your ${r}-star review is in.`);
              notify("Review sent", "Thanks for the feedback.", "haircut_review");
            }}
          />
        )}
      </Present>
      {toastHost}
    </>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
