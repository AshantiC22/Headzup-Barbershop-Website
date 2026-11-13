"use client";
import { ThemeProvider } from "./ThemeProvider";
import { AlertsProvider } from "./Alerts";
import ServiceWorker from "./ServiceWorker";

export default function ClientProviders({ children }) {
  return (
    <ThemeProvider>
      <AlertsProvider>{children}</AlertsProvider>
      <ServiceWorker />
    </ThemeProvider>
  );
}
