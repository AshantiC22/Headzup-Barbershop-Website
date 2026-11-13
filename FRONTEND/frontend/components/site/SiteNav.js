"use client";
// Public navigation. On the home page it floats clear over the painting and
// turns solid once you scroll; elsewhere it's solid from the start.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth";
import { IconClose, IconMenu } from "@/components/ui/Feedback";

const LINKS = [
  { href: "/#services", label: "Services" },
  { href: "/#barbers",  label: "Barbers" },
  { href: "/gallery",   label: "Work" },
  { href: "/#visit",    label: "Visit" },
  { href: "/newsletter", label: "News" },
];

export function ShopSign({ href = "/", small = false }) {
  return (
    <a href={href} className="sign" aria-label="Headz Up Barbershop, home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo1.jpg" alt="" width="94" height="30" style={small ? { height: 26 } : undefined} />
    </a>
  );
}

export default function SiteNav({ overlay = false }) {
  const pathname = usePathname();
  const { ready, loggedIn, isStaff } = useSession();
  const [solid, setSolid] = useState(!overlay);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open]);

  const account = !ready ? null : loggedIn
    ? (isStaff ? { href: "/barber-dashboard", label: "Dashboard" } : { href: "/dashboard", label: "My appointments" })
    : { href: "/login", label: "Log in" };

  return (
    <>
      <header className={`nav ${solid ? "is-solid" : ""}`}>
        <div className="wrap nav-inner">
          <ShopSign />
          <nav className="nav-links" aria-label="Main">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="nav-link"
                aria-current={pathname === l.href ? "page" : undefined}>
                <span className={pathname === l.href ? "drip-under" : undefined}>{l.label}</span>
              </a>
            ))}
          </nav>
          <div className="nav-end">
            {account && <a href={account.href} className="nav-link hide-sm">{account.label}</a>}
            {isStaff
              ? <a href="/barber-dashboard" className="btn btn-primary btn-sm hide-sm">Open dashboard</a>
              : <a href="/book" className="btn btn-primary btn-sm">Book a cut</a>}
            <button className="icon-btn nav-menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"
              aria-expanded={open} aria-controls="site-menu">
              <IconMenu size={22} />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="menu-sheet" id="site-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="spread">
            <ShopSign />
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close menu">
              <IconClose size={22} />
            </button>
          </div>
          <nav aria-label="Main">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
            ))}
            {account && <a href={account.href} onClick={() => setOpen(false)}>{account.label}</a>}
            {!loggedIn && <a href="/barber-login" onClick={() => setOpen(false)}>Barber sign-in</a>}
          </nav>
          <div style={{ marginTop: "auto", paddingTop: 28 }}>
            <a href={isStaff ? "/barber-dashboard" : "/book"} className="btn btn-primary btn-lg btn-block">
              {isStaff ? "Open dashboard" : "Book a cut"}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
