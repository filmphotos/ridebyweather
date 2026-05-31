import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import MaintenanceClient from "./MaintenanceClient";

export const metadata: Metadata = {
  title: "Service Intervals — RideByWeather",
  description: "Track miles since your last drivetrain, brake, and tire service.",
};

export default async function MaintenancePage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/maintenance");
  return <MaintenanceClient />;
}
