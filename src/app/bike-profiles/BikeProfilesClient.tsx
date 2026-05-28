"use client";

import { useCallback, useEffect, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import { BIKE_PROFILES, type BikeType } from "@/lib/bikeProfiles";

export default function BikeProfilesClient() {
  const [bike, setBike] = useState<BikeType>("road");
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [score, setScore] = useState<{ score: number; label: string; color: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("rbw_bike");
    if (saved && BIKE_PROFILES.some((b) => b.id === saved)) setBike(saved as BikeType);
  }, []);

  const fetchScore = useCallback(async (loc: PickedLocation, bikeType: BikeType) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ride-score?lat=${loc.lat}&lng=${loc.lng}&bikeType=${bikeType}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setScore({ score: data.score, label: data.label, color: data.color });
    } catch {
      setScore(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = useCallback(
    (loc: PickedLocation) => {
      setLocation(loc);
      fetchScore(loc, bike);
    },
    [fetchScore, bike]
  );

  const pickBike = (b: BikeType) => {
    setBike(b);
    localStorage.setItem("rbw_bike", b);
    if (location) fetchScore(location, b);
  };

  const active = BIKE_PROFILES.find((b) => b.id === bike);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bike Type Profiles</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Different bikes, different math. Pick what you&apos;re riding and the Ride Score retunes —
            road bikes feel every crosswind, e-bikes lose range in the cold.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {score && active && (
        <div className="mb-6 card flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-4"
            style={{ borderColor: score.color }}
          >
            <span className="text-xl font-bold" style={{ color: score.color }}>
              {loading ? "…" : score.score.toFixed(1)}
            </span>
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-wide" style={{ color: score.color }}>
              {score.label}
            </div>
            <p className="text-sm text-gray-400">
              Ride Score on a <span className="text-gray-200">{active.label}</span> bike right now.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BIKE_PROFILES.map((b) => {
          const selected = b.id === bike;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => pickBike(b.id)}
              className={`card text-left transition-colors ${
                selected ? "border-sky-500/60 ring-1 ring-sky-500/30" : "hover:border-sky-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-3xl">{b.emoji}</div>
                {selected && (
                  <span className="rounded-full bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-400 uppercase tracking-wide">
                    Selected
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-lg font-semibold text-white">{b.label}</h3>
              <p className="mt-1 text-sm text-gray-400">{b.blurb}</p>
              <dl className="mt-3 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <dt>Wind sensitivity</dt>
                  <dd className="text-gray-300">
                    {b.windPenaltyMult > 1 ? "Higher" : b.windPenaltyMult < 1 ? "Lower" : "Standard"}
                    {" "}({b.windPenaltyMult}×)
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Cold penalty</dt>
                  <dd className="text-gray-300">{b.coldPenalty > 0 ? `−${b.coldPenalty} below 45°F` : "None"}</dd>
                </div>
              </dl>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-gray-500">
        Your selection is saved and applied across the Cycling dashboard and Ride Score pages.
      </p>
    </div>
  );
}
