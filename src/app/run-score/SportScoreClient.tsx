"use client";

import { useCallback, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import WeatherCard from "@/components/WeatherCard/WeatherCard";

interface RunScoreData {
  score: number;
  label: string;
  color: string;
  explanation: string;
  breakdown: {
    temperature: number;
    humidity: number;
    heatIndex: number;
    precipitation: number;
    wind: number;
    airQuality: number;
  };
  weather: {
    tempF: number;
    feelsLikeF: number;
    humidity: number;
    windSpeedMph: number;
    windGustMph: number;
    windDirDeg: number;
    precipProb: number;
    condition: string;
  };
}

const BREAKDOWN_FACTORS = [
  { key: "temperature", label: "Temperature", icon: "🌡️", weight: "35%" },
  { key: "humidity", label: "Humidity", icon: "💧", weight: "20%" },
  { key: "airQuality", label: "Air Quality", icon: "🌬️", weight: "15%" },
  { key: "precipitation", label: "Rain", icon: "🌧️", weight: "15%" },
  { key: "heatIndex", label: "Heat Index", icon: "🔥", weight: "10%" },
  { key: "wind", label: "Wind", icon: "💨", weight: "5%" },
] as const;

export default function SportScoreClient({ variant }: { variant: "running" | "walking" }) {
  const isWalking = variant === "walking";
  const scoreName = isWalking ? "Walk Score" : "Run Score";
  const emoji = isWalking ? "🚶" : "🏃";

  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [data, setData] = useState<RunScoreData | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/run-score?lat=${loc.lat}&lng=${loc.lng}`);
      if (!res.ok) throw new Error(`Failed to fetch ${isWalking ? "walk" : "run"} score`);
      setData(await res.json());
      setFetchedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [isWalking]);

  const handleSelect = useCallback(
    (loc: PickedLocation) => {
      setLocation(loc);
      fetchScore(loc);
    },
    [fetchScore]
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{scoreName}</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            One 0–10 number tuned for {isWalking ? "walking" : "running"} — heat index, humidity, air
            quality, and precipitation matter most on foot.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}

      {loading && <div className="card h-64 animate-pulse bg-gray-800" />}

      {!loading && data && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="card flex flex-col items-center justify-center py-10 md:col-span-1">
            <div
              className="flex h-40 w-40 flex-col items-center justify-center rounded-full border-8"
              style={{ borderColor: data.color }}
            >
              <span className="text-5xl font-bold" style={{ color: data.color }}>
                {data.score.toFixed(1)}
              </span>
              <span className="mt-1 text-xs font-bold uppercase tracking-widest" style={{ color: data.color }}>
                {data.label}
              </span>
            </div>
            <p className="mt-4 text-sm text-gray-400 text-center max-w-xs">{data.explanation}</p>

            <div className="mt-6 w-full space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Score Breakdown</p>
              {BREAKDOWN_FACTORS.map(({ key, label, icon, weight }) => {
                const val = data.breakdown[key];
                const pct = (val / 10) * 100;
                const barColor = val >= 7 ? "#22c55e" : val >= 5 ? "#eab308" : val >= 3 ? "#f97316" : "#ef4444";
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-5 text-sm">{icon}</span>
                    <span className="w-24 text-xs text-gray-400 truncate">{label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-800">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                    <span className="w-8 text-right text-xs text-gray-500">{weight}</span>
                    <span className="w-7 text-right text-xs font-semibold" style={{ color: barColor }}>
                      {val.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2">
            <WeatherCard
              tempF={data.weather.tempF}
              feelsLikeF={data.weather.feelsLikeF}
              humidity={data.weather.humidity}
              windSpeedMph={data.weather.windSpeedMph}
              windGustMph={data.weather.windGustMph}
              windDirDeg={data.weather.windDirDeg}
              precipProb={data.weather.precipProb}
              condition={data.weather.condition}
              fetchedAt={fetchedAt ?? undefined}
            />
          </div>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">{emoji}</div>
          <p className="text-gray-400">Allow location or search a city to get your {scoreName}.</p>
        </div>
      )}
    </div>
  );
}
