import type { Metadata } from "next";
import GroupRidesClient from "./GroupRidesClient";

export const metadata: Metadata = {
  title: "Group Rides",
  description: "Find and join group rides — weather-aware meetups for cyclists and runners.",
};

export default function GroupRidesPage() {
  return <GroupRidesClient />;
}
