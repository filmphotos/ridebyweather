import type { Metadata } from "next";
import GroupRideDetailClient from "./GroupRideDetailClient";

export const metadata: Metadata = {
  title: "Group Ride",
};

export default async function GroupRideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GroupRideDetailClient id={id} />;
}
