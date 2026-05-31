import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import TirePressureClient from "./TirePressureClient";

export const metadata: Metadata = {
  title: "Tire Pressure Calculator — RideByWeather",
  description: "Optimal front/rear tire pressure for your weight, tire width, and surface.",
};

export default async function TirePressurePage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/tire-pressure");
  return <TirePressureClient />;
}
