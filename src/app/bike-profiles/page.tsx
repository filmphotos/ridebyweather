import type { Metadata } from "next";
import BikeProfilesClient from "./BikeProfilesClient";

export const metadata: Metadata = {
  title: "Bike Type Profiles — RideByWeather",
  description:
    "Road, gravel, MTB, commuter, or e-bike — each retunes the Ride Score. Road bikes hate crosswinds; gravel shrugs them off; e-bikes care about cold.",
};

export default function BikeProfilesPage() {
  return <BikeProfilesClient />;
}
