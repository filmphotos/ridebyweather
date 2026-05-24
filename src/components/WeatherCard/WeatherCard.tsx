"use client";

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
}: WeatherCardProps) {
  const stats = [
    { label: "Temp", value: formatTemp(tempF), sub: `Feels ${formatTemp(feelsLikeF)}`, icon: "🌡️" },
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
        <span className="text-sm capitalize text-gray-400">{condition}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
