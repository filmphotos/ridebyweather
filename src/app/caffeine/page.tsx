import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import CaffeineClient from "./CaffeineClient";

export const metadata: Metadata = {
  title: "Caffeine Timing — RideByWeather",
  description: "When to take your coffee or gel for peak performance at the start of your ride.",
};

export default async function CaffeinePage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/caffeine");
  return <CaffeineClient />;
}
