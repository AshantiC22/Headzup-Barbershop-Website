"use client";
// A headstone for the page that isn't there.
import Link from "next/link";
import PaintedSky from "@/components/art/PaintedSky";
import { ShopSign } from "@/components/site/SiteNav";

export default function NotFound() {
  return (
    <div className="sky-page">
      <PaintedSky seed={404} />
      <main id="main" className="sky-content nf-wrap">
        <ShopSign />
        <div className="nf-stone mt-8" aria-hidden="true">
          <p className="carved">Here lies a page</p>
          <p className="carved-sm">It never was. Mourn briefly, then carry on.</p>
        </div>
        <h1 className="h2 mt-7">This page isn&apos;t here.</h1>
        <p className="lede mt-3 center">The link may be old or mistyped. Everything else is where you left it.</p>
        <div className="row-wrap mt-6 nf-actions">
          <Link href="/" className="btn btn-primary btn-lg">
            Go to the home page
          </Link>
          <Link href="/book" className="btn btn-ghost btn-lg nf-ghost">
            Book a cut
          </Link>
        </div>
      </main>
    </div>
  );
}
