import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import OnThisDayClient from "./OnThisDayClient";

export const metadata: Metadata = {
  title: "On This Day — RideByWeather",
  description: "Today's weather across the last 5 years at your location.",
};

export default async function OnThisDayPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/on-this-day");
  return <OnThisDayClient />;
}
