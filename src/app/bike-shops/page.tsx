import type { Metadata } from "next";
import BikeShopsClient from "./BikeShopsClient";

export const metadata: Metadata = {
  title: "Bike Shops & Partners — RideByWeather",
  description:
    "Find bike shops, cafés, water, and rest stops near your route or current location. Mechanics, coffee, and partners on the map.",
};

export default function BikeShopsPage() {
  return <BikeShopsClient />;
}
