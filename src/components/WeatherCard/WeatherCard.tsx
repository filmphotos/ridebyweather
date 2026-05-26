"use client";

import { useEffect, useState } from "react";
import { formatTemp, formatWind, windDirLabel } from "@/lib/utils";

interface WeatherCardProps {
  tempF: number;
  feelsLikeF: number;
  humidity: number;
  windSpeedMph: number;
  windGustMph: number;
  windDirDeg: number;
  precipProb: number;
  condition: string;
  fetchedAt?: number;
}

function feelsLikeContext(diff: number, feelsLikeF: number): { label: string; color: string } {
  const abs = Math.abs(diff);
  if (abs < 2) {
    if (feelsLikeF >= 90) return { label: "Hot", color: "text-orange-400" };
    if (feelsLikeF <= 32) return { label: "Freezing", color: "text-sky-300" };
    return { label: "Matches air", color: "text-gray-400" };
  }
  if (diff > 0) {
    return {
      label: feelsLikeF >= 90 ? `Feels hotter +${Math.round(diff)}°` : `Warmer +${Math.round(diff)}°`,
      color: feelsLikeF >= 90 ? "text-orange-400" : "text-amber-400",
    };
  }
  return {
    label: feelsLikeF <= 32 ? `Feels colder ${Math.round(diff)}°` : `Cooler ${Math.round(diff)}°`,
    color: "text-sky-400",
  };
}

function useLiveAgo(fetchedAt?: number): string | null {
  const [, force] = useState(0);
  useEffect(() => {
    if (!fetchedAt) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [fetchedAt]);

  if (!fetchedAt) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - fetchedAt) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function WeatherCard({
  tempF,
  feelsLikeF,
  humidity,
  windSpeedMph,
  windGustMph,
  windDirDeg,
  precipProb,
  condition,
  fetchedAt,
}: WeatherCardProps) {
  const diff = feelsLikeF - tempF;
  const ctx = feelsLikeContext(diff, feelsLikeF);
  const ago = useLiveAgo(fetchedAt);

  const stats = [
    { label: "Wind", value: formatWind(windSpeedMph), sub: `${windDirLabel(windDirDeg)} · Gusts ${formatWind(windGustMph)}`, icon: "🌬️" },
    { label: "Humidity", value: `${humidity}%`, sub: humidity > 80 ? "High" : humidity > 60 ? "Moderate" : "Comfortable", icon: "💧" },
    { label: "Rain", value: `${Math.round(precipProb * 100)}%`, sub: precipProb > 0.5 ? "Likely" : precipProb > 0.2 ? "Possible" : "Unlikely", icon: "🌧️" },
  ];

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
          Current Conditions
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="capitalize text-gray-400">{condition}</span>
          {ago && (
            <>
              <span className="text-gray-700">·</span>
              <span className="inline-flex items-center gap-1 text-gray-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {ago}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Hero row: Temp + Real Feel */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-500">
            <span>🌡️</span> Temperature
          </div>
          <div className="mt-1 text-3xl font-bold text-white tabular-nums">
            {formatTemp(tempF)}
          </div>
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-sky-400/80">
            <span>💪</span> Real Feel
          </div>
          <div className="mt-1 text-3xl font-bold text-white tabular-nums">
            {formatTemp(feelsLikeF)}
          </div>
          <div className={`text-[11px] font-medium mt-0.5 ${ctx.color}`}>{ctx.label}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">{s.icon}</span>
            <div>
              <div className="text-lg font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-500">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
