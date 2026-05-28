"use client";

import { useCallback, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import RideScoreGauge from "@/components/RideScore/RideScoreGauge";
import RideScoreBreakdown from "@/components/RideScore/RideScoreBreakdown";
import WeatherCard from "@/components/WeatherCard/WeatherCard";
import { BIKE_PROFILES, type BikeType } from "@/lib/bikeProfiles";

interface RideScoreData {
  score: number;
  label: string;
  color: string;
  explanation: string;
  breakdown: {
    wind: number;
    temperature: number;
    precipitation: number;
    gustFactor: number;
    humidity: number;
    safetyOverride: number;
    windType: "headwind" | "tailwind" | "crosswind" | "none";
    windPercent: number;
    explanation: string;
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

export default function RideScoreClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [data, setData] = useState<RideScoreData | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [bike, setBike] = useState<BikeType>("road");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async (loc: PickedLocation, bikeType: BikeType) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ride-score?lat=${loc.lat}&lng=${loc.lng}&bikeType=${bikeType}`);
      if (!res.ok) throw new Error("Failed to fetch ride score");
      setData(await res.json());
      setFetchedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = useCallback(
    (loc: PickedLocation) => {
      setLocation(loc);
      fetchScore(loc, bike);
    },
    [fetchScore, bike]
  );

  const changeBike = (b: BikeType) => {
    setBike(b);
    if (location) fetchScore(location, b);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ride Score</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            One 0–10 number that combines wind, temperature, precipitation, gusts, and humidity —
            so you know at a glance whether today&apos;s a ride day.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">Bike:</span>
        <div className="inline-flex flex-wrap rounded-lg border border-gray-800 bg-gray-900 p-0.5 text-xs">
          {BIKE_PROFILES.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => changeBike(b.id)}
              title={b.blurb}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                bike === b.id ? "bg-sky-500 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {b.emoji} {b.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}

      {loading && <div className="card h-64 animate-pulse bg-gray-800" />}

      {!loading && data && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="card flex flex-col items-center justify-center py-10 md:col-span-1">
            <RideScoreGauge
              score={data.score}
              label={data.label}
              hexColor={data.color}
              explanation={data.explanation}
              size="lg"
            />
            <div className="mt-6 w-full">
              <RideScoreBreakdown breakdown={data.breakdown} />
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
          <div className="text-6xl">🌡️</div>
          <p className="text-gray-400">Allow location or search a city to get your Ride Score.</p>
        </div>
      )}
    </div>
  );
}
