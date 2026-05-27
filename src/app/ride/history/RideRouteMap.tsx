"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, Source, Layer, Marker } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { TrackPoint } from "@/lib/ride/rideMath";
import type { RideStop } from "@/lib/ride/rideStorage";

interface Props {
  points: TrackPoint[];
  stops?: RideStop[];
}

function stopMeta(type: RideStop["type"]) {
  if (type === "food") return { emoji: "🍔", label: "Food", bg: "bg-amber-500" };
  if (type === "bathroom") return { emoji: "🚻", label: "Bathroom", bg: "bg-sky-500" };
  return { emoji: "📍", label: "Stop", bg: "bg-gray-500" };
}

export default function RideRouteMap({ points, stops = [] }: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

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

  const bounds = useMemo(() => {
    if (points.length === 0) return null;
    let minLat = points[0].lat, maxLat = points[0].lat;
    let minLng = points[0].lng, maxLng = points[0].lng;
    for (const p of points) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }
    return { minLat, maxLat, minLng, maxLng };
  }, [points]);

  // Fit the map to the route once loaded
  useEffect(() => {
    if (!mapRef.current || !bounds) return;
    mapRef.current.fitBounds(
      [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
      { padding: 40, duration: 0 }
    );
  }, [bounds]);

  if (!token) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-gray-500 p-6 text-center">
        Mapbox token missing — add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local to see the route map.
      </div>
    );
  }

  if (points.length < 2 || !bounds) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-gray-500">
        Not enough GPS data to draw a route.
      </div>
    );
  }

  const start = points[0];
  const finish = points[points.length - 1];
  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;

  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-xl">
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={{ longitude: centerLng, latitude: centerLat, zoom: 13 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        onLoad={() => {
          setMapError(null);
          if (mapRef.current && bounds) {
            mapRef.current.fitBounds(
              [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
              { padding: 40, duration: 0 }
            );
          }
        }}
        onError={(e) => {
          const msg =
            (e as unknown as { error?: { message?: string } })?.error?.message ??
            "Map failed to load";
          setMapError(msg);
        }}
      >
        <Source id="route" type="geojson" data={trackGeoJSON}>
          <Layer
            id="route-shadow"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{ "line-color": "#0ea5e9", "line-width": 10, "line-opacity": 0.25, "line-blur": 4 }}
          />
          <Layer
            id="route-line"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{ "line-color": "#0ea5e9", "line-width": 5, "line-opacity": 0.95 }}
          />
        </Source>

        <Marker longitude={start.lng} latitude={start.lat} anchor="center">
          <div
            title="Start"
            className="h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow-lg"
          />
        </Marker>

        <Marker longitude={finish.lng} latitude={finish.lat} anchor="center">
          <div
            title="Finish"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 border-2 border-white shadow-lg text-[10px] text-white font-bold"
          >
            ■
          </div>
        </Marker>

        {stops.map((s) => {
          const m = stopMeta(s.type);
          return (
            <Marker key={s.id} longitude={s.lng} latitude={s.lat} anchor="center">
              <div
                title={`${m.label}${s.note ? " — " + s.note : ""}`}
                className={`flex h-6 w-6 items-center justify-center rounded-full ${m.bg} border-2 border-white shadow-lg text-[12px]`}
              >
                {m.emoji}
              </div>
            </Marker>
          );
        })}
      </Map>

      {mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm p-4 text-center">
          <p className="text-sm font-medium text-red-400">Map couldn&apos;t load</p>
          <p className="mt-1 text-xs text-gray-400 max-w-md break-words">{mapError}</p>
        </div>
      )}
    </div>
  );
}
