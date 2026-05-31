"use client";

import { useCallback, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import { pickLube, type LubeRec } from "@/lib/chainLube";

interface DailyRow {
  date: string;
  precipProb: number;
  tempMaxF: number;
  condition: string;
}

const LUBE_COLOR: Record<string, string> = {
  wet: "#3b82f6",
  dry: "#f59e0b",
  ceramic: "#a855f7",
};

export default function ChainLubeClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [daily, setDaily] = useState<DailyRow[] | null>(null);
  const [rec, setRec] = useState<LubeRec | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather/daily?lat=${loc.lat}&lng=${loc.lng}&days=7`);
      if (!res.ok) throw new Error("Failed to load forecast");
      const json = await res.json();
      const rows: DailyRow[] = json.daily.map((d: { date: string; precipProb: number; tempMaxF: number; condition: string }) => ({
        date: typeof d.date === "string" ? d.date : new Date(d.date).toISOString(),
        precipProb: d.precipProb,
        tempMaxF: d.tempMaxF,
        condition: d.condition,
      }));
      setDaily(rows);
      setRec(pickLube(rows.map((r) => ({ precipProb: r.precipProb }))));
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
          <h1 className="text-2xl font-bold text-white">Chain Lube Selector</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Match your chain lube to the week's weather. Cyclists argue about this — we let the
            forecast decide.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}
      {loading && <div className="card h-48 animate-pulse bg-gray-800" />}

      {!loading && rec && daily && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Recommended lube</h2>
            <div className="mt-4 flex items-center gap-4">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full border-4 text-3xl"
                style={{ borderColor: LUBE_COLOR[rec.pick] }}
              >
                {rec.pick === "wet" ? "💧" : rec.pick === "dry" ? "☀️" : "✨"}
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{rec.label}</div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
                  {rec.wetDays} wet / {rec.totalDays} day forecast
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-300">{rec.reason}</p>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">7-day precip</h2>
            <ul className="mt-3 space-y-2">
              {daily.map((d) => {
                const day = new Date(d.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
                const wet = d.precipProb >= 0.5;
                return (
                  <li key={d.date} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{day}</span>
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-24 rounded-full bg-gray-800 overflow-hidden">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${Math.round(d.precipProb * 100)}%`, backgroundColor: wet ? "#3b82f6" : "#22c55e" }}
                        />
                      </span>
                      <span className={`tabular-nums ${wet ? "text-blue-400" : "text-gray-400"}`}>
                        {Math.round(d.precipProb * 100)}%
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {!loading && !daily && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">⚙️</div>
          <p className="text-gray-400">Pick a location to get a lube recommendation.</p>
        </div>
      )}
    </div>
  );
}
