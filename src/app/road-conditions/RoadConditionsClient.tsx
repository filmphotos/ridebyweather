"use client";

import { useCallback, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import { advise, type RoadAdvisory, type HourCondition } from "@/lib/roadConditions";

export default function RoadConditionsClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [hours, setHours] = useState<HourCondition[] | null>(null);
  const [advisory, setAdvisory] = useState<RoadAdvisory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather/forecast?lat=${loc.lat}&lng=${loc.lng}&hours=12`);
      if (!res.ok) throw new Error("Failed to load forecast");
      const json = await res.json();
      const rows: HourCondition[] = json.forecast.map((f: { timestamp: string; weather: { tempF: number; humidity: number; precipProb: number } }) => ({
        timestamp: f.timestamp,
        tempF: f.weather.tempF,
        humidity: f.weather.humidity,
        precipProb: f.weather.precipProb,
      }));
      setHours(rows);
      setAdvisory(advise(rows));
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
          <h1 className="text-2xl font-bold text-white">Road Conditions</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Wet pavement, frost, and ice risk in the next 12 hours. Built from the same hourly
            forecast that powers your Ride Score.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}
      {loading && <div className="card h-48 animate-pulse bg-gray-800" />}

      {!loading && advisory && hours && (
        <div className="space-y-6">
          <div className="card border" style={{ borderColor: advisory.color + "55" }}>
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 text-2xl"
                style={{ borderColor: advisory.color }}
              >
                {advisory.level === "ice-risk" ? "❄️" : advisory.level === "wet-now" ? "💧" : advisory.level === "wet-soon" ? "🌧️" : advisory.level === "frost-risk" ? "🌫️" : "✅"}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Advisory</div>
                <h2 className="text-2xl font-bold" style={{ color: advisory.color }}>{advisory.label}</h2>
                <p className="mt-2 text-sm text-gray-300">{advisory.message}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Next 12 hours</h2>
            <div className="mt-3 grid grid-cols-12 gap-1">
              {hours.map((h, i) => {
                const t = new Date(h.timestamp);
                const inWet =
                  advisory.wetWindow &&
                  i >= advisory.wetWindow.startIdx &&
                  i <= advisory.wetWindow.endIdx;
                const inFrost =
                  advisory.frostWindow &&
                  i >= advisory.frostWindow.startIdx &&
                  i <= advisory.frostWindow.endIdx;
                const color = inWet ? "#3b82f6" : inFrost ? "#a855f7" : h.tempF <= 32 ? "#7c3aed" : "#22c55e";
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="text-[10px] text-gray-500 tabular-nums">{t.getHours()}</div>
                    <div className="h-10 w-full rounded" style={{ backgroundColor: color + "33", borderTop: `3px solid ${color}` }} />
                    <div className="text-[10px] text-gray-400 tabular-nums">{Math.round(h.tempF)}°</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!loading && !advisory && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">🛣️</div>
          <p className="text-gray-400">Pick a location for road-surface advisories.</p>
        </div>
      )}
    </div>
  );
}
