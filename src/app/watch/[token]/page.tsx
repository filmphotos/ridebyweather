import type { Metadata } from "next";
import WatchClient from "./WatchClient";

export const metadata: Metadata = {
  title: "Live ride — RideByWeather",
  robots: { index: false, follow: false },
};

export default async function WatchPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <WatchClient token={token} />;
}
