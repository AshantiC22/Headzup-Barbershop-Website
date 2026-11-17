"use client";
// No page at this address.
import Link from "next/link";
import { ShopSign } from "@/components/site/SiteNav";
import Wordmark from "@/components/site/Wordmark";

export default function NotFound() {
  return (
    <div className="fade-page">
      <div className="fade-edge fade-page-edge" aria-hidden="true" />
      <main id="main" className="nf-wrap">
        <ShopSign />
        <Wordmark text="404" label="Error 404" className="nf-mark mt-8" />
        <h1 className="h2 mt-6">Missed a spot.</h1>
        <p className="lede mt-3">
          There&apos;s no page at this address. The link may be old or mistyped; everything else is where you left it.
        </p>
        <div className="row-wrap mt-6 nf-actions">
          <Link href="/" className="btn btn-primary btn-lg">
            Go to the home page
          </Link>
          <Link href="/book" className="btn btn-ghost btn-lg">
            Book a cut
          </Link>
        </div>
      </main>
    </div>
  );
}
