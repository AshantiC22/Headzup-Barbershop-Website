"use client";
// Shop hours, the barber's own hours and booking rules, news posts, and the
// barber's own profile.
import { useEffect, useMemo, useState } from "react";
import API from "@/lib/api";
import { ONLINE_PAYMENTS } from "@/lib/config";
import { useShopHours } from "@/components/ShopHours";
import { IconCamera, IconTrash, LoadFailed, Modal, Skeleton, Spinner } from "@/components/ui/Feedback";
import { WEEK_ORDER, fromApi, toApi, weekProblem } from "@/lib/hours";
import { fmtDate, fmtTime, todayStr } from "@/lib/time";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const hhmm = (t) => (t ? String(t).slice(0, 5) : "");

function DayRow({ i, info, onSave }) {
  const on = !!info?.is_working;
  const [start, setStart] = useState(hhmm(info?.start_time) || "09:00");
  const [end, setEnd] = useState(hhmm(info?.end_time) || "18:00");
  const commit = (s = start, e = end, working = on) => {
    if (working && s >= e) return;
    onSave(i, { is_working: working, start_time: s, end_time: e });
  };
  return (
    <li className="day-row">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className="switch"
        aria-label={`Working ${DAYS[i]}`}
        onClick={() => commit(start, end, !on)}
      />
      <span className="day-name">{DAYS[i]}</span>
      {on ? (
        <span className="row" style={{ gap: 8 }}>
          <input
            type="time"
            className="input input-sm"
            aria-label={`${DAYS[i]} start`}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            onBlur={() => commit()}
          />
          <span className="faint">to</span>
          <input
            type="time"
            className="input input-sm"
            aria-label={`${DAYS[i]} end`}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            onBlur={() => commit()}
          />
        </span>
      ) : (
        <span className="faint">Off</span>
      )}
    </li>
  );
}

const rowsFrom = (hours) =>
  WEEK_ORDER.map((d) => ({
    day: d,
    label: hours[d].label,
    isOpen: !!hours[d].open,
    open: hours[d].open || "09:00",
    close: hours[d].close || "18:00",
  }));
const changedOn = (iso) => {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric" }).format(
      new Date(iso),
    );
  } catch {
    return "";
  }
};
const sameRows = (a, b) =>
  a.every((r, i) => r.isOpen === b[i].isOpen && (!r.isOpen || (r.open === b[i].open && r.close === b[i].close)));

/**
 * The shop's week: what the site shows in the footer and on the home page,
 * and the outer limit for every barber's bookings. Saved as one week, so the
 * site never shows half an edit.
 */
function ShopHoursPanel({ toast }) {
  const { apply, meta } = useShopHours();
  const [saved, setSaved] = useState(null); // rows as the server has them
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let gone = false;
    API.get("shop/hours/", { _noCache: true })
      .then((r) => {
        if (gone) return;
        const week = fromApi(r.data);
        if (!week) return setFailed(true);
        apply(r.data);
        const fresh = rowsFrom(week);
        setSaved(fresh);
        setRows(fresh);
        setFailed(false);
      })
      .catch(() => !gone && setFailed(true));
    return () => {
      gone = true;
    };
  }, [apply, attempt]);

  const problem = useMemo(() => (rows ? weekProblem(rows) : ""), [rows]);
  const dirty = rows && saved && !sameRows(rows, saved);
  const set = (i, patch) => {
    setError("");
    setRows((p) => p.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  };

  const save = async (e) => {
    e.preventDefault();
    if (problem) return setError(problem);
    setSaving(true);
    setError("");
    try {
      const r = await API.put("shop/hours/", toApi(rows));
      API.invalidate("shop/hours", "available-slots", "working-days");
      apply(r.data);
      setSaved(rows);
      toast("Shop hours saved. The site shows them now.");
    } catch (err) {
      setError(err?.response?.data?.error || "The hours didn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="panel panel-pad span-all" onSubmit={save} aria-labelledby="shop-hours-title">
      <div className="spread">
        <div>
          <h2 id="shop-hours-title" className="h4">
            Shop hours
          </h2>
          <p className="small muted mt-1">
            What clients see on the site. Nobody can book outside these, whatever their own hours say.
          </p>
        </div>
      </div>
      {failed ? (
        <LoadFailed what="The shop's hours" onRetry={() => setAttempt((n) => n + 1)} className="mt-4" />
      ) : !rows ? (
        <ul className="day-list mt-3" aria-busy="true">
          {WEEK_ORDER.map((d) => (
            <li key={d} className="day-row">
              <Skeleton h={30} w={52} />
              <Skeleton h={18} w={80} />
              <Skeleton h={40} w={236} style={{ maxWidth: "100%" }} />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="day-list mt-3">
            {rows.map((r, i) => (
              <li key={r.day} className="day-row">
                <button
                  type="button"
                  role="switch"
                  aria-checked={r.isOpen}
                  className="switch"
                  aria-label={`Shop open on ${r.label}`}
                  onClick={() => set(i, { isOpen: !r.isOpen })}
                />
                <span className="day-name">{r.label}</span>
                {r.isOpen ? (
                  <span className="row" style={{ gap: 8 }}>
                    <input
                      type="time"
                      step="900"
                      className="input input-sm"
                      aria-label={`${r.label} opens`}
                      value={r.open}
                      onChange={(e) => set(i, { open: e.target.value })}
                    />
                    <span className="faint">to</span>
                    <input
                      type="time"
                      step="900"
                      className="input input-sm"
                      aria-label={`${r.label} closes`}
                      value={r.close}
                      onChange={(e) => set(i, { close: e.target.value })}
                    />
                  </span>
                ) : (
                  <span className="faint">Closed</span>
                )}
              </li>
            ))}
          </ul>
          {(error || (dirty && problem)) && (
            <p className="field-error mt-3" role="alert">
              {error || problem}
            </p>
          )}
          <div className="row-wrap mt-4">
            <button className="btn btn-primary" disabled={!dirty || saving || !!problem}>
              {saving ? <Spinner label="Saving" /> : "Save shop hours"}
            </button>
            {dirty && !saving && (
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  setRows(saved);
                  setError("");
                }}
              >
                Undo changes
              </button>
            )}
            {meta && !dirty && (
              <span className="small faint">
                Last changed by {meta.by}, {changedOn(meta.at)}
              </span>
            )}
          </div>
        </>
      )}
    </form>
  );
}

export function HoursTab({ toast }) {
  const [avail, setAvail] = useState(null);
  const [off, setOff] = useState([]);
  const [newOff, setNewOff] = useState({ date: "", reason: "" });
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      API.get("barber/availability/", { _noCache: true }),
      API.get("barber/time-off/", { _noCache: true }),
      API.get("barber/booking-settings/", { _noCache: true }).catch(() => null),
    ])
      .then(([a, t, s]) => {
        setAvail(a.data || []);
        setOff(t.data || []);
        setSettings(
          s?.data
            ? { ...s.data, deposit_amount: String(s.data.deposit_amount ?? "10.00") }
            : { deposit_amount: "10.00", strike_enabled: true, require_deposit: true },
        );
      })
      .catch(() => {
        setAvail([]);
        setSettings({ deposit_amount: "10.00", strike_enabled: true, require_deposit: true });
      });
  }, []);

  const saveDay = async (i, v) => {
    try {
      await API.post("barber/availability/", { day_of_week: i, ...v });
      const r = await API.get("barber/availability/", { _noCache: true });
      setAvail(r.data || []);
      toast(`${DAYS[i]} saved`);
    } catch {
      toast("Hours didn't save.", "bad");
    }
  };
  const addOff = async (e) => {
    e.preventDefault();
    if (!newOff.date) return;
    try {
      await API.post("barber/time-off/", newOff);
      const r = await API.get("barber/time-off/", { _noCache: true });
      setOff(r.data || []);
      setNewOff({ date: "", reason: "" });
      toast(`${fmtDate(newOff.date)} blocked off`);
    } catch {
      toast("That day wasn't blocked.", "bad");
    }
  };
  const removeOff = async (id) => {
    try {
      await API.delete(`barber/time-off/${id}/`);
      setOff((p) => p.filter((x) => x.id !== id));
    } catch {
      toast("That day wasn't reopened.", "bad");
    }
  };
  const saveSettings = async (e) => {
    e.preventDefault();
    const amt = parseFloat(settings.deposit_amount);
    if (!(amt >= 1 && amt <= 500)) return toast("Deposits can be $1 to $500.", "bad");
    setSaving(true);
    try {
      await API.post("barber/booking-settings/", {
        deposit_amount: amt,
        strike_enabled: settings.strike_enabled,
        require_deposit: settings.require_deposit,
      });
      toast("Booking rules saved");
    } catch (err) {
      toast(err?.response?.data?.error || "Booking rules didn't save.", "bad");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="tab-head">
        <div>
          <h1 className="h2">Hours and booking rules</h1>
          <p className="muted">The shop&apos;s hours, your own hours inside them, and days you&apos;re off.</p>
        </div>
      </div>
      <div className="setup-grid">
        <ShopHoursPanel toast={toast} />
        <section className="panel panel-pad">
          <h2 className="h4">Your hours</h2>
          <p className="small muted mt-1">
            When you take bookings. Changes save when you leave a field. Times outside the shop&apos;s hours aren&apos;t
            offered.
          </p>
          {!avail ? (
            <ul className="day-list" aria-busy="true">
              {DAYS.map((d) => (
                <li key={d} className="day-row">
                  <Skeleton h={30} w={52} />
                  <Skeleton h={18} w={80} />
                  <Skeleton h={40} w={236} style={{ maxWidth: "100%" }} />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="day-list">
              {DAYS.map((d, i) => {
                const info = avail.find((x) => x.day_of_week === i);
                // Keyed on the saved hours so the inputs reset when the server's copy changes.
                return (
                  <DayRow
                    key={`${d}-${info?.is_working}-${info?.start_time}-${info?.end_time}`}
                    i={i}
                    info={info}
                    onSave={saveDay}
                  />
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel panel-pad">
          <h2 className="h4">Days off</h2>
          <form className="row-wrap mt-3" onSubmit={addOff}>
            <input
              type="date"
              className="input"
              min={todayStr()}
              aria-label="Day off"
              value={newOff.date}
              onChange={(e) => setNewOff((p) => ({ ...p, date: e.target.value }))}
              style={{ flex: "1 1 160px" }}
            />
            <input
              className="input"
              placeholder="Reason (optional)"
              aria-label="Reason"
              value={newOff.reason}
              onChange={(e) => setNewOff((p) => ({ ...p, reason: e.target.value }))}
              style={{ flex: "2 1 200px" }}
            />
            <button className="btn btn-primary" disabled={!newOff.date}>
              Block day
            </button>
          </form>
          <ul className="stack mt-4" style={{ "--stack": "8px" }}>
            {off.length === 0 && <li className="small faint">No days off coming up.</li>}
            {off.map((t) => (
              <li key={t.id} className="spread placard" style={{ padding: "10px 14px" }}>
                <span>
                  <strong>{fmtDate(t.date, "long")}</strong>
                  {t.reason && <span className="muted">, {t.reason}</span>}
                </span>
                <button className="icon-btn" aria-label={`Reopen ${fmtDate(t.date)}`} onClick={() => removeOff(t.id)}>
                  <IconTrash size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <form className="panel panel-pad span-all" onSubmit={saveSettings}>
          <h2 className="h4">{ONLINE_PAYMENTS ? "Online booking rules" : "No-show rules"}</h2>
          {!settings ? (
            <Skeleton h={160} className="mt-3" />
          ) : (
            <>
              {ONLINE_PAYMENTS && (
                <div className="field mt-4" style={{ maxWidth: 260 }}>
                  <label className="label" htmlFor="dep">
                    Deposit amount
                  </label>
                  <div className="input-wrap">
                    <span className="input-prefix" aria-hidden="true">
                      $
                    </span>
                    <input
                      id="dep"
                      className="input"
                      type="number"
                      min="1"
                      max="500"
                      step="0.5"
                      inputMode="decimal"
                      style={{ paddingLeft: 28 }}
                      value={settings.deposit_amount}
                      onChange={(e) => setSettings((p) => ({ ...p, deposit_amount: e.target.value }))}
                    />
                  </div>
                  <p className="field-hint">What clients pay up front to hold a time online. $1 to $500.</p>
                </div>
              )}
              {[
                [
                  "strike_enabled",
                  "Strikes for no-shows",
                  ONLINE_PAYMENTS
                    ? "Missed appointments and late cancels add a strike; each extra strike adds $1.50 to that client's next deposit."
                    : "Missed appointments and late cancels add a strike to the client's account. They see it when they book.",
                ],
                ...(ONLINE_PAYMENTS
                  ? [
                      [
                        "require_deposit",
                        "Ask for a deposit online",
                        "Turn off to let clients hold a time online without paying first.",
                      ],
                    ]
                  : []),
              ].map(([k, label, desc]) => (
                <div key={k} className="spread setting">
                  <div>
                    <p style={{ fontWeight: 650 }}>{label}</p>
                    <p className="small muted">{desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!settings[k]}
                    aria-label={label}
                    className="switch"
                    onClick={() => setSettings((p) => ({ ...p, [k]: !p[k] }))}
                  />
                </div>
              ))}
              <button className="btn btn-primary mt-4" disabled={saving}>
                {saving ? <Spinner label="Saving" /> : "Save booking rules"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

const CATS = [
  ["general", "General"],
  ["deal", "Deal"],
  ["promo", "Promo"],
  ["update", "Update"],
  ["event", "Event"],
];

export function NewsTab({ toast }) {
  const [posts, setPosts] = useState(null);
  const [f, setF] = useState({ title: "", body: "", category: "general", pinned: false });
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);
  const load = () =>
    API.get("newsletter/manage/", { _noCache: true })
      .then((r) => setPosts(r.data || []))
      .catch(() => setPosts([]));
  useEffect(() => {
    load();
  }, []);

  const publish = async (e) => {
    e.preventDefault();
    if (!f.title.trim() || !f.body.trim()) return toast("Give it a title and a message.", "bad");
    setBusy(true);
    try {
      // emoji: the API still has the field (and defaults it to scissors); posts no longer show one
      await API.post("newsletter/manage/", { ...f, emoji: "" });
      toast("Published. Clients with alerts on get a notification.");
      setF({ title: "", body: "", category: "general", pinned: false });
      load();
    } catch {
      toast("It didn't publish.", "bad");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    try {
      await API.delete(`newsletter/manage/${del.id}/`);
      setPosts((p) => p.filter((x) => x.id !== del.id));
      toast("Post taken down");
    } catch {
      toast("It wasn't removed.", "bad");
    }
    setDel(null);
  };

  return (
    <div>
      <div className="tab-head">
        <div>
          <h1 className="h2">News</h1>
          <p className="muted">Posts show on the News page and ping clients who have alerts on.</p>
        </div>
      </div>
      <form className="panel panel-pad w-l" onSubmit={publish}>
        <div className="field">
          <label className="label" htmlFor="n-title">
            Title
          </label>
          <input
            id="n-title"
            className="input"
            value={f.title}
            onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))}
            placeholder="Thanksgiving hours"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="n-body">
            Message
          </label>
          <textarea
            id="n-body"
            className="textarea"
            rows={4}
            value={f.body}
            onChange={(e) => setF((p) => ({ ...p, body: e.target.value }))}
          />
        </div>
        <div className="row-wrap mt-4" style={{ justifyContent: "space-between" }}>
          <div className="row-wrap">
            <select
              className="select"
              aria-label="Kind of post"
              value={f.category}
              onChange={(e) => setF((p) => ({ ...p, category: e.target.value }))}
              style={{ width: "auto" }}
            >
              {CATS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <label className="check">
              <input
                type="checkbox"
                checked={f.pinned}
                onChange={(e) => setF((p) => ({ ...p, pinned: e.target.checked }))}
              />{" "}
              Pin to the top
            </label>
          </div>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? <Spinner label="Publishing" /> : "Publish"}
          </button>
        </div>
      </form>
      <h2 className="h4 mt-7 mb-3">Posted</h2>
      {!posts ? (
        <Skeleton h={120} />
      ) : posts.length === 0 ? (
        <p className="muted">Nothing posted yet.</p>
      ) : (
        <ul className="stack" style={{ "--stack": "10px", maxWidth: 680 }}>
          {posts.map((p) => (
            <li key={p.id} className="placard">
              <div className="spread" style={{ alignItems: "flex-start" }}>
                <div>
                  <p className="placard-title">{p.title}</p>
                  <p className="small faint">
                    {p.created_at}
                    {p.pinned ? ", pinned" : ""}
                  </p>
                </div>
                <button className="icon-btn" aria-label={`Delete ${p.title}`} onClick={() => setDel(p)}>
                  <IconTrash size={18} />
                </button>
              </div>
              <p className="muted mt-2 pre-line">{p.body}</p>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!del} onClose={() => setDel(null)} title="Take this post down?">
        <p className="muted">&ldquo;{del?.title}&rdquo; comes off the News page. This can&apos;t be undone.</p>
        <div className="row-wrap mt-5">
          <button className="btn btn-danger grow" onClick={remove}>
            Delete post
          </button>
          <button className="btn btn-ghost grow" onClick={() => setDel(null)}>
            Keep it
          </button>
        </div>
      </Modal>
    </div>
  );
}

export function ProfileTab({ barber, setBarber, toast }) {
  const [preview, setPreview] = useState(null);
  const [bio, setBio] = useState(barber?.bio || "");
  const [cash, setCash] = useState((barber?.cashapp_tag || "").replace(/^\$/, ""));
  const [busy, setBusy] = useState("");
  const photo = preview || barber?.photo_url;

  const save = async (what, body) => {
    setBusy(what);
    try {
      await API.patch("barber/me/update/", body);
      const r = await API.get("barber/me/", { _noCache: true });
      setBarber(r.data);
      if (what === "photo") setPreview(null);
      toast(what === "photo" ? "Photo updated" : what === "bio" ? "Bio saved" : "Cash App saved");
    } catch {
      toast("That didn't save.", "bad");
    } finally {
      setBusy("");
    }
  };
  const pick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast("Use a photo under 5 MB.", "bad");
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="tab-head">
        <div>
          <h1 className="h2">Your profile</h1>
          <p className="muted">This is what clients see on the home page and when they book.</p>
        </div>
      </div>
      <div className="setup-grid">
        <section className="panel panel-pad" style={{ textAlign: "center" }}>
          <div className="frame profile-arch">
            <div className="frame-inner">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- a data: URL or the API's photo
                <img src={photo} alt={`${barber?.name}'s portrait`} className="fill cover" />
              ) : (
                <div className="monogram-sm" aria-hidden="true">
                  {barber?.name?.charAt(0)}
                </div>
              )}
            </div>
          </div>
          <p className="h3 mt-5">{barber?.name}</p>
          <p className="small muted mt-1">Clients see this photo on the home page and when they book.</p>
          <div className="row-wrap mt-4" style={{ justifyContent: "center" }}>
            <label className="btn btn-ghost btn-sm">
              <IconCamera size={16} /> {barber?.photo_url ? "Change photo" : "Add a photo"}
              <input type="file" accept="image/*" className="sr-only" onChange={pick} />
            </label>
            {preview && (
              <>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={busy === "photo"}
                  onClick={() => save("photo", { photo: preview })}
                >
                  {busy === "photo" ? <Spinner label="Uploading" /> : "Save photo"}
                </button>
                <button className="btn btn-quiet btn-sm" onClick={() => setPreview(null)}>
                  Cancel
                </button>
              </>
            )}
          </div>
          <p className="field-hint mt-2">JPG or PNG under 5 MB. A square, well-lit face works best.</p>
        </section>

        <div className="stack" style={{ "--stack": "16px" }}>
          <form
            className="panel panel-pad"
            onSubmit={(e) => {
              e.preventDefault();
              save("bio", { bio: bio.trim() });
            }}
          >
            <label className="h4" htmlFor="bio">
              Bio
            </label>
            <textarea
              id="bio"
              className="textarea mt-3"
              rows={4}
              maxLength={300}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Twenty years behind the chair. Fades, beard work, and patience for kids."
            />
            <p className="field-hint">{bio.length}/300</p>
            <button className="btn btn-ghost btn-sm mt-3" disabled={busy === "bio"}>
              {busy === "bio" ? <Spinner label="Saving" /> : "Save bio"}
            </button>
          </form>
          <form
            className="panel panel-pad"
            onSubmit={(e) => {
              e.preventDefault();
              save("cash", { cashapp_tag: cash.trim() ? `$${cash.trim().replace(/^\$/, "")}` : "" });
            }}
          >
            <label className="h4" htmlFor="cash">
              Cash App
            </label>
            <p className="small muted mt-1">
              Clients see it when they book and on their confirmation, with a link that opens Cash App to pay you.
            </p>
            <div className="row mt-3">
              <div className="input-wrap grow">
                <span className="input-prefix" aria-hidden="true">
                  $
                </span>
                <input
                  id="cash"
                  className="input"
                  style={{ paddingLeft: 28 }}
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  placeholder="yourcashtag"
                  autoCapitalize="none"
                />
              </div>
              <button className="btn btn-ghost" disabled={busy === "cash"}>
                {busy === "cash" ? <Spinner /> : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export { fmtTime };
