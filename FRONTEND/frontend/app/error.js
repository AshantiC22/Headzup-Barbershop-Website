"use client";
// When a page throws while rendering. The nav and footer belong to the page,
// so this stands on its own: what happened, and two ways forward.
import { useEffect } from "react";
import Link from "next/link";
import { ShopSign } from "@/components/site/SiteNav";
import { IconPhone, IconRefresh } from "@/components/ui/Feedback";
import { SHOP } from "@/lib/shop";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="fade-page">
      <div className="fade-edge fade-page-edge" aria-hidden="true" />
      <main id="main" className="nf-wrap">
        <ShopSign />
        <div className="panel panel-pad mt-8 nf-card">
          <h1 className="h2">This page hit a snag.</h1>
          <p className="muted mt-3">
            Something on it broke while loading. Nothing you entered was sent. Try it again; if it keeps happening, call
            the shop and they&apos;ll book you over the phone.
          </p>
          <button type="button" className="btn btn-primary btn-lg btn-block mt-5" onClick={() => reset()}>
            <IconRefresh /> Try again
          </button>
          <a className="btn btn-ghost btn-block mt-3" href={`tel:${SHOP.phone}`}>
            <IconPhone /> {SHOP.phoneDisplay}
          </a>
          <Link className="btn btn-quiet btn-block mt-2" href="/">
            Go to the home page
          </Link>
        </div>
        {error?.digest && <p className="tiny faint mt-4">Error code {error.digest}</p>}
      </main>
    </div>
  );
}
