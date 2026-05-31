import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import BikeVsDriveClient from "./BikeVsDriveClient";

export const metadata: Metadata = {
  title: "Bike vs Drive — RideByWeather",
  description: "Money, calories, and CO₂ saved by riding instead of driving.",
};

export default async function BikeVsDrivePage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/bike-vs-drive");
  return <BikeVsDriveClient />;
}
