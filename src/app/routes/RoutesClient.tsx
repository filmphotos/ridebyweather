"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";

const RouteMap = dynamic(() => import("@/components/RouteMap/RouteMap"), { ssr: false });

interface Wind {
  windDirDeg: number;
  windSpeedMph: number;
}

export default function RoutesClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [wind, setWind] = useState<Wind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWind = useCallback(async (loc: PickedLocation) => {
    setError(null);
    try {
      const res = await fetch(`/api/ride-score?lat=${loc.lat}&lng=${loc.lng}`);
      if (!res.ok) throw new Error("Failed to fetch wind");
      const data = await res.json();
      setWind({ windDirDeg: data.weather.windDirDeg, windSpeedMph: data.weather.windSpeedMph });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, []);

  const handleSelect = useCallback(
    (loc: PickedLocation) => {
      setLocation(loc);
      setWind(null);
      fetchWind(loc);
    },
    [fetchWind]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Route &amp; Wind Planner</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Build smarter, not harder. Draw a route and see headwind / tailwind / crosswind per
            segment against live wind, plus elevation and gradient.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}

      {location && wind ? (
        <RouteMap
          lat={location.lat}
          lng={location.lng}
          windDirDeg={wind.windDirDeg}
          windSpeedMph={wind.windSpeedMph}
        />
      ) : location ? (
        <div className="card h-96 animate-pulse bg-gray-800" />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">🗺️</div>
          <p className="text-gray-400">Allow location or search a city to plan a wind-aware route.</p>
        </div>
      )}
    </div>
  );
}
