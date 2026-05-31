import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import StreaksClient from "./StreaksClient";

export const metadata: Metadata = {
  title: "Streaks & Achievements — RideByWeather",
  description: "Track your riding streak and weather-class achievements.",
};

export default async function StreaksPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/streaks");
  return <StreaksClient />;
}
