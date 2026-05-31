"use client";

import { useCallback, useEffect, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";

interface HourForecast {
  timestamp: string;
  score: number;
  label: string;
  color: string;
  weather: {
    tempF: number;
    humidity: number;
    windSpeedMph: number;
    windGustMph: number;
    windDirDeg: number;
    precipProb: number;
    condition: string;
  };
}

const DEFAULT_AM = "08:00";
const DEFAULT_PM = "17:30";

export default function CommuteClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [forecast, setForecast] = useState<HourForecast[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amTime, setAmTime] = useState(DEFAULT_AM);
  const [pmTime, setPmTime] = useState(DEFAULT_PM);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rbw_commute_times");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.am === "string") setAmTime(s.am);
      if (typeof s.pm === "string") setPmTime(s.pm);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("rbw_commute_times", JSON.stringify({ am: amTime, pm: pmTime }));
    } catch {}
  }, [amTime, pmTime]);

  const load = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather/forecast?lat=${loc.lat}&lng=${loc.lng}&hours=36`);
      if (!res.ok) throw new Error("Failed to load forecast");
      const json = await res.json();
      setForecast(json.forecast);
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

  const am = forecast ? nearestHour(forecast, amTime, "AM") : null;
  const pm = forecast ? nearestHour(forecast, pmTime, "PM") : null;
  const delta = am && pm ? pm.score - am.score : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Commute Mode</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Your morning ride out and evening ride home, side by side. The delta tells you
            whether to bring rain gear "just in case."
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:max-w-md">
        <label className="block">
          <span className="text-xs text-gray-400">Morning leave</span>
          <input
            type="time"
            value={amTime}
            onChange={(e) => setAmTime(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-400">Evening leave</span>
          <input
            type="time"
            value={pmTime}
            onChange={(e) => setPmTime(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
          />
        </label>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}
      {loading && <div className="card h-48 animate-pulse bg-gray-800" />}

      {!loading && am && pm && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CommuteCard title="Morning ride to work" time={amTime} hour={am} icon="🌅" />
            <CommuteCard title="Evening ride home" time={pmTime} hour={pm} icon="🌇" />
          </div>

          <div className="mt-6 card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">PM vs AM</h2>
            <div className="mt-2 flex items-center gap-4">
              <span className={`text-3xl font-bold tabular-nums ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-amber-400" : "text-gray-300"}`}>
                {delta > 0 ? "+" : ""}{delta.toFixed(1)}
              </span>
              <p className="text-sm text-gray-300">
                {delta > 1
                  ? "Evening looks notably better — no rush to leave early."
                  : delta < -1
                  ? "Evening drops off — bring an extra layer or rain shell."
                  : "Conditions hold steady through the day."}
              </p>
            </div>
          </div>
        </>
      )}

      {!loading && !forecast && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">🚲</div>
          <p className="text-gray-400">Pick a location to see your commute forecast.</p>
        </div>
      )}
    </div>
  );
}

function CommuteCard({ title, time, hour, icon }: { title: string; time: string; hour: HourForecast; icon: string }) {
  const t = new Date(hour.timestamp);
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
          <h2 className="mt-1 text-xl font-bold text-white">{time}</h2>
          <p className="text-xs text-gray-500">Forecast for {t.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full border-4"
          style={{ borderColor: hour.color }}
        >
          <span className="text-3xl font-bold" style={{ color: hour.color }}>{hour.score.toFixed(1)}</span>
        </div>
        <div>
          <div className="text-base font-bold uppercase tracking-wide" style={{ color: hour.color }}>{hour.label}</div>
          <p className="text-sm text-gray-400">{Math.round(hour.weather.tempF)}°F · {Math.round(hour.weather.windSpeedMph)} mph wind · {Math.round(hour.weather.precipProb * 100)}% rain</p>
        </div>
      </div>
    </div>
  );
}

function nearestHour(forecast: HourForecast[], timeStr: string, half: "AM" | "PM"): HourForecast | null {
  const [hh, mm] = timeStr.split(":").map(Number);
  const target = hh * 60 + (mm || 0);
  let best: HourForecast | null = null;
  let bestGap = Infinity;
  for (const f of forecast) {
    const d = new Date(f.timestamp);
    const minute = d.getHours() * 60 + d.getMinutes();
    const isMorning = d.getHours() < 12;
    if (half === "AM" && !isMorning) continue;
    if (half === "PM" && isMorning) continue;
    const gap = Math.abs(minute - target);
    if (gap < bestGap) {
      bestGap = gap;
      best = f;
    }
  }
  return best;
}
