"use client";
// A quiet header for task pages (booking, sign-in, confirmations): the shop
// sign, what you're doing, and one way out.
import { ShopSign } from "./SiteNav";
import { IconArrowLeft } from "@/components/ui/Feedback";

export default function FlowHeader({ title, backHref = "/", backLabel = "Home", right = null, transparent = false }) {
  return (
    <header className={`nav is-app ${transparent ? "flow-clear" : ""}`}>
      <div className="wrap nav-inner">
        <ShopSign />
        {title && <p className="flow-title">{title}</p>}
        <div className="nav-end">
          {right}
          {backHref && (
            <a href={backHref} className="btn btn-quiet btn-sm">
              <IconArrowLeft size={16} /> {backLabel}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
