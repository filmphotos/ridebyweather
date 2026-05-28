"use client";

import { useCallback, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import { aqiCategory, type AirQualityData } from "@/lib/airQuality";

export default function AirQualityClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [data, setData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAir = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/air-quality?lat=${loc.lat}&lng=${loc.lng}`);
      if (!res.ok) throw new Error("Failed to fetch air quality");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = useCallback(
    (loc: PickedLocation) => {
      setLocation(loc);
      fetchAir(loc);
    },
    [fetchAir]
  );

  const cat = data ? aqiCategory(data.usAqi) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Air Quality</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Live US AQI so smoke, smog, and pollen days don&apos;t blindside you.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}

      {loading && <div className="card h-48 animate-pulse bg-gray-800" />}

      {!loading && data && cat && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="card flex flex-col items-center justify-center py-10 text-center md:col-span-1">
            <div
              className="flex h-40 w-40 flex-col items-center justify-center rounded-full border-8"
              style={{ borderColor: cat.color }}
            >
              <span className="text-5xl font-bold" style={{ color: cat.color }}>
                {data.usAqi}
              </span>
              <span className="text-xs text-gray-500 mt-1">US AQI</span>
            </div>
            <div className="mt-4 text-lg font-bold uppercase tracking-wide" style={{ color: cat.color }}>
              {cat.label}
            </div>
            <div className="text-xs text-gray-500">AQI {cat.range}</div>
          </div>

          <div className="card md:col-span-2 flex flex-col">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">What it means for riding</h2>
            <p className="mt-3 text-sm text-gray-200">{cat.advice}</p>
            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-amber-400 mb-1">Sensitive groups</div>
              <p className="text-sm text-gray-300">{cat.sensitiveAdvice}</p>
            </div>

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">Pollutants</h3>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <Pollutant label="PM2.5" value={`${data.pm2_5.toFixed(1)} µg/m³`} note="Fine particles / smoke" />
              <Pollutant label="PM10" value={`${data.pm10.toFixed(1)} µg/m³`} note="Dust & pollen" />
              <Pollutant label="Ozone" value={`${data.ozone.toFixed(0)} µg/m³`} note="Smog" />
              <Pollutant label="NO₂" value={`${data.no2.toFixed(0)} µg/m³`} note="Traffic exhaust" />
            </dl>
          </div>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">🌫️</div>
          <p className="text-gray-400">Allow location or search a city to check air quality.</p>
        </div>
      )}
    </div>
  );
}

function Pollutant({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-100 tabular-nums">{value}</span>
      </div>
      <div className="mt-0.5 text-[11px] text-gray-500">{note}</div>
    </div>
  );
}
