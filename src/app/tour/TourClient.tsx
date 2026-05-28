"use client";

import { useCallback, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";

interface DailyItem {
  date: string;
  score: number;
  label: string;
  color: string;
  tempMaxF: number;
  tempMinF: number;
  precipProb: number;
  windSpeedMaxMph: number;
  uvIndexMax: number;
  condition: string;
}

export default function TourClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [daily, setDaily] = useState<DailyItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather/daily?lat=${loc.lat}&lng=${loc.lng}&days=7`);
      if (!res.ok) throw new Error("Failed to load forecast");
      const json = await res.json();
      setDaily(json.daily ?? []);
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

  // Pack-for-the-worst-day aggregates across the week.
  const summary = daily && daily.length > 0
    ? {
        coldestF: Math.min(...daily.map((d) => d.tempMinF)),
        hottestF: Math.max(...daily.map((d) => d.tempMaxF)),
        maxPrecip: Math.max(...daily.map((d) => d.precipProb)),
        maxWind: Math.max(...daily.map((d) => d.windSpeedMaxMph)),
        maxUv: Math.max(...daily.map((d) => d.uvIndexMax)),
        worstDay: daily.reduce((a, b) => (b.score < a.score ? b : a)),
        bestDay: daily.reduce((a, b) => (b.score > a.score ? b : a)),
      }
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Multi-Day Tour Planner</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            A full week of Ride Scores so you can pack for the worst day and ride the best one.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}

      {loading && <div className="card h-64 animate-pulse bg-gray-800" />}

      {!loading && daily && summary && (
        <div className="space-y-6">
          {/* 7-day strip */}
          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">7-day Ride Score</h2>
            <div className="grid grid-cols-7 gap-2">
              {daily.map((d, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="text-xs text-gray-500">
                    {i === 0 ? "Today" : new Date(d.date).toLocaleDateString(undefined, { weekday: "short" })}
                  </div>
                  <div
                    className="mt-2 flex h-12 w-full flex-col items-center justify-center rounded-lg font-bold text-sm"
                    style={{ backgroundColor: `${d.color}22`, color: d.color }}
                  >
                    {d.score.toFixed(1)}
                  </div>
                  <div className="mt-1.5 text-xs text-gray-300">
                    {Math.round(d.tempMaxF)}°
                  </div>
                  <div className="text-[11px] text-gray-600">{Math.round(d.tempMinF)}°</div>
                  <div className="mt-1 text-[11px] text-gray-500">{Math.round(d.precipProb * 100)}%💧</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pack list */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Pack for the week</h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <PackItem
                  show={summary.coldestF < 50}
                  text={`Cold gear — low of ${Math.round(summary.coldestF)}°F expected`}
                />
                <PackItem
                  show={summary.hottestF > 82}
                  text={`Heat kit & extra bottles — high of ${Math.round(summary.hottestF)}°F`}
                />
                <PackItem
                  show={summary.maxPrecip > 0.4}
                  text={`Rain shell — up to ${Math.round(summary.maxPrecip * 100)}% chance one day`}
                />
                <PackItem
                  show={summary.maxWind > 18}
                  text={`Wind vest — gusty day with ${Math.round(summary.maxWind)} mph winds`}
                />
                <PackItem
                  show={summary.maxUv >= 6}
                  text={`Sunscreen & tinted eyewear — peak UV ${Math.round(summary.maxUv)}`}
                />
                <PackItem show={true} text="Always: ID, phone, basic repair kit, electrolytes" forceShow />
              </ul>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Best &amp; worst days</h2>
              <div className="mt-4 space-y-3">
                <DayHighlight label="Best day to ride" day={summary.bestDay} positive />
                <DayHighlight label="Toughest day" day={summary.worstDay} />
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !daily && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">🗓️</div>
          <p className="text-gray-400">Allow location or search a city to plan your tour.</p>
        </div>
      )}
    </div>
  );
}

function PackItem({ show, text, forceShow }: { show: boolean; text: string; forceShow?: boolean }) {
  if (!show && !forceShow) return null;
  return (
    <li className="flex items-start gap-2">
      <span className="text-sky-400 mt-0.5">›</span>
      <span>{text}</span>
    </li>
  );
}

function DayHighlight({ label, day, positive }: { label: string; day: { date: string; score: number; label: string; color: string }; positive?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-3 ${
        positive ? "border-emerald-500/20 bg-emerald-500/5" : "border-orange-500/20 bg-orange-500/5"
      }`}
    >
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm font-semibold text-white">
          {new Date(day.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </div>
      </div>
      <div className="text-right">
        <div className="text-xl font-bold" style={{ color: day.color }}>
          {day.score.toFixed(1)}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: day.color }}>
          {day.label}
        </div>
      </div>
    </div>
  );
}
