"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  windGustMaxMph: number;
  windDirDeg: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
  condition: string;
}

interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  daily: DailyItem[] | null;
  loading: boolean;
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function haversineMi(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// True-north bearing from a → b in degrees [0, 360).
function bearingDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Compare riding bearing to where the wind is *coming from* (windDirDeg).
// A headwind blows ~opposite to the direction of travel.
function windRelative(rideBearing: number, windFromDeg: number, windMph: number): string {
  if (windMph < 5) return "Calm";
  const diff = Math.abs(((windFromDeg - rideBearing + 540) % 360) - 180);
  if (diff > 135) return `Tailwind ${Math.round(windMph)} mph`;
  if (diff < 45) return `Headwind ${Math.round(windMph)} mph`;
  return `Crosswind ${Math.round(windMph)} mph`;
}

function todayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function addDaysIso(startIso: string, n: number): string {
  const d = new Date(startIso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function TourClient() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [startDate, setStartDate] = useState<string>(todayIso());
  const [pendingPick, setPendingPick] = useState<PickedLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch forecast for any stop missing it. Re-runs when start date changes
  // because the daily slices we care about move with it.
  useEffect(() => {
    stops.forEach((s, i) => {
      if (s.daily !== null || s.loading) return;
      const idx = i;
      const sid = s.id;
      setStops((prev) =>
        prev.map((x) => (x.id === sid ? { ...x, loading: true } : x))
      );
      const days = Math.min(14, Math.max(7, stops.length + 1));
      fetch(`/api/weather/daily?lat=${s.lat}&lng=${s.lng}&days=${days}`)
        .then((r) => (r.ok ? r.json() : { daily: [] }))
        .then((j) => {
          setStops((prev) =>
            prev.map((x) =>
              x.id === sid ? { ...x, daily: (j.daily ?? []) as DailyItem[], loading: false } : x
            )
          );
        })
        .catch(() => {
          setStops((prev) =>
            prev.map((x) => (x.id === sid ? { ...x, daily: [], loading: false } : x))
          );
        });
      // i is unused beyond a closure tick — silence the lint
      void idx;
    });
  }, [stops]);

  const handleAddStop = useCallback((loc: PickedLocation) => {
    setError(null);
    setStops((prev) => {
      if (prev.length >= 10) {
        setError("Tours are capped at 10 stops.");
        return prev;
      }
      return [
        ...prev,
        {
          id: newId(),
          name: loc.name ?? `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}`,
          lat: loc.lat,
          lng: loc.lng,
          daily: null,
          loading: false,
        },
      ];
    });
    setPendingPick(null);
  }, []);

  // LocationSearch fires onSelect on auto-detect too, which we don't want
  // jumping straight into the tour. Buffer through pendingPick and let the
  // user confirm via the Add button.
  const handleSelect = useCallback((loc: PickedLocation) => setPendingPick(loc), []);

  function removeStop(id: string) {
    setStops((prev) => prev.filter((s) => s.id !== id));
  }

  function moveStop(id: string, delta: -1 | 1) {
    setStops((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const j = idx + delta;
      if (j < 0 || j >= prev.length) return prev;
      const copy = prev.slice();
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });
  }

  // Per-leg view: each stop becomes the destination on day index. For day 0
  // (origin) we still show the stop's weather as a "depart from" panel.
  const legs = useMemo(() => {
    return stops.map((stop, i) => {
      const dateIso = addDaysIso(startDate, i);
      // The daily forecast array is 0=today, 1=tomorrow, ... We compute the
      // offset between today and the leg date.
      const offset = Math.round(
        (new Date(dateIso + "T00:00:00").getTime() -
          new Date(todayIso() + "T00:00:00").getTime()) /
          (24 * 3600 * 1000)
      );
      const forecast = stop.daily?.[offset] ?? null;
      const prev = i > 0 ? stops[i - 1] : null;
      const distanceMi = prev ? haversineMi(prev, stop) : 0;
      const bearing = prev ? bearingDeg(prev, stop) : 0;
      return { stop, dateIso, offset, forecast, prev, distanceMi, bearing };
    });
  }, [stops, startDate]);

  // Tour-wide aggregates for the packing list.
  const summary = useMemo(() => {
    const forecasts = legs.map((l) => l.forecast).filter((f): f is DailyItem => !!f);
    if (forecasts.length === 0) return null;
    return {
      coldestF: Math.min(...forecasts.map((d) => d.tempMinF)),
      hottestF: Math.max(...forecasts.map((d) => d.tempMaxF)),
      maxPrecip: Math.max(...forecasts.map((d) => d.precipProb)),
      maxWind: Math.max(...forecasts.map((d) => d.windSpeedMaxMph)),
      maxUv: Math.max(...forecasts.map((d) => d.uvIndexMax)),
      totalMi: legs.reduce((s, l) => s + l.distanceMi, 0),
      bestLeg: legs
        .filter((l) => l.forecast)
        .reduce<{ stop: Stop; forecast: DailyItem; dateIso: string } | null>(
          (a, b) =>
            !a || (b.forecast && b.forecast.score > a.forecast.score)
              ? { stop: b.stop, forecast: b.forecast!, dateIso: b.dateIso }
              : a,
          null
        ),
      worstLeg: legs
        .filter((l) => l.forecast)
        .reduce<{ stop: Stop; forecast: DailyItem; dateIso: string } | null>(
          (a, b) =>
            !a || (b.forecast && b.forecast.score < a.forecast.score)
              ? { stop: b.stop, forecast: b.forecast!, dateIso: b.dateIso }
              : a,
          null
        ),
    };
  }, [legs]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Multi-Day Tour Planner</h1>
        <p className="mt-1 text-sm text-gray-400 max-w-2xl">
          Build a multi-stop tour day by day. We fetch the Ride Score at each
          stop on its scheduled day, compute leg distance and head/tailwind,
          and roll the whole tour up into one pack list.
        </p>
      </div>

      {/* Controls */}
      <div className="card mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label className="text-xs uppercase tracking-wide text-gray-500" htmlFor="tour-start">
              Tour start date
            </label>
            <input
              id="tour-start"
              type="date"
              min={todayIso()}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value || todayIso())}
              className="mt-1 block rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex-1 sm:max-w-md">
            <span className="text-xs uppercase tracking-wide text-gray-500">
              Add stop {stops.length + 1}
            </span>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1">
                <LocationSearch onSelect={handleSelect} autoDetect={false} placeholder="City, address, or ZIP…" />
              </div>
              <button
                onClick={() => pendingPick && handleAddStop(pendingPick)}
                disabled={!pendingPick}
                className="btn-primary whitespace-nowrap rounded-lg px-3 py-2 text-sm disabled:opacity-40"
              >
                Add
              </button>
            </div>
            {pendingPick && (
              <p className="mt-1 text-xs text-gray-500">
                Ready: <span className="text-gray-300">{pendingPick.name ?? "Selected location"}</span>
              </p>
            )}
          </div>
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}
      </div>

      {stops.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">🗓️</div>
          <p className="max-w-md text-gray-400">
            Add 2 or more stops to build a day-by-day plan. Start with where you depart,
            then each overnight in order.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Itinerary timeline */}
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Itinerary
              </h2>
              {summary && (
                <span className="text-xs text-gray-400">
                  Total {summary.totalMi.toFixed(1)} mi · {stops.length} stops
                </span>
              )}
            </div>
            <ol className="space-y-3">
              {legs.map((leg, i) => (
                <li
                  key={leg.stop.id}
                  className="rounded-xl border border-gray-800 bg-gray-900/40 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-300">
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-white">{leg.stop.name}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Day {i + 1} ·{" "}
                        {new Date(leg.dateIso + "T00:00:00").toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveStop(leg.stop.id, -1)}
                        disabled={i === 0}
                        className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-200 disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveStop(leg.stop.id, 1)}
                        disabled={i === stops.length - 1}
                        className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-200 disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeStop(leg.stop.id)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-red-400"
                        aria-label="Remove stop"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Leg info */}
                  {leg.prev && (
                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-800 pt-3 text-xs sm:grid-cols-4">
                      <Cell label="From" value={leg.prev.name} />
                      <Cell label="Distance" value={`${leg.distanceMi.toFixed(1)} mi`} />
                      <Cell label="Bearing" value={`${Math.round(leg.bearing)}°`} />
                      {leg.forecast && (
                        <Cell
                          label="Wind"
                          value={windRelative(
                            leg.bearing,
                            leg.forecast.windDirDeg,
                            leg.forecast.windSpeedMaxMph
                          )}
                        />
                      )}
                    </div>
                  )}

                  {/* Forecast for the day */}
                  {leg.stop.loading && (
                    <div className="mt-3 h-16 animate-pulse rounded-lg bg-gray-800/40" />
                  )}
                  {!leg.stop.loading && leg.forecast && (
                    <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-gray-800 pt-3">
                      <div
                        className="flex h-14 w-14 flex-col items-center justify-center rounded-lg text-base font-bold"
                        style={{
                          backgroundColor: `${leg.forecast.color}22`,
                          color: leg.forecast.color,
                        }}
                      >
                        {leg.forecast.score.toFixed(1)}
                      </div>
                      <div className="text-xs">
                        <div
                          className="font-semibold uppercase tracking-wide"
                          style={{ color: leg.forecast.color }}
                        >
                          {leg.forecast.label}
                        </div>
                        <div className="mt-0.5 capitalize text-gray-400">
                          {leg.forecast.condition}
                        </div>
                      </div>
                      <dl className="ml-auto grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                        <Mini label="High" value={`${Math.round(leg.forecast.tempMaxF)}°F`} />
                        <Mini label="Low" value={`${Math.round(leg.forecast.tempMinF)}°F`} />
                        <Mini
                          label="Rain"
                          value={`${Math.round(leg.forecast.precipProb * 100)}%`}
                        />
                        <Mini label="UV" value={`${Math.round(leg.forecast.uvIndexMax)}`} />
                        <Mini
                          label="Sunrise"
                          value={fmtTime(leg.forecast.sunrise)}
                        />
                        <Mini label="Sunset" value={fmtTime(leg.forecast.sunset)} />
                      </dl>
                    </div>
                  )}
                  {!leg.stop.loading && !leg.forecast && leg.offset >= 0 && (
                    <p className="mt-3 border-t border-gray-800 pt-3 text-xs text-amber-300/80">
                      Day {i + 1} is beyond the available 14-day forecast window. Pack for typical seasonal conditions.
                    </p>
                  )}
                </li>
              ))}
            </ol>
            {stops.length < 2 && (
              <p className="mt-3 text-xs text-gray-500">
                Add at least one more stop to see leg distances and head/tailwind.
              </p>
            )}
          </div>

          {/* Pack list + highlights */}
          {summary && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="card">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Pack for the tour
                </h2>
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
                  <PackItem
                    show={summary.totalMi >= 100}
                    text={`Long tour (${summary.totalMi.toFixed(0)} mi total) — spare tube, chain lube, multi-tool`}
                  />
                  <PackItem show text="Always: ID, phone, basic repair kit, electrolytes" />
                </ul>
              </div>

              <div className="card">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Best &amp; worst days
                </h2>
                <div className="mt-4 space-y-3">
                  {summary.bestLeg && (
                    <DayHighlight
                      label={`Best — ${summary.bestLeg.stop.name}`}
                      day={{
                        date: summary.bestLeg.dateIso,
                        score: summary.bestLeg.forecast.score,
                        label: summary.bestLeg.forecast.label,
                        color: summary.bestLeg.forecast.color,
                      }}
                      positive
                    />
                  )}
                  {summary.worstLeg && (
                    <DayHighlight
                      label={`Toughest — ${summary.worstLeg.stop.name}`}
                      day={{
                        date: summary.worstLeg.dateIso,
                        score: summary.worstLeg.forecast.score,
                        label: summary.worstLeg.forecast.label,
                        color: summary.worstLeg.forecast.color,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-0.5 truncate text-gray-200">{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200 tabular-nums">{value}</span>
    </div>
  );
}

function PackItem({ show, text }: { show: boolean; text: string }) {
  if (!show) return null;
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 text-sky-400">›</span>
      <span>{text}</span>
    </li>
  );
}

function DayHighlight({
  label,
  day,
  positive,
}: {
  label: string;
  day: { date: string; score: number; label: string; color: string };
  positive?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-3 ${
        positive ? "border-emerald-500/20 bg-emerald-500/5" : "border-orange-500/20 bg-orange-500/5"
      }`}
    >
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm font-semibold text-white">
          {new Date(day.date + "T00:00:00").toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
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
