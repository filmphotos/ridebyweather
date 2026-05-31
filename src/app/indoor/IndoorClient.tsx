"use client";

import { useCallback, useEffect, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import { pickWorkouts, type Workout } from "@/lib/indoorWorkouts";

const KIND_COLOR: Record<Workout["kind"], string> = {
  recovery: "#22c55e",
  endurance: "#84cc16",
  "sweet-spot": "#f59e0b",
  intervals: "#f97316",
  vo2: "#ef4444",
};

export default function IndoorClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [duration, setDuration] = useState(60);
  const [score, setScore] = useState<number | null>(null);
  const [picks, setPicks] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rbw_indoor_duration");
      if (raw) setDuration(Number(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("rbw_indoor_duration", String(duration)); } catch {}
  }, [duration]);

  const load = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ride-score?lat=${loc.lat}&lng=${loc.lng}`);
      if (!res.ok) throw new Error("Failed to load conditions");
      const json = await res.json();
      setScore(json.score);
      setPicks(pickWorkouts(duration, json.score));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [duration]);

  const handleSelect = useCallback(
    (loc: PickedLocation) => {
      setLocation(loc);
      load(loc);
    },
    [load]
  );

  useEffect(() => {
    if (score != null) setPicks(pickWorkouts(duration, score));
  }, [duration, score]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Indoor Fallback</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Outdoor conditions look rough? Match an indoor workout to the duration you&apos;d have
            ridden.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      <div className="card mb-6 max-w-md">
        <label className="flex items-center justify-between text-sm text-gray-300">
          <span>Planned ride duration</span>
          <span className="font-semibold text-white tabular-nums">{duration} min</span>
        </label>
        <input
          type="range"
          min={30}
          max={150}
          step={15}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="mt-2 w-full accent-sky-500"
        />
        <p className="mt-1 text-[11px] text-gray-500">We pick workouts within ±25% of this.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}
      {loading && <div className="card h-48 animate-pulse bg-gray-800" />}

      {!loading && score != null && (
        <div className="mb-4 card">
          <div className="text-sm text-gray-300">
            Outdoor score: <span className="font-bold text-white">{score.toFixed(1)}</span>.{" "}
            {score < 5
              ? "Indoor is the smart call today."
              : "Conditions are actually fine — these are alternatives if you want indoor anyway."}
          </div>
        </div>
      )}

      {!loading && picks.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {picks.map((w) => (
            <div key={w.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ backgroundColor: KIND_COLOR[w.kind] + "33", color: KIND_COLOR[w.kind] }}>
                      {w.kind}
                    </span>
                    <h3 className="text-lg font-semibold text-white">{w.name}</h3>
                  </div>
                  <p className="mt-2 text-sm text-gray-300">{w.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Time</div>
                  <div className="text-xl font-bold text-white tabular-nums">{w.durationMin}m</div>
                  <div className="mt-2 text-xs uppercase tracking-wide text-gray-500">TSS</div>
                  <div className="text-base font-bold text-sky-400 tabular-nums">{w.tss}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && score == null && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">🏠</div>
          <p className="text-gray-400">Pick a location to find an indoor session.</p>
        </div>
      )}
    </div>
  );
}
