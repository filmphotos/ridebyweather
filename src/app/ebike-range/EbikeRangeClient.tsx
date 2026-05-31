"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import { estimateRange, headwindComponent, type Assist } from "@/lib/ebikeRange";

interface Weather {
  windDirDeg: number;
  windSpeedMph: number;
  tempF: number;
}

const ASSIST_LEVELS: { id: Assist; label: string }[] = [
  { id: "eco", label: "Eco" },
  { id: "tour", label: "Tour" },
  { id: "sport", label: "Sport" },
  { id: "turbo", label: "Turbo" },
];

interface Saved {
  batteryWh: number | "";
  manufacturerRangeMi: number | "";
  riderWeightLb: number | "";
  assist: Assist;
  routeBearing: number | "";
  elevationGainFt: number | "";
}

export default function EbikeRangeClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [batteryWh, setBatteryWh] = useState<number | "">(500);
  const [manufacturerRangeMi, setManufacturerRangeMi] = useState<number | "">(50);
  const [riderWeightLb, setRiderWeightLb] = useState<number | "">(180);
  const [assist, setAssist] = useState<Assist>("tour");
  const [routeBearing, setRouteBearing] = useState<number | "">(0);
  const [elevationGainFt, setElevationGainFt] = useState<number | "">(500);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rbw_ebike_range");
      if (!raw) return;
      const s = JSON.parse(raw) as Saved;
      if (s.batteryWh != null) setBatteryWh(s.batteryWh);
      if (s.manufacturerRangeMi != null) setManufacturerRangeMi(s.manufacturerRangeMi);
      if (s.riderWeightLb != null) setRiderWeightLb(s.riderWeightLb);
      if (s.assist) setAssist(s.assist);
      if (s.routeBearing != null) setRouteBearing(s.routeBearing);
      if (s.elevationGainFt != null) setElevationGainFt(s.elevationGainFt);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "rbw_ebike_range",
        JSON.stringify({ batteryWh, manufacturerRangeMi, riderWeightLb, assist, routeBearing, elevationGainFt })
      );
    } catch {}
  }, [batteryWh, manufacturerRangeMi, riderWeightLb, assist, routeBearing, elevationGainFt]);

  const load = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ride-score?lat=${loc.lat}&lng=${loc.lng}`);
      if (!res.ok) throw new Error("Failed to load conditions");
      const json = await res.json();
      setWeather({
        windDirDeg: json.weather.windDirDeg,
        windSpeedMph: json.weather.windSpeedMph,
        tempF: json.weather.tempF,
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

  const result = useMemo(() => {
    if (!weather) return null;
    const bearing = typeof routeBearing === "number" ? routeBearing : 0;
    const head = headwindComponent(weather.windDirDeg, weather.windSpeedMph, bearing);
    return estimateRange({
      batteryWh: typeof batteryWh === "number" ? batteryWh : 500,
      manufacturerRangeMi: typeof manufacturerRangeMi === "number" ? manufacturerRangeMi : 50,
      riderWeightLb: typeof riderWeightLb === "number" ? riderWeightLb : 180,
      assist,
      tempF: weather.tempF,
      windHeadwindMph: head,
      elevationGainFt: typeof elevationGainFt === "number" ? elevationGainFt : 0,
    });
  }, [weather, batteryWh, manufacturerRangeMi, riderWeightLb, assist, routeBearing, elevationGainFt]);

  const head = weather && typeof routeBearing === "number" ? headwindComponent(weather.windDirDeg, weather.windSpeedMph, routeBearing) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">E-Bike Range Calculator</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Real-world miles, not the brochure number. Folds in today&apos;s wind, temperature,
            your weight, the assist level you ride in, and total climbing.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Your bike & plan</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <NumberField label="Battery (Wh)" value={batteryWh} setValue={setBatteryWh} min={250} max={1500} step={25} />
            <NumberField label="Spec range (mi)" value={manufacturerRangeMi} setValue={setManufacturerRangeMi} min={15} max={150} step={5} />
            <NumberField label="Rider + cargo (lb)" value={riderWeightLb} setValue={setRiderWeightLb} min={100} max={400} step={5} />
            <NumberField label="Climbing (ft)" value={elevationGainFt} setValue={setElevationGainFt} min={0} max={10000} step={100} />
          </div>

          <div className="mt-4">
            <span className="text-sm text-gray-300">Assist level</span>
            <div className="mt-2 inline-flex w-full rounded-lg border border-gray-800 bg-gray-900 p-0.5 text-sm">
              {ASSIST_LEVELS.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setAssist(it.id)}
                  className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
                    assist === it.id ? "bg-sky-500 text-white" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center justify-between text-sm text-gray-300">
              <span>Route bearing (out)</span>
              <span className="font-semibold text-white tabular-nums">{typeof routeBearing === "number" ? routeBearing : 0}° {bearingLabel(typeof routeBearing === "number" ? routeBearing : 0)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={359}
              step={15}
              value={typeof routeBearing === "number" ? routeBearing : 0}
              onChange={(e) => setRouteBearing(Number(e.target.value))}
              className="mt-2 w-full accent-sky-500"
            />
            <p className="mt-1 text-[11px] text-gray-500">0° = North, 90° = East. The direction you&apos;ll head out toward your destination.</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Estimated range</h2>
          {loading && <div className="mt-4 h-32 animate-pulse rounded-lg bg-gray-800" />}

          {!loading && weather && result && (
            <>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-5xl font-bold text-sky-400 tabular-nums">{result.estimatedMi}</span>
                <span className="text-base text-gray-400">mi</span>
              </div>
              <div className="text-xs text-gray-500">
                {Math.round(result.pctOfSpec * 100)}% of spec · {result.whPerMi} Wh/mi
              </div>

              <p className="mt-3 text-sm text-gray-300">{result.caveat}</p>

              <div className="mt-4 border-t border-gray-800 pt-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Drains & boosts</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {result.breakdown.map((b) => (
                    <li key={b.factor} className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-gray-200">{b.factor}</div>
                        <div className="text-xs text-gray-500">{b.note}</div>
                      </div>
                      {b.delta > 0 && (
                        <span className={`text-xs font-semibold tabular-nums ${b.delta < 1 ? "text-red-400" : b.delta > 1 ? "text-emerald-400" : "text-gray-400"}`}>
                          ×{b.delta.toFixed(2)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-4 text-[11px] text-gray-500">
                Headwind component today: {head > 0 ? `+${head} mph headwind` : head < 0 ? `${-head} mph tailwind` : "pure crosswind"}.
              </p>
            </>
          )}

          {!loading && !weather && (
            <p className="mt-4 text-sm text-gray-400">Pick a location to fold today&apos;s wind and temperature into the range.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, value, setValue, min, max, step }: { label: string; value: number | ""; setValue: (n: number | "") => void; min: number; max: number; step: number }) {
  return (
    <div>
      <label className="text-xs text-gray-400">{label}</label>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value === "" ? "" : String(value)}
        onChange={(e) => setValue(e.target.value === "" ? "" : Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
      />
    </div>
  );
}

function bearingLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}
