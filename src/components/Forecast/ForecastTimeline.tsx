"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

interface ForecastHour {
  timestamp: string;
  score: number;
  label: string;
  color: string;
  weather: {
    tempF: number;
    windSpeedMph: number;
    precipProb: number;
    condition: string;
  };
}

interface ForecastTimelineProps {
  lat: number;
  lng: number;
}

export default function ForecastTimeline({ lat, lng }: ForecastTimelineProps) {
  const [forecast, setForecast] = useState<ForecastHour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/weather/forecast?lat=${lat}&lng=${lng}&hours=24`)
      .then((r) => r.json())
      .then((d) => setForecast(d.forecast ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [lat, lng]);

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 w-32 bg-gray-700 rounded mb-4" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-20 w-16 flex-shrink-0 bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!forecast.length) return null;

  return (
    <div className="card">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-500">
        24-Hour Forecast
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700">
        {forecast.map((h) => (
          <div
            key={h.timestamp}
            className="flex-shrink-0 flex flex-col items-center gap-1.5 rounded-xl bg-gray-800/60 px-3 py-3 min-w-[60px]"
            style={{ borderTop: `3px solid ${h.color}` }}
          >
            <span className="text-xs text-gray-500">
              {format(new Date(h.timestamp), "ha")}
            </span>
            <span
              className="text-lg font-black tabular-nums"
              style={{ color: h.color }}
            >
              {h.score.toFixed(1)}
            </span>
            <span className="text-xs text-gray-400">{Math.round(h.weather.tempF)}°</span>
            <span className="text-xs text-gray-500">{Math.round(h.weather.windSpeedMph)}mph</span>
          </div>
        ))}
      </div>
    </div>
  );
}
