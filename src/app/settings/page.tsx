import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = { title: "Settings — RideByWeather" };

export default async function SettingsPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/settings");

  return <SettingsClient />;
}
