"use client";

import { useCallback, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";

interface PollenData {
  level: string;
  color: string;
  advice: string;
  peakGrains: number;
  breakdown: { grass: number; tree: number; weed: number; birch: number; ragweed: number; alder: number };
}

const TYPE_LABELS: Record<keyof PollenData["breakdown"], string> = {
  grass: "Grass",
  tree: "Tree",
  weed: "Weed",
  birch: "Birch",
  ragweed: "Ragweed",
  alder: "Alder",
};

export default function PollenClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [data, setData] = useState<PollenData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pollen?lat=${loc.lat}&lng=${loc.lng}`);
      if (!res.ok) throw new Error("Failed to load pollen data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = useCallback(
    (loc: PickedLocation) => {
      setLocation(loc);
      load(loc);
    },
    [load]
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pollen Index</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Grass, tree, weed, and ragweed counts. The Ride Score doesn&apos;t capture pollen —
            this does.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}
      {loading && <div className="card h-48 animate-pulse bg-gray-800" />}

      {!loading && data && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Today&apos;s pollen</h2>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-4" style={{ borderColor: data.color }}>
                <span className="text-3xl font-bold tabular-nums" style={{ color: data.color }}>{data.peakGrains}</span>
                <span className="text-[10px] uppercase text-gray-500">grains/m³</span>
              </div>
              <div>
                <div className="text-base font-bold uppercase tracking-wide" style={{ color: data.color }}>{data.level}</div>
                <p className="mt-1 text-sm text-gray-300">{data.advice}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">By pollen type</h2>
            <ul className="mt-3 space-y-2">
              {(Object.keys(data.breakdown) as Array<keyof PollenData["breakdown"]>).map((k) => {
                const v = data.breakdown[k];
                const pct = Math.min(100, Math.round((v / Math.max(1, data.peakGrains)) * 100));
                return (
                  <li key={k} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 w-20">{TYPE_LABELS[k]}</span>
                    <span className="flex items-center gap-2 flex-1 max-w-[60%]">
                      <span className="h-1.5 flex-1 rounded-full bg-gray-800 overflow-hidden">
                        <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: data.color }} />
                      </span>
                      <span className="text-xs tabular-nums text-gray-400 w-14 text-right">{v}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">🌼</div>
          <p className="text-gray-400">Pick a location to see today&apos;s pollen counts.</p>
        </div>
      )}
    </div>
  );
}
