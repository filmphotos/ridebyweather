import { Suspense } from "react";
import type { Metadata } from "next";
import DeviceLink from "@/components/DeviceLink";

export const metadata: Metadata = { title: "Connect a device — RideByWeather" };

export default function LinkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DeviceLink />
    </Suspense>
  );
}
