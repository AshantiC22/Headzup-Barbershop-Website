"use client";
import dynamic from "next/dynamic";

const NotificationProvider = dynamic(
  () => import("./NotificationSystem"),
  { ssr: false }
);

export default function ClientProviders({ children }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
