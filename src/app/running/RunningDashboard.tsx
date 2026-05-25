"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ForecastTimeline from "@/components/Forecast/ForecastTimeline";
import WeatherCard from "@/components/WeatherCard/WeatherCard";
import WeatherAvatar from "@/components/WeatherAvatar/WeatherAvatar";
import NearbyPartners from "@/components/Partners/NearbyPartners";
import type { GeoResult } from "@/app/api/geocode/route";

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
    uvIndex?: number;
    condition: string;
  };
}

const BREAKDOWN_FACTORS = [
  { key: "temperature",  label: "Temperature", icon: "🌡️", weight: "35%" },
  { key: "humidity",     label: "Humidity",    icon: "💧", weight: "20%" },
  { key: "airQuality",   label: "Air Quality", icon: "🌬️", weight: "15%" },
  { key: "precipitation",label: "Rain",        icon: "🌧️", weight: "15%" },
  { key: "heatIndex",    label: "Heat Index",  icon: "🔥", weight: "10%" },
  { key: "wind",         label: "Wind",        icon: "💨", weight: "5%"  },
] as const;

function RunScoreGauge({ score, label, color, explanation }: {
  score: number; label: string; color: string; explanation: string;
}) {
  const pct = (score / 10) * 100;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dashLen = (pct / 100) * circ * 0.75;
  const gap = circ - dashLen;
  const rotation = -225;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-0">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#1f2937" strokeWidth="10"
            strokeDasharray={`${circ * 0.75} ${circ}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${rotation} 60 60)`} />
          <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${dashLen} ${gap}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${rotation} 60 60)`}
            style={{ transition: "stroke-dasharray 0.6s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-white leading-none" style={{ color }}>
            {score.toFixed(1)}
          </span>
          <span className="mt-1 text-xs font-bold tracking-widest uppercase" style={{ color }}>
            {label}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-400 text-center max-w-xs leading-relaxed">{explanation}</p>
    </div>
  );
}

function RunScoreBreakdown({ breakdown }: { breakdown: RunScoreData["breakdown"] }) {
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Score Breakdown</p>
      {BREAKDOWN_FACTORS.map(({ key, label, icon, weight }) => {
        const val = breakdown[key];
        const pct = (val / 10) * 100;
        const barColor =
          val >= 7 ? "#22c55e" : val >= 5 ? "#eab308" : val >= 3 ? "#f97316" : "#ef4444";
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-5 text-sm">{icon}</span>
            <span className="w-28 text-xs text-gray-400 truncate">{label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-gray-800">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
            <span className="w-8 text-right text-xs text-gray-500">{weight}</span>
            <span className="w-7 text-right text-xs font-semibold" style={{ color: barColor }}>
              {val.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function UVBadge({ uvIndex }: { uvIndex?: number }) {
  if (uvIndex === undefined) return null;
  const levels = [
    { max: 2,  label: "Low",       color: "#22c55e" },
    { max: 5,  label: "Moderate",  color: "#eab308" },
    { max: 7,  label: "High",      color: "#f97316" },
    { max: 10, label: "Very High", color: "#ef4444" },
    { max: 99, label: "Extreme",   color: "#a855f7" },
  ];
  const level = levels.find(l => uvIndex <= l.max) ?? levels[4];
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
      <span className="text-xl">☀️</span>
      <div>
        <p className="text-xs text-gray-500">UV Index</p>
        <p className="text-sm font-bold" style={{ color: level.color }}>
          {uvIndex} — {level.label}
        </p>
      </div>
    </div>
  );
}

export default function RunningDashboard() {
  const [location, setLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [data, setData] = useState<RunScoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRunScore = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/run-score?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error("Failed to fetch run score");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        fetchRunScore(loc.lat, loc.lng);
      },
      () => {}
    );
  }, [fetchRunScore]);

  useEffect(() => { detectLocation(); }, [detectLocation]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
    fetchRunScore(loc.lat, loc.lng);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Running Dashboard</h1>
          {location && (
            <p className="text-sm text-gray-500 mt-1">
              {location.name ?? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
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
              onClick={() => location && fetchRunScore(location.lat, location.lng)}
              disabled={!location || loading}
              className="btn-primary text-sm px-4 py-2 flex-1 sm:flex-none"
            >
              {loading ? "…" : "Refresh"}
            </button>
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
          {/* Run Score */}
          <div className="card flex flex-col items-center justify-center py-10 lg:col-span-1">
            <RunScoreGauge
              score={data.score}
              label={data.label}
              color={data.color}
              explanation={data.explanation}
            />
            <div className="mt-6 w-full">
              <RunScoreBreakdown breakdown={data.breakdown} />
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
            />

            <div className="grid grid-cols-2 gap-4">
              <UVBadge uvIndex={data.weather.uvIndex} />

              {/* Humidity detail */}
              <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
                <span className="text-xl">💧</span>
                <div>
                  <p className="text-xs text-gray-500">Humidity</p>
                  <p className="text-sm font-bold text-white">
                    {data.weather.humidity}%
                    <span className="ml-1.5 text-xs font-normal text-gray-500">
                      {data.weather.humidity < 40 ? "Dry" :
                       data.weather.humidity < 60 ? "Comfortable" :
                       data.weather.humidity < 75 ? "Humid" : "Very humid"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <WeatherAvatar
              tempF={data.weather.tempF}
              precipProb={data.weather.precipProb}
              windSpeedMph={data.weather.windSpeedMph}
            />
          </div>

          {/* Forecast */}
          {location && (
            <div className="lg:col-span-3">
              <ForecastTimeline lat={location.lat} lng={location.lng} />
            </div>
          )}

          {/* Nearby running stores */}
          {location && (
            <div className="lg:col-span-1">
              <NearbyPartners lat={location.lat} lng={location.lng} sport="running" />
            </div>
          )}

          {/* Run Score formula explainer */}
          <div className={location ? "lg:col-span-2 card" : "lg:col-span-3 card"}>
            <h3 className="font-semibold text-white mb-4">How Run Score is calculated</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {BREAKDOWN_FACTORS.map(({ key, label, icon, weight }) => {
                const val = data.breakdown[key];
                const barColor =
                  val >= 7 ? "#22c55e" : val >= 5 ? "#eab308" : val >= 3 ? "#f97316" : "#ef4444";
                return (
                  <div key={key} className="rounded-xl border border-gray-800 bg-gray-900/50 p-3 text-center">
                    <div className="text-2xl mb-1">{icon}</div>
                    <p className="text-xs font-semibold text-white">{label}</p>
                    <p className="text-xs text-gray-500 mb-2">{weight}</p>
                    <p className="text-xl font-bold" style={{ color: barColor }}>
                      {val.toFixed(1)}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-gray-600">
              Air Quality uses UV Index as a proxy. A future update will integrate EPA AQI and pollen data.
            </p>
          </div>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="text-6xl">🏃</div>
          <h2 className="text-xl font-semibold text-white">Ready to check conditions?</h2>
          <p className="text-gray-400">Allow location access or search a city to get your Run Score.</p>
          <button onClick={detectLocation} className="btn-primary">Use My Location</button>
        </div>
      )}
    </div>
  );
}
