import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare Two Locations — RideByWeather",
  description: "Side-by-side Ride Scores for any two cities. Settle where it's nicer to ride today.",
};

export default async function ComparePage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/compare");
  return <CompareClient />;
}
