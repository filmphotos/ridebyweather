"use client";

import { useCallback, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";

interface HourCell {
  timestamp: string;
  isStorm: boolean;
  precipProb: number;
  condition: string;
}

interface LightningInfo {
  inStormNow: boolean;
  nextStormHour: number | null;
  stormPctNext6h: number;
}

export default function LightningClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [info, setInfo] = useState<LightningInfo | null>(null);
  const [hours, setHours] = useState<HourCell[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather/forecast?lat=${loc.lat}&lng=${loc.lng}&hours=12`);
      if (!res.ok) throw new Error("Failed to load forecast");
      const json = await res.json();
      const list: HourCell[] = json.forecast.map((f: { timestamp: string; weather: { precipProb: number; condition: string } }) => ({
        timestamp: f.timestamp,
        isStorm: f.weather.condition === "thunderstorm",
        precipProb: f.weather.precipProb,
        condition: f.weather.condition,
      }));
      setHours(list);
      const inStormNow = list[0]?.isStorm ?? false;
      const stormIdx = list.findIndex((h) => h.isStorm);
      const next6 = list.slice(0, 6);
      const stormCount = next6.filter((h) => h.isStorm).length;
      setInfo({
        inStormNow,
        nextStormHour: stormIdx === -1 ? null : stormIdx,
        stormPctNext6h: Math.round((stormCount / 6) * 100),
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Lightning Map</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Storm-cell awareness with the 30-30 rule. The live strike feed unlocks with the
            Vaisala / Blitzortung integration — wired and ready.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}
      {loading && <div className="card h-48 animate-pulse bg-gray-800" />}

      {!loading && info && hours && (
        <div className="space-y-6">
          <div className={`card border ${info.inStormNow ? "border-red-500/50 ring-1 ring-red-500/30" : "border-gray-800"}`}>
            <div className="flex items-start gap-4">
              <div className="text-5xl">{info.inStormNow ? "⛈️" : info.nextStormHour != null ? "🌩️" : "✅"}</div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {info.inStormNow
                    ? "Thunderstorm now"
                    : info.nextStormHour != null
                    ? `Storm arrives in ${info.nextStormHour} h`
                    : "No lightning in 12 h"}
                </h2>
                <p className="mt-2 text-sm text-gray-300">
                  {info.inStormNow
                    ? "Get indoors. The 30-30 rule: if thunder follows lightning by less than 30 seconds, seek shelter and wait 30 minutes after the last strike."
                    : info.nextStormHour != null
                    ? `Plan to be back before hour ${info.nextStormHour}. Storms can travel 30–50 mph — pad your return by 30 min.`
                    : "Skies clear of electrical activity in the forecast window."}
                </p>
                <p className="mt-2 text-xs text-gray-500">Storm probability next 6 h: {info.stormPctNext6h}%</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Next 12 hours</h2>
            <div className="mt-3 grid grid-cols-12 gap-1">
              {hours.map((h, i) => {
                const t = new Date(h.timestamp);
                const color = h.isStorm ? "#ef4444" : h.condition === "rain" ? "#3b82f6" : "#22c55e";
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="text-[10px] text-gray-500 tabular-nums">{t.getHours()}</div>
                    <div className="h-10 w-full rounded text-center text-[10px] flex items-center justify-center" style={{ backgroundColor: color + "33", borderTop: `3px solid ${color}` }}>
                      {h.isStorm ? "⚡" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card border-amber-500/30 bg-amber-500/5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-300">Lightning safety reminders</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-amber-100/90">
              <li>• If you can hear thunder, you can be struck.</li>
              <li>• Get off the bike — metal frames don&apos;t attract lightning, but elevation does.</li>
              <li>• Avoid isolated trees, fences, and ridgelines. Hardtop building or hardtop car &gt; everything else.</li>
              <li>• 30 minutes after the last strike before you mount up.</li>
            </ul>
          </div>
        </div>
      )}

      {!loading && !info && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">⚡</div>
          <p className="text-gray-400">Pick a location to check lightning risk.</p>
        </div>
      )}
    </div>
  );
}
