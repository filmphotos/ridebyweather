import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import ChainLubeClient from "./ChainLubeClient";

export const metadata: Metadata = {
  title: "Chain Lube Selector — RideByWeather",
  description: "Wet, dry, or ceramic? We pick the right chain lube for the week ahead.",
};

export default async function ChainLubePage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/chain-lube");
  return <ChainLubeClient />;
}
