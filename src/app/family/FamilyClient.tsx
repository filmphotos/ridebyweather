"use client";

import { useCallback, useEffect, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import { evaluateFamily, type FamilyVerdict } from "@/lib/familyMode";

export default function FamilyClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [verdict, setVerdict] = useState<FamilyVerdict | null>(null);
  const [withTrailer, setWithTrailer] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rbw_family_trailer");
      if (raw != null) setWithTrailer(raw === "1");
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("rbw_family_trailer", withTrailer ? "1" : "0"); } catch {}
  }, [withTrailer]);

  const load = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ride-score?lat=${loc.lat}&lng=${loc.lng}`);
      if (!res.ok) throw new Error("Failed to load conditions");
      const json = await res.json();
      const w = json.weather;
      setVerdict(
        evaluateFamily({
          tempF: w.tempF,
          feelsLikeF: w.feelsLikeF,
          windSpeedMph: w.windSpeedMph,
          windGustMph: w.windGustMph,
          precipProb: w.precipProb,
          uvIndex: w.uvIndex,
          withTrailer,
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [withTrailer]);

  const handleSelect = useCallback(
    (loc: PickedLocation) => {
      setLocation(loc);
      load(loc);
    },
    [load]
  );

  // Re-evaluate when trailer toggle flips (without re-fetching).
  useEffect(() => {
    if (location) load(location);
  }, [withTrailer, location, load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Family Mode</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Gentler thresholds for kids in a trailer or tagalong. Wind matters more, cold matters
            more, gusts matter a lot.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      <label className="mb-6 inline-flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={withTrailer}
          onChange={(e) => setWithTrailer(e.target.checked)}
          className="rounded border-gray-700 bg-gray-900 text-sky-500 focus:ring-sky-500"
        />
        Pulling a trailer / tagalong
      </label>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}
      {loading && <div className="card h-48 animate-pulse bg-gray-800" />}

      {!loading && verdict && (
        <div className="space-y-6">
          <div className="card border" style={{ borderColor: verdict.color + "55" }}>
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 text-2xl" style={{ borderColor: verdict.color }}>
                {verdict.level === "great" ? "👨‍👩‍👧‍👦" : verdict.level === "ok" ? "👍" : verdict.level === "borderline" ? "🤔" : "🏠"}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Verdict</div>
                <h2 className="text-2xl font-bold" style={{ color: verdict.color }}>{verdict.label}</h2>
              </div>
            </div>
          </div>

          {verdict.reasons.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Watch outs</h2>
              <ul className="mt-3 space-y-1.5">
                {verdict.reasons.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm text-gray-200">
                    <span className="text-amber-400 mt-0.5">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {verdict.tips.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Tips</h2>
              <ul className="mt-3 space-y-1.5">
                {verdict.tips.map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-gray-200">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!loading && !verdict && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">🚸</div>
          <p className="text-gray-400">Pick a location for a family ride/walk verdict.</p>
        </div>
      )}
    </div>
  );
}
