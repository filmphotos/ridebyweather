import type { Metadata } from "next";
import SportGearClient from "./SportGearClient";

export const metadata: Metadata = {
  title: "Running Gear — RideByWeather",
  description:
    "A weather-driven avatar shows exactly what to wear for your run — layers, accessories, and sun protection for current conditions.",
};

export default function RunGearPage() {
  return <SportGearClient variant="running" />;
}
