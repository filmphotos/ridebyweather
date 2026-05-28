import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import AirQualityClient from "./AirQualityClient";

export const metadata: Metadata = {
  title: "Air Quality — RideByWeather",
  description: "Live US AQI, PM2.5, ozone, and wildfire-smoke awareness for your ride.",
};

export default async function AirQualityPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/air-quality");
  return <AirQualityClient />;
}
