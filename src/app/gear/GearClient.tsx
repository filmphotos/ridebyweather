"use client";

import { useCallback, useEffect, useState } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";
import WeatherAvatar from "@/components/WeatherAvatar/WeatherAvatar";

interface Weather {
  tempF: number;
  feelsLikeF: number;
  precipProb: number;
  windSpeedMph: number;
  condition: string;
}

export default function GearClient() {
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("rbw_gender");
    if (saved === "male" || saved === "female") setGender(saved);
  }, []);

  const updateGender = (g: "male" | "female") => {
    setGender(g);
    localStorage.setItem("rbw_gender", g);
  };

  const fetchWeather = useCallback(async (loc: PickedLocation) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ride-score?lat=${loc.lat}&lng=${loc.lng}`);
      if (!res.ok) throw new Error("Failed to fetch conditions");
      const data = await res.json();
      setWeather(data.weather);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = useCallback(
    (loc: PickedLocation) => {
      setLocation(loc);
      fetchWeather(loc);
    },
    [fetchWeather]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gear Recommendations</h1>
          <p className="mt-1 text-sm text-gray-400 max-w-xl">
            Show up dressed right. The avatar updates to the exact layers, gloves, and eyewear for
            current conditions where you ride.
          </p>
          {location?.name && <p className="mt-1 text-sm text-gray-500">{location.name}</p>}
        </div>
        <LocationSearch onSelect={handleSelect} />
      </div>

      <div className="mb-6 flex items-center gap-2">
        <span className="text-xs text-gray-500">Avatar:</span>
        <div className="inline-flex rounded-lg border border-gray-800 bg-gray-900 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => updateGender("male")}
            className={`px-3 py-1 rounded-md transition-colors ${
              gender === "male" ? "bg-sky-500 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Male
          </button>
          <button
            type="button"
            onClick={() => updateGender("female")}
            className={`px-3 py-1 rounded-md transition-colors ${
              gender === "female" ? "bg-sky-500 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Female
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">{error}</div>
      )}

      {loading && <div className="card h-96 animate-pulse bg-gray-800" />}

      {!loading && weather && (
        <WeatherAvatar
          tempF={weather.tempF}
          precipProb={weather.precipProb}
          windSpeedMph={weather.windSpeedMph}
          gender={gender}
        />
      )}

      {!loading && !weather && !error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-6xl">👕</div>
          <p className="text-gray-400">Allow location or search a city to see what to wear.</p>
        </div>
      )}
    </div>
  );
}
