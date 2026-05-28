"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import LocationSearch, { type PickedLocation } from "@/components/LocationSearch/LocationSearch";

interface ScoreData {
  score: number;
  label: string;
  color: string;
  explanation: string;
  weather: {
    tempF: number;
    feelsLikeF: number;
    humidity: number;
    windSpeedMph: number;
    windGustMph: number;
    precipProb: number;
    condition: string;
  };
}

interface Side {
  loc: PickedLocation | null;
  data: ScoreData | null;
  loading: boolean;
}

const EMPTY: Side = { loc: null, data: null, loading: false };

export default function CompareClient() {
  const [a, setA] = useState<Side>(EMPTY);
  const [b, setB] = useState<Side>(EMPTY);

  const fetchSide = useCallback(
    async (loc: PickedLocation, setSide: Dispatch<SetStateAction<Side>>) => {
      setSide({ loc, data: null, loading: true });
      try {
        const res = await fetch(`/api/ride-score?lat=${loc.lat}&lng=${loc.lng}`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setSide({ loc, data, loading: false });
      } catch {
        setSide({ loc, data: null, loading: false });
      }
    },
    []
  );

  const delta = a.data && b.data ? a.data.score - b.data.score : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Compare Two Locations</h1>
        <p className="mt-1 text-sm text-gray-400 max-w-xl">
          Side-by-side Ride Scores. Settle the &ldquo;is it nicer at the coast today&rdquo; debate in five seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <CompareCard
          title="Location A"
          side={a}
          onSelect={(loc) => fetchSide(loc, setA)}
          autoDetect
          accent="#0ea5e9"
        />
        <CompareCard
          title="Location B"
          side={b}
          onSelect={(loc) => fetchSide(loc, setB)}
          accent="#a855f7"
        />
      </div>

      {delta != null && a.data && b.data && (
        <div className="mt-6 card text-center">
          {Math.abs(delta) < 0.3 ? (
            <p className="text-gray-200">
              <span className="font-bold text-white">Basically a toss-up.</span> Both score within 0.3 of each other
              right now.
            </p>
          ) : (
            <p className="text-gray-200">
              <span className="font-bold" style={{ color: delta > 0 ? "#0ea5e9" : "#a855f7" }}>
                {delta > 0 ? a.loc?.name ?? "Location A" : b.loc?.name ?? "Location B"}
              </span>{" "}
              wins by <span className="font-bold text-white">{Math.abs(delta).toFixed(1)}</span> points.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CompareCard({
  title,
  side,
  onSelect,
  autoDetect,
  accent,
}: {
  title: string;
  side: Side;
  onSelect: (loc: PickedLocation) => void;
  autoDetect?: boolean;
  accent: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
        {side.loc?.name && <span className="text-xs text-gray-500 truncate max-w-[55%]">{side.loc.name}</span>}
      </div>

      <LocationSearch onSelect={onSelect} autoDetect={!!autoDetect} />

      <div className="mt-4">
        {side.loading && <div className="h-32 animate-pulse rounded-lg bg-gray-800" />}

        {!side.loading && side.data && (
          <div>
            <div className="flex items-center gap-4">
              <div
                className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-4"
                style={{ borderColor: side.data.color }}
              >
                <span className="text-2xl font-bold" style={{ color: side.data.color }}>
                  {side.data.score.toFixed(1)}
                </span>
              </div>
              <div>
                <div className="text-sm font-bold uppercase tracking-wide" style={{ color: side.data.color }}>
                  {side.data.label}
                </div>
                <div className="mt-1 text-xs text-gray-400 capitalize">{side.data.weather.condition}</div>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-800 pt-3 text-xs">
              <Mini label="Temp" value={`${Math.round(side.data.weather.tempF)}°F`} />
              <Mini label="Feels" value={`${Math.round(side.data.weather.feelsLikeF)}°F`} />
              <Mini label="Wind" value={`${Math.round(side.data.weather.windSpeedMph)} mph`} />
              <Mini label="Gust" value={`${Math.round(side.data.weather.windGustMph)} mph`} />
              <Mini label="Precip" value={`${Math.round(side.data.weather.precipProb * 100)}%`} />
              <Mini label="Humidity" value={`${side.data.weather.humidity}%`} />
            </dl>
            <p className="mt-3 text-xs text-gray-500">{side.data.explanation}</p>
          </div>
        )}

        {!side.loading && !side.data && (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-800 text-sm text-gray-600">
            <span style={{ color: accent }}>●</span>
            <span className="ml-2">Pick a location to compare</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200">{value}</span>
    </div>
  );
}
