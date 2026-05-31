import type { Metadata } from "next";
import AskClient from "./AskClient";

export const metadata: Metadata = {
  title: "AI Ride Assistant — RideByWeather",
  description:
    "Ask anything about today's ride: what to wear, when to leave, where to go. Powered by Claude with your real forecast and saved spots.",
};

export default function AskPage() {
  return <AskClient />;
}
