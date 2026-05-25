import type { Metadata } from "next";
import NewGroupRideClient from "./NewGroupRideClient";

export const metadata: Metadata = {
  title: "Create a Group Ride",
};

export default function NewGroupRidePage() {
  return <NewGroupRideClient />;
}
