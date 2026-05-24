import type { Metadata } from "next";
import RunningDashboard from "./RunningDashboard";

export const metadata: Metadata = {
  title: "Running — RideByWeather",
  description: "Run Score combining temperature, heat index, humidity, air quality, and precipitation into one actionable number for runners.",
};

export default function RunningPage() {
  return <RunningDashboard />;
}
