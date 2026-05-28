import type { Metadata } from "next";
import RoutesClient from "./RoutesClient";

export const metadata: Metadata = {
  title: "Route & Wind Planner — RideByWeather",
  description:
    "Draw a route and see headwind, tailwind, and crosswind segment-by-segment against live wind, plus elevation and gradient before you commit.",
};

export default function RoutesPage() {
  return <RoutesClient />;
}
