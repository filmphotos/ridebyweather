"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { Map, Source, Layer, Marker, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { TrackPoint } from "@/lib/ride/rideMath";

interface Props {
  points: TrackPoint[];
  heading?: number;
  windDirDeg?: number;
  windSpeedMph?: number;
}

interface RideRestaurant {
  id: string;
  name: string;
  type: "restaurant" | "cafe";
  lat: number;
  lng: number;
  distanceMi: number;
}

// Only re-fetch restaurants when the rider moves >2 km from the last fetch
// — avoids hammering /api/partners on every GPS tick.
const REFETCH_DISTANCE_M = 2000;

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RideMap({ points, heading, windDirDeg, windSpeedMph }: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef | null>(null);
  const current = points[points.length - 1];

  const [restaurants, setRestaurants] = useState<RideRestaurant[]>([]);
  const [showRestaurants, setShowRestaurants] = useState(true);
  const [selected, setSelected] = useState<RideRestaurant | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const lastFetchRef = useRef<{ lat: number; lng: number } | null>(null);

  // Fetch restaurants once we have a fix, then re-fetch only when the rider
  // has moved >REFETCH_DISTANCE_M from where we last asked.
  useEffect(() => {
    if (!current) return;
    const last = lastFetchRef.current;
    if (last && haversineM(last.lat, last.lng, current.lat, current.lng) < REFETCH_DISTANCE_M) return;
    lastFetchRef.current = { lat: current.lat, lng: current.lng };
    const ctrl = new AbortController();
    fetch(
      `/api/partners?lat=${current.lat}&lng=${current.lng}&sport=cycling&radius=10`,
      { signal: ctrl.signal }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.restaurants)) setRestaurants(d.restaurants as RideRestaurant[]);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [current?.lat, current?.lng]);

  const trackGeoJSON = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: points.length >= 2
      ? [{
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: points.map((p) => [p.lng, p.lat]),
          },
          properties: {},
        }]
      : [],
  }), [points]);

  // Keep current position centered as the rider moves
  useEffect(() => {
    if (!mapRef.current || !current) return;
    mapRef.current.easeTo({
      center: [current.lng, current.lat],
      duration: 600,
    });
  }, [current?.lat, current?.lng]);

  if (!token) {
    return (
      <div className="flex h-[460px] items-center justify-center text-sm text-gray-500 p-6 text-center">
        Mapbox token missing — add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local for the live map.
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex h-[460px] items-center justify-center text-sm text-gray-500">
        Waiting for GPS fix…
      </div>
    );
  }

  return (
    <div className="relative h-[60vh] min-h-[420px] w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={{ longitude: current.lng, latitude: current.lat, zoom: 15 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        onLoad={() => setMapError(null)}
        onError={(e) => {
          const msg =
            (e as unknown as { error?: { message?: string } })?.error?.message ??
            "Map failed to load";
          console.error("[RideMap] Mapbox error:", msg, e);
          setMapError(msg);
        }}
      >
        <NavigationControl position="bottom-right" />

        {trackGeoJSON.features.length > 0 && (
          <Source id="track" type="geojson" data={trackGeoJSON}>
            <Layer
              id="track-shadow"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#0ea5e9", "line-width": 10, "line-opacity": 0.25, "line-blur": 4 }}
            />
            <Layer
              id="track-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#0ea5e9", "line-width": 5, "line-opacity": 0.95 }}
            />
          </Source>
        )}

        {/* Start marker */}
        {points.length > 1 && (
          <Marker longitude={points[0].lng} latitude={points[0].lat} anchor="center">
            <div className="h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow-lg" />
          </Marker>
        )}

        {/* Current position — pulsing dot, rotated by heading */}
        <Marker longitude={current.lng} latitude={current.lat} anchor="center">
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-sky-500/30 animate-ping" />
            <div className="relative h-5 w-5 rounded-full bg-sky-500 border-2 border-white shadow-lg flex items-center justify-center">
              {heading != null && (
                <svg
                  className="h-3 w-3 text-white"
                  viewBox="0 0 24 24" fill="currentColor"
                  style={{ transform: `rotate(${heading}deg)` }}
                >
                  <polygon points="12,2 18,22 12,18 6,22" />
                </svg>
              )}
            </div>
          </div>
        </Marker>

        {/* Nearby restaurants & cafes — food stops during the ride */}
        {showRestaurants && restaurants.map((r) => (
          <Marker
            key={r.id}
            longitude={r.lng}
            latitude={r.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelected(r);
            }}
          >
            <div
              title={`${r.name} · ${r.distanceMi.toFixed(1)} mi`}
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-lg cursor-pointer text-[12px] ${
                r.type === "cafe" ? "bg-amber-600" : "bg-orange-600"
              }`}
            >
              {r.type === "cafe" ? "☕" : "🍽"}
            </div>
          </Marker>
        ))}

        {selected && (
          <Marker
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="bottom"
            offset={[0, -28]}
          >
            <div className="rounded-lg border border-amber-500/50 bg-gray-900/95 backdrop-blur-sm px-3 py-2 text-xs shadow-xl min-w-[160px]">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-white truncate">{selected.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelected(null); }}
                  className="text-gray-500 hover:text-gray-300 text-base leading-none"
                  aria-label="Close"
                >×</button>
              </div>
              <p className="text-amber-400 mt-0.5">
                {selected.type === "cafe" ? "Cafe" : "Restaurant"} · {selected.distanceMi.toFixed(1)} mi
              </p>
            </div>
          </Marker>
        )}
      </Map>

      {mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm p-4 text-center">
          <p className="text-sm font-medium text-red-400">Map couldn&apos;t load</p>
          <p className="mt-1 text-xs text-gray-400 max-w-md break-words">{mapError}</p>
          <p className="mt-2 text-[11px] text-gray-600">
            Likely an invalid or restricted Mapbox token. Check NEXT_PUBLIC_MAPBOX_TOKEN.
          </p>
        </div>
      )}

      {/* Food toggle — bottom-left, mirrors the wind chip */}
      <button
        type="button"
        onClick={() => setShowRestaurants((v) => !v)}
        className={`absolute bottom-3 left-3 flex items-center gap-1.5 rounded-xl bg-gray-900/85 backdrop-blur-sm px-2.5 py-1.5 border text-xs transition-colors ${
          showRestaurants
            ? "border-amber-500/40 text-amber-400"
            : "border-gray-700/60 text-gray-500 hover:text-gray-300"
        }`}
        aria-pressed={showRestaurants}
      >
        <span className="text-sm leading-none">🍽</span>
        Food {showRestaurants ? `(${restaurants.length})` : "off"}
      </button>

      {/* Wind overlay */}
      {windDirDeg != null && windSpeedMph != null && (
        <div className="absolute top-3 left-3 flex items-center gap-2 rounded-xl bg-gray-900/85 backdrop-blur-sm px-3 py-2 border border-gray-700/60 text-xs text-gray-300">
          <svg
            className="h-5 w-5 text-sky-400 flex-shrink-0"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
            style={{ transform: `rotate(${(windDirDeg + 180) % 360}deg)` }}
          >
            <line x1="12" y1="20" x2="12" y2="4" />
            <polyline points="6 10 12 4 18 10" />
          </svg>
          <div>
            <p className="font-semibold text-white leading-none">{Math.round(windSpeedMph)} mph</p>
            <p className="text-gray-500 text-[10px] mt-0.5">wind</p>
          </div>
        </div>
      )}
    </div>
  );
}
