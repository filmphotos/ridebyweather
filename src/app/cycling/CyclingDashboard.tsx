"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import RideScoreGauge from "@/components/RideScore/RideScoreGauge";
import RideScoreBreakdown from "@/components/RideScore/RideScoreBreakdown";
import WeatherCard from "@/components/WeatherCard/WeatherCard";
import WeatherAvatar from "@/components/WeatherAvatar/WeatherAvatar";
import ForecastTimeline from "@/components/Forecast/ForecastTimeline";
import NearbyPartners from "@/components/Partners/NearbyPartners";
import type { GeoResult } from "@/app/api/geocode/route";

const RouteMap = dynamic(() => import("@/components/RouteMap/RouteMap"), { ssr: false });

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

const AUTO_REFRESH_MS = 60_000; // refresh live weather every 60s

export default function CyclingDashboard() {
  const [location, setLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [data, setData] = useState<RideScoreData | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gender, setGender] = useState<"male" | "female">("male");

  useEffect(() => {
    const saved = localStorage.getItem("rbw_gender");
    if (saved === "male" || saved === "female") setGender(saved);
  }, []);

  const updateGender = (g: "male" | "female") => {
    setGender(g);
    localStorage.setItem("rbw_gender", g);
  };

  // Geocode search state
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRideScore = useCallback(async (lat: number, lng: number, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ride-score?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error("Failed to fetch ride score");
      setData(await res.json());
      setFetchedAt(Date.now());
    } catch (err) {
      if (!opts?.silent) setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  // Auto-refresh weather (incl. real-feel) every 60s while a location is set
  useEffect(() => {
    if (!location) return;
    const id = setInterval(() => {
      fetchRideScore(location.lat, location.lng, { silent: true });
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [location, fetchRideScore]);

  const detectLocation = useCallback(async () => {
    const tryBrowserGeo = (): Promise<{ lat: number; lng: number } | null> =>
      new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        const timer = setTimeout(() => resolve(null), 4000);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timer);
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          () => {
            clearTimeout(timer);
            resolve(null);
          },
          { timeout: 4000, maximumAge: 600_000 }
        );
      });

    const browserLoc = await tryBrowserGeo();
    if (browserLoc) {
      setLocation(browserLoc);
      fetchRideScore(browserLoc.lat, browserLoc.lng);
      return;
    }

    try {
      const res = await fetch("/api/geo-ip");
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.lat === "number" && typeof data.lng === "number") {
        const loc = { lat: data.lat, lng: data.lng, name: data.name };
        setLocation(loc);
        fetchRideScore(loc.lat, loc.lng);
      }
    } catch {
      // user can fall back to manual search
    }
  }, [fetchRideScore]);

  useEffect(() => { detectLocation(); }, [detectLocation]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced geocode search
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
        const json = await res.json();
        setSuggestions(json.results ?? []);
        setShowSuggestions(true);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const selectLocation = (result: GeoResult) => {
    const loc = { lat: result.lat, lng: result.lng, name: result.display };
    setLocation(loc);
    setQuery(result.display);
    setSuggestions([]);
    setShowSuggestions(false);
    fetchRideScore(loc.lat, loc.lng);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cycling Dashboard</h1>
          {location && (
            <p className="text-sm text-gray-500 mt-1">
              {location.name ?? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
          {/* Location search with autocomplete */}
          <div ref={searchRef} className="relative w-full sm:w-60">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Enter city or address…"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 pl-4 pr-8 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-sky-500"
              />
              {searchLoading && (
                <div className="absolute right-2 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-sky-400" />
              )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 shadow-xl overflow-hidden">
                {suggestions.map((r, i) => (
                  <li key={i}>
                    <button
                      onMouseDown={() => selectLocation(r)}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-gray-800 transition-colors"
                    >
                      <span className="font-medium">{r.name}</span>
                      {r.display !== r.name && (
                        <span className="ml-1.5 text-gray-500 text-xs">
                          {r.display.replace(r.name + ", ", "")}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={detectLocation} className="btn-secondary text-sm px-4 py-2 whitespace-nowrap flex-1 sm:flex-none">
              📍 My Location
            </button>
            <button
              onClick={() => location && fetchRideScore(location.lat, location.lng)}
              disabled={!location || loading}
              className="btn-primary text-sm px-4 py-2 flex-1 sm:flex-none"
            >
              {loading ? "…" : "Refresh"}
            </button>
            <Link
              href="/ride"
              className="btn-primary text-sm px-4 py-2 flex-1 sm:flex-none whitespace-nowrap text-center bg-red-600 hover:bg-red-500"
            >
              ▶ Start Ride
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse h-48 bg-gray-800" />
          ))}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Ride Score */}
          <div className="card flex flex-col items-center justify-center py-10 lg:col-span-1">
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

          {/* Right column */}
          <div className="flex flex-col gap-6 lg:col-span-2">
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
            <div className="flex items-center justify-end gap-2">
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
            <WeatherAvatar
              tempF={data.weather.tempF}
              precipProb={data.weather.precipProb}
              windSpeedMph={data.weather.windSpeedMph}
              gender={gender}
            />
          </div>

          {/* Forecast */}
          {location && (
            <div className="lg:col-span-3">
              <ForecastTimeline lat={location.lat} lng={location.lng} />
            </div>
          )}

          {/* Route Wind Planner + Nearby Shops */}
          {location && (
            <div className="lg:col-span-2">
              <RouteMap
                lat={location.lat}
                lng={location.lng}
                windDirDeg={data.weather.windDirDeg}
                windSpeedMph={data.weather.windSpeedMph}
              />
            </div>
          )}
          {location && (
            <div className="lg:col-span-1">
              <NearbyPartners lat={location.lat} lng={location.lng} sport="cycling" />
            </div>
          )}
        </div>
      )}

      {!loading && !data && !error && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="text-6xl">🚴</div>
          <h2 className="text-xl font-semibold text-white">Ready to check conditions?</h2>
          <p className="text-gray-400">Allow location access or search a city to get your Ride Score.</p>
          <button onClick={detectLocation} className="btn-primary">Use My Location</button>
        </div>
      )}
    </div>
  );
}
