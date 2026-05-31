"use client";

import { useEffect, useState } from "react";
import ProBadge from "@/components/Pro/ProBadge";
import ProPaywall from "@/components/Pro/ProPaywall";

interface HourSlot {
  timestamp: string;
  score: number;
  label: string;
  color: string;
  windDirDeg: number;
  windSpeedMph: number;
  tempF: number;
  precipProb: number;
  condition: string;
  windType: "headwind" | "tailwind" | "crosswind" | "none";
  windPercent: number;
}

interface ForecastResponse {
  forecast: HourSlot[];
  distanceMi: number;
  best: HourSlot;
  worst: HourSlot;
}

interface Props {
  // Polyline waypoints in [lng, lat] order — matches the route shape used by
  // the existing RouteMap component.
  waypoints: [number, number][];
}

function fmtHour12(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const hr12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h < 12 ? "AM" : "PM";
  const min = m < 10 ? `0${m}` : `${m}`;
  return m === 0 ? `${hr12} ${ampm}` : `${hr12}:${min} ${ampm}`;
}

function fmtDayLabel(d: Date, now: Date): string {
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return "Today";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  ) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

// 24-hour route forecast strip. Each bar is colored by Ride Score; click
// to inspect the conditions at that hour. Pro-gated — free users see a
// paywall card instead.
export default function RouteForecastTimeline({ waypoints }: Props) {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    setPaywall(false);
    setSelectedIdx(null);
    if (waypoints.length < 2) return;

    let cancelled = false;
    setLoading(true);
    fetch("/api/route-forecast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waypoints }),
    })
      .then(async (r) => {
        if (r.status === 402) {
          if (!cancelled) setPaywall(true);
          return null;
        }
        if (!r.ok) {
          throw new Error(`Forecast failed: ${r.status}`);
        }
        return r.json();
      })
      .then((j) => {
        if (cancelled || !j) return;
        setData(j as ForecastResponse);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Forecast failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [waypoints]);

  if (paywall) {
    return (
      <div className="mt-6">
        <ProPaywall
          feature="Route Weather Overlay"
          description="See a 24-hour timeline of Ride Scores for THIS route — find the best departure window before you commit to a tough day."
          limitLine="Free shows the current-wind overlay. Pro adds the 24-hour timeline."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card mt-6">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            24-hour route forecast
          </h3>
          <ProBadge />
        </div>
        <div className="h-20 animate-pulse rounded-lg bg-gray-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card mt-6 border-red-500/30 bg-red-500/5">
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const now = new Date();
  const selected =
    selectedIdx !== null && data.forecast[selectedIdx]
      ? data.forecast[selectedIdx]
      : data.best;
  const selectedDate = new Date(selected.timestamp);
  const bestDate = new Date(data.best.timestamp);

  return (
    <div className="card mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            24-hour route forecast
          </h3>
          <ProBadge />
        </div>
        <div className="text-xs text-gray-400">
          Route: <span className="text-white">{data.distanceMi.toFixed(1)} mi</span>
        </div>
      </div>

      {/* Best window callout */}
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-base font-bold tabular-nums"
          style={{ backgroundColor: `${data.best.color}22`, color: data.best.color }}
        >
          {data.best.score.toFixed(1)}
        </div>
        <div className="min-w-0 text-sm">
          <div className="font-semibold text-white">
            Best departure: {fmtDayLabel(bestDate, now)} {fmtHour12(bestDate)}
          </div>
          <div className="text-xs text-gray-400">
            {data.best.label} — {Math.round(data.best.tempF)}°F,{" "}
            {Math.round(data.best.windSpeedMph)} mph {data.best.windType} (
            {Math.round(data.best.windPercent)}%)
          </div>
        </div>
      </div>

      {/* 24-bar timeline */}
      <div className="grid grid-cols-12 gap-0.5 sm:grid-cols-24 sm:gap-1">
        {data.forecast.map((h, i) => {
          const d = new Date(h.timestamp);
          const isSelected = selectedIdx === i;
          return (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              title={`${fmtHour12(d)} · ${h.score.toFixed(1)} (${h.label})`}
              className={`relative flex flex-col items-center gap-1 rounded-sm transition-all ${
                isSelected ? "ring-2 ring-white/60" : "hover:brightness-110"
              }`}
            >
              <div className="text-[9px] text-gray-500 tabular-nums">
                {d.getHours() % 6 === 0 ? fmtHour12(d).replace(" ", "") : ""}
              </div>
              <div
                className="w-full rounded-sm"
                style={{
                  backgroundColor: h.color,
                  height: `${8 + h.score * 4}px`,
                  opacity: isSelected ? 1 : 0.85,
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Selected hour detail */}
      <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-white">
            {fmtDayLabel(selectedDate, now)} {fmtHour12(selectedDate)}
            {selectedIdx === null && (
              <span className="ml-2 text-xs font-normal text-emerald-300">(best)</span>
            )}
          </div>
          <div
            className="rounded-md px-2 py-0.5 text-xs font-bold tabular-nums"
            style={{ backgroundColor: `${selected.color}22`, color: selected.color }}
          >
            {selected.score.toFixed(1)} {selected.label}
          </div>
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          <Mini label="Temp" value={`${Math.round(selected.tempF)}°F`} />
          <Mini label="Wind" value={`${Math.round(selected.windSpeedMph)} mph`} />
          <Mini
            label="Direction"
            value={selected.windType === "none" ? "calm" : selected.windType}
          />
          <Mini label="Rain" value={`${Math.round(selected.precipProb * 100)}%`} />
        </dl>
      </div>

      <p className="mt-3 text-[11px] text-gray-500">
        Each bar is a Ride Score for this exact route at that hour. Click a bar to inspect.
      </p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-500 capitalize">{label}</span>
      <span className="text-gray-200 tabular-nums capitalize">{value}</span>
    </div>
  );
}
