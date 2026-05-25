import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import RunningDashboard from "./RunningDashboard";

export const metadata: Metadata = {
  title: "Running — RideByWeather",
  description: "Run Score combining temperature, heat index, humidity, air quality, and precipitation into one actionable number for runners.",
};

export default async function RunningPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/running");

  return <RunningDashboard />;
}
