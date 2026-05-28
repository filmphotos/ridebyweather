import type { Metadata } from "next";
import ForecastClient from "./ForecastClient";

export const metadata: Metadata = {
  title: "Hourly Forecast — RideByWeather",
  description:
    "48 hours of Ride Score plotted as a color-coded timeline. Spot the gap between storms or the quiet evening lull and find your ride window.",
};

export default function ForecastPage() {
  return <ForecastClient />;
}
