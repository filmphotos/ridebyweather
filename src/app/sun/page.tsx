import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import SunClient from "./SunClient";

export const metadata: Metadata = {
  title: "Sun & UV Planner — RideByWeather",
  description: "UV index, sunrise/sunset, daylight window, and golden-hour planning for cyclists.",
};

export default async function SunPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/sun");
  return <SunClient />;
}
