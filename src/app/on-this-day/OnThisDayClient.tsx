"use client";

import { useCallback, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";

interface YearRow {
  year: number;
  tempMaxF: number | null;
  tempMinF: number | null;
  windMaxMph: number | null;
  precipInch: number | null;
}

interface HistResp {
  date: string;
  years: YearRow[];
  mean: {
    tempMaxF: number | null;
    tempMinF: number | null;
    windMaxMph: number | null;
    precipInch: number | null;
  };
}

export default function OnThisDayClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [data, setData] = useState<HistResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/historical?lat=${loc.lat}&lng=${loc.lng}`);
      if (!res.ok) throw new Error("Failed to load history");
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

  const today = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">On This Day — {today}</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            What the weather did at your location on this date in each of the last 5 years.
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
        <div className="space-y-6">
          {data.mean.tempMaxF != null && (
            <div className="card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">5-year mean for {data.date}</h2>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="High" value={`${Math.round(data.mean.tempMaxF)}°F`} />
                {data.mean.tempMinF != null && <Stat label="Low" value={`${Math.round(data.mean.tempMinF)}°F`} />}
                {data.mean.windMaxMph != null && <Stat label="Wind" value={`${Math.round(data.mean.windMaxMph)} mph`} />}
                {data.mean.precipInch != null && <Stat label="Precip" value={`${data.mean.precipInch.toFixed(2)}"`} />}
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Year by year</h2>
            <div className="mt-3 space-y-2">
              {data.years.map((y) => (
                <div key={y.year} className="grid grid-cols-5 items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-sm">
                  <span className="font-semibold text-white tabular-nums">{y.year}</span>
                  <span className="text-gray-300 tabular-nums">{y.tempMaxF != null ? `${Math.round(y.tempMaxF)}°F` : "—"}</span>
                  <span className="text-gray-300 tabular-nums">{y.tempMinF != null ? `${Math.round(y.tempMinF)}°F` : "—"}</span>
                  <span className="text-gray-300 tabular-nums">{y.windMaxMph != null ? `${Math.round(y.windMaxMph)} mph` : "—"}</span>
                  <span className="text-gray-300 tabular-nums">{y.precipInch != null ? `${y.precipInch.toFixed(2)}"` : "—"}</span>
                </div>
              ))}
              <div className="grid grid-cols-5 gap-2 px-3 pt-1 text-[11px] uppercase tracking-wide text-gray-500">
                <span>Year</span><span>High</span><span>Low</span><span>Wind</span><span>Rain</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">📅</div>
          <p className="text-gray-400">Pick a location to see today&apos;s weather across the years.</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 text-center">
      <div className="text-xl font-bold text-white tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}
