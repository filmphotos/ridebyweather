import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import HazardsClient from "./HazardsClient";

export const metadata: Metadata = {
  title: "Hazard Pins — RideByWeather",
  description: "Track potholes, debris, and closures on your rides.",
};

export default async function HazardsPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/hazards");
  return <HazardsClient />;
}
