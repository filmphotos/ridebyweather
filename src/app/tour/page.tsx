import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import TourClient from "./TourClient";

export const metadata: Metadata = {
  title: "Multi-Day Tour Planner — RideByWeather",
  description: "See a full week of Ride Scores across your route and pack for the worst day.",
};

export default async function TourPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/tour");
  return <TourClient />;
}
