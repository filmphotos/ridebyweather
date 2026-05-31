"use client";

import { useCallback, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import { evaluateAsthma, type AsthmaVerdict } from "@/lib/asthmaRisk";

export default function AsthmaClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [verdict, setVerdict] = useState<AsthmaVerdict | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const [airRes, scoreRes, pollenRes] = await Promise.all([
        fetch(`/api/air-quality?lat=${loc.lat}&lng=${loc.lng}`),
        fetch(`/api/ride-score?lat=${loc.lat}&lng=${loc.lng}`),
        fetch(`/api/pollen?lat=${loc.lat}&lng=${loc.lng}`).catch(() => null),
      ]);
      if (!airRes.ok) throw new Error("Failed to load air quality");
      if (!scoreRes.ok) throw new Error("Failed to load conditions");
      const air = await airRes.json();
      const score = await scoreRes.json();
      const pollen = pollenRes && pollenRes.ok ? await pollenRes.json() : null;

      setVerdict(
        evaluateAsthma({
          aqi: air.usAqi ?? 0,
          pm2_5: air.pm2_5 ?? 0,
          ozone: air.ozone ?? 0,
          tempF: score.weather.tempF,
          humidity: score.weather.humidity,
          pollenPeak: pollen?.peakGrains,
        })
      );
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
          <h1 className="text-2xl font-bold text-white">Sensitive Lungs Mode</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            One safety verdict for riders with asthma or exercise-induced bronchospasm. Combines
            AQI, humidity, cold-air risk, and pollen.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}
      {loading && <div className="card h-48 animate-pulse bg-gray-800" />}

      {!loading && verdict && (
        <div className="space-y-6">
          <div className="card border" style={{ borderColor: verdict.color + "55" }}>
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 text-2xl" style={{ borderColor: verdict.color }}>
                {verdict.level === "stay-in" ? "🚫" : verdict.level === "high-risk" ? "⚠️" : verdict.level === "caution" ? "🟡" : "✅"}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Verdict</div>
                <h2 className="text-2xl font-bold" style={{ color: verdict.color }}>{verdict.label}</h2>
                <p className="mt-2 text-sm text-gray-300">{verdict.advice}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Triggers today</h2>
            {verdict.triggers.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No triggers above threshold — this is a green-light day.</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {verdict.triggers.map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-gray-200">
                    <span className="text-amber-400 mt-0.5">•</span>
                    {t}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-[11px] text-gray-500">
              This is not medical advice. Always follow your action plan and consult your doctor.
            </p>
          </div>
        </div>
      )}

      {!loading && !verdict && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">🫁</div>
          <p className="text-gray-400">Pick a location for an asthma-aware ride verdict.</p>
        </div>
      )}
    </div>
  );
}
