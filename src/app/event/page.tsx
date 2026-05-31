import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import EventClient from "./EventClient";

export const metadata: Metadata = {
  title: "Event Countdown — RideByWeather",
  description: "Pin a race or event date and track the forecast trajectory toward it.",
};

export default async function EventPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/event");
  return <EventClient />;
}
