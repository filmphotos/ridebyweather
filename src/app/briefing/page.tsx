import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import BriefingClient from "./BriefingClient";

export const metadata: Metadata = {
  title: "Morning Briefing — RideByWeather",
  description: "Listen to a 20-second forecast briefing. Share it as a card.",
};

export default async function BriefingPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/briefing");
  return <BriefingClient />;
}
