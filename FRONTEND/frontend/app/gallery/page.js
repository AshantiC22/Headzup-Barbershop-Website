"use client";
// The wall: every photo in an iron frame, shown first as an oil sketch.
// Open one and the photograph comes through, with its plate and a way to book.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Impression from "@/components/art/Impression";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { IconChevronLeft, IconChevronRight, IconClose } from "@/components/ui/Feedback";
import { arrowSelect, rovingIndex } from "@/components/ui/roving";
import { GALLERY, GALLERY_FILTERS } from "@/lib/shop";
import s from "./gallery.module.css";

const VIEWS = ["photo", "paint"];
const CROPS = ["3 / 4", "1 / 1", "4 / 5", "3 / 4", "4 / 3", "4 / 5"];

function Lightbox({ items, index, onClose, onMove }) {
  const piece = items[index];
  const [view, setView] = useState("photo");
  const touch = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onMove(1);
      if (e.key === "ArrowLeft") onMove(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose, onMove]);

  if (!piece) return null;
  return (
    <div className={s.lightbox} role="dialog" aria-modal="true" aria-label={piece.title}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) onMove(dx < 0 ? 1 : -1);
        touch.current = null;
      }}>
      <div className={s.lbTop}>
        <div className="hu-theme-switch" role="radiogroup" aria-label="How to show this piece"
          onKeyDown={(e) => { e.stopPropagation(); arrowSelect(e, VIEWS, view, setView); }}>
          {VIEWS.map((v) => (
            <button key={v} type="button" role="radio" aria-checked={view === v} tabIndex={rovingIndex(v, view, VIEWS)}
              className={view === v ? "is-on" : ""} onClick={() => setView(v)}>
              {v === "photo" ? "Photograph" : "Oil sketch"}
            </button>
          ))}
        </div>
        <button ref={closeRef} className={`icon-btn ${s.lbClose}`} onClick={onClose} aria-label="Close">
          <IconClose size={24} />
        </button>
      </div>

      <div className={s.lbStage}>
        <button className={`icon-btn ${s.lbNav}`} onClick={() => onMove(-1)} aria-label="Previous piece"><IconChevronLeft size={28} /></button>
        <div className={`frame ${s.lbFrame}`}>
          <div className="frame-inner">
            {view === "photo" ? (
              <picture key={piece.id}>
                <source srcSet={piece.webp} type="image/webp" />
                <img src={piece.src} alt={`${piece.title}: ${piece.medium}`} className={s.lbImg} />
              </picture>
            ) : (
              <Impression key={`p${piece.id}`} src={piece.src} alt={`${piece.title}, painted`} seed={piece.id * 7} detail={1.4} className={s.lbImg} priority />
            )}
          </div>
        </div>
        <button className={`icon-btn ${s.lbNav}`} onClick={() => onMove(1)} aria-label="Next piece"><IconChevronRight size={28} /></button>
      </div>

      <div className={`placard ${s.lbPlacard}`}>
        <p className="placard-title">{piece.title}</p>
        <p className="placard-medium">{piece.medium}. Headz Up, Hattiesburg.</p>
        <div className="row-wrap mt-3">
          <a href="/book" className="btn btn-primary btn-sm">Book a cut</a>
          <span className="small faint">{index + 1} of {items.length}</span>
        </div>
      </div>
    </div>
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
  const move = useCallback((d) => setOpen((i) => (i == null ? i : (i + d + items.length) % items.length)), [items.length]);

  return (
    <>
      <SiteNav />
      <main id="main" className={s.page}>
        <div className="wrap">
          <header className={s.head}>
            <h1 className="h1">Recent work</h1>
            <p className="lede">
              Every piece here walked out of the shop on West 4th. They hang as oil sketches first;
              open one to see the photograph.
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
              <p className="h4">Nothing hung under that label yet.</p>
              <button className="btn btn-ghost mt-4" onClick={() => setFilter("all")}>Show everything</button>
            </div>
          ) : (
            <ul className={s.wall} role="list">
              {items.map((g, i) => (
                <li key={g.id} className={s.piece}>
                  <button className={s.pieceBtn} onClick={() => setOpen(i)} aria-label={`Open ${g.title}`}>
                    <div className="frame" style={{ transform: `rotate(${[-0.8, 0.6, -0.3, 0.9, -0.5, 0.4][i % 6]}deg)` }}>
                      <div className="frame-inner">
                        <Impression src={g.src} alt={`${g.title}: ${g.medium}`} seed={g.id * 7} detail={1.2}
                          reveal="hover" imgStyle={{ aspectRatio: CROPS[g.id % CROPS.length] }} className={s.pieceImg} />
                      </div>
                    </div>
                  </button>
                  <div className={`placard ${s.piecePlacard}`}>
                    <p className="placard-title">{g.title}</p>
                    <p className="placard-medium">{g.medium}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <section className={`panel panel-pad ${s.cta}`} aria-label="Book">
            <div>
              <h2 className="h3">Want to hang on this wall?</h2>
              <p className="muted mt-2">Book your chair and ask your barber for a photo on the way out.</p>
            </div>
            <a href="/book" className="btn btn-primary btn-lg">Book a cut</a>
          </section>
        </div>
      </main>
      <SiteFooter />
      {open != null && <Lightbox items={items} index={open} onClose={close} onMove={move} />}
    </>
  );
}
