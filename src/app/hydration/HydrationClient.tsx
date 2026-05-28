"use client";

import { useCallback, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import { heatIndexF, heatIndexCategory, hydrationPlan, type Intensity } from "@/lib/hydration";

interface Conditions {
  tempF: number;
  feelsLikeF: number;
  humidity: number;
}

const INTENSITIES: { id: Intensity; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "moderate", label: "Moderate" },
  { id: "hard", label: "Hard" },
];

export default function HydrationClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [conditions, setConditions] = useState<Conditions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [durationMin, setDurationMin] = useState(90);
  const [intensity, setIntensity] = useState<Intensity>("moderate");

  const load = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ride-score?lat=${loc.lat}&lng=${loc.lng}`);
      if (!res.ok) throw new Error("Failed to load conditions");
      const json = await res.json();
      setConditions({
        tempF: json.weather.tempF,
        feelsLikeF: json.weather.feelsLikeF,
        humidity: json.weather.humidity,
      });
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

  const hi = conditions ? heatIndexF(conditions.tempF, conditions.humidity) : null;
  const hiCat = hi != null ? heatIndexCategory(hi) : null;
  const plan =
    conditions != null
      ? hydrationPlan({ tempF: conditions.tempF, humidity: conditions.humidity, durationMin, intensity })
      : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Heat Index &amp; Hydration Coach</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Heat index plus humidity-adjusted fluid targets for your planned ride.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}

      {loading && <div className="card h-48 animate-pulse bg-gray-800" />}

      {!loading && conditions && hi != null && hiCat && plan && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Heat index */}
          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Heat index</h2>
            <div className="mt-4 flex items-center gap-5">
              <div
                className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-4"
                style={{ borderColor: hiCat.color }}
              >
                <span className="text-3xl font-bold" style={{ color: hiCat.color }}>
                  {hi}°
                </span>
              </div>
              <div>
                <div className="text-base font-bold uppercase tracking-wide" style={{ color: hiCat.color }}>
                  {hiCat.label}
                </div>
                <p className="mt-1 text-sm text-gray-300">{hiCat.advice}</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-gray-800 pt-4 text-center">
              <Stat label="Air temp" value={`${Math.round(conditions.tempF)}°F`} />
              <Stat label="Feels like" value={`${Math.round(conditions.feelsLikeF)}°F`} />
              <Stat label="Humidity" value={`${conditions.humidity}%`} />
            </dl>
          </div>

          {/* Hydration plan */}
          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Your ride</h2>

            <div className="mt-4">
              <label className="flex items-center justify-between text-sm text-gray-300">
                <span>Duration</span>
                <span className="font-semibold text-white">
                  {Math.floor(durationMin / 60)}h {durationMin % 60}m
                </span>
              </label>
              <input
                type="range"
                min={30}
                max={360}
                step={15}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="mt-2 w-full accent-sky-500"
              />
            </div>

            <div className="mt-4">
              <span className="text-sm text-gray-300">Intensity</span>
              <div className="mt-2 inline-flex w-full rounded-lg border border-gray-800 bg-gray-900 p-0.5 text-sm">
                {INTENSITIES.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => setIntensity(it.id)}
                    className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
                      intensity === it.id ? "bg-sky-500 text-white" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-gray-800 pt-4 text-center">
              <Stat label="Per hour" value={`${plan.mlPerHour} ml`} />
              <Stat label="Total" value={`${plan.totalOz} oz`} />
              <Stat label="Bottles" value={`${plan.bottles}×`} />
            </div>

            <div
              className={`mt-4 rounded-lg border p-3 text-sm ${
                plan.electrolytes
                  ? "border-amber-500/20 bg-amber-500/5 text-amber-200"
                  : "border-sky-500/20 bg-sky-500/5 text-sky-200"
              }`}
            >
              {plan.advice}
            </div>
          </div>
        </div>
      )}

      {!loading && !conditions && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">💧</div>
          <p className="text-gray-400">Allow location or search a city to build a hydration plan.</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-bold text-white tabular-nums">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
