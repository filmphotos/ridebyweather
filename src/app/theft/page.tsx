import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import TheftClient from "./TheftClient";

export const metadata: Metadata = {
  title: "Bike Theft Hotspots — RideByWeather",
  description: "Neighborhood-level bike theft risk index for major US cycling cities.",
};

export default async function TheftPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/theft");
  return <TheftClient />;
}
