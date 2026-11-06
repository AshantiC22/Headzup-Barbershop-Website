"use client";
// Magritte's "The Human Condition": an empty gilt frame that shows exactly the
// sky behind it. A page that isn't there, framed.
import Link from "next/link";
import PaintedSky from "@/components/art/PaintedSky";
import { ShopSign } from "@/components/site/SiteNav";

export default function NotFound() {
  return (
    <div className="sky-page">
      <PaintedSky seed={404} />
      <main id="main" className="sky-content nf-wrap">
        <ShopSign />
        <div className="frame nf-frame" aria-hidden="true"><div className="nf-window" /></div>
        <p className="nf-caption">Ceci n&apos;est pas une page.</p>
        <h1 className="h2" style={{ marginTop: 10 }}>This page isn&apos;t here.</h1>
        <p className="lede" style={{ marginTop: 10, textAlign: "center" }}>
          The link may be old or mistyped. Everything else is where you left it.
        </p>
        <div className="row-wrap" style={{ justifyContent: "center", marginTop: 22 }}>
          <Link href="/" className="btn btn-primary btn-lg">Go to the home page</Link>
          <a href="/book" className="btn btn-ghost btn-lg nf-ghost">Book a cut</a>
        </div>
      </main>
    </div>
  );
}
