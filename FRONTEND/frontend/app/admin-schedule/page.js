"use client";
// The old shop-wide calendar called admin/schedule/ and admin/appointments/,
// which the API never had. Each barber's day lives in the barber dashboard,
// and the shop-wide numbers live in the shop overview, so send people there.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminSchedulePage() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin-stats"); }, [router]);
  return null;
}
