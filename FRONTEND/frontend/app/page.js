"use client";
// Home. The faded wordmark and the next open chair come first, because the
// question most people arrive with is "can I get in today?". Then the menu on
// a dark band that fades out like a skin fade, the barbers, what clients wrote
// on Booksy, recent work and how to find the shop.
import { useEffect, useState } from "react";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter, { HoursList } from "@/components/site/SiteFooter";
import Wordmark from "@/components/site/Wordmark";
import NextChair, { dayWord, useShopBook } from "@/components/site/NextChair";
import { IconExternal, IconPhone, IconPin, IconRefresh, Skeleton } from "@/components/ui/Feedback";
import { ONLINE_PAYMENTS } from "@/lib/config";
import { bookingHref } from "@/lib/nextChair";
import { ADDRESS_LINE, BOOKSY, GALLERY, REVIEWS, SERVICES, SERVICE_GROUPS, SHOP, describeService } from "@/lib/shop";
import { fmtTime, shopStatus } from "@/lib/time";
import s from "./home.module.css";

const photoOk = (url) => !!url && (url.startsWith("data:") || url.startsWith("https://"));
const firstName = (name = "") => name.trim().split(/\s+/)[0] || name;

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

function Top({ status, chair, retry }) {
  return (
    <section className={s.top} aria-labelledby="shop-name">
      <div className="wrap">
        <Wordmark as="h1" id="shop-name" sweep label="HEADZ UP Barbershop" className={s.mark} />
        <div className={s.topRow}>
          <div className={s.intro}>
            <p className={s.where}>Barbershop on West 4th Street, Hattiesburg</p>
            <p className={s.pitch}>
              Fades, lineups, beard work and hot-towel shaves, for kids from age one to the seniors who&apos;ve been
              sitting in a barber&apos;s chair longer than we&apos;ve been cutting.
            </p>
            <p className={`${s.status} ${status?.open ? s.isOpen : ""}`} aria-live="polite">
              <span className={s.statusMark} aria-hidden="true" />
              <span>{status ? `${status.label}, ${status.detail}` : "Checking the hours"}</span>
            </p>
            <p className={s.reach}>
              <a href={SHOP.mapsLink} target="_blank" rel="noopener noreferrer" className="link">
                <IconPin size={16} /> {SHOP.street}
              </a>
              <a href={`tel:${SHOP.phone}`} className="link">
                <IconPhone size={16} /> {SHOP.phoneDisplay}
              </a>
            </p>
          </div>
          <NextChair chair={chair} retry={retry} />
        </div>
      </div>
    </section>
  );
}

function Menu() {
  return (
    <section id="services" className={s.menuSection} aria-labelledby="services-title">
      <div className="fade-edge is-up" aria-hidden="true" />
      <div className={`band ${s.menuBand}`}>
        <div className="wrap">
          <div className={s.menuHead}>
            <h2 id="services-title" className="h2">
              The menu
            </h2>
            <p className={s.menuNote}>
              Prices are what you pay in the chair.{" "}
              {ONLINE_PAYMENTS ? "Cash, Cash App, or a deposit online." : "Cash or Cash App."} Tap a service to book it.
            </p>
          </div>
          <div className={s.menuGroups}>
            {SERVICE_GROUPS.map((g) => (
              <div key={g.id} className={s.menuGroup}>
                <h3 className={s.groupTitle}>{g.title}</h3>
                <p className={s.groupNote}>{g.note}</p>
                <ul role="list" className={s.menuList}>
                  {SERVICES.filter((x) => x.group === g.id).map((x) => (
                    <li key={x.name}>
                      <Link href={`/book?service=${encodeURIComponent(x.name)}`} className={s.menuRow}>
                        <span className={s.menuName}>{x.name}</span>
                        <span className={s.menuPrice}>${x.price}</span>
                        <span className={s.menuDesc}>{describeService(x.name)}</span>
                        <span className={s.menuTime}>
                          <span className={s.chairBar} style={{ "--m": Math.min(x.minutes, 60) }} aria-hidden="true" />
                          {x.minutes} min
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="fade-edge" aria-hidden="true" />
    </section>
  );
}

function Barbers({ barbers, chair, retry }) {
  const { status, list } = barbers;
  // each barber's first opening on the day the chair module found
  const freeAt = new Map();
  if (chair.status === "found") {
    for (const o of chair.openings) if (!freeAt.has(o.barber.id)) freeAt.set(o.barber.id, o);
  }
  const day = chair.status === "found" ? dayWord(chair.date, chair.today) : "";

  return (
    <section id="barbers" className={`section ${s.barbers}`} aria-labelledby="barbers-title">
      <div className="wrap">
        <div className={s.head}>
          <h2 id="barbers-title" className="h2">
            The barbers
          </h2>
          <p className="lede">
            Each barber keeps their own book. Pick who you sit with and they see your notes before you get there.
          </p>
        </div>

        {status === "loading" ? (
          <ul className={s.barberGrid} role="list" aria-busy="true">
            {[0, 1].map((i) => (
              <li key={i} className={s.barber}>
                <Skeleton h={0} className={s.photoSkeleton} />
                <Skeleton h={28} w="50%" className="mt-4" />
              </li>
            ))}
          </ul>
        ) : list.length === 0 ? (
          <div className={`placard ${s.empty}`}>
            <p className="placard-title">
              {status === "failed" ? "The barber list didn't load." : "No barbers are taking bookings online yet."}
            </p>
            <p className="mt-2">
              {status === "failed"
                ? "Check your connection and try again, or call the shop."
                : "Call the shop and they'll put you in a chair."}
            </p>
            <div className="row-wrap mt-4">
              {status === "failed" && (
                <button type="button" className="btn btn-ghost" onClick={retry}>
                  <IconRefresh /> Try again
                </button>
              )}
              <a href={`tel:${SHOP.phone}`} className="btn btn-ghost">
                <IconPhone /> {SHOP.phoneDisplay}
              </a>
            </div>
          </div>
        ) : (
          <ul className={s.barberGrid} role="list">
            {list.map((b) => {
              const first = firstName(b.name);
              const photo = photoOk(b.photo_url) ? b.photo_url : photoOk(b.photo) ? b.photo : null;
              const free = freeAt.get(b.id);
              return (
                <li key={b.id} className={s.barber}>
                  <div className={`frame ${s.photo}`}>
                    <div className="frame-inner">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- barber photos come from the API, any host
                        <img src={photo} alt={`${b.name}`} loading="lazy" decoding="async" className={s.photoImg} />
                      ) : (
                        <div className={s.monogram} aria-hidden="true">
                          {first.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className={s.barberName}>{b.name}</h3>
                  {b.bio && <p className={s.bio}>{b.bio}</p>}
                  {free && (
                    <p className={s.free}>
                      <span>
                        Free at {fmtTime(free.time)} {day}
                      </span>
                    </p>
                  )}
                  <div className="row-wrap mt-4">
                    {free ? (
                      <Link href={bookingHref(free, chair.date)} className="btn btn-primary">
                        Take the {fmtTime(free.time).replace(/\s?[AP]M$/, "")} with {first}
                      </Link>
                    ) : (
                      <Link href={`/book?barber=${b.id}`} className="btn btn-ghost">
                        Book with {first}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function Reviews() {
  const [lead, ...rest] = REVIEWS;
  const who = (r) => `${r.name}, ${r.service} with ${r.barber}`;
  return (
    <section id="reviews" className={`section ${s.reviews}`} aria-labelledby="reviews-title">
      <div className="wrap">
        <div className={s.reviewGrid}>
          <div className={s.score}>
            <h2 id="reviews-title" className="sr-only">
              Reviews
            </h2>
            <p className={s.scoreNum} aria-hidden="true">
              {BOOKSY.rating}
            </p>
            <p className={s.scoreLine}>
              <span className="sr-only">Rated {BOOKSY.rating} out of 5 </span>
              from {BOOKSY.count} reviews on Booksy
            </p>
            <a href={BOOKSY.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm mt-4">
              Read them on Booksy <IconExternal />
            </a>
          </div>
          <div>
            <figure className={s.leadQuote}>
              <blockquote>
                <p>{lead.quote}</p>
              </blockquote>
              <figcaption>{who(lead)}</figcaption>
            </figure>
            <ul role="list" className={s.quotes}>
              {rest.map((r) => (
                <li key={r.name}>
                  <figure className={s.quote}>
                    <blockquote>
                      <p>{r.quote}</p>
                    </blockquote>
                    <figcaption>{who(r)}</figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Work() {
  return (
    <section id="work" className={`section ${s.work}`} aria-labelledby="work-title">
      <div className="wrap">
        <div className={`${s.head} ${s.headRow}`}>
          <h2 id="work-title" className="h2">
            Recent work
          </h2>
          <Link href="/gallery" className="btn btn-ghost">
            See all the photos
          </Link>
        </div>
      </div>
      <ul className={s.strip} role="list">
        {GALLERY.map((g) => (
          <li key={g.id} className={s.shot}>
            <Link href={`/gallery?piece=${g.id}`} className={s.shotLink}>
              <span className={`frame ${s.shotFrame}`}>
                <span className="frame-inner">
                  <picture>
                    <source srcSet={g.webp} type="image/webp" />
                    <img
                      src={g.src}
                      alt={`${g.title}: ${g.medium}`}
                      width={g.w}
                      height={g.h}
                      loading="lazy"
                      decoding="async"
                      className={s.shotImg}
                    />
                  </picture>
                </span>
              </span>
              <span className={s.shotCaption}>
                <span className={s.shotTitle}>{g.title}</span>
                <span className="small muted">{g.medium}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Visit({ status }) {
  return (
    <section id="visit" className={`section ${s.visit}`} aria-labelledby="visit-title">
      <div className="wrap">
        <div className={s.visitGrid}>
          <div>
            <h2 id="visit-title" className="h2">
              Find the shop
            </h2>
            <p className={s.address}>
              <a href={SHOP.mapsLink} target="_blank" rel="noopener noreferrer" className="link">
                {ADDRESS_LINE}
              </a>
            </p>
            <p className="muted mt-2">
              {status ? (
                <>
                  {status.open ? "Open" : "Closed"} right now, {status.detail}.{" "}
                </>
              ) : null}
              {ONLINE_PAYMENTS
                ? "Pay in the chair with cash or Cash App, or put a deposit down online."
                : "Pay in the chair with cash or Cash App."}
            </p>
            <div className={`mt-6 ${s.hours}`}>
              <HoursList />
            </div>
            <div className="row-wrap mt-6">
              <a className="btn btn-primary" href={SHOP.mapsLink} target="_blank" rel="noopener noreferrer">
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
                title="Map to HEADZ UP Barbershop, 2509 W 4th St, Hattiesburg"
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
  const { barbers, chair, retry } = useShopBook();
  return (
    <>
      <SiteNav />
      <main id="main" className={s.main}>
        <Top status={status} chair={chair} retry={retry} />
        <Menu />
        <Barbers barbers={barbers} chair={chair} retry={retry} />
        <Reviews />
        <Work />
        <Visit status={status} />
      </main>
      <SiteFooter showTheme showHours={false} />
    </>
  );
}
