import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import PollenClient from "./PollenClient";

export const metadata: Metadata = {
  title: "Pollen Index — RideByWeather",
  description: "Grass, tree, weed, ragweed, birch, and alder pollen counts for your ride.",
};

export default async function PollenPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/pollen");
  return <PollenClient />;
}
