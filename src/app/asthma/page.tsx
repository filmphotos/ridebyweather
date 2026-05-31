import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import AsthmaClient from "./AsthmaClient";

export const metadata: Metadata = {
  title: "Sensitive Lungs Mode — RideByWeather",
  description: "Asthma-aware ride safety verdict from AQI, humidity, cold-air, and pollen.",
};

export default async function AsthmaPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/asthma");
  return <AsthmaClient />;
}
