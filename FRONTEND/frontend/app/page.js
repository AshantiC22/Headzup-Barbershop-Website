"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Home. The whole site is framed as a small salon of paintings: the hero is
// the big canvas, services hang as a painted price board, barbers are oval
// portraits, the work is a salon hang, and every piece of information comes
// with a museum placard.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import HarborScene from "@/components/art/HarborScene";
import Impression from "@/components/art/Impression";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter, { HoursList } from "@/components/site/SiteFooter";
import { IconPhone, IconPin, Skeleton } from "@/components/ui/Feedback";
import { API_ROOT } from "@/lib/auth";
import {
  ADDRESS_LINE, GALLERY, REVIEWS, SERVICES, SERVICE_GROUPS, SHOP, describeService,
} from "@/lib/shop";
import { shopStatus } from "@/lib/time";
import s from "./home.module.css";

const photoOk = (url) => !!url && (url.startsWith("data:") || url.startsWith("https://"));

function useShopStatus() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    const tick = () => setStatus(shopStatus());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return status;
}

function useBarbers() {
  const [state, setState] = useState({ loading: true, list: [] });
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_ROOT}/api/barbers/`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        const list = (Array.isArray(d) ? d : d.results || []).filter((b) => b.id && b.name);
        setState({ loading: false, list });
      })
      .catch((e) => { if (e?.name !== "AbortError") setState({ loading: false, list: [], failed: true }); });
    return () => ctrl.abort();
  }, []);
  return state;
}

// ── Sections ────────────────────────────────────────────────────────────────
function Hero({ status }) {
  return (
    <section className={s.hero} aria-labelledby="hero-title">
      <HarborScene turning={!!status?.open} />
      <div className={s.glaze} aria-hidden="true" />
      <div className={`wrap ${s.heroContent}`}>
        <p className={s.status} aria-live="polite">
          <span className={`${s.dot} ${status?.open ? s.dotOpen : ""}`} aria-hidden="true" />
          {status ? <>{status.label}, {status.detail}</> : "Checking the hours"}
        </p>
        <h1 id="hero-title" className={`display ${s.title}`}>Keep your head up.</h1>
        <p className={`lede ${s.lede}`}>
          Fades, lineups, beard work and hot shaves on West 4th Street in Hattiesburg.
          Pick your barber, pick a time, and the chair is yours.
        </p>
        <div className={s.ctas}>
          <a href="/book" className="btn btn-primary btn-lg">Book a cut</a>
          <a href="#services" className={`btn btn-ghost btn-lg ${s.ghostOnArt}`}>See prices</a>
        </div>
      </div>
      <figure className={`placard ${s.heroPlacard}`}>
        <figcaption>
          <p className="placard-title">Impression, Headz Up</p>
          <p className="placard-medium">Oil, clippers and hot lather. Hattiesburg, Mississippi.</p>
          <p className={`tiny faint ${s.placardNote}`}>The pole turns while the shop is open.</p>
        </figcaption>
      </figure>
    </section>
  );
}

function PriceBoard() {
  return (
    <section id="services" className={`section ${s.services}`} aria-labelledby="services-title">
      <div className="wrap">
        <div className={s.sectionHead}>
          <h2 id="services-title" className="h2">Services and prices</h2>
          <p className="lede">
            Prices are per sitting. Pay in the shop, or put a deposit down online to hold your spot.
            Tap any service to book it.
          </p>
        </div>
        <div className={s.boardGrid}>
          {SERVICE_GROUPS.map((g) => {
            const rows = SERVICES.filter((x) => x.group === g.id);
            return (
              <div key={g.id} className={`board-group ${s[`group_${g.id}`] || ""}`}>
                <h3 className="h3">{g.title}</h3>
                <p className="caption" style={{ marginTop: 4, marginBottom: 6 }}>{g.note}</p>
                {rows.map((svc) => (
                  <a key={svc.name} className="board-row" href={`/book?service=${encodeURIComponent(svc.name)}`}>
                    <span className="board-name">{svc.name}</span>
                    <span className="board-price price">${svc.price}</span>
                    <span className="board-meta">
                      <span>{svc.minutes} min</span>
                      {describeService(svc.name) && <span className="caption">{describeService(svc.name)}</span>}
                      {svc.popular && <span className="chip chip-warn chip-plain">Most booked</span>}
                    </span>
                  </a>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Barbers({ barbers }) {
  const { loading, list, failed } = barbers;
  return (
    <section id="barbers" className={`section mist ${s.barbers}`} aria-labelledby="barbers-title">
      <div className="wrap">
        <div className={s.sectionHead}>
          <h2 id="barbers-title" className="h2">The barbers</h2>
          <p className="lede">Each one keeps their own book. Choose who you sit with, and they get your notes before you arrive.</p>
        </div>

        {loading ? (
          <div className={s.portraits}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={s.portrait}>
                <Skeleton h={0} style={{ aspectRatio: "4 / 5", borderRadius: "50%" }} />
                <Skeleton h={22} w="60%" style={{ margin: "18px auto 0" }} />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="panel panel-pad" style={{ maxWidth: 560 }}>
            <p className="h4">{failed ? "Barber profiles didn't load." : "No barbers listed yet."}</p>
            <p className="muted" style={{ marginTop: 6 }}>
              You can still book. The booking page shows everyone taking appointments today.
            </p>
            <a href="/book" className="btn btn-primary" style={{ marginTop: 16 }}>Book a cut</a>
          </div>
        ) : (
          <ul className={s.portraits} role="list">
            {list.map((b, i) => {
              const first = (b.name || "").split(" ")[0];
              const photo = photoOk(b.photo_url) ? b.photo_url : photoOk(b.photo) ? b.photo : null;
              return (
                <li key={b.id} className={s.portrait}>
                  <div className={`frame frame-oval ${s.oval}`} style={{ transform: `rotate(${[-1.5, 1.2, -0.6, 1.8][i % 4]}deg)` }}>
                    <div className="frame-inner">
                      {photo ? (
                        <Impression src={photo} alt={`Portrait of ${b.name}`} seed={b.id * 13} detail={1.1} className={s.ovalImg} />
                      ) : (
                        <div className={s.monogram} aria-hidden="true">{first.charAt(0)}</div>
                      )}
                    </div>
                  </div>
                  <h3 className="h3" style={{ marginTop: 22 }}>{b.name}</h3>
                  <p className="muted" style={{ marginTop: 6, maxWidth: "32ch", marginInline: "auto" }}>
                    {b.bio || "Clean fades, sharp lines and an easy chair."}
                  </p>
                  <a href={`/book?barber=${b.id}`} className="btn btn-ghost" style={{ marginTop: 16 }}>
                    Book with {first}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function Work() {
  return (
    <section id="work" className={`section ${s.work}`} aria-labelledby="work-title">
      <div className="wrap">
        <div className={`${s.sectionHead} ${s.sectionHeadRow}`}>
          <div>
            <h2 id="work-title" className="h2">Recent work</h2>
            <p className="lede">Shown as paintings first. Open any piece to see the photograph.</p>
          </div>
          <a href="/gallery" className="btn btn-ghost">See the full gallery</a>
        </div>
        <ul className={s.hang} role="list">
          {GALLERY.map((g, i) => (
            <li key={g.id} className={`${s.hangItem} ${s[`hang${i + 1}`]}`}>
              <a href={`/gallery?piece=${g.id}`} className={s.hangLink} aria-label={`${g.title}, ${g.medium}. Open in gallery`}>
                <div className="frame">
                  <div className="frame-inner">
                    <Impression src={g.src} alt={`${g.title}: ${g.medium}`} seed={g.id * 7} reveal="hover" className={s.hangImg} />
                  </div>
                </div>
              </a>
              <div className={`placard ${s.hangPlacard}`}>
                <p className="placard-title">{g.title}</p>
                <p className="placard-medium">{g.medium}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Reviews() {
  const [lead, ...rest] = REVIEWS;
  return (
    <section id="reviews" className={`section mist ${s.reviews}`} aria-labelledby="reviews-title">
      <div className="wrap">
        <h2 id="reviews-title" className="h2" style={{ marginBottom: 36 }}>What clients say</h2>
        <div className={s.reviewGrid}>
          <figure className={s.leadQuote}>
            <blockquote>
              <p>{lead.quote}</p>
            </blockquote>
            <figcaption className="muted">{lead.name}, {lead.city}</figcaption>
          </figure>
          <div className={s.quoteList}>
            {rest.map((r) => (
              <figure key={r.name} className={s.quote}>
                <blockquote><p>{r.quote}</p></blockquote>
                <figcaption className="small muted">{r.name}, {r.city}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Visit({ status }) {
  return (
    <section id="visit" className={`section ${s.visit}`} aria-labelledby="visit-title">
      <div className="wrap">
        <div className={s.visitGrid}>
          <div className="stack" style={{ "--stack": "22px" }}>
            <h2 id="visit-title" className="h2">Come by the shop</h2>
            <p className="lede">
              {ADDRESS_LINE}.
              {status && <> Right now we&apos;re <strong>{status.open ? "open" : "closed"}</strong>, {status.detail}.</>}
            </p>
            <div className="panel panel-pad">
              <HoursList />
            </div>
            <div className="row-wrap">
              <a className="btn btn-primary" href="/book">Book a cut</a>
              <a className="btn btn-ghost" href={SHOP.mapsLink} target="_blank" rel="noopener noreferrer">
                <IconPin /> Directions
              </a>
              <a className="btn btn-ghost" href={`tel:${SHOP.phone}`}>
                <IconPhone /> {SHOP.phoneDisplay}
              </a>
            </div>
          </div>
          <div className={`frame ${s.mapFrame}`}>
            <div className="frame-inner">
              <iframe
                title="Map to HEADZ UP Barbershop, 2509 W 4th St"
                src={SHOP.mapsEmbed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className={s.map}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const status = useShopStatus();
  const barbers = useBarbers();
  return (
    <>
      <SiteNav overlay />
      <main id="main">
        <Hero status={status} />
        <PriceBoard />
        <Barbers barbers={barbers} />
        <Work />
        <Reviews />
        <Visit status={status} />
      </main>
      <SiteFooter showTheme showHours={false} />
    </>
  );
}
