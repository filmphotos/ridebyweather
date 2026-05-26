import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import LiveRide from "./LiveRide";

export const metadata: Metadata = {
  title: "Live Activity — Bike / Run / Walk Computer",
  description:
    "Turn your phone into a Garmin-style activity computer with live speed, distance, elevation, route map, and wind-aware weather for cycling, running, or walking.",
};

export default async function RidePage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/ride");

  return (
    <Suspense fallback={
      <div className="mx-auto max-w-5xl px-3 py-6 text-sm text-gray-500">Loading activity…</div>
    }>
      <LiveRide />
    </Suspense>
  );
}
