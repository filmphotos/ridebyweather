import type { Metadata } from "next";
import GearClient from "./GearClient";

export const metadata: Metadata = {
  title: "Gear Recommendations — RideByWeather",
  description:
    "A weather-driven avatar shows exactly what to wear — base layers, gloves, eyewear, and shoes — for current conditions at your location.",
};

export default function GearPage() {
  return <GearClient />;
}
