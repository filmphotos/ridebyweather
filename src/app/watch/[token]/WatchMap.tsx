"use client";

import { useEffect, useMemo, useRef } from "react";
import { Map, Source, Layer, Marker } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

interface Props {
  path: number[][]; // [lng, lat][]
  current: { lat: number; lng: number } | null;
  headingDeg?: number | null;
}

export default function WatchMap({ path, current, headingDeg }: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef | null>(null);

  const trackGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features:
        path.length >= 2
          ? [
              {
                type: "Feature" as const,
                geometry: { type: "LineString" as const, coordinates: path },
                properties: {},
              },
            ]
          : [],
    }),
    [path]
  );

  useEffect(() => {
    if (!mapRef.current || !current) return;
    mapRef.current.easeTo({ center: [current.lng, current.lat], duration: 800 });
  }, [current?.lat, current?.lng]);

  if (!token) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500 p-6 text-center">
        Map unavailable — Mapbox token not configured.
      </div>
    );
  }
  if (!current) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Waiting for the rider&apos;s first location…
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={{ longitude: current.lng, latitude: current.lat, zoom: 14 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
    >
      {trackGeoJSON.features.length > 0 && (
        <Source id="track" type="geojson" data={trackGeoJSON}>
          <Layer
            id="track-line"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{ "line-color": "#0ea5e9", "line-width": 5, "line-opacity": 0.95 }}
          />
        </Source>
      )}

      {path.length > 1 && (
        <Marker longitude={path[0][0]} latitude={path[0][1]} anchor="center">
          <div className="h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow-lg" />
        </Marker>
      )}

      <Marker longitude={current.lng} latitude={current.lat} anchor="center">
        <div className="relative">
          <div className="absolute -inset-3 rounded-full bg-sky-500/30 animate-ping" />
          <div className="relative h-5 w-5 rounded-full bg-sky-500 border-2 border-white shadow-lg flex items-center justify-center">
            {headingDeg != null && (
              <svg
                className="h-3 w-3 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ transform: `rotate(${headingDeg}deg)` }}
              >
                <polygon points="12,2 18,22 12,18 6,22" />
              </svg>
            )}
          </div>
        </div>
      </Marker>
    </Map>
  );
}
