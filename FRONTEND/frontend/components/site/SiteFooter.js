"use client";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeProvider";
import { ADDRESS_LINE, HOURS, SHOP } from "@/lib/shop";
import { fmtTime, shopStatus } from "@/lib/time";
import { ShopSign } from "./SiteNav";

export function HoursList({ compact = false }) {
  const [today, setToday] = useState(null);
  useEffect(() => { setToday(shopStatus().today); }, []);
  // Monday first, the way people read a week
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <dl className="hours" style={{ display: "grid", gap: compact ? 4 : 8 }}>
      {order.map((d) => {
        const h = HOURS[d];
        const isToday = today === d;
        return (
          <div key={d} className="spread" style={{
            fontWeight: isToday ? 750 : 450, color: isToday ? "var(--ink)" : "var(--ink-2)",
          }}>
            <dt>{h.label}{isToday && <span className="sr-only"> (today)</span>}</dt>
            <dd className="num">{h.open ? `${fmtTime(h.open)} – ${fmtTime(h.close)}` : "Closed"}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export default function SiteFooter({ showTheme = false, showHours = true }) {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className={`footer-grid ${showHours ? "" : "footer-grid-2"}`}>
          <div className="stack" style={{ "--stack": "16px" }}>
            <ShopSign />
            <p className="muted" style={{ maxWidth: 34 + "ch" }}>
              Fades, lineups, beard work and hot shaves on West 4th Street. Walk-ins welcome when the chair is free.
            </p>
            <p>
              <a href={SHOP.mapsLink} target="_blank" rel="noopener noreferrer">{ADDRESS_LINE}</a><br />
              <a href={`tel:${SHOP.phone}`}>{SHOP.phoneDisplay}</a>
            </p>
          </div>
          {showHours && (
            <div>
              <h2 className="h4" style={{ marginBottom: 14 }}>Hours</h2>
              <HoursList compact />
            </div>
          )}
          <div>
            <h2 className="h4" style={{ marginBottom: 14 }}>Around the shop</h2>
            <ul className="footer-list">
              <li><a href="/book">Book a cut</a></li>
              <li><a href="/gallery">Recent work</a></li>
              <li><a href="/newsletter">News and deals</a></li>
              <li><a href="/waitlist">Join a waitlist</a></li>
              <li><a href="/dashboard">My appointments</a></li>
              <li><a href="/barber-login">Barber sign-in</a></li>
              <li><a href="/sms-optin">Text message settings</a></li>
              <li><a href="/terms">Terms and privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-base">
          <p className="small faint">© {new Date().getFullYear()} HEADZ UP Barbershop, Hattiesburg, Mississippi</p>
          {showTheme && <ThemeToggle />}
        </div>
      </div>
    </footer>
  );
}
