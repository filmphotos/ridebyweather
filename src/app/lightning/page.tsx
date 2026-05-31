import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import LightningClient from "./LightningClient";

export const metadata: Metadata = {
  title: "Lightning Map — RideByWeather",
  description: "Storm-cell distance and lightning safety advisory.",
};

export default async function LightningPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/lightning");
  return <LightningClient />;
}
