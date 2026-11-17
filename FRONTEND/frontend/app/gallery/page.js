"use client";
// Recent work: the shop's own photos, sharp, in the lineup-corner frame.
// Open one for the full photo, its caption and a way to book.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { IconChevronLeft, IconChevronRight, IconClose, Portal } from "@/components/ui/Feedback";
import { Present } from "@/components/ui/motion";
import { GALLERY, GALLERY_FILTERS } from "@/lib/shop";
import s from "./gallery.module.css";

function Lightbox({ items, index, open, onClose, onMove }) {
  const piece = items[index];
  const touch = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onMove(1);
      if (e.key === "ArrowLeft") onMove(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      opener?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, onMove]);

  if (!piece) return null;
  return (
    <Portal>
      <div
        className={s.lightbox}
        role="dialog"
        aria-modal="true"
        aria-label={piece.title}
        data-state={open ? "open" : "closing"}
        inert={!open}
        onTouchStart={(e) => {
          touch.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 50) onMove(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
      >
        <div className={s.lbTop}>
          <p className={s.lbCount}>
            {index + 1} of {items.length}
          </p>
          <button ref={closeRef} className={`icon-btn ${s.lbClose}`} onClick={onClose} aria-label="Close">
            <IconClose size={24} />
          </button>
        </div>

        <div className={s.lbStage}>
          <button className={`icon-btn ${s.lbNav}`} onClick={() => onMove(-1)} aria-label="Previous photo">
            <IconChevronLeft size={28} />
          </button>
          <div className={`frame ${s.lbFrame}`}>
            <div className="frame-inner">
              <picture key={piece.id}>
                <source srcSet={piece.webp} type="image/webp" />
                <img
                  src={piece.src}
                  alt={`${piece.title}: ${piece.medium}`}
                  width={piece.w}
                  height={piece.h}
                  className={s.lbImg}
                />
              </picture>
            </div>
          </div>
          <button className={`icon-btn ${s.lbNav}`} onClick={() => onMove(1)} aria-label="Next photo">
            <IconChevronRight size={28} />
          </button>
        </div>

        <div className={`placard ${s.lbPlacard}`}>
          <p className="placard-title">{piece.title}</p>
          <p className="placard-medium">{piece.medium}. Headz Up, Hattiesburg.</p>
          <Link href="/book" className="btn btn-primary btn-sm mt-3">
            Book a cut
          </Link>
        </div>
      </div>
    </Portal>
  );
}

export default function GalleryPage() {
  const [filter, setFilter] = useState("all");
  const items = useMemo(() => GALLERY.filter((g) => filter === "all" || g.tag === filter), [filter]);
  const [open, setOpen] = useState(null);

  // ?piece=3 opens straight to that piece, and the URL follows the lightbox
  // so a piece can be shared. Read once on mount; replaceState keeps Back sane.
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("piece"));
    const i = GALLERY.findIndex((g) => g.id === id);
    if (i >= 0) setOpen(i); // eslint-disable-line react-hooks/set-state-in-effect -- one-time read of the URL
  }, []);
  useEffect(() => {
    const piece = open == null ? null : items[open]?.id;
    const url = new URL(window.location.href);
    if (String(piece ?? "") === (url.searchParams.get("piece") ?? "")) return;
    if (piece) url.searchParams.set("piece", piece);
    else url.searchParams.delete("piece");
    window.history.replaceState(null, "", url);
  }, [open, items]);

  const close = useCallback(() => setOpen(null), []);
  const move = useCallback(
    (d) => setOpen((i) => (i == null ? i : (i + d + items.length) % items.length)),
    [items.length],
  );

  return (
    <>
      <SiteNav />
      <main id="main" className={s.page}>
        <div className="wrap">
          <header className={s.head}>
            <h1 className="h1">Recent work</h1>
            <p className="lede">
              Every cut here walked out of the shop on West 4th Street. Tap a photo to see it full size.
            </p>
            <div className="pills" role="group" aria-label="Filter the work">
              {GALLERY_FILTERS.map((f) => (
                <button key={f.id} className="pill" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          </header>

          {items.length === 0 ? (
            <div className="panel panel-pad w-m">
              <p className="h4">No photos under that label yet.</p>
              <button className="btn btn-ghost mt-4" onClick={() => setFilter("all")}>
                Show everything
              </button>
            </div>
          ) : (
            <ul className={s.wall} role="list">
              {items.map((g, i) => (
                <li key={g.id} className={s.piece}>
                  <button className={s.pieceBtn} onClick={() => setOpen(i)} aria-label={`Open ${g.title}`}>
                    <span className={`frame ${s.pieceFrame}`}>
                      <span className="frame-inner">
                        <picture>
                          <source srcSet={g.webp} type="image/webp" />
                          <img
                            src={g.src}
                            alt={`${g.title}: ${g.medium}`}
                            width={g.w}
                            height={g.h}
                            loading={i < 3 ? "eager" : "lazy"}
                            decoding="async"
                            className={s.pieceImg}
                          />
                        </picture>
                      </span>
                    </span>
                  </button>
                  <p className={s.caption}>
                    <span className={s.captionTitle}>{g.title}</span>
                    <span className="small muted">{g.medium}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}

          <section className={`panel panel-pad ${s.cta}`} aria-label="Book">
            <div>
              <h2 className="h3">Want your cut up here?</h2>
              <p className="muted mt-2">Book your chair and ask your barber for a photo on the way out.</p>
            </div>
            <Link href="/book" className="btn btn-primary btn-lg">
              Book a cut
            </Link>
          </section>
        </div>
      </main>
      <SiteFooter />
      <Present value={open}>
        {(index, shown) => <Lightbox items={items} index={index} open={shown} onClose={close} onMove={move} />}
      </Present>
    </>
  );
}
