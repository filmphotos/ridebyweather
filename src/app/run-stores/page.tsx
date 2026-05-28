import type { Metadata } from "next";
import SportStoresClient from "./SportStoresClient";

export const metadata: Metadata = {
  title: "Running Stores & Stops — RideByWeather",
  description:
    "Find running specialty stores, gyms, water, and rest stops near your route or current location.",
};

export default function RunStoresPage() {
  return <SportStoresClient variant="running" />;
}
