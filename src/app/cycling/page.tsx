import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import CyclingDashboard from "./CyclingDashboard";

export const metadata: Metadata = {
  title: "Cycling Weather — Ride Score & Wind Routing",
  description:
    "Get your personalized Ride Score, wind-aware routing, and gear recommendations for cycling.",
};

export default async function CyclingPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/cycling");

  return <CyclingDashboard />;
}
