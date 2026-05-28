import type { Metadata } from "next";
// Walking reuses the running stores client with variant="walking".
import SportStoresClient from "../run-stores/SportStoresClient";

export const metadata: Metadata = {
  title: "Walking Stores & Stops — RideByWeather",
  description:
    "Find specialty stores, gyms, water, and rest stops near your route or current location for walks.",
};

export default function WalkStoresPage() {
  return <SportStoresClient variant="walking" />;
}
