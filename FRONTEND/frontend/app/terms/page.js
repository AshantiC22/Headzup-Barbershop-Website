"use client";
// Terms and privacy. Written to be read, not clicked through: one page, plain
// headings, a table of contents.
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { ADDRESS_LINE, SHOP } from "@/lib/shop";

const TERMS = [
  { id: "appointments", title: "Appointments", items: [
    "Book through this site, by phone, or walk in when a chair is free. Walk-ins are taken as time allows.",
    "Your booked time is held for 15 minutes. After that the barber may give the chair to someone else.",
    "You need an account to book online, and you're responsible for keeping your login to yourself.",
  ]},
  { id: "cancellations", title: "Cancelling and rescheduling", items: [
    "Cancel or ask to reschedule from My appointments up to 2 hours before your time.",
    "Inside 2 hours, call the shop. Late cancellations and missed appointments can add a strike to your account.",
    "Reschedule requests go to your barber to approve. Your original time stands until they do.",
    "The shop may cancel an appointment for an emergency or anything outside its control; you'll be told by text or email.",
  ]},
  { id: "payments", title: "Payments and deposits", items: [
    "Pay at the shop with cash or card, or hold your time online with a deposit. Card payments are handled by Stripe; the shop never sees or stores your card number.",
    "A deposit comes off your service price. The rest is paid in the chair.",
    "Deposits aren't refunded if you cancel or miss your appointment. Other refunds are handled case by case; contact the shop.",
    "With more than one strike on your account, your next online deposit goes up by $1.50 for each extra strike.",
    "Prices are in US dollars. The price shown when you book is the price you pay.",
  ]},
  { id: "texts", title: "Text messages", items: [
    "If you give us a mobile number, we text booking confirmations, reminders, cut-complete and review messages, and cancellation or reschedule notices.",
    "Message frequency varies. Message and data rates may apply. Carriers are not liable for delayed or undelivered messages.",
    "Reply STOP to stop all texts. Reply HELP for help, or email " + SHOP.email + ".",
  ]},
  { id: "conduct", title: "In the shop", items: [
    "We can refuse service where the law allows.",
    "Treat the barbers and other clients with respect. Disruptive behavior can end an appointment and close an account.",
    "Children under 12 need an adult with them.",
  ]},
  { id: "accounts", title: "Your account", items: [
    "You're responsible for what happens under your login. If something looks wrong, tell us right away.",
    "Ask us to delete your account any time. We keep appointment history for business records.",
    "We can suspend accounts that break these terms.",
  ]},
  { id: "liability", title: "Limits", items: [
    "We aren't liable for indirect or consequential damages from using our services.",
    "Our total liability for any claim is limited to what you paid for that service.",
  ]},
];

const PRIVACY = [
  { id: "collect", title: "What we collect", items: [
    "Your username, email and phone number when you sign up.",
    "Your appointments: service, barber, date, time, notes and how you paid.",
    "Payment choice only. Card details go straight to Stripe.",
  ]},
  { id: "use", title: "How we use it", items: [
    "To run your appointments and send confirmations and reminders.",
    "To improve the booking site.",
    "We don't sell your information, and we don't use it for advertising.",
  ]},
  { id: "share", title: "Who sees it", items: [
    "Barbers at the shop see your appointment details so they can serve you.",
    "Stripe processes card payments under its own privacy policy. Our text-message provider delivers texts.",
    "Mobile numbers and text-message consent are never shared with third parties or affiliates for marketing.",
    "We'll disclose information if the law requires it.",
  ]},
  { id: "security", title: "Keeping it safe", items: [
    "Passwords are stored hashed, never in plain text.",
    "The site and its API run over HTTPS.",
    "We follow standard practices, but no system is perfectly secure.",
  ]},
  { id: "rights", title: "Your choices", items: [
    "Ask for a copy of your information, or ask us to delete it.",
    "Turn off texts any time by replying STOP.",
  ]},
];

function Block({ sections }) {
  return sections.map((s) => (
    <section key={s.id} id={s.id} aria-labelledby={`${s.id}-t`}>
      <h3 id={`${s.id}-t`} className="h4">{s.title}</h3>
      <ul>{s.items.map((t) => <li key={t}>{t}</li>)}</ul>
    </section>
  ));
}

export default function TermsPage() {
  return (
    <>
      <SiteNav />
      <main id="main" className="wrap-narrow page-pad legal">
        <h1 className="h1">Terms and privacy</h1>
        <p className="lede mt-3">
          The rules for booking with HEADZ UP Barbershop, and what we do with your information. Last updated November 2026.
        </p>
        <nav className="panel panel-pad mt-7" aria-label="On this page">
          <p className="label">On this page</p>
          <ul className="toc">
            {[...TERMS, ...PRIVACY].map((s) => <li key={s.id}><a className="link" href={`#${s.id}`}>{s.title}</a></li>)}
          </ul>
        </nav>

        <h2 className="h2">Terms of service</h2>
        <Block sections={TERMS} />

        <h2 className="h2">Privacy</h2>
        <Block sections={PRIVACY} />

        <h2 className="h3">Questions</h2>
        <p className="mt-3">
          HEADZ UP Barbershop, {ADDRESS_LINE}. Call <a className="link" href={`tel:${SHOP.phone}`}>{SHOP.phoneDisplay}</a> or
          email <a className="link" href={`mailto:${SHOP.email}`}>{SHOP.email}</a>. We may update these terms; big changes
          are sent to the email on your account, and using the site after a change means you accept it.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
