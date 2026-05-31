import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import CommuteClient from "./CommuteClient";

export const metadata: Metadata = {
  title: "Commute Mode — RideByWeather",
  description: "Morning and evening commute forecasts in one card, with delta.",
};

export default async function CommutePage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/commute");
  return <CommuteClient />;
}
