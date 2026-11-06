"use client";
// ─────────────────────────────────────────────────────────────────────────────
// The barber's studio. Every tab from the old dashboard is here, each in its
// own component under components/barber/, and the payments tab (which the old
// sidebar never linked to) is now reachable. The current tab lives in the URL
// (?tab=clients), so a refresh keeps your place.
// ─────────────────────────────────────────────────────────────────────────────
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import API from "@/lib/api";
import { todayStr } from "@/lib/time";
import { useNotifications } from "@/components/NotificationSystem";
import { ThemeToggle } from "@/components/ThemeProvider";
import AppHeader from "@/components/site/AppHeader";
import ScheduleTab from "@/components/barber/ScheduleTab";
import { ClientsTab, ReschedulesTab, ReviewsTab, WalkInTab } from "@/components/barber/PeopleTabs";
import { HoursTab, NewsTab, ProfileTab } from "@/components/barber/SetupTabs";
import { PaymentsTab, ReportsTab, StripeTab } from "@/components/barber/MoneyTabs";
import {
  IconCalendar, IconCard, IconChart, IconClock, IconMegaphone, IconStar, IconSwap, IconUser, IconUsers,
  IconWalk, IconWallet, Skeleton, useToasts,
} from "@/components/ui/Feedback";

const TABS = [
  { id: "schedule",    label: "Schedule",     Icon: IconCalendar },
  { id: "walkin",      label: "Walk-in",      Icon: IconWalk },
  { id: "reschedules", label: "Reschedules",  Icon: IconSwap },
  { id: "clients",     label: "Clients",      Icon: IconUsers },
  { id: "reviews",     label: "Reviews",      Icon: IconStar },
  { id: "hours",       label: "Hours",        Icon: IconClock },
  { id: "news",        label: "News",         Icon: IconMegaphone },
  { id: "payments",    label: "Deposits",     Icon: IconWallet },
  { id: "reports",     label: "Reports",      Icon: IconChart },
  { id: "stripe",      label: "Getting paid", Icon: IconCard },
  { id: "profile",     label: "Profile",      Icon: IconUser },
];
const ALIASES = { availability: "hours", newsletter: "news", walk: "walkin" };
const money = (n) => { const v = parseFloat(n || 0); return `$${v.toFixed(v % 1 ? 2 : 0)}`; };

function Studio() {
  const router = useRouter();
  const params = useSearchParams();
  const { showPermitPrompt } = useNotifications() || {};
  const [toastHost, toast] = useToasts();
  const [barber, setBarber] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState({});
  const [badges, setBadges] = useState({ reviews: 0, reschedules: 0 });
  const initial = ALIASES[params.get("tab")] || params.get("tab");
  const [tab, setTab] = useState(TABS.some((t) => t.id === initial) ? initial : "schedule");

  useEffect(() => { showPermitPrompt?.(); }, [showPermitPrompt]);

  useEffect(() => {
    let token = null;
    try { token = localStorage.getItem("access"); } catch {}
    if (!token) { router.replace("/barber-login"); return; }
    (async () => {
      try {
        const [dash, me] = await Promise.all([API.get("dashboard/"), API.get("barber/me/")]);
        if (!dash.data.is_staff) { router.replace("/dashboard"); return; }
        setBarber(me.data);
        API.get("services/").then((r) => setServices(Array.isArray(r.data) ? r.data : r.data?.results || [])).catch(() => {});
        API.get(`barber/schedule/?date=${todayStr()}`, { _noCache: true }).then((r) => setToday(r.data?.summary || {})).catch(() => {});
        API.get("barber/reviews/", { _noCache: true }).then((r) => {
          const unread = (r.data?.reviews || []).filter((x) => !x.barber_seen).length;
          const cached = parseInt(localStorage.getItem("headzup_review_badge") || "0", 10);
          setBadges((b) => ({ ...b, reviews: Math.max(unread, cached) }));
        }).catch(() => {});
        API.get("barber/reschedules/", { _noCache: true }).then((r) => {
          setBadges((b) => ({ ...b, reschedules: (r.data || []).filter((x) => x.status === "pending").length }));
        }).catch(() => {});
      } catch (e) {
        if (e?.response?.status === 401 || e?.response?.status === 403) router.replace("/barber-login");
      } finally { setLoading(false); }
    })();
  }, [router]);

  // A review push arriving while the dashboard is open bumps the badge.
  useEffect(() => {
    const onPush = (e) => {
      if (e.detail?.type === "review" || e.detail?.notif_type === "haircut_review") {
        setBadges((b) => {
          const n = b.reviews + 1;
          try { localStorage.setItem("headzup_review_badge", String(n)); } catch {}
          return { ...b, reviews: n };
        });
      }
    };
    window.addEventListener("headzup:push", onPush);
    return () => window.removeEventListener("headzup:push", onPush);
  }, []);

  const go = (id) => {
    setTab(id);
    const url = id === "schedule" ? "/barber-dashboard" : `/barber-dashboard?tab=${id}`;
    window.history.replaceState({}, "", url);
    window.scrollTo({ top: 0 });
  };
  const onSummary = useCallback((s) => setToday(s), []);
  const onReschedCount = useCallback((n) => setBadges((b) => ({ ...b, reschedules: n })), []);
  const onReviewsSeen = useCallback(() => {
    setBadges((b) => ({ ...b, reviews: 0 }));
    try { localStorage.setItem("headzup_review_badge", "0"); } catch {}
  }, []);

  if (loading) {
    return (
      <>
        <AppHeader title="Barber dashboard" signOutTo="/barber-login" />
        <div className="studio" aria-busy="true">
          <aside className="studio-side"><Skeleton h={120} /><Skeleton h={360} style={{ marginTop: 16 }} /></aside>
          <main className="studio-main"><Skeleton h={50} w="40%" /><Skeleton h={90} style={{ marginTop: 20 }} /><Skeleton h={300} style={{ marginTop: 16 }} /></main>
        </div>
      </>
    );
  }

  const first = barber?.name?.split(" ")[0] || "there";
  const badgeFor = (id) => (id === "reviews" ? badges.reviews : id === "reschedules" ? badges.reschedules : 0);

  return (
    <>
      <AppHeader title="Barber dashboard" signOutTo="/barber-login" />
      <nav className="studio-strip" aria-label="Dashboard sections">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={`strip-btn ${tab === id ? "is-on" : ""}`} aria-current={tab === id ? "page" : undefined} onClick={() => go(id)}>
            <Icon size={18} /> {label}{badgeFor(id) > 0 && <span className="count">{badgeFor(id)}</span>}
          </button>
        ))}
      </nav>
      <div className="studio">
        <aside className="studio-side" aria-label="Dashboard">
          <div className="side-card">
            <p className="h4">Hey, {first}.</p>
            <dl className="side-stats">
              <div><dt>Booked today</dt><dd>{today.total ?? "–"}</dd></div>
              <div><dt>Paid online</dt><dd>{today.paid_online ?? "–"}</dd></div>
              <div><dt>Online revenue</dt><dd>{today.online_revenue != null ? money(today.online_revenue) : "–"}</dd></div>
            </dl>
          </div>
          <nav className="side-nav" aria-label="Dashboard sections">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} className={`side-link ${tab === id ? "is-on" : ""}`} aria-current={tab === id ? "page" : undefined} onClick={() => go(id)}>
                <Icon size={18} /> <span className="grow">{label}</span>
                {badgeFor(id) > 0 && <span className="count" aria-label={`${badgeFor(id)} new`}>{badgeFor(id)}</span>}
              </button>
            ))}
          </nav>
          <a href="/admin-stats" className="side-link" style={{ marginTop: 6 }}><IconChart size={18} /> <span className="grow">Whole-shop overview</span></a>
          <div style={{ marginTop: 18 }}><ThemeToggle /></div>
        </aside>

        <main id="main" className="studio-main fade-in" key={tab}>
          {tab === "schedule" && <ScheduleTab toast={toast} onSummary={onSummary} />}
          {tab === "walkin" && <WalkInTab services={services} toast={toast} />}
          {tab === "reschedules" && <ReschedulesTab toast={toast} onCount={onReschedCount} />}
          {tab === "clients" && <ClientsTab toast={toast} />}
          {tab === "reviews" && <ReviewsTab toast={toast} onSeen={onReviewsSeen} />}
          {tab === "hours" && <HoursTab toast={toast} />}
          {tab === "news" && <NewsTab toast={toast} />}
          {tab === "payments" && <PaymentsTab goStripe={() => go("stripe")} />}
          {tab === "reports" && <ReportsTab />}
          {tab === "stripe" && <StripeTab toast={toast} />}
          {tab === "profile" && <ProfileTab barber={barber} setBarber={setBarber} toast={toast} />}
        </main>
      </div>
      {toastHost}
    </>
  );
}

export default function BarberDashboard() {
  return <Suspense fallback={null}><Studio /></Suspense>;
}
