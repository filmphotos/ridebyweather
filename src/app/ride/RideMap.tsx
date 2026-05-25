"use client";

import { useMemo, useRef, useEffect } from "react";
import Map, { Source, Layer, Marker, NavigationControl } from "react-map-gl";
import type { MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { TrackPoint } from "@/lib/ride/rideMath";

interface Props {
  points: TrackPoint[];
  heading?: number;
  windDirDeg?: number;
  windSpeedMph?: number;
}

export default function RideMap({ points, heading, windDirDeg, windSpeedMph }: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef | null>(null);
  const current = points[points.length - 1];

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
      </Map>

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
