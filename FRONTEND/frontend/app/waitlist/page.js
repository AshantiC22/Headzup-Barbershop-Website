"use client";
// Waitlist: when a day is full, get texted if a chair opens.
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import API from "@/lib/api";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { Notice, Skeleton, Spinner, IconTrash } from "@/components/ui/Feedback";
import { fmtDate, todayStr } from "@/lib/time";

function WaitlistContent() {
  const params = useSearchParams();
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    barber: params.get("barber") || "",
    service: params.get("service") || "",
    date: params.get("date") || "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [msg, setMsg] = useState({ tone: "", text: "" });

  useEffect(() => {
    let token = null;
    try {
      token = localStorage.getItem("access");
    } catch {}
    if (!token) {
      const qs = params.toString();
      window.location.replace(`/login?next=${encodeURIComponent("/waitlist" + (qs ? `?${qs}` : ""))}`);
      return;
    }
    Promise.all([
      API.get("barbers/"),
      API.get("services/"),
      API.get("waitlist/mine/", { _noCache: true }).catch(() => ({ data: [] })),
    ])
      .then(([b, s, w]) => {
        setBarbers((Array.isArray(b.data) ? b.data : b.data?.results || []).filter((x) => x.id && x.name));
        setServices(Array.isArray(s.data) ? s.data : s.data?.results || []);
        setMine(Array.isArray(w.data) ? w.data : []);
      })
      .catch(() => setMsg({ tone: "bad", text: "The waitlist didn't load. Refresh to try again." }))
      .finally(() => setLoading(false));
  }, [params]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const join = async (e) => {
    e.preventDefault();
    if (!form.barber || !form.date) return setMsg({ tone: "bad", text: "Choose a barber and a day." });
    setBusy(true);
    setMsg({ tone: "", text: "" });
    try {
      const r = await API.post("waitlist/join/", {
        barber_id: parseInt(form.barber, 10),
        service_id: form.service ? parseInt(form.service, 10) : null,
        date: form.date,
        notes: form.notes,
      });
      setMsg({ tone: "ok", text: r.data?.message || "You're on the list. We'll text you if a chair opens." });
      const w = await API.get("waitlist/mine/", { _noCache: true });
      setMine(Array.isArray(w.data) ? w.data : []);
      setForm((p) => ({ ...p, date: "", notes: "" }));
    } catch (err) {
      setMsg({ tone: "bad", text: err?.response?.data?.error || "You weren't added. Try again." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setRemoving(id);
    try {
      await API.delete(`waitlist/${id}/`);
      setMine((p) => p.filter((x) => x.id !== id));
    } catch {
      setMsg({ tone: "bad", text: "That spot wasn't removed. Try again." });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <>
      <SiteNav />
      <main id="main" className="wrap-narrow page-pad">
        <h1 className="h1">Waitlist</h1>
        <p className="lede mt-3">
          Day already full? Put your name down and we&apos;ll text you the moment a chair opens with that barber.
        </p>

        {msg.text && (
          <Notice tone={msg.tone} className="mt-6">
            {msg.text}
          </Notice>
        )}

        {loading ? (
          <div className="panel panel-pad mt-7">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} h={50} className="mb-4" />
            ))}
          </div>
        ) : (
          <form className="panel panel-pad mt-7" onSubmit={join} noValidate>
            <div className="field">
              <label className="label" htmlFor="w-barber">
                Barber
              </label>
              <select id="w-barber" className="select" value={form.barber} onChange={set("barber")}>
                <option value="">Choose a barber</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="w-date">
                Day you want
              </label>
              <input
                id="w-date"
                type="date"
                className="input"
                min={todayStr()}
                value={form.date}
                onChange={set("date")}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="w-svc">
                Service <span className="label-note">(optional)</span>
              </label>
              <select id="w-svc" className="select" value={form.service} onChange={set("service")}>
                <option value="">Any service</option>
                {services.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="w-notes">
                Anything to know <span className="label-note">(optional)</span>
              </label>
              <textarea
                id="w-notes"
                className="textarea"
                rows={2}
                value={form.notes}
                onChange={set("notes")}
                placeholder="Any time after 3 works for me"
              />
            </div>
            <button className="btn btn-primary btn-lg btn-block mt-6" disabled={busy}>
              {busy ? <Spinner label="Adding you" /> : "Join the waitlist"}
            </button>
          </form>
        )}

        {mine.length > 0 && (
          <section className="mt-8" aria-labelledby="mine-title">
            <h2 id="mine-title" className="h3">
              You&apos;re waiting on
            </h2>
            <ul className="stack mt-4" style={{ "--stack": "10px" }}>
              {mine.map((w) => (
                <li key={w.id} className="placard spread">
                  <div>
                    <p className="placard-title">{fmtDate(w.date, "long")}</p>
                    <p className="placard-medium">
                      with {w.barber_name}
                      {w.service_name ? `, ${w.service_name}` : ""}
                    </p>
                    {w.notified && <span className="chip chip-ok mt-2">We texted you</span>}
                  </div>
                  <button
                    className="btn btn-quiet btn-sm"
                    disabled={removing === w.id}
                    onClick={() => remove(w.id)}
                    aria-label={`Leave the waitlist for ${fmtDate(w.date)}`}
                  >
                    {removing === w.id ? (
                      <Spinner />
                    ) : (
                      <>
                        <IconTrash size={16} /> Leave
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense fallback={null}>
      <WaitlistContent />
    </Suspense>
  );
}
