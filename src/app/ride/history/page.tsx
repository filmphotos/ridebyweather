import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import RideHistory from "./RideHistory";

export const metadata: Metadata = {
  title: "Ride History",
};

export default async function RideHistoryPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/ride/history");

  return <RideHistory />;
}
