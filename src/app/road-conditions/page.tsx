import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import RoadConditionsClient from "./RoadConditionsClient";

export const metadata: Metadata = {
  title: "Road Conditions — RideByWeather",
  description: "Wet pavement, frost, and ice risk for the next 12 hours.",
};

export default async function RoadConditionsPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/road-conditions");
  return <RoadConditionsClient />;
}
