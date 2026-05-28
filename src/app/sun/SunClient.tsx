"use client";

import { useCallback, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import { uvCategory, formatClock, daylightMinutes, formatDuration, lightsWindow, goldenHour } from "@/lib/sun";

interface DailyItem {
  date: string;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
  tempMaxF: number;
  tempMinF: number;
  condition: string;
}

interface HourlyItem {
  timestamp: string;
  weather: { uvIndex: number; tempF: number };
}

export default function SunClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [daily, setDaily] = useState<DailyItem[] | null>(null);
  const [hourly, setHourly] = useState<HourlyItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const [dRes, hRes] = await Promise.all([
        fetch(`/api/weather/daily?lat=${loc.lat}&lng=${loc.lng}&days=3`),
        fetch(`/api/weather/forecast?lat=${loc.lat}&lng=${loc.lng}&hours=24`),
      ]);
      if (!dRes.ok || !hRes.ok) throw new Error("Failed to load sun data");
      const dJson = await dRes.json();
      const hJson = await hRes.json();
      setDaily(dJson.daily ?? []);
      setHourly(hJson.forecast ?? []);
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

  const today = daily?.[0];
  const lights = today ? lightsWindow(today.sunrise, today.sunset) : null;
  const golden = today ? goldenHour(today.sunrise, today.sunset) : null;
  const todayUv = today ? uvCategory(today.uvIndexMax) : null;
  const maxHourlyUv = hourly ? Math.max(0, ...hourly.map((h) => h.weather.uvIndex)) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sun &amp; UV Planner</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Daylight window, UV exposure, and golden hour — plan dawn patrol or evening loops.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}

      {loading && <div className="card h-48 animate-pulse bg-gray-800" />}

      {!loading && today && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Daylight today */}
          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Today&apos;s daylight</h2>
            <div className="mt-4 flex items-center justify-between">
              <SunStat icon="🌅" label="Sunrise" value={formatClock(today.sunrise)} />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {formatDuration(daylightMinutes(today.sunrise, today.sunset))}
                </div>
                <div className="text-xs text-gray-500">of daylight</div>
              </div>
              <SunStat icon="🌇" label="Sunset" value={formatClock(today.sunset)} />
            </div>
            {lights && (
              <div className="mt-5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 text-sm text-gray-300">
                <span className="font-semibold text-indigo-300">💡 Lights recommended</span> before{" "}
                {lights.morningUntil} and after {lights.eveningFrom}.
              </div>
            )}
            {golden && (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-gray-300">
                <span className="font-semibold text-amber-300">📸 Golden hour</span> — {golden.morning} &amp;{" "}
                {golden.evening}
              </div>
            )}
          </div>

          {/* UV today */}
          <div className="card flex flex-col">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Peak UV today</h2>
            {todayUv && (
              <div className="mt-4 flex items-center gap-4">
                <div
                  className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-4"
                  style={{ borderColor: todayUv.color }}
                >
                  <span className="text-2xl font-bold" style={{ color: todayUv.color }}>
                    {Math.round(today.uvIndexMax)}
                  </span>
                </div>
                <div>
                  <div className="text-base font-bold uppercase tracking-wide" style={{ color: todayUv.color }}>
                    {todayUv.label}
                  </div>
                  <p className="mt-1 text-sm text-gray-300">{todayUv.advice}</p>
                </div>
              </div>
            )}

            {/* hourly UV strip */}
            {hourly && hourly.length > 0 && (
              <div className="mt-5">
                <div className="text-xs text-gray-500 mb-2">Next 24h UV</div>
                <div className="flex items-end gap-0.5 h-16">
                  {hourly.slice(0, 24).map((h, i) => {
                    const uv = h.weather.uvIndex;
                    const c = uvCategory(uv);
                    const heightPct = maxHourlyUv > 0 ? (uv / maxHourlyUv) * 100 : 0;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t"
                        style={{ height: `${Math.max(4, heightPct)}%`, backgroundColor: c.color }}
                        title={`${new Date(h.timestamp).getHours()}:00 — UV ${uv.toFixed(0)}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Next days */}
          <div className="card lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Coming days</h2>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {daily.map((d, i) => {
                const uv = uvCategory(d.uvIndexMax);
                return (
                  <div key={i} className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
                    <div className="text-sm font-semibold text-white">
                      {i === 0 ? "Today" : new Date(d.date).toLocaleDateString(undefined, { weekday: "long" })}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-gray-300">
                      <span>🌅 {formatClock(d.sunrise)}</span>
                      <span>🌇 {formatClock(d.sunset)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-gray-500">Peak UV</span>
                      <span className="font-bold" style={{ color: uv.color }}>
                        {Math.round(d.uvIndexMax)} · {uv.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!loading && !daily && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">☀️</div>
          <p className="text-gray-400">Allow location or search a city to plan around the sun.</p>
        </div>
      )}
    </div>
  );
}

function SunStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl">{icon}</div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
