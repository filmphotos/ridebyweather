"use client";

import { useState, useCallback, useMemo } from "react";
import Map, { Source, Layer, Marker, NavigationControl } from "react-map-gl";
import type { MapMouseEvent } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Props {
  lat: number;
  lng: number;
  windDirDeg: number;
  windSpeedMph: number;
}

type WindType = "tailwind" | "headwind" | "crosswind";

interface Segment {
  from: [number, number]; // [lng, lat]
  to: [number, number];
  windType: WindType;
  color: string;
}

const WIND_COLORS: Record<WindType, string> = {
  tailwind: "#22c55e",
  headwind: "#ef4444",
  crosswind: "#eab308",
};

function bearingBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1R = (lat1 * Math.PI) / 180;
  const lat2R = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2R);
  const x =
    Math.cos(lat1R) * Math.sin(lat2R) -
    Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function classifySegment(bearing: number, windDirDeg: number): WindType {
  // windDirDeg = direction wind comes FROM; wind vector goes TO (windDirDeg + 180)
  const windVectorDir = (windDirDeg + 180) % 360;
  // delta: 0 = riding with wind (tailwind), 180 = riding into wind (headwind)
  const delta = Math.abs((((bearing - windVectorDir + 540) % 360) - 180));
  if (delta <= 45) return "tailwind";
  if (delta >= 135) return "headwind";
  return "crosswind";
}

export default function RouteMap({ lat, lng, windDirDeg, windSpeedMph }: Props) {
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [reversed, setReversed] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const handleMapClick = useCallback((e: MapMouseEvent) => {
    setWaypoints((prev) => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
  }, []);

  const activeWaypoints = useMemo(
    () => (reversed ? [...waypoints].reverse() : waypoints),
    [waypoints, reversed]
  );

  const segments: Segment[] = useMemo(() => {
    return activeWaypoints.slice(0, -1).map((p, i) => {
      const bearing = bearingBetween(
        activeWaypoints[i][1], activeWaypoints[i][0],
        activeWaypoints[i + 1][1], activeWaypoints[i + 1][0]
      );
      const windType = classifySegment(bearing, windDirDeg);
      return { from: p, to: activeWaypoints[i + 1], windType, color: WIND_COLORS[windType] };
    });
  }, [activeWaypoints, windDirDeg]);

  const routeGeoJSON = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: segments.map((seg) => ({
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: [seg.from, seg.to],
      },
      properties: { color: seg.color },
    })),
  }), [segments]);

  const stats = useMemo(() => {
    if (segments.length === 0) return null;
    const counts = { tailwind: 0, headwind: 0, crosswind: 0 };
    segments.forEach((s) => counts[s.windType]++);
    const total = segments.length;
    return {
      tailwind: Math.round((counts.tailwind / total) * 100),
      headwind: Math.round((counts.headwind / total) * 100),
      crosswind: Math.round((counts.crosswind / total) * 100),
    };
  }, [segments]);

  const recommendation = useMemo(() => {
    if (!stats) return null;
    if (stats.headwind > 50) return { type: "warn" as const, msg: "Mostly headwind — try reversing for a better ride" };
    if (stats.tailwind > 50) return { type: "good" as const, msg: "Mostly tailwind — great direction!" };
    return null;
  }, [stats]);

  // Wind arrow rotation: arrow points where wind is blowing TO
  const windArrowDeg = (windDirDeg + 180) % 360;

  if (!token) {
    return (
      <div className="card">
        <h3 className="font-semibold text-white mb-1">Route Wind Planner</h3>
        <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-700 py-12 text-center">
          <svg className="h-10 w-10 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-300">Mapbox token required</p>
            <p className="mt-1 text-xs text-gray-500">
              Add{" "}
              <code className="rounded bg-gray-800 px-1.5 py-0.5 text-sky-400 text-[11px]">
                NEXT_PUBLIC_MAPBOX_TOKEN=pk_...
              </code>{" "}
              to your .env.local
            </p>
            <p className="mt-1 text-xs text-gray-600">Get a free token at mapbox.com</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white">Route Wind Planner</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {waypoints.length === 0
              ? "Click the map to add waypoints"
              : `${waypoints.length} waypoint${waypoints.length !== 1 ? "s" : ""} · ${segments.length} segment${segments.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          {waypoints.length >= 2 && (
            <button
              onClick={() => setReversed((r) => !r)}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" />
                <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" />
              </svg>
              Reverse
            </button>
          )}
          {waypoints.length > 0 && (
            <button
              onClick={() => { setWaypoints([]); setReversed(false); }}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="mb-4 space-y-2">
          <div className="flex gap-1 h-2 rounded-full overflow-hidden">
            {stats.tailwind > 0 && (
              <div className="bg-green-500 transition-all" style={{ width: `${stats.tailwind}%` }} />
            )}
            {stats.crosswind > 0 && (
              <div className="bg-yellow-500 transition-all" style={{ width: `${stats.crosswind}%` }} />
            )}
            {stats.headwind > 0 && (
              <div className="bg-red-500 transition-all" style={{ width: `${stats.headwind}%` }} />
            )}
          </div>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-green-400">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              {stats.tailwind}% tailwind
            </span>
            <span className="flex items-center gap-1.5 text-yellow-400">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
              {stats.crosswind}% crosswind
            </span>
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              {stats.headwind}% headwind
            </span>
          </div>
          {recommendation && (
            <p className={`text-xs font-medium ${recommendation.type === "good" ? "text-green-400" : "text-amber-400"}`}>
              {recommendation.type === "good" ? "✓" : "⚡"} {recommendation.msg}
            </p>
          )}
        </div>
      )}

      {/* Map container */}
      <div className="relative rounded-xl overflow-hidden" style={{ height: 440 }}>
        <Map
          mapboxAccessToken={token}
          initialViewState={{ longitude: lng, latitude: lat, zoom: 11 }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          onClick={handleMapClick}
          cursor={waypoints.length < 20 ? "crosshair" : "default"}
        >
          <NavigationControl position="bottom-right" />

          {/* Colored route segments */}
          {segments.length > 0 && (
            <Source id="route" type="geojson" data={routeGeoJSON}>
              <Layer
                id="route-shadow"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{
                  "line-color": ["get", "color"],
                  "line-width": 10,
                  "line-opacity": 0.2,
                  "line-blur": 4,
                }}
              />
              <Layer
                id="route-line"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{
                  "line-color": ["get", "color"],
                  "line-width": 5,
                  "line-opacity": 0.95,
                }}
              />
            </Source>
          )}

          {/* Waypoint markers */}
          {activeWaypoints.map((wp, i) => (
            <Marker
              key={`${i}-${wp[0]}-${wp[1]}`}
              longitude={wp[0]}
              latitude={wp[1]}
              anchor="center"
            >
              <div
                className={`rounded-full border-2 border-white shadow-lg ${
                  i === 0
                    ? "h-4 w-4 bg-sky-500"
                    : i === activeWaypoints.length - 1
                    ? "h-4 w-4 bg-purple-500"
                    : "h-2.5 w-2.5 bg-gray-400"
                }`}
              />
            </Marker>
          ))}
        </Map>

        {/* Wind indicator overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-2 rounded-xl bg-gray-900/85 backdrop-blur-sm px-3 py-2 border border-gray-700/60 text-xs text-gray-300">
          <svg
            className="h-5 w-5 text-sky-400 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            style={{ transform: `rotate(${windArrowDeg}deg)` }}
          >
            <line x1="12" y1="20" x2="12" y2="4" />
            <polyline points="6 10 12 4 18 10" />
          </svg>
          <div>
            <p className="font-semibold text-white leading-none">{Math.round(windSpeedMph)} mph</p>
            <p className="text-gray-500 text-[10px] mt-0.5">wind</p>
          </div>
        </div>

        {/* Empty state hint */}
        {waypoints.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center">
            <div className="rounded-xl bg-gray-900/80 backdrop-blur-sm px-4 py-2.5 border border-gray-700/50 text-center">
              <p className="text-sm font-medium text-gray-200">Click anywhere to start your route</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Segments will color by wind impact
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-5 rounded-full bg-green-500" />
          Tailwind
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-5 rounded-full bg-yellow-500" />
          Crosswind
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-5 rounded-full bg-red-500" />
          Headwind
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-sky-500 border border-white" />
          Start
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-purple-500 border border-white" />
          End
        </span>
      </div>
    </div>
  );
}
