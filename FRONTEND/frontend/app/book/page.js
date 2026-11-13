"use client";
// Booking: service → barber → time → confirm.
// Links from the home page pre-fill choices (?service=Haircut&barber=2), and a
// cancelled Stripe checkout returns to the confirm step with everything kept.
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import API from "@/lib/api";
import FlowHeader from "@/components/site/FlowHeader";
import Impression from "@/components/art/Impression";
import { Calendar, SlotPicker, WorkWeek, makeDayRule } from "@/components/booking/Calendar";
import { IconArrowLeft, Notice, Skeleton, Spinner } from "@/components/ui/Feedback";
import { arrowSelect, rovingIndex } from "@/components/ui/roving";
import { SERVICE_GROUPS, describeService, groupForService } from "@/lib/shop";
import { fmtDate, fmtTime, to24Hour } from "@/lib/time";
import s from "./book.module.css";

const PAY_OPTIONS = ["shop", "online"];
const STEPS = ["Service", "Barber", "Time", "Confirm"];
const DRAFT_KEY = "hu_booking_draft";
const money = (n) => `$${Number(n || 0).toFixed(Number(n) % 1 ? 2 : 0)}`;
const photoOk = (u) => !!u && (u.startsWith("data:") || u.startsWith("https://"));

function Progress({ step, maxStep, onGo }) {
  return (
    <nav className="pole-steps" aria-label="Booking steps" style={{ "--n": STEPS.length }}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "is-done" : n === step ? "is-current" : "";
        const canGo = n < step || n <= maxStep;
        return (
          <button
            key={label}
            className={`pole-step ${state}`}
            disabled={!canGo || n === step}
            onClick={() => onGo(n)}
            aria-current={n === step ? "step" : undefined}
          >
            <span className="bar" aria-hidden="true" />
            <span>
              <span className="faint">{n}</span> {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function SittingPlacard({ service, barber, date, time, price }) {
  if (!service) return null;
  return (
    <div className={`placard ${s.sitting}`}>
      <p className="placard-title">{service.name}</p>
      <p className="placard-medium">
        {[barber && `with ${barber.name}`, date && fmtDate(date, "long"), time && fmtTime(time)]
          .filter(Boolean)
          .join(", ") || "Choose your barber next"}
      </p>
      <p className={`price ${s.sittingPrice}`}>{money(price ?? service.price)}</p>
    </div>
  );
}

function BookContent() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [strike, setStrike] = useState(null);
  const [initLoading, setInitLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [service, setService] = useState(null);
  const [barber, setBarber] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [pay, setPay] = useState("shop");

  const [days, setDays] = useState({ all: [], off: [], loading: false });
  const [slots, setSlots] = useState({ list: [], loading: false, price: null, deposit: null, message: "" });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const go = (n) => {
    setStep(n);
    setMaxStep((m) => Math.max(m, n));
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Load services, barbers, strike status
  useEffect(() => {
    let token = null;
    try {
      token = localStorage.getItem("access");
    } catch {}
    if (!token) {
      const qs = params.toString();
      router.replace(`/login?next=${encodeURIComponent("/book" + (qs ? `?${qs}` : ""))}&reason=book`);
      return;
    }
    Promise.all([API.get("services/"), API.get("barbers/"), API.get("client/strike-status/").catch(() => null)])
      .then(([svc, bar, st]) => {
        const svcList = Array.isArray(svc.data) ? svc.data : svc.data?.results || [];
        const barList = (Array.isArray(bar.data) ? bar.data : bar.data?.results || []).filter((b) => b.id && b.name);
        setServices(svcList);
        setBarbers(barList);
        if (st) setStrike(st.data);

        // Pre-fill from links (?service=Haircut&barber=2) or a cancelled checkout.
        let draft = null;
        if (params.get("deposit_canceled")) {
          try {
            draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
          } catch {}
          setNotice(
            "Checkout was cancelled, so nothing was charged and the spot isn't held yet. Pick how you'd like to pay and try again.",
          );
        }
        const wantSvc = draft?.serviceId ?? params.get("service");
        const wantBar = draft?.barberId ?? params.get("barber");
        const svcHit =
          wantSvc != null
            ? svcList.find(
                (x) => String(x.id) === String(wantSvc) || x.name?.toLowerCase() === String(wantSvc).toLowerCase(),
              )
            : null;
        const barHit = wantBar != null ? barList.find((b) => String(b.id) === String(wantBar)) : null;
        if (svcHit) setService(svcHit);
        if (barHit) setBarber(barHit);
        if (draft?.date) setDate(draft.date);
        if (draft?.time) setTime(draft.time);
        if (draft?.notes) setNotes(draft.notes);
        if (draft?.date && draft?.time && svcHit && barHit) {
          setStep(4);
          setMaxStep(4);
          setPay("online");
        } else if (svcHit && barHit) {
          setStep(3);
          setMaxStep(3);
        } else if (svcHit) {
          setStep(2);
          setMaxStep(2);
        } else if (barHit) {
          setStep(1);
          setMaxStep(1);
        }
      })
      .catch(() => {
        setLoadError("The booking list didn't load. Check your connection and try again.");
      })
      .finally(() => setInitLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, at mount: reads the URL and any saved draft
  }, []);

  // Barber chosen: working days + their price for this service
  useEffect(() => {
    if (!barber) return;
    setDays((d) => ({ ...d, loading: true }));
    API.get(`barbers/${barber.id}/working-days/`)
      .then((r) => setDays({ all: r.data.all_days || [], off: r.data.time_off_dates || [], loading: false }))
      .catch(() => setDays({ all: [], off: [], loading: false }));
    if (service) {
      API.get(`services/?barber=${barber.id}`)
        .then((r) => {
          const list = Array.isArray(r.data) ? r.data : r.data?.results || [];
          const hit = list.find((x) => x.id === service.id);
          if (hit) setService(hit);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the barber changes, not when the price lookup updates service
  }, [barber?.id]);

  // Date chosen: open slots
  useEffect(() => {
    if (!date || !barber || !service) return;
    setSlots((x) => ({ ...x, loading: true, list: [], message: "" }));
    API.get(`available-slots/?barber=${barber.id}&date=${date}&service=${service.id}`)
      .then((r) => {
        const list = r.data.available_slots || [];
        setSlots({
          list,
          loading: false,
          price: r.data.service_price ?? null,
          deposit: r.data.barber_deposit ?? null,
          message: r.data.message || "",
        });
        setTime((t) => (list.includes(t) ? t : ""));
      })
      .catch(() =>
        setSlots({
          list: [],
          loading: false,
          price: null,
          deposit: null,
          message: "Times didn't load. Try the day again.",
        }),
      );
  }, [date, barber, service]);

  const dayRule = useMemo(() => makeDayRule(days.all, days.off), [days]);
  const price = slots.price ?? service?.price;
  const strikes = strike?.strike_count || 0;
  const deposit = useMemo(() => {
    const base = parseFloat(slots.deposit ?? "10") || 10;
    const extra = Math.max(0, strikes - 1) * 1.5;
    return Math.min(base + extra, parseFloat(price || 0) || base + extra);
  }, [slots.deposit, strikes, price]);
  const remaining = Math.max(0, (parseFloat(price) || 0) - deposit);

  const grouped = useMemo(() => {
    const g = {};
    services.forEach((x) => {
      (g[groupForService(x.name)] ||= []).push(x);
    });
    return g;
  }, [services]);

  const confirmUrl = (extra) =>
    `/booking-confirmed?service=${encodeURIComponent(service.name)}&barber=${encodeURIComponent(barber.name)}&date=${date}&time=${encodeURIComponent(to24Hour(time))}&price=${price}${extra}`;

  const bookInShop = async () => {
    setSubmitting(true);
    setError("");
    try {
      await API.post("appointments/", {
        service: service.id,
        barber: barber.id,
        date,
        time: to24Hour(time),
        payment_method: "shop",
        client_notes: notes,
      });
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}
      router.replace(confirmUrl("&payment=shop"));
    } catch (e) {
      const d = e?.response?.data || {};
      setError(
        d.non_field_errors?.[0] ||
          d.detail ||
          d.error ||
          "That time couldn't be booked. It may have just been taken; pick another time.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const bookWithDeposit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await API.post("client/accept-terms/").catch(() => {});
      try {
        sessionStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ serviceId: service.id, barberId: barber.id, date, time, notes }),
        );
      } catch {}
      const r = await API.post("deposit/checkout/", {
        service: service.id,
        barber: barber.id,
        date,
        time: to24Hour(time),
        client_notes: notes,
      });
      if (r.data.url) {
        window.location.href = r.data.url;
        return;
      }
      setError(r.data.error || "Checkout didn't start. Try again, or pay at the shop instead.");
    } catch (e) {
      const d = e?.response?.data || {};
      if (d.needs_reconnect || d.pay_in_shop) {
        setPay("shop");
        setError(
          `${barber.name.split(" ")[0]} can't take card deposits right now. Choose "Pay at the shop" to book the same time.`,
        );
      } else {
        setError(d.error || "Checkout didn't start. Try again, or pay at the shop instead.");
      }
    }
    setSubmitting(false);
  };

  if (initLoading) {
    return (
      <>
        <FlowHeader title="Book a cut" />
        <main id="main" className={`wrap-narrow ${s.page}`} aria-busy="true">
          <Skeleton h={34} className="mb-7" />
          <Skeleton h={44} w="60%" className="mb-5" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} h={64} className="mb-3" />
          ))}
        </main>
      </>
    );
  }

  return (
    <>
      <FlowHeader title="Book a cut" backHref="/dashboard" backLabel="My appointments" />
      <main id="main" className={`wrap-narrow ${s.page}`}>
        <Progress step={step} maxStep={maxStep} onGo={go} />

        {loadError && (
          <Notice tone="bad" className="mt-6">
            {loadError}
          </Notice>
        )}
        {notice && (
          <Notice tone="warn" className="mt-6">
            {notice}
          </Notice>
        )}

        {step > 1 && (
          <SittingPlacard
            service={service}
            barber={step > 2 ? barber : null}
            date={step > 3 ? date : null}
            time={step > 3 ? time : null}
            price={price}
          />
        )}

        {/* 1. Service */}
        {step === 1 && (
          <section className={`${s.step} fade-in`} aria-labelledby="step-title">
            <h1 id="step-title" className="h2">
              What are we doing today?
            </h1>
            {services.length === 0 && !loadError && (
              <p className="muted mt-3">No services are listed right now. Call the shop to book.</p>
            )}
            {SERVICE_GROUPS.filter((g) => grouped[g.id]?.length).map((g) => (
              <div key={g.id} className="board-group mt-7">
                <h2 className="h4">{g.title}</h2>
                {grouped[g.id].map((x) => (
                  <button
                    key={x.id}
                    className={`board-row ${service?.id === x.id ? "is-selected" : ""}`}
                    onClick={() => {
                      setService(x);
                      go(2);
                    }}
                  >
                    <span className="board-name">{x.name}</span>
                    <span className="board-price price">{money(x.price)}</span>
                    <span className="board-meta">
                      <span>{x.duration_minutes} min</span>
                      {describeService(x.name) && <span className="caption">{describeService(x.name)}</span>}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </section>
        )}

        {/* 2. Barber */}
        {step === 2 && (
          <section className={`${s.step} fade-in`} aria-labelledby="step-title">
            <h1 id="step-title" className="h2">
              Who&apos;s cutting?
            </h1>
            <p className="muted mt-2">Each barber keeps their own hours. You&apos;ll see their open days next.</p>
            <div className={s.barbers}>
              {barbers.map((b) => {
                const photo = photoOk(b.photo_url) ? b.photo_url : null;
                return (
                  <button
                    key={b.id}
                    className="choice"
                    aria-pressed={barber?.id === b.id}
                    onClick={() => {
                      if (barber?.id !== b.id) {
                        setDate("");
                        setTime("");
                      }
                      setBarber(b);
                      go(3);
                    }}
                  >
                    <span className={`frame frame-arch ${s.miniArch}`}>
                      <span className="frame-inner">
                        {photo ? (
                          <Impression src={photo} alt="" seed={b.id * 13} className={s.miniImg} />
                        ) : (
                          <span className={s.miniMono} aria-hidden="true">
                            {b.name.charAt(0)}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="grow">
                      <span className="h4">{b.name}</span>
                      <span className="muted small mt-1">{b.bio || "Clean fades, sharp lines and an easy chair."}</span>
                    </span>
                  </button>
                );
              })}
              {barbers.length === 0 && (
                <Notice tone="warn">
                  No barbers are taking online bookings right now. Call the shop and we&apos;ll fit you in.
                </Notice>
              )}
            </div>
          </section>
        )}

        {/* 3. Time */}
        {step === 3 && (
          <section className={`${s.step} fade-in`} aria-labelledby="step-title">
            <h1 id="step-title" className="h2">
              Pick a time
            </h1>
            <div className={`panel panel-pad ${s.calPanel}`}>
              {days.loading ? (
                <Skeleton h={300} />
              ) : (
                <>
                  <Calendar
                    value={date}
                    onChange={(d) => {
                      setDate(d);
                      setTime("");
                    }}
                    isDisabled={dayRule}
                    label={`Days ${barber?.name} is working`}
                  />
                  <WorkWeek allDays={days.all} />
                </>
              )}
            </div>

            {date && (
              <div className={s.timeBlock}>
                <h2 className="h3">{fmtDate(date, "long")}</h2>
                <p className="small muted mt-1 mb-4" aria-live="polite">
                  {slots.loading
                    ? "Finding open times…"
                    : slots.list.length
                      ? `${slots.list.length} open time${slots.list.length === 1 ? "" : "s"}`
                      : slots.message || "No open times that day."}
                </p>
                {!slots.loading && slots.list.length === 0 ? (
                  <Notice tone="info">
                    Try another day, or{" "}
                    <Link className="link" href={`/waitlist?barber=${barber.id}&date=${date}&service=${service.id}`}>
                      join the waitlist for {fmtDate(date)}
                    </Link>{" "}
                    and we&apos;ll text you if a chair opens.
                  </Notice>
                ) : (
                  <SlotPicker slots={slots.list} value={time} onChange={setTime} loading={slots.loading} />
                )}
              </div>
            )}

            <div className="action-bar">
              <button className="btn btn-primary btn-lg btn-block" disabled={!date || !time} onClick={() => go(4)}>
                {time ? `Continue with ${fmtTime(time)}` : "Choose a day and time"}
              </button>
            </div>
          </section>
        )}

        {/* 4. Confirm */}
        {step === 4 && service && barber && (
          <section className={`${s.step} fade-in`} aria-labelledby="step-title">
            <h1 id="step-title" className="h2">
              Look it over
            </h1>

            <dl className={`panel panel-pad sum-rows ${s.summary}`}>
              <div className="sum-row">
                <dt>Service</dt>
                <dd>{service.name}</dd>
              </div>
              <div className="sum-row">
                <dt>Barber</dt>
                <dd>{barber.name}</dd>
              </div>
              <div className="sum-row">
                <dt>When</dt>
                <dd>
                  {fmtDate(date, "long")}, {fmtTime(time)}
                </dd>
              </div>
              <div className="sum-row">
                <dt>Length</dt>
                <dd>{service.duration_minutes} min</dd>
              </div>
              <div className="sum-row sum-total">
                <dt>Price</dt>
                <dd className="price" style={{ fontSize: "1.3rem" }}>
                  {money(price)}
                </dd>
              </div>
            </dl>

            <div className="field mt-6">
              <label className="label" htmlFor="notes">
                Notes for {barber.name.split(" ")[0]} <span className="label-note">(optional)</span>
              </label>
              <textarea
                id="notes"
                className="textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Low taper, keep the length on top, beard lined…"
                maxLength={500}
              />
            </div>

            <fieldset className={s.payment}>
              <legend className="label mb-3">How do you want to pay?</legend>
              <div
                className="stack"
                style={{ "--stack": "10px" }}
                role="radiogroup"
                aria-label="How to pay"
                onKeyDown={(e) => arrowSelect(e, PAY_OPTIONS, pay, setPay)}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={pay === "shop"}
                  tabIndex={rovingIndex("shop", pay, PAY_OPTIONS)}
                  className="choice"
                  onClick={() => setPay("shop")}
                >
                  <span className="radio-dot" aria-hidden="true" />
                  <span className="grow">
                    <span className="h4">Pay at the shop</span>
                    <span className="muted small">Pay the full {money(price)} in the chair, cash or card.</span>
                  </span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={pay === "online"}
                  tabIndex={rovingIndex("online", pay, PAY_OPTIONS)}
                  className="choice"
                  onClick={() => setPay("online")}
                >
                  <span className="radio-dot" aria-hidden="true" />
                  <span className="grow">
                    <span className="h4">Hold it with a {money(deposit)} deposit</span>
                    <span className="muted small">
                      Pay {money(deposit)} now by card through Stripe. The other {money(remaining)} is due in the chair.
                    </span>
                  </span>
                </button>
              </div>
            </fieldset>

            {strikes > 0 && (
              <Notice tone="warn" className="mt-4">
                You have {strikes} missed-appointment strike{strikes === 1 ? "" : "s"} on your account
                {strikes > 1 ? ", so your deposit is a little higher" : ""}. Arriving on time clears the way.
              </Notice>
            )}
            {error && (
              <Notice tone="bad" className="mt-4">
                {error}
              </Notice>
            )}

            <div className="action-bar">
              <button
                className="btn btn-primary btn-lg btn-block"
                disabled={submitting}
                onClick={() => (pay === "online" ? bookWithDeposit() : bookInShop())}
              >
                {submitting ? (
                  <Spinner label={pay === "online" ? "Opening secure checkout" : "Booking"} />
                ) : pay === "online" ? (
                  `Pay ${money(deposit)} and book`
                ) : (
                  `Book ${fmtDate(date)} at ${fmtTime(time)}`
                )}
              </button>
              <p className="small faint center mt-3">
                Need to change plans later? Reschedule or cancel from My appointments.{" "}
                {pay === "online" && (
                  <>
                    Deposits are non-refundable.{" "}
                    <Link className="link" href="/terms">
                      Terms
                    </Link>
                  </>
                )}
              </p>
            </div>
            <button className="btn btn-quiet" onClick={() => go(3)}>
              <IconArrowLeft size={16} /> Change the time
            </button>
          </section>
        )}
      </main>
    </>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={null}>
      <BookContent />
    </Suspense>
  );
}
