import type { Metadata } from "next";
import SportStoresClient from "./SportStoresClient";

export const metadata: Metadata = {
  title: "Running Shoe Stores — RideByWeather",
  description:
    "Find specialty running shoe stores near you — gait analysis, fitting, and the right shoes for road or trail.",
};

export default function RunStoresPage() {
  return <SportStoresClient variant="running" />;
}
