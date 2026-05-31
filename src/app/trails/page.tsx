import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import TrailsClient from "./TrailsClient";

export const metadata: Metadata = {
  title: "Bike Trails — RideByWeather",
  description:
    "Find named cycle routes, rail-trails, greenways, and mountain bike tracks near any location. Length, surface, and difficulty from OpenStreetMap.",
};

export default async function TrailsPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/trails");

  return <TrailsClient />;
}
