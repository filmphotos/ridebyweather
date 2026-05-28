import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import HydrationClient from "./HydrationClient";

export const metadata: Metadata = {
  title: "Heat Index & Hydration Coach — RideByWeather",
  description: "Heat index, wet-bulb risk, and humidity-adjusted hydration targets for your ride.",
};

export default async function HydrationPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/hydration");
  return <HydrationClient />;
}
