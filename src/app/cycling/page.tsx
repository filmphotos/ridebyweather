import type { Metadata } from "next";
import CyclingDashboard from "./CyclingDashboard";

export const metadata: Metadata = {
  title: "Cycling Weather — Ride Score & Wind Routing",
  description:
    "Get your personalized Ride Score, wind-aware routing, and gear recommendations for cycling.",
};

export default function CyclingPage() {
  return <CyclingDashboard />;
}
