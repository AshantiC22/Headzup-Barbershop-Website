"use client";
import { ThemeProvider } from "./ThemeProvider";
import { AlertsProvider } from "./Alerts";
import { ShopHoursProvider } from "./ShopHours";
import ServiceWorker from "./ServiceWorker";

export default function ClientProviders({ shopHours, children }) {
  return (
    <ThemeProvider>
      <ShopHoursProvider initial={shopHours}>
        <AlertsProvider>{children}</AlertsProvider>
      </ShopHoursProvider>
      <ServiceWorker />
    </ThemeProvider>
  );
}
