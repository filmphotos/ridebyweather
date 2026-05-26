import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
// Walking reuses the running dashboard — the underlying Run Score factors (heat index,
// humidity, precipitation, air quality) apply identically to walking. We just pass
// variant="walking" so the UI copy and Start button switch to the walking sport.
import RunningDashboard from "../running/RunningDashboard";

export const metadata: Metadata = {
  title: "Walking — RideByWeather",
  description: "Walk Score combining temperature, heat index, humidity, air quality, and precipitation into one actionable number for walkers.",
};

export default async function WalkingPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/walking");

  return <RunningDashboard variant="walking" />;
}
