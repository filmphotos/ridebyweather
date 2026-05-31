import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import EbikeRangeClient from "./EbikeRangeClient";

export const metadata: Metadata = {
  title: "E-Bike Range Calculator — RideByWeather",
  description: "Real-world e-bike range under today's wind, temperature, and elevation.",
};

export default async function EbikeRangePage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/ebike-range");
  return <EbikeRangeClient />;
}
