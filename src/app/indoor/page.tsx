import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import IndoorClient from "./IndoorClient";

export const metadata: Metadata = {
  title: "Indoor Fallback — RideByWeather",
  description: "When the score crashes, pick the right indoor workout instead.",
};

export default async function IndoorPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/indoor");
  return <IndoorClient />;
}
