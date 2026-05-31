"use client";

import { useCallback, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import NearbyPartners from "@/components/Partners/NearbyPartners";

export default function SportStoresClient({ variant }: { variant: "running" | "walking" }) {
  const isWalking = variant === "walking";
  const [location, setLocation] = useState<PickedLocation | null>(null);

  const handleSelect = useCallback((loc: PickedLocation) => {
    setLocation(loc);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isWalking ? "Walking" : "Running"} Shoe Stores
          </h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Specialty running and athletic shoe stores near you — gait analysis, fitting,
            and the right shoes for the road or trail.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {location ? (
        // Walking shares the running partner set (specialty stores serve both).
        <NearbyPartners lat={location.lat} lng={location.lng} sport="running" extras={false} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">{isWalking ? "🚶" : "🏃"}</div>
          <p className="text-gray-400">Allow location or search a city to find nearby stores and stops.</p>
        </div>
      )}
    </div>
  );
}
