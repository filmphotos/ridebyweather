import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import FamilyClient from "./FamilyClient";

export const metadata: Metadata = {
  title: "Family Mode — RideByWeather",
  description: "Kid- and trailer-friendly riding/walking verdict.",
};

export default async function FamilyPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/family");
  return <FamilyClient />;
}
