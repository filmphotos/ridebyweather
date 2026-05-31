import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import ClosuresClient from "./ClosuresClient";

export const metadata: Metadata = {
  title: "Bike Lane Closures — RideByWeather",
  description: "Current bike lane and multi-use trail closures by city.",
};

export default async function ClosuresPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/closures");
  return <ClosuresClient />;
}
