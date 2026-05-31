import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import ReferralsClient from "./ReferralsClient";

export const metadata: Metadata = {
  title: "Referrals — RideByWeather",
  description: "Invite a friend, both get a free Pro month.",
};

export default async function ReferralsPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/referrals");
  return <ReferralsClient userId={payload.userId} />;
}
