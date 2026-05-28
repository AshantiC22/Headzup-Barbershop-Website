"use client";
import dynamic from "next/dynamic";
import { ThemeProvider } from "./ThemeProvider";

const NotificationProvider = dynamic(
  () => import("./NotificationSystem"),
  { ssr: false }
);

export default function ClientProviders({ children }) {
  return (
    <ThemeProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </ThemeProvider>
  );
}
