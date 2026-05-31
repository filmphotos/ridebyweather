import type { Metadata } from "next";
// Walking reuses the running stores client with variant="walking".
import SportStoresClient from "../run-stores/SportStoresClient";

export const metadata: Metadata = {
  title: "Walking Shoe Stores — RideByWeather",
  description:
    "Find specialty walking and athletic shoe stores near you — fitting, gait analysis, and the right shoes for daily walks.",
};

export default function WalkStoresPage() {
  return <SportStoresClient variant="walking" />;
}
