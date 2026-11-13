"use client";
// Public navigation. On the home page it floats clear over the painting and
// turns solid once you scroll; elsewhere it's solid from the start.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth";
import { IconClose, IconMenu } from "@/components/ui/Feedback";
import { usePresence } from "@/components/ui/motion";

const LINKS = [
  { href: "/#services", label: "Services" },
  { href: "/#barbers", label: "Barbers" },
  { href: "/gallery", label: "Work" },
  { href: "/#visit", label: "Visit" },
  { href: "/newsletter", label: "News" },
];

export function ShopSign({ href = "/", small = false }) {
  return (
    <Link href={href} className="sign" aria-label="Headz Up Barbershop, home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo1.jpg" alt="" width="94" height="30" style={small ? { height: 26 } : undefined} />
    </Link>
  );
}

export default function SiteNav({ overlay = false }) {
  const pathname = usePathname();
  const { ready, loggedIn, isStaff } = useSession();
  const [solid, setSolid] = useState(!overlay);
  const [open, setOpen] = useState(false);
  const sheet = usePresence(open);
  const menuBtn = useRef(null);
  const closeBtn = useRef(null);

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
    closeBtn.current?.focus();
    const button = menuBtn.current;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      // back to the menu button, unless a link already took focus elsewhere
      if (
        !document.activeElement ||
        document.activeElement === document.body ||
        document.getElementById("site-menu")?.contains(document.activeElement)
      ) {
        button?.focus({ preventScroll: true });
      }
    };
  }, [open]);

  const account = !ready
    ? null
    : loggedIn
      ? isStaff
        ? { href: "/barber-dashboard", label: "Dashboard" }
        : { href: "/dashboard", label: "My appointments" }
      : { href: "/login", label: "Log in" };

  return (
    <>
      <header className={`nav ${solid ? "is-solid" : ""}`}>
        <div className="wrap nav-inner">
          <ShopSign />
          <nav className="nav-links" aria-label="Main">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="nav-link"
                aria-current={pathname === l.href ? "page" : undefined}
              >
                <span className={pathname === l.href ? "drip-under" : undefined}>{l.label}</span>
              </Link>
            ))}
          </nav>
          <div className="nav-end">
            {account && (
              <Link href={account.href} className="nav-link hide-sm">
                {account.label}
              </Link>
            )}
            {isStaff ? (
              <Link href="/barber-dashboard" className="btn btn-primary btn-sm hide-sm">
                Open dashboard
              </Link>
            ) : (
              <Link href="/book" className="btn btn-primary btn-sm">
                Book a cut
              </Link>
            )}
            <button
              ref={menuBtn}
              className="icon-btn nav-menu-btn"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="site-menu"
            >
              <IconMenu size={22} />
            </button>
          </div>
        </div>
      </header>

      {sheet && (
        <div
          className="menu-sheet"
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          data-state={sheet}
          inert={sheet === "closing"}
        >
          <div className="spread">
            <ShopSign />
            <button ref={closeBtn} className="icon-btn" onClick={() => setOpen(false)} aria-label="Close menu">
              <IconClose size={22} />
            </button>
          </div>
          <nav aria-label="Main">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            {account && (
              <Link href={account.href} onClick={() => setOpen(false)}>
                {account.label}
              </Link>
            )}
            {!loggedIn && (
              <Link href="/barber-login" onClick={() => setOpen(false)}>
                Barber sign-in
              </Link>
            )}
          </nav>
          <div style={{ marginTop: "auto", paddingTop: 28 }}>
            <Link href={isStaff ? "/barber-dashboard" : "/book"} className="btn btn-primary btn-lg btn-block">
              {isStaff ? "Open dashboard" : "Book a cut"}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
