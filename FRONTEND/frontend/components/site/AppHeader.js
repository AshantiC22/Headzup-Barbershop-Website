"use client";
// Header for signed-in areas (client and barber dashboards).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { ShopSign } from "./SiteNav";
import { IconHome, IconLogout } from "@/components/ui/Feedback";

export default function AppHeader({ title, children, signOutTo = "/login", leading = null }) {
  const router = useRouter();
  const signOut = () => { clearSession(); router.replace(signOutTo); };
  return (
    <header className="nav is-app">
      <div className="wrap nav-inner" style={{ maxWidth: 1280 }}>
        {leading}
        <ShopSign />
        {title && <p className="flow-title">{title}</p>}
        <div className="nav-end">
          {children}
          <Link href="/" className="btn btn-quiet btn-sm hide-xs" aria-label="Home page"><IconHome size={18} /><span className="hide-sm">Home</span></Link>
          <button className="btn btn-quiet btn-sm" onClick={signOut} aria-label="Sign out">
            <IconLogout size={18} /><span className="hide-sm">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
