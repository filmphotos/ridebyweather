import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import StravaClient from "./StravaClient";

export const metadata: Metadata = {
  title: "Connect Strava — RideByWeather",
  description: "Import your Strava history to personalize your Ride Score thresholds.",
};

export default async function StravaPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/strava");

  const clientId = process.env.STRAVA_CLIENT_ID ?? "";
  const enabled = clientId.length > 0;
  return <StravaClient enabled={enabled} clientId={clientId} />;
}
