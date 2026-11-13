"use client";
// Home: a night street with the shop's pole lit like a gas lamp, then the
// tools and prices, the barbers in arched frames, recent work on the wall,
// what clients say, and how to find the place.
import { useEffect, useState } from "react";
import Link from "next/link";
import StreetScene from "@/components/art/StreetScene";
import Impression from "@/components/art/Impression";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter, { HoursList } from "@/components/site/SiteFooter";
import ToolRack from "@/components/site/ToolRack";
import { IconPhone, IconPin, Skeleton } from "@/components/ui/Feedback";
import { API_ROOT } from "@/lib/auth";
import { ADDRESS_LINE, GALLERY, REVIEWS, SHOP } from "@/lib/shop";
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

function Hero({ status }) {
  const open = !!status?.open;
  return (
    <section className={s.hero} aria-labelledby="hero-title">
      <StreetScene open={open} />
      <div className={s.glaze} aria-hidden="true" />
      <div className={`wrap ${s.heroContent}`}>
        <p className={`${s.status} ${open ? s.statusOpen : ""}`} aria-live="polite">
          <span className={s.flame} aria-hidden="true" />
          {status ? <>{status.label}, {status.detail}</> : "Checking the hours"}
        </p>
        <h1 id="hero-title" className={`display ${s.title}`}>Keep your head up.</h1>
        <p className={`lede ${s.lede}`}>
          Fades, lineups, beard work and hot shaves on West 4th Street in Hattiesburg.
          Pick your barber, pick a time, and the chair is yours.
        </p>
        <div className={s.ctas}>
          <Link href="/book" className="btn btn-primary btn-lg">Book a cut</Link>
          <a href="#services" className={`btn btn-ghost btn-lg ${s.ghostOnArt}`}>See prices</a>
        </div>
      </div>
      <div className={`placard ${s.heroPlate}`}>
        <p className="placard-title">{SHOP.legalName}</p>
        <p className="placard-medium">{SHOP.street}, {SHOP.city}. The lamp is lit while we&apos;re open.</p>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section id="services" className={`section`} aria-labelledby="services-title">
      <div className="wrap">
        <div className={s.sectionHead}>
          <h2 id="services-title" className="h2">Services and prices</h2>
          <p className="lede">
            Pick a service to see what it takes and what it costs. Pay in the shop, or put a deposit
            down online to hold your spot.
          </p>
        </div>
        <ToolRack />
      </div>
    </section>
  );
}

function Barbers({ barbers }) {
  const { loading, list, failed } = barbers;
  return (
    <section id="barbers" className={`section mist`} aria-labelledby="barbers-title">
      <div className="wrap">
        <div className={s.sectionHead}>
          <h2 id="barbers-title" className="h2">The barbers</h2>
          <p className="lede">Each barber keeps their own book. Choose who you sit with, and they get your notes before you arrive.</p>
        </div>

        {loading ? (
          <div className={s.portraits}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={s.portrait}>
                <Skeleton h={0} className={s.archSkeleton} />
                <Skeleton h={22} w="60%" className={s.nameSkeleton} />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="panel panel-pad w-m">
            <p className="h4">{failed ? "Barber profiles didn't load." : "No barbers listed yet."}</p>
            <p className="muted mt-2">
              You can still book. The booking page shows everyone taking appointments today.
            </p>
            <Link href="/book" className="btn btn-primary mt-4">Book a cut</Link>
          </div>
        ) : (
          <ul className={s.portraits} role="list">
            {list.map((b) => {
              const first = (b.name || "").split(" ")[0];
              const photo = photoOk(b.photo_url) ? b.photo_url : photoOk(b.photo) ? b.photo : null;
              return (
                <li key={b.id} className={s.portrait}>
                  <div className={`frame frame-arch ${s.arch}`}>
                    <div className="frame-inner">
                      {photo ? (
                        <Impression src={photo} alt={`Portrait of ${b.name}`} seed={b.id * 13} detail={1.1} className={s.archImg} />
                      ) : (
                        <div className={s.monogram} aria-hidden="true">{first.charAt(0)}</div>
                      )}
                    </div>
                  </div>
                  <h3 className={s.barberName}>{b.name}</h3>
                  <p className={`lore ${s.barberBio}`}>{b.bio || "Clean fades, sharp lines and an easy chair."}</p>
                  <Link href={`/book?barber=${b.id}`} className="btn btn-ghost mt-4">
                    Book with {first}
                  </Link>
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
    <section id="work" className={`section`} aria-labelledby="work-title">
      <div className="wrap">
        <div className={`${s.sectionHead} ${s.sectionHeadRow}`}>
          <div>
            <h2 id="work-title" className="h2">Recent work</h2>
            <p className="lede">Hung as oil sketches. Open one to see the photograph.</p>
          </div>
          <Link href="/gallery" className="btn btn-ghost">See the full gallery</Link>
        </div>
        <ul className={s.hang} role="list">
          {GALLERY.map((g, i) => (
            <li key={g.id} className={`${s.hangItem} ${s[`hang${i + 1}`]}`}>
              <Link href={`/gallery?piece=${g.id}`} className={s.hangLink} aria-label={`${g.title}, ${g.medium}. Open in gallery`}>
                <div className="frame">
                  <div className="frame-inner">
                    <Impression src={g.src} alt={`${g.title}: ${g.medium}`} seed={g.id * 7} reveal="hover" className={s.hangImg} />
                  </div>
                </div>
              </Link>
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
    <section id="reviews" className={`section mist`} aria-labelledby="reviews-title">
      <div className="wrap">
        <h2 id="reviews-title" className="h2 mb-8">What clients say</h2>
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
    <section id="visit" className={`section`} aria-labelledby="visit-title">
      <div className="wrap">
        <div className={s.visitGrid}>
          <div className={`stack ${s.visitText}`}>
            <h2 id="visit-title" className="h2">Find the shop</h2>
            <p className="lede">
              {ADDRESS_LINE}.
              {status && <> Right now we&apos;re <strong>{status.open ? "open" : "closed"}</strong>, {status.detail}.</>}
            </p>
            <div className={`panel panel-pad ${s.ledger}`}>
              <HoursList />
            </div>
            <div className="row-wrap">
              <Link className="btn btn-primary" href="/book">Book a cut</Link>
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
        <Services />
        <Barbers barbers={barbers} />
        <Work />
        <Reviews />
        <Visit status={status} />
      </main>
      <SiteFooter showTheme showHours={false} />
    </>
  );
}
