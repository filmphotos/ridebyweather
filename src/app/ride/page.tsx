import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import LiveRide from "./LiveRide";

export const metadata: Metadata = {
  title: "Live Ride — Bike Computer",
  description:
    "Turn your phone into a Garmin-style bike computer with live speed, distance, elevation, route map, and wind-aware weather.",
};

export default async function RidePage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/ride");

  return <LiveRide />;
}
