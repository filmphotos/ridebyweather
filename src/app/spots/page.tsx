import type { Metadata } from "next";
import SpotsClient from "./SpotsClient";

export const metadata: Metadata = {
  title: "Where Should I Ride? — RideByWeather",
  description:
    "Save your favorite ride locations and get a daily ranked best-window scan across all of them. Pro feature.",
};

export default function SpotsPage() {
  return <SpotsClient />;
}
