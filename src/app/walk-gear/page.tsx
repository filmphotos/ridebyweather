import type { Metadata } from "next";
// Walking reuses the running gear client with variant="walking".
import SportGearClient from "../run-gear/SportGearClient";

export const metadata: Metadata = {
  title: "Walking Gear — RideByWeather",
  description:
    "A weather-driven avatar shows exactly what to wear for your walk — layers, accessories, and sun protection for current conditions.",
};

export default function WalkGearPage() {
  return <SportGearClient variant="walking" />;
}
