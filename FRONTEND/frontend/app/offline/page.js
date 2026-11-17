"use client";
// Served by the service worker when there's no connection.
import { useEffect } from "react";
import { ShopSign } from "@/components/site/SiteNav";
import { SHOP } from "@/lib/shop";

export default function OfflinePage() {
  useEffect(() => {
    const back = () => window.location.reload();
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, []);
  return (
    <div className="fade-page">
      <div className="fade-edge fade-page-edge" aria-hidden="true" />
      <main id="main" className="nf-wrap">
        <ShopSign />
        <div className="panel panel-pad mt-8 nf-card">
          <h1 className="h2">You&apos;re offline.</h1>
          <p className="muted mt-3">
            The shop&apos;s book needs a connection. This page reloads by itself when you&apos;re back online.
          </p>
          <button className="btn btn-primary btn-lg btn-block mt-5" onClick={() => window.location.reload()}>
            Try again
          </button>
          <a className="btn btn-quiet btn-block mt-2" href={`tel:${SHOP.phone}`}>
            Call {SHOP.phoneDisplay}
          </a>
        </div>
      </main>
    </div>
  );
}
