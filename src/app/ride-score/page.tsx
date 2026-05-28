import type { Metadata } from "next";
import RideScoreClient from "./RideScoreClient";

export const metadata: Metadata = {
  title: "Ride Score — RideByWeather",
  description:
    "Your live 0–10 Ride Score: six weather factors weighted into one glanceable number that tells you whether today is a ride day.",
};

export default function RideScorePage() {
  return <RideScoreClient />;
}
