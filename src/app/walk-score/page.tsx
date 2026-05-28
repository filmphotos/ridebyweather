import type { Metadata } from "next";
// Walking reuses the running score client — the underlying factors (heat index,
// humidity, precipitation, air quality) apply identically. We pass variant="walking"
// so the copy switches to walking.
import SportScoreClient from "../run-score/SportScoreClient";

export const metadata: Metadata = {
  title: "Walk Score — RideByWeather",
  description:
    "Your live 0–10 Walk Score: temperature, heat index, humidity, air quality, and precipitation weighted for walkers into one glanceable number.",
};

export default function WalkScorePage() {
  return <SportScoreClient variant="walking" />;
}
