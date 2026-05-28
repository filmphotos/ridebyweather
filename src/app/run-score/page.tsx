import type { Metadata } from "next";
import SportScoreClient from "./SportScoreClient";

export const metadata: Metadata = {
  title: "Run Score — RideByWeather",
  description:
    "Your live 0–10 Run Score: temperature, heat index, humidity, air quality, and precipitation weighted for runners into one glanceable number.",
};

export default function RunScorePage() {
  return <SportScoreClient variant="running" />;
}
