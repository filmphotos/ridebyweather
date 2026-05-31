"use client";

import { useCallback, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import NearbyPartners from "@/components/Partners/NearbyPartners";

export default function BikeShopsClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);

  const handleSelect = useCallback((loc: PickedLocation) => {
    setLocation(loc);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bike Shops &amp; Partners</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Mechanics, coffee, and water — on the route. Find bike shops, cafés, and rest stops near
            you, with partner listings highlighted.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {location ? (
        <NearbyPartners lat={location.lat} lng={location.lng} sport="cycling" extras={false} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">🏪</div>
          <p className="text-gray-400">Allow location or search a city to find nearby shops and stops.</p>
        </div>
      )}
    </div>
  );
}
